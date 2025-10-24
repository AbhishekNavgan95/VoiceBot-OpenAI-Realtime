// ============================================
// Web Voice Chat Routes - For browser-based voice interaction
// ============================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import * as conversationManager from '../services/conversationManager.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17';

// ============================================
// WEB VOICE CHAT ENDPOINTS
// ============================================

/**
 * Create ephemeral session token for web voice chat
 */
router.post('/session', async (req, res) => {
    try {
        const { system_prompt } = req.body;
        const sessionId = uuidv4();

        // Create conversation record
        const conversation = await conversationManager.createConversation({
            sessionId,
            conversationType: 'web'
        });

        logger.info(`Web voice session created: ${sessionId}`);

        // Return ephemeral token (in production, generate actual ephemeral token from OpenAI)
        res.json({
            session_id: sessionId,
            client_secret: {
                type: 'session',
                session_id: sessionId,
                api_key: OPENAI_API_KEY,
                model: OPENAI_REALTIME_MODEL
            }
        });
    } catch (error) {
        logger.error('Error creating web voice session:', error.message);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * Connect to OpenAI Realtime API (WebRTC SDP exchange)
 */
router.post('/connect', async (req, res) => {
    try {
        const { client_secret, sdp } = req.body;
        const model = client_secret?.model || OPENAI_REALTIME_MODEL;

        logger.info('Web voice connection request received for model:', model);

        // Exchange SDP with OpenAI Realtime API
        const response = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/sdp'
            },
            body: sdp
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`OpenAI API error (${response.status}):`, errorText);
            return res.status(response.status).json({
                error: `OpenAI API error: ${response.status}`,
                details: errorText
            });
        }

        const answerSdp = await response.text();

        logger.info('Successfully received SDP answer from OpenAI');

        res.setHeader('Content-Type', 'application/sdp');
        res.json({
            type: 'answer',
            sdp: answerSdp
        });
    } catch (error) {
        logger.error('Error connecting web voice:', error.message);
        res.status(500).json({ error: 'Failed to connect: ' + error.message });
    }
});

/**
 * End web voice session
 */
router.post('/end', async (req, res) => {
    try {
        const { session_id } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        await conversationManager.endConversation(session_id, 'completed');

        logger.info(`Web voice session ended: ${session_id}`);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error ending web voice session:', error.message);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

/**
 * Get session status
 */
router.get('/status/:session_id', async (req, res) => {
    try {
        const { session_id } = req.params;

        const conversation = conversationManager.getConversation(session_id);

        if (!conversation) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const stats = conversation.getStats();

        res.json({
            session_id,
            status: 'active',
            ...stats
        });
    } catch (error) {
        logger.error('Error getting session status:', error.message);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

export default router;
