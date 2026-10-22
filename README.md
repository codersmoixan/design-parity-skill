# design-parity

[中文](README.zh-CN.md)

Compare an implemented webpage with its design, screen by screen and state by state. The design is the source of truth. Data such as product names, prices, dates, and counts may differ. Components, design tokens, typography, color, spacing, sizing, radii, borders, shadows, icons, layer order, copy, every designed state, and motion must match.

The check uses the design-qa procedure in [SKILL.md](SKILL.md), based on upstream 0.2.3 (MIT, Copyright (c) 2026 Dimitris Niavis), with local forks/patches in this skill (linked-frame default, optional multi-screen, and related fixes). Its scripts capture pages, diff pixels, audit the design system, and write the report and fix plan. This skill does not reimplement those steps. Local changes do not bump the upstream 0.2.3 version.

## What it does

- Compare the whole page, not only the first screen. States include populated, empty, loading, error, hover, and focus.
- Record each difference as fix the code, intentional, data, dismissed by a person, waiting for a person, or already a match.
- Write `report.json`, an interactive `report.html`, and a fix plan.
- After a person reviews the report, change the code and recapture to confirm.
- Remember earlier dismissals. Run in CI.
- After the page matches the design, add states that exist only in code back into Figma.

The verdict is one of `PASS`, `REVIEW`, `FAIL`, or `INCOMPLETE`. `INCOMPLETE` means nothing was compared, so it is not a result. A high match percentage can still fail, because severity is counted separately.

## Out of scope

- A local `.fig` file. Use a Figma or prototype URL.
- The design does not change during a parity pass. Code moves toward the design.

## How to invoke it

Say which design and page to compare. These requests use this skill:

```text
Use design-parity to compare this page with the design.
Design: https://www.figma.com/design/...
Page: https://preview.example.com/home
```

```text
Make this page match Figma.
```

```text
Check the preview against the prototype.
Prototype: https://...
Page: http://127.0.0.1:3000
```

```text
Check ticket ABC-123.
```

A pasted message that starts with `Apply my design QA review` applies the decisions already sent from the report. It does not start a new comparison.

One invocation needs a design source and the page under test:

| Design source | Example |
|---|---|
| Figma file, frame, page, or section URL | `figma.com/design/...` |
| Figma prototype URL | `figma.com/proto/...` |
| Coded prototype | Figma Make, Framer, v0, Lovable, HTML, localhost |
| Ticket key | `ABC-123`, when the ticket names the design and the page |

The page may be local, a preview, or a staging URL.

## Single page vs multi-screen

**Default: one page only.** With one Figma frame URL (with `node-id`) and one app URL, only that **linked frame** is fetched. Sibling frames on the same Figma page (PLP, Cart, and so on) are not pulled.

```text
/design-parity Compare this page with the design.
Design: https://www.figma.com/design/...?node-id=373-79410
Page: https://www.clibee.global/pl_en
```

**To fetch sibling frames for several app routes**, say multi-screen / full site, and map each screen to a URL:

```text
/design-parity Full-site design QA (multi-screen).
Design: https://www.figma.com/design/...?node-id=... (page or section)
Use --multi-screen to fetch sibling frames.

Screen → URL:
- homepage → https://example.com/
- plp → https://example.com/plp
- cart → https://example.com/cart
(Skip or CANNOT_VERIFY frames with no URL.)
```

Or limit to a few screens and say to ignore the rest:

```text
/design-parity Multi-screen QA
Design: https://www.figma.com/design/v0c07HsRVOccvCXSTcWGpW/Clibee?node-id=373-79410&m=dev
  - Home → http://localhost:3000/pl_en
  - Product detail → http://localhost:3000/pl_en/pl-ea809.html
  - Cart → http://localhost:3000/pl_en/cart
Ignore other frames.
```

The agent uses `--multi-screen` for sibling frames, maps only the listed screens to routes, and ignores the rest in `frame-map.json` (e.g. keep Homepage / PDP-Not login / Cart only). Without “multi-screen”, the pass stays single-page.

## Report language (report.html)

If you ask in **Chinese**, the agent passes `--locale zh` and `report.html` chrome (tabs, buttons, labels) is Chinese. It also authors each finding `title` in Chinese in `findings.json` (what the review cards show; prefer Chinese for free-text `region` / expected / actual / `fix.summary` too). Any other language gets an English report and English titles (`--locale en` or omit). Scripts do not machine-translate titles; `ref`, enums, selectors, tokens, and quoted page/design copy stay as stored. This does **not** add capture, diff, or audit runtime — only the language used when filing findings.

## Before the first run

- Node.js 20 or newer.
- **Working directory** = the repository under test (commands and reports). **This skill folder** = tool deps (`pixelmatch`, `pngjs`, `playwright`); the app's `package.json` is not modified.
- Missing packages: run `ensure-deps.mjs`. With `DESIGN_QA_AUTO_INSTALL=1` or a prior consent file (`~/.design-qa/auto-install.json`), install without asking; otherwise ask once, then `ensure-deps.mjs --grant`.
- Put secrets and the choices below in the app repo's root `.env` / `.env.local` (or the shell). Scripts load those files automatically. A value already in `qa/ui/design-qa.config.json` wins. Never paste tokens into chat or commit `.env`. Do not put `.env` under `qa/ui`. Opt out of env loading: `DESIGN_QA_LOAD_ENV=0`.
- Signed-in Playwright sessions from `save-session` default to `qa/ui/.auth/` (gitignored via `qa/ui/.gitignore`), same idea as functional-test `qa/functional/.auth/` — keep project junk under the repo for cleanup; never commit the session file.
- On local and remote URLs, `start` asks about cookie/consent chrome (remote also asks signed-in) unless `DESIGN_QA_HIDE` and `DESIGN_QA_SIGNED_IN` are both set. When it does ask, answers go to `pre-capture-answers.json`, then `ack-pre-capture`.

Commands run from the repository under test. A `node scripts/...` path in `SKILL.md` points at this skill's `scripts/` directory. Chained Next commands use `seq.mjs` (not shell `&&`) so PowerShell works.

## Environment variables

Scripts read these from the repository-root `.env` / `.env.local` or the shell. If a variable is set, that value is used and you are not asked again. If it is unset, you are asked. A value already stored in `qa/ui/design-qa.config.json` wins over `.env`.

| Variable | When it is set |
|---|---|
| `DESIGN_QA_AUTO_INSTALL=1` | Install skill-folder packages without asking. `0` never auto-installs. Unset: use `~/.design-qa/auto-install.json` from a prior consent. |
| `FIGMA_TOKEN` | Fetch the design with REST. Do not connect Figma MCP. |
| `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | All three set: do not ask for Jira credentials. `JIRA_BASE_URL` is also the Jira site URL when the config has none. |
| `DESIGN_QA_HIDE` | `none` (hide nothing), `find` (look for the banner; not saved), or a JSON preCapture object. |
| `DESIGN_QA_SIGNED_IN` | `true` or `false`. Both this and `DESIGN_QA_HIDE` must be set to skip the remote cookie / signed-in question. `true` without a saved session opens a browser window; you sign in there. |
| `DESIGN_QA_APP_STORAGE_STATE` | Use this saved session. Prefix follows `app.auth.envPrefix` (default `DESIGN_QA_APP`). Default on disk: `qa/ui/.auth/<host>.json` (gitignored; not `~/.design-qa/sessions/`). |
| `DESIGN_QA_APP_COOKIE` | Sign in with this cookie. |
| `DESIGN_QA_APP_USER`, `DESIGN_QA_APP_PASS`, `DESIGN_QA_APP_AUTH=basic` | HTTP basic auth. An auth type already in the config wins. A missing or expired session is still asked. |
| `DESIGN_QA_LOAD_ENV=0` | Do not load `.env` / `.env.local`. |

## How one pass runs

Each script prints the next command when it finishes. Run that command as printed. Do not skip a stage or edit the path.

```text
Start
  → Fetch the design
  → Capture the page and compare
  → Record judgments
  → Build the report
  → Review
  → Finish
```

1. **Start.** Record the feature name, design URL, and page URL. Create this run's report directory and run id. If the script asks questions, answer them in one round. Sign in inside the window it opens.
2. **Fetch the design.** With a Figma token, the script fetches frames (linked frame only by default; `--multi-screen` pulls siblings). Without a token, the Figma connection reads the structure, then captures one 1x screenshot per state. A coded prototype is recorded per screen and state, such as an empty cart at `?empty=1`. A ticket is read first.
3. **Capture and compare.** Capture the whole page for every designed state, then diff and audit. A state that was not captured is named. The report is refused when the page lacks that state or the capture driver is wrong.
4. **Record judgments.** Compare the side-by-side tiles and the measured values. Every difference becomes a finding or a rejection with a reason. Use the values the script read. Do not measure pixels by hand.
5. **Build the report.** Write `report.json`, `report.html`, and the fix plan. Earlier dismissals are applied again.
6. **Review.** Open the report. Choose fix now or debt, dismiss with a reason, and mark anything the pass missed. Decisions are applied, and the code is recaptured, only after the review is sent. Closing the report without sending does not apply them.
7. **Finish.** The script prints that the pass is finished. The reply includes the verdict line, the fix-now items, design-system mismatch counts, and the path to `report.html`.

## Commands after a pass

| Request | Effect |
|---|---|
| Paste a message that starts with `Apply my design QA review` | Apply the decisions already sent from the report |
| Fix specific ids now, or dismiss one | Update those findings by id |
| Backfill undesigned states | After parity, add states that exist only in code to Figma |
| Run in CI | Missing inputs fail without questions. The gate result is the CI result |

## Layout

```text
design-parity/
├── SKILL.md                 Instructions for the agent (merged UI QA + design-qa procedure)
├── README.md                This file
├── README.zh-CN.md          Chinese
├── scripts/                 Capture, diff, report, review (upstream 0.2.3 + local patches)
├── references/              Detail read only when a stage needs it
├── schemas/                 Report and config shapes
├── templates/               HTML report template
└── package.json             Skill-folder deps (pixelmatch, pngjs, playwright)
```
