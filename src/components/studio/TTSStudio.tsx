import React, { useState, useRef } from 'react';
import {
  Mic,
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  Wand2,
  Volume2,
  Clock,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  Flame,
  Radio,
  FileText
} from 'lucide-react';
import { VoiceProfile, TTSModelType, AudioHistoryItem } from '../../types/tts';
import { DEFAULT_VOICES, synthesizeTTS, enhanceScriptWithAI } from '../../services/ttsService';
import { AudioPlayerBar } from './AudioPlayerBar';

interface TTSStudioProps {
  voices: VoiceProfile[];
  onAddHistory?: (item: AudioHistoryItem) => void;
  history?: AudioHistoryItem[];
}

const PRESET_SCRIPTS = [
  {
    title: 'Twitch Stream Intro',
    text: 'What is going on chat! Welcome back to the stream! Smash that follow button, grab some snacks, and let’s jump straight into the ranked grind today!',
    style: 'High-energy, charismatic Twitch broadcaster',
    voice: 'Puck',
  },
  {
    title: 'Twitch Bits / Sub Alert',
    text: 'Huge shoutout to the community for crushing the sub goal! You all make these streams unbelievable, thank you for the love and energy!',
    style: 'Grateful, enthusiastic and warm',
    voice: 'Kore',
  },
  {
    title: 'Cinematic Game Trailer',
    text: 'When the world falls into eternal silence, only the resilient survive. Assemble your squad. The final raid begins at dawn.',
    style: 'Deep, dramatic cinematic narrator with heavy gravitas',
    voice: 'Charon',
  },
  {
    title: 'Tech & AI Explainer',
    text: 'Neural Text-to-Speech models synthesize audio by mapping semantic tokens directly to 24kHz waveform frequencies, delivering unprecedented human prosody.',
    style: 'Crisp, articulate and authoritative technical keynote speaker',
    voice: 'Zephyr',
  },
  {
    title: 'Fantasy Lore & Quest',
    text: 'Beyond the Misty Reach lies the citadel of echoes. Many have entered seeking power, but few have ever returned with their voice intact.',
    style: 'Mysterious, enchanting and melodic storyteller',
    voice: 'Aoede',
  },
  {
    title: 'Intense Tactical Raid',
    text: 'Check your corners! We’ve got hostiles breaching sector seven. Lock the gates, hold the line, and don’t give an inch!',
    style: 'Gravelly, gritty, urgent combat commander',
    voice: 'Fenrir',
  },
];

const VOCAL_BURSTS = [
  { label: '<breath>', description: 'Natural breathing pause' },
  { label: '<laugh>', description: 'Laughter burst' },
  { label: '<gasp>', description: 'Surprise gasp' },
  { label: '<sigh>', description: 'Exhale or relief' },
  { label: '<cough>', description: 'Quick throat clear' },
  { label: '|yeah|', description: 'Affirmative backchannel' },
  { label: '|mhm|', description: 'Agreeable nod' },
];

export const TTSStudio: React.FC<TTSStudioProps> = ({ voices = DEFAULT_VOICES, onAddHistory, history = [] }) => {
  const [text, setText] = useState(
    'What is going on chat! Welcome back to the stream! Grab some snacks, smash that follow button, and let’s get into the action!'
  );
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [selectedModel, setSelectedModel] = useState<TTSModelType>('gemini-3.8-flash-lite-tts');
  const [stylePrompt, setStylePrompt] = useState('High-energy, charismatic Twitch streamer');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Latest generation result
  const [latestAudio, setLatestAudio] = useState<{
    audioUrl: string;
    duration: number;
    byteSize: number;
    modelUsed: string;
    voiceUsed: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Insert tag at cursor position
  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = text.substring(0, start) + ' ' + tag + ' ' + text.substring(end);
    setText(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
      }
    }, 10);
  };

  const handleSynthesize = async () => {
    if (!text.trim()) return;
    setIsSynthesizing(true);
    setErrorMessage(null);

    try {
      const res = await synthesizeTTS({
        text: text.trim(),
        voice: selectedVoice,
        model: selectedModel,
        style: stylePrompt.trim() || undefined,
      });

      setLatestAudio(res);

      if (onAddHistory) {
        onAddHistory({
          id: `hist-${Date.now()}`,
          text: text.trim(),
          voice: res.voiceUsed,
          model: selectedModel,
          style: stylePrompt,
          duration: res.duration,
          timestamp: Date.now(),
          audioUrl: res.audioUrl,
          source: 'studio',
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Speech synthesis failed.';
      setErrorMessage(msg);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleEnhanceScript = async () => {
    if (!text.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceScriptWithAI(text, stylePrompt || 'Natural, expressive delivery');
      setText(enhanced);
    } catch (e: unknown) {
      console.warn('Script enhancement error:', e);
    } finally {
      setIsEnhancing(false);
    }
  };

  const selectedVoiceObj = voices.find((v) => v.id === selectedVoice) || voices[0];
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(1, Math.round(wordCount / 2.6));

  return (
    <div className="space-y-6">
      {/* Studio Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Mic className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Neural Speech Synthesis Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Produce natural 24kHz studio vocalizations with Gemini Audio Models and emotional acting directions.
          </p>
        </div>

        {/* Engine Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedModel('gemini-3.8-flash-lite-tts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedModel === 'gemini-3.8-flash-lite-tts'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Flash-Lite (Fast / Stream)
          </button>
          <button
            onClick={() => setSelectedModel('gemini-3.8-flash-tts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedModel === 'gemini-3.8-flash-tts'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎭 Flash-TTS (Flagship Bursts)
          </button>
          <button
            onClick={() => setSelectedModel('web-speech-api')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedModel === 'web-speech-api'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🌐 Web Speech (Local)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Script Editor & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Quick Script Presets:</span>
              <span>Click to load</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SCRIPTS.map((preset) => (
                <button
                  key={preset.title}
                  onClick={() => {
                    setText(preset.text);
                    setStylePrompt(preset.style);
                    setSelectedVoice(preset.voice);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] transition-all cursor-pointer"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Text Editor Box */}
          <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl focus-within:border-cyan-500/50 transition-colors">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs">
              <span className="text-slate-400 font-medium">Text Prompt & Script</span>
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span>{charCount} chars</span>
                <span>•</span>
                <span>{wordCount} words</span>
                <span>•</span>
                <span className="text-cyan-400">~{estimatedSeconds}s</span>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Enter text to speak, or use presets above..."
              className="w-full bg-transparent text-white text-sm leading-relaxed placeholder-slate-600 focus:outline-none resize-none font-sans"
            />

            {/* Vocal Burst Insert Bar */}
            <div className="mt-3 pt-3 border-t border-slate-800/70">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Insert Vocal Bursts & Backchannels:
                </span>
                <button
                  onClick={handleEnhanceScript}
                  disabled={isEnhancing || !text.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50"
                  title="Uses AI to inject breathing, laughing, and realistic cadence into your script"
                >
                  <Wand2 className={`w-3 h-3 ${isEnhancing ? 'animate-spin' : ''}`} />
                  <span>{isEnhancing ? 'Directing...' : 'AI Enhance Script'}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {VOCAL_BURSTS.map((burst) => (
                  <button
                    key={burst.label}
                    onClick={() => insertTag(burst.label)}
                    className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 text-[11px] font-mono transition-colors cursor-pointer"
                    title={burst.description}
                  >
                    {burst.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Acting Style / Emotional Persona */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Acting Style & Speech Metadata:</span>
              </label>
              <span className="text-[11px] text-slate-500">Instructs mood, accent, and delivery</span>
            </div>

            <input
              type="text"
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="e.g. High-energy Twitch streamer, Mysterious noir detective, Calm meditation guide"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'High-energy Twitch streamer',
                'Deep cinematic movie trailer',
                'Calm meditation guide',
                'Articulate news anchor',
                'Excited gadget reviewer',
                'Whispery bedtime storyteller',
              ].map((style) => (
                <button
                  key={style}
                  onClick={() => setStylePrompt(style)}
                  className="px-2 py-0.5 rounded-md bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[10px] transition-colors cursor-pointer"
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Synthesize Button */}
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing || !text.trim()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
          >
            {isSynthesizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Synthesizing 24kHz Neural Audio...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Generate Speech ({selectedVoice})</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}
        </div>

        {/* Right Col: Voice Picker & Output Workbench (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Audio Result */}
          {latestAudio && (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Speech Generated
                </span>
                <span className="font-mono text-[11px]">{latestAudio.duration}s</span>
              </div>
              <AudioPlayerBar
                audioUrl={latestAudio.audioUrl}
                text={text}
                voiceName={latestAudio.voiceUsed}
                duration={latestAudio.duration}
                byteSize={latestAudio.byteSize}
                accentColor="#06B6D4"
              />
            </div>
          )}

          {/* Voice Selector Card List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Select Voice Persona ({voices.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Gemini 3.8</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {voices.map((v) => {
                const isSelected = selectedVoice === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/50 to-slate-900 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/40'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${v.avatarColor || 'from-indigo-500 to-purple-600'} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                        >
                          {v.name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                            <span>{v.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({v.gender})
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {v.pitch}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 leading-tight">{v.tone}</p>
                    <p className="text-[10px] text-slate-500 mt-1 italic truncate">
                      Best for: {v.recommendedFor}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
