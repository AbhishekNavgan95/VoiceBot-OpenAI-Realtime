# Lilavati Hospital AI Voice Assistant

Ultra-low latency AI voice assistant for Lilavati Hospital using OpenAI's Realtime API, Twilio, and Supabase. This system replaces traditional telephone operators with an intelligent AI that can understand, route calls, and provide information with ~500-800ms latency.

## Features

- **Ultra-Low Latency**: 500-800ms response time using OpenAI Realtime API
- **Web Voice Chat**: Click-to-talk interface with real-time voice conversation
- **Phone Callback**: Enter number and receive instant callback
- **Telephony Integration**: Twilio voice calls with WebRTC media streaming
- **Intelligent Call Routing**: Automatic department and doctor identification
- **Function Calling**: Real-time database queries for doctors, departments, and hospital info
- **Conversation Logging**: Complete call transcripts saved to Supabase
- **Emergency Handling**: Immediate transfer for urgent medical situations
- **Modern Frontend**: React + Vite with Tailwind CSS
- **Multi-language Support**: English, Hindi, and Marathi (planned)
- **Scalable Architecture**: Node.js with Express and WebSockets

## Architecture Overview

```
Phone Call → Twilio → WebSocket → Express Server → OpenAI Realtime API
                                         ↓
                                   Supabase DB
```

### Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express |
| Frontend | React 18 + Vite + Tailwind CSS |
| Realtime API | OpenAI gpt-4o-realtime |
| Telephony | Twilio Voice API |
| Database | Supabase (PostgreSQL) |
| Transport | WebSockets + WebRTC |
| Audio Format | G.711 μ-law (8kHz) for phone, PCM16 for web |

## Prerequisites

1. **Node.js** >= 18.0.0
2. **Twilio Account** with:
   - Account SID
   - Auth Token
   - Phone number with voice capabilities
3. **OpenAI Account** with:
   - API key with Realtime API access
4. **Supabase Project** with:
   - Project URL
   - Service role key
   - Schema deployed (see `schema` file)
5. **Ngrok** (for local development)

## Installation

### 1. Clone and Install Backend Dependencies

```bash
# Clone the repository
cd "F:\VoiceBot OpenAI Realtime"

# Install backend dependencies
npm install
```

### 2. Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Go back to root
cd ..
```

### 3. Environment Configuration

**Backend Configuration:**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# OpenAI Realtime API
OPENAI_API_KEY=sk-proj-your-api-key-here
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
OPENAI_REALTIME_URL=wss://api.openai.com/v1/realtime

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://your-domain.com

# Voice Configuration
DEFAULT_VOICE=alloy
VOICE_VAD_THRESHOLD=0.5
VOICE_SILENCE_DURATION_MS=500
VOICE_PREFIX_PADDING_MS=300

# Logging
LOG_LEVEL=info
```

**Frontend Configuration:**

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_NODE_ENV=development
```

### 4. Database Setup

1. Create a Supabase project at https://supabase.com
2. Run the schema from the `schema` file in your Supabase SQL editor
3. Populate initial data (hospitals, departments, doctors)

### 5. Twilio Setup

1. Log in to Twilio Console
2. Get a phone number with voice capabilities
3. Configure webhooks (see deployment section)

## Development

### Start the Backend Server

```bash
# From root directory
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:8000`

### Start the Frontend

```bash
# From frontend directory
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

**Access the Application:**
- Frontend UI: http://localhost:3000
- Backend API: http://localhost:8000
- API Health: http://localhost:8000/health

### Expose Local Server with Ngrok

Twilio needs a public URL to send webhooks. Use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 8000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Configure Twilio Webhooks

1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
2. Select your phone number
3. Under "Voice & Fax", configure:
   - **A Call Comes In**: `https://your-ngrok-url.ngrok.io/twilio/incoming-call`
   - **Status Callback URL**: `https://your-ngrok-url.ngrok.io/twilio/call-status`
4. Save

### Test the System

#### Option 1: Web Voice Chat
1. Open http://localhost:3000 in your browser
2. Click on "Web Voice Chat" tab
3. Click the microphone button
4. Allow microphone access
5. Start speaking to Maya!

#### Option 2: Phone Callback
1. Open http://localhost:3000 in your browser
2. Click on "Phone Callback" tab
3. Enter your phone number
4. Click "Call Me Now"
5. You'll receive a call within seconds

#### Option 3: Direct Phone Call
1. Call your Twilio phone number
2. You should hear the AI assistant greeting
3. Check logs for conversation flow:

```bash
tail -f logs/combined.log
```

## Project Structure

```
F:\VoiceBot OpenAI Realtime\
├── server.js                      # Main Express server
├── package.json                   # Backend dependencies
├── .env                           # Backend environment variables
├── .env.example                   # Environment template
├── nodemon.json                   # Nodemon configuration
├── schema                         # Supabase database schema
├── study.md                       # Technical documentation
├── config/
│   ├── supabase.js                # Supabase client configuration
│   └── data.js                    # System prompts & hospital data
├── services/
│   ├── database.js                # Supabase database operations
│   ├── conversationManager.js     # Conversation state management
│   ├── functionHandlers.js        # OpenAI function calling handlers
│   └── realtimeHandler.js         # OpenAI Realtime API integration
├── routes/
│   ├── twilio.js                  # Twilio webhook routes
│   ├── webVoice.js                # Web voice chat routes
│   └── phoneCallback.js           # Phone callback routes
├── utils/
│   └── logger.js                  # Winston logger configuration
├── logs/
│   ├── combined.log               # All logs
│   └── error.log                  # Error logs only
└── frontend/                       # React frontend
    ├── src/
    │   ├── components/
    │   │   ├── WebVoiceChat.jsx   # Web voice chat component
    │   │   └── PhoneCallback.jsx  # Phone callback component
    │   ├── App.jsx                # Main app with tabs
    │   ├── main.jsx               # React entry point
    │   └── index.css              # Tailwind CSS
    ├── public/                    # Static assets
    ├── package.json               # Frontend dependencies
    ├── vite.config.js             # Vite configuration
    ├── tailwind.config.js         # Tailwind configuration
    └── .env                       # Frontend environment variables
```

## API Endpoints

### Health Check
```
GET /health
```

### Twilio Webhooks
```
POST /twilio/incoming-call      # Incoming call handler
POST /twilio/call-status        # Call status updates
POST /twilio/transfer-call      # Transfer call to department
POST /twilio/emergency-transfer # Emergency transfer
```

### Web Voice Chat
```
POST /api/web-voice/session     # Create voice session
POST /api/web-voice/connect     # Connect WebRTC
POST /api/web-voice/end         # End session
GET  /api/web-voice/status/:id  # Get status
```

### Phone Callback
```
POST /api/phone/initiate-call    # Initiate outbound call
GET  /api/phone/call-status/:sid # Get call status
POST /api/phone/cancel-call      # Cancel ongoing call
GET  /api/phone/active-calls     # List active calls
```

### Conversation Management
```
GET /api/conversations/active           # List active conversations
GET /api/conversations/:identifier      # Get conversation details
POST /api/admin/cleanup                 # Cleanup stale conversations
```

### WebSocket
```
ws://localhost:8000/twilio-media-stream?callSid=xxx&phoneNumber=xxx
```

## Configuration

### System Prompt

Edit `config/data.js` to customize the AI assistant's personality, instructions, and behavior. Key sections:

- **SYSTEM_PROMPT**: Core AI instructions
- **VOICE_CONFIG**: Voice settings, VAD thresholds, audio format
- **FUNCTION_TOOLS**: Available functions for hospital operations
- **DEPARTMENT_KEYWORDS**: Keyword mapping for intent detection

### Voice Settings

Adjust in `.env`:

```env
# Voice Activity Detection threshold (0.0-1.0, higher = less sensitive)
VOICE_VAD_THRESHOLD=0.5

# Silence duration before turn end (milliseconds)
VOICE_SILENCE_DURATION_MS=500

# Pre-speech buffer (milliseconds)
VOICE_PREFIX_PADDING_MS=300
```

**Latency Trade-offs:**
- Lower `VOICE_SILENCE_DURATION_MS` (200-300ms) = Faster responses, may cut off user
- Higher `VOICE_SILENCE_DURATION_MS` (800-1000ms) = More patient, slower responses
- **Optimal for most cases: 500ms**

### Function Calling

The AI can call these functions during conversations:

1. **search_doctors** - Find doctors by specialization
2. **get_departments** - List hospital departments
3. **get_hospital_locations** - Get hospital addresses
4. **get_contact_details** - Retrieve contact numbers
5. **check_doctor_availability** - Check doctor schedules
6. **emergency_protocol** - Handle emergency calls
7. **transfer_to_operator** - Transfer to human operator
8. **search_hospital_info** - General hospital information

Add new functions in `services/functionHandlers.js`

## Deployment

### Production Environment

1. **Deploy to Cloud Platform** (Railway, Heroku, AWS, etc.)

```bash
# Example: Railway
npm install -g @railway/cli
railway login
railway init
railway up
```

2. **Set Environment Variables** in your hosting platform

3. **Update Twilio Webhooks** with production URL

```
https://your-production-domain.com/twilio/incoming-call
https://your-production-domain.com/twilio/call-status
```

4. **SSL/TLS Certificate** - Required for production (WebRTC)

5. **Monitor Logs** - Use your platform's logging service

### Scaling Considerations

- Each active call = 1 WebSocket connection
- Estimate: 1 vCPU can handle ~50-100 concurrent calls
- Use load balancer for multiple instances
- Monitor memory usage (each session ~10-50 MB)
- Consider Redis for session state in multi-instance setup

## Monitoring

### View Active Conversations

```bash
curl http://localhost:8000/api/conversations/active
```

### Check Logs

```bash
# All logs
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# Filter by conversation
grep "CallSid" logs/combined.log
```

### Cleanup Stale Conversations

Automatic cleanup runs every 10 minutes. Manual cleanup:

```bash
curl -X POST http://localhost:8000/api/admin/cleanup
```

## Troubleshooting

### Issue: "OpenAI WebSocket closed immediately"

**Solution**: Check your OpenAI API key and model name. Ensure you have access to Realtime API.

```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: "Supabase connection failed"

**Solution**: Verify Supabase credentials and network access.

```bash
# Test connection
node -e "import('./config/supabase.js').then(m => m.testConnection())"
```

### Issue: "Twilio webhooks not receiving calls"

**Solution**:
1. Ensure ngrok is running and URL is updated in Twilio
2. Check ngrok logs: `http://localhost:4040`
3. Verify webhook URLs are HTTPS (not HTTP)

### Issue: "High latency / slow responses"

**Solution**:
1. Check network latency to OpenAI servers
2. Lower `VOICE_SILENCE_DURATION_MS` to 300-400ms
3. Ensure server has sufficient CPU/RAM
4. Check database query performance

### Issue: "Audio quality issues"

**Solution**:
- Twilio uses G.711 μ-law (8kHz) for phone calls
- This is optimal for telephony
- No configuration changes needed

## Performance Optimization

### Latency Breakdown

| Stage | Time | Optimization |
|-------|------|-------------|
| User speaks | 0ms | - |
| VAD detects end | +500ms | Adjust `VOICE_SILENCE_DURATION_MS` |
| Network to OpenAI | +20-50ms | Use nearby region |
| AI inference | +320-500ms | Use latest model |
| Network response | +20-50ms | - |
| Audio playback | +10-30ms | - |
| **Total** | **870-1150ms** | **Target: <1 second** |

### Tips for Lower Latency

1. Deploy server closer to OpenAI regions (US East)
2. Use faster hardware (more CPU cores)
3. Optimize database queries with indexes
4. Cache frequently accessed data
5. Use CDN for static assets

## Cost Estimation

### OpenAI Realtime API Pricing

| Component | Price | Usage |
|-----------|-------|-------|
| Audio Input | $100/1M tokens | ~15 tokens/second |
| Audio Output | $200/1M tokens | ~15 tokens/second |
| Text Input (cached) | $1.25/1M tokens | System prompt |

**Example Calculation:**
- 5-minute conversation
- Audio: 300 seconds × 15 tokens/sec = 4,500 tokens each direction
- Total: 9,000 audio tokens
- Cost: (4,500 × $100 + 4,500 × $200) / 1M = **$1.35 per 5-min call**

### Twilio Pricing

- Phone number: ~$1/month
- Incoming calls: $0.0085/minute
- Outgoing calls: $0.013/minute

### Total Estimated Cost

| Scenario | Cost per Month |
|----------|----------------|
| 100 calls × 5 min avg | $135 (OpenAI) + $4.25 (Twilio) = **$139.25** |
| 1,000 calls × 5 min avg | $1,350 (OpenAI) + $42.50 (Twilio) = **$1,392.50** |

## Security Best Practices

1. **Never commit `.env` file** - Use `.env.example` template
2. **Use Supabase Row Level Security** - Protect sensitive data
3. **Implement rate limiting** - Prevent abuse (built-in)
4. **Monitor API usage** - Set OpenAI spending limits
5. **Use HTTPS in production** - Required for WebRTC
6. **Rotate API keys regularly** - Every 90 days recommended
7. **Log access and errors** - Monitor for suspicious activity

## Testing

### Manual Testing

1. Call the Twilio number
2. Test different scenarios:
   - Ask about doctors: "I need a cardiologist"
   - Ask about departments: "Where is the radiology department?"
   - Emergency: "My chest hurts" (should trigger emergency protocol)
   - Transfer: "I want to speak to a human"

### Automated Testing (Future)

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)
- Email: support@lilavatihospital.com
- Documentation: See `study.md` for technical details

## Acknowledgments

- OpenAI for the Realtime API
- Twilio for telephony infrastructure
- Supabase for database and authentication
- Lilavati Hospital for the opportunity

---

**Version**: 1.0.0
**Last Updated**: 2025-10-15
**Author**: Pravin Paithankar
**Hospital**: Lilavati Hospital and Research Centre
