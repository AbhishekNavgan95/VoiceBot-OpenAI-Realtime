# Lilavati Hospital AI Voice Assistant - Frontend

Modern, responsive web interface for interacting with the Lilavati Hospital AI Voice Assistant. Built with React, Vite, and Tailwind CSS.

## Features

### 1. Web Voice Chat
- Click-to-talk interface with microphone button
- Real-time voice conversation with Maya (AI assistant)
- Live transcription display
- Ultra-low latency WebRTC audio streaming
- Visual status indicators

### 2. Phone Callback
- Enter phone number to receive instant callback
- Real-time call status tracking
- Support for multiple country codes
- Automatic call initiation via Twilio

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Backend server running on port 8000

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env if needed (default: http://localhost:8000)
# VITE_API_URL=http://localhost:8000

# Start development server
npm run dev
```

The frontend will start on **http://localhost:3000**

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── WebVoiceChat.jsx      # Web voice chat component
│   │   └── PhoneCallback.jsx     # Phone callback component
│   ├── App.jsx                    # Main app with tabs
│   ├── main.jsx                   # React entry point
│   └── index.css                  # Tailwind CSS + custom styles
├── public/                        # Static assets
├── index.html                     # HTML template
├── package.json                   # Dependencies
├── vite.config.js                 # Vite configuration
├── tailwind.config.js             # Tailwind configuration
└── postcss.config.js              # PostCSS configuration
```

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI framework |
| Vite | 5.0.8 | Build tool & dev server |
| Tailwind CSS | 3.4.0 | Styling |
| Axios | 1.6.5 | HTTP client |
| Lucide React | 0.307.0 | Icons |
| Sonner | 1.3.1 | Toast notifications |

## Environment Variables

Create a `.env` file:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000

# Environment
VITE_NODE_ENV=development
```

For production:
```env
VITE_API_URL=https://your-api-domain.com
VITE_NODE_ENV=production
```

## Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Features in Detail

### Web Voice Chat

**How it works:**
1. Click the microphone button
2. Grant microphone permission
3. Start speaking naturally
4. Maya responds in real-time via speakers
5. See live transcript of conversation

**Technical:**
- Uses WebRTC for real-time audio
- PCM16 audio format at 24kHz
- Server-side Voice Activity Detection
- Sub-second latency

**Code:**
- Component: `src/components/WebVoiceChat.jsx`
- API Endpoints: `/api/web-voice/*`

### Phone Callback

**How it works:**
1. Select country code
2. Enter phone number
3. Click "Call Me Now"
4. Receive call within 5-10 seconds
5. Talk to Maya over the phone

**Technical:**
- Twilio API for call initiation
- Real-time status polling
- Call progress tracking
- Multi-country support

**Code:**
- Component: `src/components/PhoneCallback.jsx`
- API Endpoints: `/api/phone/*`

## Styling

### Tailwind CSS

Custom hospital theme:
```js
colors: {
  hospital: {
    primary: '#0066CC',    // Blue
    secondary: '#00A86B',  // Green
    accent: '#FF6B6B',     // Red
    dark: '#1A1A1A',       // Dark gray
    light: '#F8F9FA'       // Light gray
  }
}
```

### Custom Components

Pre-styled components in `index.css`:
- `.btn-primary` - Primary action button
- `.btn-secondary` - Secondary button
- `.btn-danger` - Destructive action
- `.card` - Content card
- `.input-field` - Form input
- `.badge` - Status badge

## Responsive Design

Fully responsive across devices:
- **Desktop**: Full-width layout with sidebar
- **Tablet**: Stacked layout
- **Mobile**: Single column, optimized buttons

## Browser Support

Requires modern browser with:
- WebRTC support (Chrome, Firefox, Safari, Edge)
- Microphone access
- ES6+ JavaScript

### Recommended Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## API Integration

### Backend Endpoints Used

#### Web Voice Chat
```
POST   /api/web-voice/session      - Create session
POST   /api/web-voice/connect      - Connect WebRTC
POST   /api/web-voice/end          - End session
GET    /api/web-voice/status/:id   - Get status
```

#### Phone Callback
```
POST   /api/phone/initiate-call    - Initiate call
GET    /api/phone/call-status/:sid - Get call status
POST   /api/phone/cancel-call      - Cancel call
GET    /api/phone/active-calls     - List active calls
```

## Development

### Hot Reload

Vite provides instant hot module replacement (HMR):
- Changes reflect immediately
- Component state preserved
- Fast refresh

### Proxy Configuration

Vite proxy forwards API requests to backend:

```js
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  }
}
```

## Production Build

### Build

```bash
npm run build
```

Output: `dist/` directory

### Optimization

Build includes:
- Minification
- Tree-shaking
- Code splitting
- Asset optimization

### Deployment

Deploy `dist/` folder to:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag and drop `dist/`
- **AWS S3**: Upload to bucket
- **Nginx**: Serve from `/var/www/html`

### Environment Variables in Production

On hosting platform, set:
- `VITE_API_URL` - Your backend API URL

## Troubleshooting

### Microphone Not Working

**Issue**: Microphone permission denied

**Solution**:
1. Check browser permissions (lock icon in address bar)
2. Ensure HTTPS in production (required for WebRTC)
3. Try different browser

### Backend Connection Failed

**Issue**: Cannot connect to API

**Solution**:
1. Check backend is running: `http://localhost:8000/health`
2. Verify `VITE_API_URL` in `.env`
3. Check CORS configuration in backend

### Phone Callback Not Working

**Issue**: Call not received

**Solution**:
1. Check phone number format
2. Verify Twilio credentials in backend
3. Check backend logs for errors
4. Ensure Twilio number has voice capability

### Build Errors

**Issue**: `npm run build` fails

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear cache
npm cache clean --force

# Rebuild
npm run build
```

## Performance

### Lighthouse Scores (Target)
- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

### Optimization Tips
1. Lazy load components
2. Optimize images
3. Use production build
4. Enable CDN for assets
5. Implement service worker (PWA)

## Accessibility

Features:
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode

## Security

- HTTPS required in production
- No sensitive data in frontend
- API keys stored in backend only
- CORS protection
- Rate limiting on backend

## Future Enhancements

- [ ] Multi-language support (Hindi, Marathi)
- [ ] Voice biometrics
- [ ] Conversation history
- [ ] Downloadable transcripts
- [ ] PWA support (offline capability)
- [ ] Dark mode
- [ ] Mobile app (React Native)

## Testing

```bash
# Run tests (when implemented)
npm test

# Coverage
npm run test:coverage
```

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## Support

For issues:
- Check backend logs
- Review browser console
- Check network tab
- Contact: support@lilavatihospital.com

## License

MIT License - See parent directory LICENSE file

---

**Built with** ❤️ **for Lilavati Hospital**

**Version**: 1.0.0
**Last Updated**: 2025-10-15
