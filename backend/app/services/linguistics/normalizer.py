"""Input text normalization, character/word counting, and language utilities."""

import re
import unicodedata
from dataclasses import dataclass

# English copulas, auxiliary verbs, and articles that do not have direct ISL lexical signs
COPULAS_AND_ARTICLES: set[str] = {
    "is",
    "am",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "a",
    "an",
    "the",
}

# Negation words in English
NEGATION_WORDS: set[str] = {
    "not",
    "no",
    "never",
    "none",
    "neither",
    "nor",
    "don't",
    "dont",
    "doesn't",
    "doesnt",
    "didn't",
    "didnt",
    "cannot",
    "can't",
    "cant",
    "won't",
    "wont",
}

# Temporal frame markers (Time-first rule in ISL)
TIME_MARKERS: set[str] = {
    "today",
    "yesterday",
    "tomorrow",
    "now",
    "later",
    "morning",
    "afternoon",
    "evening",
    "night",
    "soon",
    "daily",
    "always",
    "often",
    "sometimes",
}

# Interrogative WH-words (WH-final rule in ISL)
WH_WORDS: set[str] = {
    "what",
    "where",
    "who",
    "whom",
    "whose",
    "why",
    "how",
    "when",
    "which",
}

# Hindi to English gloss dictionary for Indian sign mapping
HINDI_TO_GLOSS_MAP: dict[str, str] = {
    "नमस्ते": "HELLO",
    "नमस्कार": "HELLO",
    "धन्यवाद": "THANK_YOU",
    "शुक्रिया": "THANK_YOU",
    "कृपया": "PLEASE",
    "नाम": "NAME",
    "मदद": "HELP",
    "सहायता": "HELP",
    "हाँ": "YES",
    "हां": "YES",
    "नहीं": "NO",
    "ना": "NO",
    "पानी": "WATER",
    "जल": "WATER",
    "अच्छा": "GOOD",
    "बढ़िया": "GOOD",
    "स्वागत": "WELCOME",
    "संकेत": "SIGN",
    "इशारा": "SIGN",
    "दोस्त": "FRIEND",
    "मित्र": "FRIEND",
    "आप": "YOU",
    "तुम": "YOU",
    "मैं": "I",
    "हम": "WE",
    "क्या": "WHAT",
    "कहाँ": "WHERE",
    "क्यों": "WHY",
    "कैसे": "HOW",
    "कब": "WHEN",
    "कल": "TOMORROW",
    "आज": "TODAY",
}


@dataclass(frozen=True)
class TextStats:
    """Character, word, and sentence statistics."""

    char_count: int
    word_count: int
    sentence_count: int


def get_text_stats(text: str) -> TextStats:
    """Calculate character, word, and sentence counts for input text."""
    trimmed = text.strip()
    if not trimmed:
        return TextStats(char_count=0, word_count=0, sentence_count=0)

    char_count = len(trimmed)
    words = trimmed.split()
    word_count = len(words)
    # Count sentences by ending delimiters
    sentences = [s for s in re.split(r"[.!?]+", trimmed) if s.strip()]
    sentence_count = max(1, len(sentences))

    return TextStats(
        char_count=char_count,
        word_count=word_count,
        sentence_count=sentence_count,
    )


def normalize_text(text: str, source_language: str = "en") -> list[str]:
    """Clean, normalize, and tokenize text into base linguistic units.

    Handles Unicode NFKC normalization, lowercase conversion, and punctuation isolation.
    """
    if not text or not text.strip():
        return []

    # Unicode normalization
    normalized = unicodedata.normalize("NFKC", text.strip())

    if source_language.lower() == "hi":
        # Split Hindi text on whitespace and punctuation
        raw_tokens = re.findall(r"[\u0900-\u097F]+|[a-zA-Z0-9]+", normalized)
        tokens: list[str] = []
        for tok in raw_tokens:
            if tok in HINDI_TO_GLOSS_MAP:
                tokens.append(HINDI_TO_GLOSS_MAP[tok])
            else:
                tokens.append(tok.upper())
        return tokens

    # English: Lowercase and strip special characters except apostrophes inside words
    # Replace contractions
    normalized = normalized.lower()
    contractions = {
        "don't": "do not",
        "doesn't": "does not",
        "didn't": "did not",
        "can't": "cannot",
        "won't": "will not",
        "i'm": "i am",
        "you're": "you are",
        "it's": "it is",
        "we're": "we are",
        "they're": "they are",
        "what's": "what is",
    }
    for contr, expanded in contractions.items():
        normalized = re.sub(rf"\b{re.escape(contr)}\b", expanded, normalized)

    # Remove non-alphanumeric except spaces and basic sentence punctuation
    cleaned = re.sub(r"[^\w\s\.\?!]", " ", normalized)
    # Split on whitespace
    tokens = [tok.strip() for tok in cleaned.split() if tok.strip()]
    return tokens
