"""Content safety moderation for AI-generated clip content.

Performs lightweight pattern-based safety checks on clip titles,
hook captions, and hashtags before rendering and before final output.
Designed as a safety gate - flags potentially harmful content for
human review rather than silently passing it through.
"""

import logging
import re

logger = logging.getLogger("clipaura.moderation")

# Patterns that should be flagged. These are conservative - designed to catch
# unambiguously harmful content without false-flagging normal speech.
_SAFETY_BLOCKLIST = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\b(hate\s*crime|genocide|terroris\w*)\b",
        r"\b(rape|sexual\s*assault|child\s*porn)\b",
        r"\b(mass\s*shooting|school\s*shooting)\b",
        r"\b(hardcore\s*(porn|sex)|explicit\s*sexual)\b",
        r"\b(white\s*supremac\w*|neo[\s-]*nazi)\b",
    ]
]


def flag_safety_issues(clip_title: str, hook_caption: str, hashtags: list[str]) -> list[str]:
    """Check clip content against safety patterns. Returns list of issue descriptions."""
    issues = []
    combined = f"{clip_title or ''} {hook_caption or ''} {' '.join(hashtags or [])}"

    for pattern in _SAFETY_BLOCKLIST:
        match = pattern.search(combined)
        if match:
            issues.append(f"Safety pattern matched: '{match.group()}'")

    return issues


def moderate_clips(clips: list[dict]) -> tuple[list[dict], list[str]]:
    """Filter clips through content safety checks.

    Returns (safe_clips, flagged_reasons).
    Clips that trigger safety patterns are excluded from safe_clips.
    """
    safe = []
    flagged = []

    for i, clip in enumerate(clips):
        title = str(clip.get("title", ""))
        hook = str(clip.get("hook_caption", ""))
        tags = clip.get("hashtags", [])

        issues = flag_safety_issues(title, hook, tags)
        if issues:
            logger.warning(
                "Content safety flag on clip",
                extra={
                    "_structured_fields": {
                        "clip_index": i,
                        "title": title[:100],
                        "issues": issues,
                    }
                },
            )
            flagged.append(f"Clip {i}: {', '.join(issues)}")
        else:
            safe.append(clip)

    return safe, flagged
