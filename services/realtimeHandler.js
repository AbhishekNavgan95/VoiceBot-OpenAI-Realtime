// ============================================
// OpenAI Realtime API Handler with Exotel Media Streams
// ============================================

import WebSocket from 'ws';
import logger from '../utils/logger.js';
import * as conversationManager from './conversationManager.js';
import { handleFunctionCall } from './functionHandlers.js';
import { SYSTEM_PROMPT, VOICE_CONFIG, FUNCTION_TOOLS } from '../config/data.js';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_URL = process.env.OPENAI_REALTIME_URL || 'wss://api.openai.com/v1/realtime';
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17';

// Exotel configuration for call transfers
const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY;
const EXOTEL_API_TOKEN = process.env.EXOTEL_API_TOKEN;
const EXOTEL_SID = process.env.EXOTEL_SID;
const PUBLIC_URL = process.env.PUBLIC_URL;

// ============================================
// REALTIME SESSION HANDLER
// ============================================

export class RealtimeSessionHandler {
    constructor(exotelWs, callSid, phoneNumber) {
        this.exotelWs = exotelWs;
        this.callSid = callSid;
        this.phoneNumber = phoneNumber;
        this.openaiWs = null;
        this.conversation = null;
        this.streamSid = null;
        this.isConnected = false;
        this.audioBuffer = [];
        this.audioSent = false; // Track if audio has been sent to OpenAI
        this.audioReceived = false; // Track if audio has been received from OpenAI
        this.audioSentToExotel = false; // Track if audio has been sent back to Exotel
    }

    /**
     * Initialize connection to OpenAI Realtime API
     */
    async initialize() {
        try {
            // Get or create conversation
            this.conversation = conversationManager.getConversation(this.callSid);
            if (!this.conversation) {
                this.conversation = await conversationManager.createConversation({
                    callSid: this.callSid,
                    phoneNumber: this.phoneNumber,
                    conversationType: 'phone'
                });
            }

            // Connect to OpenAI Realtime API
            const url = `${OPENAI_REALTIME_URL}?model=${OPENAI_REALTIME_MODEL}`;
            this.openaiWs = new WebSocket(url, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'realtime=v1'
                }
            });

            this.setupOpenAIHandlers();
            this.setupExotelHandlers();

            logger.info(`Realtime session initialized: ${this.callSid}`);
        } catch (error) {
            logger.error('Error initializing realtime session:', error.message);
            throw error;
        }
    }

    /**
     * Setup OpenAI WebSocket event handlers
     */
    setupOpenAIHandlers() {
        this.openaiWs.on('open', () => {
            logger.info(`OpenAI WebSocket connected: ${this.callSid}`);
            this.isConnected = true;

            // Send session configuration
            this.sendSessionUpdate();

            // Send initial greeting
            this.sendInitialGreeting();
        });

        this.openaiWs.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                await this.handleOpenAIMessage(message);
            } catch (error) {
                logger.error('Error handling OpenAI message:', error.message);
            }
        });

        this.openaiWs.on('error', (error) => {
            logger.error('OpenAI WebSocket error:', error.message);
        });

        this.openaiWs.on('close', () => {
            logger.info(`OpenAI WebSocket closed: ${this.callSid}`);
            this.isConnected = false;
            this.cleanup();
        });
    }

    /**
     * Setup Exotel media stream handlers
     */
    setupExotelHandlers() {
        this.exotelWs.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                await this.handleExotelMessage(message);
            } catch (error) {
                logger.error('Error handling Exotel message:', error.message);
            }
        });

        this.exotelWs.on('close', () => {
            logger.info(`Exotel WebSocket closed: ${this.callSid}`);
            this.cleanup();
        });

        this.exotelWs.on('error', (error) => {
            logger.error('Exotel WebSocket error:', error.message);
        });
    }

    /**
     * Handle messages from OpenAI
     */
    async handleOpenAIMessage(message) {
        const { type } = message;

        switch (type) {
            case 'session.created':
                logger.info('OpenAI session created');
                break;

            case 'session.updated':
                // Session updated - no logging needed
                break;

            case 'conversation.item.created':
                // Log user or assistant message
                if (message.item.type === 'message' && message.item.role === 'user') {
                    const content = message.item.content?.[0]?.transcript || '';
                    if (content) {
                        await this.conversation.addMessage('user', content);
                    }
                }
                break;

            case 'response.audio.delta':
                // Forward audio back to Exotel
                if (message.delta) {
                    // Log first occurrence only to reduce spam
                    if (!this.audioReceived) {
                        logger.info(`✓ First audio delta received from OpenAI (${message.delta.length} bytes) - Audio flow started`);
                        this.audioReceived = true;
                    }
                    this.sendAudioToExotel(message.delta);
                }
                break;

            case 'response.audio_transcript.delta':
                // Accumulate transcript
                break;

            case 'response.audio_transcript.done':
                // Log complete assistant message
                if (message.transcript) {
                    await this.conversation.addMessage('assistant', message.transcript);
                }
                break;

            case 'response.function_call_arguments.done':
                // Handle function calling
                await this.handleFunctionCall(message);
                break;

            case 'error':
                logger.error('OpenAI error:', message.error);
                break;

            case 'response.done':
                // Response completed - no logging needed
                break;

            default:
                // Unhandled message type - no logging needed
        }
    }

    /**
     * Handle messages from Exotel media stream
     */
    async handleExotelMessage(message) {
        const { event } = message;

        switch (event) {
            case 'start':
                this.streamSid = message.start.streamSid;

                // Extract callSid and phoneNumber from stream parameters
                if (message.start.customParameters) {
                    if (!this.callSid && message.start.customParameters.callSid) {
                        this.callSid = message.start.customParameters.callSid;
                        logger.info(`CallSid extracted from stream: ${this.callSid}`);
                    }
                    if (!this.phoneNumber && message.start.customParameters.phoneNumber) {
                        this.phoneNumber = message.start.customParameters.phoneNumber;
                        logger.info(`Phone number extracted from stream: ${this.phoneNumber}`);
                    }
                }

                logger.info(`Exotel media stream started: ${this.streamSid} for call: ${this.callSid}`);
                break;

            case 'media':
                // Forward audio to OpenAI
                if (this.isConnected && message.media.payload) {
                    // Log first occurrence only
                    if (!this.audioSent) {
                        logger.info(`✓ First audio chunk received from Exotel (${message.media.payload.length} bytes) - Forwarding to OpenAI`);
                        this.audioSent = true;
                    }
                    this.sendAudioToOpenAI(message.media.payload);
                } else {
                    if (!this.isConnected) {
                        logger.warn('Cannot forward audio to OpenAI: Not connected');
                    }
                    if (!message.media.payload) {
                        logger.warn('Cannot forward audio to OpenAI: Empty payload');
                    }
                }
                break;

            case 'stop':
                logger.info(`Exotel media stream stopped: ${this.streamSid}`);
                await conversationManager.endConversation(this.callSid, 'completed');
                break;

            default:
                // Unhandled Exotel event - no logging needed
        }
    }

    /**
     * Send session configuration to OpenAI
     */
    sendSessionUpdate() {
        const sessionConfig = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                instructions: SYSTEM_PROMPT,
                voice: VOICE_CONFIG.voice,
                input_audio_format: VOICE_CONFIG.inputAudioFormat,
                output_audio_format: VOICE_CONFIG.outputAudioFormat,
                input_audio_transcription: {
                    model: 'whisper-1'
                },
                turn_detection: VOICE_CONFIG.turnDetection,
                tools: FUNCTION_TOOLS,
                tool_choice: 'auto',
                temperature: VOICE_CONFIG.temperature,
                max_response_output_tokens: VOICE_CONFIG.maxResponseOutputTokens
            }
        };

        this.sendToOpenAI(sessionConfig);
        logger.info(`Session configuration sent to OpenAI - Voice: ${VOICE_CONFIG.voice}, Audio Format: ${VOICE_CONFIG.inputAudioFormat}/${VOICE_CONFIG.outputAudioFormat}`);
    }

    /**
     * Send initial greeting
     */
    sendInitialGreeting() {
        // Let the AI respond naturally when the user speaks first
        // Or send a proactive greeting
        const greeting = {
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{
                    type: 'input_text',
                    text: 'Hello'
                }]
            }
        };

        this.sendToOpenAI(greeting);

        // Trigger response
        this.sendToOpenAI({ type: 'response.create' });
    }

    /**
     * Send audio to OpenAI (from Twilio)
     */
    sendAudioToOpenAI(audioPayload) {
        if (!this.isConnected) {
            logger.warn('sendAudioToOpenAI: Not connected to OpenAI');
            return;
        }

        if (!audioPayload || audioPayload.length === 0) {
            logger.warn('sendAudioToOpenAI: Empty audio payload');
            return;
        }

        const audioEvent = {
            type: 'input_audio_buffer.append',
            audio: audioPayload
        };

        this.sendToOpenAI(audioEvent);
    }

    /**
     * Send audio to Exotel (from OpenAI)
     */
    sendAudioToExotel(audioData) {
        if (!this.exotelWs || this.exotelWs.readyState !== WebSocket.OPEN) {
            logger.warn(`sendAudioToExotel: Exotel WebSocket not ready (readyState: ${this.exotelWs?.readyState})`);
            return;
        }

        if (!this.streamSid) {
            logger.warn('sendAudioToExotel: No streamSid available');
            return;
        }

        if (!audioData || audioData.length === 0) {
            logger.warn('sendAudioToExotel: Empty audio data');
            return;
        }

        const mediaMessage = {
            event: 'media',
            streamSid: this.streamSid,
            media: {
                payload: audioData
            }
        };

        this.exotelWs.send(JSON.stringify(mediaMessage));

        // Log first successful send only
        if (!this.audioSentToExotel) {
            logger.info(`✓ First audio packet sent to Exotel (${audioData.length} bytes) - Playback should start`);
            this.audioSentToExotel = true;
        }
    }

    /**
     * Handle function calls from OpenAI
     */
    async handleFunctionCall(message) {
        try {
            const { call_id, name, arguments: argsString } = message;
            const args = JSON.parse(argsString || '{}');

            logger.info(`Function call: ${name}`);

            // Execute function
            const result = await handleFunctionCall(name, args);

            // Log function call
            this.conversation.logFunctionCall(name, args, result);

            // Handle special actions - Execute actual transfers
            if (result.action === 'TRANSFER_EMERGENCY') {
                // Implement emergency transfer via Twilio
                logger.warn(`Emergency transfer requested: ${result.transferTo}`);
                this.conversation.logEmergency(result.emergencyType, { transferTo: result.transferTo });

                // Execute the emergency transfer
                await this.executeEmergencyTransfer(result.transferTo, result.emergencyType);

            } else if (result.action === 'TRANSFER_OPERATOR') {
                logger.info(`Operator transfer requested: ${result.department}`);
                this.conversation.logTransfer('operator', result.department, result.reason);

                // Execute the operator transfer
                await this.executeOperatorTransfer(result.department, result.reason);
            }

            // Send function result back to OpenAI
            const functionOutput = {
                type: 'conversation.item.create',
                item: {
                    type: 'function_call_output',
                    call_id: call_id,
                    output: JSON.stringify(result)
                }
            };

            this.sendToOpenAI(functionOutput);

            // Trigger response generation
            this.sendToOpenAI({ type: 'response.create' });
        } catch (error) {
            logger.error('Error handling function call:', error.message);
        }
    }

    /**
     * Send message to OpenAI
     */
    sendToOpenAI(message) {
        if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN) {
            this.openaiWs.send(JSON.stringify(message));
        }
    }

    /**
     * Execute emergency transfer using Exotel API
     */
    async executeEmergencyTransfer(transferNumber, emergencyType) {
        try {
            if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_SID) {
                logger.error('Exotel credentials not configured - cannot transfer call');
                return;
            }

            if (!PUBLIC_URL) {
                logger.error('PUBLIC_URL not configured - cannot generate transfer URL');
                return;
            }

            logger.warn(`Executing EMERGENCY transfer: ${this.callSid} to ${transferNumber} (Type: ${emergencyType})`);

            // Use Exotel API to update call
            const transferUrl = `${PUBLIC_URL}/exotel/emergency-transfer?emergencyNumber=${transferNumber}&emergencyType=${emergencyType}`;

            const exotelApiUrl = `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}@api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/${this.callSid}`;

            const response = await fetch(exotelApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    Url: transferUrl,
                    CallType: 'trans',
                    TimeLimit: '14400',
                    TimeOut: '30'
                })
            });

            if (!response.ok) {
                throw new Error(`Exotel API error: ${response.status}`);
            }

            logger.warn(`Emergency transfer executed successfully: ${this.callSid} -> ${transferNumber}`);
        } catch (error) {
            logger.error('Error executing emergency transfer:', error.message);
        }
    }

    /**
     * Execute operator transfer using Exotel API
     */
    async executeOperatorTransfer(department, reason) {
        try {
            if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_SID) {
                logger.error('Exotel credentials not configured - cannot transfer call');
                return;
            }

            if (!PUBLIC_URL) {
                logger.error('PUBLIC_URL not configured - cannot generate transfer URL');
                return;
            }

            logger.info(`Executing operator transfer: ${this.callSid} to ${department} (Reason: ${reason})`);

            // Get contact number for the department from database or config
            const transferNumber = await this.getDepartmentContactNumber(department);

            if (!transferNumber) {
                logger.error(`No contact number found for department: ${department}`);
                return;
            }

            // Use Exotel API to update call
            const transferUrl = `${PUBLIC_URL}/exotel/transfer-call?transferTo=${transferNumber}&department=${encodeURIComponent(department)}`;

            const exotelApiUrl = `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}@api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/${this.callSid}`;

            const response = await fetch(exotelApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    Url: transferUrl,
                    CallType: 'trans',
                    TimeLimit: '14400',
                    TimeOut: '30'
                })
            });

            if (!response.ok) {
                throw new Error(`Exotel API error: ${response.status}`);
            }

            logger.info(`Operator transfer executed successfully: ${this.callSid} -> ${department} (${transferNumber})`);
        } catch (error) {
            logger.error(`Error executing operator transfer: ${error.message}`);
        }
    }


    /**
     * Get contact number for a department
     */
    async getDepartmentContactNumber(department) {
        try {
            // Import here to avoid circular dependency
            const db = await import('./database.js');
            const { EMERGENCY_CONTACTS } = await import('../config/data.js');

            // Try to get contact from database first
            const contacts = await db.getContactDetails(department);

            if (contacts && contacts.length > 0) {
                logger.info(`Found department contact in database: ${department} -> ${contacts[0].phone_number}`);
                return contacts[0].phone_number;
            }

            // Check if department matches emergency keywords
            const deptLower = (department || '').toLowerCase();
            if (deptLower.includes('emergency') || deptLower.includes('urgent')) {
                logger.info(`Using emergency contact for department: ${department}`);
                return EMERGENCY_CONTACTS.main;
            } else if (deptLower.includes('cardiac') || deptLower.includes('heart')) {
                return EMERGENCY_CONTACTS.cardiac;
            } else if (deptLower.includes('trauma') || deptLower.includes('accident')) {
                return EMERGENCY_CONTACTS.trauma;
            } else if (deptLower.includes('ambulance')) {
                return EMERGENCY_CONTACTS.ambulance;
            }

            // Fallback to main contact number
            logger.warn(`No specific contact found for department: ${department}, using main number`);
            return EMERGENCY_CONTACTS.main;
        } catch (error) {
            logger.error('Error getting department contact number:', error.message);
            // Return main hospital number as fallback
            return '+91-22-2640-0000';
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            if (this.openaiWs) {
                this.openaiWs.close();
            }

            if (this.conversation) {
                await conversationManager.endConversation(this.callSid, 'completed');
            }

            logger.info(`Realtime session cleaned up: ${this.callSid}`);
        } catch (error) {
            logger.error('Error cleaning up realtime session:', error.message);
        }
    }
}

/**
 * Create and initialize a new realtime session
 */
export async function createRealtimeSession(exotelWs, callSid, phoneNumber) {
    const handler = new RealtimeSessionHandler(exotelWs, callSid, phoneNumber);
    await handler.initialize();
    return handler;
}

export default {
    RealtimeSessionHandler,
    createRealtimeSession
};
