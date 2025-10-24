// ============================================
// Database Service Layer for Supabase Operations
// ============================================

import { supabase, isSupabaseEnabled } from '../config/supabase.js';
import logger from '../utils/logger.js';

// ============================================
// CONVERSATION SERVICES (Read/Write)
// ============================================

/**
 * Create a new conversation record
 */
export async function createConversation({ callSid, sessionId, phoneNumber, conversationType, languageDetected }) {
    if (!isSupabaseEnabled()) {
        logger.warn('Supabase not enabled, skipping conversation creation');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('conversations')
            .insert({
                call_sid: callSid,
                session_id: sessionId,
                phone_number: phoneNumber,
                conversation_type: conversationType,
                language_detected: languageDetected,
                started_at: new Date().toISOString(),
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;
        logger.info(`Conversation created: ${data.id} (${conversationType})`);
        return data;
    } catch (error) {
        logger.error('Error creating conversation:', error.message);
        return null;
    }
}

/**
 * Update conversation when it ends
 */
export async function endConversation(conversationId, status = 'completed') {
    if (!isSupabaseEnabled()) return null;

    try {
        const { data: conversation } = await supabase
            .from('conversations')
            .select('started_at')
            .eq('id', conversationId)
            .single();

        const duration = conversation
            ? Math.floor((new Date() - new Date(conversation.started_at)) / 1000)
            : 0;

        const { data, error } = await supabase
            .from('conversations')
            .update({
                ended_at: new Date().toISOString(),
                duration_seconds: duration,
                status: status
            })
            .eq('id', conversationId)
            .select()
            .single();

        if (error) throw error;
        logger.info(`Conversation ended: ${conversationId} (${duration}s, ${status})`);
        return data;
    } catch (error) {
        logger.error('Error ending conversation:', error.message);
        return null;
    }
}

/**
 * Get conversation by call SID or session ID
 */
export async function getConversation({ callSid, sessionId }) {
    if (!isSupabaseEnabled()) return null;

    try {
        let query = supabase.from('conversations').select('*');

        if (callSid) {
            query = query.eq('call_sid', callSid);
        } else if (sessionId) {
            query = query.eq('session_id', sessionId);
        } else {
            return null;
        }

        const { data, error } = await query.single();
        if (error) throw error;
        return data;
    } catch (error) {
        logger.error('Error getting conversation:', error.message);
        return null;
    }
}

/**
 * Add a message to conversation history
 */
export async function addConversationMessage({ conversationId, role, content, language, originalText, confidence, metadata }) {
    if (!isSupabaseEnabled()) return null;

    try {
        const { data, error } = await supabase
            .from('conversation_messages')
            .insert({
                conversation_id: conversationId,
                role: role,
                content: content,
                language: language,
                original_text: originalText,
                confidence: confidence,
                metadata: metadata,
                timestamp: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        logger.error('Error adding conversation message:', error.message);
        return null;
    }
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(conversationId, limit = 50) {
    if (!isSupabaseEnabled()) return [];

    try {
        const { data, error } = await supabase
            .from('conversation_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error('Error getting conversation messages:', error.message);
        return [];
    }
}

/**
 * Create conversation summary
 */
export async function createConversationSummary({ conversationId, summary, keyTopics, sentiment, actionItems }) {
    if (!isSupabaseEnabled()) return null;

    try {
        const { data, error } = await supabase
            .from('conversation_summaries')
            .insert({
                conversation_id: conversationId,
                summary: summary,
                key_topics: keyTopics,
                sentiment: sentiment,
                action_items: actionItems
            })
            .select()
            .single();

        if (error) throw error;
        logger.info(`Summary created for conversation: ${conversationId}`);
        return data;
    } catch (error) {
        logger.error('Error creating conversation summary:', error.message);
        return null;
    }
}

// ============================================
// HOSPITAL INFORMATION SERVICES (Read-Only)
// ============================================

/**
 * Get all hospital locations
 */
export async function getHospitalLocations() {
    if (!isSupabaseEnabled()) return [];

    try {
        const { data, error } = await supabase
            .from('hospital_locations')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error('Error getting hospital locations:', error.message);
        return [];
    }
}

/**
 * Get hospital location by branch
 */
export async function getHospitalLocationByBranch(branch) {
    if (!isSupabaseEnabled()) return null;

    try {
        const { data, error } = await supabase
            .from('hospital_locations')
            .select('*')
            .ilike('branch', `%${branch}%`)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        logger.error('Error getting hospital location:', error.message);
        return null;
    }
}

/**
 * Get all departments
 */
export async function getDepartments(locationId = null) {
    if (!isSupabaseEnabled()) return [];

    try {
        let query = supabase
            .from('departments')
            .select('*, hospital_locations(name, branch)')
            .eq('is_active', true);

        if (locationId) {
            query = query.eq('location_id', locationId);
        }

        const { data, error } = await query.order('name');
        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error('Error getting departments:', error.message);
        return [];
    }
}

/**
 * Get hospital general information
 */
export async function getHospitalInfo(category = null) {
    if (!isSupabaseEnabled()) return [];

    try {
        let query = supabase
            .from('hospital_info')
            .select('*')
            .eq('is_active', true);

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query.order('display_order');
        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error('Error getting hospital info:', error.message);
        return [];
    }
}

/**
 * Get contact details
 */
export async function getContactDetails(category = null) {
    if (!isSupabaseEnabled()) return [];

    try {
        let query = supabase
            .from('contact_details')
            .select('*, departments(name), hospital_locations(name, branch)')
            .eq('is_active', true);

        if (category) {
            query = query.ilike('category', `%${category}%`);
        }

        const { data, error } = await query.order('priority', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error('Error getting contact details:', error.message);
        return [];
    }
}

/**
 * Get floor plans for a location
 */
export async function getFloorPlans(locationId) {
    if (!isSupabaseEnabled()) return [];

    try {
        const { data, error } = await supabase
            .from('floor_plans')
            .select('*, hospital_locations(name, branch)')
            .eq('location_id', locationId)
            .order('floor_number');

        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error('Error getting floor plans:', error.message);
        return [];
    }
}

// ============================================
// DOCTOR SERVICES (Read/Write)
// ============================================

/**
 * Get all doctors with filters
 */
export async function getDoctors({ specialization, departmentId, locationId, isAvailable, doctorName } = {}) {
    if (!isSupabaseEnabled()) return [];

    try {
        let query = supabase
            .from('doctors')
            .select('*, departments(name), hospital_locations(name, branch)')
            .eq('is_active', true);

        if (specialization) {
            query = query.ilike('specialization', `%${specialization}%`);
        }
        if (doctorName) {
            query = query.ilike('name', `%${doctorName}%`);
        }
        if (departmentId) {
            query = query.eq('department_id', departmentId);
        }
        if (locationId) {
            query = query.eq('location_id', locationId);
        }
        if (isAvailable !== undefined) {
            query = query.eq('is_available', isAvailable);
        }

        const { data, error } = await query.order('name');
        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error('Error getting doctors:', error.message);
        return [];
    }
}

/**
 * Get doctor by ID
 */
export async function getDoctorById(doctorId) {
    if (!isSupabaseEnabled()) return null;

    try {
        const { data, error } = await supabase
            .from('doctors')
            .select('*, departments(name), hospital_locations(name, branch)')
            .eq('id', doctorId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        logger.error('Error getting doctor:', error.message);
        return null;
    }
}

/**
 * Update doctor availability status
 */
export async function updateDoctorAvailability(doctorId, isAvailable) {
    if (!isSupabaseEnabled()) return null;

    try {
        const { data, error } = await supabase
            .from('doctors')
            .update({ is_available: isAvailable })
            .eq('id', doctorId)
            .select()
            .single();

        if (error) throw error;
        logger.info(`Doctor availability updated: ${doctorId} - ${isAvailable}`);
        return data;
    } catch (error) {
        logger.error('Error updating doctor availability:', error.message);
        return null;
    }
}

/**
 * Get doctor availability schedule
 */
export async function getDoctorAvailability(doctorId, dayOfWeek = null) {
    if (!isSupabaseEnabled()) return [];

    try {
        let query = supabase
            .from('doctor_availability')
            .select('*, doctors(name, specialization), hospital_locations(name, branch)')
            .eq('doctor_id', doctorId)
            .eq('is_active', true);

        if (dayOfWeek !== null) {
            query = query.eq('day_of_week', dayOfWeek);
        }

        const { data, error } = await query.order('day_of_week').order('start_time');
        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error('Error getting doctor availability:', error.message);
        return [];
    }
}

/**
 * Get doctor shifts
 */
export async function getDoctorShifts(doctorId, startDate = null, endDate = null) {
    if (!isSupabaseEnabled()) return [];

    try {
        let query = supabase
            .from('doctor_shifts')
            .select('*, doctors(name, specialization), hospital_locations(name, branch)')
            .eq('doctor_id', doctorId);

        if (startDate) {
            query = query.gte('shift_date', startDate);
        }
        if (endDate) {
            query = query.lte('shift_date', endDate);
        }

        const { data, error } = await query.order('shift_date').order('start_time');
        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error('Error getting doctor shifts:', error.message);
        return [];
    }
}

// ============================================
// SEARCH AND QUERY HELPERS
// ============================================

/**
 * Search across hospital info, departments, and doctors
 */
export async function searchHospitalData(searchTerm) {
    if (!isSupabaseEnabled()) return { doctors: [], departments: [], info: [] };

    try {
        const [doctors, departments, info] = await Promise.all([
            getDoctors({ specialization: searchTerm }),
            supabase
                .from('departments')
                .select('*')
                .ilike('name', `%${searchTerm}%`)
                .eq('is_active', true)
                .then(({ data }) => data || []),
            supabase
                .from('hospital_info')
                .select('*')
                .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
                .eq('is_active', true)
                .then(({ data }) => data || [])
        ]);

        return { doctors, departments, info };
    } catch (error) {
        logger.error('Error searching hospital data:', error.message);
        return { doctors: [], departments: [], info: [] };
    }
}

/**
 * Get context for AI - retrieves relevant information based on query
 */
export async function getAIContext(query) {
    if (!isSupabaseEnabled()) return null;

    const context = {
        locations: await getHospitalLocations(),
        departments: await getDepartments(),
        contactInfo: await getContactDetails()
    };

    // If query mentions specific things, get more details
    if (query && query.match(/doctor|dr\.?|physician/i)) {
        context.doctors = await getDoctors({ isAvailable: true });
    }

    return context;
}

export default {
    // Conversation services
    createConversation,
    endConversation,
    getConversation,
    addConversationMessage,
    getConversationMessages,
    createConversationSummary,

    // Hospital info services
    getHospitalLocations,
    getHospitalLocationByBranch,
    getDepartments,
    getHospitalInfo,
    getContactDetails,
    getFloorPlans,

    // Doctor services
    getDoctors,
    getDoctorById,
    updateDoctorAvailability,
    getDoctorAvailability,
    getDoctorShifts,

    // Search and helpers
    searchHospitalData,
    getAIContext
};
