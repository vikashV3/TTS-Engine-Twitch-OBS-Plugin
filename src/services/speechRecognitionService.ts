import { SubtitleConfig, SubtitleEntry } from '../types/tts';

// Polyfill window speech recognition types
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

const COMMON_PROFANITY = [
  'fuck', 'shit', 'asshole', 'bitch', 'crap', 'dick', 'piss', 'bastard', 'slut'
];

export function censorText(text: string): string {
  let censored = text;
  COMMON_PROFANITY.forEach((word) => {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    censored = censored.replace(reg, (match) => match[0] + '*'.repeat(match.length - 1));
  });
  return censored;
}

export function formatSubtitleText(text: string, config: SubtitleConfig): string {
  let res = text.trim();
  if (config.censorProfanity) {
    res = censorText(res);
  }
  if (config.textTransform === 'uppercase') {
    res = res.toUpperCase();
  } else if (config.textTransform === 'capitalize') {
    res = res.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return res;
}

export class LiveSpeechSubtitlesEngine {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private shouldKeepListening = false;
  private listeners: ((interim: string, finals: SubtitleEntry[]) => void)[] = [];
  private statusListeners: ((isListening: boolean, error?: string) => void)[] = [];
  private micLevelListeners: ((level: number) => void)[] = [];

  private currentInterim = '';
  private entries: SubtitleEntry[] = [];
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private animFrameId: number | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition API is not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.notifyStatus(true);
      };

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || '';

          if (res.isFinal) {
            if (transcript.trim()) {
              const newEntry: SubtitleEntry = {
                id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                text: transcript.trim(),
                timestamp: Date.now(),
                isFinal: true,
                confidence: res[0]?.confidence,
              };
              this.entries.push(newEntry);
            }
          } else {
            interim += transcript;
          }
        }

        this.currentInterim = interim.trim();
        this.notifySubtitles();
      };

      this.recognition.onerror = (e) => {
        if (e.error === 'no-speech') {
          // Normal silence, ignore
          return;
        }
        console.warn('Speech recognition error:', e.error);
        if (e.error === 'not-allowed') {
          this.notifyStatus(false, 'Microphone permission was denied.');
          this.stop();
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Auto-restart if streamer still wants it active
        if (this.shouldKeepListening) {
          try {
            this.recognition?.start();
          } catch {
            setTimeout(() => {
              if (this.shouldKeepListening) this.recognition?.start();
            }, 300);
          }
        } else {
          this.notifyStatus(false);
        }
      };
    } catch (e) {
      console.error('Failed to initialize SpeechRecognition:', e);
    }
  }

  public async start(): Promise<void> {
    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) {
        throw new Error('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      }
    }

    this.shouldKeepListening = true;

    // Start mic volume level visualizer
    await this.startMicMeter();

    try {
      this.recognition.start();
    } catch {
      // Already started
    }
  }

  public stop() {
    this.shouldKeepListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.stopMicMeter();
    this.isListening = false;
    this.notifyStatus(false);
  }

  public clear() {
    this.entries = [];
    this.currentInterim = '';
    this.notifySubtitles();
  }

  public getEntries(): SubtitleEntry[] {
    return this.entries;
  }

  public getInterim(): string {
    return this.currentInterim;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public onSubtitles(cb: (interim: string, finals: SubtitleEntry[]) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== cb);
    };
  }

  public onStatus(cb: (isListening: boolean, error?: string) => void) {
    this.statusListeners.push(cb);
    return () => {
      this.statusListeners = this.statusListeners.filter((f) => f !== cb);
    };
  }

  public onMicLevel(cb: (level: number) => void) {
    this.micLevelListeners.push(cb);
    return () => {
      this.micLevelListeners = this.micLevelListeners.filter((f) => f !== cb);
    };
  }

  private notifySubtitles() {
    this.listeners.forEach((fn) => fn(this.currentInterim, [...this.entries]));
  }

  private notifyStatus(status: boolean, err?: string) {
    this.statusListeners.forEach((fn) => fn(status, err));
  }

  // Audio level meter for the microphone
  private async startMicMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.mediaStream = stream;

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!this.mediaStream) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));

        this.micLevelListeners.forEach((fn) => fn(normalized));
        this.animFrameId = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn('Microphone meter init error:', e);
    }
  }

  private stopMicMeter() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.micLevelListeners.forEach((fn) => fn(0));
  }
}

export const liveSubtitlesEngine = new LiveSpeechSubtitlesEngine();

// Export to .SRT format (standard subtitle format for YouTube, Premiere, Twitch clips)
export function exportToSRT(entries: SubtitleEntry[]): string {
  if (entries.length === 0) return '';
  const formatSrtTime = (ms: number) => {
    const d = new Date(ms);
    const hrs = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    const millis = String(d.getMilliseconds()).padStart(3, '0');
    return `${hrs}:${mins}:${secs},${millis}`;
  };

  const baseTime = entries[0].timestamp;
  let srt = '';

  entries.forEach((entry, idx) => {
    const relStart = entry.timestamp - baseTime;
    const relEnd = relStart + Math.max(1500, entry.text.length * 60);

    srt += `${idx + 1}\n`;
    srt += `${formatSrtTime(relStart)} --> ${formatSrtTime(relEnd)}\n`;
    srt += `${entry.text}\n\n`;
  });

  return srt;
}

// Translate subtitle entry using server API
export async function translateSubtitleText(text: string, targetLanguage: string): Promise<string> {
  if (!text.trim() || targetLanguage === 'none') return text;
  try {
    const res = await fetch('/api/translate-subtitles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLanguage }),
    });
    const data = await res.json();
    return data.translatedText || text;
  } catch {
    return text;
  }
}
