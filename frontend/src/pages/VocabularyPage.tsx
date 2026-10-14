import { useState } from 'react';
import {
  BookOpen,
  Filter,
  Play,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { AvatarViewer } from '../components/avatar/AvatarViewer.tsx';

interface SignItem {
  id: string;
  gloss: string;
  category: string;
  description: string;
  is_demo: boolean;
  is_reviewed: boolean;
  linguist_notes: string;
}

export function VocabularyPage({ demoSigns }: { demoSigns: SignItem[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [demoSignGloss, setDemoSignGloss] = useState<string | null>(null);

  const categories = [
    'ALL',
    ...Array.from(new Set(demoSigns.map((s) => s.category.toUpperCase()))),
  ];

  const filteredSigns = demoSigns.filter((sign) => {
    const matchesSearch =
      sign.gloss.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sign.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === 'ALL' || sign.category.toUpperCase() === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Dictionary & Learning Centre</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Indian Sign Language Vocabulary</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Browse and learn standardized ISL vocabulary signs. Every sign provides handshape descriptions, grammatical usage notes, and direct 3D avatar performance demonstrations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono">
            Demo Seed: Needs Linguist Review
          </span>
        </div>
      </div>

      {/* Search and Category Filter Chips */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 flex flex-col gap-3 shadow-lg">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search signs by name or description (e.g. hello, water, help)..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray-400 font-mono mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-gray-950 font-bold shadow-md shadow-cyan-500/10'
                  : 'bg-[#0b0f19] border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSigns.map((sign) => (
          <div
            key={sign.id}
            className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col justify-between gap-4 hover:border-gray-700 transition-colors shadow-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-800 text-cyan-400">
                  {sign.category}
                </span>
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  ● unreviewed
                </span>
              </div>

              <h3 className="text-lg font-bold text-white tracking-wide font-mono">
                {sign.gloss}
              </h3>

              <p className="text-xs text-gray-300 leading-relaxed">{sign.description}</p>

              <div className="p-2 rounded bg-[#0b0f19] border border-gray-800 text-[11px] text-gray-400 italic">
                {sign.linguist_notes}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-mono">ID: {sign.id}</span>
              <button
                type="button"
                onClick={() => setDemoSignGloss(sign.gloss)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Demonstrate</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Avatar Demonstration Modal */}
      {demoSignGloss && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#111827] border border-gray-700 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  Sign Demonstration: {demoSignGloss}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDemoSignGloss(null)}
                aria-label="Close"
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AvatarViewer
              initialGlosses={[demoSignGloss]}
              autoPlay={true}
              heightClassName="h-[380px]"
              showSequenceList={false}
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDemoSignGloss(null)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
