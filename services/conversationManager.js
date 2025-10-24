// ============================================
// Conversation Manager - Handles conversation state and logging
// ============================================

import { v4 as uuidv4 } from 'uuid';
import * as db from './database.js';
import logger from '../utils/logger.js';

// Store active conversations in memory
const activeConversations = new Map();

// ============================================
// CONVERSATION CLASS
// ============================================

class Conversation {
    constructor({ callSid, sessionId, phoneNumber, conversationType = 'phone' }) {
        this.id = null; // Supabase ID
        this.callSid = callSid;
        this.sessionId = sessionId || uuidv4();
        this.phoneNumber = phoneNumber;
        this.conversationType = conversationType; // 'phone' or 'web'
        this.languageDetected = 'en';
        this.messages = [];
        this.startTime = new Date();
        this.metadata = {
            functionCalls: [],
            transfers: [],
            emergencies: []
        };
    }

    /**
     * Initialize conversation in database
     */
    async initialize() {
        try {
            const conversationData = await db.createConversation({
                callSid: this.callSid,
                sessionId: this.sessionId,
                phoneNumber: this.phoneNumber,
                conversationType: this.conversationType,
                languageDetected: this.languageDetected
            });

            if (conversationData) {
                this.id = conversationData.id;
                logger.info(`Conversation initialized: ${this.id} (${this.conversationType})`);
            }

            return this.id;
        } catch (error) {
            logger.error('Error initializing conversation:', error.message);
            return null;
        }
    }

    /**
     * Add a message to conversation
     */
    async addMessage(role, content, metadata = {}) {
        const message = {
            role,
            content,
            timestamp: new Date(),
            metadata
        };

        this.messages.push(message);

        // Save to database if conversation is initialized
        if (this.id) {
            await db.addConversationMessage({
                conversationId: this.id,
                role,
                content,
                language: this.languageDetected,
                metadata
            });
        }

        return message;
    }

    /**
     * Log function call
     */
    logFunctionCall(functionName, args, result) {
        this.metadata.functionCalls.push({
            function: functionName,
            arguments: args,
            result,
            timestamp: new Date()
        });

        logger.info(`Function called: ${functionName} - Success: ${result?.success}`);
    }

    /**
     * Log transfer event
     */
    logTransfer(transferType, destination, reason) {
        this.metadata.transfers.push({
            type: transferType,
            destination,
            reason,
            timestamp: new Date()
        });

        logger.info(`Transfer logged: ${transferType} to ${destination}`);
    }

    /**
     * Log emergency event
     */
    logEmergency(emergencyType, details) {
        this.metadata.emergencies.push({
            type: emergencyType,
            details,
            timestamp: new Date()
        });

        logger.warn(`Emergency logged: ${emergencyType}`);
    }

    /**
     * End conversation
     */
    async end(status = 'completed') {
        try {
            const duration = Math.floor((new Date() - this.startTime) / 1000);

            if (this.id) {
                await db.endConversation(this.id, status);

                // Generate summary if conversation has messages
                if (this.messages.length > 0) {
                    await this.generateSummary();
                }
            }

            logger.info(`Conversation ended: ${this.id} (${duration}s, ${status})`);
            return { duration, status };
        } catch (error) {
            logger.error('Error ending conversation:', error.message);
            return null;
        }
    }

    /**
     * Generate conversation summary
     */
    async generateSummary() {
        try {
            // Extract key information
            const userMessages = this.messages.filter(m => m.role === 'user');
            const assistantMessages = this.messages.filter(m => m.role === 'assistant');

            // Simple summary generation
            const summary = `Conversation with ${this.phoneNumber || 'unknown caller'}. ` +
                `${userMessages.length} user messages, ${assistantMessages.length} assistant responses. ` +
                `${this.metadata.functionCalls.length} function calls, ` +
                `${this.metadata.transfers.length} transfers, ` +
                `${this.metadata.emergencies.length} emergencies.`;

            // Extract key topics from function calls
            const keyTopics = [
                ...new Set(this.metadata.functionCalls.map(fc => fc.function))
            ];

            // Determine sentiment based on emergency and transfer count
            const sentiment = this.metadata.emergencies.length > 0 ? 'urgent' :
                this.metadata.transfers.length > 2 ? 'frustrated' : 'neutral';

            // Extract action items
            const actionItems = this.metadata.transfers.map(t => `Transfer to ${t.destination}: ${t.reason}`);

            await db.createConversationSummary({
                conversationId: this.id,
                summary,
                keyTopics,
                sentiment,
                actionItems
            });

            logger.info(`Summary generated for conversation: ${this.id}`);
        } catch (error) {
            logger.error('Error generating summary:', error.message);
        }
    }

    /**
     * Update detected language
     */
    updateLanguage(language) {
        this.languageDetected = language;
        logger.info(`Language detected: ${language}`);
    }

    /**
     * Get conversation statistics
     */
    getStats() {
        return {
            id: this.id,
            sessionId: this.sessionId,
            callSid: this.callSid,
            duration: Math.floor((new Date() - this.startTime) / 1000),
            messageCount: this.messages.length,
            functionCallCount: this.metadata.functionCalls.length,
            transferCount: this.metadata.transfers.length,
            emergencyCount: this.metadata.emergencies.length,
            language: this.languageDetected
        };
    }
}

// ============================================
// CONVERSATION MANAGER FUNCTIONS
// ============================================

/**
 * Create and register a new conversation
 */
export async function createConversation({ callSid, sessionId, phoneNumber, conversationType }) {
    const conversation = new Conversation({
        callSid,
        sessionId,
        phoneNumber,
        conversationType
    });

    await conversation.initialize();

    // Store in active conversations
    const key = callSid || sessionId;
    activeConversations.set(key, conversation);

    logger.info(`Conversation created and registered: ${key}`);
    return conversation;
}

/**
 * Get active conversation
 */
export function getConversation(identifier) {
    return activeConversations.get(identifier);
}

/**
 * End and cleanup conversation
 */
export async function endConversation(identifier, status = 'completed') {
    const conversation = activeConversations.get(identifier);

    if (!conversation) {
        logger.warn(`Conversation not found: ${identifier}`);
        return null;
    }

    const result = await conversation.end(status);
    activeConversations.delete(identifier);

    logger.info(`Conversation cleaned up: ${identifier}`);
    return result;
}

/**
 * Get all active conversations
 */
export function getActiveConversations() {
    return Array.from(activeConversations.values()).map(conv => conv.getStats());
}

/**
 * Cleanup stale conversations (older than 30 minutes)
 */
export function cleanupStaleConversations() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    let cleaned = 0;

    for (const [key, conversation] of activeConversations.entries()) {
        if (conversation.startTime < thirtyMinutesAgo) {
            conversation.end('timeout');
            activeConversations.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} stale conversations`);
    }

    return cleaned;
}

// Run cleanup every 10 minutes
setInterval(cleanupStaleConversations, 10 * 60 * 1000);

export default {
    Conversation,
    createConversation,
    getConversation,
    endConversation,
    getActiveConversations,
    cleanupStaleConversations
};
