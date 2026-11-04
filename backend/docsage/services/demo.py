import logging

from sqlalchemy import select

from ..config import settings
from ..db import SessionLocal
from ..models import User
from ..security import hash_password, verify_password

log = logging.getLogger("docsage.demo")


async def ensure_demo_user() -> None:
    """Create (or refresh) the optional demo account from DEMO_EMAIL / DEMO_PASSWORD.

    The credentials come only from the environment, so they never ship in the code or appear in the UI.
    Skipped unless both are set, and never runs in production.
    """
    if not (settings.demo_email and settings.demo_password):
        return
    if settings.is_production:
        log.warning("DEMO_EMAIL is set but ignored because ENVIRONMENT=production.")
        return

    email = settings.demo_email.strip().lower()
    async with SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email))
        if user is None:
            session.add(
                User(email=email, name=settings.demo_name, password_hash=hash_password(settings.demo_password), email_verified=True)
            )
            log.info("Created the demo account.")
        else:
            user.email_verified = True
            if not verify_password(settings.demo_password, user.password_hash):
                user.password_hash = hash_password(settings.demo_password)
                log.info("Refreshed the demo account password.")
        await session.commit()
