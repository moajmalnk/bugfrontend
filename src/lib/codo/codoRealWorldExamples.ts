/**
 * Expert-level real-world scenarios for every Common CODO rule (English + Malayalam).
 * Why: juniors often understand Bad/Good code only after seeing a production
 * failure story in a language they can read quickly.
 */

export type CodoRealWorldExample = {
  en: string;
  ml: string;
};

export const CODO_REAL_WORLD_EXAMPLES: Record<string, CodoRealWorldExample> = {
  dev_rule_1: {
    en: `HR opens Edit Leave for Arjun, changes dates, closes the modal, then opens Priya. Priya’s form still shows Arjun’s dates until hard refresh. Reset form state on close/unmount so each record loads only its own values.`,
    ml: `HR അർജുന്റെ Edit Leave തുറന്ന് തീയതി മാറ്റി മോഡൽ അടച്ച് പ്രിയ തുറക്കുമ്പോൾ പഴയ തീയതി നിൽക്കുന്നു. ക്ലോസ്/അൻമൗണ്ടില് ഫോം സ്റ്റേറ്റ് റീസെറ്റ് ചെയ്ത് ഓരോ റെക്കോർഡും സ്വന്തം വാല്യൂ മാത്രം ലോഡ് ചെയ്യണം.`,
  },
  dev_rule_2: {
    en: `On Create Client, the user types “moajmal@” and only learns the email is invalid after Submit. Show an inline error as they type so they fix it before the API call.`,
    ml: `Create Client-ല് തെറ്റായ ഇമെയില് ടൈപ്പ് ചെയ്താല് Submit-നു് ശേഷം മാത്രം എറർ അറിയുന്നു. ടൈപ്പ് ചെയ്യുമ്പോൾ തന്നെ ഇൻലൈൻ എറർ കാണിച്ച് API-ക്ക് മുമ്പ് തിരുത്തുക.`,
  },
  dev_rule_3: {
    en: `A developer fills a long OT request, accidentally clicks the backdrop, and loses every field with no warning. If the form is dirty, ask “You have unsaved changes” before closing.`,
    ml: `ലോംഗ് OT ഫോം പൂരിപ്പിച്ച് ബാക്ക്ഡ്രോപ്പ് അബദ്ധത്തില് ക്ലിക്ക് ചെയ്താല് വാണിംഗ് ഇല്ലാതെ എല്ലാ ഫീൽഡും നഷ്ടമാകും. Dirty ആണെങ്കിൽ അടയ്ക്കുന്നതിന് മുമ്പ് Unsaved Changes ചോദിക്കുക.`,
  },
  dev_rule_4: {
    en: `After a successful bug create, Cancel on the next create still shows the previous title/attachments because local arrays were never cleared. Explicitly wipe state on cancel and on success.`,
    ml: `ബഗ് create വിജയിച്ച ശേഷം അടുത്ത create-ല് Cancel അമർത്തിയാലും പഴയ title/attachments നിൽക്കുന്നു. Cancel-ലും success-ലും സ്റ്റേറ്റ് വ്യക്തമായി മായ്ക്കുക.`,
  },
  dev_rule_5: {
    en: `On onboarding, a user pastes a 40-digit string into Phone. The API rejects it or the DB truncates silently. Clamp to 10 digits on every change (including paste) before submit.`,
    ml: `ഓൺബോർഡിംഗിൽ Phone-ല് 40 ഡിജിറ്റ് പേസ്റ്റ് ചെയ്യുന്നു; API റിജക്ട് ചെയ്യുകയോ DB ട്രങ്കേറ്റ് ചെയ്യും. പേസ്റ്റ് ഉൾപ്പെടെ ഓരോ മാറ്റത്തിലും 10 ഡിജിറ്റിലേക്ക് ക്ലാമ്പ് ചെയ്യുക.`,
  },
  dev_rule_6: {
    en: `A tester pastes \`<script>alert(1)</script>\` into a bug comment. If the UI uses innerHTML or the API concatenates SQL, it becomes XSS or injection. Sanitize on the client and use prepared statements + strip tags on the server.`,
    ml: `ടെസ്റ്റർ ബഗ് കമന്റില് script പേസ്റ്റ് ചെയ്യുന്നു. UI/API ദുർബലമാണെങ്കിൽ XSS അല്ലെങ്കിൽ SQL injection ആകാം. ക്ലയന്റില് sanitize; സർവറില് prepared statement + strip_tags.`,
  },
  dev_rule_7: {
    en: `Bug title is VARCHAR(100). A user pastes a paragraph; MySQL errors or truncates mid-word. Match the DB with maxLength={100} and slice on change.`,
    ml: `ബഗ് title VARCHAR(100). ഖണ്ഡിക പേസ്റ്റ് ചെയ്താല് MySQL എറർ അല്ലെങ്കിൽ ട്രങ്കേറ്റ്. maxLength={100} നൽകി onChange-ല് slice ചെയ്യുക.`,
  },
  dev_rule_8: {
    en: `On Slow 3G, a user double-clicks “Submit OT”. Two rows appear in the database. Disable the button and show a spinner on first click; ignore further clicks while loading.`,
    ml: `Slow 3G-യിൽ Submit OT ഡബിൾ ക്ലിക്ക് ചെയ്താല് DB-യിൽ രണ്ട് റോ. ആദ്യ ക്ലിക്കില് ബട്ടൺ ഡിസേബിൾ + സ്പിന്നർ; ലോഡിംഗ് കഴിയും വരെ അധിക ക്ലിക്കുകൾ അവഗണിക്കുക.`,
  },
  dev_rule_9: {
    en: `Admin clicks Delete on a user and the API fires immediately — no undo. Always open a ~400px confirm modal (“Delete moajmalnk?”) before the destructive call.`,
    ml: `Admin Delete അമർത്തിയ ഉടൻ API പോകുന്നു — undo ഇല്ല. ഡിസ്ട്രക്ടീവ് കോളിന് മുമ്പ് ~400px കൻഫർമ് മോഡൽ നിർബന്ധം.`,
  },
  dev_rule_10: {
    en: `Pay Verify Save stays clickable with empty project and invalid hours. Disable Submit until every required field validates true.`,
    ml: `Pay Verify-യിൽ project/മവാര് തെറ്റാണെങ്കിലും Save ക്ലിക്ക് ചെയ്യാം. ആവശ്യമായ എല്ലാ ഫീൽഡും valid ആകുന്നതുവരെ Submit ഡിസേബിൾ ആക്കുക.`,
  },
  dev_rule_11: {
    en: `A new modal uses \`rounded-sm\` cards and sharp buttons while the rest of BugRicer uses rounded-xl/2xl. The screen looks like a different product. Use rounded-xl or rounded-2xl on containers and controls.`,
    ml: `പുതിയ മോഡൽ rounded-sm ഉപയോഗിക്കുന്നു; ബാക്കി BugRicer rounded-xl/2xl ആണ് — മറ്റൊരു പ്രോഡക്ട് പോലെ കാണും. കണ്ടെയ്നറുകളിലും ബട്ടണുകളിലും rounded-xl അല്ലെങ്കിൽ rounded-2xl ഉപയോഗിക്കുക.`,
  },
  dev_rule_12: {
    en: `Leave filters wrap unevenly on tablet because the layout is flex-wrap with no grid. Use a 12-column grid with gap-4/gap-6 so fields align across breakpoints.`,
    ml: `ടാബ്‌ലെറ്റിൽ Leave ഫിൽട്ടറുകൾ വളഞ്ഞി വരുന്നു — grid ഇല്ലാത്ത flex-wrap. gap-4/gap-6 ഉള്ള 12-കോളം ഗ്രിഡ് ഉപയോഗിച്ച് ഫീൽഡുകൾ അലൈൻ ചെയ്യുക.`,
  },
  dev_rule_13: {
    en: `Bug list cards use \`mb-4\` inside \`.map()\`, so the last card has extra dead space and spacing drifts when items filter. Put \`gap-4\` on the parent flex/grid instead.`,
    ml: `ബഗ് ലിസ്റ്റ് കാർഡുകളിൽ .map()-നുള്ളിൽ mb-4 — അവസാന കാർഡില് അധിക സ്പേസ്. പാരന്റ് flex/grid-ല് gap-4 നൽകുക.`,
  },
  dev_rule_14: {
    en: `Someone sets \`body { overflow: hidden }\` to “fix” a modal and the whole dashboard cannot scroll on mobile. Keep overflow on local panels and use Codo slim scrollbars there.`,
    ml: `മോഡൽ ഫിക്സ് ചെയ്യാൻ body overflow:hidden ഇട്ടാല് മൊബൈലിൽ ഡാഷ്ബോർഡ് സ്ക്രോൾ ചെയ്യാനാകില്ല. ലോക്കൽ പാനലുകളിൽ overflow + Codo സ്ലിം സ്ക്രോൾബാർ ഉപയോഗിക്കുക.`,
  },
  dev_rule_15: {
    en: `In dark mode, muted labels become gray-on-gray and fail contrast. Use theme tokens (\`text-foreground\`, \`text-muted-foreground\`, \`bg-background\`) and toggle light/dark mid-form to verify.`,
    ml: `ഡാർക്ക് മോഡിൽ muted ലേബലുകൾ ചാരനിറത്തിൽ മങ്ങി കോൺട്രാസ്റ്റ് തകരും. തീം ടോക്കണുകൾ ഉപയോഗിച്ച് ഫോം പൂരിപ്പിക്കുമ്പോൾ light/dark ടോഗിൾ ചെയ്ത് പരിശോധിക്കുക.`,
  },
  dev_rule_16: {
    en: `An Arabic client name field is LTR-only; the caret jumps when typing mixed Arabic + digits. Set \`dir="rtl"\` (and \`lang="ar"\`) on that input and keep numbers aligned correctly.`,
    ml: `അറബിക് ക്ലയന്റ് പേര് ഫീൽഡ് LTR മാത്രം; അറബിക്+ഡിജിറ്റ് ടൈപ്പ് ചെയ്യുമ്പോൾ കാരറ്റ് ചാടും. ആ ഇൻപുട്ടില് dir="rtl" (കൂടി lang="ar") സജ്ജമാക്കുക.`,
  },
  dev_rule_17: {
    en: `Bug due-date is null; the DatePicker crashes on \`.toISOString()\`. Treat null as empty display, send null in the payload, and never force a fake date.`,
    ml: `ബഗ് due-date null ആണ്; DatePicker .toISOString()-ല് ക്രാഷ് ആകും. null-നെ ശൂന്യ ഡിസ്പ്ലേ ആയി കാണിക്കുക, പേലോഡില് null അയയ്ക്കുക — വ്യാജ തീയതി നിർബന്ധിക്കരുത്.`,
  },
  dev_rule_18: {
    en: `Bugs list returns random order so “newest” jumps between refreshes. Always \`ORDER BY created_at DESC\` (or the product’s agreed sort) in every list query.`,
    ml: `ബഗ് ലിസ്റ്റ് ക്രമരഹിതം വരുന്നു — റിഫ്രഷില് newest ചാടും. എല്ലാ ലിസ്റ്റ് ക്വറിയിലും ORDER BY created_at DESC നിർബന്ധം.`,
  },
  dev_rule_19: {
    en: `Projects page shows a blank white screen or “Loading…” text for 2 seconds. Use a layout-matching skeleton, and end loading in success, empty, error, timeout, or cancelled — never spin forever.`,
    ml: `Projects പേജ് 2 സെക്കൻഡ് ശൂന്യ സ്ക്രീൻ അല്ലെങ്കിൽ Loading ടെക്സ്ട്. Skeleton ഉപയോഗിച്ച് loading success/empty/error/timeout/cancelled-ല് അവസാനിപ്പിക്കുക — അനന്ത സ്പിന്നർ വേണ്ട.`,
  },
  dev_rule_20: {
    en: `Dashboard hero is a 4MB PNG that blocks the main thread on first paint. Ship WebP, lazy-load below-the-fold images, and keep interaction under ~1.5s.`,
    ml: `ഡാഷ്ബോർഡ് hero 4MB PNG — ആദ്യ പെയിന്റില് മെയിൻ ത്രെഡ് ബ്ലോക്ക്. WebP ഉപയോഗിക്കുക, താഴെയുള്ള ഇമേജുകൾ lazy-load ചെയ്യുക, ഇന്ററാക്ഷൻ ~1.5s-നുള്ളിൽ നിലനിർത്തുക.`,
  },
  dev_rule_21: {
    en: `Filtering bugs by project + status takes 4s because \`status\` and \`created_at\` are unindexed. Index columns used in WHERE, JOIN, and ORDER BY; confirm with EXPLAIN.`,
    ml: `project + status ഫിൽട്ടർ 4 സെക്കൻഡ് എടുക്കുന്നു — ഇൻഡക്സ് ഇല്ല. WHERE/JOIN/ORDER BY കോളങ്ങൾ ഇൻഡക്സ് ചെയ്ത് EXPLAIN കൊണ്ട് ഉറപ്പാക്കുക.`,
  },
  dev_rule_22: {
    en: `Admin loads all 5,000 bugs into the browser; the tab freezes. Paginate or infinite-scroll (e.g. 20 per page) and return only needed fields.`,
    ml: `Admin 5000 ബഗുകളും ബ്രൗസറിലേക്ക് ലോഡ് ചെയ്യുന്നു — ടാബ് ഫ്രീസ്. പേജിനേഷൻ അല്ലെങ്കിൽ infinite scroll; ആവശ്യമായ ഫീൽഡുകൾ മാത്രം തിരികെ നൽകുക.`,
  },
  dev_rule_23: {
    en: `Production console shows \`console.log(user, token)\` from a forgotten debug. Strip debug logs before merge; gate temporary logs behind DEV only.`,
    ml: `പ്രൊഡക്ഷൻ കൻസോളില് മറന്ന console.log(user, token) കാണാം. മെർജിന് മുമ്പ് ഡീബഗ് ലോഗുകൾ നീക്കം ചെയ്യുക; താൽക്കാലിക ലോഗ് DEV-ല് മാത്രം.`,
  },
  dev_rule_24: {
    en: `A Razorpay live key is hardcoded in a React file and ships to GitHub. Keep secrets in \`.env\`, gitignore them, and never commit keys.`,
    ml: `Razorpay live key React ഫയലില് ഹാർഡ്‌കോഡ് ചെയ്ത് GitHub-ലേക്ക് പോകുന്നു. സീക്രട്ടുകൾ .env-ല് മാത്രം; gitignore ചെയ്യുക; കീ കമ്മിറ്റ് ചെയ്യരുത്.`,
  },
  dev_rule_25: {
    en: `A retry helper uses magic numbers with no explanation; the next engineer “fixes” it and hammers the API. Add a short JSDoc/PHPDoc stating why the backoff exists.`,
    ml: `Retry helper-ില് വിശദീകരണമില്ലാത്ത magic numbers — അടുത്ത എൻജിനീയർ ഫിക്സ് ചെയ്ത് API അടിക്കും. backoff എന്തിനാണെന്ന് ചെറിയ JSDoc/PHPDoc എഴുതുക.`,
  },
  dev_rule_26: {
    en: `User opens Edit Bug, then presses browser Back and leaves the whole bugs page. Push modal state to history so Back closes the modal first.`,
    ml: `Edit Bug തുറന്ന് browser Back അമർത്തിയാല് മുഴുവൻ bugs പേജ് വിടുന്നു. മോഡൽ സ്റ്റേറ്റ് history-യിലേക്ക് push ചെയ്ത് Back ആദ്യം മോഡൽ അടയ്ക്കണം.`,
  },
  dev_rule_27: {
    en: `Staging seed users named “test” / “asdf” are copied into production and appear in client reports. Reject dummy names in production and seed only non-prod DBs.`,
    ml: `Staging-ലെ test/asdf യൂസറുകൾ പ്രൊഡക്ഷനിലേക്ക് പോയി റിപ്പോർട്ടില് വരുന്നു. പ്രൊഡക്ഷനിൽ ഡമ്മി പേരുകൾ റിജക്ട് ചെയ്യുക; seed non-prod DB-യിൽ മാത്രം.`,
  },
  dev_rule_28: {
    en: `A 80-character project name blows the card layout and pushes the status badge off-screen. Use min-w-0, truncate/wrap, and flex-wrap so long content stays inside the card.`,
    ml: `80 ക്യാരക്ടർ പ്രോജക്ട് പേര് കാർഡ് ലേഔട്ട് തകർത്ത് status badge പുറത്താക്കും. min-w-0, truncate/wrap, flex-wrap ഉപയോഗിച്ച് നീണ്ട കണ്ടന്റ് കാർഡിനുള്ളിൽ നിർത്തുക.`,
  },
  dev_rule_29: {
    en: `Bug status flips to Fixed in the UI, the API fails, and the board stays wrong until refresh. Optimistically update, then revert + toast if the API fails.`,
    ml: `UI-യിൽ status Fixed ആകുന്നു; API പരാജയപ്പെടുന്നു — റിഫ്രഷ് വരെ ബോർഡ് തെറ്റ്. Optimistic update ചെയ്ത് API fail ആയാല് revert + toast കാണിക്കുക.`,
  },
  dev_rule_30: {
    en: `Arabic help text uses \`ml-4\`, so in RTL the gap appears on the wrong side. Use logical spacing (\`ms-4\`) inside a \`dir="rtl"\` container.`,
    ml: `അറബിക് ഹെൽപ്പ് ടെക്സ്ടില് ml-4 — RTL-ല് സ്പേസ് തെറ്റായ വശത്ത്. dir="rtl" കണ്ടെയ്നറില് logical spacing (ms-4) ഉപയോഗിക്കുക.`,
  },
  dev_rule_31: {
    en: `A long members list uses \`overflow: hidden\` and users cannot reach the last row. Use \`overflow-y: auto\` with a thin scrollbar on the list panel.`,
    ml: `നീണ്ട members ലിസ്റ്റില് overflow:hidden — അവസാന റോ കാണാനാകില്ല. ലിസ്റ്റ് പാനലില് overflow-y:auto + നേർത്ത സ്ക്രോൾബാർ ഉപയോഗിക്കുക.`,
  },
  dev_rule_32: {
    en: `Sorting clients with \`clients.sort()\` mutates React state and reorders the source mid-render. Sort a copy (\`[...clients].sort(...)\`) or sort in SQL.`,
    ml: `clients.sort() React സ്റ്റേറ്റ് mutate ചെയ്ത് റെന്ടർ മധ്യത്തില് ക്രമം മാറ്റും. കോപ്പി സോർട് ചെയ്യുക ([...clients].sort) അല്ലെങ്കിൽ SQL-ല് ORDER BY.`,
  },
  dev_rule_33: {
    en: `Blog post A sets canonical to post B to clear a Search Console warning. Google drops A from search. Each page’s canonical must self-reference its final preferred URL.`,
    ml: `Blog post A-യുടെ canonical B-യിലേക്ക് ചൂണ്ടി GSC warning മാറ്റാൻ ശ്രമിക്കുന്നു — Google A ഒഴിവാക്കും. ഓരോ പേജിന്റെയുടെയും canonical സ്വന്തം final URL ആയിരിക്കണം.`,
  },
  dev_rule_35: {
    en: `Projects page has two \`<h1>\` tags (“Projects” and “Filters”). Screen readers and SEO lose hierarchy. One \`<h1>\`, then ordered \`<h2>\` / \`<h3>\`.`,
    ml: `Projects പേജില് രണ്ട് <h1> — സ്ക്രീൻ റീഡറും SEO-യും തകരും. ഒരു <h1> മാത്രം; പിന്നെ ക്രമത്തില് <h2>/<h3>.`,
  },
  dev_rule_36: {
    en: `Marketing hero is a heavy PNG with empty alt. Convert to WebP, set dimensions, and write a real alt describing the image.`,
    ml: `മാർക്കറ്റിംഗ് hero ഭാരമുള്ള PNG + ശൂന്യ alt. WebP ആക്കുക, width/height നൽകുക, ഇമേജ് വിവരിക്കുന്ന യഥാർത്ഥ alt എഴുതുക.`,
  },
  dev_rule_37: {
    en: `Public BugRicer marketing pages have no Organization/FAQ JSON-LD, so rich results stay thin. Inject valid schema for the page type in metadata.`,
    ml: `പബ്ലിക് മാർക്കറ്റിംഗ് പേജുകളിൽ Organization/FAQ JSON-LD ഇല്ല — rich results ദുർബലം. പേജ് തരത്തിന് സാധുവായ schema metadata-യിൽ inject ചെയ്യുക.`,
  },
  dev_rule_38: {
    en: `WhatsApp CTA in the footer gets clicks but marketing cannot attribute them. Fire a gtag/analytics event on WhatsApp, phone, and form submit actions.`,
    ml: `ഫൂട്ടറിലെ WhatsApp CTA ക്ലിക്ക് ലഭിക്കുന്നു; മാർക്കറ്റിംഗിനു ആട്രിബ്യൂട് ചെയ്യാനാകില്ല. WhatsApp, ഫോൺ, ഫോം സബ്മിറ്റില് gtag/analytics ഇവന്റ് ഫയർ ചെയ്യുക.`,
  },
  dev_rule_40: {
    en: `Fonts load late and the hero image has no width/height, causing layout jump (CLS). Preload critical fonts, lazy-load images, and reserve space.`,
    ml: `ഫോണ്ട് വൈകി ലോഡ്; hero-യ്ക്ക് width/height ഇല്ല — ലേഔട്ട് ജമ്പ് (CLS). ക്രിട്ടിക്കൽ ഫോണ്ട് preload, ഇമേജ് lazy-load, സ്പേസ് റിസർവ് ചെയ്യുക.`,
  },
  dev_rule_43: {
    en: `A typo URL \`/admin/bugz\` shows a blank React screen. Add a branded NotFound route for \`path="*"\` so every unknown path is intentional.`,
    ml: `തെറ്റായ URL /admin/bugz ശൂന്യ React സ്ക്രീൻ കാണിക്കുന്നു. path="*"-ന് ബ്രാൻഡഡ് NotFound റൂട്ട് ചേർത്ത് അജ്ഞാത പാതകൾ ഉദ്ദേശ്യപൂർവം കൈകാര്യം ചെയ്യുക.`,
  },
  dev_rule_44: {
    en: `Safari shows 760 students and Chrome shows 260 for the same account. Before blaming the browser, compare URL, headers, cookies, response body, cache, and the DB count.`,
    ml: `ഒരേ അക്കൗണ്ടില് Safari 760, Chrome 260 students കാണിക്കുന്നു. ബ്രൗസറിനെ കുറ്റപ്പെടുത്തുന്നതിന് മുമ്പ് URL, headers, cookies, response, cache, DB കൗണ്ട് താരതമ്യം ചെയ്യുക.`,
  },
  dev_rule_45: {
    en: `Users are told “press Ctrl+Shift+R if Pay Verify totals look wrong.” That is a cache/state defect. Fix invalidation so a normal load shows correct data.`,
    ml: `Pay Verify totals തെറ്റാണെങ്കിൽ Ctrl+Shift+R അമർത്തുക എന്ന് പറയുന്നു — അത് cache/state ഡിഫെക്ട്. സാധാരണ ലോഡില് ശരിയായ ഡാറ്റ വരാൻ invalidation ഫിക്സ് ചെയ്യുക.`,
  },
  dev_rule_46: {
    en: `Authenticated \`/api/students\` is cached publicly or clients append \`?t=Date.now()\` forever. Set Cache-Control (private, no-cache for sensitive data) and intentional revalidation instead.`,
    ml: `Authenticated API പബ്ലിക് കാഷ് ആകുകയോ ?t=Date.now() എപ്പോഴും ചേർക്കുകയോ ചെയ്യുന്നു. Cache-Control (private, no-cache) + ഉദ്ദേശ്യപൂർവ revalidation ഉപയോഗിക്കുക.`,
  },
  dev_rule_47: {
    en: `After creating a leave request, the list still shows the old count until hard refresh. Invalidate list, detail, and dashboard queries after every successful mutation.`,
    ml: `Leave create ചെയ്ത ശേഷം ഹാർഡ് റിഫ്രഷ് വരെ പഴയ കൗണ്ട് നിൽക്കുന്നു. ഓരോ വിജയകരമായ mutation-നു് ശേഷം list, detail, dashboard ക്വറികൾ invalidate ചെയ്യുക.`,
  },
  dev_rule_48: {
    en: `Bug counts live in both local useState and React Query with different stale times, so two widgets disagree. One cache owner, explicit staleTime, invalidate after mutations.`,
    ml: `ബഗ് കൗണ്ട് useState-ലും React Query-യിലും വ്യത്യസ്ത staleTime-ല് — രണ്ട് വിഡ്ജറ്റുകൾ വ്യത്യസ്തം. ഒരു cache owner, വ്യക്തമായ staleTime, mutation-നു് ശേഷം invalidate.`,
  },
  dev_rule_49: {
    en: `A service worker caches \`/api/bugs\` and serves yesterday’s private data after deploy. Network-only for APIs; version static assets; delete old caches on activate.`,
    ml: `Service worker /api/bugs കാഷ് ചെയ്ത് ഡിപ്ലോയ്ക്ക് ശേഷം ഇന്നലത്തെ സ്വകാര്യ ഡാറ്റ നൽകുന്നു. API-ക്ക് network-only; static assets വേർഷൻ ചെയ്യുക; activate-ല് പഴയ കാഷ് മായ്ക്കുക.`,
  },
  dev_rule_50: {
    en: `Chrome sends cookies; Safari omits credentials on the same endpoint → silent 401 mid-save. Use one auth strategy everywhere; on 401 stop loading, keep the draft, prompt re-login.`,
    ml: `Chrome കുക്കി അയയ്ക്കുന്നു; Safari അതേ എൻഡ്‌പോയിന്റില് credentials ഒഴിവാക്കുന്നു — സേവ് മധ്യത്തില് നിശബ്ദ 401. എല്ലായിടത്തും ഒരേ auth; 401-ല് ലോഡിംഗ് നിർത്തി ഡ്രാഫ്ട് നിലനിർത്തി റീലോഗിൻ ചോദിക്കുക.`,
  },
  dev_rule_51: {
    en: `Backend renames \`student_name\` to \`name\`; production UI shows blank names. Agree on contracts; version breaking APIs (\`/v2\`) until all clients migrate.`,
    ml: `Backend student_name-നെ name ആക്കി; പ്രൊഡക്ഷൻ UI ശൂന്യ പേരുകൾ കാണിക്കുന്നു. കോൺട്രാക്ട് യോജിപ്പിക്കുക; ക്ലയന്റുകൾ migrate ചെയ്യും വരെ /v2 പോലെ വേർഷൻ ചെയ്യുക.`,
  },
  dev_rule_52: {
    en: `Wallet balance is read from localStorage and submitted as truth after a failed payment. Backend owns balances; the client only displays server-calculated values.`,
    ml: `പേയ്മെന്റ് പരാജയപ്പെട്ട ശേഷം localStorage-ലെ wallet balance സത്യം ആയി സബ്മിറ്റ് ചെയ്യുന്നു. ബാലൻസിന്റെ ഉടമ backend; ക്ലയന്റ് സർവർ വാല്യൂ മാത്രം കാണിക്കുക.`,
  },
  dev_rule_53: {
    en: `A failed leave API leaves the button spinning forever; 401 and 500 look the same. Handle loading, empty, 422, 401, 403, timeout, network, 5xx, and cancel explicitly.`,
    ml: `Leave API പരാജയപ്പെട്ടാല് ബട്ടൺ എന്നെന്നേക്കും സ്പിൻ ചെയ്യുന്നു; 401-ഉം 500-ഉം ഒരുപോലെ. loading, empty, 422, 401, 403, timeout, network, 5xx, cancel വ്യക്തമായി കൈകാര്യം ചെയ്യുക.`,
  },
  dev_rule_54: {
    en: `User types “A → AB → ABC” in search; a late “A” response overwrites “ABC”. Abort prior requests (AbortController / query keys) so only the latest result wins.`,
    ml: `സെർച്ചില് A	o AB	o ABC ടൈപ്പ് ചെയ്യുമ്പോൾ വൈകിയ "A" റെസ്പോൺസ് "ABC" മാറ്റിയെഴുതും. AbortController/query keys കൊണ്ട് പഴയ റിക്വസ്റ്റ് റദ്ദാക്കി ഏറ്റവും പുതിയ ഫലം മാത്രം കാണിക്കുക.`,
  },
  dev_rule_55: {
    en: `While Pay Verify loads, the UI shows Total due ₹0 as if it were real. Show a skeleton/error state; never present placeholder zeros as current business data.`,
    ml: `Pay Verify ലോഡ് ചെയ്യുമ്പോൾ Total due ₹0 യഥാർത്ഥ ഡാറ്റ പോലെ കാണിക്കുന്നു. Skeleton/error കാണിക്കുക; പ്ലേസ്ഹോൾഡർ പൂജ്യം ബിസിനസ് ഡാറ്റയായി കാണിക്കരുത്.`,
  },
  dev_rule_56: {
    en: `Payment insert succeeds but invoice status update fails — student is charged and still “unpaid”. Wrap multi-table writes in a transaction and roll back on any failure.`,
    ml: `Payment insert വിജയിക്കുന്നു; invoice status update പരാജയപ്പെടുന്നു — ചാർജ് ആയി പക്ഷേ unpaid. മൾട്ടി-ടേബിൾ റൈറ്റുകൾ transaction-ല്; ഏതെങ്കിലും fail ആയാല് roll back.`,
  },
  dev_rule_57: {
    en: `Two admins approve the same OT at once; both read balance 100 and both write 50. Use atomic SQL / row locks / version checks, not read-modify-write in app code.`,
    ml: `രണ്ട് admin ഒരേ OT ഒരേസമയം അംഗീകരിക്കുന്നു — ഇരുവരും 100 വായിച്ച് 50 എഴുതുന്നു. App-ല് read-modify-write അല്ല; atomic SQL / row lock / version check ഉപയോഗിക്കുക.`,
  },
  dev_rule_58: {
    en: `Client retries POST /payments after timeout; the student is charged twice. Require an Idempotency-Key (or unique constraint) so replays return the original result.`,
    ml: `Timeout-നു് ശേഷം POST /payments റീട്രൈ — വിദ്യാർത്ഥിയെ രണ്ട് തവണ ചാർജ് ചെയ്യും. Idempotency-Key അല്ലെങ്കിൽ unique constraint കൊണ്ട് റീപ്ലേ യഥാർത്ഥ ഫലം തിരികെ നൽകണം.`,
  },
  dev_rule_59: {
    en: `Loading 100 project members runs 100 extra package queries. Join or batch (\`WHERE id IN (...)\`) so one list request stays O(1) queries relative to page size.`,
    ml: `100 project members ലോഡ് ചെയ്യുമ്പോൾ 100 അധിക package ക്വറി. JOIN അല്ലെങ്കിൽ batch (WHERE id IN) ഉപയോഗിച്ച് പേജ് സൈസിനു അനുസരിച്ച് ക്വറി എണ്ണം നിയന്ത്രിക്കുക.`,
  },
  dev_rule_60: {
    en: `Delete User is hidden for testers in the UI, but the DELETE API accepts any logged-in token. Enforce role + resource checks on every protected endpoint.`,
    ml: `UI-യിൽ ടെസ്റ്റർക്ക് Delete മറച്ചിരിക്കുന്നു; DELETE API ഏത് ലോഗിൻ ടോക്കണും സ്വീകരിക്കുന്നു. ഓരോ സംരക്ഷിത എൻഡ്‌പോയിന്റിലും role + resource ചെക്ക് നിർബന്ധം.`,
  },
  dev_rule_61: {
    en: `Staging \`.env\` still points at the production DB and live payment key. Separate credentials per environment; refuse to boot if non-prod targets prod data.`,
    ml: `Staging .env ഇപ്പോഴും പ്രൊഡക്ഷൻ DB-യും live payment key-യും ചൂണ്ടുന്നു. ഓരോ എൻവയോൺമെന്റിനും വേറിട്ട ക്രെഡൻഷ്യൽ; non-prod prod ഡാറ്റ ലക്ഷ്യമാക്കിയാല് boot റിജക്ട് ചെയ്യുക.`,
  },
  dev_rule_62: {
    en: `A migration drops \`phone\` while the live app still reads it — production breaks. Prefer additive, re-runnable migrations; drop columns only after clients stop using them.`,
    ml: `ലൈവ് ആപ്പ് ഇപ്പോഴും phone വായിക്കുമ്പോൾ migration അത് DROP ചെയ്യുന്നു — പ്രൊഡക്ഷൻ തകരും. Additive, re-runnable migration; ക്ലയന്റുകൾ ഉപയോഗിക്കാതാകുമ്പോൾ മാത്രം DROP.`,
  },
  dev_rule_63: {
    en: `Login failures log full \`$_POST\`, including passwords. Emit structured logs with request_id/user_id/outcome — never passwords, tokens, or secrets.`,
    ml: `Login പരാജയത്തിൽ മുഴുവൻ $_POST (പാസ്‌വേഡ് ഉൾപ്പെടെ) ലോഗ് ചെയ്യുന്നു. request_id/user_id/outcome ഉള്ള structured ലോഗ് — പാസ്‌വേഡ്/ടോക്കൺ/സീക്രട്ട് ഒരിക്കലും ഇല്ല.`,
  },
  dev_rule_64: {
    en: `An AI-generated endpoint returns 200 once and is merged without review. Treat AI code like human code: review, test success/error paths, auth, and SQL safety.`,
    ml: `AI ജനറേറ്റ് എൻഡ്‌പോയിന്റ് ഒരിക്കൽ 200 തന്നു — റിവ്യൂ ഇല്ലാതെ മെർജ്. AI കോഡും മനുഷ്യ കോഡും പോലെ: റിവ്യൂ, success/error ടെസ്റ്റ്, auth, SQL സുരക്ഷ.`,
  },
  dev_rule_65: {
    en: `Someone installs moment + lodash for one date format. Prefer existing date-fns/utils; add packages only if maintained, compatible, and necessary.`,
    ml: `ഒരു ഡേറ്റ് ഫോർമാറ്റിന് moment + lodash ഇൻസ്റ്റാൾ ചെയ്യുന്നു. നിലവിലുള്ള date-fns/utils ഉപയോഗിക്കുക; maintained, compatible, ആവശ്യമുള്ള പാക്കേജ് മാത്രം ചേർക്കുക.`,
  },
  dev_rule_66: {
    en: `Stale student count is “fixed” with \`setTimeout(() => location.reload(), 500)\`. Reproduce, compare UI/API/DB, then fix the real cause (usually missing invalidation).`,
    ml: `പഴയ student count setTimeout reload കൊണ്ട് "ഫിക്സ്" ചെയ്യുന്നു. Reproduce ചെയ്ത് UI/API/DB താരതമ്യം ചെയ്ത് യഥാർത്ഥ കാരണം (സാധാരണയായി missing invalidation) പരിഹരിക്കുക.`,
  },
  dev_rule_67: {
    en: `Feature marked Done because it worked on the developer’s Chrome localhost. Done means reviewed, tested, secured, production-built, deployed, and smoke-tested.`,
    ml: `ഡെവലപ്പറുടെ Chrome localhost-ല് പ്രവർത്തിച്ചതുകൊണ്ട് Done ആക്കി. Done എന്നാൽ reviewed, tested, secured, production build, deploy, smoke test പൂർത്തിയായി എന്നാണ്.`,
  },
  dev_rule_68: {
    en: `Flutter payment WebView allows \`upi://\` in-page; the UPI app grid is empty and return deep-links fail. Intercept non-HTTP schemes and open them with externalApplication; set platform-correct User-Agent.`,
    ml: `Flutter പേയ്മെന്റ് WebView upi:// ഇൻ-പേജ് അനുവദിക്കുന്നു — UPI ഗ്രിഡ് ശൂന്യം, return deep-link fail. non-HTTP schemes intercept ചെയ്ത് externalApplication-ല് തുറക്കുക; പ്ലാട്ട്‌ഫോം-ശരിയായ User-Agent സജ്ജമാക്കുക.`,
  },
  dev_rule_69: {
    en: `Two blog URLs return empty \`#root\` HTML to Googlebot; Google merges them as duplicates. First HTML response must include unique H1, article body, self-canonical, and Article JSON-LD.`,
    ml: `രണ്ട് blog URL Googlebot-ന് ശൂന്യ #root നൽകുന്നു — Google ഡ്യൂപ്ലിക്കേറ്റായി മെർജ് ചെയ്യും. ആദ്യ HTML-ല് unique H1, article body, self-canonical, Article JSON-LD ഉണ്ടായിരിക്കണം.`,
  },
  dev_rule_70: {
    en: `Both \`/contact\` and \`/contact/\` return 200, splitting SEO equity. Pick one style (prefer no trailing slash) and 301 the other once — no chains.`,
    ml: `/contact-ഉം /contact/-ഉം 200 തരുന്നു — SEO വിഭജിക്കും. ഒരു style തിരഞ്ഞെടുത്ത് (trailing slash ഇല്ലാത്ത് preferred) മറ്റേത് ഒറ്റ 301 — ചെയിൻ വേണ്ട.`,
  },
  dev_rule_71: {
    en: `Every article injects the same WebSite JSON-LD with that post’s excerpt as description, polluting search snippets. Isolate Article schema per page; related posts are title+link only.`,
    ml: `ഓരോ ആർട്ടിക്കിളും അതിന്റെ excerpt WebSite description ആക്കി ഒരേ JSON-LD inject ചെയ്യുന്നു — സെർച്ച് snippet മലിനമാകും. പേജിന് Article schema മാത്രം; related posts title+link മാത്രം.`,
  },
  dev_rule_72: {
    en: `sitemap.xml proxies a flaky upstream and Search Console shows temporary processing errors. Own a stable sitemap that lists only final canonical, indexable URLs.`,
    ml: `sitemap.xml flaky upstream proxy ചെയ്യുന്നു — GSC temporary processing error. Final canonical, indexable URL മാത്രമുള്ള സ്ഥിരമായ owned sitemap നൽകുക.`,
  },
  qa_accessibility: {
    en: `Leave form can only be submitted with a mouse; errors are colour-only. Complete core flows with keyboard only; require visible focus and text errors.`,
    ml: `Leave ഫോം മൗസ് കൊണ്ട് മാത്രം സബ്മിറ്റ്; എററുകൾ നിറം മാത്രം. കീബോർഡ് മാത്രം കൊണ്ട് കോർ ഫ്ലോ പൂർത്തിയാക്കുക; visible focus + ടെക്സ്ട് എറർ നിർബന്ധം.`,
  },
  qa_api_contract: {
    en: `API returns \`phone: null\` and the UI prints the string “null”. Capture real responses and reject field/type/pagination/error-shape mismatches.`,
    ml: `API phone: null തരുന്നു; UI "null" സ്ട്രിംഗ് പ്രിന്റ് ചെയ്യുന്നു. യഥാർത്ഥ റെസ്പോൺസ് ക്യാപ്ചർ ചെയ്ത് field/type/pagination/error-shape മിസ്മാച്ച് റിജക്ട് ചെയ്യുക.`,
  },
  qa_apple_sandbox: {
    en: `A leave modal looks perfect in Chrome but cards clip and scrollbars vanish in Safari iOS. Always sign off layouts on Safari / WebKit before Done.`,
    ml: `Leave മോഡൽ Chrome-ല് മനോഹരം; Safari iOS-ല് കാർഡ് ക്ലിപ്പ്, സ്ക്രോൾബാർ അപ്രത്യക്ഷം. Done-നു് മുമ്പ് Safari/WebKit-ല് ലേഔട്ട് സൈൻ ഓഫ് ചെയ്യുക.`,
  },
  qa_boundary_expansion: {
    en: `Phone field accepts a 100-digit paste and the API 500s. Paste overflow and confirm truncation to 10/15 digits in UI and payload.`,
    ml: `Phone ഫീൽഡ് 100 ഡിജിറ്റ് പേസ്റ്റ് സ്വീകരിച്ച് API 500 തരുന്നു. ഓവർഫ്ലോ പേസ്റ്റ് ചെയ്ത് UI-യിലും പേലോഡിലും 10/15 ഡിജിറ്റ് ട്രങ്കേഷൻ ഉറപ്പാക്കുക.`,
  },
  qa_browser_back: {
    en: `User opens filters drawer then a bug modal; Back exits the dashboard. Back must close the top overlay first and keep the page.`,
    ml: `ഫിൽട്ടർ ഡ്രോയർ തുറന്ന് ബഗ് മോഡൽ തുറക്കുന്നു; Back ഡാഷ്ബോർഡ് വിടുന്നു. Back ആദ്യം ടോപ്പ് ഓവർലേ അടച്ച് പേജ് നിലനിർത്തണം.`,
  },
  qa_cache_isolation: {
    en: `After logout, the next user briefly sees the previous admin’s dashboard. Test refresh, private window, deploy, account switch — no stale or cross-user data.`,
    ml: `ലോഗൗട്ടിനു് ശേഷം അടുത്ത യൂസർ മുൻ admin-ന്റെ ഡാഷ്ബോർഡ് ക്ഷണികമായി കാണുന്നു. Refresh, private window, deploy, account switch ടെസ്റ്റ് — stale/cross-user ഡാറ്റ വേണ്ട.`,
  },
  qa_click_attack: {
    en: `QA clicks Save once on office Wi-Fi and passes. In Slow 3G, triple-click creates three OT rows. Stress double/triple-click and confirm one DB record + spinner lock.`,
    ml: `ഓഫീസ് Wi-Fi-യിൽ ഒരു Save ക്ലിക്ക് മാത്രം ടെസ്റ്റ് — പാസ്. Slow 3G-യിൽ ട്രിപ്പിൾ ക്ലിക്കില് മൂന്ന് OT റോ. ഡബിൾ/ട്രിപ്പിൾ ക്ലിക്ക് സ്ട്രെസ് ടെസ്റ്റ് ചെയ്ത് ഒരു DB റെക്കോർഡ് + സ്പിന്നർ ലോക്ക് ഉറപ്പാക്കുക.`,
  },
  qa_concurrency: {
    en: `Two tabs edit the same bug; the slower save overwrites newer fields. Multi-tab and two-user simultaneous actions must not lose updates or create duplicates.`,
    ml: `രണ്ട് ടാബില് ഒരേ ബഗ് എഡിറ്റ് — സ്ലോ സേവ് പുതിയ ഫീൽഡുകൾ മാറ്റിയെഴുതും. മൾട്ടി-ടാബ്/രണ്ട് യൂസർ ഒരേസമയം പ്രവർത്തിച്ചാലും അപ്ഡേറ്റ് നഷ്ടപ്പെടുകയോ ഡ്യൂപ്ലിക്കേറ്റ് ഉണ്ടാകുകയോ ചെയ്യരുത്.`,
  },
  qa_console_zero: {
    en: `Feature “works” but DevTools shows red TypeErrors on open. Keep Console open during QA; any red error is a reject.`,
    ml: `ഫീച്ചർ പ്രവർത്തിക്കുന്നു; തുറക്കുമ്പോൾ DevTools-ല് ചുവപ്പ് TypeError. QA സമയം Console തുറന്ന് വയ്ക്കുക; ഏത് റെഡ് എററും റിജക്ട്.`,
  },
  qa_cross_browser_data: {
    en: `Chrome shows 260 clients, Safari 760, for the same filters. Compare request/response/cache/DB; business numbers must match across browsers.`,
    ml: `ഒരേ ഫിൽട്ടറില് Chrome 260, Safari 760 clients. Request/response/cache/DB താരതമ്യം ചെയ്യുക; ബിസിനസ് നമ്പറുകൾ എല്ലാ ബ്രൗസറിലും ഒത്തുപോകണം.`,
  },
  qa_data_reconciliation: {
    en: `Pay Verify UI shows ₹12,000 incentive but the DB row is ₹10,000. Trace UI → API → DB → refresh; pass only when all three match.`,
    ml: `Pay Verify UI ₹12,000 incentive കാണിക്കുന്നു; DB-യിൽ ₹10,000. UI → API → DB → refresh ട്രേസ് ചെയ്ത് മൂന്നും ഒത്തുപോകുമ്പോൾ മാത്രം പാസ്.`,
  },
  qa_deployment_smoke: {
    en: `Friday deploy; nobody logs in until Monday when login is broken. Immediately after deploy: open site, login, dashboard, critical read/write, logout.`,
    ml: `വെള്ളിയാഴ്ച ഡിപ്ലോയ്; തിങ്കളാഴ്ച വരെ ആരും ലോഗിൻ ചെയ്തില്ല — ലോഗിൻ തകർന്നിരിക്കുന്നു. ഡിപ്ലോയ്ക്ക് ഉടൻ: സൈറ്റ്, ലോഗിൻ, ഡാഷ്ബോർഡ്, critical read/write, ലോഗൗട്ട്.`,
  },
  qa_empty_array: {
    en: `Projects with zero bugs show a blank panel or “undefined”. Force empty lists and require a clear empty-state message that does not collapse the layout.`,
    ml: `ബഗ് ഇല്ലാത്ത പ്രോജക്ട്ടില് ശൂന്യ പാനൽ അല്ലെങ്കിൽ undefined. Empty ലിസ്റ്റ് ഫോഴ്സ് ചെയ്ത് ലേഔട്ട് തകരാത്ത വ്യക്തമായ empty-state മെസേജ് ആവശ്യപ്പെടുക.`,
  },
  qa_financial_integrity: {
    en: `UI shows ₹1,000.00 while DB stores 999.995. Compare displayed, API, DB, and hand-calculated amounts across partial/full/refund cases.`,
    ml: `UI ₹1,000.00 കാണിക്കുന്നു; DB-യിൽ 999.995. Partial/full/refund കേസുകളിൽ displayed, API, DB, കൈകൊണ്ട് കണക്കാക്കിയ തുക താരതമ്യം ചെയ്യുക.`,
  },
  qa_googlebot_html: {
    en: `QA opens a blog in Chrome Elements after JS and assumes Google sees the same HTML. Accept only \`curl -A Googlebot\` / GSC tested HTML with unique H1+body+canonical.`,
    ml: `QA Chrome Elements-ല് JS റൺ ആയ ശേഷം blog തുറന്ന് Google അതേ HTML കാണുമെന്ന് കരുതുന്നു. curl -A Googlebot / GSC tested HTML-ല് unique H1+body+canonical ഉണ്ടെങ്കിൽ മാത്രം അംഗീകരിക്കുക.`,
  },
  qa_high_volume: {
    en: `Bugs list is tested with 5 rows and feels fine; with 200+ it freezes and has no pagination. Audit 0, 1, normal, and 100+ record views.`,
    ml: `5 റോ കൊണ്ട് bugs ലിസ്റ്റ് നല്ലതാണ്; 200+-ല് ഫ്രീസ്, പേജിനേഷൻ ഇല്ല. 0, 1, സാധാരണ, 100+ റെക്കോർഡ് വ്യൂകൾ ഓഡിറ്റ് ചെയ്യുക.`,
  },
  qa_in_app_payment_upi: {
    en: `UPI grid tested only on an Android emulator — empty on real devices. On physical Android and iOS, confirm app grid, external scheme handoff, and intact return session.`,
    ml: `UPI ഗ്രിഡ് Android emulator-ല് മാത്രം ടെസ്റ്റ് — യഥാർത്ഥ ഡിവൈസില് ശൂന്യം. Physical Android/iOS-ല് app grid, external scheme handoff, return session നിലനിൽപ്പ് ഉറപ്പാക്കുക.`,
  },
  qa_input_interception: {
    en: `QA edits a leave form, hits Esc, and data vanishes with no prompt. Dirty close must warn; cancel/error/success/refresh paths must not leak the previous record’s values.`,
    ml: `Leave ഫോം എഡിറ്റ് ചെയ്ത് Esc അമർത്തിയാല് പ്രോംപ്ട് ഇല്ലാതെ ഡാറ്റ മാഞ്ഞു. Dirty close-ല് വാണിംഗ്; cancel/error/success/refresh പാതകളിൽ പഴയ റെക്കോർഡ് വാല്യൂ ലീക്ക് ആകരുത്.`,
  },
  qa_loading_lifecycle: {
    en: `Skeleton stays forever when the bugs API times out. Drive each screen through success, empty, error, timeout, and cancelled — no infinite loading.`,
    ml: `Bugs API timeout ആയാല് skeleton എന്നെന്നേക്കും നിൽക്കും. ഓരോ സ്ക്രീനും success, empty, error, timeout, cancelled വഴി ഓടിക്കുക — അനന്ത ലോഡിംഗ് വേണ്ട.`,
  },
  qa_modal_scope: {
    en: `Delete confirm opens as a full-screen wizard. Use Small (~400px) for delete, Medium (~600px) for standard forms, Large (950px+) for complex editors.`,
    ml: `Delete confirm ഫുൾ-സ്ക്രീൻ വിസാർഡ് ആയി തുറക്കുന്നു. Delete-ന് Small (~400px), സാധാരണ ഫോമിന് Medium (~600px), കോംപ്ലക്സ് എഡിറ്ററിന് Large (950px+).`,
  },
  qa_mutation_sync: {
    en: `Delete a leave; list updates but dashboard “pending leave” count stays old. After create/edit/delete, check list, detail, counts, filters, and related screens.`,
    ml: `Leave ഡിലീറ്റ് ചെയ്താല് ലിസ്റ്റ് അപ്ഡേറ്റ് ആകുന്നു; ഡാഷ്ബോർഡ് pending leave കൗണ്ട് പഴയതു തന്നെ. create/edit/delete-നു് ശേഷം list, detail, counts, filters, ബന്ധപ്പെട്ട സ്ക്രീനുകൾ പരിശോധിക്കുക.`,
  },
  qa_navigation_during_requests: {
    en: `While bugs load, QA hits Back then Forward; the old response paints over the new page. Navigate during in-flight requests and reject state corruption.`,
    ml: `Bugs ലോഡ് ചെയ്യുമ്പോൾ Back പിന്നെ Forward — പഴയ റെസ്പോൺസ് പുതിയ പേജില് പെയിന്റ് ചെയ്യും. ഇൻ-ഫ്ലൈട് റിക്വസ്റ്റിനിടയിൽ നാവിഗേറ്റ് ചെയ്ത് സ്റ്റേറ്റ് കേടായാല് റിജക്ട്.`,
  },
  qa_network_break: {
    en: `Save Leave is tested only online. Mid-submit Offline leaves a silent hang. Force offline/5xx, expect a toast, recover ONLINE→OFFLINE→ONLINE, and ensure no duplicate row.`,
    ml: `Save Leave ഓൺലൈൻ മാത്രം ടെസ്റ്റ്. സബ്മിറ്റ് മധ്യത്തില് offline — നിശബ്ദ ഹാങ്. Offline/5xx ഫോഴ്സ് ചെയ്ത് toast പ്രതീക്ഷിക്കുക; ONLINE→OFFLINE→ONLINE റിക്കവർ; ഡ്യൂപ്ലിക്കേറ്റ് റോ ഇല്ലെന്ന് ഉറപ്പാക്കുക.`,
  },
  qa_pagination_integrity: {
    en: `Only page 1 is checked; page 3 duplicates IDs from page 2 when sorting. Walk first/middle/last pages with filters and ensure no missing or repeated records.`,
    ml: `പേജ് 1 മാത്രം ചെക്ക്; സോർട്ടില് പേജ് 3 പേജ് 2-ന്റെ ID ഡ്യൂപ്ലിക്കേറ്റ് ചെയ്യുന്നു. ഫിൽട്ടറോടെ first/middle/last പേജുകൾ നടന്ന് missing/repeated റെക്കോർഡ് ഇല്ലെന്ന് ഉറപ്പാക്കുക.`,
  },
  qa_performance_regression: {
    en: `Dashboard API calls jump from 4 to 40 after a refactor. Compare request count, payload size, render time, and DB time against the previous release.`,
    ml: `Refactor-നു് ശേഷം ഡാഷ്ബോർഡ് API കോളുകൾ 4-ല് നിന്ന് 40 ആയി. മുൻ റിലീസുമായി request count, payload size, render time, DB time താരതമ്യം ചെയ്യുക.`,
  },
  qa_permission_boundary: {
    en: `Delete is hidden for testers, so QA marks permissions passed — but Postman DELETE still works. Call APIs as unauthorized/wrong role/expired; backend must 401/403.`,
    ml: `ടെസ്റ്റർക്ക് Delete മറച്ചതുകൊണ്ട് permissions പാസ് ആക്കി — Postman DELETE ഇപ്പോഴും പ്രവർത്തിക്കുന്നു. Unauthorized/wrong role/expired ആയി API കോൾ ചെയ്യുക; backend 401/403 തരണം.`,
  },
  qa_production_build_env: {
    en: `Release approved from \`npm run dev\` against staging. Test the production build and confirm prod API, DB, storage, and keys.`,
    ml: `Staging API-യോട് npm run dev ടെസ്റ്റ് ചെയ്ത് റിലീസ് അംഗീകരിച്ചു. പ്രൊഡക്ഷൻ ബിൽഡ് ടെസ്റ്റ് ചെയ്ത് prod API, DB, storage, keys ഉറപ്പാക്കുക.`,
  },
  qa_race_condition: {
    en: `Typing search slowly never fails; typing A→AB→ABC under throttle shows the wrong final list. Final UI must match only the last query/filter.`,
    ml: `സാവധാനം ടൈപ്പ് ചെയ്താല് സെർച്ച് പരാജയപ്പെടില്ല; throttle-ല് A→AB→ABC ടൈപ്പ് ചെയ്താല് തെറ്റായ ഫൈനൽ ലിസ്റ്റ്. അവസാന UI അവസാന query/filter മാത്രം മാച്ച് ചെയ്യണം.`,
  },
  qa_regression: {
    en: `New invoice filter passes; invoice export is broken and unnoticed. Re-test every existing flow the change can touch.`,
    ml: `പുതിയ invoice filter പാസ്; invoice export തകർന്നത് ആരും ശ്രദ്ധിച്ചില്ല. മാറ്റം ബാധിക്കാവുന്ന എല്ലാ നിലവിലുള്ള ഫ്ലോകളും വീണ്ടും ടെസ്റ്റ് ചെയ്യുക.`,
  },
  qa_release_acceptance: {
    en: `Demo looked good, so production was approved with open auth bugs. Final gate: critical flows, no blockers, clean console, data/auth OK, smoke passed.`,
    ml: `ഡെമോ നല്ലതായതുകൊണ്ട് open auth ബഗുകളോടെ പ്രൊഡക്ഷൻ അംഗീകരിച്ചു. ഫൈനൽ ഗേറ്റ്: critical flows, blockers ഇല്ല, clean console, data/auth OK, smoke passed.`,
  },
  qa_responsive_matrix: {
    en: `Signed off at 1440px desktop only; on 375px the Save button is clipped. Test mobile through large desktop, portrait and landscape.`,
    ml: `1440px ഡെസ്ക്ട്ടോപ്പില് മാത്രം സൈൻ ഓഫ്; 375px-ല് Save ബട്ടൺ ക്ലിപ്പ്. മൊബൈൽ മുതൽ ലാർജ് ഡെസ്ക്ട്ടോപ്പ് വരെ portrait/landscape ടെസ്റ്റ് ചെയ്യുക.`,
  },
  qa_rtl_stress: {
    en: `Arabic name + phone digits reverse order in the input. Enter mixed Arabic/numbers and reject caret or digit-order failures.`,
    ml: `അറബിക് പേര് + ഫോൺ ഡിജിറ്റുകൾ ഇൻപുട്ടില് റിവേഴ്സ് ആകുന്നു. അറബിക്/നമ്പർ മിക്സ് എന്റർ ചെയ്ത് കാരറ്റ് അല്ലെങ്കിൽ ഡിജിറ്റ് ഓർഡർ തെറ്റിയാല് റിജക്ട്.`,
  },
  qa_script_injection: {
    en: `Comment field stores \`<script>alert('xss')</script>\` and it executes on reopen. Paste injection strings; reject if they run or break layout.`,
    ml: `കമന്റ് ഫീൽഡ് script alert സ്റ്റോർ ചെയ്ത് റീഓപ്പൺ ചെയ്യുമ്പോൾ എക്സിക്ക്യൂട് ആകുന്നു. ഇൻജക്ഷൻ സ്ട്രിംഗ് പേസ്റ്റ് ചെയ്ത് റൺ/ലേഔട്ട് ബ്രേക്ക് ആയാല് റിജക്ട്.`,
  },
  qa_session_expiry: {
    en: `Token expires mid-upload; spinner never stops and the file is lost. Expire session during view/save/delete/upload and expect a re-login path with no silent mutation.`,
    ml: `അപ്‌ലോഡ് മധ്യത്തില് ടോക്കൺ എക്സ്പയർ — സ്പിന്നർ നിൽക്കാതെ ഫയൽ നഷ്ടം. View/save/delete/upload സമയം സെഷൻ എക്സ്പയർ ചെയ്ത് നിശബ്ദ mutation ഇല്ലാതെ റീലോഗിൻ പാത പ്രതീക്ഷിക്കുക.`,
  },
  qa_slow_api_timeout: {
    en: `On Slow 3G, Save disables forever after timeout. Throttle, force timeout, confirm clear error, re-enabled controls, and no duplicate submit.`,
    ml: `Slow 3G-യിൽ timeout-നു് ശേഷം Save എന്നെന്നേക്കും ഡിസേബിൾ. Throttle + timeout ഫോഴ്സ്; വ്യക്തമായ എറർ, റീ-എനേബിൾഡ് കൻട്രോൾ, ഡ്യൂപ്ലിക്കേറ്റ് സബ്മിറ്റ് ഇല്ലെന്ന് ഉറപ്പാക്കുക.`,
  },
  qa_theme_interruption: {
    en: `Form labels are readable in light mode only; toggling dark mid-edit makes errors disappear into the background. Toggle themes while typing and reject unreadable contrast.`,
    ml: `ലൈട്ട് മോഡിൽ മാത്രം ലേബൽ വായിക്കാം; എഡിറ്റിനിടയിൽ ഡാർക്ക് ടോഗിൾ ചെയ്താല് എറർ അപ്രത്യക്ഷമാകും. ടൈപ്പ് ചെയ്യുമ്പോൾ തീം മാറ്റി വായിക്കാനാകാത്ത കോൺട്രാസ്റ്റ് റിജക്ട് ചെയ്യുക.`,
  },
};

/** Returns bilingual real-world scenario for a rule_key, if both sides are authored. */
export function getCodoRealWorldExample(
  ruleKey: string
): CodoRealWorldExample | undefined {
  const value = CODO_REAL_WORLD_EXAMPLES[ruleKey];
  if (!value?.en?.trim() || !value?.ml?.trim()) return undefined;
  return { en: value.en.trim(), ml: value.ml.trim() };
}
