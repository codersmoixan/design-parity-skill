# ui-quality-testing

[中文](README.zh-CN.md)

Compare an implemented webpage with its design, screen by screen and state by state. The design is the source of truth. Data such as product names, prices, dates, and counts may differ. Components, design tokens, typography, color, spacing, sizing, radii, borders, shadows, icons, layer order, copy, every designed state, and motion must match.

The check uses the bundled [design-qa](design-qa/SKILL.md) 0.2.3 procedure (MIT, Copyright (c) 2026 Dimitris Niavis). Its scripts capture pages, diff pixels, audit the design system, and write the report and fix plan. This skill does not reimplement those steps.

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
Use ui-quality-testing to compare this page with the design.
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

## Before the first run

- Node.js 20 or newer.
- Install `pixelmatch`, `pngjs`, and `playwright` in the `design-qa` directory. The agent asks before installing.
- Read Figma through a signed-in Figma connection, or with `FIGMA_TOKEN` when that connection is unavailable. Sign-in opens in a window. Do not paste a token or password into the chat.

Commands run from the repository under test. A `node scripts/...` path in `design-qa/SKILL.md` points at this skill's `design-qa/scripts/` directory.

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
2. **Fetch the design.** With a Figma token, the script fetches the frames. Without a token, the Figma connection reads the structure, then captures one 1x screenshot per state. A coded prototype is recorded per screen and state, such as an empty cart at `?empty=1`. A ticket is read first.
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
ui-quality-testing/
├── SKILL.md                 Instructions for the agent
├── README.md                This file
├── README.zh-CN.md          Chinese
└── design-qa/               Bundled design-qa 0.2.3
    ├── SKILL.md             Commands and exit codes
    ├── scripts/             Capture, diff, report, review
    ├── references/          Detail read only when a stage needs it
    ├── schemas/             Report and config shapes
    └── templates/           HTML report template
```
