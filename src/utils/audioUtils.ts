// Audio context and sound synthesizer utilities for TTS and Twitch alerts

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function base64ToBlobUrl(base64: string, mimeType = 'audio/wav'): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

// Generate built-in stream sound chimes (synthesized via Web Audio oscillators)
export function playAlertChime(type: 'chime' | 'retro' | 'cyber' | 'ding' | 'none'): Promise<void> {
  if (type === 'none') return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.25, now);
      masterGain.connect(ctx.destination);

      if (type === 'chime') {
        // Melodic twin chime (C6 - G6)
        const notes = [1046.5, 1567.98];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          noteGain.gain.setValueAtTime(0, now + idx * 0.12);
          noteGain.gain.linearRampToValueAtTime(0.4, now + idx * 0.12 + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

          osc.connect(noteGain);
          noteGain.connect(masterGain);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.45);
        });
        setTimeout(resolve, 550);
      } else if (type === 'retro') {
        // 8-bit coin jump (B5 -> E6)
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.setValueAtTime(1318.51, now + 0.08);

        noteGain.gain.setValueAtTime(0.2, now);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
        setTimeout(resolve, 400);
      } else if (type === 'cyber') {
        // Cyber glitch ping
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const noteGain = ctx.createGain();

        osc.type = 'sawtooth';
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.setValueAtTime(8, now);

        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

        noteGain.gain.setValueAtTime(0.3, now);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
        setTimeout(resolve, 350);
      } else if (type === 'ding') {
        // Bell ding
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, now);

        noteGain.gain.setValueAtTime(0.4, now);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.6);
        setTimeout(resolve, 650);
      } else {
        resolve();
      }
    } catch (e) {
      console.warn('Audio chime playback error:', e);
      resolve();
    }
  });
}

// Fallback browser Web Speech API synthesis for offline / instant testing
export function synthesizeWithWebSpeech(
  text: string,
  options?: { rate?: number; pitch?: number; voiceName?: string; onEnd?: () => void }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Web Speech API not supported in this browser.'));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (options?.rate) utterance.rate = options.rate;
    if (options?.pitch) utterance.pitch = options.pitch;

    if (options?.voiceName) {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.name.toLowerCase().includes(options.voiceName!.toLowerCase()));
      if (match) utterance.voice = match;
    }

    utterance.onend = () => {
      options?.onEnd?.();
      resolve();
    };

    utterance.onerror = (e) => {
      reject(e);
    };

    window.speechSynthesis.speak(utterance);
  });
}
