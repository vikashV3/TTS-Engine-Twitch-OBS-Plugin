import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface SubtitleToggleSwitchProps {
  isEnabled: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const SubtitleToggleSwitch: React.FC<SubtitleToggleSwitchProps> = ({
  isEnabled,
  onToggle,
  size = 'md',
  showLabel = true,
}) => {
  return (
    <div
      onClick={onToggle}
      className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
        isEnabled
          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
      }`}
      title={isEnabled ? 'Click to turn subtitles OFF' : 'Click to turn subtitles ON'}
    >
      <div className="flex items-center gap-1.5">
        {isEnabled ? (
          <div className="relative">
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
          </div>
        ) : (
          <MicOff className="w-4 h-4 text-slate-500" />
        )}

        {showLabel && (
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold tracking-wide">
              SUBTITLES
            </span>
            <span className="text-[9px] font-mono leading-none text-slate-400">
              {isEnabled ? 'ACTIVE (ON)' : 'MUTED (OFF)'}
            </span>
          </div>
        )}
      </div>

      {/* Tactile Toggle Switch Pill */}
      <div
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isEnabled ? 'bg-cyan-500' : 'bg-slate-800'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            isEnabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
};
