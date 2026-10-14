import { useState, useEffect } from 'react';
import {
  AlertCircle,
  ClipboardPaste,
  Languages,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AvatarViewer } from '../components/avatar/AvatarViewer.tsx';
import { LinguisticBreakdown } from '../components/translation/LinguisticBreakdown.tsx';
import { TranslationFeedbackModal } from '../components/translation/TranslationFeedbackModal.tsx';
import {
  translateText,
  type GrammarRuleApplied,
  type TranslationSegment,
  type CoverageMetrics,
} from '../api/translation.ts';

const EXAMPLE_PHRASES_EN = [
  'Hello friend welcome',
  'Thank you for help',
  'What is your name',
  'I want water',
  'I will drink water tomorrow',
  'Hello unicorn friend', // Has unsupported token UNICORN to demonstrate Honesty Rule 2
];

const EXAMPLE_PHRASES_HI = [
  'नमस्ते दोस्त स्वागत',
  'धन्यवाद सहायता',
  'कृपया पानी',
  'अच्छा मित्र',
];

export function TextToIslPage() {
  const [inputText, setInputText] = useState('Hello friend welcome');
  const [sourceLang, setSourceLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Translation result state
  const [translationId, setTranslationId] = useState<string | null>(null);
  const [avatarGlosses, setAvatarGlosses] = useState<string[]>(['HELLO', 'FRIEND', 'WELCOME']);
  const [normalizedTokens, setNormalizedTokens] = useState<string[]>(['hello', 'friend', 'welcome']);
  const [grammarRules, setGrammarRules] = useState<GrammarRuleApplied[]>([]);
  const [segments, setSegments] = useState<TranslationSegment[]>([
    {
      sequence_order: 0,
      source_token: 'hello',
      gloss: 'HELLO',
      sign_id: 'seed-hello',
      is_supported: true,
      duration_ms: 1000,
      timestamp_start_ms: 0,
      timestamp_end_ms: 1000,
    },
    {
      sequence_order: 1,
      source_token: 'friend',
      gloss: 'FRIEND',
      sign_id: 'seed-friend',
      is_supported: true,
      duration_ms: 1000,
      timestamp_start_ms: 1000,
      timestamp_end_ms: 2000,
    },
    {
      sequence_order: 2,
      source_token: 'welcome',
      gloss: 'WELCOME',
      sign_id: 'seed-welcome',
      is_supported: true,
      duration_ms: 1000,
      timestamp_start_ms: 2000,
      timestamp_end_ms: 3000,
    },
  ]);
  const [coverage, setCoverage] = useState<CoverageMetrics>({
    total_tokens: 3,
    supported_tokens: 3,
    unsupported_tokens: [],
    coverage_percentage: 100,
  });

  // Feedback modal state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // TTS audio state
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleTranslate = async (overrideText?: string, overrideLang?: string) => {
    const textToProcess = (overrideText !== undefined ? overrideText : inputText).trim();
    const langToProcess = overrideLang || sourceLang;

    if (!textToProcess) {
      setErrorMessage('Please enter text to translate.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await translateText({
        text: textToProcess,
        source_language: langToProcess,
        save_history: true,
      });

      setTranslationId(response.translation_id);
      setAvatarGlosses(response.reordered_glosses);
      setNormalizedTokens(response.normalized_tokens);
      setGrammarRules(response.grammar_rules_applied);
      setSegments(response.segments);
      setCoverage(response.coverage);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Translation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial translation on mount
  useEffect(() => {
    handleTranslate('Hello friend welcome', 'en');
  }, []);

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setInputText(clipboardText);
      }
    } catch {
      // Clipboard access may be restricted
    }
  };

  const handleTTS = () => {
    if (!('speechSynthesis' in window) || !inputText.trim()) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(inputText);
    utterance.lang = sourceLang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;
  const examplePhrases = sourceLang === 'hi' ? EXAMPLE_PHRASES_HI : EXAMPLE_PHRASES_EN;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono">
            <Languages className="w-3.5 h-3.5" />
            <span>Direction A: Text to ISL Translation Pipeline</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Rule-Based Text to Sign Translation</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Translates English and Hindi text into ordered Indian Sign Language (ISL) gloss sequences.
            Constituent ordering applies documented ISL grammatical rules (Time-first, SOV, Negation-final)
            flagged <em>"needs linguist review"</em>. Every mapped sign is strictly verified against the dictionary.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input, Controls & Metrics */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            {/* Language Selection & Clear */}
            <div className="flex items-center justify-between">
              <label htmlFor="source-lang-select" className="text-xs font-semibold text-gray-300">
                Source Language:
              </label>
              <select
                id="source-lang-select"
                value={sourceLang}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setSourceLang(newLang);
                  const firstEx = newLang === 'hi' ? EXAMPLE_PHRASES_HI[0] : EXAMPLE_PHRASES_EN[0];
                  setInputText(firstEx);
                  handleTranslate(firstEx, newLang);
                }}
                className="px-2.5 py-1 rounded bg-[#0b0f19] border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="en">English (India)</option>
                <option value="hi">Hindi (हिन्दी)</option>
              </select>
            </div>

            {/* Multiline Textarea */}
            <div className="space-y-1.5">
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  sourceLang === 'hi'
                    ? 'यहाँ अपना वाक्य लिखें (जैसे: नमस्ते दोस्त स्वागत)...'
                    : 'Type your sentence here (e.g. Hello friend welcome)...'
                }
                className="w-full p-3 rounded-lg bg-[#0b0f19] border border-gray-800 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-sans"
              />

              {/* Character/Word Counts & Text Actions */}
              <div className="flex justify-between items-center text-[11px] text-gray-400 font-mono">
                <span>
                  {charCount} characters | {wordCount} words
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePaste}
                    title="Paste from clipboard"
                    className="hover:text-cyan-400 transition-colors flex items-center gap-1"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTTS}
                    title={isSpeaking ? 'Stop speaking' : 'Read input aloud via TTS'}
                    className="hover:text-cyan-400 transition-colors flex items-center gap-1"
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>TTS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputText('');
                      setErrorMessage(null);
                    }}
                    className="hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-800 p-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Translation Button */}
            <button
              type="button"
              disabled={isLoading || !inputText.trim()}
              onClick={() => handleTranslate()}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processing ISL Linguistic Rules...</span>
                </>
              ) : (
                <>
                  <span>Translate to ISL</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Example Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-gray-400 font-medium">Quick Examples:</span>
              <div className="flex flex-wrap gap-1.5">
                {examplePhrases.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => {
                      setInputText(phrase);
                      handleTranslate(phrase);
                    }}
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
                <span className="font-mono text-cyan-400">{coverage.coverage_percentage}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${coverage.coverage_percentage}%` }}
                  className={`h-full transition-all duration-300 ${
                    coverage.coverage_percentage === 100
                      ? 'bg-emerald-400'
                      : coverage.coverage_percentage >= 50
                      ? 'bg-cyan-400'
                      : 'bg-amber-400'
                  }`}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                <span className="text-emerald-400">{coverage.supported_tokens} supported</span>
                {coverage.unsupported_tokens.length > 0 && (
                  <span className="text-red-400">
                    {coverage.unsupported_tokens.length} unsupported (
                    {coverage.unsupported_tokens.join(', ')})
                  </span>
                )}
              </div>
            </div>

            {/* Feedback Trigger */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-gray-400">Notice an issue with the sign sequence?</span>
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Rate Translation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Avatar Viewer & Linguistic Inspector */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Avatar Viewer */}
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>3D ISL Sequence Playback</span>
              </h3>
              <span className="text-xs font-mono text-cyan-400">
                {avatarGlosses.length} Signs in Sequence
              </span>
            </div>

            <AvatarViewer
              initialGlosses={avatarGlosses}
              autoPlay={false}
              heightClassName="h-[420px]"
              showSequenceList={true}
            />
          </div>

          {/* Linguistic Inspector */}
          <LinguisticBreakdown
            normalizedTokens={normalizedTokens}
            reorderedGlosses={avatarGlosses}
            grammarRules={grammarRules}
            segments={segments}
            coverage={coverage}
          />
        </div>
      </div>

      {/* Translation Feedback Modal */}
      <TranslationFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        translationId={translationId}
        sourceText={inputText}
      />
    </div>
  );
}
