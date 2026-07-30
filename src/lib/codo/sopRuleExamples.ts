/**
 * Structured SOP extras for Common CODO rules.
 * Requirement + Malayalam come from the DB description; Bad/Good examples live here.
 * Looked up by rule_key in CodoRuleBody — keep every active rule covered.
 */

export type CodoSopExample = {
  bad?: string;
  good?: string;
  /** Language label for the good-example fence (e.g. JavaScript, CSS, SQL, QA Checklist) */
  language?: string;
};

export const CODO_SOP_EXAMPLES: Record<string, CodoSopExample> = {
  // ── Developer Rules 1–32 ───────────────────────────────────────────────
  dev_rule_1: {
    bad: 'const closeModal = () => setShowModal(false); // State retained in background',
    good: `const closeModal = () => {
  setFormData(initialState);
  setShowModal(false);
};

useEffect(() => {
  return () => setFormData(initialState);
}, []);`,
    language: 'JavaScript',
  },
  dev_rule_2: {
    bad: 'Alerting errors only inside handleSubmit().',
    good: `<input
  type="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    setError(!e.target.value.includes("@") ? "Invalid email" : "");
  }}
/>
{error && <span className="text-red-500 text-xs">{error}</span>}`,
    language: 'JavaScript',
  },
  dev_rule_3: {
    bad: 'onClick={() => setShowModal(false)} // Closes dirty form with no warning',
    good: `const handleClose = () => {
  if (isDirty && !window.confirm("You have unsaved changes.")) return;
  setShowModal(false);
};`,
    language: 'JavaScript',
  },
  dev_rule_4: {
    bad: 'location.reload() // Hoping browser cache clears form state',
    good: `const resetForm = () => {
  setItems([]);
  setFormData({ ...INITIAL_FORM });
  setErrors({});
};

onCancel={resetForm}
onSubmitSuccess={resetForm}`,
    language: 'JavaScript',
  },
  dev_rule_5: {
    bad: '<input type="number" /> // Allows typing 50+ digits',
    good: `<input
  type="text"
  inputMode="numeric"
  value={phone}
  onChange={(e) => {
    const digits = e.target.value.replace(/\\D/g, "");
    setPhone(digits.slice(0, 10));
  }}
/>`,
    language: 'JavaScript',
  },
  dev_rule_6: {
    bad: 'innerHTML = userComment // XSS risk',
    good: `// Frontend
const safe = DOMPurify.sanitize(userInput);

// Backend (PHP)
$stmt = $pdo->prepare("INSERT INTO notes (body) VALUES (?)");
$stmt->execute([strip_tags($body)]);`,
    language: 'JavaScript',
  },
  dev_rule_7: {
    bad: '<input name="title" /> // No maxLength; DB column is VARCHAR(100)',
    good: `<input
  name="title"
  maxLength={100}
  value={title}
  onChange={(e) => setTitle(e.target.value.slice(0, 100))}
/>`,
    language: 'JavaScript',
  },
  dev_rule_8: {
    bad: '<button onClick={saveData}>Submit</button>',
    good: `const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  if (loading) return;
  setLoading(true);
  try {
    await api.save(data);
  } finally {
    setLoading(false);
  }
};

<button disabled={loading} onClick={handleSubmit}>
  {loading ? <Spinner /> : "Submit"}
</button>`,
    language: 'JavaScript',
  },
  dev_rule_9: {
    bad: '<button onClick={() => api.delete(id)}>Delete</button>',
    good: `<button onClick={() => setConfirmId(item.id)}>Delete</button>

{confirmId && (
  <ConfirmModal
    width="400px"
    onConfirm={() => executeDelete(confirmId)}
    onClose={() => setConfirmId(null)}
  />
)}`,
    language: 'JavaScript',
  },
  dev_rule_10: {
    bad: '<button type="submit">Save</button> // Always clickable',
    good: `const isValid = name.trim() && email.includes("@") && !errors.phone;

<button type="submit" disabled={!isValid}>
  Save
</button>`,
    language: 'JavaScript',
  },
  dev_rule_11: {
    bad: '<div className="rounded-sm">…</div> // Sharp / tiny radius',
    good: `<div className="rounded-xl border p-4">…</div>
<button className="rounded-2xl px-4 py-2">Save</button>`,
    language: 'CSS',
  },
  dev_rule_12: {
    bad: '<div className="flex flex-wrap">…</div> // No grid / no gap',
    good: `<div className="grid grid-cols-12 gap-4">
  <div className="col-span-12 md:col-span-6">…</div>
  <div className="col-span-12 md:col-span-6">…</div>
</div>`,
    language: 'CSS',
  },
  dev_rule_13: {
    bad: `{items.map((item) => (
  <div className="mb-4" key={item.id}>{item.name}</div>
))}`,
    good: `<div className="flex flex-col gap-4">
  {items.map((item) => (
    <div key={item.id}>{item.name}</div>
  ))}
</div>`,
    language: 'JavaScript',
  },
  dev_rule_14: {
    bad: 'body { overflow: hidden; } // Breaks page scroll',
    good: `/* Prefer local scroll containers */
.panel { overflow-y: auto; }

/* Codo slim scrollbar on scrollable regions — not body */
.panel::-webkit-scrollbar { width: 6px; }`,
    language: 'CSS',
  },
  dev_rule_15: {
    bad: 'className="bg-white text-gray-300" // Fails in light & dark',
    good: `<p className="bg-background text-foreground">
  Readable in light and dark mode
</p>
<span className="text-muted-foreground">Secondary text</span>`,
    language: 'CSS',
  },
  dev_rule_16: {
    bad: '<input value={arabicText} /> // LTR only; caret jumps',
    good: `<input
  dir="rtl"
  lang="ar"
  value={arabicText}
  onChange={(e) => setArabicText(e.target.value)}
/>`,
    language: 'JavaScript',
  },
  dev_rule_17: {
    bad: `value={bug.due_date} // null crashes picker
onChange={(d) => setDue(d.toISOString())}`,
    good: `const display = dueDate ? format(dueDate, "dd MMM yyyy") : "";
const payload = dueDate ? dueDate.toISOString() : null;

<DatePicker
  value={dueDate ?? undefined}
  onChange={(d) => setDueDate(d ?? null)}
/>`,
    language: 'JavaScript',
  },
  dev_rule_18: {
    bad: 'SELECT * FROM bugs WHERE project_id = ?',
    good: `SELECT * FROM bugs
WHERE project_id = ?
ORDER BY created_at DESC`,
    language: 'SQL',
  },
  dev_rule_19: {
    bad: '{loading && <p>Loading...</p>}',
    good: `{loading ? (
  <BugListSkeleton rows={6} />
) : (
  <BugList items={bugs} />
)}`,
    language: 'JavaScript',
  },
  dev_rule_20: {
    bad: '<img src="/hero.png" /> // Heavy PNG, eager load',
    good: `<img
  src="/hero.webp"
  loading="lazy"
  decoding="async"
  width={800}
  height={450}
  alt="Hero"
/>`,
    language: 'JavaScript',
  },
  dev_rule_21: {
    bad: '-- Filter/sort with no index\nWHERE status = ? ORDER BY created_at DESC',
    good: `CREATE INDEX idx_bugs_project_status_created
  ON bugs (project_id, status, created_at);`,
    language: 'SQL',
  },
  dev_rule_22: {
    bad: 'const bugs = await api.getAllBugs(); // Loads 5,000 rows',
    good: `const { data, total } = await api.getBugs({
  page: 1,
  limit: 20,
});`,
    language: 'JavaScript',
  },
  dev_rule_23: {
    bad: `console.log("user", user);
dd($payload); // Left in production`,
    good: `// Remove debug before push
// Use a logger gated by import.meta.env.DEV if needed
if (import.meta.env.DEV) {
  console.debug("draft", draft);
}`,
    language: 'JavaScript',
  },
  dev_rule_24: {
    bad: `const KEY = "sk_live_abc123"; // Hardcoded in source`,
    good: `// .env
VITE_API_URL=https://api.example.com

// code
const apiUrl = import.meta.env.VITE_API_URL;

// .gitignore
.env
.env.local`,
    language: 'JavaScript',
  },
  dev_rule_25: {
    bad: 'function calc() { /* undocumented magic */ }',
    good: `/**
 * Why: Caps retry delay so offline sync does not hammer the API.
 * @param attempt - zero-based retry count
 */
function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}`,
    language: 'JavaScript',
  },
  dev_rule_26: {
    bad: 'setShowModal(true) // Back button leaves the dashboard',
    good: `const openModal = () => {
  setShowModal(true);
  window.history.pushState({ modal: "edit" }, "");
};

useEffect(() => {
  const onPop = () => setShowModal(false);
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}, []);`,
    language: 'JavaScript',
  },
  dev_rule_27: {
    bad: `INSERT INTO users (name) VALUES ('test'); -- left in prod`,
    good: `-- Use seeded local/staging only
-- Never ship dummy "test" / "asdf" rows to production
if (import.meta.env.PROD && /^(test|asdf)$/i.test(name)) {
  throw new Error("Reject dummy data in production");
}`,
    language: 'JavaScript',
  },
  dev_rule_28: {
    bad: '<div className="flex nowrap">{longTitle}</div> // Overflows',
    good: `<div className="flex flex-wrap items-center gap-2 min-w-0">
  <p className="truncate max-w-full">{longTitle}</p>
</div>`,
    language: 'CSS',
  },
  dev_rule_29: {
    bad: 'setStatus("fixed"); await api.update(id); // No revert on failure',
    good: `const prev = status;
setStatus(next);
try {
  await api.updateStatus(id, next);
} catch {
  setStatus(prev);
  toast({ title: "Status not saved", variant: "destructive" });
}`,
    language: 'JavaScript',
  },
  dev_rule_30: {
    bad: '<p className="ml-4">{arabicText}</p> // Physical margin breaks RTL',
    good: `<div dir="rtl" lang="ar" className="ms-4">
  <input dir="rtl" value={arabicText} />
</div>`,
    language: 'JavaScript',
  },
  dev_rule_31: {
    bad: '.list { overflow: hidden; } // Scrollbar gone on long lists',
    good: `.list {
  overflow-y: auto;
  scrollbar-width: thin;
}
.list::-webkit-scrollbar { width: 6px; }`,
    language: 'CSS',
  },
  dev_rule_32: {
    bad: 'items.sort((a, b) => a.name.localeCompare(b.name)); // Mutates',
    good: `const sorted = [...items].sort((a, b) =>
  a.name.localeCompare(b.name)
);
// Or ORDER BY at the database query layer`,
    language: 'JavaScript',
  },

  // ── Tester / QA Stress Matrix (13) ─────────────────────────────────────
  qa_apple_sandbox: {
    bad: 'Checked Chrome on desktop only — skipped Safari / iOS WebKit.',
    good: `1. Open primary screens in Safari (macOS + iOS/WebKit when available)
2. Compare card radii, shadows, and grid alignment vs design
3. Resize / rotate — no overflow, clipped controls, or broken cards
4. Pass only if layout stays intact across Apple browsers`,
    language: 'QA Checklist',
  },
  qa_click_attack: {
    bad: 'Clicked Save once and assumed the button was safe.',
    good: `1. Rapid double- and triple-click Submit / Save / Delete
2. Confirm button disables or spinner locks immediately
3. Inspect network / DB — only one API record created
4. Pass only if duplicate submissions are blocked`,
    language: 'QA Checklist',
  },
  qa_theme_interruption: {
    bad: 'Verified light mode once; never toggled mid-form.',
    good: `1. Start a form in light mode, fill several fields
2. Toggle dark ↔ light repeatedly while typing
3. Check labels, placeholders, errors, and icons for contrast
4. Pass only if every text/control stays readable in both themes`,
    language: 'QA Checklist',
  },
  qa_input_interception: {
    bad: 'Closed the modal with dirty fields and lost data with no warning.',
    good: `1. Open a create/edit modal and change at least one field
2. Click backdrop, Esc, or browser back / navigate away
3. Expect an Unsaved Changes (or equivalent) confirm
4. Pass only if Cancel keeps the modal and Confirm discards safely`,
    language: 'QA Checklist',
  },
  qa_empty_array: {
    bad: 'Only tested pages that already had data — empty states ignored.',
    good: `1. Force empty lists (no projects, bugs, members, attachments)
2. Confirm a clear empty-state message / illustration appears
3. Ensure layout does not collapse or show raw “undefined”
4. Pass only if empty UI is intentional and readable`,
    language: 'QA Checklist',
  },
  qa_boundary_expansion: {
    bad: 'Typed a normal 10-digit phone and skipped paste / overflow cases.',
    good: `1. Paste 100+ digits into phone / ID constrained fields
2. Confirm input truncates to maxLength (e.g. 10 or 15)
3. Submit — payload must not exceed backend limits
4. Pass only if overflow is blocked in UI and API`,
    language: 'QA Checklist',
  },
  qa_network_break: {
    bad: 'Tested only happy-path online submits — no offline / 5xx check.',
    good: `1. Start a save/submit, then throttle Offline or block the request
2. Or force a 4xx/5xx from the API
3. Expect an immediate Toast / inline error (not a blank hang)
4. Pass only if the user is told what failed and can retry`,
    language: 'QA Checklist',
  },
  qa_console_zero: {
    bad: 'Ignored DevTools — shipped with red console errors.',
    good: `1. Open DevTools (F12) → Console before testing
2. Walk primary create / edit / delete flows
3. Reject if any red error or uncaught exception appears
4. Pass only with a clean console on verified paths`,
    language: 'QA Checklist',
  },
  qa_high_volume: {
    bad: 'Tested with 5 rows; never checked 100+ record views.',
    good: `1. Load a list with 100+ records (or seed staging)
2. Confirm pagination or infinite scroll is present
3. Scroll / page through — UI must not stutter or freeze
4. Pass only if scale controls work under load`,
    language: 'QA Checklist',
  },
  qa_script_injection: {
    bad: 'Accepted <script>alert("xss")</script> and executed it.',
    good: `1. Paste <script>alert('xss')</script> into text fields
2. Save and re-open the record / page
3. Script must not execute; layout must not break
4. Pass only if input is escaped / sanitized safely`,
    language: 'QA Checklist',
  },
  qa_modal_scope: {
    bad: 'Used a full-screen modal for a simple delete confirm.',
    good: `1. Delete confirm → Small (~400px)
2. Standard create/edit form → Medium (~600px)
3. Complex multi-section data → Large (950px+)
4. Pass only if modal size matches the task`,
    language: 'QA Checklist',
  },
  qa_rtl_stress: {
    bad: 'Arabic + numbers reversed caret / digit order.',
    good: `1. Enter Arabic text mixed with numerals
2. Confirm dir="rtl" and caret stay correct
3. Numbers must not reverse incorrectly
4. Pass only if RTL typography holds under stress`,
    language: 'QA Checklist',
  },
  qa_browser_back: {
    bad: 'Back exited the dashboard instead of closing the top modal.',
    good: `1. Open modal → drawer → nested tab (layered)
2. Press browser Back once per layer
3. Top overlay closes; app stays on the page
4. Pass only if history sync closes overlays in order`,
    language: 'QA Checklist',
  },
};

/** Split stored description into English requirement + Malayalam body. */
export function parseCodoRuleDescription(description: string): {
  requirement: string;
  malayalam?: string;
} {
  const raw = description?.trim() ?? '';
  if (!raw) return { requirement: '' };

  const match = raw.match(/^([\s\S]*?)\n+Malayalam:\s*([\s\S]*)$/i);
  if (match) {
    return {
      requirement: match[1].trim(),
      malayalam: match[2].trim() || undefined,
    };
  }

  return { requirement: raw };
}
