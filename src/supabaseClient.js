import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

// Placeholders keep the app from crashing so we can show a helpful message instead.
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing-key');
