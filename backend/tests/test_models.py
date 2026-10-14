"""Tests for all 16 relational database models, constraints, cascades, and DEMO seed."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.seed import seed_demo_vocabulary
from app.models.audit import AuditLog
from app.models.dataset import DatasetImportJob, DatasetSource
from app.models.job import VideoProcessingJob
from app.models.setting import ApplicationSetting
from app.models.sign import SignAnimationAsset, SignReview, SignVocabulary
from app.models.translation import Translation, TranslationFeedback, TranslationSegment
from app.models.user import Role, User, UserPreference, UserSession


async def test_all_16_tables_persistence(db_session: AsyncSession, normal_user: User) -> None:
    """Verify records can be created, persisted, and queried across all 16 required tables."""
    # 1. User (already created via fixture)
    assert normal_user.id is not None

    # 2. Role & 3. Permission
    role = await db_session.scalar(
        select(Role).options(selectinload(Role.permissions)).where(Role.name == "user")
    )
    assert role is not None
    assert len(role.permissions) > 0

    # 4. UserSession
    session = UserSession(
        user_id=normal_user.id,
        session_token_hash="hash_" + uuid.uuid4().hex,
        csrf_secret="csrf_" + uuid.uuid4().hex,
        expires_at=normal_user.created_at,
    )
    db_session.add(session)

    # 5. UserPreference
    pref = await db_session.scalar(
        select(UserPreference).where(UserPreference.user_id == normal_user.id)
    )
    assert pref is not None

    # 6. SignVocabulary
    sign = SignVocabulary(
        gloss=f"TEST_SIGN_{uuid.uuid4().hex[:6]}",
        category="testing",
        description="A test sign description",
        is_demo=True,
        is_reviewed=False,
        linguist_notes="needs linguist review",
    )
    db_session.add(sign)
    await db_session.flush()

    # 7. SignAnimationAsset
    asset = SignAnimationAsset(
        sign_id=sign.id,
        asset_url="s3://test/asset.glb",
        format="glb",
        duration_seconds=1.5,
    )
    db_session.add(asset)

    # 8. SignReview
    review = SignReview(
        sign_id=sign.id,
        reviewer_id=normal_user.id,
        status="needs_revision",
        notes="Review test notes",
    )
    db_session.add(review)

    # 9. Translation
    translation = Translation(
        user_id=normal_user.id,
        direction="TEXT_TO_ISL",
        source_text="Hello friend",
        status="completed",
    )
    db_session.add(translation)
    await db_session.flush()

    # 10. TranslationSegment
    segment = TranslationSegment(
        translation_id=translation.id,
        sequence_order=1,
        source_token="Hello",
        sign_id=sign.id,
        confidence=0.98,
    )
    db_session.add(segment)

    # 11. TranslationFeedback
    feedback = TranslationFeedback(
        translation_id=translation.id,
        user_id=normal_user.id,
        rating=5,
        feedback_text="Very accurate!",
    )
    db_session.add(feedback)

    # 12. DatasetSource
    source = DatasetSource(
        name="Test Dataset",
        licence="CC-BY-4.0",
        is_verified=True,
    )
    db_session.add(source)
    await db_session.flush()

    # 13. DatasetImportJob
    import_job = DatasetImportJob(
        source_id=source.id,
        initiated_by=normal_user.id,
        status="pending",
    )
    db_session.add(import_job)

    # 14. VideoProcessingJob
    video_job = VideoProcessingJob(
        user_id=normal_user.id,
        job_type="ocr",
        status="queued",
        input_file_path="/uploads/test.mp4",
    )
    db_session.add(video_job)

    # 15. AuditLog
    audit = AuditLog(
        user_id=normal_user.id,
        action="TEST_ACTION",
        entity_type="test",
        entity_id=str(normal_user.id),
    )
    db_session.add(audit)

    # 16. ApplicationSetting
    setting = ApplicationSetting(
        key=f"test_setting_{uuid.uuid4().hex[:6]}",
        value={"active": True},
        description="Setting test",
        is_public=True,
    )
    db_session.add(setting)

    await db_session.commit()

    # Verify query for created setting
    fetched_setting = await db_session.scalar(
        select(ApplicationSetting).where(ApplicationSetting.id == setting.id)
    )
    assert fetched_setting is not None
    assert fetched_setting.value == {"active": True}


async def test_cascade_deletion(db_session: AsyncSession) -> None:
    """Verify cascading deletes on user and translation entities."""
    # Create user with session and translation
    user = User(
        email=f"cascade_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="hash",
        full_name="Cascade User",
    )
    db_session.add(user)
    await db_session.flush()

    session = UserSession(
        user_id=user.id,
        session_token_hash="hash_" + uuid.uuid4().hex,
        csrf_secret="csrf_" + uuid.uuid4().hex,
        expires_at=user.created_at,
    )
    db_session.add(session)

    translation = Translation(
        user_id=user.id,
        direction="TEXT_TO_ISL",
        source_text="Cascade test",
    )
    db_session.add(translation)
    await db_session.flush()

    segment = TranslationSegment(
        translation_id=translation.id,
        sequence_order=1,
        source_token="test",
    )
    db_session.add(segment)
    await db_session.commit()

    # Deleting user should cascade delete the session
    session_id = session.id
    translation_id = translation.id
    segment_id = segment.id

    await db_session.delete(user)
    await db_session.commit()

    # Session must be deleted
    assert await db_session.scalar(select(UserSession).where(UserSession.id == session_id)) is None

    # Translation user_id must be SET NULL
    remaining_trans = await db_session.scalar(
        select(Translation).where(Translation.id == translation_id)
    )
    assert remaining_trans is not None
    assert remaining_trans.user_id is None

    # Deleting translation should cascade delete the segment
    await db_session.delete(remaining_trans)
    await db_session.commit()

    assert (
        await db_session.scalar(
            select(TranslationSegment).where(TranslationSegment.id == segment_id)
        )
        is None
    )


async def test_demo_vocabulary_honesty_flags(db_session: AsyncSession) -> None:
    """Verify DEMO vocabulary signs are explicitly flagged as demo and unreviewed."""
    await seed_demo_vocabulary(db_session)

    stmt = select(SignVocabulary).where(SignVocabulary.is_demo.is_(True))
    result = await db_session.execute(stmt)
    demo_signs = result.scalars().all()

    assert len(demo_signs) >= 12
    for sign in demo_signs:
        assert sign.is_demo is True
        assert sign.is_reviewed is False
        assert "needs linguist review" in sign.linguist_notes.lower()
