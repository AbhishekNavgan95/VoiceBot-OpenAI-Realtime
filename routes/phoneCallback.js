// ============================================
// Phone Callback Routes - For requesting phone callbacks using Exotel
// ============================================

import express from 'express';
import logger from '../utils/logger.js';
import * as conversationManager from '../services/conversationManager.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY;
const EXOTEL_API_TOKEN = process.env.EXOTEL_API_TOKEN;
const EXOTEL_SID = process.env.EXOTEL_SID;
const EXOTEL_PHONE_NUMBER = process.env.EXOTEL_PHONE_NUMBER;
const PUBLIC_URL = process.env.PUBLIC_URL;

// Store active calls in memory (in production, use Redis)
const activeCalls = new Map();

// ============================================
// PHONE CALLBACK ENDPOINTS
// ============================================

/**
 * Initiate a callback to user's phone number using Exotel
 */
router.post('/initiate-call', async (req, res) => {
    try {
        const { phone_number, from_web } = req.body;

        if (!phone_number) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_SID) {
            return res.status(503).json({ error: 'Exotel is not configured' });
        }

        if (!PUBLIC_URL) {
            logger.warn('PUBLIC_URL not set - Exotel webhooks may fail!');
            return res.status(503).json({
                error: 'Server not properly configured for phone callbacks',
                details: 'PUBLIC_URL environment variable is required for Exotel webhooks'
            });
        }

        logger.info(`Initiating Exotel callback to: ${phone_number} (from_web: ${from_web})`);

        const webhookUrl = `${PUBLIC_URL}/exotel/incoming-call`;
        const statusCallbackUrl = `${PUBLIC_URL}/exotel/call-status`;

        logger.info(`Webhook URLs - incoming: ${webhookUrl}, status: ${statusCallbackUrl}`);

        // Initiate call using Exotel API
        const exotelUrl = `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}@api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect.json`;

        const response = await fetch(exotelUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                From: EXOTEL_PHONE_NUMBER,
                To: phone_number,
                CallerId: EXOTEL_PHONE_NUMBER,
                Url: webhookUrl,
                StatusCallback: statusCallbackUrl,
                TimeLimit: '14400', // 4 hours max
                TimeOut: '30',
                CallType: 'trans'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Exotel API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const callSid = result.Call?.Sid;

        if (!callSid) {
            throw new Error('No Call SID returned from Exotel');
        }

        // Store call info
        activeCalls.set(callSid, {
            sid: callSid,
            to: phone_number,
            status: result.Call?.Status || 'initiated',
            from_web,
            initiated_at: new Date()
        });

        logger.info(`Exotel call initiated: ${callSid} to ${phone_number}`);

        res.json({
            success: true,
            call_sid: callSid,
            status: result.Call?.Status || 'initiated',
            to: phone_number,
            message: 'Call initiated successfully. You should receive a call shortly.'
        });

    } catch (error) {
        logger.error('Error initiating Exotel callback:', error.message);
        res.status(500).json({
            error: 'Failed to initiate call',
            details: error.message
        });
    }
});

/**
 * Get call status from Exotel
 */
router.get('/call-status/:call_sid', async (req, res) => {
    try {
        const { call_sid } = req.params;

        if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_SID) {
            return res.status(503).json({ error: 'Exotel is not configured' });
        }

        // Check memory first
        const cachedCall = activeCalls.get(call_sid);

        // Fetch from Exotel
        const exotelUrl = `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}@api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/${call_sid}.json`;

        const response = await fetch(exotelUrl);

        if (!response.ok) {
            throw new Error(`Exotel API error: ${response.status}`);
        }

        const result = await response.json();
        const call = result.Call;

        // Update cache
        if (cachedCall) {
            cachedCall.status = call.Status;
            activeCalls.set(call_sid, cachedCall);
        }

        res.json({
            call_sid: call.Sid,
            status: call.Status,
            to: call.To,
            from: call.From,
            direction: call.Direction,
            duration: call.Duration,
            date_created: call.DateCreated,
            date_updated: call.DateUpdated
        });

    } catch (error) {
        logger.error('Error fetching Exotel call status:', error.message);
        res.status(500).json({ error: 'Failed to fetch call status' });
    }
});

/**
 * Cancel an ongoing call using Exotel
 */
router.post('/cancel-call', async (req, res) => {
    try {
        const { call_sid } = req.body;

        if (!call_sid) {
            return res.status(400).json({ error: 'Call SID is required' });
        }

        if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_SID) {
            return res.status(503).json({ error: 'Exotel is not configured' });
        }

        logger.info(`Cancelling Exotel call: ${call_sid}`);

        // Hangup call using Exotel API
        const exotelUrl = `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}@api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/${call_sid}`;

        const response = await fetch(exotelUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                Status: 'completed'
            })
        });

        if (!response.ok) {
            throw new Error(`Exotel API error: ${response.status}`);
        }

        // Remove from active calls
        activeCalls.delete(call_sid);

        // End conversation
        await conversationManager.endConversation(call_sid, 'cancelled');

        res.json({
            success: true,
            message: 'Call cancelled successfully'
        });

    } catch (error) {
        logger.error('Error cancelling Exotel call:', error.message);
        res.status(500).json({ error: 'Failed to cancel call' });
    }
});

/**
 * Get all active calls
 */
router.get('/active-calls', (req, res) => {
    try {
        const calls = Array.from(activeCalls.values());

        res.json({
            count: calls.length,
            calls
        });
    } catch (error) {
        logger.error('Error fetching active calls:', error.message);
        res.status(500).json({ error: 'Failed to fetch active calls' });
    }
});

/**
 * Webhook for call status updates from Exotel
 */
router.post('/status-webhook', async (req, res) => {
    try {
        const { CallSid, Status } = req.body;

        logger.info(`Exotel call status update: ${CallSid} - ${Status}`);

        // Update cache
        const cachedCall = activeCalls.get(CallSid);
        if (cachedCall) {
            cachedCall.status = Status;
            activeCalls.set(CallSid, cachedCall);
        }

        // If call completed, remove from cache after delay
        if (Status === 'completed' || Status === 'failed' || Status === 'busy' || Status === 'no-answer') {
            setTimeout(() => {
                activeCalls.delete(CallSid);
            }, 60000); // Keep for 1 minute after completion
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error('Error processing Exotel status webhook:', error.message);
        res.sendStatus(200); // Always return 200 to Exotel
    }
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
    const exotelConfigured = !!(EXOTEL_API_KEY && EXOTEL_API_TOKEN && EXOTEL_SID);

    res.json({
        status: 'healthy',
        exotel_configured: exotelConfigured,
        active_calls: activeCalls.size
    });
});

// Cleanup old calls every 5 minutes
setInterval(() => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    for (const [sid, call] of activeCalls.entries()) {
        if (call.initiated_at < fiveMinutesAgo) {
            logger.info(`Removing stale call from cache: ${sid}`);
            activeCalls.delete(sid);
        }
    }
}, 5 * 60 * 1000);

export default router;
