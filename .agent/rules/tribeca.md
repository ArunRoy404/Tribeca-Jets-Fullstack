---
trigger: always_on
---

# Tribeca Jets — workspace rule

The rules for this repository live in `AGENTS.md` at the root, and only there.
At the start of every conversation read `HANDOFF.md`, `AGENTS.md` and
`docs/REVIEW_PLAYBOOK.md` before proposing or changing anything.

Non-negotiable, even before reading them:
- Never `git commit` or `git push` unless the owner says so in that message.
- Stay inside the module under review; never remove a UI feature without asking.
- Frontend is JavaScript, backend is TypeScript ESM — never convert either.
- Never run `npm run db:seed` or reset the database without the owner's consent.
- Before the session ends, update `HANDOFF.md` (tracker, what is next, session log).
