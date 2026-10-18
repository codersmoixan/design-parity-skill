#!/usr/bin/env node
// Cross-platform replacement for shell `a && b && c`: run each command in order, stop on
// the first non-zero exit. Use when Next: must chain steps on Windows PowerShell (no &&).
import { spawn } from 'node:child_process';
import { runMain, usageError } from './lib/args.mjs';

const HELP = `Run commands in sequence; stop on the first failure.

Usage:
  node scripts/seq.mjs -- <command> [args...] -- <command> [args...] ...

Each segment after a lone "--" is one command. Exit code is the first non-zero child
exit, or 0 when every command succeeds. Prefer this over shell "&&" in printed Next:
lines so PowerShell and bash both work.

Exit codes: 0 ok · 1 a child failed · 2 bad arguments
`;

function splitSegments(argv) {
  const segments = [];
  let cur = [];
  for (const a of argv) {
    if (a === '--') {
      if (cur.length) segments.push(cur);
      cur = [];
      continue;
    }
    cur.push(a);
  }
  if (cur.length) segments.push(cur);
  return segments;
}

function runOne(argv) {
  // Join and use the shell so quoted paths from scriptCmd work on Windows PowerShell too.
  const line = argv.join(' ');
  return new Promise((resolve) => {
    const child = spawn(line, { stdio: 'inherit', shell: true, env: process.env });
    child.on('error', (err) => {
      console.error(`seq.mjs: failed to start: ${err.message}`);
      resolve(1);
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        console.error(`seq.mjs: killed by ${signal}`);
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP);
    return 0;
  }
  const segments = splitSegments(argv);
  if (!segments.length) throw usageError('pass at least one command after -- (see --help)');
  for (const seg of segments) {
    const code = await runOne(seg);
    if (code !== 0) return code;
  }
  return 0;
}

runMain(import.meta.url, main);
