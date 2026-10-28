import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Tv,
  Volume2,
  VolumeX,
  ShieldAlert,
  Play,
  SkipForward,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Coins,
  Crown,
  MessageSquare,
  Flame,
  Settings2,
  AlertCircle
} from 'lucide-react';
import { TwitchAlertConfig, TwitchQueueItem, VoiceProfile } from '../../types/tts';
import { twitchClient, ParsedTwitchMessage } from '../../services/twitchIrcService';
import { synthesizeTTS, DEFAULT_VOICES } from '../../services/ttsService';
import { playAlertChime } from '../../utils/audioUtils';
import { AudioPlayerBar } from '../studio/AudioPlayerBar';

interface TwitchStreamEngineProps {
  voices: VoiceProfile[];
}

export const TwitchStreamEngine: React.FC<TwitchStreamEngineProps> = ({ voices = DEFAULT_VOICES }) => {
  const [channelInput, setChannelInput] = useState('');
  const [activeChannel, setActiveChannel] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [connError, setConnError] = useState<string | null>(null);

  // Settings
  const [config, setConfig] = useState<TwitchAlertConfig>({
    channel: '',
    enabled: true,
    readAllChat: false,
    commandPrefix: '!tts',
    minBits: 100,
    minTier: 'all',
    voice: 'Puck',
    model: 'gemini-3.8-flash-lite-tts',
    style: 'Upbeat, high energy Twitch streamer alert',
    volume: 1,
    speed: 1,
    soundAlert: 'chime',
    bannedWords: ['hate', 'scam', 'raid_bad'],
    maxCharacters: 180,
    userCooldownSeconds: 5,
    voiceByTier: true,
  });

  const [bannedWordsInput, setBannedWordsInput] = useState('hate, scam, spam, troll');

  // Queue state
  const [queue, setQueue] = useState<TwitchQueueItem[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<TwitchQueueItem | null>(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // User cooldown tracking
  const userCooldownMap = useRef<Map<string, number>>(new Map());

  // Init audio element for automatic stream playback
  useEffect(() => {
    const audio = new Audio();
    audio.onended = () => {
      setCurrentPlaying((prev) => (prev ? { ...prev, status: 'completed' } : null));
    };
    audio.onerror = () => {
      setCurrentPlaying((prev) => (prev ? { ...prev, status: 'completed' } : null));
    };
    setAudioElement(audio);

    return () => {
      audio.pause();
    };
  }, []);

  // Sync Twitch IRC status
  useEffect(() => {
    const unsubStatus = twitchClient.onStatus((status, err) => {
      setConnectionStatus(status);
      if (err) setConnError(err);
      else setConnError(null);
    });

    const unsubMsg = twitchClient.onMessage((msg: ParsedTwitchMessage) => {
      handleIncomingChatMessage(msg);
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [config, isMuted]);

  // Handle incoming parsed chat message
  const handleIncomingChatMessage = (msg: ParsedTwitchMessage) => {
    if (!config.enabled || isMuted) return;

    let messageText = msg.message.trim();
    let isTtsEligible = false;
    let eventType: TwitchQueueItem['type'] = 'chat';

    // 1. Check for Bits
    if (msg.bits && msg.bits >= config.minBits) {
      isTtsEligible = true;
      eventType = 'bits';
      // Strip out cheers like "Cheer100" from text
      messageText = messageText.replace(/Cheer\d+/gi, '').trim() || 'Cheered bits!';
    }
    // 2. Check for !tts command
    else if (!config.readAllChat && config.commandPrefix && messageText.toLowerCase().startsWith(config.commandPrefix.toLowerCase())) {
      isTtsEligible = true;
      messageText = messageText.slice(config.commandPrefix.length).trim();
    }
    // 3. Read all chat if enabled
    else if (config.readAllChat) {
      isTtsEligible = true;
    }

    if (!isTtsEligible || !messageText) return;

    // Filter tier requirements
    if (config.minTier === 'subscribers' && !msg.isSub && !msg.isMod && !msg.isBroadcaster) return;
    if (config.minTier === 'vips' && !msg.isVip && !msg.isMod && !msg.isBroadcaster) return;
    if (config.minTier === 'mods' && !msg.isMod && !msg.isBroadcaster) return;

    // Cooldown check
    const now = Date.now();
    const lastTime = userCooldownMap.current.get(msg.username) || 0;
    if (now - lastTime < config.userCooldownSeconds * 1000) {
      return; // rate-limited
    }
    userCooldownMap.current.set(msg.username, now);

    // Banned words check
    const lowerMsg = messageText.toLowerCase();
    const banned = bannedWordsInput.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
    const hasBannedWord = banned.some((w) => lowerMsg.includes(w));
    if (hasBannedWord) {
      return; // blocked by moderation filter
    }

    // Truncate length
    if (messageText.length > config.maxCharacters) {
      messageText = messageText.slice(0, config.maxCharacters) + '...';
    }

    // Determine voice based on tier
    let chosenVoice = config.voice;
    if (config.voiceByTier) {
      if (msg.bits && msg.bits >= 500) chosenVoice = 'Fenrir';
      else if (msg.isBroadcaster || msg.isMod) chosenVoice = 'Charon';
      else if (msg.isSub) chosenVoice = 'Puck';
      else if (msg.isVip) chosenVoice = 'Aoede';
    }

    const newItem: TwitchQueueItem = {
      id: `twitch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      username: msg.displayName || msg.username,
      message: messageText,
      type: eventType,
      bitsAmount: msg.bits,
      timestamp: Date.now(),
      status: 'pending',
      voiceUsed: chosenVoice,
    };

    setQueue((prev) => [...prev, newItem]);
  };

  // Queue runner
  useEffect(() => {
    if (isProcessingQueue || currentPlaying || isMuted) return;

    const nextItem = queue.find((item) => item.status === 'pending');
    if (!nextItem) return;

    processQueueItem(nextItem);
  }, [queue, currentPlaying, isProcessingQueue, isMuted]);

  const processQueueItem = async (item: TwitchQueueItem) => {
    setIsProcessingQueue(true);

    // Update status to synthesizing
    setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'synthesizing' } : q)));

    try {
      // 1. Play alert chime
      if (config.soundAlert !== 'none') {
        await playAlertChime(config.soundAlert);
      }

      // Format speech text with speaker name for clear stream alert
      let speechText = `${item.username} says: ${item.message}`;
      if (item.type === 'bits') {
        speechText = `${item.username} cheered ${item.bitsAmount} bits! ${item.message}`;
      } else if (item.type === 'sub') {
        speechText = `${item.username} just subscribed! ${item.message}`;
      }

      const voice = item.voiceUsed || config.voice;
      const res = await synthesizeTTS({
        text: speechText,
        voice,
        model: config.model,
        style: config.style,
      });

      // Update item with audioUrl
      const activeItem: TwitchQueueItem = {
        ...item,
        status: 'playing',
        audioUrl: res.audioUrl,
      };

      setCurrentPlaying(activeItem);
      setQueue((prev) => prev.map((q) => (q.id === item.id ? activeItem : q)));

      // Play audio automatically
      if (audioElement && res.audioUrl && !isMuted) {
        audioElement.src = res.audioUrl;
        audioElement.volume = config.volume;
        audioElement.playbackRate = config.speed;
        await audioElement.play();
      }
    } catch (err) {
      console.error('Failed to process Twitch TTS item:', err);
      // Mark as completed/skipped so queue doesn't hang
      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'skipped' } : q)));
      setCurrentPlaying(null);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim()) return;
    const clean = channelInput.trim().toLowerCase().replace(/^#/, '');
    setActiveChannel(clean);
    twitchClient.connect(clean);
  };

  const handleDisconnect = () => {
    twitchClient.disconnect();
    setActiveChannel('');
  };

  const handleSkipCurrent = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    if (currentPlaying) {
      setQueue((prev) => prev.map((q) => (q.id === currentPlaying.id ? { ...q, status: 'skipped' } : q)));
    }
    setCurrentPlaying(null);
  };

  const handleClearQueue = () => {
    handleSkipCurrent();
    setQueue([]);
  };

  // Mock test event triggers
  const triggerTestAlert = (type: 'bits' | 'sub' | 'chat') => {
    let mockItem: TwitchQueueItem;
    if (type === 'bits') {
      mockItem = {
        id: `test-${Date.now()}`,
        username: 'PixelNinja',
        message: 'Let’s go! Amazing stream today, keep crushing it!',
        type: 'bits',
        bitsAmount: 500,
        timestamp: Date.now(),
        status: 'pending',
        voiceUsed: 'Fenrir',
      };
    } else if (type === 'sub') {
      mockItem = {
        id: `test-${Date.now()}`,
        username: 'CyberValkyrie',
        message: 'Subscribed for 6 months! Love the gameplay and vibes!',
        type: 'sub',
        subMonths: 6,
        timestamp: Date.now(),
        status: 'pending',
        voiceUsed: 'Puck',
      };
    } else {
      mockItem = {
        id: `test-${Date.now()}`,
        username: 'GamerZero',
        message: 'What game are we playing on the next subathon stream?',
        type: 'chat',
        timestamp: Date.now(),
        status: 'pending',
        voiceUsed: config.voice,
      };
    }

    setQueue((prev) => [...prev, mockItem]);
  };

  const overlayUrl = `${window.location.origin}/?mode=obs-overlay&channel=${activeChannel || 'stream'}`;

  const copyOverlayLink = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedOverlay(true);
    setTimeout(() => setCopiedOverlay(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero for Twitch Streamers */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/40 p-6 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-600/30 text-purple-400 border border-purple-500/30 shadow-inner">
                <Tv className="w-4 h-4" />
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider border border-purple-500/30">
                Twitch Live Engine
              </span>
              {connectionStatus === 'connected' && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE ON #{activeChannel}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Twitch Chat & Alert Speech Synthesizer
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Connect to any Twitch channel in real time. Read chat commands, Cheer Bits, and Subscriptions aloud with neural Gemini voices, anti-troll moderation, and direct OBS Studio overlay integration.
            </p>
          </div>

          {/* Quick Stats / State */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white'
              }`}
              title="Stream Emergency Mute"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{isMuted ? 'STREAM MUTED' : 'TTS ACTIVE'}</span>
            </button>

            <button
              onClick={copyOverlayLink}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              title="Copy OBS Browser Source URL"
            >
              {copiedOverlay ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedOverlay ? 'OBS Link Copied!' : 'Copy OBS Overlay'}</span>
            </button>
          </div>
        </div>

        {/* Channel Connect Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <form onSubmit={handleConnect} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 font-mono text-sm">
                twitch.tv/
              </span>
              <input
                type="text"
                placeholder="channel_name (e.g. shroud, your_channel)"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                className="w-full pl-26 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 focus:border-purple-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>

            {connectionStatus === 'connected' ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Disconnect #{activeChannel}
              </button>
            ) : (
              <button
                type="submit"
                disabled={connectionStatus === 'connecting'}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>{connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Twitch'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                showSettings ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Stream Configuration"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </form>

          {connError && (
            <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{connError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel (Collapsible) */}
      {showSettings && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-purple-400" />
              Stream TTS Engine Settings & Moderation
            </h3>
            <span className="text-xs text-slate-400">Settings apply immediately to incoming alerts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Command Trigger */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Chat Trigger Mode</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={config.commandPrefix}
                  onChange={(e) => setConfig({ ...config, commandPrefix: e.target.value })}
                  disabled={config.readAllChat}
                  placeholder="!tts"
                  className="w-24 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.readAllChat}
                    onChange={(e) => setConfig({ ...config, readAllChat: e.target.checked })}
                    className="accent-purple-500 rounded"
                  />
                  <span>Read all chat</span>
                </label>
              </div>
            </div>

            {/* Min Bits */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Min Bits for TTS</span>
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={config.minBits}
                onChange={(e) => setConfig({ ...config, minBits: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Alert Chime */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Pre-Alert Chime</label>
              <select
                value={config.soundAlert}
                onChange={(e) => setConfig({ ...config, soundAlert: e.target.value as TwitchAlertConfig['soundAlert'] })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="chime">Melodic Twin Chime</option>
                <option value="retro">8-Bit Coin Jump</option>
                <option value="cyber">Cyber Glitch Ping</option>
                <option value="ding">Classic Bell Ding</option>
                <option value="none">No Sound (Voice Only)</option>
              </select>
            </div>

            {/* Voice Tier Assignment */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Role-Based Voice</label>
              <label className="flex items-center gap-2 py-1 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.voiceByTier}
                  onChange={(e) => setConfig({ ...config, voiceByTier: e.target.checked })}
                  className="accent-purple-500 rounded"
                />
                <span>Auto-Voice (Subs=Puck, Bits=Fenrir, Mods=Charon)</span>
              </label>
            </div>
          </div>

          {/* Moderation Blacklist */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Anti-Troll Blacklist (Comma separated)</span>
              </label>
              <input
                type="text"
                value={bannedWordsInput}
                onChange={(e) => setBannedWordsInput(e.target.value)}
                placeholder="badword1, trollphrase, spam"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <label className="text-xs text-slate-400 font-medium">User Cooldown (Seconds)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.userCooldownSeconds}
                  onChange={(e) => setConfig({ ...config, userCooldownSeconds: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 flex-1">
                <label className="text-xs text-slate-400 font-medium">Max Char Length</label>
                <input
                  type="number"
                  min={20}
                  max={500}
                  value={config.maxCharacters}
                  onChange={(e) => setConfig({ ...config, maxCharacters: parseInt(e.target.value) || 180 })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Test Alerts Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Simulate Twitch Events:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => triggerTestAlert('bits')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Test 500 Bits Cheer</span>
          </button>

          <button
            onClick={() => triggerTestAlert('sub')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-purple-400" />
            <span>Test Sub Alert</span>
          </button>

          <button
            onClick={() => triggerTestAlert('chat')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Test !tts Chat Command</span>
          </button>
        </div>
      </div>

      {/* Main Stream Queue & Active Player Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Queue & Active Speaking Alert */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Speaking Box */}
          {currentPlaying ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950/90 to-slate-900 border border-purple-500/50 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    NOW PLAYING ON STREAM
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-mono">
                    Voice: {currentPlaying.voiceUsed || 'Puck'}
                  </span>
                  <button
                    onClick={handleSkipCurrent}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Skip</span>
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-base font-semibold text-white flex items-center gap-2">
                  <span>{currentPlaying.username}</span>
                  {currentPlaying.type === 'bits' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono border border-amber-500/30">
                      💎 {currentPlaying.bitsAmount} Bits
                    </span>
                  )}
                  {currentPlaying.type === 'sub' && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono border border-purple-500/30">
                      ⭐ Subscriber
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-purple-100 italic bg-purple-950/40 p-3 rounded-xl border border-purple-800/30">
                  "{currentPlaying.message}"
                </p>
              </div>

              {currentPlaying.audioUrl && (
                <AudioPlayerBar
                  audioUrl={currentPlaying.audioUrl}
                  text={currentPlaying.message}
                  voiceName={currentPlaying.voiceUsed}
                  onEnded={() => {
                    setCurrentPlaying(null);
                  }}
                  accentColor="#A855F7"
                />
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
              <Tv className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-slate-300">Live TTS Stream Standby</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {connectionStatus === 'connected'
                  ? `Listening to #${activeChannel}... Send a chat with "!tts <message>" or cheer bits to trigger the engine.`
                  : 'Connect your Twitch channel above or click one of the test buttons to see the alert engine in action.'}
              </p>
            </div>
          )}

          {/* Queue List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Stream TTS Queue</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                  {queue.length} items
                </span>
              </div>

              {queue.length > 0 && (
                <button
                  onClick={handleClearQueue}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Queue</span>
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">Queue is currently empty.</div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                      item.status === 'playing'
                        ? 'bg-purple-950/40 border-purple-500/50 text-white'
                        : item.status === 'pending'
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                        : 'bg-slate-950/30 border-slate-900 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-600" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-medium truncate">
                          <span className="text-white">{item.username}</span>
                          {item.bitsAmount && (
                            <span className="text-amber-400 font-mono text-[11px]">
                              ({item.bitsAmount} bits)
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 truncate">{item.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          item.status === 'playing'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.status === 'synthesizing'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : item.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: OBS Setup Guide & Voice Tier Overview */}
        <div className="space-y-5">
          {/* OBS Studio Integration Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Tv className="w-4 h-4 text-purple-400" />
              <span>How to add to OBS Studio</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Display live talking avatars, captions, and speech waveforms right inside your broadcast.
            </p>

            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <li>In OBS Studio, click <strong className="text-purple-300">+ Add Source</strong></li>
              <li>Select <strong className="text-purple-300">Browser Source</strong></li>
              <li>Paste the URL below</li>
              <li>Set Width: <code className="text-cyan-300 font-mono">600</code>, Height: <code className="text-cyan-300 font-mono">240</code></li>
              <li>Check <strong className="text-purple-300">"Control audio via OBS"</strong></li>
            </ol>

            <div className="pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={overlayUrl}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-purple-300 select-all focus:outline-none"
                />
                <button
                  onClick={copyOverlayLink}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex-shrink-0"
                >
                  {copiedOverlay ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Voice Personality Mapping */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Twitch Tier Voice Assignment
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-200">Cheer 500+ Bits</span>
                </div>
                <span className="font-mono text-amber-400">Fenrir (Intense/Gritty)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-200">Subscribers</span>
                </div>
                <span className="font-mono text-purple-400">Puck (Youthful/Energetic)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span className="text-slate-200">Mods & Broadcaster</span>
                </div>
                <span className="font-mono text-rose-400">Charon (Deep/Cinematic)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-200">Standard Chat</span>
                </div>
                <span className="font-mono text-cyan-400">Kore (Clear/Warm)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
