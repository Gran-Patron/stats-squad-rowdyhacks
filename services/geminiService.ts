
import { GoogleGenAI, Type } from '@google/genai';
import { Song } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'YOUR_API_KEY_HERE' });

export const getVibeAnalysis = async (songs: Song[]): Promise<string> => {
  if (songs.length === 0) {
    return "You haven't liked any songs yet. Swipe right on some tracks to get your vibe analysis!";
  }

  const songList = songs.map(song => `- "${song.title}" by ${song.artist}`).join('\n');

  const prompt = `
    You are a cool, knowledgeable music critic and DJ. 
    A user has created a playlist by swiping right on the following songs:
    ${songList}

    Based on this playlist, analyze the user's music vibe. 
    Describe the overall mood, potential genres they enjoy, and the type of energy their playlist gives off. 
    Keep it concise, fun, and engaging, around 3-4 sentences. 
    Start with a catchy title for their vibe. For example: "Your Vibe: Sunset Chillwave" or "Your Vibe: Energetic Pop Powerhouse".
    Do not use markdown formatting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get vibe analysis from AI.");
  }
};

export const getSongRecommendations = async (prompt: string, dislikedArtists: string[]): Promise<{ title: string; artist: string }[]> => {
  let dislikedPromptPart = '';
  if (dislikedArtists.length > 0) {
    dislikedPromptPart = `\nCrucially, DO NOT recommend any songs by the following artists: ${dislikedArtists.join(', ')}.`;
  }
  
  const fullPrompt = `
    You are a music discovery expert with deep knowledge of Spotify's catalog and trends. A user wants to find new music based on the following prompt: "${prompt}".
    Suggest a list of 10 songs that match this prompt, basing your recommendations on popular and relevant tracks from Spotify.
    ${dislikedPromptPart}
    Return your response as a valid JSON array of objects, where each object has a "title" and "artist" property.
    Do not include any other text, explanations, or markdown formatting. Just the JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
            },
            required: ['title', 'artist'],
          }
        }
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error getting song recommendations from Gemini API:", error);
    throw new Error("Failed to get song recommendations from AI.");
  }
};
