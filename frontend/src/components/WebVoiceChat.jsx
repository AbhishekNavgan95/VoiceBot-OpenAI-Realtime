import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function WebVoiceChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, connecting, listening, speaking
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioElementRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, {
      role,
      content,
      timestamp: new Date()
    }]);
  };

  const startVoiceChat = async () => {
    try {
      setStatus('connecting');
      toast.loading('Connecting to AI assistant...');

      // Request microphone permission and get ephemeral token in parallel
      const [stream, tokenResponse] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        axios.post(`${API_URL}/api/web-voice/session`, {
          system_prompt: 'You are Maya, the AI assistant for Lilavati Hospital.'
        })
      ]);

      const { client_secret, session_id } = tokenResponse.data;
      setSessionId(session_id);

      toast.dismiss();
      toast.success('Microphone access granted');

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('RTCPeerConnection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          toast.error('Connection lost to AI assistant');
          setIsConnected(false);
          setStatus('idle');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
      };

      // Create audio element for playback
      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement('audio');
        audioElementRef.current.autoplay = true;
        audioElementRef.current.style.display = 'none'; // Hide the audio element
        document.body.appendChild(audioElementRef.current); // CRITICAL: Add to DOM for playback
        console.log('Audio element created and added to DOM');
      }

      // Add microphone stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle incoming audio from OpenAI
      pc.ontrack = (event) => {
        console.log('Received audio track from OpenAI:', event.streams[0]);
        const stream = event.streams[0];

        // Get the audio track and ensure it's enabled
        const audioTrack = stream.getAudioTracks()[0];

        console.log('Audio track details (before):', {
          id: audioTrack.id,
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          readyState: audioTrack.readyState
        });

        // CRITICAL FIX: Enable the audio track if it's not enabled
        if (!audioTrack.enabled) {
          audioTrack.enabled = true;
          console.log('✓ Enabled audio track');
        }

        // Monitor mute state changes
        audioTrack.onmute = () => {
          console.warn('⚠ Audio track was muted - this may affect playback');
        };

        audioTrack.onunmute = () => {
          console.log('✓ Audio track unmuted');
        };

        // Set audio element properties
        audioElementRef.current.srcObject = stream;
        audioElementRef.current.volume = 1.0; // Set volume to maximum
        audioElementRef.current.muted = false; // Ensure not muted

        console.log('Audio element state:', {
          volume: audioElementRef.current.volume,
          muted: audioElementRef.current.muted,
          readyState: audioElementRef.current.readyState
        });

        // Ensure playback starts
        audioElementRef.current.play()
          .then(() => {
            console.log('✓ Audio playback started successfully');

            // Check again after play
            console.log('Audio track details (after play):', {
              enabled: audioTrack.enabled,
              muted: audioTrack.muted,
              readyState: audioTrack.readyState
            });

            toast.success('Audio connected - You should hear responses now!');
          })
          .catch(err => {
            console.error('Error playing audio:', err);
            toast.error('Audio playback blocked. Click anywhere to enable.');
          });
      };

      // Create data channel for control messages
      const dataChannel = pc.createDataChannel('oai-events');
      dataChannelRef.current = dataChannel;

      // Handle data channel events
      dataChannel.onopen = () => {
        console.log('Data channel opened');
        setIsConnected(true);
        setStatus('listening');
        toast.success('Connected! Start speaking...');

        // Send session configuration
        // Note: For WebRTC mode, audio is handled natively - no transcription needed
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are Maya, an intelligent and friendly AI voice assistant for Lilavati Hospital in Mumbai, India. You help patients and callers with: finding doctors, booking appointments, getting department information, emergency services, and general hospital inquiries. Always be warm, professional, and helpful. Respond conversationally to every question.',
            voice: 'alloy',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };

        console.log('Sending session config:', sessionConfig);
        dataChannel.send(JSON.stringify(sessionConfig));
        console.log('✓ Session configured for WebRTC audio mode (no transcription needed)');
      };

      dataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleOpenAIMessage(data);
      };

      dataChannel.onclose = () => {
        console.log('Data channel closed');
        setIsConnected(false);
        setStatus('idle');
        toast.info('Connection closed');
      };

      dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
        toast.error('Data channel error - connection may be unstable');
      };

      // Create offer and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI via backend
      const answerResponse = await axios.post(`${API_URL}/api/web-voice/connect`, {
        client_secret,
        sdp: offer.sdp
      });

      const answer = {
        type: 'answer',
        sdp: answerResponse.data.sdp
      };

      await pc.setRemoteDescription(answer);

      setIsListening(true);

    } catch (error) {
      console.error('Error starting voice chat:', error);
      toast.dismiss();

      if (error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow access.');
      } else {
        toast.error('Failed to connect: ' + error.message);
      }

      setStatus('idle');
    }
  };

  const stopVoiceChat = () => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // Stop audio playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
      // Remove from DOM when done
      if (audioElementRef.current.parentNode) {
        audioElementRef.current.parentNode.removeChild(audioElementRef.current);
      }
      audioElementRef.current = null;
    }

    // End session on backend
    if (sessionId) {
      axios.post(`${API_URL}/api/web-voice/end`, { session_id: sessionId })
        .catch(err => console.error('Error ending session:', err));
    }

    setIsConnected(false);
    setIsListening(false);
    setStatus('idle');
    setSessionId(null);
    toast.success('Voice chat ended');
  };

  const handleOpenAIMessage = (message) => {
    const { type } = message;

    switch (type) {
      case 'session.created':
        console.log('OpenAI session created');
        break;

      case 'session.updated':
        console.log('OpenAI session updated');
        break;

      case 'conversation.item.created':
        console.log('Conversation item created:', message.item);
        if (message.item?.role === 'user' && message.item?.content?.[0]?.transcript) {
          const transcript = message.item.content[0].transcript;
          console.log('👤 User said:', transcript);
          addMessage('user', transcript);
        } else if (message.item?.role === 'assistant') {
          console.log('🤖 Assistant item created');
        }
        break;

      case 'input_audio_buffer.speech_started':
        console.log('User started speaking');
        setStatus('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('User stopped speaking');
        break;

      case 'input_audio_buffer.committed':
        console.log('Audio buffer committed');
        break;

      case 'response.created':
        console.log('AI response created');
        setStatus('speaking');
        break;

      case 'response.audio.delta':
        // Audio is automatically played through the MediaStream/audio element
        // This event just indicates audio is being generated
        console.log('🔊 Audio delta received from OpenAI');
        break;

      case 'response.audio_transcript.delta':
        console.log('📝 Transcript delta:', message.delta);
        setStatus('speaking');
        break;

      case 'response.audio_transcript.done':
        console.log('📝 Full transcript:', message.transcript);
        if (message.transcript) {
          addMessage('assistant', message.transcript);
          setStatus('listening');
        } else {
          console.warn('⚠ No transcript in response - AI may not have spoken');
        }
        break;

      case 'response.done':
        console.log('Response complete');
        setStatus('listening');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        console.log('✓ Transcription completed:', message.transcript);
        break;

      case 'conversation.item.input_audio_transcription.failed':
        console.error('❌ Transcription FAILED:', message.error);
        toast.error('Speech recognition failed - please try speaking again');
        setStatus('listening');
        break;

      case 'error':
        console.error('OpenAI error:', message.error);
        toast.error('AI Error: ' + (message.error?.message || 'Unknown error'));
        break;

      default:
        // Don't log every unhandled type to reduce console spam
        if (!['conversation.updated', 'rate_limits.updated'].includes(type)) {
          console.log('Unhandled message type:', type, message);
        }
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'connecting':
        return { text: 'Connecting...', color: 'text-yellow-600', icon: Volume2 };
      case 'listening':
        return { text: 'Listening...', color: 'text-green-600', icon: Mic };
      case 'speaking':
        return { text: 'Maya is speaking...', color: 'text-blue-600', icon: Volume2 };
      default:
        return { text: 'Click microphone to start', color: 'text-gray-600', icon: MicOff };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="card max-w-4xl mx-auto">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
            <StatusIcon className={`h-6 w-6 ${statusDisplay.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Web Voice Chat</h3>
            <p className={`text-sm ${statusDisplay.color} font-medium`}>
              {statusDisplay.text}
            </p>
          </div>
        </div>
        {isConnected && (
          <span className="badge badge-success flex items-center space-x-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>Connected</span>
          </span>
        )}
      </div>

      {/* Microphone Button */}
      <div className="flex justify-center mb-6">
        {!isConnected ? (
          <button
            onClick={startVoiceChat}
            disabled={status === 'connecting'}
            className="relative group"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-hospital-primary to-blue-600 flex items-center justify-center shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
              <Mic className="h-16 w-16 text-white" />
            </div>
            <div className="absolute inset-0 rounded-full bg-hospital-primary opacity-0 group-hover:opacity-20 animate-pulse-slow"></div>
          </button>
        ) : (
          <button
            onClick={stopVoiceChat}
            className="relative group"
          >
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl hover:shadow-3xl transition-all duration-300 ${
              isListening ? 'mic-active' : ''
            }`}>
              <PhoneOff className="h-16 w-16 text-white" />
            </div>
          </button>
        )}
      </div>

      <p className="text-center text-gray-600 mb-6">
        {!isConnected
          ? 'Click the microphone to start talking with Maya'
          : 'Click the phone icon to end the conversation'}
      </p>

      {/* Conversation Display */}
      {messages.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Conversation</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-hospital-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {message.role === 'user' ? 'You' : 'Maya'}
                  </p>
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">How it works:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Click the microphone to start</li>
          <li>• Speak naturally - Maya will respond in real-time</li>
          <li>• Ask about doctors, departments, or hospital services</li>
          <li>• For emergencies, Maya will connect you immediately</li>
        </ul>
      </div>
    </div>
  );
}

export default WebVoiceChat;
