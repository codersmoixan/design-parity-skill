#!/usr/bin/env node
// Install skill-folder deps (pngjs, pixelmatch, playwright + Chromium) without touching
// the app repository. Auto-runs when DESIGN_QA_AUTO_INSTALL is set or the person has
// granted once (~/.design-qa/auto-install.json). Otherwise exit 3 and ask.
import {
  AUTO_INSTALL_ENV,
  DEPENDENCIES,
  SKILL_DIR,
  autoInstallAllowed,
  autoInstallConsentPath,
  grantAutoInstall,
  installSkillDependencies,
  revokeAutoInstall,
} from './lib/deps.mjs';
import { parseCli, runMain, scriptCommand } from './lib/args.mjs';

const HELP = `Install design-qa's npm packages in the skill folder (not the app repo).

Usage:
  node scripts/ensure-deps.mjs [--status] [--grant] [--revoke] [--no-browser] [--force]

Packages (${Object.keys(DEPENDENCIES).join(', ')}) and Playwright's Chromium live under:
  ${SKILL_DIR}

Commands / cwd stay in the repository under test; only this install uses the skill folder.

Options:
  --status       print whether auto-install is allowed; exit 0 if allowed else 3
  --grant        write ~/.design-qa/auto-install.json, then install if anything is missing
  --revoke       remove the consent file (env ${AUTO_INSTALL_ENV}=1 still allows install)
  --no-browser   npm install only (skip \`npx playwright install chromium\`)
  --force        run install even when doctor already reports ready
  -h, --help

Environment:
  ${AUTO_INSTALL_ENV}=1   allow install without asking (CI / local)
  ${AUTO_INSTALL_ENV}=0   never auto-install (even with a consent file)

Exit codes: 0 ready or installed · 1 install failed · 2 bad arguments · 3 needs consent`;

async function packagesReady() {
  const missing = [];
  for (const name of Object.keys(DEPENDENCIES)) {
    try {
      await import(name);
    } catch {
      missing.push(name);
    }
  }
  return { ready: missing.length === 0, missing };
}

async function main(argv) {
  const { values } = parseCli(argv, {
    status: { type: 'boolean' },
    grant: { type: 'boolean' },
    revoke: { type: 'boolean' },
    'no-browser': { type: 'boolean' },
    force: { type: 'boolean' },
  });
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  if (values.grant && values.revoke) {
    process.stderr.write('ensure-deps.mjs: use only one of --grant and --revoke\n');
    return 2;
  }

  if (values.revoke) {
    const removed = revokeAutoInstall();
    process.stdout.write(removed
      ? `Revoked auto-install consent (${autoInstallConsentPath()}).\n`
      : `No consent file to revoke (${autoInstallConsentPath()}).\n`);
    return 0;
  }

  const gate = autoInstallAllowed();
  if (values.status) {
    const line = gate.allowed
      ? `auto-install: allowed (${gate.reason === 'env' ? `${AUTO_INSTALL_ENV}=1` : `consent ${gate.path}`})`
      : gate.reason === 'env-denied'
        ? `auto-install: denied (${AUTO_INSTALL_ENV}=0)`
        : `auto-install: ask once, then ${scriptCommand('ensure-deps.mjs')} --grant`;
    process.stdout.write(`${line}\nskill-dir: ${SKILL_DIR}\n`);
    return gate.allowed ? 0 : 3;
  }

  if (values.grant) {
    const file = grantAutoInstall();
    process.stdout.write(`Granted auto-install consent: ${file}\n`);
  }

  const pkgs = await packagesReady();
  if (pkgs.ready && !values.force) {
    if (!values.grant) process.stdout.write(`Ready (packages present in ${SKILL_DIR}).\n`);
    else process.stdout.write('Packages already present; consent saved for later.\n');
    return 0;
  }

  const allowed = values.grant || autoInstallAllowed().allowed;
  if (!allowed) {
    process.stderr.write(
      `Skill deps missing${pkgs.missing.length ? ` (${pkgs.missing.join(', ')})` : ''}. ` +
        `Install goes in ${SKILL_DIR} and does not change the app repository.\n` +
        `Ask the person once, then run:\n  ${scriptCommand('ensure-deps.mjs')} --grant\n` +
        `Or set ${AUTO_INSTALL_ENV}=1 in this environment and re-run:\n  ${scriptCommand('ensure-deps.mjs')}\n`,
    );
    return 3;
  }

  process.stdout.write(`Installing in skill folder (not the app repo):\n  ${SKILL_DIR}\n`);
  const result = installSkillDependencies({ browser: !values['no-browser'] });
  if (!result.ok) {
    process.stderr.write(
      `ensure-deps.mjs: ${result.step} failed (exit ${result.code})${result.error ? `: ${result.error.message}` : ''}\n`,
    );
    return 1;
  }
  process.stdout.write('Install finished. Run doctor.mjs if you want a full browser launch check.\n');
  return 0;
}

runMain(import.meta.url, main);
