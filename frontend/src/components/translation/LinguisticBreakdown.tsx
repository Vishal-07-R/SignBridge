import { AlertTriangle, ArrowRight, BookOpen, CheckCircle, Info } from 'lucide-react';
import type {
  CoverageMetrics,
  GrammarRuleApplied,
  TranslationSegment,
} from '../../api/translation.ts';

interface LinguisticBreakdownProps {
  normalizedTokens: string[];
  reorderedGlosses: string[];
  grammarRules: GrammarRuleApplied[];
  segments: TranslationSegment[];
  coverage: CoverageMetrics;
}

export function LinguisticBreakdown({
  normalizedTokens,
  reorderedGlosses,
  grammarRules,
  segments,
  coverage,
}: LinguisticBreakdownProps) {
  const hasUnsupported = coverage.unsupported_tokens.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-[#111827] p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Linguistic Inspection & Grammar Flow</h3>
            <p className="text-[11px] text-gray-400">Step-by-step ISL structural transformations</p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-cyan-400">
          {coverage.coverage_percentage}% Dictionary Coverage
        </span>
      </div>

      {/* Honesty Rule 2 Warning Banner if unsupported signs exist */}
      {hasUnsupported && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-800/80 bg-red-950/30 p-3 text-xs text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-red-300">
              Honesty Rule 2: Unsupported Signs Detected
            </div>
            <p className="text-[11px] leading-relaxed text-red-200/90">
              The following words have no verified lexical sign in the dictionary:
              <span className="ml-1.5 font-mono font-bold text-red-300">
                {coverage.unsupported_tokens.join(', ')}
              </span>
              . In strict compliance with honesty rules, SignBridge does <strong>not</strong> invent
              or hallucinate signs. These tokens are held in a neutral rest pose with a warning badge.
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Normalized Tokens */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          1. Normalized Tokens (Casing & Lemmatized):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {normalizedTokens.length > 0 ? (
            normalizedTokens.map((tok, idx) => (
              <span
                key={`${tok}-${idx}`}
                className="rounded bg-[#0b0f19] border border-gray-800 px-2 py-0.5 font-mono text-xs text-gray-300"
              >
                {tok}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-500 italic">No tokens</span>
          )}
        </div>
      </div>

      {/* Step 2: Applied ISL Grammar Rules */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          2. Applied ISL Grammar Transformations:
        </span>
        {grammarRules.length > 0 ? (
          <div className="space-y-2">
            {grammarRules.map((rule, idx) => (
              <div
                key={`${rule.rule_id}-${idx}`}
                className="rounded-lg border border-gray-800 bg-[#0b0f19] p-3 text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-mono font-bold text-cyan-400">{rule.rule_id}</span>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                    <Info className="h-3 w-3" />
                    <span>{rule.linguist_notes}</span>
                  </span>
                </div>
                <p className="text-gray-300 leading-relaxed text-[11px]">{rule.description}</p>
                <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-gray-400">
                  <span className="text-gray-500">[{rule.original_order.join(' ')}]</span>
                  <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span className="text-cyan-300 font-semibold">
                    [{rule.transformed_order.join(' ')}]
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-[#0b0f19] p-2.5 text-xs text-gray-400 italic">
            No structural reordering needed; constituent order aligns with baseline phrase.
          </div>
        )}
      </div>

      {/* Step 3: Final Ordered Sign Gloss Sequence */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          3. Final Ordered Sign Sequence ({reorderedGlosses.length} Glosses):
        </span>

        <div className="flex flex-wrap gap-2">
          {segments.map((seg) => (
            <div
              key={`${seg.gloss}-${seg.sequence_order}`}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-semibold border ${
                seg.is_supported
                  ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300'
                  : 'border-red-800/80 bg-red-950/40 text-red-300'
              }`}
            >
              <span>{seg.gloss}</span>
              {seg.is_supported ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
