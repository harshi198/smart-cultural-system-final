
import { GoogleGenAI, Type } from "@google/genai";
import { StoryAnalysis, FolkStory, Language } from "../types.ts";

export class BharatKathaService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzeStory(story: FolkStory): Promise<StoryAnalysis> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert Indian cultural storyteller. Expand this story into a detailed, immersive, and atmospheric long-form narration (roughly 500-700 words). 
      
      Story: ${story.title}
      Region: ${story.region}
      Summary: ${story.summary}
      
      Requirements:
      1. Use rich, descriptive language to paint the setting.
      2. Include internal monologues and dialogue where appropriate.
      3. Maintain strict cultural authenticity to the ${story.region} region.
      4. Provide the result in a single cohesive block of text with paragraph breaks (\n\n).
      
      Also provide metadata:
      - Predominant emotion
      - Intensity (1-10)
      - Cultural nuances
      - Historical context
      - Regional significance.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullNarration: { type: Type.STRING },
            emotion: { type: Type.STRING },
            intensity: { type: Type.NUMBER },
            culturalNuances: { type: Type.ARRAY, items: { type: Type.STRING } },
            historicalContext: { type: Type.STRING },
            significance: { type: Type.STRING }
          },
          required: ["fullNarration", "emotion", "intensity", "culturalNuances", "historicalContext", "significance"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  }

  async generateSpeech(text: string, language: Language): Promise<string> {
    // Explicitly request Indian English or native regional tone
    const narrationPrompt = language === Language.English 
      ? `Narrate the following story in Indian English. Use a warm, authentic Indian accent with expressive storytelling tones. Ensure clear pronunciation of Indian names and terms. Text: ${text}`
      : `Translate the following story into ${language} and narrate it with a warm, authentic, and expressive voice specific to ${language} speakers. Text: ${text}`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: narrationPrompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    // Safely look for the audio part across all parts
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
    }
    
    return '';
  }
}

export const bharaKatha = new BharatKathaService();
