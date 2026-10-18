---
name: ui-quality-testing
description: >
  Checks a rendered webpage against its design for components, tokens,
  typography, color, spacing, sizing, radii, borders, shadows, icons, layer
  order, copy, designed states, and motion. The bundled design-qa procedure
  is the source of truth for capture, diff, findings, the HTML report, and
  the fix plan. Use when the user asks for webpage design QA, visual QA,
  design parity, or to compare styles, spacing, or copy with a design; says
  make it match Figma or the prototype; shares a figma.com or prototype URL
  to check an app, preview, or staging URL; gives a ticket key to verify or
  check; or pastes a message that starts with "Apply my design QA review".
  Also use for design-qa backfill after parity.
---

# UI Quality Testing

Compare a built page with its design. The design is the source of truth. Data values may differ. Components, tokens, typography, color, spacing, sizing, radii, borders, shadows, icons, layer order, copy, designed states, and motion must match.

## Bundled procedure

Design parity is the bundled [design-qa](design-qa/SKILL.md) skill, based on upstream 0.2.3 (MIT, Copyright (c) 2026 Dimitris Niavis, https://github.com/NiavisDimitris/skills), with local forks/patches in this skill (single-frame default, Windows seq, frame-map batch, pre-capture prompts). Do not reimplement capture, diff, audit, findings, the HTML report, review, or backfill. Do not bump the upstream version number for local changes.

1. Read [design-qa/SKILL.md](design-qa/SKILL.md) and follow it from Start through Finish. Its `Do:` and `Next:` lines override this file.
2. Resolve paths from the `design-qa` directory next to this file, not from the app repository. When that file says `node scripts/<name>.mjs` or `references/<name>.md`, use `design-qa/scripts/<name>.mjs` and `design-qa/references/<name>.md`. Run the commands from the repository under test. Copy every printed `Next:` command exactly (chained steps use `seq.mjs`, not shell `&&`).
3. Write the pass only inside the report directory that `pass.mjs start` prints.

A pass is not finished until `pass.mjs finish` prints that it is finished, or the bundled skill says the pass is blocked. The user-facing reply is the reply specified in `design-qa/SKILL.md`.

## Inputs

Accept a Figma file, frame, page, or section URL, a Figma prototype URL, or a coded prototype (Figma Make, Framer, v0, Lovable, HTML, or localhost), plus the app, preview, or staging URL. A ticket key is enough to start when the bundled skill can read the ticket.

A local `.fig` file is not an input. Ask for the Figma or prototype URL instead of decoding the file.

**Scope default:** One Figma frame link + one app URL → fetch that frame only. Use `pass.mjs start --multi-screen` (or `figma-fetch --screens auto`) only when the person wants every sibling screen on the Figma page compared to multiple app routes.

**Report language:** If the person's message is Chinese (contains Chinese characters), pass `--locale zh` on `pass.mjs start` (and on `report` if overriding) so `report.html` UI is Chinese. Any other language → `--locale en` or omit (English). Finding titles and evidence text are not auto-translated.

## Rules that always apply

- Change code to match the design. Do not change the design during a parity pass.
- A section the app hides on purpose is a finding. Only data values, names, dates, counts, and row contents may differ.
- A state that exists only in the app is not a parity finding. It waits for design backfill.
- Do not dismiss a finding, invent pixel boxes, or hand-write `report.json` or `annotations.json`.
- Do not type, ask for, print, or store a token or password. Sign-in stays with the bundled skill. If someone pastes a Figma token into chat, tell them to rotate it and never echo it back. Prefer `FIGMA_TOKEN` (and other secrets) in the app repo's `.env` / `.env.local`; scripts load those into the environment automatically when unset in the shell. Never commit `.env`.
- Skill deps (`pixelmatch`, `pngjs`, `playwright`) install only in this skill's `design-qa` folder — not in the app repository. Commands still run from the repository under test (cwd). Node.js 20 or newer required.
- If those packages cannot be resolved: run `node …/design-qa/scripts/ensure-deps.mjs`. Exit 0 → continue. Exit 3 → ask once to install in the skill folder (does not modify the app repo); on yes run `ensure-deps.mjs --grant` (writes `~/.design-qa/auto-install.json` so later passes need not ask). When `DESIGN_QA_AUTO_INSTALL=1` or that consent file exists, run `ensure-deps.mjs` without asking. Still ask before migrations or seeds.
- Before the first live capture: ask once about cookie/consent banners and whether the design expects a signed-in session (references/browser-capture.md).
- When evidence reports unlisted worklist differences, expand the worklist before writing `findings.json` (follow the printed `Do:`).

## Shell notes (Windows)

Printed `Next:` lines that must run two scripts use `node …/seq.mjs -- '<cmd1>' -- '<cmd2>'` so PowerShell works. Never rewrite those into `&&`. If an older log still shows `&&`, run each segment in order and stop on non-zero exit.
