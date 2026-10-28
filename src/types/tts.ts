export interface VoiceProfile {
  id: string;
  name: string;
  gender: string;
  tone: string;
  recommendedFor: string;
  pitch: string;
  sampleText: string;
  avatarColor?: string;
}

export type TTSModelType = 'gemini-3.8-flash-lite-tts' | 'gemini-3.8-flash-tts' | 'web-speech-api';

export interface SynthesizeRequest {
  text: string;
  voice: string;
  model: TTSModelType;
  style?: string;
  speakerName?: string;
  rate?: number;
  pitch?: number;
}

export interface SynthesizeResponse {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  sampleRate?: number;
  channels?: number;
  duration?: number;
  byteSize?: number;
  modelUsed?: string;
  voiceUsed?: string;
  error?: string;
}

export interface AudioHistoryItem {
  id: string;
  text: string;
  voice: string;
  model: TTSModelType;
  style?: string;
  duration: number;
  timestamp: number;
  audioUrl: string;
  source: 'studio' | 'twitch' | 'dialogue';
  speaker?: string;
}

export interface DialogueTurn {
  id: string;
  speaker: string;
  text: string;
  voice: string;
  style?: string;
}

export interface TwitchAlertConfig {
  channel: string;
  enabled: boolean;
  readAllChat: boolean;
  commandPrefix: string; // default '!tts'
  minBits: number;
  minTier: 'all' | 'subscribers' | 'vips' | 'mods';
  voice: string;
  model: TTSModelType;
  style: string;
  volume: number;
  speed: number;
  soundAlert: 'chime' | 'retro' | 'cyber' | 'ding' | 'none';
  bannedWords: string[];
  maxCharacters: number;
  userCooldownSeconds: number;
  voiceByTier: boolean; // VIPs get Charon, Subs get Puck, etc.
}

export interface TwitchQueueItem {
  id: string;
  username: string;
  displayName?: string;
  message: string;
  type: 'chat' | 'bits' | 'sub' | 'resub' | 'points' | 'test';
  bitsAmount?: number;
  subMonths?: number;
  rewardTitle?: string;
  timestamp: number;
  status: 'pending' | 'synthesizing' | 'playing' | 'completed' | 'skipped' | 'filtered';
  audioUrl?: string;
  voiceUsed?: string;
}

export type SubtitleVisualTheme = 'cyberpunk' | 'classic' | 'tiktok' | 'minimal' | 'neon';

export interface SubtitleConfig {
  theme: SubtitleVisualTheme;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  textTransform: 'uppercase' | 'capitalize' | 'none';
  censorProfanity: boolean;
  autoHideSeconds: number; // 0 = never hide, or 3, 5, 8
  streamerName: string;
  targetLanguage: string; // 'none' or 'Spanish', 'French', etc.
  showWordHighlight: boolean;
  micSensitivity: number;
  showSpeakerBadge: boolean;
}

export interface SubtitleEntry {
  id: string;
  text: string;
  translation?: string;
  timestamp: number;
  isFinal: boolean;
  confidence?: number;
}
