import React from 'react';
import {
  Mic,
  Tv,
  Users,
  Radio,
  History,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { SubtitleToggleSwitch } from './SubtitleToggleSwitch';

export type AppTab = 'studio' | 'twitch' | 'subtitles' | 'dialogue' | 'soundboard';

interface HeaderProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  historyCount: number;
  onOpenHistory: () => void;
  twitchConnectedChannel?: string;
  subtitlesEnabled: boolean;
  onToggleSubtitles: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  historyCount,
  onOpenHistory,
  twitchConnectedChannel,
  subtitlesEnabled,
  onToggleSubtitles,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-cyan-500/20">
              <Mic className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white font-sans">
                  VoxCraft <span className="text-cyan-400">AI</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  TTS & Stream CC
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden lg:block">
                Neural Speech Synthesis • Live Voice Subtitles • Twitch Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
            <button
              onClick={() => onSelectTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
                currentTab === 'studio'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden md:inline">TTS Studio</span>
            </button>

            <button
              onClick={() => onSelectTab('twitch')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
                currentTab === 'twitch'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Twitch Engine</span>
              {twitchConnectedChannel && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Live Subtitles Tab */}
            <button
              onClick={() => onSelectTab('subtitles')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
                currentTab === 'subtitles'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Voice Subtitles</span>
              {subtitlesEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => onSelectTab('dialogue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
                currentTab === 'dialogue'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dialogue</span>
            </button>

            <button
              onClick={() => onSelectTab('soundboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
                currentTab === 'soundboard'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Soundboard</span>
            </button>
          </nav>

          {/* Quick Subtitle Toggle Switch + History */}
          <div className="flex items-center gap-2">
            <SubtitleToggleSwitch
              isEnabled={subtitlesEnabled}
              onToggle={onToggleSubtitles}
            />

            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors cursor-pointer"
              title="Recent Generations History"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">History</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                  {historyCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
