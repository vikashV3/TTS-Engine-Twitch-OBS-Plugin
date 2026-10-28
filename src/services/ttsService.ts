import { SynthesizeRequest, SynthesizeResponse, VoiceProfile, DialogueTurn } from '../types/tts';
import { base64ToBlobUrl, synthesizeWithWebSpeech } from '../utils/audioUtils';

export const DEFAULT_VOICES: VoiceProfile[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female / Neutral',
    tone: 'Clear, warm, articulate, empathetic',
    recommendedFor: 'News narration, audiobooks, educational explainers, corporate voiceover',
    pitch: 'Mid-warm',
    sampleText: 'Welcome to VoxCraft. Every syllable is crafted with neural precision.',
    avatarColor: 'from-amber-500 to-rose-500',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male / Youthful',
    tone: 'Playful, vibrant, energetic, friendly',
    recommendedFor: 'Tech reviews, gaming commentary, podcasts, Twitch alerts',
    pitch: 'Bright & buoyant',
    sampleText: 'Hey there chat! Thanks for the sub and welcome to the stream!',
    avatarColor: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male / Deep',
    tone: 'Deep, resonant, commanding, cinematic',
    recommendedFor: 'Documentary narration, epic stream alerts, raid announcements',
    pitch: 'Deep bass & baritone',
    sampleText: 'Attention stream: A massive raid approaches from the void.',
    avatarColor: 'from-purple-600 to-slate-900',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male / Intense',
    tone: 'Gravelly, rugged, dramatic, bold',
    recommendedFor: 'Game characters, action highlights, high-tier bits cheers',
    pitch: 'Grounded & gritty',
    sampleText: 'Target acquired. Lock it down and do not hesitate.',
    avatarColor: 'from-red-600 to-orange-700',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Gender-Neutral / Soft',
    tone: 'Smooth, serene, modern, relaxing',
    recommendedFor: 'Mindfulness & meditation, calm stream reading, chill lounge',
    pitch: 'Velvety & balanced',
    sampleText: 'Breathe in, let the game flow, and keep your focus sharp.',
    avatarColor: 'from-emerald-500 to-teal-700',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'Female / Melodic',
    tone: 'Expressive, lyrical, theatrical, charismatic',
    recommendedFor: 'Poetry, fantasy lore, theatrical dialogue, channel point rewards',
    pitch: 'Melodic & dynamic',
    sampleText: 'Listen closely, for legends are written in the quiet moments between triumphs.',
    avatarColor: 'from-pink-500 to-purple-600',
  },
];

export async function fetchVoices(): Promise<VoiceProfile[]> {
  try {
    const res = await fetch('/api/tts/voices');
    if (!res.ok) throw new Error('Failed to fetch voices');
    const data = await res.json();
    if (Array.isArray(data.voices) && data.voices.length > 0) {
      return data.voices.map((v: VoiceProfile) => ({
        ...v,
        avatarColor: DEFAULT_VOICES.find((d) => d.id === v.id)?.avatarColor || 'from-indigo-500 to-purple-600',
      }));
    }
  } catch (err) {
    console.warn('Using default voices fallback:', err);
  }
  return DEFAULT_VOICES;
}

export async function synthesizeTTS(req: SynthesizeRequest): Promise<{
  audioUrl: string;
  duration: number;
  byteSize: number;
  modelUsed: string;
  voiceUsed: string;
}> {
  // If Web Speech API explicitly selected
  if (req.model === 'web-speech-api') {
    return new Promise((resolve, reject) => {
      try {
        synthesizeWithWebSpeech(req.text, {
          rate: req.rate || 1,
          pitch: req.pitch || 1,
          voiceName: req.voice,
        })
          .then(() => {
            // Simulated local playback duration
            const wordCount = req.text.trim().split(/\s+/).length;
            const duration = Math.max(1, Number((wordCount / 2.5).toFixed(1)));
            resolve({
              audioUrl: '', // Browser spoke directly
              duration,
              byteSize: 0,
              modelUsed: 'web-speech-api',
              voiceUsed: req.voice,
            });
          })
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  const res = await fetch('/api/tts/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const data: SynthesizeResponse = await res.json();

  if (!res.ok || !data.success || !data.audioBase64) {
    throw new Error(data.error || 'Failed to synthesize speech.');
  }

  const audioUrl = base64ToBlobUrl(data.audioBase64, data.mimeType || 'audio/wav');

  return {
    audioUrl,
    duration: data.duration || 2.0,
    byteSize: data.byteSize || 0,
    modelUsed: data.modelUsed || req.model,
    voiceUsed: data.voiceUsed || req.voice,
  };
}

export async function synthesizeDialogue(
  speakers: { name: string; voice: string }[],
  turns: DialogueTurn[]
): Promise<{
  audioUrl: string;
  duration: number;
  byteSize: number;
}> {
  const res = await fetch('/api/tts/dialogue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speakers, turns }),
  });

  const data = await res.json();

  if (!res.ok || !data.success || !data.audioBase64) {
    throw new Error(data.error || 'Failed to synthesize dialogue.');
  }

  const audioUrl = base64ToBlobUrl(data.audioBase64, data.mimeType || 'audio/wav');

  return {
    audioUrl,
    duration: data.duration || 4.0,
    byteSize: data.byteSize || 0,
  };
}

export async function enhanceScriptWithAI(text: string, goal: string, format = 'single'): Promise<string> {
  const res = await fetch('/api/tts/enhance-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, goal, format }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to enhance script.');
  }

  return data.enhancedText || text;
}
