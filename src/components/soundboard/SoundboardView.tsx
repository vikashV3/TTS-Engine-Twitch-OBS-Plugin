import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  Play,
  Flame,
  Radio,
  Tv,
  Coins,
  Crown,
  Share2,
  Download,
  Check
} from 'lucide-react';
import { VoiceProfile } from '../../types/tts';
import { DEFAULT_VOICES, synthesizeTTS } from '../../services/ttsService';
import { AudioPlayerBar } from '../studio/AudioPlayerBar';

interface SoundboardViewProps {
  voices: VoiceProfile[];
}

const STREAM_SOUNDBOARD_PRESETS = [
  {
    title: 'GG Clutch Play',
    text: 'What a play! That was an unbelievable clutch, chat spam those Ws!',
    voice: 'Puck',
    style: 'Screaming enthusiastic esports caster',
    icon: Flame,
    color: 'from-amber-500 to-rose-600',
  },
  {
    title: 'Raid Incoming!',
    text: 'Sound the alarms! Massive incoming raid! Welcome raiders, drop your emotes in chat!',
    voice: 'Charon',
    style: 'Deep, booming battle horn commander',
    icon: Tv,
    color: 'from-purple-600 to-indigo-700',
  },
  {
    title: 'Sub Goal Crushed!',
    text: 'We just shattered the community sub goal! Thank you everyone for the unreal love and support!',
    voice: 'Kore',
    style: 'Grateful, overwhelmed and ecstatic',
    icon: Crown,
    color: 'from-yellow-500 to-amber-600',
  },
  {
    title: 'Hype Train Level 5',
    text: 'Level 5 hype train unlocked! Let’s keep this momentum rolling, all aboard!',
    voice: 'Fenrir',
    style: 'Intense and hyped up',
    icon: Coins,
    color: 'from-red-600 to-orange-600',
  },
  {
    title: 'BRB - Be Right Back',
    text: 'Stepping away for a quick hydration break. Chat be nice to each other, back in two minutes!',
    voice: 'Zephyr',
    style: 'Smooth, relaxed and polite',
    icon: Radio,
    color: 'from-emerald-500 to-teal-700',
  },
  {
    title: 'Chat Lore & Riddle',
    text: 'A mystery unfolds before our eyes. Only those who watch the minimap shall uncover the truth.',
    voice: 'Aoede',
    style: 'Whispery mystical storyteller',
    icon: Sparkles,
    color: 'from-pink-500 to-purple-600',
  },
];

export const SoundboardView: React.FC<SoundboardViewProps> = ({ voices = DEFAULT_VOICES }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<{
    audioUrl: string;
    text: string;
    voice: string;
  } | null>(null);

  const [customPhrase, setCustomPhrase] = useState('');
  const [customVoice, setCustomVoice] = useState('Puck');
  const [isSynthesizingCustom, setIsSynthesizingCustom] = useState(false);

  const playPreset = async (preset: typeof STREAM_SOUNDBOARD_PRESETS[0]) => {
    setPlayingId(preset.title);
    try {
      const res = await synthesizeTTS({
        text: preset.text,
        voice: preset.voice,
        model: 'gemini-3.8-flash-lite-tts',
        style: preset.style,
      });

      setActiveAudio({
        audioUrl: res.audioUrl,
        text: preset.text,
        voice: preset.voice,
      });
    } catch (e) {
      console.warn('Preset synthesis error:', e);
    } finally {
      setPlayingId(null);
    }
  };

  const playVoiceSample = async (v: VoiceProfile) => {
    setPlayingId(v.id);
    try {
      const res = await synthesizeTTS({
        text: v.sampleText,
        voice: v.id,
        model: 'gemini-3.8-flash-lite-tts',
        style: v.tone,
      });

      setActiveAudio({
        audioUrl: res.audioUrl,
        text: v.sampleText,
        voice: v.name,
      });
    } catch (e) {
      console.warn('Voice preview error:', e);
    } finally {
      setPlayingId(null);
    }
  };

  const handleCustomTrigger = async () => {
    if (!customPhrase.trim()) return;
    setIsSynthesizingCustom(true);
    try {
      const res = await synthesizeTTS({
        text: customPhrase.trim(),
        voice: customVoice,
        model: 'gemini-3.8-flash-lite-tts',
      });
      setActiveAudio({
        audioUrl: res.audioUrl,
        text: customPhrase,
        voice: customVoice,
      });
    } catch (e) {
      console.warn('Custom trigger error:', e);
    } finally {
      setIsSynthesizingCustom(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Soundboard Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Radio className="w-4 h-4" />
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Live Stream Soundboard & Voice Persona Library
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          One-click hotkeys for high-impact stream moments, plus complete acoustic voice showcase.
        </p>
      </div>

      {/* Active Audio Bar if trigger played */}
      {activeAudio && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-white">Currently Playing ({activeAudio.voice}):</span>
            <span className="italic truncate max-w-md">"{activeAudio.text}"</span>
          </div>
          <AudioPlayerBar
            audioUrl={activeAudio.audioUrl}
            text={activeAudio.text}
            voiceName={activeAudio.voice}
            accentColor="#F59E0B"
          />
        </div>
      )}

      {/* Stream Hotkey Soundboard Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Instant Stream Soundboard Buttons</span>
          </h3>
          <span className="text-xs text-slate-500">Click button to synthesize and trigger voice</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STREAM_SOUNDBOARD_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isThisPlaying = playingId === preset.title;
            return (
              <button
                key={preset.title}
                onClick={() => playPreset(preset)}
                disabled={isThisPlaying}
                className="group relative overflow-hidden p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all cursor-pointer shadow-lg active:scale-98 disabled:opacity-60"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr ${preset.color} text-white shadow-md`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        {preset.title}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        Voice: {preset.voice}
                      </span>
                    </div>
                  </div>

                  <span className="p-1.5 rounded-lg bg-slate-950 text-slate-400 group-hover:text-white transition-colors">
                    {isThisPlaying ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                  "{preset.text}"
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Custom Hotkey Spoken Trigger */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Quick Spoken Broadcast Trigger
        </h4>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={customPhrase}
            onChange={(e) => setCustomPhrase(e.target.value)}
            placeholder="Type any phrase to speak immediately on stream..."
            className="flex-1 w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />

          <select
            value={customVoice}
            onChange={(e) => setCustomVoice(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono focus:outline-none"
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleCustomTrigger}
            disabled={isSynthesizingCustom || !customPhrase.trim()}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            {isSynthesizingCustom ? 'Synthesizing...' : 'Speak Now'}
          </button>
        </div>
      </div>

      {/* Full Voice Persona Showcase Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span>Acoustic Voice Persona Showcase</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map((v) => {
            const isPlayingThis = playingId === v.id;
            return (
              <div
                key={v.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${v.avatarColor || 'from-indigo-500 to-purple-600'} flex items-center justify-center text-white font-bold text-sm shadow`}
                    >
                      {v.name[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{v.name}</h4>
                      <span className="text-[10px] text-slate-400">{v.gender}</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-cyan-300">
                    {v.pitch}
                  </span>
                </div>

                <div className="text-xs text-slate-300 font-medium">{v.tone}</div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 italic">
                  "{v.sampleText}"
                </div>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 truncate max-w-[170px]">
                    {v.recommendedFor}
                  </span>
                  <button
                    onClick={() => playVoiceSample(v)}
                    disabled={isPlayingThis}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPlayingThis ? (
                      <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                    <span>Preview Voice</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
