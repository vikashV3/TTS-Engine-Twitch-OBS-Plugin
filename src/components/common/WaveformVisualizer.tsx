import React, { useEffect, useRef } from 'react';
import { getAudioContext } from '../../utils/audioUtils';

interface WaveformVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  accentColor?: string;
  height?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioElement,
  isPlaying,
  accentColor = '#06B6D4',
  height = 96,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    try {
      const ctx = getAudioContext();
      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
      }

      // MediaElementSource can only be created once per element
      if (!sourceNodeRef.current && (audioElement as unknown as { __hasSourceNode?: boolean }).__hasSourceNode !== true) {
        try {
          const source = ctx.createMediaElementSource(audioElement);
          source.connect(analyserRef.current);
          analyserRef.current.connect(ctx.destination);
          sourceNodeRef.current = source;
          (audioElement as unknown as { __hasSourceNode: boolean }).__hasSourceNode = true;
        } catch {
          // Source already connected
        }
      }
    } catch (e) {
      console.warn('Audio analyzer connection error:', e);
    }
  }, [audioElement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const h = canvas.height;

      ctx2d.clearRect(0, 0, width, h);

      if (isPlaying && analyser) {
        analyser.getByteFrequencyData(dataArray);

        // Draw frequency bars & mirrored wave
        const barCount = 48;
        const barWidth = (width / barCount) * 0.7;
        const gap = (width / barCount) * 0.3;

        for (let i = 0; i < barCount; i++) {
          const index = Math.floor((i / barCount) * (bufferLength * 0.65));
          const val = dataArray[index] || 10;
          const percent = val / 255;
          const barHeight = Math.max(4, percent * (h * 0.85));

          const x = i * (barWidth + gap) + gap / 2;
          const y = (h - barHeight) / 2;

          const gradient = ctx2d.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, accentColor);
          gradient.addColorStop(0.5, '#A855F7');
          gradient.addColorStop(1, '#3B82F6');

          ctx2d.fillStyle = gradient;
          ctx2d.beginPath();
          ctx2d.roundRect(x, y, barWidth, barHeight, 3);
          ctx2d.fill();
        }
      } else {
        // Idle ambient subtle pulse wave
        const time = Date.now() * 0.002;
        const barCount = 48;
        const barWidth = (width / barCount) * 0.7;
        const gap = (width / barCount) * 0.3;

        for (let i = 0; i < barCount; i++) {
          const base = Math.sin(time + i * 0.25) * 0.5 + 0.5;
          const barHeight = 4 + base * 12;
          const x = i * (barWidth + gap) + gap / 2;
          const y = (h - barHeight) / 2;

          ctx2d.fillStyle = 'rgba(148, 163, 184, 0.25)';
          ctx2d.beginPath();
          ctx2d.roundRect(x, y, barWidth, barHeight, 2);
          ctx2d.fill();
        }
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, accentColor]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800/80 p-2 shadow-inner">
      <canvas
        ref={canvasRef}
        width={640}
        height={height}
        className="w-full h-full block"
        style={{ height: `${height}px` }}
      />
      {isPlaying && (
        <div className="absolute top-2 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          ACTIVE AUDIO STREAM
        </div>
      )}
    </div>
  );
};
