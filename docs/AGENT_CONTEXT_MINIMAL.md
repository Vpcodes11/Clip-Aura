# Agent Context — Minimal Task Packet

Every ClipAura agent task must fit in a compact packet. Do not paste full tracker, history, logs, or file trees into prompts.

## Prompt Budget

| Scope | Max input tokens |
|-------|-----------------|
| Single-blocker task | 10,000 |
| Multi-step investigation | 20,000 |
| Broad audit | Only when explicitly requested |

If more context is needed, read specific files at runtime — don't stuff the prompt.

## Task Packet Template

```
Project: ClipAura (website LIVE, Private Beta ⛔ GATED, Public Launch 🔴 BLOCKED)
Blocker: [B-xxx] [one-line title]
Status: [PENDING / PARTIALLY FIXED]

Files to inspect:
- [file path]
- [file path]

Acceptance criteria (from tracker):
1. [criterion]
2. [criterion]

Scope limits:
- Do [specific action].
- Do not restart auditing, add features, touch website, or change gates.

Validation:
- python -m pytest [test files] -v
- python -m py_compile [changed files]

Response:
- Status
- Files changed
- Commands run
- Remaining blockers
```

## Rules

1. **One blocker per agent run.** Don't chain unrelated work.
2. **Read tracker sections on demand.** `docs/PRODUCTION_FIX_TRACKER.md` is the source of truth — grep or read the single B-xxx section you need.
3. **No full logs.** Paste only the specific error or assertion that matters.
4. **No old execution traces.** If a prior run failed, state the failure in one line, not the full traceback.
5. **No broad file trees.** Ask for specific files by path.
6. **No recursive reflection.** One plan → execute → one result. Don't re-plan after each tool call.
7. **No repo-wide audit** unless the user explicitly requests it.
8. **Keep gates unchanged.** Never mark Private Beta ready or Public Launch ready unless all blockers are resolved.

## Current State Snapshot

```
Website:   ✅ LIVE  (https://clip-aura-m.vercel.app/, 2026-05-22)
Beta:      ✅ READY (15/15 fixed, system-font fallback accepted)
Launch:    🔴 BLOCKED (0/14 resolved)

Remaining beta blockers:
  (none — B-track complete)

Deferred to Public Launch:
  B-004 custom fonts (Inter, Montserrat, Outfit, Komika Axis, The Bold Font)
```

Update this snapshot after each blocker fix.
