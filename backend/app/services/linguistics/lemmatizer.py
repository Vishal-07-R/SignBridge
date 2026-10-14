"""Deterministic rule-based lemmatizer mapping inflections to canonical ISL dictionary glosses."""

# Direct irregular mappings to canonical dictionary glosses
IRREGULAR_LEMMA_MAP: dict[str, str] = {
    # Pronouns
    "me": "I",
    "my": "I",
    "myself": "I",
    "mine": "I",
    "your": "YOU",
    "yours": "YOU",
    "yourself": "YOU",
    "him": "HE",
    "his": "HE",
    "her": "SHE",
    "hers": "SHE",
    "us": "WE",
    "our": "WE",
    "ours": "WE",
    "them": "THEY",
    "their": "THEY",
    "theirs": "THEY",
    # Common verbs
    "am": "BE",
    "is": "BE",
    "are": "BE",
    "was": "BE",
    "were": "BE",
    "been": "BE",
    "being": "BE",
    "gave": "GIVE",
    "given": "GIVE",
    "giving": "GIVE",
    "went": "GO",
    "gone": "GO",
    "going": "GO",
    "drank": "DRINK",
    "drunk": "DRINK",
    "drinking": "DRINK",
    "said": "SAY",
    "saying": "SAY",
    "saw": "SEE",
    "seen": "SEE",
    "seeing": "SEE",
    "came": "COME",
    "coming": "COME",
    "took": "TAKE",
    "taken": "TAKE",
    "taking": "TAKE",
    # Core seeded signs inflection variants
    "helped": "HELP",
    "helping": "HELP",
    "helps": "HELP",
    "thanked": "THANK_YOU",
    "thanks": "THANK_YOU",
    "thanking": "THANK_YOU",
    "welcomed": "WELCOME",
    "welcoming": "WELCOME",
    "welcomes": "WELCOME",
    "signed": "SIGN",
    "signing": "SIGN",
    "signs": "SIGN",
    "friends": "FRIEND",
    "friendship": "FRIEND",
    "names": "NAME",
    "named": "NAME",
    "waters": "WATER",
    "watered": "WATER",
    "watering": "WATER",
    "better": "GOOD",
    "best": "GOOD",
}


def lemmatize_token(token: str) -> str:
    """Reduce an English token to its canonical lemma/gloss.

    Applies irregular lookup first, then standard English morphological inflection rules.
    """
    cleaned = token.lower().strip(".,!?;:\"'")
    if not cleaned:
        return ""

    if cleaned in IRREGULAR_LEMMA_MAP:
        return IRREGULAR_LEMMA_MAP[cleaned]

    # Morphological stripping for regular English forms
    # -ing suffix
    if len(cleaned) > 4 and cleaned.endswith("ing"):
        base = cleaned[:-3]
        if base.endswith(base[-1]) and len(base) > 2:  # double consonant: running -> run
            base = base[:-1]
        return base.upper()

    # -ed suffix
    if len(cleaned) > 3 and cleaned.endswith("ed"):
        base = cleaned[:-2]
        if base.endswith("i"):  # studied -> study
            base = base[:-1] + "y"
        elif base.endswith(base[-1]) and len(base) > 2:
            base = base[:-1]
        return base.upper()

    # -es / -s plural or 3rd person singular suffix
    if len(cleaned) > 3 and cleaned.endswith("es"):
        if cleaned.endswith("ies") and len(cleaned) > 4:
            return (cleaned[:-3] + "y").upper()
        return cleaned[:-2].upper()
    if len(cleaned) > 3 and cleaned.endswith("s") and not cleaned.endswith("ss"):
        return cleaned[:-1].upper()

    return cleaned.upper()
