@AGENTS.md

## Claude Code specifics

- Start any request with `/devbox:deliver`. It reads `devbox status`, picks the lane and runs the next phase.
- Phase skills: `/devbox:intake`, `/devbox:spec`, `/devbox:grill`, `/devbox:design`, `/devbox:slice`,
  `/devbox:critique`, `/devbox:build`, `/devbox:verify`, `/devbox:review`, `/devbox:ship`, `/devbox:retro`.
  Helpers: `/devbox:tdd`, `/devbox:debug`, `/devbox:adr`, `/devbox:architecture`, `/devbox:humanize`.
- Subagents: `devbox:linus` (GO / THROW AWAY plan critic and its lenses), `devbox:implementer`
  (one task, test first, fresh context), `devbox:qa` (independent acceptance check).
- Use plan mode before edits that touch more than three files or any public interface.
- One feature per session. Clear context between phases; the next phase re-reads the files in `specs/`.
- Long AFK runs: approve the tasks, switch to a work branch, then `devbox run`. Each task gets a fresh session.
