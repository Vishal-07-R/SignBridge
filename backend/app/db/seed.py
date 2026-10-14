"""Database seed module for initial roles, permissions, and DEMO ISL vocabulary."""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sign import SignVocabulary
from app.models.user import Permission, Role

logger = logging.getLogger(__name__)

INITIAL_ROLES = [
    {"name": "admin", "description": "Full administrative access to the platform"},
    {"name": "linguist", "description": "ISL linguistic verification and vocabulary review"},
    {"name": "user", "description": "Standard user with translation and profile capabilities"},
]

INITIAL_PERMISSIONS = [
    {"code": "signs:read", "description": "View sign vocabulary entries"},
    {"code": "signs:create", "description": "Create new sign vocabulary entries"},
    {"code": "signs:update", "description": "Modify existing sign vocabulary entries"},
    {"code": "signs:delete", "description": "Remove sign vocabulary entries"},
    {"code": "signs:review", "description": "Review and verify sign linguistic accuracy"},
    {"code": "datasets:read", "description": "View datasets and import jobs"},
    {"code": "datasets:import", "description": "Trigger dataset import jobs"},
    {"code": "users:read", "description": "View user accounts"},
    {"code": "users:manage", "description": "Manage user accounts and role assignments"},
    {"code": "audit:read", "description": "Read security and administrative audit logs"},
    {"code": "system:settings", "description": "Read and update application settings"},
]

ROLE_PERMISSION_MAPPING = {
    "admin": [p["code"] for p in INITIAL_PERMISSIONS],
    "linguist": [
        "signs:read",
        "signs:create",
        "signs:update",
        "signs:review",
        "datasets:read",
    ],
    "user": [
        "signs:read",
    ],
}

# DEMO ISL vocabulary seed (flagged explicitly as demo and pending linguist review)
DEMO_SIGNS = [
    {
        "gloss": "HELLO",
        "category": "greetings",
        "description": "Standard greeting: open flat hand near temple moving gently forward.",
        "handshape": "Open B-hand",
        "location": "Temple / forehead side",
        "movement": "Forward gentle wave",
    },
    {
        "gloss": "THANK_YOU",
        "category": "courtesies",
        "description": (
            "Expression of gratitude: flat hand fingertips touching chin then moving "
            "forward toward the receiver."
        ),
        "handshape": "Flat open palm (B-hand)",
        "location": "Chin to neutral forward space",
        "movement": "Forward arc outward",
    },
    {
        "gloss": "PLEASE",
        "category": "courtesies",
        "description": (
            "Polite request: open flat palm placed on upper chest rubbing gently "
            "in clockwise circular motion."
        ),
        "handshape": "Flat open palm",
        "location": "Center of chest",
        "movement": "Clockwise circular rub",
    },
    {
        "gloss": "NAME",
        "category": "identity",
        "description": (
            "Identity inquiry or statement: extended index and middle fingers of both hands "
            "tapping together crosswise."
        ),
        "handshape": "H / U handshape (two fingers extended)",
        "location": "Neutral chest space",
        "movement": "Double downward tap",
    },
    {
        "gloss": "HELP",
        "category": "assistance",
        "description": (
            "Offer or call for assistance: dominant closed fist with thumb up resting on "
            "non-dominant open flat palm, rising together."
        ),
        "handshape": "Dominant A-hand/thumbs up on flat base hand",
        "location": "Mid-chest rising upward",
        "movement": "Upward lifting motion",
    },
    {
        "gloss": "YES",
        "category": "affirmation",
        "description": (
            "Affirmative response: closed fist nodding up and down from the wrist "
            "like a nodding head."
        ),
        "handshape": "S-hand (closed fist)",
        "location": "Forward neutral space",
        "movement": "Vertical wrist nodding twice",
    },
    {
        "gloss": "NO",
        "category": "negation",
        "description": (
            "Negative response: index and middle finger closing rapidly against thumb "
            "like a snapping beak."
        ),
        "handshape": "Index and middle fingers snapping to thumb",
        "location": "Forward neutral space",
        "movement": "Rapid pinching snap",
    },
    {
        "gloss": "WATER",
        "category": "essentials",
        "description": (
            "Essential drink: 'W' handshape (index, middle, ring fingers spread) index finger "
            "tapping side of chin twice."
        ),
        "handshape": "W-handshape",
        "location": "Side of chin / mouth",
        "movement": "Double tap against chin",
    },
    {
        "gloss": "GOOD",
        "category": "evaluation",
        "description": (
            "Positive evaluation: fingertips of flat dominant hand touching lips and moving "
            "outward into open palm of non-dominant hand."
        ),
        "handshape": "Flat B-hand",
        "location": "Lips moving outward",
        "movement": "Downward-forward descent",
    },
    {
        "gloss": "WELCOME",
        "category": "courtesies",
        "description": (
            "Welcoming gesture: open palms facing inward and sweeping in a welcoming "
            "curve toward the body."
        ),
        "handshape": "Open curved palms",
        "location": "Side periphery sweeping to center chest",
        "movement": "Inward welcoming sweep",
    },
    {
        "gloss": "SIGN",
        "category": "communication",
        "description": (
            "Sign language / signing: both index fingers rotating in alternating backward "
            "circular motions in neutral space."
        ),
        "handshape": "1-handshape (extended index fingers)",
        "location": "Chest level neutral space",
        "movement": "Alternating backward rolling circles",
    },
    {
        "gloss": "FRIEND",
        "category": "social",
        "description": (
            "Friendship bond: hooked index fingers linking right over left, then "
            "reversed left over right."
        ),
        "handshape": "X-handshape (hooked index fingers)",
        "location": "Chest level center space",
        "movement": "Interlocking hook tap and reverse",
    },
]


async def seed_roles_and_permissions(db: AsyncSession) -> None:
    """Seed initial roles, permissions, and their associations if not already present."""
    # Seed Permissions
    permission_map: dict[str, Permission] = {}
    for perm_data in INITIAL_PERMISSIONS:
        stmt = select(Permission).where(Permission.code == perm_data["code"])
        result = await db.execute(stmt)
        perm = result.scalar_one_or_none()
        if perm is None:
            perm = Permission(code=perm_data["code"], description=perm_data["description"])
            db.add(perm)
            await db.flush()
        permission_map[perm_data["code"]] = perm

    # Seed Roles
    for role_data in INITIAL_ROLES:
        stmt = (
            select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.name == role_data["name"])
        )
        result = await db.execute(stmt)
        role = result.scalar_one_or_none()
        if role is None:
            role = Role(name=role_data["name"], description=role_data["description"])
            db.add(role)
            await db.flush()
            # Reload with permissions after flush
            result = await db.execute(stmt)
            role = result.scalar_one()

        # Update role permissions
        target_codes = ROLE_PERMISSION_MAPPING.get(role_data["name"], [])
        current_codes = {p.code for p in role.permissions}
        for code in target_codes:
            if code not in current_codes and code in permission_map:
                role.permissions.append(permission_map[code])

    await db.commit()


async def seed_demo_vocabulary(db: AsyncSession) -> int:
    """Seed DEMO ISL signs flagged as demo and needing linguist review."""
    seeded_count = 0
    for sign_data in DEMO_SIGNS:
        stmt = select(SignVocabulary).where(SignVocabulary.gloss == sign_data["gloss"])
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing is None:
            sign = SignVocabulary(
                gloss=sign_data["gloss"],
                category=sign_data["category"],
                description=sign_data["description"],
                handshape=sign_data["handshape"],
                location=sign_data["location"],
                movement=sign_data["movement"],
                is_demo=True,  # Explicit demo flag
                is_reviewed=False,  # Explicit unreviewed flag
                linguist_notes="Demo seed - needs linguist review",  # Honesty rule 5
            )
            db.add(sign)
            seeded_count += 1

    await db.commit()
    return seeded_count


async def run_all_seeds(db: AsyncSession) -> None:
    """Execute all seed routines."""
    await seed_roles_and_permissions(db)
    count = await seed_demo_vocabulary(db)
    logger.info("Database seeding completed. DEMO signs seeded: %d", count)
