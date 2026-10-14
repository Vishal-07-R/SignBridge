"""Phrase-first matcher to detect multi-word ISL compounds and idioms before single-token parsing."""

from dataclasses import dataclass


@dataclass(frozen=True)
class MatchedPhrase:
    """Represents a matched multi-token sequence."""

    start_idx: int
    end_idx: int  # exclusive
    phrase: str
    target_glosses: list[str]


# Multi-word phrase mapping table for ISL
PHRASE_DICTIONARY: list[tuple[list[str], list[str]]] = [
    # Courtesy & Greetings
    (["thank", "you"], ["THANK_YOU"]),
    (["thanks", "a", "lot"], ["THANK_YOU"]),
    (["many", "thanks"], ["THANK_YOU"]),
    (["you", "are", "welcome"], ["WELCOME"]),
    (["welcome", "friend"], ["WELCOME", "FRIEND"]),
    (["good", "morning"], ["GOOD"]),
    (["good", "afternoon"], ["GOOD"]),
    (["good", "evening"], ["GOOD"]),
    (["good", "night"], ["GOOD"]),
    # Identity & Introductions
    (["what", "is", "your", "name"], ["YOU", "NAME", "WHAT"]),
    (["what", "your", "name"], ["YOU", "NAME", "WHAT"]),
    (["your", "name", "what"], ["YOU", "NAME", "WHAT"]),
    (["my", "name", "is"], ["I", "NAME"]),
    (["my", "name"], ["I", "NAME"]),
    (["your", "name"], ["YOU", "NAME"]),
    # Communication & Assistance
    (["sign", "language"], ["SIGN"]),
    (["indian", "sign", "language"], ["SIGN"]),
    (["please", "help", "me"], ["PLEASE", "HELP"]),
    (["please", "help"], ["PLEASE", "HELP"]),
    (["need", "help"], ["HELP"]),
    (["give", "me", "water"], ["WATER", "PLEASE"]),
    (["drinking", "water"], ["WATER"]),
    (["glass", "of", "water"], ["WATER"]),
]

# Sort phrases by length descending to implement greedy longest-match-first
SORTED_PHRASE_TABLE: list[tuple[list[str], list[str]]] = sorted(
    PHRASE_DICTIONARY, key=lambda item: len(item[0]), reverse=True
)


def match_phrases(tokens: list[str]) -> list[str]:
    """Greedy phrase-first matcher.

    Scans normalized token list and replaces multi-word sequences with compound glosses.
    Returns a list of glosses/tokens where multi-word idioms have been collapsed.
    """
    if not tokens:
        return []

    # Clean tokens for matching (strip punctuation, lowercase)
    clean_tokens = [t.lower().strip(".,!?;:\"'") for t in tokens]
    result: list[str] = []
    i = 0
    n = len(clean_tokens)

    while i < n:
        matched = False
        for phrase_tokens, target_glosses in SORTED_PHRASE_TABLE:
            phrase_len = len(phrase_tokens)
            if i + phrase_len <= n:
                window = clean_tokens[i : i + phrase_len]
                if window == phrase_tokens:
                    # Match found! Add target glosses
                    result.extend(target_glosses)
                    i += phrase_len
                    matched = True
                    break
        if not matched:
            result.append(tokens[i])
            i += 1

    return result
