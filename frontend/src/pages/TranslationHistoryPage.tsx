import { useState } from 'react';
import {
  Clock,
  Download,
  Filter,
  History,
  Play,
  Search,
  Trash2,
} from 'lucide-react';
import { PageRoute } from '../types/navigation.ts';

interface HistoryItem {
  id: string;
  timestamp: string;
  direction: 'text-to-isl' | 'isl-to-text' | 'ocr-to-isl';
  source: string;
  result: string[];
}

export function TranslationHistoryPage({ onNavigate }: { onNavigate: (route: PageRoute) => void }) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([
    {
      id: 'h-1',
      timestamp: '2026-10-14 18:45',
      direction: 'text-to-isl',
      source: 'Hello friend welcome',
      result: ['HELLO', 'FRIEND', 'WELCOME'],
    },
    {
      id: 'h-2',
      timestamp: '2026-10-14 17:30',
      direction: 'isl-to-text',
      source: 'MediaPipe Camera Recognition',
      result: ['THANK_YOU', 'PLEASE'],
    },
    {
      id: 'h-3',
      timestamp: '2026-10-14 15:10',
      direction: 'ocr-to-isl',
      source: 'Invoice Screenshot (OCR)',
      result: ['WATER', 'HELP'],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<string>('all');

  const filtered = historyItems.filter((item) => {
    const matchesSearch =
      item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.result.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterDirection === 'all' || item.direction === filterDirection;
    return matchesSearch && matchesFilter;
  });

  const handleDeleteItem = (id: string) => {
    setHistoryItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearAll = () => {
    setHistoryItems([]);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(historyItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'signbridge_translation_history.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono mb-2">
            <History className="w-3.5 h-3.5" />
            <span>User Activity Records</span>
          </div>
          <h2 className="text-xl font-bold text-white">Translation History</h2>
          <p className="text-xs text-gray-400">
            Chronological log of your text, image, and camera translations. Stored privately on your device.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {historyItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-xs text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search translated words or signs..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Directions</option>
            <option value="text-to-isl">Text to ISL</option>
            <option value="isl-to-text">ISL to Text</option>
            <option value="ocr-to-isl">Document OCR</option>
          </select>
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-gray-800 bg-[#111827] flex flex-wrap items-center justify-between gap-4 hover:border-gray-700 transition-colors"
            >
              <div className="space-y-1.5 flex-1 min-w-[260px]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-cyan-400 font-mono uppercase">
                    {item.direction}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.timestamp}
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">{item.source}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.result.map((sign) => (
                    <span
                      key={sign}
                      className="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 text-xs font-mono"
                    >
                      {sign}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('workspace')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Replay</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
                  title="Delete Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-8 text-center text-gray-500 text-xs">
            No translation history records matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
