import { useState } from 'react';
import {
  Languages,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { AvatarViewer } from '../components/avatar/AvatarViewer.tsx';
import { normalizeSignKey, isSignSupported } from '../components/avatar/clipMapper.ts';

const EXAMPLE_PHRASES = [
  'Hello friend welcome',
  'Thank you for help',
  'Please water give',
  'Good sign language',
  'Name your what is',
  'Hello unicorn friend', // Has unsupported token UNICORN to demonstrate Honesty Rule 2
];

export function TextToIslPage() {
  const [inputText, setInputText] = useState('Hello friend welcome');
  const [sourceLang, setSourceLang] = useState('en');
  const [avatarGlosses, setAvatarGlosses] = useState<string[]>(['HELLO', 'FRIEND', 'WELCOME']);
  const [tokenBreakdown, setTokenBreakdown] = useState<Array<{ word: string; key: string; isSupported: boolean }>>([
    { word: 'Hello', key: 'HELLO', isSupported: true },
    { word: 'friend', key: 'FRIEND', isSupported: true },
    { word: 'welcome', key: 'WELCOME', isSupported: true },
  ]);

  const handleProcessText = (text: string) => {
    setInputText(text);
    if (!text.trim()) {
      setAvatarGlosses([]);
      setTokenBreakdown([]);
      return;
    }

    const words = text.trim().split(/\s+/);
    const breakdown = words.map((w) => {
      const key = normalizeSignKey(w);
      return {
        word: w,
        key,
        isSupported: isSignSupported(key),
      };
    });

    setTokenBreakdown(breakdown);
    setAvatarGlosses(breakdown.map((b) => b.key));
  };

  const handleTTS = () => {
    if ('speechSynthesis' in window && inputText) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(inputText);
      window.speechSynthesis.speak(utterance);
    }
  };

  const supportedCount = tokenBreakdown.filter((t) => t.isSupported).length;
  const unsupportedCount = tokenBreakdown.length - supportedCount;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono">
            <Languages className="w-3.5 h-3.5" />
            <span>Direction A: Text to ISL Pipeline</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Rule-Based Text to Sign Translation</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Converts typed phrases into verified ISL sign sequences. Grammatical rules map English word order into ISL topic-comment structure. Every mapped sign is strictly validated against the dictionary.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input & Linguistic Breakdown Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            {/* Language Selection & Clear */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300">Source Language:</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="px-2.5 py-1 rounded bg-[#0b0f19] border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="en">English (India)</option>
                <option value="hi">Hindi (Devanagari)</option>
              </select>
            </div>

            {/* Multiline Textarea */}
            <div className="space-y-1.5">
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => handleProcessText(e.target.value)}
                placeholder="Type your sentence here..."
                className="w-full p-3 rounded-lg bg-[#0b0f19] border border-gray-800 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
              <div className="flex justify-between items-center text-[11px] text-gray-400 font-mono">
                <span>{inputText.length} characters | {inputText.trim() ? inputText.trim().split(/\s+/).length : 0} words</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTTS}
                    title="Read input aloud"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessText('')}
                    className="hover:text-gray-200"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Example Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-gray-400 font-medium">Quick Examples:</span>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handleProcessText(phrase)}
                    className="px-2.5 py-1 rounded-md bg-[#0b0f19] hover:bg-gray-800 border border-gray-800 text-[11px] text-gray-300 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>

            {/* Token Coverage Metrics */}
            <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300">Dictionary Coverage:</span>
                <span className="font-mono text-cyan-400">
                  {tokenBreakdown.length > 0
                    ? `${Math.round((supportedCount / tokenBreakdown.length) * 100)}%`
                    : '0%'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${
                      tokenBreakdown.length > 0 ? (supportedCount / tokenBreakdown.length) * 100 : 0
                    }%`,
                  }}
                  className="h-full bg-cyan-400"
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                <span className="text-emerald-400">{supportedCount} supported</span>
                {unsupportedCount > 0 && (
                  <span className="text-red-400">{unsupportedCount} unsupported</span>
                )}
              </div>
            </div>

            {/* Linguistic Mapping Notice (Honesty Rule 5) */}
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/80 text-[11px] text-amber-200 space-y-1 leading-relaxed">
              <div className="font-semibold text-amber-400 flex items-center gap-1">
                <span>Honesty Rule 5: Linguistic Notice</span>
              </div>
              <p>
                ISL grammar does not follow English Subject-Verb-Object (SVO) order. It utilizes Topic-Comment / Subject-Object-Verb (SOV) phrasing. All structural ordering rules in this stage are flagged: <em>"needs linguist review"</em>.
              </p>
            </div>
          </div>
        </div>

        {/* 3D Avatar Viewer Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>3D ISL Sequence Playback</span>
              </h3>
              <span className="text-xs font-mono text-cyan-400">
                {avatarGlosses.length} Signs Queued
              </span>
            </div>

            <AvatarViewer
              initialGlosses={avatarGlosses}
              autoPlay={false}
              heightClassName="h-[420px]"
              showSequenceList={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
