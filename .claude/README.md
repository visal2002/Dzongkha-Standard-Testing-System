# Claude Code configuration

This directory vendors [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
(v0.6.7, MIT — see `AGENT-SKILLS-LICENSE`) so the skills, commands and subagents are
available to everyone working in this repo without a per-machine plugin install.

## Layout

| Path | What it is |
|------|------------|
| `skills/` | 24 lifecycle skills (`spec-driven-development`, `test-driven-development`, `code-review-and-quality`, …). Claude activates these automatically, or you can invoke one by name. |
| `commands/` | 8 slash commands: `/spec`, `/plan`, `/build`, `/test`, `/review`, `/webperf`, `/code-simplify`, `/ship`. |
| `agents/` | 4 subagents: `code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor`. |
| `references/` | Shared checklists (security, performance, accessibility, testing patterns, definition of done, observability, orchestration) that the skills link to as `../../references/<file>.md`. |

The upstream `commands/` files reference skills as `agent-skills:<skill>`; because these are
installed as project skills rather than a plugin, that prefix has been stripped.

Upstream hooks (`hooks/` in the source repo) were not installed — they require a
`settings.json` hook registration and are optional.

## Updating

```bash
git clone --depth 1 https://github.com/addyosmani/agent-skills.git /tmp/agent-skills
rsync -a --delete /tmp/agent-skills/skills/           .claude/skills/
rsync -a --delete /tmp/agent-skills/references/       .claude/references/
rsync -a --delete /tmp/agent-skills/agents/           .claude/agents/
rsync -a --delete /tmp/agent-skills/.claude/commands/ .claude/commands/
sed -i 's/agent-skills://g' .claude/commands/*.md
```

Alternatively, install it as a plugin for just your own machine instead of vendoring:

```
/plugin marketplace add https://github.com/addyosmani/agent-skills.git
/plugin install agent-skills@addy-agent-skills
```
