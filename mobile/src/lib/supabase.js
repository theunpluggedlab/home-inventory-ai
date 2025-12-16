import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wubtmmdmxwjesytfyogk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YnRtbWRteHdqZXN5dGZ5b2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzQyNDQsImV4cCI6MjA4MTQxMDI0NH0.T_DlLFwHl1mPtddcpXEHMN4AO4Br2oe9XB_oyjcaJmQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
