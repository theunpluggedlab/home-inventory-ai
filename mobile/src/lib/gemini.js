
import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚠️ WARNING: In a production app, NEVER store API keys in the client code.
// You should move this logic to a Supabase Edge Function.
const API_KEY = "AIzaSyBlN79jHSkj5BImvulotPTZBdpo6oLS6aI";

const genAI = new GoogleGenerativeAI(API_KEY);

export const analyzeImageWithGemini = async (base64Image) => {
    if (!base64Image) return [];

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      Identify every item in this image. Read labels (like 'Tylenol', 'Neosporin', 'Band-aids') to be specific.
      Return a clean JSON array of items with 'name', 'category' (e.g. Medicine, Electronics, Clothing, Kitchen), and estimated 'quantity' (number).
      Do not include generic background items (like 'table', 'floor').
      
      Example output format:
      [
        { "name": "Advil Liqui-Gels", "category": "Medicine", "quantity": 1 },
        { "name": "AA Batteries", "category": "Electronics", "quantity": 4 }
      ]
      
      Return ONLY the JSON array. Do not use Markdown formatting.
    `;

        // Gemini expects standard base64 strings (no data header)
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        console.log("Gemini Raw Response:", text);

        // Clean up potential markdown code blocks
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const json = JSON.parse(cleanText);
            if (Array.isArray(json)) {
                return json;
            } else if (typeof json === 'object') {
                return [json]; // Wrap single object
            }
        } catch (e) {
            console.error("Failed to parse Gemini JSON", e);
        }

        return [];

    } catch (error) {
        console.error("Gemini Analysis Failed:", error);
        return [];
    }
};
