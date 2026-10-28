import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Tv,
  Copy,
  Check,
  Download,
  Trash2,
  Settings2,
  Sparkles,
  Volume2,
  ShieldCheck,
  Globe,
  Type,
  FileText
} from 'lucide-react';
import { SubtitleConfig, SubtitleEntry, SubtitleVisualTheme } from '../../types/tts';
import {
  liveSubtitlesEngine,
  exportToSRT,
  translateSubtitleText
} from '../../services/speechRecognitionService';
import { SubtitleCardRenderer } from './SubtitleCardRenderer';

interface LiveSubtitlesStudioProps {
  onToggleActive?: (active: boolean) => void;
}

export const LiveSubtitlesStudio: React.FC<LiveSubtitlesStudioProps> = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [interimText, setInterimText] = useState('');
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [latestTranslation, setLatestTranslation] = useState<string | undefined>(undefined);
  const [copiedOverlay, setCopiedOverlay] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subtitle customizer config
  const [config, setConfig] = useState<SubtitleConfig>({
    theme: 'cyberpunk',
    fontSize: 'lg',
    textTransform: 'none',
    censorProfanity: true,
    autoHideSeconds: 4,
    streamerName: 'STREAMER',
    targetLanguage: 'none',
    showWordHighlight: true,
    micSensitivity: 80,
    showSpeakerBadge: true,
  });

  // Connect engine listeners
  useEffect(() => {
    const unsubSub = liveSubtitlesEngine.onSubtitles((interim, finals) => {
      setInterimText(interim);
      setSubtitles(finals);

      // If translation requested for final entries
      if (config.targetLanguage !== 'none' && finals.length > 0) {
        const lastEntry = finals[finals.length - 1];
        if (!lastEntry.translation) {
          translateSubtitleText(lastEntry.text, config.targetLanguage).then((trans) => {
            lastEntry.translation = trans;
            setLatestTranslation(trans);
          });
        }
      }
    });

    const unsubStatus = liveSubtitlesEngine.onStatus((active, err) => {
      setIsListening(active);
      if (err) setErrorMsg(err);
      else setErrorMsg(null);
    });

    const unsubLevel = liveSubtitlesEngine.onMicLevel((level) => {
      setMicLevel(level);
    });

    return () => {
      unsubSub();
      unsubStatus();
      unsubLevel();
    };
  }, [config.targetLanguage]);

  // Handle master toggle switch
  const handleToggle = async () => {
    if (isEnabled) {
      liveSubtitlesEngine.stop();
      setIsEnabled(false);
    } else {
      setErrorMsg(null);
      try {
        await liveSubtitlesEngine.start();
        setIsEnabled(true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Microphone access failed.';
        setErrorMsg(msg);
        setIsEnabled(false);
      }
    }
  };

  const handleClearHistory = () => {
    liveSubtitlesEngine.clear();
    setSubtitles([]);
    setInterimText('');
    setLatestTranslation(undefined);
  };

  const downloadSRT = () => {
    const srt = exportToSRT(subtitles);
    if (!srt) return;
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stream_subtitles_${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyTranscriptText = () => {
    const fullText = subtitles.map((s) => s.text).join(' ');
    navigator.clipboard.writeText(fullText);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const overlayUrl = `${window.location.origin}/?mode=captions-overlay&theme=${config.theme}&size=${config.fontSize}&lang=${config.targetLanguage}`;

  const copyOverlayLink = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedOverlay(true);
    setTimeout(() => setCopiedOverlay(false), 2500);
  };

  const latestText = subtitles.length > 0 ? subtitles[subtitles.length - 1].text : '';

  return (
    <div className="space-y-6">
      {/* Top Banner with Master Enable Switch */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 border border-cyan-800/40 p-6 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Mic className="w-4 h-4" />
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold uppercase tracking-wider border border-cyan-500/30">
                Live Voice Closed Captions
              </span>
              {isEnabled && isListening && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  MIC ACTIVE
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Live Voice Subtitles for Streamers
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Capture your own microphone voice in real time, generate live on-screen animated subtitles for Twitch or OBS, filter profanity, and translate speech on the fly.
            </p>
          </div>

          {/* Master Enable/Disable Toggle Switch */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={handleToggle}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-600 shadow-inner" />
              </label>

              <div>
                <span className="text-xs font-bold text-white block">
                  {isEnabled ? 'SUBTITLES ENABLED' : 'SUBTITLES DISABLED'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isEnabled ? 'Microphone capturing' : 'Click toggle to activate'}
                </span>
              </div>
            </div>

            {/* Live Mic VU Volume Meter */}
            <div className="flex items-center gap-2 pl-3 sm:border-l border-slate-800">
              <Volume2 className={`w-4 h-4 ${micLevel > 15 ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`} />
              <div className="w-24 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${isEnabled ? micLevel : 0}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                {isEnabled ? `${micLevel}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span><strong>Microphone Notice:</strong> {errorMsg}</span>
            <button
              onClick={() => handleToggle()}
              className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Live Preview & Style Customizer (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Live Subtitle Stage / Preview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Stream Subtitle Stage
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono">
                  Theme: {config.theme}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyOverlayLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md"
                  title="Copy OBS Studio Browser Source Link"
                >
                  {copiedOverlay ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOverlay ? 'OBS Link Copied!' : 'Copy OBS Browser Source'}</span>
                </button>
              </div>
            </div>

            {/* Video Preview Canvas Backdrop */}
            <div className="relative min-h-[220px] rounded-xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800/90 flex flex-col items-center justify-center p-6 overflow-hidden">
              <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-600 uppercase flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5" />
                <span>OBS Stage Preview (Transparent on Stream)</span>
              </div>

              {/* Subtitle Card */}
              <SubtitleCardRenderer
                text={latestText}
                interimText={interimText}
                translation={latestTranslation}
                config={config}
                isActive={isEnabled}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Status: {isEnabled ? (isListening ? 'Streaming voice data' : 'Connecting to mic...') : 'Disabled'}</span>
              <span className="font-mono text-[11px]">{subtitles.length} phrases captured</span>
            </div>
          </div>

          {/* Subtitle Customizer Settings */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
              <Settings2 className="w-4 h-4 text-cyan-400" />
              <span>Subtitle Visual Theme & Style</span>
            </h3>

            {/* Theme Picker */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Glowing Cyan Card' },
                { id: 'tiktok', label: 'TikTok/Viral', desc: 'Bold Yellow Outline' },
                { id: 'classic', label: 'Classic CC', desc: 'High-Contrast Box' },
                { id: 'neon', label: 'Neon Pink', desc: 'Synthwave Glow' },
                { id: 'minimal', label: 'Minimal', desc: 'Floating Shadow' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setConfig({ ...config, theme: theme.id as SubtitleVisualTheme })}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    config.theme === theme.id
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-white ring-1 ring-cyan-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{theme.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">{theme.desc}</div>
                </button>
              ))}
            </div>

            {/* Additional Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Font Size */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Font Size</label>
                <select
                  value={config.fontSize}
                  onChange={(e) => setConfig({ ...config, fontSize: e.target.value as SubtitleConfig['fontSize'] })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="sm">Small (Compact)</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large (Recommended)</option>
                  <option value="xl">Extra Large (High Impact)</option>
                </select>
              </div>

              {/* Text Case */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Text Casing</label>
                <select
                  value={config.textTransform}
                  onChange={(e) => setConfig({ ...config, textTransform: e.target.value as SubtitleConfig['textTransform'] })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="none">Normal (As Spoken)</option>
                  <option value="uppercase">UPPERCASE (TikTok/Esports)</option>
                  <option value="capitalize">Capitalize Each Word</option>
                </select>
              </div>

              {/* Live Translation */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Live Translation</span>
                </label>
                <select
                  value={config.targetLanguage}
                  onChange={(e) => setConfig({ ...config, targetLanguage: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="none">No Translation (English Only)</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="Japanese">Japanese (日本語)</option>
                  <option value="French">French (Français)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                </select>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.censorProfanity}
                  onChange={(e) => setConfig({ ...config, censorProfanity: e.target.checked })}
                  className="accent-cyan-500 rounded"
                />
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Profanity Censor Filter (Family-Friendly)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSpeakerBadge}
                  onChange={(e) => setConfig({ ...config, showSpeakerBadge: e.target.checked })}
                  className="accent-cyan-500 rounded"
                />
                <Type className="w-3.5 h-3.5 text-cyan-400" />
                <span>Display Speaker Name Tag</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Col: Live Session Transcript & Export Tools (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Transcript Log Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Session Transcript
                </h3>
              </div>

              {subtitles.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Transcript scroll area */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {subtitles.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  {isEnabled
                    ? 'Listening to microphone... Speak into your mic to log transcripts.'
                    : 'Turn on the Subtitles Enable toggle to start recording live voice transcripts.'}
                </div>
              ) : (
                subtitles.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>#{idx + 1}</span>
                      <span>{new Date(sub.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-200 font-medium">"{sub.text}"</p>
                    {sub.translation && (
                      <p className="text-cyan-400 text-[11px] font-mono italic">
                        [{config.targetLanguage}]: {sub.translation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Export buttons */}
            {subtitles.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={copyTranscriptText}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTranscript ? 'Copied Text' : 'Copy All Text'}</span>
                </button>

                <button
                  onClick={downloadSRT}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors cursor-pointer"
                  title="Download .SRT subtitle file for Premiere / YouTube"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .SRT</span>
                </button>
              </div>
            )}
          </div>

          {/* OBS Studio Integration Guide */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Tv className="w-4 h-4 text-purple-400" />
              <span>How to display on OBS Studio</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add real-time transparent closed captions right over your game or webcam in OBS Studio.
            </p>

            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <li>In OBS Studio, click <strong className="text-cyan-300">+ Add Source</strong></li>
              <li>Select <strong className="text-cyan-300">Browser Source</strong></li>
              <li>Paste the URL below</li>
              <li>Set Width: <code className="text-cyan-300 font-mono">800</code>, Height: <code className="text-cyan-300 font-mono">200</code></li>
            </ol>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={overlayUrl}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 select-all focus:outline-none"
              />
              <button
                onClick={copyOverlayLink}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex-shrink-0"
              >
                {copiedOverlay ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
