#!/usr/bin/env node
/**
 * Makes sure src/environments/firebase.config.ts exists before a build or a
 * dev server starts. The file holds the Firebase web config and is not in
 * version control, so a fresh clone would fail to compile without it. This
 * script copies the template over, which lets the app start with placeholder
 * values: everything but the recipe library works.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = resolve(PROJECT_ROOT, 'src/environments/firebase.config.ts');
const TEMPLATE = resolve(PROJECT_ROOT, 'src/environments/firebase.config.example.ts');

if (!existsSync(CONFIG)) {
  copyFileSync(TEMPLATE, CONFIG);
  console.log('Created src/environments/firebase.config.ts from the template.');
  console.log('Fill in the values from the Firebase console, see docs/firebase.md.');
}
