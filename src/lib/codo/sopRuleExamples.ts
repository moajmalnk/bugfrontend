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
  // ── Developer Rules (builtin catalog) ──────────────────────────────────
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

  // ── Section 8: SEO, Tracking & Marketing (selected keys) ───────────────
  dev_rule_33: {
    bad: '// No canonical — duplicate URLs compete in search',
    good: '<link rel="canonical" href={currentFullUrl} />',
    language: 'HTML',
  },
  dev_rule_35: {
    bad: '<h1>Projects</h1>\n<h1>Filters</h1> // Multiple H1s',
    good: `<h1>Projects</h1>
<h2>Active filters</h2>
<h3>Status</h3>`,
    language: 'HTML',
  },
  dev_rule_36: {
    bad: '<img src="/hero.png" /> // Heavy PNG, missing alt',
    good: `<img
  src="/hero.webp"
  alt="Product dashboard overview"
  loading="lazy"
  decoding="async"
/>`,
    language: 'JavaScript',
  },
  dev_rule_37: {
    bad: '// No structured data on public marketing pages',
    good: `<script type="application/ld+json">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "BugRicer",
  url: "https://bugs.bugricer.com",
})}
</script>`,
    language: 'JavaScript',
  },
  dev_rule_38: {
    bad: '<a href="https://wa.me/…">Chat</a> // No conversion event',
    good: `<button
  type="button"
  onClick={() => {
    window.gtag?.("event", "whatsapp_click", { location: "footer" });
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }}
>
  Chat on WhatsApp
</button>`,
    language: 'JavaScript',
  },
  dev_rule_40: {
    bad: '// No font preload; eager full-bleed PNG causes CLS',
    good: `<!-- index.html -->
<link
  rel="preload"
  href="/fonts/brand.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<img src="/hero.webp" alt="Hero" width={1200} height={630} loading="lazy" />`,
    language: 'HTML',
  },
  dev_rule_43: {
    bad: '// Unhandled routes fall through to a blank screen',
    good: `<Routes>
  {/* …app routes… */}
  <Route path="*" element={<NotFoundPage />} />
</Routes>`,
    language: 'JavaScript',
  },
  dev_rule_44: {
    bad: 'Safari shows 760 students and Chrome shows 260, so the team tells users to switch browsers.',
    good: `// Same user, same query, same DB — compare before blaming the browser
// URL, method, query, body, cookies, Authorization, status, body, timing
const students = await api.getStudents({ page, status });
// Response must match across Chrome, Safari, Edge, Firefox, and Brave`,
    language: 'JavaScript',
  },
  dev_rule_45: {
    bad: 'Ask the user to press Ctrl+Shift+R if the student count looks wrong.',
    good: `// Correct current data arrives on a normal load
// Cache-Control: private, no-cache
// After mutation, invalidate ["students"] and refetch`,
    language: 'JavaScript',
  },
  dev_rule_46: {
    bad: 'fetch(`/api/students?t=${Date.now()}`)',
    good: `header('Cache-Control: private, no-cache');
header('Vary: Cookie, Authorization');
// ETag / Last-Modified for safe revalidation
// Never cache authenticated responses in a shared or public cache`,
    language: 'PHP',
  },
  dev_rule_47: {
    bad: 'await api.createStudent(payload); // students list stays stale',
    good: `await api.createStudent(payload);
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ["students"] }),        // lists + pagination
  queryClient.invalidateQueries({ queryKey: ["student", id] }),     // detail view
  queryClient.invalidateQueries({ queryKey: ["dashboard-counts"] }), // counters + totals
]);
// UI refetches and shows the new student everywhere`,
    language: 'JavaScript',
  },
  dev_rule_48: {
    bad: 'const [students, setStudents] = useState([]); // plus a second React Query cache of the same list',
    good: `useQuery({
  queryKey: ["students", filters],
  queryFn: () => api.getStudents(filters),
  staleTime: 30_000,
});
// One owner. Invalidate this key after create/update/delete.`,
    language: 'JavaScript',
  },
  dev_rule_49: {
    bad: 'caches.match("/api/students") // stale private API served as current data',
    good: `// Network-only for /api/*
// Cache versioned static assets only
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete("app-v1"));
});`,
    language: 'JavaScript',
  },
  dev_rule_50: {
    bad: 'fetch("/api/students") // cookies omitted in one browser, Bearer token in another',
    good: `fetch("/api/students", {
  credentials: "include",
  headers: { Authorization: \`Bearer \${token}\` },
});
// Same cookie, CSRF, SameSite, Secure, and CORS policy in every client
// On 401 mid-operation: stop loading, keep the draft, prompt re-login
if (error.response?.status === 401) {
  setSaving(false);
  saveDraft(formData);
  openReauthDialog();
}`,
    language: 'JavaScript',
  },
  dev_rule_51: {
    bad: 'Backend renames `student_name` to `name` and the deployed app silently shows blank names.',
    good: `// Shared contract, validated on both sides
type StudentListResponse = {
  data: { id: string; name: string; phone: string | null }[];
  total: number;
  page: number;
};
// Error shape is always { message: string; errors?: Record<string, string[]> }
// Breaking change → /api/v2/students, keep /api/v1 until clients migrate`,
    language: 'TypeScript',
  },
  dev_rule_52: {
    bad: 'const balance = Number(localStorage.getItem("walletBalance")); // shown and submitted as truth',
    good: `// Backend owns the balance; the client only displays it
const { data: wallet } = useQuery({
  queryKey: ["wallet", userId],
  queryFn: () => api.getWallet(userId),
});
// Server recalculates totals on every payment — never trusts a client-sent total`,
    language: 'JavaScript',
  },
  dev_rule_53: {
    bad: 'try { setData(await api.get(url)); } catch {} // 401, 403, timeout and 5xx all look the same',
    good: `try {
  const res = await api.get(url, { signal, timeout: 15_000 });
  setState(res.data.length ? { status: "success", data: res.data } : { status: "empty" });
} catch (err) {
  if (axios.isCancel(err)) return;               // cancelled
  const code = err.response?.status;
  if (code === 401) return handleSessionExpired();
  if (code === 403) return setState({ status: "forbidden" });
  if (code === 422) return setState({ status: "invalid", errors: err.response.data.errors });
  setState({ status: "error", retry: true });    // timeout, network, 5xx
}`,
    language: 'JavaScript',
  },
  dev_rule_54: {
    bad: 'useEffect(() => { api.search(q).then(setResults); }, [q]); // late "A" response overwrites "ABC"',
    good: `useEffect(() => {
  const controller = new AbortController();
  api.search(q, { signal: controller.signal })
    .then(setResults)
    .catch((e) => { if (!axios.isCancel(e)) setError(e); });
  return () => controller.abort(); // query change or unmount cancels the stale request
}, [q]);`,
    language: 'JavaScript',
  },
  dev_rule_55: {
    bad: '<p>Total due: ₹{total ?? 0}</p> // shows ₹0 while loading or after an error',
    good: `{status === "loading" && <AmountSkeleton />}
{status === "error" && <InlineError onRetry={refetch} />}
{status === "success" && <p>Total due: {formatINR(total)}</p>}
{isStale && <Badge variant="outline">Last updated {relativeTime(updatedAt)}</Badge>}`,
    language: 'JavaScript',
  },
  dev_rule_56: {
    bad: `$pdo->exec("INSERT INTO payments ...");
$pdo->exec("UPDATE invoices SET status = 'paid' ..."); // fails → payment exists, invoice unpaid`,
    good: `$pdo->beginTransaction();
try {
  $pdo->prepare("INSERT INTO payments (invoice_id, amount) VALUES (?, ?)")->execute([$id, $amt]);
  $pdo->prepare("UPDATE invoices SET status = 'paid' WHERE id = ?")->execute([$id]);
  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  throw $e;
}`,
    language: 'PHP',
  },
  dev_rule_57: {
    bad: `$balance = getBalance($id);          // two requests read 100
setBalance($id, $balance - $amount);  // both write 50 → one debit lost`,
    good: `-- Atomic update; fails instead of going negative
UPDATE wallets
SET balance = balance - :amount, version = version + 1
WHERE id = :id AND balance >= :amount AND version = :version;
-- 0 rows affected → reload and retry or report a conflict`,
    language: 'SQL',
  },
  dev_rule_58: {
    bad: 'Client retries POST /payments after a timeout and the student is charged twice.',
    good: `// Client sends a stable key per logical operation
api.post("/payments", payload, { headers: { "Idempotency-Key": draftId } });

// Backend: UNIQUE(idempotency_key) — a replay returns the original result
// INSERT ... ON DUPLICATE KEY UPDATE id = id; then SELECT the stored payment`,
    language: 'JavaScript',
  },
  dev_rule_59: {
    bad: `foreach ($students as $s) {
  $s['package'] = $db->query("SELECT * FROM packages WHERE id = {$s['package_id']}"); // 100 queries
}`,
    good: `SELECT s.id, s.name, p.name AS package_name
FROM students s
LEFT JOIN packages p ON p.id = s.package_id
WHERE s.batch_id = ?
ORDER BY s.created_at DESC
LIMIT 20 OFFSET 0;`,
    language: 'SQL',
  },
  dev_rule_60: {
    bad: '{isAdmin && <DeleteButton />} // backend DELETE endpoint accepts any logged-in user',
    good: `// Every protected endpoint checks role AND resource access server-side
$user = $this->requireAuth();
if (!$this->canManageProject($user, $projectId)) {
  $this->sendJsonResponse(403, 'Forbidden');
  return;
}`,
    language: 'PHP',
  },
  dev_rule_61: {
    bad: 'Staging .env still has DB_HOST=prod-db and the live payment gateway key.',
    good: `# .env.development   → DB_NAME=app_dev,     PAYMENT_KEY=test_...
# .env.staging       → DB_NAME=app_staging, PAYMENT_KEY=test_...
# .env.production    → DB_NAME=app_prod,    PAYMENT_KEY=live_...
# Boot check: refuse to start if APP_ENV != production but DB_NAME = app_prod`,
    language: 'Shell',
  },
  dev_rule_62: {
    bad: 'ALTER TABLE students DROP COLUMN phone; -- old app version still reads it',
    good: `-- Step 1 (this release): additive, re-runnable
ALTER TABLE students ADD COLUMN mobile VARCHAR(15) NULL;
UPDATE students SET mobile = phone WHERE mobile IS NULL;
-- Step 2 (later release, after backup and once no client reads phone):
-- ALTER TABLE students DROP COLUMN phone;`,
    language: 'SQL',
  },
  dev_rule_63: {
    bad: 'error_log("Login failed: " . json_encode($_POST)); // logs the password',
    good: `error_log(json_encode([
  'event' => 'payment.create.failed',
  'request_id' => $requestId,
  'user_id' => $userId,
  'duration_ms' => $ms,
  'error' => $e->getMessage(),   // no passwords, tokens or card data
]));`,
    language: 'PHP',
  },
  dev_rule_64: {
    bad: 'Cursor generated the endpoint, it returned 200 once, so it was merged without review.',
    good: `AI-generated change checklist:
1. Read every line — no unexplained code
2. Tests / manual verification for success, error and edge cases
3. Security: auth, input validation, SQL parameters
4. Performance: no N+1, no unbounded queries
5. Normal code review before merge`,
    language: 'QA Checklist',
  },
  dev_rule_65: {
    bad: 'npm install moment lodash axios-retry  # for one date format and one retry',
    good: `Before adding a dependency:
1. Is it already covered? (date-fns, existing axios interceptor)
2. Last release / open issues — actively maintained?
3. Compatible with our React / Node / PHP versions?
4. npm audit / advisories clean?
5. Worth the bundle size?`,
    language: 'QA Checklist',
  },
  dev_rule_66: {
    bad: 'setTimeout(() => window.location.reload(), 500); // "fixes" stale student count',
    good: `Bug record before fixing:
- Environment, browser, device, user role
- Request URL / method / body and response status / body
- Database value for the same record
- Exact reproduction steps
Then fix the cause (e.g. missing query invalidation), not the symptom.`,
    language: 'QA Checklist',
  },
  dev_rule_67: {
    bad: 'Marked Done because it worked on localhost in Chrome.',
    good: `Release readiness:
1. Implementation complete and code reviewed
2. Tests passed; security and performance checked
3. Browsers / devices checked where applicable
4. Production build verified and deployed
5. Critical flow smoke-tested in production`,
    language: 'QA Checklist',
  },

  // ── Tester / QA Stress Matrix (34) ─────────────────────────────────────
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
4. Throttle to Slow 3G, submit, then retry after the slow response
5. Pass only if duplicate submissions are blocked`,
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
4. Repeat edit → validation error, API error, success, refresh, navigation
5. Pass only if Cancel keeps the modal, Confirm discards safely, and no old values leak into the next record`,
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
4. Go ONLINE → OFFLINE → ONLINE mid-operation, then retry
5. Pass only if the user is told what failed, retry succeeds, and no duplicate data exists`,
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
4. Repeat with 0, 1, normal and production-scale record counts
5. Pass only if scale controls work under load`,
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
  qa_loading_lifecycle: {
    bad: 'Only checked the happy path; the skeleton spins forever when the API times out.',
    good: `1. Force each exit: success, empty result, 5xx error, timeout, cancel (navigate away)
2. Confirm every skeleton / spinner ends in the matching state
3. Skeleton and data must never render together
4. Navigate between screens — no leftover skeleton from the previous view
5. Pass only if no loading state can stay active indefinitely`,
    language: 'QA Checklist',
  },
  qa_data_reconciliation: {
    bad: 'Screen showed the new payment, so the test passed — the database row was never checked.',
    good: `1. Perform the action and note the value shown in the UI
2. Compare with the API response (DevTools → Network)
3. Compare with the database row for the same record
4. Refresh the page — value must stay the same
5. Pass only if UI = API = database`,
    language: 'QA Checklist',
  },
  qa_mutation_sync: {
    bad: 'Deleted a student; the list updated but the dashboard count still showed the old total.',
    good: `1. Create / edit / delete / change status on a record
2. Check list, detail, counts, totals, dashboard, filters, pagination
3. Change the same record from another route or session
4. Pass only if every related screen shows the latest state without a hard refresh`,
    language: 'QA Checklist',
  },
  qa_race_condition: {
    bad: 'Typed slowly into search one character at a time — races never triggered.',
    good: `1. Throttle network, then type A → AB → ABC quickly
2. Rapidly toggle filters, sorting and date ranges
3. Final UI must match only the last input / selection
4. Pass only if no older response overwrites the latest result`,
    language: 'QA Checklist',
  },
  qa_navigation_during_requests: {
    bad: 'Waited for every request to finish before clicking anything else.',
    good: `1. Throttle network and start a load or save
2. Press Back / Forward / Refresh, change route or filter, close the modal, switch tabs
3. Confirm the obsolete response does not change the new screen
4. Pass only if no state corruption or unintended mutation happens`,
    language: 'QA Checklist',
  },
  qa_slow_api_timeout: {
    bad: 'Tested on office Wi-Fi only; a timeout left the Save button disabled forever.',
    good: `1. DevTools → Network → Slow 3G; walk the full flow
2. Block or delay a request past the client timeout
3. Expect the right skeleton, no duplicate submit, and a clear error with retry
4. Pass only if nothing freezes and controls re-enable`,
    language: 'QA Checklist',
  },
  qa_cross_browser_data: {
    bad: 'Chrome shows 260 students, Safari shows 760 — marked as a "Safari issue".',
    good: `1. Same account, same filters in Chrome, Safari, Firefox, Edge, Android Chrome, iOS Safari
2. Compare counts, totals and key records
3. On mismatch compare request URL / params / headers / response / cache / DB
4. Pass only if business results match everywhere`,
    language: 'QA Checklist',
  },
  qa_cache_isolation: {
    bad: "Logged out and in as another user and briefly saw the previous user's dashboard.",
    good: `1. First visit, normal refresh, hard refresh, private window
2. Right after a deployment
3. Logout → login, then a different account, then a different browser
4. Pass only if no stale or other-user data ever appears`,
    language: 'QA Checklist',
  },
  qa_concurrency: {
    bad: 'Tested with one tab and one user only.',
    good: `1. Open the same account in two tabs; edit the same record in both
2. Two users perform the same critical action at the same moment
3. Check DB for duplicates, lost updates, wrong counts or balances
4. Pass only if the final state is correct and newer data is never overwritten by stale data`,
    language: 'QA Checklist',
  },
  qa_session_expiry: {
    bad: 'Session expired mid-upload; the spinner kept spinning and the file was lost.',
    good: `1. Expire the token / session (delete it or wait for expiry)
2. Then view data, submit a form, edit, delete, upload
3. Expect a clear re-login prompt with no infinite loading
4. Pass only if no data is corrupted and no unauthorized change is saved`,
    language: 'QA Checklist',
  },
  qa_permission_boundary: {
    bad: 'Delete button is hidden for testers, so permissions were marked as passed.',
    good: `1. Run each critical action as authorized user, unauthorized user, wrong role, expired session
2. Also call the API directly (curl / Postman) with each identity
3. Backend must return 401 / 403 for disallowed calls
4. Pass only if the server enforces every boundary`,
    language: 'QA Checklist',
  },
  qa_pagination_integrity: {
    bad: 'Checked page 1 only.',
    good: `1. Visit first, middle and last page; change page size
2. Combine with filter, search and sorting
3. Collect IDs across pages — none missing, none repeated
4. Pass only if totals match the record count`,
    language: 'QA Checklist',
  },
  qa_financial_integrity: {
    bad: 'UI shows ₹1,000.00 but the database stores 999.995 — nobody compared.',
    good: `1. Compare displayed = API = database = hand-calculated amount
2. Test decimals, zero, large amounts
3. Test partial payment, full payment, refund, remaining balance
4. Pass only if rounding is consistent at every layer`,
    language: 'QA Checklist',
  },
  qa_api_contract: {
    bad: 'API returned `null` for phone and the screen showed "null".',
    good: `1. Capture real responses in DevTools / Postman
2. Check field names, types, null handling, status codes
3. Check pagination metadata and error body shape
4. Pass only if every field matches what the frontend expects`,
    language: 'QA Checklist',
  },
  qa_production_build_env: {
    bad: 'Approved the release after testing `npm run dev` against the staging API.',
    good: `1. Test the actual production build (npm run build + preview or deployed build)
2. Confirm API base URL, database, storage and keys are production
3. Confirm no dev flags / test credentials are active
4. Pass only if the production configuration is verified`,
    language: 'QA Checklist',
  },
  qa_deployment_smoke: {
    bad: 'Deployed on Friday evening and nobody opened the site afterwards.',
    good: `1. Site / app opens
2. Login works
3. Main dashboard loads
4. Critical read works
5. Critical create / update works
6. Logout works`,
    language: 'QA Checklist',
  },
  qa_regression: {
    bad: 'New invoice filter passed; nobody noticed that invoice export broke.',
    good: `1. List existing flows touched by the change (shared components, APIs, tables)
2. Re-test each of those flows end to end
3. Pass only if the new feature works AND existing features still work`,
    language: 'QA Checklist',
  },
  qa_performance_regression: {
    bad: 'Dashboard went from 4 API calls to 40 after the refactor — not noticed.',
    good: `1. Record API response time, request count, payload size before and after
2. Compare rendering time and bundle size
3. Check slow query log / query time for changed endpoints
4. Pass only if there is no unexplained regression`,
    language: 'QA Checklist',
  },
  qa_accessibility: {
    bad: 'Form can only be submitted with a mouse; errors are shown in red text only.',
    good: `1. Complete core flows using only Tab / Shift+Tab / Enter / Esc
2. Focus is always visible; inputs have labels
3. Check contrast in light and dark mode; errors are announced as text
4. Touch targets are at least 44px; headings are semantic
5. Pass only if core flows are keyboard-completable`,
    language: 'QA Checklist',
  },
  qa_responsive_matrix: {
    bad: 'Checked a 1440px desktop only.',
    good: `1. Mobile (360–414px), tablet (768px), laptop (1280px), desktop (1440px), large (1920px+)
2. Portrait and landscape on mobile and tablet
3. No horizontal overflow, clipped controls or unreadable text
4. Pass only if every breakpoint is usable`,
    language: 'QA Checklist',
  },
  qa_release_acceptance: {
    bad: 'Approved for production because the new feature demo looked good.',
    good: `1. Critical flows pass; no blocking defects
2. No critical console errors
3. No data integrity, authentication or authorization issues
4. No major loading issues or browser inconsistencies
5. No major performance regression
6. Production smoke test passes`,
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
