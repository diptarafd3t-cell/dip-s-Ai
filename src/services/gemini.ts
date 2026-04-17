import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateWallpapers(prompt: string, referenceImage?: string) {
  const model = "gemini-3.1-flash-image-preview";
  
  const contents: any = {
    parts: [
      { text: `Generate 4 high-quality phone wallpapers with a 9:16 aspect ratio. Vibe: ${prompt}. ${referenceImage ? "Use the provided image as a reference for style and composition." : ""}` }
    ]
  };

  if (referenceImage) {
    contents.parts.push({
      inlineData: {
        data: referenceImage.split(',')[1],
        mimeType: "image/png"
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      imageConfig: {
        aspectRatio: "9:16",
        imageSize: "1K"
      }
    }
  });

  const images: string[] = [];
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      images.push(`data:image/png;base64,${part.inlineData.data}`);
    }
  }

  return images;
}

export async function chatStream(message: string, history: { role: string, content: string }[]) {
  const model = "gemini-3.1-pro-preview";
  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: "You are Dip's Ai-Dev, an extremely professional and high-performing AI assistant. You help users generate wallpapers, music, and videos, and perform complex tasks. Be active, smart, and concise. Use a technical, professional tone. You have access to Google Search and Google Maps to provide accurate information. You also act as a device controller for the app's features.",
      tools: [
        { googleSearch: {} },
        { googleMaps: {} }
      ],
      toolConfig: {
        includeServerSideToolInvocations: true
      }
    }
  });

  // Convert history to Gemini format
  const contents = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.content }]
  }));

  return await chat.sendMessageStream({ message });
}

export async function generateMusic(prompt: string) {
  const response = await ai.models.generateContentStream({
    model: "lyria-3-clip-preview",
    contents: prompt,
  });

  let audioBase64 = "";
  let mimeType = "audio/wav";

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (!audioBase64 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioBase64 += part.inlineData.data;
      }
    }
  }

  if (!audioBase64) return null;

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export async function generateVideo(prompt: string, imageBase64?: string) {
  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: '9:16'
  };

  const payload: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config
  };

  if (imageBase64) {
    payload.image = {
      imageBytes: imageBase64.split(',')[1],
      mimeType: 'image/png'
    };
  }

  let operation = await ai.models.generateVideos(payload);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) return null;

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY || "",
    },
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function textToSpeech(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return null;

  const binary = atob(base64Audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/pcm;rate=24000' });
  return URL.createObjectURL(blob);
}
