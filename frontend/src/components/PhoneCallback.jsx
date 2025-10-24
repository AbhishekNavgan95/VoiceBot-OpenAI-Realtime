import { useState } from 'react';
import { Phone, PhoneCall, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function PhoneCallback() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callStatus, setCallStatus] = useState(null); // null, 'initiating', 'ringing', 'connected', 'completed'
  const [callSid, setCallSid] = useState(null);

  const formatPhoneNumber = (value) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');

    // Format as: XXX-XXX-XXXX (for 10 digits)
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length <= 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const validatePhoneNumber = () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (countryCode === '+91' && cleaned.length !== 10) {
      return false;
    }
    if (countryCode === '+1' && cleaned.length !== 10) {
      return false;
    }
    return cleaned.length >= 10;
  };

  const handleRequestCallback = async () => {
    if (!validatePhoneNumber()) {
      toast.error('Please enter a valid phone number');
      return;
    }

    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    const fullNumber = `${countryCode}${cleanedNumber}`;

    setIsSubmitting(true);
    setCallStatus('initiating');

    try {
      const response = await axios.post(`${API_URL}/api/phone/initiate-call`, {
        phone_number: fullNumber,
        from_web: true
      });

      const { call_sid, status } = response.data;
      setCallSid(call_sid);

      toast.success('Call initiated! You should receive a call shortly.');
      setCallStatus('ringing');

      // Poll for call status
      startStatusPolling(call_sid);

    } catch (error) {
      console.error('Error initiating callback:', error);
      toast.error(error.response?.data?.error || 'Failed to initiate call. Please try again.');
      setCallStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startStatusPolling = (sid) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/phone/call-status/${sid}`);
        const { status } = response.data;

        setCallStatus(status);

        if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
          clearInterval(pollInterval);

          if (status === 'completed') {
            toast.success('Call completed successfully');
          } else {
            toast.error(`Call ${status}`);
          }

          // Reset after delay
          setTimeout(() => {
            setCallStatus(null);
            setCallSid(null);
          }, 3000);
        } else if (status === 'in-progress') {
          setCallStatus('connected');
          toast.success('Call connected! Maya is on the line.');
        }

      } catch (error) {
        console.error('Error polling status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(pollInterval), 120000);
  };

  const handleCancel = () => {
    if (callSid && callStatus !== 'completed') {
      axios.post(`${API_URL}/api/phone/cancel-call`, { call_sid: callSid })
        .then(() => toast.success('Call cancelled'))
        .catch(err => console.error('Error cancelling call:', err));
    }

    setPhoneNumber('');
    setCallStatus(null);
    setCallSid(null);
  };

  const getStatusInfo = () => {
    switch (callStatus) {
      case 'initiating':
        return {
          icon: Loader2,
          text: 'Initiating call...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          animate: 'animate-spin'
        };
      case 'ringing':
        return {
          icon: Phone,
          text: 'Calling your number...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          animate: 'animate-bounce-slow'
        };
      case 'in-progress':
      case 'connected':
        return {
          icon: PhoneCall,
          text: 'Connected! Maya is talking to you.',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          animate: ''
        };
      case 'completed':
        return {
          icon: Check,
          text: 'Call completed successfully',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          animate: ''
        };
      case 'failed':
      case 'busy':
      case 'no-answer':
        return {
          icon: AlertCircle,
          text: `Call ${callStatus}. Please try again.`,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          animate: ''
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo?.icon;

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="bg-hospital-secondary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Request a Callback
        </h3>
        <p className="text-gray-600">
          Enter your phone number and we'll call you within seconds
        </p>
      </div>

      {/* Status Display */}
      {statusInfo && (
        <div className={`${statusInfo.bgColor} border-2 border-${statusInfo.color.replace('text-', '')} rounded-lg p-4 mb-6 flex items-center space-x-3`}>
          <StatusIcon className={`h-6 w-6 ${statusInfo.color} ${statusInfo.animate}`} />
          <div>
            <p className={`font-semibold ${statusInfo.color}`}>
              {statusInfo.text}
            </p>
            {callStatus === 'connected' && (
              <p className="text-sm text-gray-600 mt-1">
                Answer the call and tell Maya how we can help you today!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Phone Number Input */}
      {!callStatus && (
        <div className="space-y-4">
          {/* Country Code Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="input-field"
              disabled={isSubmitting}
            >
              <option value="+91">🇮🇳 India (+91)</option>
              <option value="+1">🇺🇸 United States (+1)</option>
              <option value="+44">🇬🇧 United Kingdom (+44)</option>
              <option value="+971">🇦🇪 UAE (+971)</option>
            </select>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="XXX-XXX-XXXX"
                maxLength="12"
                className="input-field pl-12"
                disabled={isSubmitting}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {countryCode === '+91' ? 'Enter 10-digit mobile number' : 'Enter your phone number'}
            </p>
          </div>

          {/* Call Button */}
          <button
            onClick={handleRequestCallback}
            disabled={!validatePhoneNumber() || isSubmitting}
            className="w-full btn-primary flex items-center justify-center space-x-2 py-4 text-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Initiating Call...</span>
              </>
            ) : (
              <>
                <PhoneCall className="h-6 w-6" />
                <span>Call Me Now</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Cancel Button (when call is active) */}
      {callStatus && callStatus !== 'completed' && callStatus !== 'failed' && (
        <button
          onClick={handleCancel}
          className="w-full btn-danger flex items-center justify-center space-x-2 py-3"
        >
          <Phone className="h-5 w-5" />
          <span>Cancel Call</span>
        </button>
      )}

      {/* Information Card */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
          <Check className="h-4 w-4 text-green-600 mr-2" />
          What happens next:
        </h4>
        <ol className="text-sm text-gray-700 space-y-2 ml-2">
          <li className="flex items-start">
            <span className="font-bold mr-2">1.</span>
            <span>You'll receive a call within 5-10 seconds</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">2.</span>
            <span>Maya will greet you and ask how she can help</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">3.</span>
            <span>Tell her what you need (doctor info, appointments, etc.)</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">4.</span>
            <span>Maya will connect you to the right department or provide information</span>
          </li>
        </ol>
      </div>

      {/* Privacy Notice */}
      <p className="text-xs text-gray-500 text-center mt-4">
        Your phone number will only be used for this call and stored securely. We respect your privacy.
      </p>
    </div>
  );
}

export default PhoneCallback;
