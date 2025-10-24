import { useState } from 'react';
import { Phone, MessageSquare, ActivitySquare } from 'lucide-react';
import { Toaster } from 'sonner';
// Assuming these components exist
import WebVoiceChat from './components/WebVoiceChat';
import PhoneCallback from './components/PhoneCallback';

// --- Custom Colors Definition] (Simulating tailwind.config.js) ---
// Note: In a real project, these colors should be configured in tailwind.config.js
// I'm defining them here to make the component functional and demonstrate the fix.
const customColors = {
  'hospital-primary': '#00A86B', // A standard medical green/teal for Primary
  'hospital-secondary': '#007040', // A darker green for Secondary
  'purple-600': '#9333ea', // Defined for completeness, though Tailwind has it
};

function App() {
  const [activeTab, setActiveTab] = useState('web-chat');

  // Helper function to get the primary background style
  const primaryBgStyle = { backgroundColor: customColors['hospital-primary'] };
  // Helper function to get the primary text color style
  const primaryTextStyle = { color: customColors['hospital-primary'] };
  // Helper function to get the secondary text color style
  const secondaryTextStyle = { color: customColors['hospital-secondary'] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* FIXED: Replaced bg-hospital-primary with inline style */}
              <div className="p-2 rounded-lg" style={primaryBgStyle}>
                <ActivitySquare className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Lilavati Hospital
                </h1>
                <p className="text-sm text-gray-600">AI Voice Assistant</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Emergency</p>
                {/* FIXED: Replaced text-hospital-primary with inline style */}
                <p className="text-lg font-semibold" style={primaryTextStyle}>
                  +91-22-2640-1111
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Talk to Maya, Our AI Assistant
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get instant help with appointments, doctor information, department details, and more.
            Choose how you'd like to connect with us.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('web-chat')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'web-chat'
                  ? 'text-white shadow-md' // Styles for active tab
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              // FIXED: Applied custom color style conditionally
              style={activeTab === 'web-chat' ? primaryBgStyle : {}}
            >
              <MessageSquare className="h-5 w-5" />
              <span>Web Voice Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('phone-call')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'phone-call'
                  ? 'text-white shadow-md' // Styles for active tab
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              // FIXED: Applied custom color style conditionally
              style={activeTab === 'phone-call' ? primaryBgStyle : {}}
            >
              <Phone className="h-5 w-5" />
              <span>Phone Callback</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'web-chat' ? (
            <WebVoiceChat />
          ) : (
            <PhoneCallback />
          )}
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center hover:shadow-xl transition-shadow duration-200">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              {/* FIXED: Replaced text-hospital-primary with inline style */}
              <MessageSquare className="h-8 w-8" style={primaryTextStyle} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Instant Responses
            </h3>
            <p className="text-gray-600">
              Get answers to your queries in less than 1 second with our ultra-low latency AI
            </p>
          </div>

          <div className="card text-center hover:shadow-xl transition-shadow duration-200">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              {/* FIXED: Replaced text-hospital-secondary with inline style */}
              <Phone className="h-8 w-8" style={secondaryTextStyle} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              24/7 Available
            </h3>
            <p className="text-gray-600">
              Call us anytime, any day. Maya is always here to help you
            </p>
          </div>

          <div className="card text-center hover:shadow-xl transition-shadow duration-200">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              {/* NOTE: This one was already using standard Tailwind (text-purple-600), so it's kept */}
              <ActivitySquare  className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Smart Routing
            </h3>
            <p className="text-gray-600">
              Automatically connected to the right department or doctor
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 card bg-gradient-to-r from-blue-50 to-green-50 border-none">
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            What can Maya help you with?
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
            {/* FIXED: Replaced text-hospital-primary with inline style on list items */}
            <li className="flex items-start space-x-2">
              <span className="mt-1" style={primaryTextStyle}>✓</span>
              <span>Find doctors by specialization</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="mt-1" style={primaryTextStyle}>✓</span>
              <span>Check doctor availability and timings</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="mt-1" style={primaryTextStyle}>✓</span>
              <span>Get department information and locations</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="mt-1" style={primaryTextStyle}>✓</span>
              <span>Hospital visiting hours and facilities</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="mt-1" style={primaryTextStyle}>✓</span>
              <span>Emergency services and contact numbers</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="mt-1" style={primaryTextStyle}>✓</span>
              <span>General hospital inquiries</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-3">Lilavati Hospital</h4>
              <p className="text-gray-400 text-sm">
                A-791, Bandra Reclamation,<br />
                Bandra West, Mumbai - 400050
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-3">Contact</h4>
              <p className="text-gray-400 text-sm">
                Phone: +91-22-2640-0000<br />
                Emergency: +91-22-2640-1111<br />
                Email: info@lilavatihospital.com
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-3">Hours</h4>
              <p className="text-gray-400 text-sm">
                OPD: 9:00 AM - 5:00 PM (Mon-Sat)<br />
                Emergency: 24/7<br />
                Visiting: 4:00 PM - 6:00 PM
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-400">
            <p>&copy; 2025 Lilavati Hospital. All rights reserved. | Powered by AI Voice Assistant</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;