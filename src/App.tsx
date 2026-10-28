import React, { useState, useEffect } from 'react';
import { Header, AppTab } from './components/common/Header';
import { TTSStudio } from './components/studio/TTSStudio';
import { TwitchStreamEngine } from './components/twitch/TwitchStreamEngine';
import { DialogueStudio } from './components/dialogue/DialogueStudio';
import { SoundboardView } from './components/soundboard/SoundboardView';
import { OBSOverlayView } from './components/overlay/OBSOverlayView';
import { HistoryModal } from './components/common/HistoryModal';
import { VoiceProfile, AudioHistoryItem } from './types/tts';
import { fetchVoices, DEFAULT_VOICES } from './services/ttsService';
import { twitchClient } from './services/twitchIrcService';

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('studio');
  const [voices, setVoices] = useState<VoiceProfile[]>(DEFAULT_VOICES);
  const [history, setHistory] = useState<AudioHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [twitchChannel, setTwitchChannel] = useState<string>('');

  // Check if loaded in OBS Studio Browser Source mode: ?mode=obs-overlay&channel=...
  const urlParams = new URLSearchParams(window.location.search);
  const isObsOverlay = urlParams.get('mode') === 'obs-overlay';
  const obsChannel = urlParams.get('channel') || '';

  useEffect(() => {
    fetchVoices().then((res) => {
      if (res && res.length > 0) setVoices(res);
    });

    const unsub = twitchClient.onStatus((status) => {
      if (status === 'connected') {
        setTwitchChannel(twitchClient.getChannel());
      } else {
        setTwitchChannel('');
      }
    });

    return () => unsub();
  }, []);

  const handleAddHistory = (item: AudioHistoryItem) => {
    setHistory((prev) => [item, ...prev].slice(0, 50));
  };

  // If OBS Overlay Browser Source
  if (isObsOverlay) {
    return <OBSOverlayView channelName={obsChannel} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        twitchConnectedChannel={twitchChannel}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'studio' && (
          <TTSStudio
            voices={voices}
            onAddHistory={handleAddHistory}
            history={history}
          />
        )}

        {currentTab === 'twitch' && (
          <TwitchStreamEngine voices={voices} />
        )}

        {currentTab === 'dialogue' && (
          <DialogueStudio
            voices={voices}
            onAddHistory={handleAddHistory}
          />
        )}

        {currentTab === 'soundboard' && (
          <SoundboardView voices={voices} />
        )}
      </main>

      {/* Generation History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClearHistory={() => setHistory([])}
      />

      {/* Subtle Studio Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>VoxCraft TTS Engine • 24kHz Mono 16-bit PCM Audio</span>
          </div>
          <div>
            Built with Gemini 3.8 Audio Models & Twitch IRC Live Streamer Protocol
          </div>
        </div>
      </footer>
    </div>
  );
}
