# Copilot Instructions

## ⚠️  MANDATORY FIRST STEP — READ AGENTS.md

**Before ANY thinking, analysis, planning, or code change in this repository**, you MUST first read and consult `AGENTS.md` at the repository root. This is non-negotiable and applies to ALL interactions — not just code modifications.

`AGENTS.md` is the durable AI-facing navigation index for this project. It maps every feature area to the correct entry file, defines project structure, feature boundaries, and contains critical risk notes and debug lessons. Skipping it WILL lead to wrong assumptions and edits in the wrong place.

## Workflow

1. **FIRST**: Read `AGENTS.md` to understand the project structure, feature boundaries, and navigation index.
2. **THEN**: Use the relevant section of `AGENTS.md` to locate the correct route, server helper, worker, extension, script, or Prisma model that owns the behavior you need to analyze or modify.
3. **FINALLY**: Confirm you've identified the right files before proceeding with any analysis or editing.

## Reminder

- Run `git status --short` before editing. Do not overwrite user changes or unrelated untracked files.
- Keep changes small and local to the feature boundary.
- Never copy, print, commit, or summarize real values from `.env*`. Mention variable names only.
