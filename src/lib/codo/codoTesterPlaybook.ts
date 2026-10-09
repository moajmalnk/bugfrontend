/**
 * Expert QA playbooks for Web vs App — bilingual (English + Malayalam).
 * Why: testers need a platform-specific flowchart with fail-fast reject rules,
 * and juniors need Malayalam for the same process without leaving the playbook.
 */

export type TesterPlatform = 'web' | 'app';
export type TesterLang = 'en' | 'ml';

export type LocalizedText = {
  en: string;
  ml: string;
};

export type TesterPhase = {
  id: string;
  title: LocalizedText;
  goal: LocalizedText;
  /** Short reject rule — fail fast */
  rejectIf: LocalizedText;
  checks: LocalizedText[];
};

export type TesterPlaybook = {
  platform: TesterPlatform;
  label: LocalizedText;
  subtitle: LocalizedText;
  /** One-line efficiency principle */
  principle: LocalizedText;
  environments: LocalizedText[];
  phases: TesterPhase[];
  /** Final release gate questions */
  releaseGate: LocalizedText[];
};

/** Chrome labels for the Expert QA Process panel */
export const CODO_TESTER_PLAYBOOK_UI: Record<string, LocalizedText> = {
  heading: { en: `Expert QA Process`, ml: `എക്സ്പര്ട് QA പ്രോസസ്` },
  subtitle: { en: `Full flowchart · fail-fast reject rules · release gate`, ml: `പൂർണ ഫ്ലോചാർട് · റിജക്ട് നിയമങ്ങൾ · റിലീസ് ഗേറ്റ്` },
  efficiencyRule: { en: `efficiency rule`, ml: `കാര്യക്ഷമ നിയമം` },
  environments: { en: `Environments`, ml: `എൻവയറോൺമെന്റ്റുകൾ` },
  flowchart: { en: `flowchart`, ml: `ഫ്ലോചാർട്` },
  rejectIf: { en: `Reject if:`, ml: `റിജക്ട് ചെയ്യുക:` },
  doThis: { en: `Do this`, ml: `ഇത് ചെയ്യുക` },
  purpose: { en: `Purpose`, ml: `ഉദ്ദേശ്യം` },
  releaseGate: { en: `release gate`, ml: `റിലീസ് ഗേറ്റ്` },
  english: { en: `English`, ml: `English` },
  malayalam: { en: `Malayalam`, ml: `മലയാളം` },
  langHint: { en: `Language`, ml: `ഭാഷ` },
};

export function t(text: LocalizedText, lang: TesterLang): string {
  return text[lang] || text.en;
}

export const CODO_TESTER_PLAYBOOKS: Record<TesterPlatform, TesterPlaybook> = {
  web: {
    platform: 'web',
    label: { en: `Web`, ml: `Web` },
    subtitle: { en: `Browsers · responsive · SPA state · API · cache`, ml: `ബ്രൗസറുകൾ · responsive · SPA state · API · cache` },
    principle: { en: `Trace every critical action as UI → Network → API → Database → UI after refresh. Pass only when all layers match without a hard refresh.`, ml: `ഓരോ പ്രധാന ആക്ഷനും UI → Network → API → Database → refresh-നു് ശേഷമുള്ള UI ആയി ട്രേസ് ചെയ്യുക. Hard refresh ഇല്ലാതെ എല്ലാ ലെയറുകളും ഒത്തുപോകുമ്പോൾ മാത്രം പാസ്.` },
    environments: [
      { en: `Chrome + Safari (macOS)`, ml: `Chrome + Safari (macOS)` },
      { en: `Firefox / Edge spot check`, ml: `Firefox / Edge സ്പോട് ചെക്ക്` },
      { en: `iOS Safari + Android Chrome`, ml: `iOS Safari + Android Chrome` },
      { en: `360–414 · 768 · 1280 · 1440+`, ml: `360–414 · 768 · 1280 · 1440+` },
      { en: `Slow 3G + Offline toggle`, ml: `Slow 3G + Offline ടോഗിൾ` },
      { en: `Incognito + second account`, ml: `Incognito + രണ്ടാം അക്കൗണ്ട്` },
    ],
    phases: [
      {
        id: 'web_intake',
        title: { en: `1. Scope lock`, ml: `1. സ്കോപ് ലോക്ക്` },
        goal: { en: `Know exactly what Done means before clicking.`, ml: `ക്ലിക്ക് ചെയ്യുന്നതിനു് മുമ്പ് Done എന്താണെന്ന് കൃത്യമായി അറിയുക.` },
        rejectIf: { en: `Acceptance criteria or role permissions are unclear.`, ml: `Acceptance criteria അല്ലെങ്കിൽ role permissions വ്യക്തമല്ല.` },
        checks: [
          { en: `Read ticket + acceptance criteria; note roles under test.`, ml: `Ticket + acceptance criteria വായിക്കുക; ടെസ്റ്റ് ചെയ്യുന്ന roles കുറിച്ചുക.` },
          { en: `Confirm test env, seed data, and which browsers are in scope.`, ml: `Test env, seed data, scope-ലുള്ള ബ്രൗസറുകൾ ഉറപ്പാക്കുക.` },
          { en: `List happy path + 3 failure paths (validation, 401/403, 5xx).`, ml: `Happy path + 3 failure paths (validation, 401/403, 5xx) ലിസ്റ്റ് ചെയ്യുക.` },
        ],
      },
      {
        id: 'web_smoke',
        title: { en: `2. Smoke path`, ml: `2. സ്മോക്ക് പാത്ത്` },
        goal: { en: `Prove the feature opens, loads, and completes once.`, ml: `ഫീച്ചർ തുറക്കുനും, ലോഡ് ചെയ്യുനും, ഒരിക്കൽ പൂർത്തിയാകുന്നും എന്ന് തെളിയിക്കുക.` },
        rejectIf: { en: `Blank screen, console red errors, or infinite skeleton.`, ml: `ശൂന്യ സ്ക്രീൻ, console red errors, അല്ലെങ്കിൽ infinite skeleton.` },
        checks: [
          { en: `Open DevTools Console — zero red errors on primary path.`, ml: `DevTools Console തുറക്കുക — primary path-ല് ചുവപ്പ് എററുകൾ ഇല്ല.` },
          { en: `Walk create / edit / read once on desktop Chrome.`, ml: `Desktop Chrome-ല് create / edit / read ഒരുതവണ നടത്തുക.` },
          { en: `Confirm skeleton ends in success, empty, or error — never forever.`, ml: `Skeleton success, empty, അല്ലെങ്കിൽ error-ല് അവസാനിക്കണം — എന്നെന്നേക്കും അല്ല.` },
        ],
      },
      {
        id: 'web_data',
        title: { en: `3. Data truth`, ml: `3. ഡാറ്റ സത്യം` },
        goal: { en: `UI value = API value = database value.`, ml: `UI value = API value = database value.` },
        rejectIf: { en: `Any unexplained mismatch after refresh.`, ml: `Refresh-നു് ശേഷം വിശദീകരിക്കാന് mismatch ഉണ്ടെങ്കിൽ.` },
        checks: [
          { en: `Compare displayed fields with Network response body.`, ml: `കാണിച്ച ഫീൽഡുകളും Network response body-യുമായി താരതമ്യം ചെയ്യുക.` },
          { en: `Confirm DB row for the same id (or ask backend for query).`, ml: `ഒരേ id-ന്റെ DB row ഉറപ്പാക്കുക (അല്ലെങ്കിൽ backend query ചോദിക്കുക).` },
          { en: `Hard refresh and soft refresh — same result without Ctrl+Shift+R.`, ml: `Hard/soft refresh — Ctrl+Shift+R ഇല്ലാതെ ഒരേ ഫലം.` },
        ],
      },
      {
        id: 'web_state',
        title: { en: `4. State & forms`, ml: `4. സ്റ്റേറ്റ് & ഫോമുകൾ` },
        goal: { en: `No leaked values; dirty close warns; submit locks.`, ml: `വാല്യൂ ലീക്ക് ഇല്ല; dirty close വാണിപ്പിക്കുന്നു; submit ലോക്ക് ചെയ്യുന്നു.` },
        rejectIf: { en: `Old record values bleed into the next open.`, ml: `പഴയ റെക്കോർഡ് വാല്യൂകൾ അടുത്ത തുറക്കലെക്ക് ലീക്കുന്നു.` },
        checks: [
          { en: `Edit A → close → open B — only B’s values load.`, ml: `A എഡിറ്റ് ചെയ്ത് അടച്ച് → B തുറക്കുക — B-യുടെ വാല്യൂകൾ മാത്രം ലോഡ് ചെയ്യണം.` },
          { en: `Dirty form + Esc / backdrop — Unsaved Changes prompt.`, ml: `Dirty form + Esc / backdrop — Unsaved Changes prompt വേണം.` },
          { en: `Double / triple-click Save — one API record + spinner lock.`, ml: `Save ഡബിൾ/ട്രിപ്പിൾ ക്ലിക്ക് — ഒരു API റെക്കോർഡ് + spinner lock.` },
        ],
      },
      {
        id: 'web_stress',
        title: { en: `5. Stress & races`, ml: `5. സ്ട്രെസ് & റേസുകൾ` },
        goal: { en: `Latest user intent wins; no silent hangs.`, ml: `ഏറ്റവും പുതിയ ഉദ്ദേശ്യം ജയിക്കണം; നിശബ്ദ ഹാങ് ഇല്ല.` },
        rejectIf: { en: `Stale response overwrites the latest filter/search.`, ml: `പഴയ response ഏറ്റവും filter/search മാറ്റിയെഴുത്തുന്നു.` },
        checks: [
          { en: `Type A → AB → ABC under throttle; final list matches ABC.`, ml: `Throttle-ല് A → AB → ABC ടൈപ്പ് ചെയ്യുക; അവസാന ലിസ്റ്റ് ABC മാച്ച് ചെയ്യണം.` },
          { en: `Mid-submit Offline / 5xx — toast, controls re-enable, no duplicate.`, ml: `Submit മധ്യത്തില് Offline / 5xx — toast, controls റീ-enable, ഡ്യൂപ്ലികേറ്റ് ഇല്ല.` },
          { en: `Navigate Back / Forward / change tab while loading — no state corruption.`, ml: `Loading സമയം Back / Forward / tab മാറ്റുക — state corruption ഇല്ല.` },
        ],
      },
      {
        id: 'web_matrix',
        title: { en: `6. Browser & layout`, ml: `6. ബ്രൗസർ & ലേഔട്ട്` },
        goal: { en: `Same business numbers; usable layout everywhere.`, ml: `ഒരേ ബിസിനസ് നമ്പറുകൾ; എല്ലായിടത്തും ഉപയോഗിക്കാവുന്ന layout.` },
        rejectIf: { en: `Safari/iOS clips cards or counts disagree across browsers.`, ml: `Safari/iOS cards clip ചെയ്യുന്നു അല്ലെങ്കിൽ ബ്രൗസറുകൾക്കിടയിൽ counts വ്യത്യാസമാണ്.` },
        checks: [
          { en: `Safari / iOS WebKit sign-off for flex, radius, scroll, shadows.`, ml: `flex, radius, scroll, shadows-നു് Safari / iOS WebKit sign-off ചെയ്യുക.` },
          { en: `Portrait + landscape; no horizontal overflow or clipped CTAs.`, ml: `Portrait + landscape; horizontal overflow അല്ലെങ്കിൽ clipped CTAs ഇല്ല.` },
          { en: `Same account + filters: Chrome vs Safari counts must match.`, ml: `ഒരേ അക്കൗണ്ട് + filters: Chrome vs Safari counts ഒത്തുപോകണം.` },
        ],
      },
      {
        id: 'web_security',
        title: { en: `7. Auth & abuse`, ml: `7. Auth & ദുരുപയോഗം` },
        goal: { en: `Backend enforces; XSS does not execute.`, ml: `Backend enforce ചെയ്യണം; XSS execute ആകരുത്.` },
        rejectIf: { en: `Hidden button is the only permission control.`, ml: `മറച്ച ബട്ടൺ മാത്രമാണ് permission control ആണെങ്കിൽ.` },
        checks: [
          { en: `Paste \`<script>\` into text fields — must not execute on reopen.`, ml: `Text fields-ല് \`<script>\` paste ചെയ്യുക — reopen-ല് execute ആകരുത്.` },
          { en: `Call APIs as wrong role / expired session — expect 401/403.`, ml: `Wrong role / expired session ആയി API കോൾ ചെയ്യുക — 401/403 പ്രതീക്ഷിക്കുക.` },
          { en: `Logout → login as another user — no previous user’s private data.`, ml: `Logout → മറ്റൊരു യൂസറായി login — മുൻ യൂസറിന്റെ private data ഇല്ല.` },
        ],
      },
      {
        id: 'web_release',
        title: { en: `8. Release gate`, ml: `8. റിലീസ് ഗേറ്റ്` },
        goal: { en: `Production build + smoke, not localhost only.`, ml: `Production build + smoke വേണം — localhost മാത്രമല്ല.` },
        rejectIf: { en: `Approved from \`npm run dev\` against staging only.`, ml: `Staging-നോട് \`npm run dev\` മാത്രം കൊണ്ട് അംഗീകരിച്ചു.` },
        checks: [
          { en: `Retest flows the change can break (regression).`, ml: `മാറ്റം തകർക്കാവുന്ന flows വീണ്ടും ടെസ്റ്റ് ചെയ്യുക (regression).` },
          { en: `Production build / deployed URL smoke: login → critical write → logout.`, ml: `Production build / deployed URL smoke: login → critical write → logout.` },
          { en: `Mark Done only when DoD checklist is complete.`, ml: `DoD checklist പൂർത്തിയാകുമ്പോൾ മാത്രം Done ആക്കുക.` },
        ],
      },
    ],
    releaseGate: [
      { en: `Critical flows pass; no blocking defects.`, ml: `Critical flows പാസ്; blocking defects ഇല്ല.` },
      { en: `No critical console errors on verified paths.`, ml: `Verified paths-ല് critical console errors ഇല്ല.` },
      { en: `UI = API = DB for money / counts / status.`, ml: `UI = API = DB — money / counts / status.` },
      { en: `AuthZ verified via API, not only hidden buttons.`, ml: `AuthZ API വഴി ഉറപ്പാക്കുക — മറച്ച ബട്ടൺ മാത്രമല്ല.` },
      { en: `Safari / mobile layouts signed off where applicable.`, ml: `ബാധിക്കുനിടത്തുള്ള Safari / mobile layouts sign-off.` },
      { en: `Production smoke passed after deploy.`, ml: `Deploy-നു് ശേഷം production smoke പാസ്.` },
    ],
  },
  app: {
    platform: 'app',
    label: { en: `App`, ml: `App` },
    subtitle: { en: `iOS · Android · install · deep links · offline · payments`, ml: `iOS · Android · install · deep links · offline · payments` },
    principle: { en: `Physical devices beat emulators for payments, push, camera, and UPI. Kill → relaunch and offline → online must keep session and data honest.`, ml: `Payments, push, camera, UPI-നു് physical devices emulator-നെക്കാൾ നല്ലത്. Kill → relaunch, offline → online session/data സത്യമായി നിലനിർത്തണം.` },
    environments: [
      { en: `Physical iPhone (recent iOS)`, ml: `Physical iPhone (പുതിയ iOS)` },
      { en: `Physical Android (recent OS)`, ml: `Physical Android (പുതിയ OS)` },
      { en: `Cold start + kill/relaunch`, ml: `Cold start + kill/relaunch` },
      { en: `Airplane / Offline → Online`, ml: `Airplane / Offline → Online` },
      { en: `Push + deep-link return`, ml: `Push + deep-link return` },
      { en: `Store / TestFlight / Play internal build`, ml: `Store / TestFlight / Play internal build` },
    ],
    phases: [
      {
        id: 'app_intake',
        title: { en: `1. Scope lock`, ml: `1. സ്കോപ് ലോക്ക്` },
        goal: { en: `Confirm build, OS, and device before testing.`, ml: `ടെസ്റ്റിനു് മുമ്പ് build, OS, device ഉറപ്പാക്കുക.` },
        rejectIf: { en: `Emulator-only plan for UPI, push, or camera.`, ml: `UPI, push, അല്ലെങ്കിൽ camera emulator-only plan.` },
        checks: [
          { en: `Note build number, env (staging/prod), and forced-update rules.`, ml: `Build number, env (staging/prod), forced-update rules കുറിച്ചുക.` },
          { en: `List device matrix: at least one physical iOS + Android.`, ml: `Device matrix: കുറഞ്ഞും ഒരു physical iOS + Android.` },
          { en: `Map deep links / payment return URLs involved in the ticket.`, ml: `Ticket-ലെ deep links / payment return URLs മാപ് ചെയ്യുക.` },
        ],
      },
      {
        id: 'app_install',
        title: { en: `2. Install & launch`, ml: `2. ഇൻസ്റ്റാൾ & ലോഞ്ച്` },
        goal: { en: `Install, update, cold start, and first paint are clean.`, ml: `Install, update, cold start, first paint ശുദ്ധമായിരിക്കണം.` },
        rejectIf: { en: `Crash on cold start or blank first screen.`, ml: `Cold start-ല് crash അല്ലെങ്കിൽ ശൂന്യ first screen.` },
        checks: [
          { en: `Fresh install + upgrade-from-previous build when available.`, ml: `Fresh install + ലഭ്യമായാൽ upgrade-from-previous build.` },
          { en: `Cold start under 1.5s interaction target where measurable.`, ml: `അളക്കാവുനിടത്തുള്ള cold start 1.5s interaction target-ന്റ്റ് താഴെ.` },
          { en: `OS permission prompts (camera, notifications, location) are intentional.`, ml: `OS permission prompts (camera, notifications, location) ഉദ്ദേശ്യപൂർവമായിരിക്കണം.` },
        ],
      },
      {
        id: 'app_smoke',
        title: { en: `3. Smoke path`, ml: `3. സ്മോക്ക് പാത്ത്` },
        goal: { en: `Core journey completes once on each platform.`, ml: `ഓരോ പ്ലാറ്റ്ഫോമിലും core journey ഒരുതവണ പൂർത്തിയാകണം.` },
        rejectIf: { en: `Feature works on Android only or iOS only.`, ml: `ഫീച്ചർ Android മാത്രം അല്ലെങ്കിൽ iOS മാത്രം മാത്രമേ പ്രവർത്തിക്കുന്നു.` },
        checks: [
          { en: `Happy path on physical Android and physical iOS.`, ml: `Physical Android, physical iOS-ല് happy path.` },
          { en: `Loading → success / empty / error exits (no infinite spinner).`, ml: `Loading → success / empty / error (അനന്ത spinner ഇല്ല).` },
          { en: `Keyboard / safe area / notch — CTAs not clipped.`, ml: `Keyboard / safe area / notch — CTAs clip ആകരുത്.` },
        ],
      },
      {
        id: 'app_data',
        title: { en: `4. Data & sync`, ml: `4. ഡാറ്റ & സിങ്ക്` },
        goal: { en: `App display matches API; offline does not invent truth.`, ml: `App display API-യുമായി മാച്ച് ചെയ്യണം; offline വ്യാജ ഡാറ്റ കാണിച്ചരുത്.` },
        rejectIf: { en: `Stale local cache shown as current after mutation.`, ml: `Mutation-നു് ശേഷം പഴയ local cache നിലവിലെ ഡാറ്റയായി കാണിക്കുന്നു.` },
        checks: [
          { en: `Create/update → leave screen → return — latest server data.`, ml: `Create/update → screen വിടുക → തിരിചെ വരുക — ഏറ്റവും server data.` },
          { en: `Airplane mode mid-action → clear error → online retry, no duplicates.`, ml: `ആക്ഷന് മധ്യത്തില് Airplane → വ്യക്തമായ error → online retry, ഡ്യൂപ്ലികേറ്റ് ഇല്ല.` },
          { en: `Background app 5+ minutes → resume — session or re-auth is explicit.`, ml: `App 5+ മിനിട്ട് background → resume — session അല്ലെങ്കിൽ re-auth വ്യക്തം.` },
        ],
      },
      {
        id: 'app_nav',
        title: { en: `5. Navigation & deep links`, ml: `5. നാവിഗേഷൻ & ഡീപ് ലിങ്കുകൾ` },
        goal: { en: `Back, kill, and deep-link return keep context.`, ml: `Back, kill, deep-link return context നിലനിർത്തണം.` },
        rejectIf: { en: `Deep link opens wrong screen or forces unnecessary re-login.`, ml: `Deep link തെറ്റ സ്ക്രീൻ തുറക്കുന്നു അല്ലെങ്കിൽ അനാവശ്യമായ re-login നിർബന്ധിക്കുന്നു.` },
        checks: [
          { en: `System Back / gesture closes overlays in order, not exits the app wrongly.`, ml: `System Back / gesture overlays ക്രമത്തില് അടയ്ക്കണം — app തെറായി വിടരുത്.` },
          { en: `Deep link into feature → complete action → return path intact.`, ml: `Feature-ലേക്ക് deep link → ആക്ഷന് പൂർത്തിയാക്കുക → return path നിലനിൽക്കുക.` },
          { en: `Push notification tap lands on the correct record.`, ml: `Push notification tap ശരിയായ record-ലേക്ക് എത്തുന്നു.` },
        ],
      },
      {
        id: 'app_payments',
        title: { en: `6. Payments & WebView`, ml: `6. പേയ്മെന്റ്സ് & WebView` },
        goal: { en: `UPI / gateway handoff works on real devices.`, ml: `യഥാർത്ഥ ഡിവൈസുകളിൽ UPI / gateway handoff പ്രവർത്തിക്കണം.` },
        rejectIf: { en: `Empty UPI grid or intent stuck inside WebView.`, ml: `ശൂന്യ UPI grid അല്ലെങ്കിൽ WebView-ക്കുള്ള intent കുരുങ്ങുന്നു.` },
        checks: [
          { en: `Physical device only for UPI / gpay / intent schemes.`, ml: `UPI / gpay / intent schemes-നു് physical device മാത്രം.` },
          { en: `External app opens; cancel + success return restore session.`, ml: `External app തുറക്കുന്നു; cancel + success return session റിസ്റോർ ചെയ്യുന്നു.` },
          { en: `Platform-correct User-Agent; no forced re-login after return.`, ml: `Platform-correct User-Agent; return-നു് ശേഷം forced re-login ഇല്ല.` },
        ],
      },
      {
        id: 'app_abuse',
        title: { en: `7. Permissions & abuse`, ml: `7. പെർമിഷൻസ് & ദുരുപയോഗം` },
        goal: { en: `Denied permissions and expired sessions fail safely.`, ml: `Denied permissions, expired sessions സുരക്ഷിതമായി fail ചെയ്യണം.` },
        rejectIf: { en: `Silent failure or unauthorized mutation after expiry.`, ml: `നിശബ്ദ failure അല്ലെങ്കിൽ expiry-നു് ശേഷം unauthorized mutation.` },
        checks: [
          { en: `Deny camera/notifications — UI explains and recovers.`, ml: `Camera/notifications deny — UI വിശദീകരിച്ചു recover ചെയ്യുന്നു.` },
          { en: `Expire session mid-upload — stop spinner, keep draft, prompt re-login.`, ml: `Upload മധ്യത്തില് session expire — spinner നിൽത്തുക, draft നിലനിർത്തുക, re-login prompt.` },
          { en: `Wrong-role user cannot complete restricted actions (API enforced).`, ml: `Wrong-role user restricted actions പൂർത്തിയാക്കാന് (API enforced).` },
        ],
      },
      {
        id: 'app_release',
        title: { en: `8. Release gate`, ml: `8. റിലീസ് ഗേറ്റ്` },
        goal: { en: `Ship-candidate build smoke on both platforms.`, ml: `രണ്ട് പ്ലാറ്റ്ഫോമിലും ship-candidate build smoke.` },
        rejectIf: { en: `Signed off on emulator or one OS only.`, ml: `Emulator അല്ലെങ്കിൽ ഒരു OS മാത്രം sign-off.` },
        checks: [
          { en: `Regression on shared modules (auth, lists, payments).`, ml: `Shared modules (auth, lists, payments) regression.` },
          { en: `Install ship-candidate → login → critical write → logout on iOS + Android.`, ml: `iOS + Android-ല് ship-candidate install → login → critical write → logout.` },
          { en: `Mark Done only when DoD + device matrix are complete.`, ml: `DoD + device matrix പൂർത്തിയാകുമ്പോൾ മാത്രം Done.` },
        ],
      },
    ],
    releaseGate: [
      { en: `Physical iOS and Android smoke passed.`, ml: `Physical iOS, Android smoke പാസ്.` },
      { en: `No infinite loaders; clear offline / session errors.`, ml: `Infinite loaders ഇല്ല; offline / session errors വ്യക്തം.` },
      { en: `Deep links and push land on the correct screen.`, ml: `Deep links, push ശരിയ സ്ക്രീനില് എത്തുന്നു.` },
      { en: `Payment / UPI handoff verified on real devices when in scope.`, ml: `Scope-ലുള്ള് യഥാർത്ഥ ഡിവൈസുകളിൽ Payment / UPI handoff ഉറപ്പാക്കുക.` },
      { en: `UI = API for critical fields after kill/relaunch.`, ml: `Kill/relaunch-നു് ശേഷം critical fields-നു് UI = API.` },
      { en: `Ship-candidate build smoke passed — not emulator-only.`, ml: `Ship-candidate build smoke പാസ് — emulator-only അല്ല.` },
    ],
  },
};

export function buildCodoTesterPlaybookMarkdown(): string {
  const lines: string[] = [
    '## Expert QA Process (Web vs App)',
    '',
    'Use the shared Mandatory Testing Flow for release sequencing. Use the platform playbook below for how testers execute efficiently and accurately. Each line includes English and Malayalam.',
    '',
  ];

  (['web', 'app'] as const).forEach((key) => {
    const p = CODO_TESTER_PLAYBOOKS[key];
    lines.push(
      `### ${t(p.label, 'en')} — ${t(p.subtitle, 'en')}`,
      '',
      `> ${t(p.principle, 'en')}`,
      `>`,
      `> ${t(p.principle, 'ml')}`,
      '',
      '**Environments:**',
      ''
    );
    p.environments.forEach((e) => {
      lines.push(`- ${t(e, 'en')}`);
      if (t(e, 'ml') !== t(e, 'en')) lines.push(`  - ${t(e, 'ml')}`);
    });
    lines.push('', '**Flowchart phases:**', '');
    p.phases.forEach((phase) => {
      lines.push(
        `#### ${t(phase.title, 'en')}`,
        '',
        t(phase.goal, 'en'),
        '',
        t(phase.goal, 'ml'),
        '',
        `Reject if: ${t(phase.rejectIf, 'en')}`,
        '',
        `റിജക്ട് ചെയ്യുക: ${t(phase.rejectIf, 'ml')}`,
        ''
      );
      phase.checks.forEach((c) => {
        lines.push(`- ${t(c, 'en')}`);
        if (t(c, 'ml') !== t(c, 'en')) lines.push(`  - ${t(c, 'ml')}`);
      });
      lines.push('');
    });
    lines.push('**Release gate:**', '');
    p.releaseGate.forEach((g) => {
      lines.push(`- ${t(g, 'en')}`);
      if (t(g, 'ml') !== t(g, 'en')) lines.push(`  - ${t(g, 'ml')}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}
