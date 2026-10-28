import React, { useState } from 'react';
import {
  Users,
  Sparkles,
  Play,
  Plus,
  Trash2,
  Wand2,
  Download,
  Flame,
  MessageSquare,
  Volume2
} from 'lucide-react';
import { VoiceProfile, DialogueTurn, AudioHistoryItem } from '../../types/tts';
import { DEFAULT_VOICES, synthesizeDialogue, enhanceScriptWithAI } from '../../services/ttsService';
import { AudioPlayerBar } from '../studio/AudioPlayerBar';

interface DialogueStudioProps {
  voices: VoiceProfile[];
  onAddHistory?: (item: AudioHistoryItem) => void;
}

const SAMPLE_DIALOGUES = [
  {
    title: 'Twitch Co-Streamers Post-Match Review',
    speakers: [
      { name: 'Alex', voice: 'Puck' },
      { name: 'Sam', voice: 'Kore' },
    ],
    turns: [
      {
        id: '1',
        speaker: 'Alex',
        text: 'Sam, <breath> did you see that final circle rotation? I honestly thought we were completely wiped!',
        voice: 'Puck',
        style: 'Excited gamer, adrenaline pumping',
      },
      {
        id: '2',
        speaker: 'Sam',
        text: 'That was absurd! |yeah| Chat was literally spamming PogChamp for three minutes straight. <laugh>',
        voice: 'Kore',
        style: 'Laughing, energetic co-host',
      },
      {
        id: '3',
        speaker: 'Alex',
        text: 'And then you hit that sniper shot through smoke? <gasp> Clip of the year, hands down!',
        voice: 'Puck',
        style: 'Hyped and animated',
      },
      {
        id: '4',
        speaker: 'Sam',
        text: 'Pure muscle memory, |mhm| but we definitely take those! Ready to queue up for round two?',
        voice: 'Kore',
        style: 'Confident, smiling delivery',
      },
    ],
  },
  {
    title: 'Sci-Fi Space Commander & Pilot',
    speakers: [
      { name: 'Commander', voice: 'Charon' },
      { name: 'Pilot', voice: 'Zephyr' },
    ],
    turns: [
      {
        id: '1',
        speaker: 'Commander',
        text: 'Pilot, status report on the warp manifold. We cannot afford another fluctuation.',
        voice: 'Charon',
        style: 'Authoritative, calm under pressure',
      },
      {
        id: '2',
        speaker: 'Pilot',
        text: 'Stabilizers are holding at ninety percent, Commander. <breath> Coordinates locked for hyperspace jump.',
        voice: 'Zephyr',
        style: 'Cool, focused flight technician',
      },
      {
        id: '3',
        speaker: 'Commander',
        text: 'Initiate sequence on my mark. Three... two... engage.',
        voice: 'Charon',
        style: 'Commanding and solemn',
      },
    ],
  },
];

export const DialogueStudio: React.FC<DialogueStudioProps> = ({ voices = DEFAULT_VOICES, onAddHistory }) => {
  const [speakers, setSpeakers] = useState([
    { name: 'Alex', voice: 'Puck' },
    { name: 'Sam', voice: 'Kore' },
  ]);

  const [turns, setTurns] = useState<DialogueTurn[]>(SAMPLE_DIALOGUES[0].turns);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [promptTopic, setPromptTopic] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [latestAudio, setLatestAudio] = useState<{
    audioUrl: string;
    duration: number;
    byteSize: number;
  } | null>(null);

  const addTurn = (speakerName: string) => {
    const speaker = speakers.find((s) => s.name === speakerName) || speakers[0];
    const newTurn: DialogueTurn = {
      id: `turn-${Date.now()}`,
      speaker: speaker.name,
      text: '',
      voice: speaker.voice,
      style: 'Natural conversational acting',
    };
    setTurns([...turns, newTurn]);
  };

  const removeTurn = (id: string) => {
    setTurns(turns.filter((t) => t.id !== id));
  };

  const updateTurn = (id: string, updates: Partial<DialogueTurn>) => {
    setTurns(turns.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleSynthesize = async () => {
    if (turns.length === 0 || turns.some((t) => !t.text.trim())) {
      setErrorMessage('Please ensure all dialogue lines have text content.');
      return;
    }

    setIsSynthesizing(true);
    setErrorMessage(null);

    try {
      const res = await synthesizeDialogue(speakers, turns);
      setLatestAudio(res);

      if (onAddHistory) {
        onAddHistory({
          id: `hist-dialogue-${Date.now()}`,
          text: turns.map((t) => `${t.speaker}: ${t.text}`).join('\n'),
          voice: `${speakers[0].name} & ${speakers[1].name}`,
          model: 'gemini-3.8-flash-tts',
          duration: res.duration,
          timestamp: Date.now(),
          audioUrl: res.audioUrl,
          source: 'dialogue',
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Dialogue synthesis failed.';
      setErrorMessage(msg);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleGenerateAIScript = async () => {
    if (!promptTopic.trim()) return;
    setIsGeneratingScript(true);
    try {
      const prompt = `Write a lively 4-line script between ${speakers[0].name} and ${speakers[1].name} about: "${promptTopic}". Include vocal bursts like <laugh>, <breath> and backchannels like |yeah|.`;
      const script = await enhanceScriptWithAI(prompt, 'Lively multi-speaker dialogue', 'dialogue');

      // Parse lines
      const lines = script.split('\n').filter((l) => l.includes(':'));
      if (lines.length >= 2) {
        const parsedTurns: DialogueTurn[] = lines.slice(0, 6).map((line, idx) => {
          const colonIdx = line.indexOf(':');
          const spk = idx % 2 === 0 ? speakers[0].name : speakers[1].name;
          const txt = line.slice(colonIdx + 1).trim();
          return {
            id: `turn-${Date.now()}-${idx}`,
            speaker: spk,
            text: txt,
            voice: idx % 2 === 0 ? speakers[0].voice : speakers[1].voice,
            style: 'Expressive and engaging',
          };
        });
        setTurns(parsedTurns);
      }
    } catch (e) {
      console.warn('Dialogue AI error:', e);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dialogue Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Users className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Dual-Speaker Dialogue & Screenplay Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Produce rich multi-speaker scenes powered by <span className="text-purple-300 font-mono">gemini-3.8-flash-tts</span> with backchanneling and vocal bursts.
          </p>
        </div>

        {/* Template Selectors */}
        <div className="flex flex-wrap gap-2">
          {SAMPLE_DIALOGUES.map((s) => (
            <button
              key={s.title}
              onClick={() => {
                setSpeakers(s.speakers);
                setTurns(s.turns);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition-colors cursor-pointer"
            >
              Load: {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Speaker Configuration Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {speakers.map((spk, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                {spk.name[0]}
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold">
                  Speaker {idx + 1}
                </label>
                <input
                  type="text"
                  value={spk.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setSpeakers(
                      speakers.map((s, i) => (i === idx ? { ...s, name: newName } : s))
                    );
                  }}
                  className="w-28 text-sm font-bold text-white bg-transparent border-b border-slate-700 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="text-right">
              <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Assigned Voice
              </label>
              <select
                value={spk.voice}
                onChange={(e) => {
                  const newVoice = e.target.value;
                  setSpeakers(
                    speakers.map((s, i) => (i === idx ? { ...s, voice: newVoice } : s))
                  );
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.gender})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* AI Screenplay Writer */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/40">
        <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
        <input
          type="text"
          value={promptTopic}
          onChange={(e) => setPromptTopic(e.target.value)}
          placeholder="AI Screenwriter: Type a topic (e.g. Discussing the new Twitch stream game update)..."
          className="flex-1 bg-transparent text-xs text-white placeholder-purple-300/50 focus:outline-none"
        />
        <button
          onClick={handleGenerateAIScript}
          disabled={isGeneratingScript || !promptTopic.trim()}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
        >
          <Wand2 className={`w-3.5 h-3.5 ${isGeneratingScript ? 'animate-spin' : ''}`} />
          <span>Generate Script</span>
        </button>
      </div>

      {/* Turns Timeline Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Screenplay Timeline ({turns.length} turns)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addTurn(speakers[0].name)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ {speakers[0].name}</span>
            </button>
            <button
              onClick={() => addTurn(speakers[1].name)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ {speakers[1].name}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {turns.map((turn, idx) => {
            const isSpeaker1 = turn.speaker === speakers[0].name;
            return (
              <div
                key={turn.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isSpeaker1
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-purple-950/20 border-purple-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                        isSpeaker1
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {turn.speaker}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Turn #{idx + 1})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={turn.style || ''}
                      onChange={(e) => updateTurn(turn.id, { style: e.target.value })}
                      placeholder="Acting direction (e.g. Laughing, Excited)"
                      className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none w-48"
                    />
                    <button
                      onClick={() => removeTurn(turn.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                      title="Delete turn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  value={turn.text}
                  onChange={(e) => updateTurn(turn.id, { text: e.target.value })}
                  placeholder={`What does ${turn.speaker} say?`}
                  rows={2}
                  className="w-full bg-slate-950/80 border border-slate-800/80 focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none resize-none font-sans"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Synthesize Button */}
      <button
        onClick={handleSynthesize}
        disabled={isSynthesizing || turns.length === 0}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 text-white font-bold text-sm tracking-wide shadow-xl shadow-purple-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
      >
        {isSynthesizing ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Rendering Multi-Speaker Audio Scene...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>Synthesize Dialogue Scene ({turns.length} turns)</span>
          </>
        )}
      </button>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {/* Active Dialogue Result */}
      {latestAudio && (
        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-purple-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Dialogue Scene Generated ({speakers[0].name} & {speakers[1].name})
            </span>
            <span className="font-mono text-[11px]">{latestAudio.duration}s</span>
          </div>
          <AudioPlayerBar
            audioUrl={latestAudio.audioUrl}
            text={`Dialogue between ${speakers[0].name} and ${speakers[1].name}`}
            duration={latestAudio.duration}
            byteSize={latestAudio.byteSize}
            accentColor="#A855F7"
          />
        </div>
      )}
    </div>
  );
};
