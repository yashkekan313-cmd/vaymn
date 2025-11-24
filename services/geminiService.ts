import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const generateBookDetails = async (bookTitle: string) => {
  if (!apiKey) {
    console.warn("Gemini API Key missing");
    return null; // UI will handle this null to show fallback message
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide details for the book titled "${bookTitle}". If exact details aren't known, provide plausible generic details.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            author: { type: Type.STRING },
            genre: { type: Type.STRING },
            description: { type: Type.STRING },
            coverUrl: { type: Type.STRING, description: "A placeholder image URL from https://picsum.photos/300/450 if real one not available" }
          },
          required: ["author", "genre", "description"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};