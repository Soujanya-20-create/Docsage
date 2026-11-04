"""Send transactional email through Resend's HTTP API or any SMTP server.

With neither configured, development prints the message so codes can be read locally. Production
only logs a warning: the codes are credentials and must not end up in logs.
"""
import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage

import httpx

from ..config import settings

log = logging.getLogger(__name__)


def _send_smtp(to: str, subject: str, text: str) -> None:
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.email_from, to, subject
    msg.set_content(text)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        server.starttls(context=ssl.create_default_context())
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


async def send_email(to: str, subject: str, text: str) -> bool:
    """Returns True if the message was handed to a provider. Never raises: callers must not leak failures."""
    # Resend first; if it refuses (for example the free test sender only delivers to its owner),
    # fall back to SMTP so the message still goes out when both are configured.
    attempted = False
    if settings.resend_api_key:
        attempted = True
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                    json={"from": settings.email_from, "to": [to], "subject": subject, "text": text},
                )
                resp.raise_for_status()
            return True
        except Exception:  # noqa: BLE001
            log.exception("Sending email through Resend failed")
    if settings.smtp_host:
        attempted = True
        try:
            await asyncio.to_thread(_send_smtp, to, subject, text)
            return True
        except Exception:  # noqa: BLE001
            log.exception("Sending email through SMTP failed")
    if attempted:
        return False

    if settings.is_production:
        log.warning("Email is not configured; a message was not sent. Set RESEND_API_KEY or SMTP_HOST.")
    else:
        log.info("EMAIL (not configured, printed instead)\nTo: %s\nSubject: %s\n\n%s", to, subject, text)
    return False


def _code_email(subject: str, intro: str, code: str, minutes: int) -> tuple[str, str]:
    spaced = f"{code[:3]} {code[3:]}"
    body = (
        f"{intro}\n\n    {spaced}\n\n"
        f"The code works once and expires in {minutes} minutes. Never share it with anyone. "
        "If you did not ask for it, you can ignore this message."
    )
    return subject, body


def verification_email(code: str) -> tuple[str, str]:
    return _code_email(
        f"{code} is your DocSage confirmation code",
        "Welcome to DocSage. Enter this code to confirm your email address:",
        code,
        settings.otp_minutes,
    )


def reset_email(code: str) -> tuple[str, str]:
    return _code_email(
        f"{code} is your DocSage password reset code",
        "Someone asked to reset the password for this account. Enter this code to choose a new one:",
        code,
        settings.otp_minutes,
    )
