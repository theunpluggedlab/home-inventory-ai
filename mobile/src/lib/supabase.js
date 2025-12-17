
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
    // 1. Check if session/user exists locally
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        console.log("Existing user found:", session.user.id);
        return session.user.id;
    }

    console.log("No session found. Attempting Anonymous Sign In...");

    try {
        // 2. Try Anonymous Sign In
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) {
            console.log("Anonymous login failed, falling back to dummy email login:", error.message);
            // Fallback: If Anonymous auth is not enabled in dashboard, use a dummy email 
            // BUT this requires "Confirm Email" to be OFF in dashboard.
            const randomId = Math.floor(Math.random() * 100000);
            const dummyEmail = `guest.user${randomId}@inventoryapp.local`; // More realistic looking
            const dummyPassword = "GuestPass123!";

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: dummyEmail,
                password: dummyPassword,
            });

            if (signUpError) throw signUpError;
            console.log("Fallback Signup Success:", signUpData.user.id);
            return signUpData.user.id;
        }

        if (data?.user) {
            console.log("Anonymous login success:", data.user.id);
            return data.user.id;
        }

    } catch (e) {
        console.error("Auth Critical Failure:", e);
        throw new Error(`Authentication Failed: ${e.message || "Unknown error"}`);
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
        const filePath = `items/${fileName}`;

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('item-images')
            .upload(filePath, decode(base64), {
                contentType: 'image/jpeg',
                upsert: false
            });

        if (uploadError) {
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

