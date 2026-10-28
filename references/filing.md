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

**`covers` / compare reject must not swallow unnamed issues (hard rule).** A `covers` entry or compare `rejected` row only means “this FAIL row is decided.” It does **not** replace a finding card. Allowed only when:

| Allowed | Not allowed |
|---|---|
| The open finding’s `title` / `expected` / `actual` already name **that same element and property** (or a true `duplicate` of that finding’s `ref`) | Clearing icon **width/height**, extra copy, or logo colour by hanging `covers` on a neighbour finding (e.g. logo lockup covering social-icon size) |
| Browser-default noise with reason `false-positive` (e.g. `letter-spacing` `0px` → `normal`; font stack string that still loads the same family) | Bulk-attaching every leftover `elementClass` in a footer/header band so `--check` passes while size/copy issues stay unnamed |

If `inspect` or the crop shows a real mismatch (e.g. social icons **48×48 → 21×21**) and no finding’s prose names that size, **file a finding first**, then cover/reject only matching rows.

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

### Finding cards must name the real issue (no vague lumps)

Review cards show `title` / `expected` / `actual` / `fix.summary`. A worklist pin alone is **not** enough: if those fields only mention a neighbour (e.g. “payment icons”) while the crop’s real issues are elsewhere (footer logo wordmark colour, extra `Follow us`), the person correctly sees the finding as incomplete.

**Split when root causes differ.** Do **not** merge several worklist keys into one finding just because they sit in the same footer/header band. Separate findings when any of these differ:

| Split when… | Example (do not lump) |
|---|---|
| Different element | Footer logo lockup vs payment marks vs social row |
| Different property / mechanism | IMAGE fill colour vs missing/extra TEXT vs icon asset |
| Design layer visibility differs | App shows copy that exists in Figma only as `visible: false` |
| Hint class differs | `text-only-app` vs `only-design` VECTOR vs size-only |
| Size / geometry alone | Social icons **48×48 → 21×21** vs extra `Follow us` copy (file both) |

**`size` / geometry must get its own card (hard rule).** When a worklist `size` / `size/position` hint, or `inspect` on the item, shows a meaningful box delta on an icon, badge, logo, or control (width, height, or both off enough to read wrong — e.g. **48×48 → 21×21**), file a dedicated `style` finding (`property: width` / `height` / both). Do **not** fold that size into a sibling card about extra/missing text, colour, or a different asset in the same band.

**Dense chrome bands (header / footer / utility row):** before marking the worklist item done, list every distinct visible piece in the crop (logo lockup, extra/missing label, social icon **size**, payment marks, copyright, column heading colour, …). Each piece → its own finding or an explicit rejection. Closing the item after only the “loudest” one or two issues is a miss.

**Write so a reviewer can act without re-opening the crop.**

| Field | Must include |
|---|---|
| `title` | The concrete wrong thing in the app (element + what is wrong). Prefer naming the copy/layer (`Follow us`, `Clibee` wordmark). |
| `expected.value` | What the **visible** design does (and, when relevant, hidden layers: e.g. “TEXT exists but `visible: false`”). Cite Figma node / mask+vector stack when that is the DS mechanism. |
| `actual.value` | What the app does (selector or asset path when useful). |
| `fix.summary` | The fix in one sentence (which file / which asset to change). |

**Anti-patterns (forbidden):**

- One finding titled only “页脚未对齐 / footer icons” that pins logo + Follow us + payments together, while prose only describes the right-hand payment row.
- Pinning `text-only-app: Follow us` under a finding whose `title` never says Follow us.
- Filing Follow us / logo colour while leaving social (or payment) **icon size** unnamed when inspect shows a clear box delta.
- Treating a bitmapped logo (`<img>`) colour error as “covered” by a generic footer finding that never mentions wordmark / lockup / mask+white vectors.
- Bulk-`false-positive` rejecting compare rows that would have forced you to spell out these issues — rejections must not hide undiagnosed structure problems.
- Using `covers` (or a script that attaches every leftover `elementClass` to a nearby finding) so `--check` passes while the review cards still omit a real visual mismatch.

**Raster / composed chrome (logos, badges):** If design composites IMAGE + mask rect + VECTOR text (or equivalent) and the app uses a single wrong PNG (e.g. header lockup on a dark footer), file a **structure** finding that states that stack — not only “logo size”. Colour-of-letters inside a bitmap will **not** show up as a CSS `color` FAIL; the finding text must still call it out when the worklist crop or inspect layers show the mismatch.

**Hidden design text vs app-only copy:** When inspect/worklist says `text-only-app` for a string that also exists in `figma-spec` with `visible: false`, file **extra-in-app / remove copy** (visible design has no label). Do not reject as `matches-design` just because a hidden node exists in the file.

**Mixed Figma text colours.** When the worklist shows `mixed-text-styles`, or design copy is one TEXT layer while the app splits a link (`<a>`) out of the sentence: compare the **link run** and the **body run** separately (Figma `textRuns` / character overrides). A PASS on the node's default fill does not clear a wrong link colour. File a `style` finding for the run that differs (expected token from that run, e.g. `primary-brown` on "Register here !").

**Parent chrome peeled onto children.** When Figma shows a parent INSTANCE / COMPONENT / FRAME with **fill, radius, stroke, and/or shadow** that visually wraps a group of children, and the app applies that fill/radius only to a subset (e.g. media) while the rest of the children sit on the page background:

- File a **`structure` (or `style`)** finding: expected parent-shell fill/radius/stroke/shadow on one wrapping container; actual missing or partial shell. Severity at least **WARNING** (often **BLOCKER** when the DS container no longer reads as designed).
- Do **not** treat this as settled by a `CANNOT_VERIFY` style row on an unmatched inner node, and do **not** bulk-`false-positive` reject the worklist crop when the side-by-side shows missing parent chrome.
- Pin the worklist region that covers the container; cite the Figma node id of the parent shell when known.

**Wrong adjacent major-block spacing.** When the app gap between two adjacent major blocks disagrees with the metadata Y delta (**non-zero→flush, flush→invented space, or delta off by ≥24px**):

- File a **`style` spacing** finding (`property: gap` / region naming the pair). Expected = design delta (may be `0`). Severity **WARNING** (or **BLOCKER** when the stack clearly reads wrong).
- Do **not** only mention it inside a “cumulative vertical shift” note, and do **not** drop the later block's `y` hint without a gap finding.

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
