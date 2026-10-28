import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, Disc3, Gauge } from 'lucide-react';
import { WaveformVisualizer } from '../common/WaveformVisualizer';

interface AudioPlayerBarProps {
  audioUrl: string | null;
  text?: string;
  voiceName?: string;
  duration?: number;
  byteSize?: number;
  onEnded?: () => void;
  accentColor?: string;
  compact?: boolean;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  audioUrl,
  text,
  voiceName = 'Kore',
  duration = 0,
  byteSize = 0,
  onEnded,
  accentColor = '#06B6D4',
  compact = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      setTotalDuration(duration);
    }
  }, [duration]);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load();
      audioRef.current.playbackRate = speed;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.loop = isLooping;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => console.warn(err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setTotalDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    onEnded?.();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val === 0) setIsMuted(true);
    else if (isMuted) setIsMuted(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const downloadWav = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    const sanitizedText = (text || 'speech').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `voxcraft_${voiceName.toLowerCase()}_${sanitizedText}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  if (!audioUrl) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Visualizer */}
      {!compact && (
        <div className="mb-4">
          <WaveformVisualizer
            audioElement={audioRef.current}
            isPlaying={isPlaying}
            accentColor={accentColor}
            height={72}
          />
        </div>
      )}

      {/* Scrubber */}
      <div className="space-y-1 mb-3">
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />
        </div>
        <div className="flex justify-between items-center text-xs font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">24kHz • 16-bit PCM WAV</span>
            {byteSize > 0 && (
              <span className="text-[11px] text-slate-500">({Math.round(byteSize / 1024)} KB)</span>
            )}
          </div>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        {/* Play / Pause / Replay */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
                setIsPlaying(true);
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Restart playback"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsLooping(!isLooping);
              if (audioRef.current) audioRef.current.loop = !isLooping;
            }}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLooping ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Toggle Loop"
          >
            <Disc3 className="w-4 h-4" />
          </button>
        </div>

        {/* Speed / Volume / Export */}
        <div className="flex items-center gap-3">
          <button
            onClick={cycleSpeed}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
            title="Playback Speed"
          >
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>{speed}x</span>
          </button>

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Download WAV button */}
          <button
            onClick={downloadWav}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-all cursor-pointer shadow-sm"
            title="Download uncompressed WAV file"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export WAV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
