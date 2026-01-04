
import { GoogleGenAI } from "@google/genai";
import { ChunkContext, GroundingSource } from "../types";

export const searchService = {
  async getChunkContext(text: string): Promise<ChunkContext> {
    // Safe access to API key as per requirements
    const apiKey = import.meta?.env?.VITE_API_KEY ?? "";
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a very brief (2-3 sentences) cultural, historical, or linguistic context for this sentence: "${text}". Focus on interesting facts that help a reader connect with the text.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const summary = response.text || "No summary available.";
    const sources: GroundingSource[] = [];

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri
          });
        }
      });
    }

    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    return {
      summary,
      sources: uniqueSources
    };
  }
};
