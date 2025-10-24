// ============================================
// Exotel Voice Integration Routes
// ============================================

import express from 'express';
import logger from '../utils/logger.js';
import * as conversationManager from '../services/conversationManager.js';

const router = express.Router();

// ============================================
// EXOTEL WEBHOOK ENDPOINTS
// ============================================

/**
 * Incoming call handler (Exotel Applet)
 * This endpoint is called when a call comes in to your Exotel number
 * Exotel expects XML response (similar to TwiML but Exotel format)
 */
router.post('/incoming-call', async (req, res) => {
    try {
        const { CallSid, From, To, CallType, Direction } = req.body;

        logger.info(`Exotel incoming call: ${CallSid} from ${From} to ${To}`);

        // Create conversation
        const userPhone = From;

        const conversation = await conversationManager.createConversation({
            callSid: CallSid,
            phoneNumber: userPhone,
            conversationType: 'phone'
        });

        // Exotel Response XML for connecting to WebSocket
        const exotelResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Welcome to Lilavati Hospital AI Assistant. Please wait while we connect you.</Say>
    <Connect>
        <Stream url="wss://${req.headers.host}/exotel-media-stream?callSid=${CallSid}&phoneNumber=${encodeURIComponent(userPhone)}" />
    </Connect>
</Response>`;

        res.type('application/xml');
        res.send(exotelResponse);

        logger.info(`Exotel call connected to media stream: ${CallSid}`);
    } catch (error) {
        logger.error('Error handling Exotel incoming call:', error.message);

        const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>We are experiencing technical difficulties. Please try again later.</Say>
    <Hangup/>
</Response>`;

        res.type('application/xml');
        res.send(errorResponse);
    }
});

/**
 * Call status webhook (Exotel StatusCallback)
 * Receives call status updates (connected, completed, failed, etc.)
 */
router.post('/call-status', async (req, res) => {
    try {
        const { CallSid, Status, Duration, DialCallDuration } = req.body;

        logger.info(`Exotel call status update: ${CallSid} - ${Status}`);

        // Handle call completion
        if (Status === 'completed' || Status === 'failed' || Status === 'busy' || Status === 'no-answer') {
            const conversation = conversationManager.getConversation(CallSid);

            if (conversation) {
                const status = Status === 'completed' ? 'completed' : 'failed';
                await conversationManager.endConversation(CallSid, status);
                logger.info(`Exotel call ended: ${CallSid} - Duration: ${Duration || DialCallDuration}s`);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error('Error handling Exotel call status:', error.message);
        res.sendStatus(200); // Always return 200 to Exotel
    }
});

/**
 * Passthru (Transfer) endpoint
 * Used for transferring calls to operators/departments
 */
router.post('/transfer-call', async (req, res) => {
    try {
        const { CallSid, transferTo, department } = req.query;

        logger.info(`Exotel transfer request: ${CallSid} to ${transferTo} (${department})`);

        const conversation = conversationManager.getConversation(CallSid);
        if (conversation) {
            conversation.logTransfer('manual', transferTo, department);
        }

        const transferResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Please hold while I transfer your call to ${department || 'our operator'}.</Say>
    <Dial>
        <Number>${transferTo}</Number>
    </Dial>
</Response>`;

        res.type('application/xml');
        res.send(transferResponse);
    } catch (error) {
        logger.error('Error transferring Exotel call:', error.message);

        const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Unable to transfer your call. Please try again.</Say>
    <Hangup/>
</Response>`;

        res.type('application/xml');
        res.send(errorResponse);
    }
});

/**
 * Emergency transfer endpoint
 * Immediately transfers to emergency services
 */
router.post('/emergency-transfer', async (req, res) => {
    try {
        const { CallSid, emergencyNumber, emergencyType } = req.query;

        logger.warn(`EXOTEL EMERGENCY TRANSFER: ${CallSid} to ${emergencyNumber} (${emergencyType})`);

        const conversation = conversationManager.getConversation(CallSid);
        if (conversation) {
            conversation.logEmergency('transfer', { number: emergencyNumber, type: emergencyType });
        }

        const emergencyResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>This is an emergency. Connecting you immediately to emergency services. Please stay on the line.</Say>
    <Dial>
        <Number>${emergencyNumber}</Number>
    </Dial>
</Response>`;

        res.type('application/xml');
        res.send(emergencyResponse);
    } catch (error) {
        logger.error('Error in Exotel emergency transfer:', error.message);
        res.sendStatus(500);
    }
});

/**
 * Fallback handler for errors
 */
router.post('/fallback', (req, res) => {
    const { CallSid } = req.body;
    logger.error(`Exotel fallback triggered for call: ${CallSid}`);

    const fallbackResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>We apologize for the inconvenience. Please call back later or contact our main office directly.</Say>
    <Hangup/>
</Response>`;

    res.type('application/xml');
    res.send(fallbackResponse);
});

/**
 * Health check for Exotel integration
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'exotel-integration',
        timestamp: new Date().toISOString()
    });
});

/**
 * Passthru Applet - Custom flow handler
 * This can be used for custom call flows
 */
router.all('/passthru', async (req, res) => {
    try {
        const { CallSid, From, Digits } = req.body;

        logger.info(`Exotel passthru: ${CallSid}, Digits: ${Digits}`);

        // Handle IVR digit input if needed
        const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Processing your request.</Say>
    <Connect>
        <Stream url="wss://${req.headers.host}/exotel-media-stream?callSid=${CallSid}&phoneNumber=${encodeURIComponent(From)}" />
    </Connect>
</Response>`;

        res.type('application/xml');
        res.send(response);
    } catch (error) {
        logger.error('Error in Exotel passthru:', error.message);
        res.sendStatus(500);
    }
});

export default router;
