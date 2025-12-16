
import { Alert } from 'react-native';

const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'; // Replace with your actual key or use Env

export const analyzeImage = async (base64Image) => {
    if (!base64Image) return null;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Identify this item. Return ONLY a JSON object with: { \"name\": \"Start Case Short Description\", \"category\": \"General Category\", \"quantity\": 1 }. Do not use markdown formatting." },
                            {
                                type: "image_url",
                                image_url: {
                                    "url": `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("OpenAI Error:", data.error);
            return null;
        }

        const content = data.choices[0].message.content;
        try {
            // Clean up if markdown is present
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanContent);
        } catch (e) {
            console.error("Failed to parse AI response", e);
            return { name: content, category: "Unknown", quantity: 1 };
        }

    } catch (error) {
        console.error("Analysis failed:", error);
        Alert.alert("AI Error", "Could not analyze image.");
        return null;
    }
};
