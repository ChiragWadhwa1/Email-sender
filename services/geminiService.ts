
import { GoogleGenAI, Type } from "@google/genai";
import { Recipient } from "../types";

// Always use the process.env.API_KEY directly for initialization.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePersonalizedEmail = async (
  recipient: Recipient,
  serviceDescription: string
): Promise<{ subject: string; body: string }> => {
  const prompt = `
    You are a professional business outreach expert. 
    Write a highly personalized cold email to a potential client.
    
    RECIPIENT INFO:
    Name: ${recipient.name}
    Company: ${recipient.company || 'Unknown'}
    Role: ${recipient.role || 'Unknown'}
    Additional Context: ${JSON.stringify(recipient.customData)}
    
    OUR SERVICE OFFERING:
    ${serviceDescription}
    
    GUIDELINES:
    1. The tone should be professional, empathetic, and low-pressure.
    2. Reference something specific about their role or company if possible based on the data provided.
    3. The email must be concise (under 150 words).
    4. Include a clear, non-aggressive call to action.
    5. Do not use placeholders like [Your Name]. Assume the sender is "The ReachFlow Team".
    6. Return the response in a structured JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: 'The subject line of the email.',
            },
            body: {
              type: Type.STRING,
              description: 'The body content of the email.',
            },
          },
          required: ["subject", "body"],
        },
      },
    });

    // Directly access the text property as a string.
    const result = JSON.parse(response.text || '{}');
    return {
      subject: result.subject || "Quick question for you",
      body: result.body || "Hi, I'd like to chat about our services."
    };
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
