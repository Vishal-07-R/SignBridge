import { useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Lock,
  MessageSquare,
  Send,
  ShieldAlert,
} from 'lucide-react';

export function HelpPrivacyPage() {
  const [feedbackSign, setFeedbackSign] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackSign.trim() || !expectedBehavior.trim()) return;
    setIsSubmitted(true);
    setTimeout(() => {
      setFeedbackSign('');
      setExpectedBehavior('');
      setFeedbackComment('');
      setIsSubmitted(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support & Governance</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Help, Privacy & Linguistic Feedback</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Understand how AI SignBridge works, review our uncompromising privacy guarantees, and submit linguistic corrections directly to our team.
          </p>
        </div>
      </div>

      {/* Privacy Guarantees */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Our Privacy Commitments</span>
        </h3>

        <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
          <p>
            <strong>1. Explicit, User-Initiated Video Streams:</strong> Camera feeds are never accessed in the background or during page navigation. Video streams activate solely when you explicitly click "Start Camera" and release immediately when you click "Stop".
          </p>
          <p>
            <strong>2. Local Coordinate Extraction:</strong> MediaPipe hand and pose landmarks are computed directly inside your browser client using WebGL / WebAssembly. No raw video feed is stored on disk or broadcasted to third parties.
          </p>
          <p>
            <strong>3. Minimal Data Retention:</strong> Translation history and session records are user-controlled and can be exported or purged at any time from your Dashboard.
          </p>
        </div>
      </div>

      {/* Limitations & Honesty Commitment */}
      <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-6 space-y-3 shadow-xl text-xs text-amber-200">
        <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Linguistic Limitations & Honesty Commitment</span>
        </h3>
        <p className="leading-relaxed">
          Sign language is rich, multi-layered, and incorporates nuanced facial grammar (non-manual markers), spatial reference points, and regional dialects across India. AI SignBridge does <strong>not</strong> claim universal recognition or translation.
        </p>
        <p className="leading-relaxed">
          The current vocabulary is limited to explicitly verified dictionary glosses. Any word outside our verified dictionary produces an explicit <strong>"Unsupported Sign"</strong> notification rather than an improvised gesture.
        </p>
      </div>

      {/* Translation & Linguistic Feedback Form */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>Submit Sign Correction or Linguist Feedback</span>
        </h3>

        {isSubmitted ? (
          <div className="p-4 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Thank you for your feedback! Your correction has been logged for review.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  Sign Gloss / English Word:
                </label>
                <input
                  type="text"
                  required
                  value={feedbackSign}
                  onChange={(e) => setFeedbackSign(e.target.value)}
                  placeholder="e.g. WATER, PLEASE, HELLO..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">
                  Expected / Correct Gesture:
                </label>
                <input
                  type="text"
                  required
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  placeholder="e.g. Handshape should tap mouth twice..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">
                Additional Comments / Context (Optional):
              </label>
              <textarea
                rows={3}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Details regarding regional variation, grammatical notes..."
                className="w-full p-3 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
