
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Alert } from 'react-native';

// ⚠️ WARNING: In a production app, NEVER store API keys in the client code.
// You should move this logic to a Supabase Edge Function.
const API_KEY = "AIzaSyBlN79jHSkj5BImvulotPTZBdpo6oLS6aI";

const genAI = new GoogleGenerativeAI(API_KEY);

export const analyzeImageWithGemini = async (base64Image) => {
    if (!base64Image) return [];

    console.log("🚀 Starting Gemini Analysis");

    try {
        // User explicitly requested 'gemini-2.0-flash'.
        // We also add 'gemini-2.0-flash-exp' as a fallback since that is the common API ID for the preview.
        const modelNames = ["gemini-2.0-flash", "gemini-2.0-flash-exp"];
        let response;
        let lastError;

        for (const modelName of modelNames) {
            try {
                console.log(`🤖 Attempting model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                const prompt = `Analyze this image. return a JSON array of items found (name, category, quantity). Do not use Markdown. Example: [{"name": "Apple", "category": "Food", "quantity": 1}]`;

                const imagePart = {
                    inlineData: {
                        data: base64Image,
                        mimeType: "image/jpeg",
                    },
                };

                const result = await model.generateContent([prompt, imagePart]);
                response = await result.response;
                // If we get here, it worked
                break;
            } catch (e) {
                console.warn(`⚠️ Model ${modelName} failed:`, e.message);
                lastError = e;
            }
        }

        if (!response) {
            const msg = `All models failed (2.0-flash). Last error: ${lastError?.message}`;
            console.error("❌ " + msg);
            throw new Error(msg);
        }

        const text = response.text();
        console.log("📩 Raw Gemini Response:", text);

        // --- Parsing Logic ---
        // Strip markdown code blocks
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Find JSON array brackets
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
