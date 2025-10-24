// ============================================
// Supabase Configuration Module
// ============================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    logger.warn('Supabase credentials not found. Database features will be disabled.');
}

// Initialize Supabase client
export const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: false
        },
        db: {
            schema: 'public'
        }
    })
    : null;

// Check if Supabase is enabled
export function isSupabaseEnabled() {
    return supabase !== null;
}

// Test database connection
export async function testConnection() {
    if (!isSupabaseEnabled()) {
        logger.warn('Supabase is not configured');
        return false;
    }

    try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
        );

        const queryPromise = supabase
            .from('hospital_locations')
            .select('count')
            .limit(1);

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (error) {
            logger.error('Supabase connection test failed:', error.message);
            return false;
        }

        logger.info('Supabase connection successful');
        return true;
    } catch (error) {
        logger.error('Supabase connection error:', error.message);
        return false;
    }
}

export default { supabase, isSupabaseEnabled, testConnection };
