// Load KEY=value pairs from the repository under test into process.env.
// Used by every CLI via runMain: FIGMA_TOKEN, JIRA_*, DESIGN_QA_* etc. can live in
// `.env` / `.env.local` at the working directory (and git root when different).
// Never prints values. Existing process.env wins. Opt out: DESIGN_QA_LOAD_ENV=0.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const LOAD_ENV_FLAG = 'DESIGN_QA_LOAD_ENV';

/** Files loaded in order; later files override earlier file values, never process.env. */
export const DOTENV_FILES = Object.freeze(['.env', '.env.local']);

function parseEnvFlag(raw) {
  if (raw == null || raw === '') return null;
  const v = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return null;
}

/** Strip matching single/double quotes; leave unquoted values as-is (trim outer spaces). */
export function unquoteEnvValue(raw) {
  let v = String(raw ?? '').trim();
  if (v.length >= 2) {
    const q = v[0];
    if ((q === '"' || q === "'") && v[v.length - 1] === q) {
      v = v.slice(1, -1);
      if (q === '"') {
        v = v.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      return v;
    }
  }
  // Unquoted: drop inline ` #comment`
  const hash = v.indexOf(' #');
  if (hash !== -1) v = v.slice(0, hash).trimEnd();
  return v;
}

/**
 * Parse dotenv text → { [key]: value }. Ignores blank lines and # comments.
 * Supports optional `export ` prefix. No $VAR expansion.
 */
export function parseDotEnv(text) {
  const out = Object.create(null);
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = unquoteEnvValue(m[2]);
  }
  return out;
}

function readDotEnvFile(file) {
  try {
    if (!existsSync(file)) return null;
    return parseDotEnv(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function gitRoot(cwd) {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    }).trim();
    return root || null;
  } catch {
    return null;
  }
}

/**
 * Directories to scan: git toplevel (when found), then cwd. Deduped, cwd last so its
 * files win over the repo root when both differ.
 */
export function envSearchDirs(cwd = process.cwd()) {
  const abs = path.resolve(cwd);
  const dirs = [];
  const root = gitRoot(abs);
  if (root) {
    const r = path.resolve(root);
    if (r !== abs) dirs.push(r);
  }
  dirs.push(abs);
  return dirs;
}

/**
 * Apply parsed keys onto `env` only when the key is currently undefined.
 * → { applied: string[], files: string[], skipped: boolean }
 */
export function applyEnvVars(parsed, env = process.env) {
  const applied = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (env[key] !== undefined) continue;
    env[key] = value;
    applied.push(key);
  }
  return applied;
}

/**
 * Load `.env` then `.env.local` from each search dir into process.env (or `env`).
 * Silent; never logs values. No-op when DESIGN_QA_LOAD_ENV=0/false/no.
 */
export function loadProjectEnv({
  cwd = process.cwd(),
  env = process.env,
  files = DOTENV_FILES,
} = {}) {
  const flag = parseEnvFlag(env[LOAD_ENV_FLAG]);
  if (flag === false) return { applied: [], files: [], skipped: true, dirs: [] };

  const dirs = envSearchDirs(cwd);
  const merged = Object.create(null);
  const loadedFiles = [];
  for (const dir of dirs) {
    for (const name of files) {
      // Never load example / sample templates
      if (/\.example$/i.test(name) || /\.sample$/i.test(name)) continue;
      const abs = path.join(dir, name);
      const parsed = readDotEnvFile(abs);
      if (!parsed) continue;
      Object.assign(merged, parsed);
      loadedFiles.push(abs);
    }
  }
  const applied = applyEnvVars(merged, env);
  return { applied, files: loadedFiles, skipped: false, dirs };
}
