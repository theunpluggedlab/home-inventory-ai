
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Alert } from 'react-native';

// ⚠️ WARNING: In a production app, NEVER store API keys in the client code.
// You should move this logic to a Supabase Edge Function.
const API_KEY = "AIzaSyBlN79jHSkj5BImvulotPTZBdpo6oLS6aI";

const genAI = new GoogleGenerativeAI(API_KEY);

export const analyzeImageWithGemini = async (base64Image) => {
    if (!base64Image) return [];

    console.log("🚀 Starting Gemini Analysis");

    // Helper to try a specific model
    const tryModel = async (modelName) => {
        console.log(`🤖 Attempting model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `
            You are a specific inventory assistant.
            Identify every item in this image. Read labels (like 'Tylenol', 'Neosporin', 'Band-aids') to be specific.
            Return a clean JSON array of items with 'name', 'category' (e.g. Medicine, Electronics, Clothing, Kitchen), and estimated 'quantity' (number).
            Do not include generic background items.
            Output ONLY a raw JSON array. No Markdown.
            Example: [{"name": "Advil", "category": "Medicine", "quantity": 1}]
        `;

        const imagePart = {
            inlineData: { data: base64Image, mimeType: "image/jpeg" }
        };

        const result = await model.generateContent([prompt, imagePart]);
        return await result.response;
    };

    try {
        let response;
        try {
            // 1. Try Stable 1.5 Flash
            response = await tryModel("gemini-1.5-flash");
        } catch (e1) {
            console.warn("⚠️ 1.5 Flash failed:", e1.message);
            try {
                // 2. Try Stable 1.5 Pro
                response = await tryModel("gemini-1.5-pro");
            } catch (e2) {
                console.warn("⚠️ 1.5 Pro failed:", e2.message);
                try {
                    // 3. Try Legacy Vision
                    response = await tryModel("gemini-pro-vision");
                } catch (e3) {
                    const msg = `ALL models failed. Last error: ${e3.message}`;
                    console.error("❌ " + msg);
                    Alert.alert("Debug Info", msg);
                    throw new Error(msg);
                }
            }
        }

        const text = response.text();
        console.log("📩 Raw Gemini Response:", text);

        // --- Parsing Logic ---
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\[.*\]/s);
        if (jsonMatch) cleanText = jsonMatch[0];

        try {
            const json = JSON.parse(cleanText);
            return Array.isArray(json) ? json : [json];
        } catch (e) {
            throw new Error("Failed to parse AI response: " + cleanText);
        }

    } catch (error) {
        console.error("Gemini Analysis Failed:", error);
        throw error;
    }
};
