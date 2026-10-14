import { useState } from 'react';
import { AlertCircle, CheckCircle2, MessageSquare, Star, X } from 'lucide-react';
import { submitTranslationFeedback } from '../../api/translation.ts';

interface TranslationFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  translationId: string | null;
  sourceText: string;
}

const ERROR_CATEGORIES = [
  { value: 'other', label: 'General Quality / Feedback' },
  { value: 'wrong_sign', label: 'Incorrect Sign Chosen' },
  { value: 'bad_grammar', label: 'ISL Grammar / Ordering Issue' },
  { value: 'unrecognized', label: 'Supported Word Marked Unsupported' },
  { value: 'timing', label: 'Pacing / Transition Timing Issue' },
];

export function TranslationFeedbackModal({
  isOpen,
  onClose,
  translationId,
  sourceText,
}: TranslationFeedbackModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('other');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!translationId) {
      setErrorMsg('No active translation session to rate.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await submitTranslationFeedback(translationId, {
        rating,
        error_category: category,
        feedback_text: feedbackText.trim() || undefined,
      });
      setSuccessMsg('Thank you! Your feedback has been recorded for linguist review.');
      setTimeout(() => {
        setSuccessMsg(null);
        setFeedbackText('');
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 id="feedback-modal-title" className="text-base font-bold text-white">
              Rate Translation Accuracy
            </h3>
            <p className="text-xs text-gray-400">Help improve ISL grammatical accuracy</p>
          </div>
        </div>

        {sourceText && (
          <div className="mb-4 rounded-lg bg-[#0b0f19] border border-gray-800 p-2.5 text-xs text-gray-300">
            <span className="font-semibold text-gray-400">Phrase: </span>
            <span className="italic">"{sourceText}"</span>
          </div>
        )}

        {successMsg ? (
          <div className="my-6 flex flex-col items-center justify-center gap-2 text-center text-emerald-400">
            <CheckCircle2 className="h-10 w-10" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-800 p-2.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Star Rating */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-300">
                Overall Accuracy Rating:
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-gray-600 hover:scale-110 transition-transform focus:outline-none"
                    aria-label={`${star} star`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-mono text-gray-400">
                  {rating} of 5 stars
                </span>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-300">
                Issue Category:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg bg-[#0b0f19] border border-gray-800 p-2 text-xs text-gray-100 focus:border-cyan-500 focus:outline-none"
              >
                {ERROR_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Detailed Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-300">
                Detailed Feedback / Correction (Optional):
              </label>
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe what went wrong or how an ISL native signer would sign this..."
                className="w-full rounded-lg bg-[#0b0f19] border border-gray-800 p-2.5 text-xs text-gray-100 placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 px-4 py-1.5 text-xs font-bold text-gray-950 transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
