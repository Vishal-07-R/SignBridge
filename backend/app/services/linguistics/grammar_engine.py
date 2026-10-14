"""Rule-based ISL grammar transformation engine.

Enforces Indian Sign Language structural constraints:
- Time-first discourse frame (temporal markers move to clause start)
- Copula and article omission
- Subject-Object-Verb (SOV) constituent ordering
- Negation markers post-predicate / clause-final
- Interrogative WH-markers clause-final

HONESTY RULE 5 COMPLIANCE:
All applied grammar rules are explicitly flagged with `linguist_notes="needs linguist review"`.
No LLM or vector heuristics are used as a substitute for verified sign mapping.
"""

from dataclasses import dataclass
from typing import Any

from app.services.linguistics.lemmatizer import lemmatize_token
from app.services.linguistics.normalizer import (
    COPULAS_AND_ARTICLES,
    NEGATION_WORDS,
    TIME_MARKERS,
    WH_WORDS,
)

# Core grammatical categorizations for rule application
SUBJECT_PRONOUNS: set[str] = {"i", "you", "he", "she", "it", "we", "they", "me"}
COMMON_VERBS: set[str] = {
    "want",
    "need",
    "drink",
    "eat",
    "help",
    "give",
    "like",
    "love",
    "know",
    "see",
    "watch",
    "come",
    "go",
    "learn",
    "teach",
    "sign",
}
COMMON_OBJECTS: set[str] = {
    "water",
    "food",
    "book",
    "help",
    "sign",
    "language",
    "name",
    "tea",
    "coffee",
    "money",
}


@dataclass
class GrammarRuleApplied:
    """Record of an applied ISL grammar transformation."""

    rule_id: str
    description: str
    linguist_notes: str
    original_order: list[str]
    transformed_order: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "description": self.description,
            "linguist_notes": self.linguist_notes,
            "original_order": self.original_order,
            "transformed_order": self.transformed_order,
        }


def transform_to_isl_grammar(tokens: list[str]) -> tuple[list[str], list[GrammarRuleApplied]]:
    """Apply rule-based ISL grammar transformations to an ordered list of tokens/glosses.

    Returns:
        (transformed_glosses, list_of_applied_rules)
    """
    if not tokens:
        return [], []

    applied_rules: list[GrammarRuleApplied] = []
    current_tokens = list(tokens)

    # -------------------------------------------------------------------------
    # RULE 1: Filter English Copulas and Articles
    # -------------------------------------------------------------------------
    filtered_tokens: list[str] = []
    dropped_tokens: list[str] = []

    for tok in current_tokens:
        clean = tok.lower().strip(".,!?;:\"'")
        # Keep punctuation marks if attached to word, or if word is not copula/article
        if clean in COPULAS_AND_ARTICLES:
            dropped_tokens.append(tok)
        else:
            filtered_tokens.append(tok)

    if dropped_tokens and filtered_tokens:
        applied_rules.append(
            GrammarRuleApplied(
                rule_id="RULE_FILTER_COPULAS_ARTICLES",
                description=(
                    f"Omitted English copulas/articles ({', '.join(dropped_tokens)}). "
                    "In ISL, copular verbs ('is/are/am') and articles ('a/the') are not lexicalized."
                ),
                linguist_notes="needs linguist review",
                original_order=current_tokens,
                transformed_order=filtered_tokens,
            )
        )
        current_tokens = filtered_tokens

    # -------------------------------------------------------------------------
    # RULE 2: Time-First Positioning (Temporal Framing)
    # -------------------------------------------------------------------------
    time_tokens: list[str] = []
    non_time_tokens: list[str] = []

    for tok in current_tokens:
        clean = tok.lower().strip(".,!?;:\"'")
        if clean in TIME_MARKERS:
            time_tokens.append(tok)
        else:
            non_time_tokens.append(tok)

    # If time markers exist and are not already all at the beginning
    if time_tokens and current_tokens[: len(time_tokens)] != time_tokens:
        reordered_time = time_tokens + non_time_tokens
        applied_rules.append(
            GrammarRuleApplied(
                rule_id="RULE_TIME_FIRST",
                description=(
                    f"Repositioned temporal marker(s) ({', '.join(time_tokens)}) to sentence head. "
                    "ISL sets the temporal frame of reference before the topic and comment."
                ),
                linguist_notes="needs linguist review",
                original_order=current_tokens,
                transformed_order=reordered_time,
            )
        )
        current_tokens = reordered_time

    # -------------------------------------------------------------------------
    # RULE 3: Negation-Final / Post-Predicate Positioning
    # -------------------------------------------------------------------------
    neg_tokens: list[str] = []
    non_neg_tokens: list[str] = []

    for tok in current_tokens:
        clean = tok.lower().strip(".,!?;:\"'")
        if clean in NEGATION_WORDS:
            neg_tokens.append("NO")  # Normalize negation word to standard ISL NO
        else:
            non_neg_tokens.append(tok)

    if neg_tokens and current_tokens[-len(neg_tokens) :] != neg_tokens:
        reordered_neg = non_neg_tokens + neg_tokens
        applied_rules.append(
            GrammarRuleApplied(
                rule_id="RULE_NEGATION_FINAL",
                description=(
                    "Moved negation particle to clause end. "
                    "In ISL, manual negation typically follows the predicate verb."
                ),
                linguist_notes="needs linguist review",
                original_order=current_tokens,
                transformed_order=reordered_neg,
            )
        )
        current_tokens = reordered_neg

    # -------------------------------------------------------------------------
    # RULE 4: WH-Question Interrogative Clause-Final
    # -------------------------------------------------------------------------
    wh_tokens: list[str] = []
    non_wh_tokens: list[str] = []

    for tok in current_tokens:
        clean = tok.lower().strip(".,!?;:\"'")
        if clean in WH_WORDS:
            wh_tokens.append(tok)
        else:
            non_wh_tokens.append(tok)

    if wh_tokens and current_tokens[-len(wh_tokens) :] != wh_tokens:
        reordered_wh = non_wh_tokens + wh_tokens
        applied_rules.append(
            GrammarRuleApplied(
                rule_id="RULE_WH_QUESTION_FINAL",
                description=(
                    f"Moved question interrogative ({', '.join(wh_tokens)}) to clause end. "
                    "In ISL questions, wh-signs are positioned sentence-finally with non-manual furrowed brows."
                ),
                linguist_notes="needs linguist review",
                original_order=current_tokens,
                transformed_order=reordered_wh,
            )
        )
        current_tokens = reordered_wh

    # -------------------------------------------------------------------------
    # RULE 5: Subject-Object-Verb (SOV) Constituent Reordering
    # -------------------------------------------------------------------------
    # If pattern has Subject + Verb + Object (e.g., [I, WANT, WATER] -> [I, WATER, WANT])
    if len(current_tokens) >= 3:
        for idx in range(len(current_tokens) - 2):
            s = current_tokens[idx].lower().strip(".,!?;:\"'")
            v = current_tokens[idx + 1].lower().strip(".,!?;:\"'")
            o = current_tokens[idx + 2].lower().strip(".,!?;:\"'")

            if (
                (s in SUBJECT_PRONOUNS or s.isupper())
                and (v in COMMON_VERBS or lemmatize_token(v).lower() in COMMON_VERBS)
                and (o in COMMON_OBJECTS or lemmatize_token(o).lower() in COMMON_OBJECTS)
            ):
                # Swap verb and object
                sov_tokens = list(current_tokens)
                sov_tokens[idx + 1], sov_tokens[idx + 2] = sov_tokens[idx + 2], sov_tokens[idx + 1]
                applied_rules.append(
                    GrammarRuleApplied(
                        rule_id="RULE_SOV_ORDER",
                        description=(
                            f"Reordered '{v} {o}' into ISL SOV pattern '{o} {v}'. "
                            "ISL canonically favors Subject-Object-Verb word order."
                        ),
                        linguist_notes="needs linguist review",
                        original_order=current_tokens,
                        transformed_order=sov_tokens,
                    )
                )
                current_tokens = sov_tokens
                break

    # Final canonical gloss normalization (capitalize and strip punctuation)
    final_glosses = [lemmatize_token(t) for t in current_tokens if t.strip()]

    return final_glosses, applied_rules
