/**
 * Why: Cursor, Antigravity and VS Code only report problems for files that are open,
 * and only list git repos they have discovered. This kit makes every developer's
 * editor show TypeScript errors and uncommitted changes immediately after
 * "Developer: Reload Window", without opening each file or folder.
 *
 * The kit is three workspace files committed under `.vscode/` plus one
 * user-level snippet, all VS Code–compatible (JSONC comments are intentional).
 */

export type CodoIdeKitFileId = 'settings' | 'tasks' | 'extensions' | 'user';

export type CodoIdeKitFile = {
  id: CodoIdeKitFileId;
  title: string;
  filename: string;
  targetPath: string;
  purpose: string;
  /** User-level snippets are merged by hand, never committed. */
  scope: 'workspace' | 'user';
  mimeType: string;
  build: () => string;
};

export type CodoIdeSetupStep = {
  id: string;
  title: string;
  summary: string;
  actions: string[];
  passWhen: string;
  /** Optional decision branch rendered as a fork in the flow. */
  branch?: { question: string; yes: string; no: string };
};

export type CodoIdeTroubleshoot = {
  symptom: string;
  cause: string;
  fix: string;
};

export function buildCodoIdeSettingsJson(): string {
  return `{
  // BugRicer CODO — workspace IDE settings (Cursor / Antigravity / VS Code)
  // Save as .vscode/settings.json at the repo root and commit it.
  // Pair with .vscode/tasks.json + .vscode/extensions.json from the same kit.

  // ── Appearance ──
  "window.commandCenter": true,
  "editor.fontSize": 14,
  "editor.lineHeight": 22,
  "editor.fontLigatures": true,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "editor.renderWhitespace": "boundary",
  "editor.rulers": [80, 120],
  "breadcrumbs.enabled": true,

  // ── Editing quality (CODO) ──
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.linkedEditing": true,
  "editor.suggestSelection": "first",
  "editor.quickSuggestions": {
    "strings": true
  },

  // ── Files ──
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/.vite": true
  },

  // ── TypeScript / JavaScript ──
  "js/ts.updateImportsOnFileMove.enabled": "always",
  "js/ts.preferences.importModuleSpecifier": "non-relative",
  "js/ts.suggest.autoImports": true,
  "js/ts.tsserver.experimental.enableProjectDiagnostics": true,
  // Older editor builds only read the legacy key.
  "typescript.tsserver.experimental.enableProjectDiagnostics": true,

  // ── Problems panel ──
  "problems.autoReveal": true,
  "problems.visibility": true,
  "problems.decorations.enabled": true,
  "problems.showCurrentInStatus": true,
  "problems.sortOrder": "severity",
  "problems.defaultViewMode": "tree",
  "editor.renderValidationDecorations": "on",
  "workbench.editor.decorations.badges": true,
  "workbench.editor.decorations.colors": true,

  // ── Dart / Flutter (optional — ignore if unused) ──
  "dart.onlyAnalyzeProjectsWithOpenFiles": false,
  "dart.showTodos": false,

  // ── Terminal ──
  "terminal.integrated.enableMultiLinePasteWarning": "never",
  "explorer.confirmDelete": false,

  // ── Git: show every repo and its uncommitted changes at startup ──
  "git.enabled": true,
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": false,
  "git.openRepositoryInParentFolders": "always",
  "git.autoRepositoryDetection": true,
  "git.repositoryScanMaxDepth": 2,
  // Opening a parent folder that holds several repos? List them explicitly:
  // "git.scanRepositories": ["frontend", "backend"],
  "git.decorations.enabled": true,
  "explorer.decorations.badges": true,
  "explorer.decorations.colors": true,
  "scm.diffDecorations": "all",
  "scm.diffDecorationsGutterVisibility": "always",
  "scm.defaultViewMode": "tree",
  "scm.alwaysShowRepositories": true,
  "scm.countBadge": "all",
  "scm.showIncomingChanges": "always",
  "scm.showOutgoingChanges": "always",

  // ── Misc ──
  "window.autoDetectColorScheme": false,
  "editor.accessibilitySupport": "on"
}
`;
}

export function buildCodoIdeTasksJson(): string {
  return `{
  // BugRicer CODO — background type check that fills the Problems panel on startup,
  // so errors appear without opening each file. Runs only in a trusted workspace.
  //
  // Opened a parent folder (e.g. BugRicer/ with frontend/ + backend/ inside)?
  // Change both "\${workspaceFolder}" values below to "\${workspaceFolder}/frontend".
  "version": "2.0.0",
  "tasks": [
    {
      "label": "CODO: TypeScript watch (Problems panel)",
      "type": "shell",
      // Use -p tsconfig.json if the project has no tsconfig.app.json.
      "command": "npx tsc --noEmit --watch --preserveWatchOutput --pretty false -p tsconfig.app.json",
      "options": { "cwd": "\${workspaceFolder}" },
      "isBackground": true,
      "problemMatcher": {
        "base": "$tsc-watch",
        "fileLocation": ["relative", "\${workspaceFolder}"]
      },
      "presentation": { "reveal": "never", "panel": "dedicated", "clear": true },
      "runOptions": { "runOn": "folderOpen" }
    }
  ]
}
`;
}

export function buildCodoIdeExtensionsJson(): string {
  return `{
  // BugRicer CODO — recommended extensions.
  // Extensions panel → search "@recommended" → Install Workspace Recommended Extensions.
  "recommendations": [
    // ESLint errors in Problems + fix on save
    "dbaeumer.vscode-eslint",
    // Tailwind class autocomplete and lint
    "bradlc.vscode-tailwindcss",
    // Whole-project PHP diagnostics for the backend
    "bmewburn.vscode-intelephense-client",
    // Inline error text next to the offending line
    "usernamehw.errorlens"
  ]
}
`;
}

export function buildCodoIdeUserSnippet(): string {
  return `{
  // Merge into User settings: Cmd/Ctrl+Shift+P → "Preferences: Open User Settings (JSON)".
  // Lets .vscode/tasks.json start its background checks when the folder opens.
  "task.allowAutomaticTasks": "on"
}
`;
}

const JSON_MIME = 'application/json;charset=utf-8';

export const CODO_IDE_KIT_FILES: CodoIdeKitFile[] = [
  {
    id: 'settings',
    title: 'Workspace settings',
    filename: 'settings.json',
    targetPath: '.vscode/settings.json',
    purpose: 'Format on save, ESLint fix, project-wide diagnostics, git repo detection and change badges.',
    scope: 'workspace',
    mimeType: JSON_MIME,
    build: buildCodoIdeSettingsJson,
  },
  {
    id: 'tasks',
    title: 'Startup checks',
    filename: 'tasks.json',
    targetPath: '.vscode/tasks.json',
    purpose: 'Runs a TypeScript watch on folder open so every error is in Problems without opening files.',
    scope: 'workspace',
    mimeType: JSON_MIME,
    build: buildCodoIdeTasksJson,
  },
  {
    id: 'extensions',
    title: 'Recommended extensions',
    filename: 'extensions.json',
    targetPath: '.vscode/extensions.json',
    purpose: 'Prompts each developer to install ESLint, Tailwind, Intelephense (PHP) and Error Lens.',
    scope: 'workspace',
    mimeType: JSON_MIME,
    build: buildCodoIdeExtensionsJson,
  },
  {
    id: 'user',
    title: 'User settings snippet',
    filename: 'user-settings-snippet.json',
    targetPath: 'User settings.json (merge, do not replace)',
    purpose: 'One-time per machine: allows the startup checks in tasks.json to run automatically.',
    scope: 'user',
    mimeType: JSON_MIME,
    build: buildCodoIdeUserSnippet,
  },
];

export const CODO_IDE_SETUP_STEPS: CodoIdeSetupStep[] = [
  {
    id: 'rules',
    title: 'Export CODO rules for your agent',
    summary: 'Download the rule file for the AI agent you use from the cards above.',
    actions: [
      'Cursor → save `bugricer-codo.mdc` to `.cursor/rules/`.',
      'Antigravity / Android Studio / others → save the `.md` file at the path shown on its card.',
    ],
    passWhen: 'The rule file is inside the repo at the exact path shown on the card.',
  },
  {
    id: 'download',
    title: 'Download the IDE setup kit',
    summary: 'Click **Download all** below, or download each file individually.',
    actions: [
      'You get `settings.json`, `tasks.json`, `extensions.json` and `user-settings-snippet.json`.',
      'If the browser asks to allow multiple downloads, choose **Allow**.',
    ],
    passWhen: 'All four files are in your Downloads folder.',
  },
  {
    id: 'place',
    title: 'Place files in `.vscode/`',
    summary: 'Create a `.vscode/` folder at the root of the git repository and move the three workspace files into it.',
    actions: [
      'Move `settings.json`, `tasks.json`, `extensions.json` into `.vscode/`.',
      'Already have a `.vscode/settings.json`? Merge keys instead of overwriting.',
    ],
    branch: {
      question: 'Do you open a parent folder that contains several repos (e.g. `frontend/` + `backend/`)?',
      yes: 'Uncomment `git.scanRepositories` in settings.json and change `${workspaceFolder}` to `${workspaceFolder}/frontend` in tasks.json.',
      no: 'Use the files as downloaded — no edits needed.',
    },
    passWhen: '`.vscode/` contains exactly settings.json, tasks.json and extensions.json.',
  },
  {
    id: 'user',
    title: 'Merge the user snippet (once per machine)',
    summary: 'Cmd/Ctrl+Shift+P → **Preferences: Open User Settings (JSON)** → add `"task.allowAutomaticTasks": "on"`.',
    actions: [
      'Merge the single key — do not replace your theme, fonts or other personal settings.',
    ],
    passWhen: 'User settings contain `"task.allowAutomaticTasks": "on"`.',
  },
  {
    id: 'extensions',
    title: 'Install recommended extensions',
    summary: 'Extensions panel → search **@recommended** → **Install Workspace Recommended Extensions**.',
    actions: [
      'ESLint is required for lint errors and fix-on-save to work.',
      'Intelephense is needed for PHP errors in `backend/`.',
    ],
    passWhen: 'All recommended extensions show as installed.',
  },
  {
    id: 'reload',
    title: 'Reload and trust the workspace',
    summary: 'Cmd/Ctrl+Shift+P → **Developer: Reload Window**.',
    actions: [
      'If asked "Do you trust the authors?", choose **Trust** — background checks never run in Restricted Mode.',
      'If asked to allow automatic tasks, choose **Allow**.',
    ],
    passWhen: 'Terminal panel lists the task **CODO: TypeScript watch (Problems panel)**.',
  },
  {
    id: 'verify',
    title: 'Verify — without opening any file',
    summary: 'Wait ~30 seconds after reload for the first type check to finish.',
    actions: [
      'Problems panel lists TypeScript errors from files you have not opened.',
      'Source Control lists every repo with its uncommitted change count.',
      'Saving a file formats it and applies ESLint fixes.',
    ],
    passWhen: 'All three checks pass after a fresh reload.',
  },
  {
    id: 'commit',
    title: 'Commit and share',
    summary: 'Commit `.vscode/` and the rule file so every teammate gets the same setup on pull.',
    actions: [
      '`git add .vscode .cursor && git commit -m "chore: CODO IDE setup kit"`',
      'Teammates only repeat steps 4–7 on their own machine.',
    ],
    passWhen: 'A teammate pulls, reloads, and sees the same Problems and Source Control state.',
  },
];

export const CODO_IDE_TROUBLESHOOTING: CodoIdeTroubleshoot[] = [
  {
    symptom: 'Problems panel is empty until a file is opened',
    cause: 'The startup task did not run (untrusted workspace, automatic tasks off, or wrong folder).',
    fix: 'Trust the workspace, confirm the user snippet, then run **Tasks: Run Task → CODO: TypeScript watch**.',
  },
  {
    symptom: 'Task fails with "Cannot find tsconfig.app.json"',
    cause: 'The project uses a single `tsconfig.json`, or the task runs in the parent folder.',
    fix: 'Change `-p tsconfig.app.json` to `-p tsconfig.json`, or point `cwd` at the frontend folder.',
  },
  {
    symptom: 'Errors listed but clicking them opens the wrong path',
    cause: '`fileLocation` does not match the task `cwd`.',
    fix: 'Set both `cwd` and `fileLocation` to the same folder.',
  },
  {
    symptom: 'Source Control shows no repos or only one',
    cause: 'Repos sit deeper than the scan depth, or a parent folder is open.',
    fix: 'Uncomment `git.scanRepositories` and list each repo folder.',
  },
  {
    symptom: 'No ESLint errors and save does not fix lint',
    cause: 'ESLint extension is not installed.',
    fix: 'Install `dbaeumer.vscode-eslint` from the recommended list.',
  },
  {
    symptom: 'PHP errors only appear in open files',
    cause: 'The built-in PHP checker only validates open documents.',
    fix: 'Install Intelephense from the recommended list.',
  },
];
