import React, { useState } from 'react';
import {
  X,
  History,
  Trash2,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { AudioHistoryItem } from '../../types/tts';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: AudioHistoryItem[];
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeAudioElem, setActiveAudioElem] = useState<HTMLAudioElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePlayToggle = (item: AudioHistoryItem) => {
    if (playingId === item.id) {
      activeAudioElem?.pause();
      setPlayingId(null);
    } else {
      activeAudioElem?.pause();
      const audio = new Audio(item.audioUrl);
      audio.onended = () => setPlayingId(null);
      audio.play();
      setActiveAudioElem(audio);
      setPlayingId(item.id);
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadItem = (item: AudioHistoryItem) => {
    const a = document.createElement('a');
    a.href = item.audioUrl;
    a.download = `voxcraft_${item.voice.toLowerCase()}_${item.id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Audio Generation History</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-mono text-slate-400">
              {history.length} takes
            </span>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2 py-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No audio generations recorded yet. Synthesize speech in the Studio or Twitch engine to see them here!
            </div>
          ) : (
            history.map((item) => {
              const isPlaying = playingId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white font-mono px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                        {item.voice}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.model}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        ~{item.duration}s
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    "{item.text}"
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlayToggle(item)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isPlaying ? 'Pause' : 'Play Take'}</span>
                      </button>

                      <button
                        onClick={() => downloadItem(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                        title="Download WAV file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>WAV</span>
                      </button>
                    </div>

                    <button
                      onClick={() => copyText(item.id, item.text)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === item.id ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
