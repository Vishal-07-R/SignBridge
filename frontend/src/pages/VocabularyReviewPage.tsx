import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  X,
} from 'lucide-react';

interface SignItem {
  id: string;
  gloss: string;
  category: string;
  description: string;
  is_demo: boolean;
  is_reviewed: boolean;
  linguist_notes: string;
}

export function VocabularyReviewPage({ demoSigns }: { demoSigns: SignItem[] }) {
  const [signs, setSigns] = useState<SignItem[]>(demoSigns);
  const [selectedSign, setSelectedSign] = useState<SignItem | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unreviewed' | 'reviewed'>('all');

  const handleOpenReview = (sign: SignItem) => {
    setSelectedSign(sign);
    setEditNotes(sign.linguist_notes);
  };

  const handleApproveSign = (id: string) => {
    setSigns((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              is_reviewed: true,
              linguist_notes: editNotes || 'Reviewed and approved by certified ISL linguist.',
            }
          : s
      )
    );
    setSelectedSign(null);
  };

  const filtered = signs.filter((s) => {
    if (filterMode === 'unreviewed') return !s.is_reviewed;
    if (filterMode === 'reviewed') return s.is_reviewed;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Linguist Verification Workflow</span>
          </div>
          <h2 className="text-xl font-bold text-white">ISL Vocabulary Curation & Review</h2>
          <p className="text-xs text-gray-400">
            Audit vocabulary entries, attach linguistic notes, certify sign accuracy, and maintain version history.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 text-xs">
          {(['all', 'unreviewed', 'reviewed'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMode(m)}
              className={`px-3 py-1.5 rounded-lg capitalize font-mono border transition-colors ${
                filterMode === m
                  ? 'bg-cyan-500 text-gray-950 font-bold border-cyan-400'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white'
              }`}
            >
              {m} ({m === 'all' ? signs.length : signs.filter((s) => (m === 'reviewed' ? s.is_reviewed : !s.is_reviewed)).length})
            </button>
          ))}
        </div>
      </div>

      {/* Signs Table */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f19] border-b border-gray-800 text-gray-400 font-mono uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Gloss</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold font-mono text-cyan-400">{s.gloss}</td>
                  <td className="py-3 px-4 font-mono text-gray-400">{s.category}</td>
                  <td className="py-3 px-4 max-w-xs truncate text-gray-300">{s.description}</td>
                  <td className="py-3 px-4">
                    {s.is_reviewed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Needs Review
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenReview(s)}
                      className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 hover:text-cyan-300 text-xs font-semibold cursor-pointer"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedSign && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-lg rounded-xl bg-[#111827] border border-gray-700 shadow-2xl p-6 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span>Sign Review: {selectedSign.gloss}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSign(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 font-medium block mb-1">Description:</label>
                <p className="text-gray-200 bg-[#0b0f19] p-2.5 rounded-lg border border-gray-800">
                  {selectedSign.description}
                </p>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">
                  Linguist Review & Certification Notes:
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-gray-100 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedSign(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApproveSign(selectedSign.id)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Certify & Approve Sign</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
