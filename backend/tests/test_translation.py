"""Unit and integration tests for Text-to-ISL translation pipeline, grammar engine, and feedback."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.translation import Translation, TranslationFeedback
from app.models.user import User


@pytest.mark.asyncio
async def test_text_translation_validation(async_client: AsyncClient) -> None:
    """Verify input validation rejects empty, whitespace, overly long text, or unsupported languages."""
    # 1. Empty string
    res = await async_client.post("/api/v1/translate/text", json={"text": ""})
    assert res.status_code == 422  # Pydantic min_length=1

    # 2. Whitespace only
    res = await async_client.post("/api/v1/translate/text", json={"text": "   \n\t  "})
    assert res.status_code == 400
    assert "cannot be empty" in res.json()["detail"]

    # 3. Excessive length (> 2000 chars)
    res = await async_client.post("/api/v1/translate/text", json={"text": "a" * 2001})
    assert res.status_code == 422

    # 4. Unsupported language
    res = await async_client.post(
        "/api/v1/translate/text", json={"text": "Hello", "source_language": "fr"}
    )
    assert res.status_code == 400
    assert "Unsupported source language" in res.json()["detail"]


@pytest.mark.asyncio
async def test_normalization_and_copula_omission(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verify English copulas and articles are omitted from ISL sign sequence."""
    res = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "The friend is good and a welcome friend"},
    )
    assert res.status_code == 200
    data = res.json()

    # 'The', 'is', 'a' should be omitted from ISL sequence
    glosses = data["reordered_glosses"]
    assert "THE" not in glosses
    assert "IS" not in glosses
    assert "A" not in glosses

    # Grammar rules must reflect copula/article omission with Honesty Rule 5 notice
    copula_rule = next(
        (
            r
            for r in data["grammar_rules_applied"]
            if r["rule_id"] == "RULE_FILTER_COPULAS_ARTICLES"
        ),
        None,
    )
    assert copula_rule is not None
    assert copula_rule["linguist_notes"] == "needs linguist review"


@pytest.mark.asyncio
async def test_phrase_first_matching(async_client: AsyncClient, db_session: AsyncSession) -> None:
    """Verify multi-word idioms are matched as single ISL glosses before word fragmentation."""
    res = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "Thank you for help with sign language"},
    )
    assert res.status_code == 200
    data = res.json()

    glosses = data["reordered_glosses"]
    # "Thank you" -> "THANK_YOU" (not "THANK" + "YOU")
    assert "THANK_YOU" in glosses
    # "sign language" -> "SIGN"
    assert "SIGN" in glosses
    assert "HELP" in glosses


@pytest.mark.asyncio
async def test_isl_grammar_reordering_rules(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verify rule-based ISL grammar rules (Time-first, SOV, Negation-final, WH-final) are applied.

    Strictly enforces Honesty Rule 5: each rule is flagged 'needs linguist review'.
    """
    # 1. Time-first rule: Temporal marker moved to sentence head
    res_time = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "I will drink water tomorrow"},
    )
    assert res_time.status_code == 200
    data_time = res_time.json()
    assert data_time["reordered_glosses"][0] == "TOMORROW"
    time_rule = next(
        r for r in data_time["grammar_rules_applied"] if r["rule_id"] == "RULE_TIME_FIRST"
    )
    assert time_rule["linguist_notes"] == "needs linguist review"

    # 2. Negation-final rule: Negator moved to end of clause
    res_neg = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "I do not want water"},
    )
    assert res_neg.status_code == 200
    data_neg = res_neg.json()
    assert data_neg["reordered_glosses"][-1] == "NO"
    neg_rule = next(
        r for r in data_neg["grammar_rules_applied"] if r["rule_id"] == "RULE_NEGATION_FINAL"
    )
    assert neg_rule["linguist_notes"] == "needs linguist review"

    # 3. WH-Question-final rule: Interrogative moved to question end
    res_wh = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "Where is the friend"},
    )
    assert res_wh.status_code == 200
    data_wh = res_wh.json()
    assert data_wh["reordered_glosses"][-1] == "WHERE"
    wh_rule = next(
        r for r in data_wh["grammar_rules_applied"] if r["rule_id"] == "RULE_WH_QUESTION_FINAL"
    )
    assert wh_rule["linguist_notes"] == "needs linguist review"

    # 4. SOV constituent rule: Subject-Object-Verb reordering
    res_sov = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "I want water"},
    )
    assert res_sov.status_code == 200
    data_sov = res_sov.json()
    assert data_sov["reordered_glosses"] == ["I", "WATER", "WANT"]
    sov_rule = next(
        r for r in data_sov["grammar_rules_applied"] if r["rule_id"] == "RULE_SOV_ORDER"
    )
    assert sov_rule["linguist_notes"] == "needs linguist review"


@pytest.mark.asyncio
async def test_unsupported_signs_and_coverage(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verify Honesty Rule 2: unsupported signs are explicitly identified and never hallucinated.

    Coverage metrics must accurately report total, supported, unsupported, and percentage.
    """
    res = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "Hello unicorn friend"},
    )
    assert res.status_code == 200
    data = res.json()

    # "HELLO" and "FRIEND" are in the DEMO vocabulary; "UNICORN" is not
    coverage = data["coverage"]
    assert coverage["total_tokens"] == 3
    assert coverage["supported_tokens"] == 2
    assert "UNICORN" in coverage["unsupported_tokens"]
    assert round(coverage["coverage_percentage"], 1) == 66.7

    # Segments validation
    segments = data["segments"]
    assert len(segments) == 3

    hello_seg = next(s for s in segments if s["gloss"] == "HELLO")
    assert hello_seg["is_supported"] is True
    assert hello_seg["sign_id"] is not None
    assert hello_seg["duration_ms"] > 0

    unicorn_seg = next(s for s in segments if s["gloss"] == "UNICORN")
    assert unicorn_seg["is_supported"] is False
    assert unicorn_seg["sign_id"] is None
    assert unicorn_seg["duration_ms"] == 0

    # Honesty notice check
    assert "needs linguist review" in data["honesty_notice"]


@pytest.mark.asyncio
async def test_hindi_translation_support(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verify Hindi text input maps to standard ISL glosses."""
    res = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "नमस्ते दोस्त", "source_language": "hi"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["source_language"] == "hi"
    assert "HELLO" in data["reordered_glosses"]
    assert "FRIEND" in data["reordered_glosses"]
    assert data["coverage"]["coverage_percentage"] == 100.0


@pytest.mark.asyncio
async def test_translation_persistence_and_retrieval(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verify translations and segments are persisted and retrievable via GET /api/v1/translate/{id}."""
    res = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "Please help friend", "save_history": True},
    )
    assert res.status_code == 200
    data = res.json()
    translation_id = data["translation_id"]

    # Verify database persistence
    db_trans = await db_session.scalar(
        select(Translation).where(Translation.id == uuid.UUID(translation_id))
    )
    assert db_trans is not None
    assert db_trans.direction == "TEXT_TO_ISL"
    assert db_trans.source_text == "Please help friend"
    assert len(db_trans.segments) == 3

    # Retrieve via API endpoint
    detail_res = await async_client.get(f"/api/v1/translate/{translation_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == translation_id
    assert len(detail["segments"]) == 3


@pytest.mark.asyncio
async def test_authenticated_user_translation_history(
    authenticated_client: tuple[AsyncClient, str, User],
    db_session: AsyncSession,
) -> None:
    """Verify translations created by authenticated users are linked to their user_id."""
    client, csrf_token, user = authenticated_client

    res = await client.post(
        "/api/v1/translate/text",
        json={"text": "Good water friend", "save_history": True},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res.status_code == 200
    data = res.json()
    translation_id = data["translation_id"]

    # Check user attribution
    db_trans = await db_session.scalar(
        select(Translation).where(Translation.id == uuid.UUID(translation_id))
    )
    assert db_trans is not None
    assert db_trans.user_id == user.id

    # Check user history endpoint includes it
    hist_res = await client.get("/api/v1/users/me/history")
    assert hist_res.status_code == 200
    history_items = hist_res.json()
    assert any(h["id"] == translation_id for h in history_items)


@pytest.mark.asyncio
async def test_translation_feedback_submission(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verify user feedback submission on translations."""
    # First create a translation
    t_res = await async_client.post(
        "/api/v1/translate/text",
        json={"text": "Water please"},
    )
    translation_id = t_res.json()["translation_id"]

    # Submit feedback
    fb_res = await async_client.post(
        f"/api/v1/translate/{translation_id}/feedback",
        json={
            "rating": 5,
            "feedback_text": "Accurate sign sequencing for ISL",
            "error_category": "other",
        },
    )
    assert fb_res.status_code == 200
    fb_data = fb_res.json()
    assert fb_data["rating"] == 5
    assert fb_data["translation_id"] == translation_id

    # Verify database persistence
    db_fb = await db_session.scalar(
        select(TranslationFeedback).where(
            TranslationFeedback.translation_id == uuid.UUID(translation_id)
        )
    )
    assert db_fb is not None
    assert db_fb.rating == 5
    assert db_fb.feedback_text == "Accurate sign sequencing for ISL"

    # Validation: reject rating out of bounds
    invalid_fb = await async_client.post(
        f"/api/v1/translate/{translation_id}/feedback",
        json={"rating": 6},
    )
    assert invalid_fb.status_code == 422

    # 404 on invalid translation ID
    missing_fb = await async_client.post(
        f"/api/v1/translate/{uuid.uuid4()}/feedback",
        json={"rating": 4},
    )
    assert missing_fb.status_code == 404


@pytest.mark.asyncio
async def test_supported_languages_endpoints(async_client: AsyncClient) -> None:
    """Verify supported language listing endpoints."""
    res = await async_client.get("/api/v1/translate/languages")
    assert res.status_code == 200
    langs = res.json()
    codes = [l["code"] for l in langs]
    assert "en" in codes
    assert "hi" in codes

    # Signs languages endpoint
    res_signs = await async_client.get("/api/v1/signs/languages")
    assert res_signs.status_code == 200
    signs_langs = res_signs.json()
    assert any(l["code"] == "isl" for l in signs_langs)
