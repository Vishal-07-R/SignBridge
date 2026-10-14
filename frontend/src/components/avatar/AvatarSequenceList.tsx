import { Clock } from 'lucide-react';
import { SignSequenceItem } from '../../types/avatar.ts';

interface AvatarSequenceListProps {
  sequence: SignSequenceItem[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export function AvatarSequenceList({
  sequence,
  currentIndex,
  onSelectIndex,
}: AvatarSequenceListProps) {
  if (sequence.length === 0) {
    return (
      <div className="w-full bg-[#111827] border border-gray-800 rounded-xl p-4 text-center text-xs text-gray-500">
        No sign sequence loaded. Enter text or select demo signs to queue an animation sequence.
      </div>
    );
  }

  return (
    <div className="w-full bg-[#111827] border border-gray-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
          Sign Animation Sequence ({sequence.length})
        </h3>
        <span className="text-[11px] text-gray-400 font-mono">Click sign to jump</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
        {sequence.map((item, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={item.id + idx}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'bg-cyan-950/70 border-cyan-500 shadow-md shadow-cyan-500/10'
                  : item.isSupported
                  ? 'bg-[#0b0f19] border-gray-800 hover:border-gray-700'
                  : 'bg-red-950/30 border-red-800/80 hover:border-red-700'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`text-xs font-bold font-mono ${
                    isActive
                      ? 'text-cyan-400'
                      : item.isSupported
                      ? 'text-gray-200'
                      : 'text-red-400'
                  }`}
                >
                  {item.gloss}
                </span>
                {isActive && (
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse mt-0.5" />
                )}
              </div>

              <div className="mt-2 pt-1.5 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {item.duration.toFixed(1)}s
                </span>
                {item.isSupported ? (
                  <span className="text-amber-400">demo</span>
                ) : (
                  <span className="text-red-400 font-bold">unsupported</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
