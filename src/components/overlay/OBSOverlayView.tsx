import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Coins, Crown, MessageSquare, Sparkles } from 'lucide-react';
import { twitchClient, ParsedTwitchMessage } from '../../services/twitchIrcService';
import { synthesizeTTS } from '../../services/ttsService';
import { playAlertChime } from '../../utils/audioUtils';

interface OBSOverlayViewProps {
  channelName?: string;
}

export const OBSOverlayView: React.FC<OBSOverlayViewProps> = ({ channelName = '' }) => {
  const [activeAlert, setActiveAlert] = useState<{
    id: string;
    username: string;
    message: string;
    type: 'chat' | 'bits' | 'sub';
    bitsAmount?: number;
    voice: string;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Array<{
    username: string;
    message: string;
    type: 'chat' | 'bits' | 'sub';
    bitsAmount?: number;
    voice: string;
  }>>([]);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Ensure transparent background for OBS browser source
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    const audio = new Audio();
    audio.onended = () => {
      setIsPlaying(false);
      setTimeout(() => {
        setActiveAlert(null);
        isProcessingRef.current = false;
        processNextInQueue();
      }, 1000);
    };
    audioRef.current = audio;

    const channel = channelName.trim().toLowerCase();
    if (channel && channel !== 'stream') {
      twitchClient.connect(channel);
    }

    const unsubMsg = twitchClient.onMessage((msg: ParsedTwitchMessage) => {
      let isEligible = false;
      let text = msg.message.trim();
      let type: 'chat' | 'bits' | 'sub' = 'chat';

      if (msg.bits && msg.bits >= 50) {
        isEligible = true;
        type = 'bits';
        text = text.replace(/Cheer\d+/gi, '').trim() || 'Cheered bits!';
      } else if (text.toLowerCase().startsWith('!tts')) {
        isEligible = true;
        text = text.slice(4).trim();
      }

      if (!isEligible || !text) return;

      let voice = 'Puck';
      if (type === 'bits' && msg.bits && msg.bits >= 500) voice = 'Fenrir';
      else if (msg.isMod || msg.isBroadcaster) voice = 'Charon';

      queueRef.current.push({
        username: msg.displayName || msg.username,
        message: text,
        type,
        bitsAmount: msg.bits,
        voice,
      });

      processNextInQueue();
    });

    return () => {
      unsubMsg();
      twitchClient.disconnect();
    };
  }, [channelName]);

  const processNextInQueue = async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;
    isProcessingRef.current = true;

    const item = queueRef.current.shift();
    if (!item) {
      isProcessingRef.current = false;
      return;
    }

    setActiveAlert({ ...item, id: `obs-${Date.now()}` });
    setIsPlaying(true);

    try {
      await playAlertChime('chime');
      const speechText = `${item.username} says: ${item.message}`;
      const res = await synthesizeTTS({
        text: speechText,
        voice: item.voice,
        model: 'gemini-3.8-flash-lite-tts',
        style: 'Enthusiastic and clear Twitch stream alert',
      });

      if (audioRef.current && res.audioUrl) {
        audioRef.current.src = res.audioUrl;
        await audioRef.current.play();
      } else {
        throw new Error('No audio returned');
      }
    } catch (e) {
      console.warn('OBS overlay TTS error:', e);
      setIsPlaying(false);
      setActiveAlert(null);
      isProcessingRef.current = false;
      processNextInQueue();
    }
  };

  // Test button inside OBS preview (or keyboard shortcut 'T')
  const testAlert = () => {
    queueRef.current.push({
      username: 'TwitchViewer',
      message: 'GG streamer! That was an incredible 1v4 clutch play!',
      type: 'bits',
      bitsAmount: 250,
      voice: 'Puck',
    });
    processNextInQueue();
  };

  return (
    <div className="relative w-full h-full min-h-[220px] flex items-center justify-center p-4 bg-transparent select-none overflow-hidden font-sans">
      {activeAlert ? (
        <div className="flex items-center gap-4 max-w-xl w-full p-4 rounded-2xl bg-slate-950/90 border border-purple-500/50 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
          {/* Avatar with pulsing speech glow */}
          <div className="relative flex-shrink-0">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg ${isPlaying ? 'ring-4 ring-purple-400 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''}`}>
              {activeAlert.type === 'bits' ? (
                <Coins className="w-7 h-7 text-amber-300" />
              ) : activeAlert.type === 'sub' ? (
                <Crown className="w-7 h-7 text-purple-200" />
              ) : (
                <MessageSquare className="w-7 h-7 text-cyan-200" />
              )}
            </div>
            {isPlaying && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-slate-950" />
              </span>
            )}
          </div>

          {/* Text and speech captions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-white text-base tracking-wide truncate">
                {activeAlert.username}
              </span>
              {activeAlert.bitsAmount && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold">
                  💎 {activeAlert.bitsAmount} Bits
                </span>
              )}
              <span className="text-[10px] text-purple-400 font-mono ml-auto">
                TTS ({activeAlert.voice})
              </span>
            </div>

            <p className="text-sm font-medium text-purple-100 leading-snug line-clamp-3">
              "{activeAlert.message}"
            </p>

            {/* Speaking visualizer bars */}
            {isPlaying && (
              <div className="flex items-center gap-1 mt-2">
                {[...Array(16)].map((_, i) => (
                  <span
                    key={i}
                    className="w-1 bg-gradient-to-t from-purple-500 to-cyan-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.max(4, Math.sin(i * 0.8) * 16 + 6)}px`,
                      animationDelay: `${(i % 5) * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/40 border border-slate-800/40 text-slate-400 hover:text-white transition-opacity text-xs opacity-40 hover:opacity-100 cursor-pointer" onClick={testAlert}>
          <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          <span>OBS Overlay Active: #{channelName || 'stream'} (Click to Test)</span>
        </div>
      )}
    </div>
  );
};
