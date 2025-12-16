
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

export const ensureAuthenticatedUser = async () => {
    // 1. Check if session/user exists
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        console.log("Existing user found:", session.user.id);
        return session.user.id;
    }

    // 2. Try Login (Demo User)
    const email = "demo@test.com";
    const password = "demo123456";

    console.log("Attempting silent login...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signInData.user) {
        console.log("Silent login success:", signInData.user.id);
        return signInData.user.id;
    }

    // 3. If login fails, Try Signup
    console.log("Login failed or user missing. Attempting silent signup...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (signUpError) {
        console.error("Silent Auth Failed:", signUpError);
        // Fallback: If signup fails (maybe user exists but pw wrong?), just throw
        throw new Error("Could not authenticate user. " + signUpError.message);
    }

    if (signUpData.user) {
        console.log("Silent signup success:", signUpData.user.id);
        return signUpData.user.id;
    }

    throw new Error("Authentication failed unexpectedly.");
};
