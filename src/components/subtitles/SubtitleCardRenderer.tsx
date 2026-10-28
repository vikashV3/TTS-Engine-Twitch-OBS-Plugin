import React from 'react';
import { SubtitleConfig, SubtitleVisualTheme } from '../../types/tts';
import { formatSubtitleText } from '../../services/speechRecognitionService';

interface SubtitleCardRendererProps {
  text: string;
  interimText?: string;
  translation?: string;
  config: SubtitleConfig;
  isActive?: boolean;
}

export const SubtitleCardRenderer: React.FC<SubtitleCardRendererProps> = ({
  text,
  interimText = '',
  translation,
  config,
  isActive = true,
}) => {
  const displayText = formatSubtitleText(text || interimText, config);
  const isInterimOnly = !text && Boolean(interimText);

  if (!displayText) {
    if (!isActive) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-500 text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Microphone listening... Speak to see live subtitles</span>
      </div>
    );
  }

  // Font size classes
  const sizeClasses = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-2xl font-bold',
    xl: 'text-xl sm:text-3xl font-extrabold',
  }[config.fontSize];

  // Visual Theme Renderers
  if (config.theme === 'tiktok') {
    return (
      <div className="max-w-2xl text-center select-none animate-in fade-in zoom-in-95 duration-150">
        <div
          className={`${sizeClasses} uppercase font-black tracking-wide leading-tight`}
          style={{
            color: '#FACC15', // Vibrant TikTok yellow
            textShadow: '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 4px 10px rgba(0,0,0,0.8)',
          }}
        >
          {displayText}
          {isInterimOnly && <span className="opacity-70 animate-pulse ml-1">...</span>}
        </div>
        {translation && (
          <div
            className="text-xs sm:text-sm font-bold text-white mt-1 italic tracking-wide"
            style={{
              textShadow: '2px 2px 0 #000, -2px -2px 0 #000',
            }}
          >
            [{config.targetLanguage}]: {translation}
          </div>
        )}
      </div>
    );
  }

  if (config.theme === 'classic') {
    return (
      <div className="inline-block max-w-2xl px-5 py-2.5 rounded-xl bg-black/90 border border-neutral-700/80 shadow-2xl backdrop-blur-sm animate-in fade-in duration-150">
        {config.showSpeakerBadge && (
          <div className="text-[11px] font-mono text-yellow-400 font-bold uppercase mb-0.5 tracking-wider">
            [{config.streamerName || 'SPEAKER'}]
          </div>
        )}
        <div className={`${sizeClasses} text-white font-mono tracking-normal leading-snug`}>
          {displayText}
          {isInterimOnly && <span className="text-yellow-400 animate-pulse">_</span>}
        </div>
        {translation && (
          <div className="text-xs text-neutral-300 font-mono mt-1 pt-1 border-t border-neutral-800">
            {translation}
          </div>
        )}
      </div>
    );
  }

  if (config.theme === 'minimal') {
    return (
      <div className="max-w-3xl text-center select-none animate-in fade-in duration-150">
        <div
          className={`${sizeClasses} font-semibold text-white tracking-wide`}
          style={{
            textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 2px #000',
          }}
        >
          {displayText}
          {isInterimOnly && <span className="opacity-60 italic ml-1">...</span>}
        </div>
        {translation && (
          <div
            className="text-xs sm:text-sm text-cyan-300 mt-1 font-medium italic"
            style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
          >
            {translation}
          </div>
        )}
      </div>
    );
  }

  if (config.theme === 'neon') {
    return (
      <div className="max-w-2xl p-4 rounded-2xl bg-slate-950/90 border-2 border-pink-500/80 shadow-[0_0_25px_rgba(236,72,153,0.35)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 text-center">
        {config.showSpeakerBadge && (
          <span className="inline-block px-2 py-0.5 mb-1.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold uppercase border border-pink-500/30">
            {config.streamerName || 'LIVE STREAMER'}
          </span>
        )}
        <div className={`${sizeClasses} font-extrabold text-pink-200 tracking-wide drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]`}>
          {displayText}
          {isInterimOnly && <span className="text-pink-400 animate-pulse ml-1">...</span>}
        </div>
        {translation && (
          <div className="text-xs font-mono text-cyan-300 mt-1.5 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">
            [{config.targetLanguage}]: {translation}
          </div>
        )}
      </div>
    );
  }

  // Default: Cyberpunk
  return (
    <div className="max-w-2xl p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between gap-2 mb-1">
        {config.showSpeakerBadge && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
              {config.streamerName || 'VOICE CAPTION'}
            </span>
          </div>
        )}
        <span className="text-[10px] font-mono text-slate-500 ml-auto">
          LIVE CC
        </span>
      </div>

      <div className={`${sizeClasses} text-white font-medium tracking-wide leading-snug drop-shadow`}>
        {displayText}
        {isInterimOnly && <span className="text-cyan-400 animate-pulse ml-1">...</span>}
      </div>

      {translation && (
        <div className="mt-2 pt-1.5 border-t border-slate-800 text-xs font-mono text-cyan-300 flex items-center gap-1.5">
          <span className="text-[10px] uppercase text-slate-400 font-bold">[{config.targetLanguage}]:</span>
          <span>{translation}</span>
        </div>
      )}
    </div>
  );
};
