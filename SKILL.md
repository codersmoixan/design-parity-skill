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

## UI project directory

The repository under test is the working directory. On every pass, create `qa/ui` at that repository root when it is missing. `pass.mjs start` and `setup.mjs check` do this themselves.

Every UI-test project file this skill generates goes under `qa/ui`, not the repository root and not `qa-reports/`:

- `qa/ui/design-qa.config.json` — created when the repository has no config yet. An existing `./design-qa.config.json` is still read.
- `qa/ui/<slug>/` — that pass: evidence, `findings.json`, `report.html`, logs.
- `qa/ui/dismissed.json`, `qa/ui/design-debt.md`, and the other cumulative logs, beside the feature folders.

`report.outDir` is `qa/ui`. An old `qa-reports` value is treated as `qa/ui`. A pass folder is `qa/ui/<slug>`, never `qa/ui` itself (that folder also holds the config). `.env` stays at the repository root and is not read from `qa/ui`.

A pass is not finished until `pass.mjs finish` prints that it is finished, or the bundled skill says the pass is blocked. The user-facing reply is the reply specified in `design-qa/SKILL.md`.

## When waiting on the person (hard rule)

Whenever `pass.mjs` exits **3**, or a `Do:` line says to ask / tell the person (including **Ask the person** / pre-capture chrome):

1. Your **next chat message** must ask those questions in the person's language, with the printed options (or a clear reply format).
2. Do **not** end the turn with only tool/log output, and do **not** run `Next:` until they reply (or explicitly say to use defaults / skip).
3. Prefer copying the printed `Ask the person` / `Question` block into chat; do not bury it inside a silent tool loop.

Remote app URLs (preview / staging / prod): `start` exits 3 with pre-capture questions before the first live capture, unless the repository-root `.env` (or the shell) already sets both `DESIGN_QA_HIDE` and `DESIGN_QA_SIGNED_IN`. When those are set, do not ask. When the block is printed, after they answer, write `<dir>/pre-capture-answers.json` and run the printed `Next:` (`ack-pre-capture`, then design fetch / evidence).

**Root `.env` before any question.** Scripts load `.env` / `.env.local` from the repository root (never from `qa/ui`). If a variable below is set, use it and do not ask. If it is unset, ask as usual. A value already in `qa/ui/design-qa.config.json` wins over `.env`.

| Set in `.env` | Do not ask |
|---|---|
| `DESIGN_QA_AUTO_INSTALL=1` | Skill-folder package install |
| `FIGMA_TOKEN` | Figma MCP auth (`--agent figma-mcp=no`, REST) |
| `JIRA_BASE_URL` + `JIRA_EMAIL` + `JIRA_API_TOKEN` | Jira credentials and the Jira site URL |
| `DESIGN_QA_HIDE` and `DESIGN_QA_SIGNED_IN` | Remote cookie/consent/chat and signed-in header (both required) |
| `<prefix>_STORAGE_STATE`, `<prefix>_COOKIE`, or `<prefix>_USER` + `<prefix>_PASS` with `<prefix>_AUTH=basic` | App auth type. Default prefix is `DESIGN_QA_APP`. Still ask when the saved session is missing or the probe still sees a sign-in page. |

## Inputs

Accept a Figma file, frame, page, or section URL, a Figma prototype URL, or a coded prototype (Figma Make, Framer, v0, Lovable, HTML, or localhost), plus the app, preview, or staging URL. A ticket key is enough to start when the bundled skill can read the ticket.

A local `.fig` file is not an input. Ask for the Figma or prototype URL instead of decoding the file.

**Scope default:** One Figma frame link + one app URL → fetch that frame only. Use `pass.mjs start --multi-screen` (or `figma-fetch --screens auto`) only when the person wants every sibling screen on the Figma page compared to multiple app routes.

**Report language:** If the person's message is Chinese (contains Chinese characters), pass `--locale zh` on `pass.mjs start` (and on `report` if overriding) so `report.html` UI is Chinese. Any other language → `--locale en` or omit (English).

**Finding card language (agent-authored, not machine translation):** When `--locale zh` (Chinese request), write every finding's `title` in Chinese in `findings.json` — that is what the review cards show. Also prefer Chinese for `region`, `expected.value` / `actual.value` prose, and `fix.summary` when those are free text. Keep `ref`, ledger enums, selectors, tokens, and quoted UI copy from the page/design unchanged. When locale is `en`, keep those fields in English. Do **not** add an extra translate step or re-run capture/diff for language alone — titles are written once while filing findings.

## Figma access (token first)

Before `pass.mjs start`, decide Figma access in this order — do **not** authenticate or call Figma MCP when a token is available:

1. **Repo `.env` / `.env.local` has `FIGMA_TOKEN`** (or it is already set in the shell) → pass `--agent figma-mcp=no`. Design fetch is REST via the printed `figma-fetch.mjs` command. Scripts load those files automatically when unset in the shell; never open `.env` to print or paste the value.
2. **No token** → only then use Figma MCP (`--agent figma-mcp=yes` if tools are listed, loaded, and signed in), following the MCP path in `design-qa/SKILL.md`.
3. Never prefer MCP over a working token. If both exist, ignore MCP and use `figma-fetch`.

## Rules that always apply

- Change code to match the design. Do not change the design during a parity pass.
- A section the app hides on purpose is a finding. Only data values, names, dates, counts, and row contents may differ.
- A state that exists only in the app is not a parity finding. It waits for design backfill.
- Do not dismiss a finding, invent pixel boxes, or hand-write `report.json` or `annotations.json`.
- Do not type, ask for, print, or store a token or password. Sign-in stays with the bundled skill. If someone pastes a Figma token into chat, tell them to rotate it and never echo it back. Prefer `FIGMA_TOKEN` (and other secrets) in the app repo's `.env` / `.env.local` at the repository root; scripts load those into the environment automatically when unset in the shell. Never commit `.env`. Do not look for `.env` under `qa/ui`.
- Skill deps (`pixelmatch`, `pngjs`, `playwright`) install only in this skill's `design-qa` folder — not in the app repository. Commands still run from the repository under test (cwd). Node.js 20 or newer required.
- If those packages cannot be resolved: run `node …/design-qa/scripts/ensure-deps.mjs`. Exit 0 → continue. Exit 3 → ask once to install in the skill folder (does not modify the app repo); on yes run `ensure-deps.mjs --grant` (writes `~/.design-qa/auto-install.json` so later passes need not ask). When `DESIGN_QA_AUTO_INSTALL=1` or that consent file exists, run `ensure-deps.mjs` without asking. Still ask before migrations or seeds.
- Before the first live capture on a remote URL: `start` exits 3 with Ask-the-person questions — surface them in chat (see hard rule above); do not skip to evidence (references/browser-capture.md).
- When evidence reports unlisted worklist differences, expand the worklist before writing `findings.json` (follow the printed `Do:`).

## Shell notes (Windows)

Printed `Next:` lines that must run two scripts use `node …/seq.mjs -- '<cmd1>' -- '<cmd2>'` so PowerShell works. Never rewrite those into `&&`. If an older log still shows `&&`, run each segment in order and stop on non-zero exit.
