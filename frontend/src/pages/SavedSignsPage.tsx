import { useState } from 'react';
import { Bookmark, Play, Plus, Trash2 } from 'lucide-react';
import { PageRoute } from '../types/navigation.ts';

interface SavedItem {
  id: string;
  title: string;
  category: string;
  glosses: string[];
  createdAt: string;
}

export function SavedSignsPage({ onNavigate }: { onNavigate: (route: PageRoute) => void }) {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([
    {
      id: 'saved-1',
      title: 'Polite Welcome Greeting',
      category: 'Courtesy',
      glosses: ['HELLO', 'WELCOME', 'FRIEND'],
      createdAt: '2026-10-14',
    },
    {
      id: 'saved-2',
      title: 'Request for Assistance & Water',
      category: 'Essentials',
      glosses: ['PLEASE', 'HELP', 'WATER'],
      createdAt: '2026-10-14',
    },
    {
      id: 'saved-3',
      title: 'Gratitude & Departure',
      category: 'Courtesy',
      glosses: ['THANK_YOU', 'GOOD', 'FRIEND'],
      createdAt: '2026-10-14',
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newWords, setNewWords] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddPhrase = () => {
    if (!newTitle.trim() || !newWords.trim()) return;

    const glosses = newWords
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^A-Z0-9_]/g, ''));

    const newItem: SavedItem = {
      id: `saved-${Date.now()}`,
      title: newTitle.trim(),
      category: 'Custom',
      glosses,
      createdAt: 'Today',
    };

    setSavedItems([newItem, ...savedItems]);
    setNewTitle('');
    setNewWords('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setSavedItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono mb-2">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Personal Collection</span>
          </div>
          <h2 className="text-xl font-bold text-white">Saved Signs & Favorite Phrases</h2>
          <p className="text-xs text-gray-400">
            Bookmark commonly used phrases and vocabulary for instant reference and 3D avatar replay.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Phrase</span>
        </button>
      </div>

      {/* Add New Phrase Box */}
      {isAdding && (
        <div className="rounded-xl border border-cyan-800/80 bg-cyan-950/20 p-5 space-y-3 animate-in fade-in duration-150">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
            New Bookmarked Phrase
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Phrase Title (e.g. Asking for Water)..."
              className="px-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <input
              type="text"
              value={newWords}
              onChange={(e) => setNewWords(e.target.value)}
              placeholder="Words or glosses (e.g. please water help)..."
              className="px-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddPhrase}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs"
            >
              Save to Favorites
            </button>
          </div>
        </div>
      )}

      {/* Saved Phrases List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {savedItems.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col justify-between gap-4 hover:border-gray-700 transition-colors shadow-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                  {item.category}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-500 hover:text-red-400 p-1"
                  title="Remove from Saved"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="text-sm font-bold text-white">{item.title}</h3>

              <div className="flex flex-wrap gap-1 pt-1">
                {item.glosses.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 text-xs font-mono"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-mono">{item.createdAt}</span>
              <button
                type="button"
                onClick={() => onNavigate('workspace')}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Play in Avatar</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
