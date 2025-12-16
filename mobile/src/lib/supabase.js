
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
    // 1. Check if session/user exists locally
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        console.log("Existing user found:", session.user.id);
        return session.user.id;
    }

    // 2. Credentials (Stronger to pass policies)
    const email = "admin_user@inventoryapp.com";
    const password = "SecurePass_2025!";

    console.log(`Attempting Auto-Login with ${email}...`);

    try {
        // 3. Try Auto-Login First
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInData?.user) {
            console.log("Silent login success:", signInData.user.id);
            return signInData.user.id;
        }

        if (signInError) {
            console.log("Login failed (User might not exist), attempting Silent Signup...", signInError.message);
        }

        // 4. Try Signup if Login failed
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpData?.user) {
            console.log("Silent signup success:", signUpData.user.id);
            return signUpData.user.id;
        }

        // 5. Handle "User already registered" edge case
        // If sign up failed because user exists, but sign in also failed previously,
        // it might be a race condition or network blip. Try Sign In ONE more time.
        if (signUpError && signUpError.message.toLowerCase().includes("already registered")) {
            console.log("User already exists, retrying login...");
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (retryData?.user) {
                return retryData.user.id;
            }
            if (retryError) throw retryError;
        }

        if (signUpError) throw signUpError;

    } catch (e) {
        console.error("Silent Auth Critical Failure:", e);
        // Alert the user so they know why saving is failing
        // Need to import Alert if we use it, but this file doesn't have React imports.
        // We will just throw with a clear message that the UI catches.
        throw new Error(`Auth Failed: ${e.message || "Unknown error"}. Check Supabase "Confirm Email" settings.`);
    }

    throw new Error("Authentication failed unexpectedly.");
};
