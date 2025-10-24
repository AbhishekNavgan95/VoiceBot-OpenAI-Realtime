// ============================================
// Lilavati Hospital AI Voice Assistant Server
// Ultra-Low Latency Voice AI using OpenAI Realtime API
// ============================================

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { testConnection } from './config/supabase.js';
import exotelRoutes from './routes/exotel.js';
import webVoiceRoutes from './routes/webVoice.js';
import phoneCallbackRoutes from './routes/phoneCallback.js';
import * as conversationManager from './services/conversationManager.js';
import { createRealtimeSession } from './services/realtimeHandler.js';
import { HOSPITAL_INFO } from './config/data.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    exposedHeaders: ['Content-Length', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - ${req.ip}`);
    next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'lilavati-hospital-voice-assistant',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        hospital: HOSPITAL_INFO.name
    });
});

// API info
app.get('/', (req, res) => {
    res.json({
        message: 'Lilavati Hospital AI Voice Assistant API',
        hospital: HOSPITAL_INFO.name,
        version: '1.0.0',
        endpoints: {
            health: '/health',
            exotelWebhooks: '/exotel/*',
            mediaStream: 'wss://your-domain/exotel-media-stream',
            conversations: '/api/conversations'
        },
        documentation: 'See README.md for setup instructions'
    });
});

// Exotel routes
app.use('/exotel', exotelRoutes);

// Web voice chat routes
app.use('/api/web-voice', webVoiceRoutes);

// Phone callback routes
app.use('/api/phone', phoneCallbackRoutes);

// Conversation management API
app.get('/api/conversations/active', (req, res) => {
    const conversations = conversationManager.getActiveConversations();
    res.json({
        count: conversations.length,
        conversations
    });
});

app.get('/api/conversations/:identifier', (req, res) => {
    const conversation = conversationManager.getConversation(req.params.identifier);
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation.getStats());
});

// Admin endpoint to cleanup stale conversations
app.post('/api/admin/cleanup', (req, res) => {
    const cleaned = conversationManager.cleanupStaleConversations();
    res.json({
        message: `Cleaned up ${cleaned} stale conversations`,
        count: cleaned
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Express error:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// WEBSOCKET HANDLER - Exotel Media Stream
// ============================================

wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const callSid = url.searchParams.get('callSid');
    const phoneNumber = url.searchParams.get('phoneNumber');

    logger.info(`WebSocket connection: ${callSid} from ${phoneNumber}`);

    try {
        // Create realtime session handler
        const realtimeSession = await createRealtimeSession(ws, callSid, phoneNumber);

        logger.info(`Realtime session created for call: ${callSid}`);
    } catch (error) {
        logger.error('Error creating realtime session:', error.message);
        ws.close(1011, 'Error initializing session');
    }
});

// ============================================
// WEB VOICE WEBSOCKET HANDLER
// ============================================

async function handleWebVoiceConnection(clientWs, request) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const model = url.searchParams.get('model') || process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17';

    logger.info(`Web voice WebSocket connection initiated with model: ${model}`);

    try {
        // Connect to OpenAI Realtime API
        const openaiWs = new WebSocket(
            `wss://api.openai.com/v1/realtime?model=${model}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'realtime=v1'
                }
            }
        );

        // Handle OpenAI connection open
        openaiWs.on('open', () => {
            logger.info('Connected to OpenAI Realtime API');
        });

        // Forward messages from client to OpenAI
        clientWs.on('message', (data) => {
            if (openaiWs.readyState === WebSocket.OPEN) {
                openaiWs.send(data);
            }
        });

        // Forward messages from OpenAI to client
        openaiWs.on('message', (data) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(data);
            }
        });

        // Handle disconnections
        clientWs.on('close', () => {
            logger.info('Client WebSocket closed');
            if (openaiWs.readyState === WebSocket.OPEN) {
                openaiWs.close();
            }
        });

        openaiWs.on('close', () => {
            logger.info('OpenAI WebSocket closed');
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close();
            }
        });

        // Handle errors
        clientWs.on('error', (err) => {
            logger.error('Client WebSocket error:', err.message);
        });

        openaiWs.on('error', (err) => {
            logger.error('OpenAI WebSocket error:', err.message);
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close(1011, 'OpenAI connection error');
            }
        });

    } catch (error) {
        logger.error('Error setting up web voice connection:', error.message);
        clientWs.close(1011, 'Failed to connect to OpenAI');
    }
}

// ============================================
// WEBSOCKET UPGRADE HANDLER
// ============================================

server.on('upgrade', (request, socket, head) => {
    // Parse URL and get pathname (without query string)
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/exotel-media-stream') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else if (pathname === '/api/web-voice/realtime') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            handleWebVoiceConnection(ws, request);
        });
    } else {
        socket.destroy();
    }
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
    try {
        // Test database connection
        logger.info('Testing Supabase connection...');
        const dbConnected = await testConnection();
        if (dbConnected) {
            logger.info('✓ Supabase connected successfully');
        } else {
            logger.warn('⚠ Supabase connection failed - running without database');
        }

        // Validate required environment variables
        const required = ['OPENAI_API_KEY'];
        const missing = required.filter(key => !process.env[key]);

        if (missing.length > 0) {
            logger.error(`Missing required environment variables: ${missing.join(', ')}`);
            process.exit(1);
        }

        // Start server
        server.listen(PORT, () => {
            logger.info('='.repeat(60));
            logger.info(`🏥 ${HOSPITAL_INFO.name}`);
            logger.info(`🤖 AI Voice Assistant Server`);
            logger.info('='.repeat(60));
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📡 Environment: ${NODE_ENV}`);
            logger.info(`🌐 HTTP: http://localhost:${PORT}`);
            logger.info(`🔌 WebSocket: ws://localhost:${PORT}/exotel-media-stream`);
            logger.info('='.repeat(60));
            logger.info('📞 Exotel Webhooks:');
            logger.info(`   - Incoming Call: http://localhost:${PORT}/exotel/incoming-call`);
            logger.info(`   - Call Status: http://localhost:${PORT}/exotel/call-status`);
            logger.info(`   - Emergency Transfer: http://localhost:${PORT}/exotel/emergency-transfer`);
            logger.info('='.repeat(60));
            logger.info('✨ Ready to receive calls!');
            logger.info('='.repeat(60));
        });
    } catch (error) {
        logger.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');

    // Close all active connections
    wss.clients.forEach(client => {
        client.close(1000, 'Server shutting down');
    });

    // End all active conversations
    const conversations = conversationManager.getActiveConversations();
    for (const conv of conversations) {
        await conversationManager.endConversation(conv.sessionId, 'server_shutdown');
    }

    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    process.emit('SIGTERM');
});

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// ============================================
// START THE SERVER
// ============================================

startServer();

export default app;
