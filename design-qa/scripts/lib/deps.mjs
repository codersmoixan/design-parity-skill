// Third-party packages the scripts need (pngjs, pixelmatch, playwright), loaded with a
// message that names the folder to run `npm install` in when one is missing.
// The skill folder holds its own package.json and package-lock.json, so the same
// command works for a plugin install, a plain copy of the folder and this repo.
// Installs stay in the skill folder (not the app repository). Auto-install is gated by
// DESIGN_QA_AUTO_INSTALL or a one-time consent file under ~/.design-qa/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scriptCommand } from './args.mjs';

/** The skill folder (where package.json lives), resolved from this file. */
export const SKILL_DIR = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

/** Packages the scripts import, and what they are for. */
export const DEPENDENCIES = Object.freeze({
  pngjs: 'read and write PNGs (capture, diff, figma-fetch)',
  pixelmatch: 'pixel diff (diff.mjs)',
  playwright: 'browser capture (capture.mjs)',
});

/** Env: 1/true/yes → always allow; 0/false/no → never; unset → consent file. */
export const AUTO_INSTALL_ENV = 'DESIGN_QA_AUTO_INSTALL';

/** One-time consent marker (same home folder as sessions). */
export const AUTO_INSTALL_CONSENT_REL = path.join('.design-qa', 'auto-install.json');

function firstLine(text) {
  return String(text ?? '').split('\n')[0].trim();
}

export function isMissingModule(err, name) {
  const code = err?.code;
  return (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') && String(err?.message ?? '').includes(name);
}

/** Absolute path of the consent file. */
export function autoInstallConsentPath({ home = os.homedir() } = {}) {
  return path.join(home, AUTO_INSTALL_CONSENT_REL);
}

function parseEnvFlag(raw) {
  if (raw == null || raw === '') return null;
  const v = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return null;
}

/**
 * Whether skill-folder npm install / playwright browser download may run without asking.
 * Env wins over the consent file when set to an explicit yes/no.
 */
export function autoInstallAllowed({ env = process.env, home = os.homedir() } = {}) {
  const flag = parseEnvFlag(env[AUTO_INSTALL_ENV]);
  if (flag === true) return { allowed: true, reason: 'env' };
  if (flag === false) return { allowed: false, reason: 'env-denied' };
  const file = autoInstallConsentPath({ home });
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const data = JSON.parse(raw);
      if (data && data.granted === true) return { allowed: true, reason: 'consent', path: file };
    }
  } catch {
    // missing or corrupt: treat as no consent
  }
  return { allowed: false, reason: 'ask', path: file };
}

/** Write ~/.design-qa/auto-install.json so later ensure-deps runs without asking. */
export function grantAutoInstall({ home = os.homedir(), now = new Date() } = {}) {
  const file = autoInstallConsentPath({ home });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = `${JSON.stringify({ granted: true, grantedAt: now.toISOString(), version: 1 }, null, 2)}\n`;
  fs.writeFileSync(file, body, { encoding: 'utf8', mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Windows may ignore mode
  }
  return file;
}

/** Remove the consent file (env DESIGN_QA_AUTO_INSTALL=1 still allows install). */
export function revokeAutoInstall({ home = os.homedir() } = {}) {
  const file = autoInstallConsentPath({ home });
  try {
    fs.unlinkSync(file);
    return true;
  } catch (err) {
    if (err && err.code === 'ENOENT') return false;
    throw err;
  }
}

/** Hint printed when a package import fails (exit 4). */
export function missingDependencyMessage(name, err) {
  const why = err ? ` (${firstLine(err.message)})` : '';
  const ensure = scriptCommand('ensure-deps.mjs');
  return (
    `${name} is not installed${why}. Skill deps install in ${SKILL_DIR} (not the app repo). ` +
    `Run \`${ensure}\` when auto-install is allowed, or \`${ensure} --grant\` after the person agrees once. ` +
    `\`${scriptCommand('doctor.mjs')}\` checks everything.`
  );
}

/**
 * Import a package. When it is missing, print the install hint and exit 4 — this runs at
 * module load in CLI scripts, before any error handler exists. Other errors are rethrown.
 */
export async function importDependency(name) {
  try {
    return await import(name);
  } catch (err) {
    if (!isMissingModule(err, name)) throw err;
    process.stderr.write(`design-qa: ${missingDependencyMessage(name, err)}\n`);
    process.exit(4);
  }
}

function npmCmd() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function npxCmd() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

/**
 * Run a command in the skill folder. Returns { code, error? }.
 * shell:true on Windows so .cmd shims resolve.
 */
export function runInSkill(command, args, { skillDir = SKILL_DIR, env = process.env } = {}) {
  const r = spawnSync(command, args, {
    cwd: skillDir,
    env,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.error) return { code: 1, error: r.error };
  return { code: r.status == null ? 1 : r.status };
}

/**
 * npm install in the skill folder, then Playwright Chromium when playwright is present
 * and a browser launch is still needed (caller decides via options).
 */
export function installSkillDependencies({
  skillDir = SKILL_DIR,
  env = process.env,
  browser = true,
  channel = env.DESIGN_QA_BROWSER_CHANNEL || '',
} = {}) {
  const npm = runInSkill(npmCmd(), ['install'], { skillDir, env });
  if (npm.code !== 0) return { ok: false, step: 'npm-install', code: npm.code, error: npm.error };

  if (!browser) return { ok: true, step: 'npm-install', code: 0 };

  const browserArgs = channel
    ? ['playwright', 'install', channel]
    : ['playwright', 'install', 'chromium'];
  const pw = runInSkill(npxCmd(), browserArgs, { skillDir, env });
  if (pw.code !== 0) return { ok: false, step: 'playwright-install', code: pw.code, error: pw.error };
  return { ok: true, step: 'playwright-install', code: 0 };
}
