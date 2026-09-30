/**
 * Consistency check for the builtin CODO catalog.
 * Why: the same rule keys live in the frontend catalog, the PHP compliance
 * controller and the SQL seed migrations; drift between them breaks project
 * checklists silently ("Invalid rule_key") or hides rules from the ack gate.
 * Run from frontend/: npx tsx scripts/verify-codo-catalog.ts
 */
/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEVELOPER_RULES, QA_STRESS_RULES } from '../src/lib/codo/complianceRules';
import { CODO_SOP_EXAMPLES } from '../src/lib/codo/sopRuleExamples';

const RETIRED_DEV_NUMBERS = [34, 39, 41, 42];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '../..');
const errors: string[] = [];

function duplicates(values: (string | number)[]): (string | number)[] {
  const seen = new Set<string | number>();
  return values.filter((v) => (seen.has(v) ? true : (seen.add(v), false)));
}

function phpArray(source: string, name: string): string[] {
  const match = source.match(new RegExp(`\\$${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!match) {
    errors.push(`Could not find $${name} in ProjectComplianceController.php`);
    return [];
  }
  return [...match[1].matchAll(/'([a-z0-9_]+)'\s*(?:=>[^\n]*)?,/g)].map((m) => m[1]);
}

function sameSet(label: string, expected: string[], actual: string[]) {
  const a = new Set(actual);
  const e = new Set(expected);
  const missing = expected.filter((k) => !a.has(k));
  const extra = actual.filter((k) => !e.has(k));
  if (missing.length) errors.push(`${label}: missing ${missing.join(', ')}`);
  if (extra.length) errors.push(`${label}: unexpected ${extra.join(', ')}`);
}

const devKeys = DEVELOPER_RULES.map((r) => r.key);
const qaKeys = QA_STRESS_RULES.map((r) => r.key);
const allKeys = [...devKeys, ...qaKeys];

const dupKeys = duplicates(allKeys);
if (dupKeys.length) errors.push(`Duplicate rule keys: ${dupKeys.join(', ')}`);

const dupNumbers = duplicates(DEVELOPER_RULES.map((r) => r.number));
if (dupNumbers.length) errors.push(`Duplicate developer rule numbers: ${dupNumbers.join(', ')}`);

for (const r of DEVELOPER_RULES) {
  if (r.key !== `dev_rule_${r.number}`) errors.push(`${r.key} does not match number ${r.number}`);
  if (RETIRED_DEV_NUMBERS.includes(r.number)) errors.push(`${r.key} reuses retired number ${r.number}`);
}

const phpSource = readFileSync(
  join(repoRoot, 'backend/api/projects/ProjectComplianceController.php'),
  'utf8'
);
sameSet('PHP $DEV_RULE_KEYS', devKeys, phpArray(phpSource, 'DEV_RULE_KEYS'));
sameSet('PHP $QA_RULE_KEYS', qaKeys, phpArray(phpSource, 'QA_RULE_KEYS'));
sameSet('PHP $BUILTIN_RULE_TITLES', allKeys, phpArray(phpSource, 'BUILTIN_RULE_TITLES'));

const migrationsDir = join(repoRoot, 'backend/migrations');
const seededSql = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
  .join('\n');
for (const key of allKeys) {
  if (!new RegExp(`INSERT IGNORE INTO \`codo_common_rules\`[^;]*'${key}'`).test(seededSql)) {
    errors.push(`${key} is not seeded into codo_common_rules by any migration`);
  }
}

for (const r of [...DEVELOPER_RULES, ...QA_STRESS_RULES]) {
  const ex = CODO_SOP_EXAMPLES[r.key];
  if (!ex?.bad || !ex?.good) errors.push(`${r.key} has no Bad/Good example`);
  if (!/\n\nMalayalam:\s*\S/.test(r.description)) errors.push(`${r.key} has no Malayalam line`);
}

if (errors.length) {
  console.error(`CODO catalog check failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `CODO catalog OK: ${devKeys.length} developer + ${qaKeys.length} QA rules in sync across frontend, PHP and SQL.`
);
