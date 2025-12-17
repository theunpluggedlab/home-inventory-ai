
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const SUPABASE_URL = 'https://ufxozegsvqtfyralmqte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeG96ZWdzdnF0ZnlyYWxtcXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzUwMjksImV4cCI6MjA4MTU1MTAyOX0.MlTeqtYer40p1LhdyelZdhJRfTaoneKWW9a2cE8k6D4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export const ensureAuthenticatedUser = async () => {
    try {
        // 1. Check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            console.log("Existing user session:", session.user.id);
            return session.user.id;
        }

        console.log("No session. Attempting Fixed Guest Auth...");
        const email = "default_guest@inventoryapp.local";
        const password = "FixedGuestPass123!";

        // 2. Try to Sign In first
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInData?.user) {
            console.log("Guest Login Success:", signInData.user.id);
            return signInData.user.id;
        }

        // 3. If Sign In failed, User likely doesn't exist -> Sign Up
        if (signInError) {
            console.log("Login failed (likely new user), attempting Signup...", signInError.message);

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) {
                // Special case: User already registered but login failed? (e.g. wrong password)
                // Should not happen with fixed password, but good to know.
                throw signUpError;
            }

            if (signUpData?.user) {
                console.log("Guest Signup Success:", signUpData.user.id);
                return signUpData.user.id;
            }
        }

    } catch (e) {
        console.error("Auth Critical Failure:", e);
        // Don't crash the app, return null or throw? 
        // Throwing will be caught by HomeScreen.
        throw new Error(`Authentication Failed: ${e.message}`);
    }

    throw new Error("Authentication failed unexpectedly.");
};

/**
 * Upload an image to Supabase Storage
 * @param {string} uri - Local file URI (from camera or gallery)
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
export const uploadImage = async (uri) => {
    try {
        // Generate unique filename with timestamp and random string
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const fileName = `${timestamp}_${random}.jpg`;
        // const filePath = `items/${fileName}`;

        // Create file path - use 'public' folder to avoid user-specific folder permission issues
        // or just root if policies are open.
        // Let's use a flat structure for simplicity since it's a personal app.
        const filePath = `${timestamp}_${random}.jpg`;
        // const filePath = `public/${fileName}`; // Alternative

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('item-images')
            .upload(filePath, decode(base64), {
                contentType: 'image/jpeg',
                upsert: true // Overwrite if exists
            });

        if (uploadError) {
            console.error("Supabase Storage Upload Error:", uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data } = supabase.storage
            .from('item-images')
            .getPublicUrl(filePath);

        console.log("Image uploaded successfully:", data.publicUrl);
        return data.publicUrl;

    } catch (error) {
        console.error("Image upload error:", error);
        throw error;
    }
};

