Read when: step 4 of every pass, writing `<dir>/findings.json`.

# Filing findings

`findings.json` is the only file of a pass you write; `pass.mjs report` builds `report.json` from it and the evidence. Shape and examples: `references/templates/findings.template.json`. Top-level keys: `findings` (required), `rejected`, `openDecisions`, `states`, `ledgers`, `pass`, `fixLoop` (references/fix-loop.md). Keys starting with `$` are comments; unknown keys and wrong types are errors. Never write ids, ranks, crops, the state matrix or the scorecard, or edit `report.json`: the build fingerprints it and every check rebuilds it.

## Account for everything

`pass.mjs report … --check` lists every audit candidate and compare FAIL row still to decide, one line each, with its key: never read `ds-audit.json` or `compare.json`. The build refuses to write a report until each input is filed or rejected:

| Input | File it | Reject it |
|---|---|---|
| Worklist item (`worklist.md`) | `"worklist": "<key>"` (or a list). Without a `pin` it is pinned on the item's crops (up to 5 states, plus the design); `state` defaults to the first item's. | `{ "worklist": ["<key>", …], "reason", "detail" }`; `worklist.md` prints complete rejections to paste. |
| Audit candidate | `{ "auditKey": "<key>" }`: complete and pinned; add only what you change. Token candidates require source verification (references/ds-audit.md), never `matches-design`. A finding may carry `auditKey` and `worklist` together. | `{ "auditKeys": ["<key>", …], "reason", "detail" }` |
| Compare FAIL row (coded prototype, Figma motion) | Usually nothing: a pinned finding covers rows inside its pin (same kind and property); for a leftover row `--check` prints the `covers` entry. | `{ "compare": { "kind", "state", "elementClass", "property" }, "reason", "detail" }` |
| Reviewer annotation (`annotations.json`) | `{ "annotation": "AN-001", "ledger", "region", "expected", "actual", "fix" }`; it sets severity, state and pin (references/review.md). | Only a person can. Disagree: `UNCLASSIFIED` with an open decision. |

A `covers` entry or `compare` matcher is `{ "kind", "state", "elementClass" | "selector" | "role" + "name" | "figmaNodeId", "property" }`. `detail` is a sentence (20+ characters). Every rejection is shown to the reviewer ("Rejected by the agent"); a rejected share above 5% of a page makes the verdict at least REVIEW.

**Rejection reasons.** Worklist items: `DATA` (content, not design) · `same` (rendering only, refused for an item above 2% of its page) · `duplicate` (+ `duplicateOf`: a finding's `ref`, or a covered worklist key) · `known-drift` (+ `knownDrift`) · `covered-by-audit` (+ `coveredBy`: an audit key you filed) · `matches-design` · `intentional` · `out-of-scope`. Audit candidates: the compare-row reasons plus `matches-design` for shared components only. Compare rows: `DATA` · `known-drift` · `intentional` · `duplicate` · `false-positive` (a browser default, not authored) · `out-of-scope`.

## Write a finding

Required: `ref`, `title`, `ledger`, `state`, `severity`, `region`, `expected`, `actual`, and `fix` (`summary` at least) for `FIX_CODE`. A worklist or audit key fills some of them.

- `ref`: a short unique name (an `auditKey` finding may go without). Ids follow refs and keys, not list order; two findings with the same identity need distinct refs.
- `title`: what is wrong in the code. "Page title is 28px instead of heading/lg". Never "the design lacks".
- `ledger`: `structure` (regions, order, copy, extra or missing elements) · `component` · `style` (a value or token) · `state` (a designed state missing or wrong) · `behavior` · `motion`.
- `state`: a row of the state matrix; in a multi-screen pass `<screen>/<state>`.
- `expected`, `actual`: `{ "value", "token" }`. Fill both tokens on a token mismatch (`actual.token: null`: hardcoded). Add `actual.source { file, line, snippet }` when known.
- `fix`: `{ "summary", "files", "effort" }` (effort 1: one line; 5: cross-cutting); `files` defaults to the source file. Leave `element` out on a pinned finding: the pin fills it. `acRef`: the ticket criterion, if any.

### Language

Match the pass locale (`pass.locale` / `--locale` from start). Scripts only localize report chrome; finding cards show the `title` (and other free text) you filed.

| Locale | Write in |
|---|---|
| `zh` | Chinese `title` (required). Prefer Chinese for free-text `region`, `expected.value`, `actual.value`, and `fix.summary`. Example title: `页面标题为 28px，应为 heading/lg（32px）`. |
| `en` or omitted | English (default). Example title: `Page title is 28px instead of heading/lg`. |

Do not change: `ref`, ledger/severity/resolution enums, selectors, token names, file paths, or quoted strings copied from the live page or Figma. Do not add a separate translation pass or re-capture for language alone.

One finding per divergence (one element, one property, one state).

**Mixed Figma text colours.** When the worklist shows `mixed-text-styles`, or design copy is one TEXT layer while the app splits a link (`<a>`) out of the sentence: compare the **link run** and the **body run** separately (Figma `textRuns` / character overrides). A PASS on the node's default fill does not clear a wrong link colour. File a `style` finding for the run that differs (expected token from that run, e.g. `primary-brown` on "Register here !").

**Parent chrome peeled onto children.** When Figma shows a parent INSTANCE / COMPONENT / FRAME with **fill, radius, stroke, and/or shadow** that visually wraps a group of children, and the app applies that fill/radius only to a subset (e.g. media) while the rest of the children sit on the page background:

- File a **`structure` (or `style`)** finding: expected parent-shell fill/radius/stroke/shadow on one wrapping container; actual missing or partial shell. Severity at least **WARNING** (often **BLOCKER** when the DS container no longer reads as designed).
- Do **not** treat this as settled by a `CANNOT_VERIFY` style row on an unmatched inner node, and do **not** bulk-`false-positive` reject the worklist crop when the side-by-side shows missing parent chrome.
- Pin the worklist region that covers the container; cite the Figma node id of the parent shell when known.

**Missing inter-section / section→footer gap.** When metadata Y delta between major siblings (last content bottom → footer top, or section N → N+1) is a clear band (e.g. 48–64px) and the app is flush or footer size/position is ≥24px early:

- File a **`style` spacing** finding (`property: gap` / region `about→footer`). Severity **WARNING** (or **BLOCKER** if the page reads glued to the footer).
- Do **not** only mention it inside a “cumulative vertical shift” note on another section, and do **not** reject the footer's `y` hint without a gap finding when the full-page tile shows no band.

## Severity

| Severity | Use for |
|---|---|
| `BLOCKER` | Visibly wrong: wrong or recreated component, a designed state, region or call to action missing, wrong colour or type role, copy that changes the meaning, no visible focus. Would the designer call the screen wrong at a glance? |
| `WARNING` | A difference of degree: 12px against 16px, radius or line height off, a hardcoded value that renders right, secondary copy casing, an extra element, motion missing or different. |
| `DS_CANDIDATE` | A design-system gap: a pattern recreated in several places, a value used everywhere in a category the system has no tokens for. Deviations from defined tokens are `FIX_CODE`, never a token-set gap. |
| `CANNOT_VERIFY` | An evidence gap you name (resolution `NONE`). `PASS` is derived; write it only for a verified fix. |

Only `BLOCKER`, `WARNING` and `DS_CANDIDATE` count toward match and findings settled.

## Resolution

- Leave it out for the default: `FIX_CODE` for an open severity, `NONE` for `CANNOT_VERIFY`.
- `DATA`: content, not design (values, names, dates, counts, rows). Needs `dataReason` (20+ characters) and a likely-DATA hint on every worklist region it names. Never for a component, motion or state finding, a design token or an audit candidate.
- `INTENTIONAL`: only with `knownDrift` or a person's acceptance in the review. A `signoff` you write shows as the agent's and stays open until a person confirms it there.
- `UNCLASSIFIED`: only a person can place it. Add to `openDecisions`: `{ "question", "options": [{ "label", "consequence" }], "recommendation", "relatedFindings": ["<ref>"] }`, recommending the design.
- Never `DISMISSED`: a person dismisses, through the review.

## Pins

Every open `FIX_CODE` finding needs a pin: a worklist key, an audit key, `"pin": { "selector": "h1.title" }` (the topmost match; the build prints which), or `"pin": { "grab": "<class>", "index": 0 }` (default classes `body`, `heading`, `text`, `button`, `link`, `input`, `feedback`). `"pins": [ {…}, { "side": "design", "figmaNode": "1:10" } ]` adds a design-side pin; `"state"` inside a pin pins another state. A typed `crop` must lie on that state's own image, at least 8×8 and at most 90% of it. Only for something absent from every capture give `unpinnedReason` instead: one sentence (20+ characters) naming what is absent and where.

## States

`states` overrides a state's result, always with a `note`. On a captured state only `CANNOT_VERIFY` (you could not check it, and why) or `MISSING_IN_CODE` (designed, but the code has no such state: file a pinned `BLOCKER`, ledger `state`). `NOT_SPECIFIED` is refused for a designed state. Never `PASS` or `FAIL`. A state captured identical to with-data ("Same page") needs a state finding, a `MISSING_IN_CODE` note, or a fixed driver.

## Known drifts

With `designSystem.knownDrifts` in the config, read that file once before filing. A listed drift is cited, not filed anew: `"knownDrift": "KD-3"` (it becomes `INTENTIONAL`; keep the severity). It must be an active entry with a "Signed off: <name>, <date>" line. When the build says "this looks like KD-n", cite it or explain: `"notKnownDrift": { "KD-n": "<why, 20+ characters>" }`.

## Grounding and coverage

- **Deployed target**: the capture is the evidence; local source only hints at the fix. Known deployed commit: `pass.target.deployedCommit`. `pass.app.url` cannot change the captured origin.
- **Part of a page** that cannot be captured whole is excused only by `pass.degradations`: `{ "step": "capture-coverage:<state>", "reason", "impact" }`. The state then counts as captured only in part (REVIEW).
