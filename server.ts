import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '15mb' }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Available Gemini prebuilt voices catalogue
const VOICES_CATALOGUE = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female / Neutral',
    tone: 'Clear, warm, articulate, empathetic',
    recommendedFor: 'News narration, audiobooks, educational explainers, corporate voiceover',
    pitch: 'Mid-warm',
    sampleText: 'Welcome to VoxCraft. Every syllable is crafted with neural precision.',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male / Youthful',
    tone: 'Playful, vibrant, energetic, friendly',
    recommendedFor: 'Tech reviews, gaming commentary, podcasts, friendly assistants',
    pitch: 'Bright & buoyant',
    sampleText: 'Hey there! Ready to bring your next story or dialogue to life?',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male / Deep',
    tone: 'Deep, resonant, commanding, cinematic',
    recommendedFor: 'Documentary narration, epic trailers, authoritative announcements, noir fiction',
    pitch: 'Deep bass & baritone',
    sampleText: 'In the vast silence of space, technology became humanity’s final frontier.',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male / Intense',
    tone: 'Gravelly, rugged, dramatic, bold',
    recommendedFor: 'Game characters, action movie trailers, intense monologues',
    pitch: 'Grounded & gritty',
    sampleText: 'Stand fast. We don’t back down when the pressure builds.',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Gender-Neutral / Soft',
    tone: 'Smooth, serene, modern, relaxing',
    recommendedFor: 'Mindfulness & meditation, calm customer service, ambient reading, smart assistants',
    pitch: 'Velvety & balanced',
    sampleText: 'Take a deep breath. Let your thoughts settle into gentle clarity.',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'Female / Melodic',
    tone: 'Expressive, lyrical, theatrical, charismatic',
    recommendedFor: 'Poetry, fantasy storytelling, radio drama, theatrical dialogue',
    pitch: 'Melodic & dynamic',
    sampleText: 'Listen closely, for beneath every spoken word lies an unspoken rhythm.',
  },
];

// GET /api/health
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    models: ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.8-flash'],
  });
});

// GET /api/tts/voices
app.get('/api/tts/voices', (req: Request, res: Response) => {
  res.json({
    voices: VOICES_CATALOGUE,
  });
});

// POST /api/tts/synthesize
app.post('/api/tts/synthesize', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check your environment settings.',
      });
      return;
    }

    const {
      text,
      voice = 'Kore',
      model = 'gemini-3.8-flash-lite-tts',
      style,
      speakerName,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text prompt is required.' });
      return;
    }

    // Supported TTS models
    const selectedModel =
      model === 'gemini-3.8-flash-tts' ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts';

    const speechMetadata: Record<string, string> = {};
    if (style && typeof style === 'string' && style.trim()) {
      speechMetadata.style = style.trim();
    }
    if (speakerName && typeof speakerName === 'string' && speakerName.trim()) {
      speechMetadata.speaker = speakerName.trim();
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              ...(Object.keys(speechMetadata).length > 0 ? { speechMetadata } : {}),
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);
    const audioBase64 = audioPart?.inlineData?.data;

    if (!audioBase64) {
      const textOutput = response.text || '';
      res.status(502).json({
        error: 'The TTS model did not return audio data.',
        details: textOutput,
      });
      return;
    }

    // Unary returns complete 24kHz mono 16-bit WAV (RIFF header included)
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const byteSize = audioBuffer.byteLength;
    // Estimate duration for 24kHz mono 16-bit PCM (48,000 bytes/sec + 44 byte header)
    const pcmBytes = Math.max(0, byteSize - 44);
    const estimatedDurationSec = Number((pcmBytes / 48000).toFixed(2));

    res.json({
      success: true,
      audioBase64,
      mimeType: 'audio/wav',
      sampleRate: 24000,
      channels: 1,
      bitDepth: 16,
      byteSize,
      duration: estimatedDurationSec,
      modelUsed: selectedModel,
      voiceUsed: voice,
    });
  } catch (err: unknown) {
    console.error('Error in /api/tts/synthesize:', err);
    const message = err instanceof Error ? err.message : 'Speech synthesis failed';
    res.status(500).json({ error: message });
  }
});

// POST /api/tts/dialogue - Multi-speaker screenplay studio
app.post('/api/tts/dialogue', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    const {
      speakers = [
        { name: 'Alex', voice: 'Puck' },
        { name: 'Sam', voice: 'Kore' },
      ],
      turns = [],
    } = req.body;

    if (!Array.isArray(turns) || turns.length === 0) {
      res.status(400).json({ error: 'Dialogue turns array is required.' });
      return;
    }

    if (speakers.length !== 2) {
      res.status(400).json({
        error: 'Multi-speaker TTS currently requires exactly 2 speaker definitions.',
      });
      return;
    }

    const speaker1 = speakers[0];
    const speaker2 = speakers[1];

    const parts = turns.map((turn: { speaker: string; text: string; style?: string }) => ({
      text: `${turn.speaker}: ${turn.text}`,
      speechMetadata: {
        speaker: turn.speaker,
        style: turn.style || 'Conversational and expressive',
      },
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: speaker1.name,
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: speaker1.voice },
                },
              },
              {
                speaker: speaker2.name,
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: speaker2.voice },
                },
              },
            ],
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);
    const audioBase64 = audioPart?.inlineData?.data;

    if (!audioBase64) {
      res.status(502).json({
        error: 'Multi-speaker synthesis did not produce audio.',
        details: response.text || '',
      });
      return;
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const pcmBytes = Math.max(0, audioBuffer.byteLength - 44);
    const estimatedDurationSec = Number((pcmBytes / 48000).toFixed(2));

    res.json({
      success: true,
      audioBase64,
      mimeType: 'audio/wav',
      sampleRate: 24000,
      byteSize: audioBuffer.byteLength,
      duration: estimatedDurationSec,
      modelUsed: 'gemini-3.8-flash-tts',
      speakers,
    });
  } catch (err: unknown) {
    console.error('Error in /api/tts/dialogue:', err);
    const message = err instanceof Error ? err.message : 'Multi-speaker synthesis failed';
    res.status(500).json({ error: message });
  }
});

// POST /api/tts/enhance-script
// Enhances raw script with vocal bursts (<laugh>, <breath>, <gasp>), pacing, and emotional cues
app.post('/api/tts/enhance-script', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const { text, goal = 'natural', format = 'single' } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required.' });
      return;
    }

    let instruction = `You are a world-class speech and voice director for high-fidelity Neural TTS.
Transform the provided user script so that it sounds remarkably lifelike, nuanced, and engaging when synthesized by an AI TTS engine.
Style/Goal: "${goal}".
Allowed vocal burst tags to insert where emotionally genuine: <breath>, <laugh>, <gasp>, <sigh>, <cough>, <chuckle>.
Pacing cues: Use dashes (--) or ellipses (...) to control natural pauses, cadence, and human phrasing.
Backchannel tags (if conversation): |yeah|, |mhm|, |uh-huh|, |right|.
Maintain the core message, but make the delivery sound authentic and spoken rather than stiffly written.
DO NOT output markdown ticks, explanations, or meta-comments. Return ONLY the enhanced text itself.`;

    if (format === 'dialogue') {
      instruction += `\nFormat the output as two speakers taking turns with exact format:
Speaker 1: [Turn text]
Speaker 2: [Turn text]
Speaker 1: [Turn text]
...`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `${instruction}\n\nOriginal script:\n${text}`,
    });

    const enhanced = response.text?.trim() || text;

    res.json({
      enhancedText: enhanced,
    });
  } catch (err: unknown) {
    console.error('Error in /api/tts/enhance-script:', err);
    const message = err instanceof Error ? err.message : 'Failed to enhance script';
    res.status(500).json({ error: message });
  }
});

// Start Express + Vite
async function start() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`TTS Engine running on http://0.0.0.0:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});
