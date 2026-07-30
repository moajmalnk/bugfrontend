/**
 * Writes committed agent export files from the builtin CODO catalog.
 * Run from frontend/: npx tsx scripts/generate-codo-exports.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  buildCodoAgentExportContent,
  CODO_AGENT_EXPORT_FORMATS,
  getBuiltinCodoRulesForExport,
} from '../src/lib/utils/codoRulesAgentExport';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

const targets: Record<string, string> = {
  cursor: join(repoRoot, '.cursor/rules/bugricer-codo.mdc'),
  antigravity: join(repoRoot, 'docs/ANTIGRAVITY_RULES.md'),
  'android-studio': join(repoRoot, 'AI_GUIDELINES.md'),
  generic: join(repoRoot, 'AGENTS.md'),
};

const rules = getBuiltinCodoRulesForExport();
mkdirSync(join(repoRoot, '.cursor/rules'), { recursive: true });
mkdirSync(join(repoRoot, 'docs'), { recursive: true });

for (const fmt of CODO_AGENT_EXPORT_FORMATS) {
  const content = buildCodoAgentExportContent(fmt.id, rules);
  const path = targets[fmt.id];
  writeFileSync(path, content, 'utf8');
  console.log(`wrote ${path} (${content.length} chars, ${rules.length} rules)`);
}
