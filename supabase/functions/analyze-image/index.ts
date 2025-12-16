
// Follows: https://supabase.com/docs/guides/functions/examples/gemini-image-detection
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            throw new Error("No image data provided");
        }

        // Access secret via Deno environment
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set in Edge Function secrets");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      Identify every item in this image. Read labels (like 'Tylenol', 'Neosporin', 'Band-aids') to be specific.
      Return a clean JSON array of items with 'name', 'category' (e.g. Medicine, Electronics, Clothing, Kitchen), and estimated 'quantity' (number).
      Do not include generic background items (like 'table', 'floor').
      
      Example output:
      [
        { "name": "Advil Liqui-Gels", "category": "Medicine", "quantity": 1 },
        { "name": "AA Batteries", "category": "Electronics", "quantity": 4 }
      ]
      
      Return ONLY the JSON.
    `;

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: "image/jpeg",
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        console.log("Raw AI response:", text);

        // Simple cleanup
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return new Response(jsonString, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
