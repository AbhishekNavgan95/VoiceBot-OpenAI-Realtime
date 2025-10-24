// ============================================
// Function Calling Handlers for OpenAI Realtime API
// ============================================

import * as db from './database.js';
import logger from '../utils/logger.js';
import { EMERGENCY_CONTACTS } from '../config/data.js';

// ============================================
// FUNCTION HANDLERS
// ============================================

/**
 * Search for doctors by specialization, name, or location
 */
export async function searchDoctors(args) {
    try {
        const { specialization, doctorName, locationBranch } = args;

        logger.info(`Searching doctors: specialization=${specialization}, name=${doctorName}, branch=${locationBranch}`);

        let locationId = null;
        if (locationBranch) {
            const location = await db.getHospitalLocationByBranch(locationBranch);
            locationId = location?.id;
        }

        const doctors = await db.getDoctors({
            specialization,
            doctorName,
            locationId,
            isAvailable: true
        });

        if (doctors.length === 0) {
            return {
                success: false,
                message: "No doctors found matching your criteria. Would you like me to check our general physician availability?"
            };
        }

        // Format doctor information for AI response
        const doctorList = doctors.map(doc => {
            const locationInfo = doc.hospital_locations ? ` at ${doc.hospital_locations.branch}` : '';
            const deptInfo = doc.departments ? ` in ${doc.departments.name}` : '';
            return `Dr. ${doc.name}, ${doc.specialization}${deptInfo}${locationInfo}. Consultation fee: ₹${doc.consultation_fee || 'Not specified'}`;
        }).join('\n');

        return {
            success: true,
            count: doctors.length,
            doctors: doctors,
            message: `I found ${doctors.length} doctor(s):\n${doctorList}`
        };
    } catch (error) {
        logger.error('Error in searchDoctors:', error.message);
        return {
            success: false,
            message: "I'm having trouble accessing doctor information right now. Let me connect you to our appointments desk."
        };
    }
}

/**
 * Get hospital departments
 */
export async function getDepartmentsList(args) {
    try {
        const { locationId } = args || {};

        logger.info(`Getting departments list: locationId=${locationId}`);

        const departments = await db.getDepartments(locationId);

        if (departments.length === 0) {
            return {
                success: false,
                message: "I couldn't retrieve department information at the moment."
            };
        }

        const deptList = departments.map(dept => {
            const services = dept.services ? ` Services: ${dept.services.join(', ')}` : '';
            const floor = dept.floor_number ? ` (Floor ${dept.floor_number})` : '';
            return `${dept.name}${floor}.${services}`;
        }).join('\n');

        return {
            success: true,
            count: departments.length,
            departments: departments,
            message: `We have ${departments.length} departments:\n${deptList}`
        };
    } catch (error) {
        logger.error('Error in getDepartmentsList:', error.message);
        return {
            success: false,
            message: "I'm having trouble accessing department information. Let me transfer you to our main desk."
        };
    }
}

/**
 * Get hospital locations
 */
export async function getHospitalLocationsList(args) {
    try {
        const { branch } = args || {};

        logger.info(`Getting hospital locations: branch=${branch}`);

        let locations = [];
        if (branch) {
            const location = await db.getHospitalLocationByBranch(branch);
            if (location) locations = [location];
        } else {
            locations = await db.getHospitalLocations();
        }

        if (locations.length === 0) {
            return {
                success: false,
                message: "I couldn't find that location. Our main hospital is in Bandra West, Mumbai."
            };
        }

        const locationList = locations.map(loc => {
            const timings = loc.timings ? `\nOPD: ${loc.timings.opd || '9 AM - 5 PM'}, Emergency: ${loc.timings.emergency || '24/7'}` : '';
            return `${loc.name} - ${loc.branch}\nAddress: ${loc.address}, ${loc.city}\nPhone: ${loc.phone_number}${timings}`;
        }).join('\n\n');

        return {
            success: true,
            count: locations.length,
            locations: locations,
            message: locationList
        };
    } catch (error) {
        logger.error('Error in getHospitalLocationsList:', error.message);
        return {
            success: false,
            message: "Our main hospital is at Bandra West, Mumbai. For exact address, let me transfer you to our front desk."
        };
    }
}

/**
 * Get contact details
 */
export async function getContactInfo(args) {
    try {
        const { category } = args || {};

        logger.info(`Getting contact details: category=${category}`);

        const contacts = await db.getContactDetails(category);

        if (contacts.length === 0) {
            return {
                success: false,
                message: "Let me transfer you to our main reception who can provide the contact details you need."
            };
        }

        const contactList = contacts.map(contact => {
            const dept = contact.departments ? `${contact.departments.name} - ` : '';
            const ext = contact.extension ? ` (Ext: ${contact.extension})` : '';
            const hours = contact.available_hours ? `\nAvailable: ${contact.available_hours}` : '';
            return `${dept}${contact.category}\nPhone: ${contact.phone_number}${ext}${hours}`;
        }).join('\n\n');

        return {
            success: true,
            count: contacts.length,
            contacts: contacts,
            message: contactList
        };
    } catch (error) {
        logger.error('Error in getContactInfo:', error.message);
        return {
            success: false,
            message: "For all inquiries, you can reach our main desk at +91-22-2640-0000."
        };
    }
}

/**
 * Check doctor availability
 */
export async function checkDoctorAvailability(args) {
    try {
        const { doctorId, dayOfWeek } = args;

        logger.info(`Checking doctor availability: doctorId=${doctorId}, day=${dayOfWeek}`);

        const availability = await db.getDoctorAvailability(doctorId, dayOfWeek);

        if (availability.length === 0) {
            return {
                success: false,
                message: "I couldn't find availability information for this doctor. Let me connect you to appointments for assistance."
            };
        }

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const schedule = availability.map(slot => {
            const day = days[slot.day_of_week];
            const location = slot.hospital_locations ? ` at ${slot.hospital_locations.branch}` : '';
            return `${day}: ${slot.start_time} - ${slot.end_time}${location}`;
        }).join('\n');

        return {
            success: true,
            availability: availability,
            message: `Doctor's availability:\n${schedule}\n\nWould you like me to help you book an appointment?`
        };
    } catch (error) {
        logger.error('Error in checkDoctorAvailability:', error.message);
        return {
            success: false,
            message: "I'm having trouble checking availability. Let me transfer you to our appointments desk."
        };
    }
}

/**
 * Emergency protocol activation
 */
export async function emergencyProtocol(args) {
    try {
        const { emergencyType, callerPhone } = args;

        logger.warn(`EMERGENCY PROTOCOL ACTIVATED: type=${emergencyType}, phone=${callerPhone}`);

        // Return emergency contact based on type
        const emergencyContacts = {
            cardiac: EMERGENCY_CONTACTS.cardiac,
            trauma: EMERGENCY_CONTACTS.trauma,
            default: EMERGENCY_CONTACTS.main
        };

        const contactNumber = emergencyContacts[emergencyType] || emergencyContacts.default;

        return {
            success: true,
            emergency: true,
            emergencyType: emergencyType,
            contactNumber: contactNumber,
            message: "This is an emergency situation. I'm immediately connecting you to our emergency department. Please stay on the line.",
            action: "TRANSFER_EMERGENCY",
            transferTo: contactNumber
        };
    } catch (error) {
        logger.error('Error in emergencyProtocol:', error.message);
        return {
            success: true,
            emergency: true,
            message: "Emergency situation detected. Connecting you to emergency services immediately.",
            action: "TRANSFER_EMERGENCY",
            transferTo: EMERGENCY_CONTACTS.main
        };
    }
}

/**
 * Transfer to human operator
 */
export async function transferToOperator(args) {
    try {
        const { reason, department } = args;

        logger.info(`Transfer requested: reason=${reason}, department=${department}`);

        return {
            success: true,
            action: "TRANSFER_OPERATOR",
            department: department || "General",
            reason: reason,
            message: `I understand. Let me transfer you to ${department || 'our operator'} who can better assist you. Please hold.`
        };
    } catch (error) {
        logger.error('Error in transferToOperator:', error.message);
        return {
            success: true,
            action: "TRANSFER_OPERATOR",
            message: "Let me transfer you to our operator. Please hold."
        };
    }
}

/**
 * Search hospital information
 */
export async function searchHospitalInformation(args) {
    try {
        const { query } = args;

        logger.info(`Searching hospital info: query=${query}`);

        const results = await db.searchHospitalData(query);
        const info = await db.getHospitalInfo();

        // Search in hospital info for matching content
        const matchingInfo = info.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.content.toLowerCase().includes(query.toLowerCase())
        );

        if (matchingInfo.length === 0 && results.doctors.length === 0 && results.departments.length === 0) {
            return {
                success: false,
                message: "I couldn't find specific information about that. Would you like me to connect you to our information desk?"
            };
        }

        let response = "";

        if (matchingInfo.length > 0) {
            response += matchingInfo.map(item => `${item.title}: ${item.content}`).join('\n\n');
        }

        if (results.departments.length > 0) {
            response += `\n\nRelated departments: ${results.departments.map(d => d.name).join(', ')}`;
        }

        return {
            success: true,
            info: matchingInfo,
            relatedDoctors: results.doctors,
            relatedDepartments: results.departments,
            message: response || "I found some related information. How can I help you further?"
        };
    } catch (error) {
        logger.error('Error in searchHospitalInformation:', error.message);
        return {
            success: false,
            message: "I'm having trouble searching that information. Let me connect you to our information desk."
        };
    }
}

// ============================================
// FUNCTION ROUTER
// ============================================

/**
 * Route function calls to appropriate handlers
 */
export async function handleFunctionCall(functionName, args) {
    logger.info(`Function called: ${functionName}`);

    const handlers = {
        'search_doctors': searchDoctors,
        'get_departments': getDepartmentsList,
        'get_hospital_locations': getHospitalLocationsList,
        'get_contact_details': getContactInfo,
        'check_doctor_availability': checkDoctorAvailability,
        'emergency_protocol': emergencyProtocol,
        'transfer_to_operator': transferToOperator,
        'search_hospital_info': searchHospitalInformation
    };

    const handler = handlers[functionName];

    if (!handler) {
        logger.error(`Unknown function: ${functionName}`);
        return {
            success: false,
            message: "I'm not sure how to handle that request. Let me connect you to our operator."
        };
    }

    try {
        const result = await handler(args);
        return result;
    } catch (error) {
        logger.error(`Error handling function ${functionName}:`, error.message);
        return {
            success: false,
            message: "I encountered an error processing your request. Let me transfer you to our operator."
        };
    }
}

export default {
    handleFunctionCall,
    searchDoctors,
    getDepartmentsList,
    getHospitalLocationsList,
    getContactInfo,
    checkDoctorAvailability,
    emergencyProtocol,
    transferToOperator,
    searchHospitalInformation
};
