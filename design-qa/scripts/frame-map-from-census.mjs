#!/usr/bin/env node
// Build <dir>/frame-map.json from design-census.json: accept provisional mappings, or ignore
// every unmapped frame (single-page / linked-frame passes).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CliError, displayPath, oneLine, parseCli, readJsonFile, runMain, usageError, writeJson } from './lib/args.mjs';
import { assertRunOwnsOutput } from './lib/pass.mjs';

const HELP = `Write a frame-map.json from the design census of a pass.

Usage:
  node scripts/frame-map-from-census.mjs --dir <report-dir> --ignore-unmapped [--reason '<text>'] [--run <id>]
  node scripts/frame-map-from-census.mjs --dir <report-dir> --accept-provisional [--run <id>]

Options:
  --dir <dir>              report folder (must contain design-census.json)
  --ignore-unmapped        map every unmapped frame to { "ignore": "<reason>" }
  --accept-provisional     map every unmapped frame to its provisional screen/state
  --reason <text>          ignore reason (default: "Out of scope for this linked-frame pass")
  --run <id>               run ownership (same as other pass scripts)
  --out <file>             write here (default: <dir>/frame-map.json)
  --dry-run                print the map; do not write

Use --ignore-unmapped when the person linked one Homepage (or similar) frame and a single
app URL: sibling screens and component chips on the Figma page are not part of this pass.
Use --accept-provisional only after confirming the provisional screen/state names.

Exit codes: 0 ok · 1 error · 2 bad arguments · 5 another run owns the folder
`;

async function main(argv) {
  const { values } = parseCli(argv, {
    dir: { type: 'string' },
    out: { type: 'string' },
    reason: { type: 'string' },
    run: { type: 'string' },
    'ignore-unmapped': { type: 'boolean' },
    'accept-provisional': { type: 'boolean' },
    'dry-run': { type: 'boolean' },
  });
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  if (!values.dir) throw usageError('--dir <report-dir> is required');
  const ignore = Boolean(values['ignore-unmapped']);
  const accept = Boolean(values['accept-provisional']);
  if (ignore === accept) throw usageError('pass exactly one of --ignore-unmapped or --accept-provisional');

  const dir = path.resolve(values.dir);
  const censusFile = path.join(dir, 'design-census.json');
  if (!existsSync(censusFile)) {
    // evidence may put it under evidence/ on some shapes
    const alt = path.join(dir, 'evidence', 'design-census.json');
    if (!existsSync(alt)) throw new CliError(`no design-census.json in ${oneLine(displayPath(dir))} (run evidence discover first, or figma-fetch --screens auto)`, 1);
  }
  const censusPath = existsSync(censusFile) ? censusFile : path.join(dir, 'evidence', 'design-census.json');
  assertRunOwnsOutput(dir, values.run);

  const census = readJsonFile(censusPath, 'design census');
  const unmapped = Array.isArray(census.unmapped) ? census.unmapped : [];
  if (!unmapped.length) {
    console.log(`No unmapped frames in ${oneLine(displayPath(censusPath))}.`);
    return 0;
  }

  const reason = (values.reason || 'Out of scope for this linked-frame pass').trim();
  if (ignore && reason.length < 8) throw usageError('--reason must be at least 8 characters');

  const map = {};
  for (const u of unmapped) {
    const id = u.nodeId || u.id;
    if (!id) continue;
    if (ignore) {
      map[id] = { ignore: reason };
    } else {
      const s = u.suggestion || {};
      if (!s.screen) throw new CliError(`unmapped frame ${id} has no provisional screen; confirm it by hand`, 1);
      map[id] = { screen: s.screen, ...(s.state ? { state: s.state } : {}), ...(s.trigger ? { trigger: s.trigger } : {}) };
    }
  }

  const out = values.out ? path.resolve(values.out) : path.join(dir, 'frame-map.json');
  if (values['dry-run']) {
    console.log(JSON.stringify(map, null, 2));
    console.log(`dry-run: would write ${Object.keys(map).length} entries to ${oneLine(displayPath(out))}`);
    return 0;
  }
  // Merge with an existing map so confirmed entries are kept.
  let existing = {};
  if (existsSync(out)) {
    try {
      existing = readJsonFile(out, 'frame map');
    } catch {
      existing = {};
    }
  }
  const merged = { ...existing, ...map };
  writeJson(out, merged);
  console.log(`Wrote ${Object.keys(map).length} frame-map entries to ${oneLine(displayPath(out))} (${ignore ? 'ignore-unmapped' : 'accept-provisional'}).`);
  console.log(`Next: re-run pass.mjs evidence (or figma-fetch with --frame-map, then evidence).`);
  return 0;
}

runMain(import.meta.url, main);
