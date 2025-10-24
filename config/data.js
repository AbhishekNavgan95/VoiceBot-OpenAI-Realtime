// ============================================
// Lilavati Hospital Configuration and System Prompts
// ============================================

export const HOSPITAL_INFO = {
    name: "Lilavati Hospital and Research Centre",
    shortName: "Lilavati Hospital",
    location: "Mumbai, Maharashtra, India",
    established: "1978",
    type: "Multi-specialty Tertiary Care Hospital",
    beds: "323 beds",
    accreditations: ["JCI", "NABH", "NABL"]
};

// ============================================
// SYSTEM PROMPT - Core AI Assistant Instructions
// ============================================

export const SYSTEM_PROMPT = `You are Maya, an intelligent AI voice assistant for लीलावती Hospital and Research Centre in Mumbai, India. You are the primary telephone operator replacement and your role is to help callers efficiently by:

## PRIMARY RESPONSIBILITIES:
1. **Identify caller needs** quickly and accurately through natural conversation
2. **Route calls** to the appropriate department or personnel
3. **Provide information** about hospital services, locations, timings, and contacts
4. **Schedule appointments** or guide callers on how to book appointments
5. **Handle emergencies** by immediately connecting to emergency services

## YOUR PERSONALITY:
- Warm, professional, and empathetic
- Patient and understanding with elderly or distressed callers
- Clear and concise in communication
- Culturally sensitive and respectful
- Multilingual support (English, Hindi, Marathi)

## COMMUNICATION GUIDELINES:
- Greet callers warmly: "Hello! You've reached लीलावती Hospital. I'm Maya, your AI assistant. How may I help you today?"
- Listen carefully to understand the caller's need
- Ask clarifying questions if needed
- Be concise - avoid long monologues
- Speak naturally with appropriate pauses
- Use simple language, avoid medical jargon unless necessary
- Always confirm understanding before routing calls

## WHEN TO USE FUNCTIONS:
- Use search_doctors when caller asks about specific doctors or specializations
- Use get_departments when caller asks about hospital departments or services
- Use get_hospital_locations when caller asks about hospital branches or addresses
- Use get_contact_details when caller needs specific contact numbers
- Use schedule_appointment_info when caller wants to book an appointment
- Use emergency_protocols when caller mentions emergency keywords

## HANDLING COMMON SCENARIOS:

### 1. EMERGENCY CALLS:
If caller mentions: chest pain, severe bleeding, accident, unconscious, breathing difficulty, stroke symptoms
- Immediately respond: "This sounds urgent. I'm connecting you to our emergency department right away. Please stay on the line."
- Use emergency_protocols function
- DO NOT ask unnecessary questions

### 2. DOCTOR INQUIRIES:
- Ask for specialization or doctor name
- Search using available functions
- Provide doctor availability and consultation timings
- Guide on booking appointments

### 3. DEPARTMENT ROUTING:
- Identify the department based on caller's need
- Provide brief information about the department
- Offer to transfer the call or provide direct contact number

### 4. APPOINTMENT BOOKING:
- Get patient name, preferred department/doctor, and preferred date/time
- Guide through the booking process
- Provide appointment confirmation details

### 5. GENERAL INQUIRIES:
- Hospital timings, visiting hours, facilities
- OPD schedules, diagnostic services
- Insurance and billing queries
- Patient room inquiries

## TONE ADJUSTMENTS:
- **Emergency**: Calm, urgent, direct
- **Elderly callers**: Patient, slower pace, clearer pronunciation
- **Anxious patients**: Reassuring, warm, supportive
- **Routine inquiries**: Professional, efficient, friendly

## LANGUAGE SWITCHING:
- Start in English by default
- If caller speaks Hindi/Marathi, smoothly switch languages
- Confirm language preference if unclear

## IMPORTANT NOTES:
- Always be honest if you don't have information - offer to transfer to human operator
- Never provide medical advice or diagnosis
- Maintain patient privacy and confidentiality
- Log all conversations for quality and training purposes
- If system functions fail, gracefully inform caller and offer alternatives

## HOSPITAL DETAILS YOU SHOULD KNOW:
- Main Hospital: Bandra West, Mumbai
- 24/7 Emergency Services Available
- OPD Hours: 9:00 AM - 5:00 PM (Monday to Saturday)
- Visiting Hours: 4:00 PM - 6:00 PM
- 40+ Medical Specialties Available
- State-of-the-art diagnostic and treatment facilities

Remember: Your goal is to make every caller feel heard, helped, and cared for. You are the first point of contact and you represent the hospital's commitment to excellent patient care.

`;

// ============================================
// VOICE CONFIGURATION
// ============================================

export const VOICE_CONFIG = {
    voice: process.env.DEFAULT_VOICE || "alloy",
    inputAudioFormat: "g711_ulaw", // Best for telephony (Twilio compatibility)
    outputAudioFormat: "g711_ulaw",
    turnDetection: {
        type: "server_vad",
        threshold: parseFloat(process.env.VOICE_VAD_THRESHOLD) || 0.5,
        prefix_padding_ms: parseInt(process.env.VOICE_PREFIX_PADDING_MS) || 300,
        silence_duration_ms: parseInt(process.env.VOICE_SILENCE_DURATION_MS) || 500
    },
    temperature: 0.7,
    maxResponseOutputTokens: 1000
};

// ============================================
// DEPARTMENT MAPPING (For quick reference)
// ============================================

export const DEPARTMENT_KEYWORDS = {
    "cardiology": ["heart", "cardiac", "chest pain", "heart attack", "bp", "blood pressure"],
    "orthopedics": ["bone", "fracture", "joint", "knee", "hip", "spine", "back pain"],
    "neurology": ["brain", "nerve", "headache", "migraine", "stroke", "paralysis", "seizure"],
    "gastroenterology": ["stomach", "digestion", "liver", "intestine", "acidity", "ulcer"],
    "oncology": ["cancer", "tumor", "chemotherapy", "radiation"],
    "pediatrics": ["child", "baby", "kid", "infant", "pediatric"],
    "gynecology": ["pregnancy", "women", "obstetric", "delivery", "gynec"],
    "emergency": ["emergency", "urgent", "accident", "severe", "unconscious", "bleeding"],
    "radiology": ["xray", "x-ray", "scan", "mri", "ct scan", "ultrasound", "sonography"],
    "pathology": ["blood test", "lab test", "biopsy", "report", "test report"]
};

// ============================================
// FUNCTION CALLING TOOLS
// ============================================

export const FUNCTION_TOOLS = [
    {
        type: "function",
        name: "search_doctors",
        description: "Search for doctors by specialization, name, or department. Use when caller asks about doctors or specialists.",
        parameters: {
            type: "object",
            properties: {
                specialization: {
                    type: "string",
                    description: "Medical specialization (e.g., 'cardiology', 'orthopedics')"
                },
                doctorName: {
                    type: "string",
                    description: "Doctor's name (partial match supported)"
                },
                locationBranch: {
                    type: "string",
                    description: "Hospital branch/location"
                }
            }
        }
    },
    {
        type: "function",
        name: "get_departments",
        description: "Get list of hospital departments and their services. Use when caller asks about departments or hospital services.",
        parameters: {
            type: "object",
            properties: {
                locationId: {
                    type: "string",
                    description: "Specific hospital location ID (optional)"
                }
            }
        }
    },
    {
        type: "function",
        name: "get_hospital_locations",
        description: "Get hospital branch locations, addresses, and contact details. Use when caller asks about hospital location or address.",
        parameters: {
            type: "object",
            properties: {
                branch: {
                    type: "string",
                    description: "Branch name (optional, returns all if not specified)"
                }
            }
        }
    },
    {
        type: "function",
        name: "get_contact_details",
        description: "Get specific contact numbers for departments or services. Use when caller needs phone numbers or contact information.",
        parameters: {
            type: "object",
            properties: {
                category: {
                    type: "string",
                    description: "Category of contact (e.g., 'Emergency', 'Appointments', 'General Inquiry')"
                }
            }
        }
    },
    {
        type: "function",
        name: "check_doctor_availability",
        description: "Check doctor's availability schedule for specific days. Use when caller asks about doctor's timings or availability.",
        parameters: {
            type: "object",
            properties: {
                doctorId: {
                    type: "string",
                    description: "Doctor's unique ID"
                },
                dayOfWeek: {
                    type: "integer",
                    description: "Day of week (0=Sunday, 6=Saturday). Optional, returns all days if not specified."
                }
            },
            required: ["doctorId"]
        }
    },
    {
        type: "function",
        name: "emergency_protocol",
        description: "Activate emergency protocol for urgent medical situations. Use IMMEDIATELY when caller mentions emergency keywords.",
        parameters: {
            type: "object",
            properties: {
                emergencyType: {
                    type: "string",
                    enum: ["cardiac", "trauma", "stroke", "breathing", "bleeding", "general"],
                    description: "Type of emergency"
                },
                callerPhone: {
                    type: "string",
                    description: "Caller's phone number for callback"
                }
            },
            required: ["emergencyType"]
        }
    },
    {
        type: "function",
        name: "transfer_to_operator",
        description: "Transfer call to human operator. Use when unable to help or caller specifically requests human assistance.",
        parameters: {
            type: "object",
            properties: {
                reason: {
                    type: "string",
                    description: "Reason for transfer to human operator"
                },
                department: {
                    type: "string",
                    description: "Specific department to transfer to (optional)"
                }
            },
            required: ["reason"]
        }
    },
    {
        type: "function",
        name: "search_hospital_info",
        description: "Search general hospital information, facilities, services, or policies. Use when caller asks about hospital facilities or general information.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query (e.g., 'visiting hours', 'parking', 'cafeteria')"
                }
            },
            required: ["query"]
        }
    }
];

// ============================================
// EMERGENCY PROTOCOLS
// ============================================

export const EMERGENCY_CONTACTS = {
    main: "+91-22-2640-0000",
    ambulance: "+91-22-2640-1111",
    trauma: "+91-22-2640-2222",
    cardiac: "+91-22-2640-3333"
};

// ============================================
// CONVERSATION TEMPLATES
// ============================================

export const CONVERSATION_TEMPLATES = {
    greeting: "Hello! You've reached Lilavati Hospital. I'm Maya, your AI assistant. How may I help you today?",

    emergencyAlert: "This sounds urgent. I'm immediately connecting you to our emergency department. Please stay on the line.",

    transferring: "I'm transferring your call to {department}. Please hold for a moment.",

    noInformation: "I apologize, but I don't have that specific information right now. Let me connect you to our {department} department who can better assist you.",

    appointmentConfirmation: "I've noted your appointment request for {doctor} in {department}. You'll receive a confirmation call shortly at {phone}.",

    goodbye: "Thank you for calling Lilavati Hospital. Take care and have a great day!"
};

// ============================================
// LANGUAGE SUPPORT
// ============================================

export const SUPPORTED_LANGUAGES = {
    en: "English",
    hi: "Hindi",
    mr: "Marathi"
};

export const LANGUAGE_DETECTION_KEYWORDS = {
    hi: ["namaste", "kaise", "chahiye", "doctor", "hospital"],
    mr: ["namaskaar", "kasa", "pahije", "doctor", "hospital"]
};

export default {
    HOSPITAL_INFO,
    SYSTEM_PROMPT,
    VOICE_CONFIG,
    DEPARTMENT_KEYWORDS,
    FUNCTION_TOOLS,
    EMERGENCY_CONTACTS,
    CONVERSATION_TEMPLATES,
    SUPPORTED_LANGUAGES,
    LANGUAGE_DETECTION_KEYWORDS
};
