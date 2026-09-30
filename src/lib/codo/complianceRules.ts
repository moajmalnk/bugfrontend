import type { ProjectStatus } from '@/lib/utils/projectUtils';

export interface DeveloperRule {
  key: string;
  number: number;
  titleEn: string;
  description: string;
}

export interface QaStressRule {
  key: string;
  title: string;
  description: string;
}

export const DEVELOPER_RULES: DeveloperRule[] = [
  {
    key: 'dev_rule_1',
    number: 1,
    titleEn: 'Hard State Reset',
    description:
      'Reset components cleanly on form submission and modal unmount (useEffect cleanup). Old inputs must never bleed into next entries. Forms must explicitly manage initial, dirty, valid, invalid, submitting, success, failure, reset and cancel states, and opening another record must load only that record\'s values.\n\nMalayalam: ഫോം സബ്മിറ്റ് ചെയ്താലോ മോഡൽ ക്ലോസ് ചെയ്താലോ ഫീൽഡുകൾ പൂർണ്ണമായും ക്ലിയർ ചെയ്യണം. initial, dirty, valid, invalid, submitting, success, failure, reset, cancel സ്റ്റേറ്റുകൾ വ്യക്തമായി കൈകാര്യം ചെയ്യണം; ഒരു റെക്കോർഡിന്റെ പഴയ വാല്യൂ മറ്റൊരു റെക്കോർഡിലേക്ക് പോകരുത്.',
  },
  {
    key: 'dev_rule_2',
    number: 2,
    titleEn: 'Real-Time Input Validation',
    description:
      'Execute inline validation feedback dynamically before form submission.\n\nMalayalam: യൂസർ സബ്മിറ്റ് ചെയ്യുന്നതിന് മുൻപ് തന്നെ ഇൻലൈൻ എറർ ഫീഡ്ബാക്ക് കാണിക്കണം.',
  },
  {
    key: 'dev_rule_3',
    number: 3,
    titleEn: 'Persistent Input Protection',
    description:
      'Intercept backdrop clicks or page navigation if form is dirty with an Unsaved Changes warning.\n\nMalayalam: ഫോം പൂരിപ്പിക്കുന്നതിനിടയിൽ മാറിയാൽ Unsaved Changes വാണിംഗ് കാണിക്കണം.',
  },
  {
    key: 'dev_rule_4',
    number: 4,
    titleEn: 'Data-Clear Verification',
    description:
      'Never rely on native browser cache for resetting inputs; explicitly wipe local state arrays upon cancel/submit.\n\nMalayalam: ബ്രൗസർ കാഷ് ഉപയോഗിച്ച് ഇൻപുട്ട് ക്ലിയർ ചെയ്യരുത്; ക്യാൻസൽ/സബ്മിറ്റ് ചെയ്യുമ്പോൾ ലോക്കൽ സ്റ്റേറ്റ് അറേകൾ വ്യക്തമായി മായ്ക്കണം.',
  },
  {
    key: 'dev_rule_5',
    number: 5,
    titleEn: 'Numeric Character Constraints',
    description:
      'Hard-clamp phone numbers and national IDs (maxLength=10 or 15). Prevent typing infinite numbers.\n\nMalayalam: ഫോൺ നമ്പറുകൾ 10 ഡിജിറ്റിൽ കൂടുതൽ ടൈപ്പ് ചെയ്യാൻ അനുവദിക്കരുത്.',
  },
  {
    key: 'dev_rule_6',
    number: 6,
    titleEn: 'Sanitization Defenses',
    description:
      'Escape and validate inputs on both Frontend and Backend to block SQLi and XSS (script injection).\n\nMalayalam: ഫ്രണ്ട്എൻഡിലും ബാക്കെൻഡിലും ഇൻപുട്ടുകൾ എസ്കേപ്പ് ചെയ്ത് വാലിഡേറ്റ് ചെയ്ത് SQLi/XSS (സ്ക്രിപ്റ്റ് ഇൻജക്ഷൻ) തടയണം.',
  },
  {
    key: 'dev_rule_7',
    number: 7,
    titleEn: 'Length Guardrails',
    description:
      'Provide frontend validation masks matching backend database column constraints.\n\nMalayalam: ബാക്കെൻഡ് ഡാറ്റാബേസ് കോളം പരിധികളുമായി പൊരുത്തപ്പെടുന്ന ഫ്രണ്ട്എൻഡ് വാലിഡേഷൻ മാസ്കുകൾ നൽകണം.',
  },
  {
    key: 'dev_rule_8',
    number: 8,
    titleEn: 'Anti-Double Click Lockout',
    description:
      'Disable action buttons instantly on click and display a loading spinner.\n\nMalayalam: ക്ലിക്ക് ചെയ്ത ഉടൻ ബട്ടൺ ഡിസേബിൾ ആയി സ്പിന്നർ കാണിക്കണം.',
  },
  {
    key: 'dev_rule_9',
    number: 9,
    titleEn: 'Mandatory Deletion Gating',
    description:
      'Never run destructive API calls directly. Require a Small (400px) confirmation modal.\n\nMalayalam: Delete അമർത്തുമ്പോൾ 400px കൺഫർമേഷൻ മോഡൽ വഴി അനുമതി വാങ്ങിയിരിക്കണം.',
  },
  {
    key: 'dev_rule_10',
    number: 10,
    titleEn: 'Submit Button Lock',
    description:
      'Disable the submit button until all required field validations evaluate to true.\n\nMalayalam: ആവശ്യമായ എല്ലാ ഫീൽഡ് വാലിഡേഷനുകളും ശരിയാകുന്നതുവരെ സബ്മിറ്റ് ബട്ടൺ ഡിസേബിൾ ആയിരിക്കണം.',
  },
  {
    key: 'dev_rule_11',
    number: 11,
    titleEn: 'The Codo Corner',
    description:
      'All UI containers, buttons, and cards MUST use rounded-xl (12px) or rounded-2xl (16px). Sharp edges are forbidden.\n\nMalayalam: എല്ലാ UI കണ്ടെയ്നറുകൾ, ബട്ടണുകൾ, കാർഡുകൾ rounded-xl (12px) അല്ലെങ്കിൽ rounded-2xl (16px) ഉപയോഗിക്കണം. മൂർച്ചയുള്ള അറ്റങ്ങൾ അനുവദനീയമല്ല.',
  },
  {
    key: 'dev_rule_12',
    number: 12,
    titleEn: '12-Column Grid Alignment',
    description:
      'Layouts must conform to a 12-column grid system with explicit gap-4 or gap-6 spacing.\n\nMalayalam: ലേഔട്ടുകൾ 12-കോളം ഗ്രിഡ് സിസ്റ്റം പാലിക്കുകയും gap-4 അല്ലെങ്കിൽ gap-6 സ്പേസിംഗ് വ്യക്തമായി ഉപയോഗിക്കുകയും വേണം.',
  },
  {
    key: 'dev_rule_13',
    number: 13,
    titleEn: 'Whitespace Isolation',
    description:
      'Never declare dynamic spacing utilities (mb-X, pb-X) inside .map() array loops. Use parent grid/flex gap properties.\n\nMalayalam: .map() അറേ ലൂപ്പുകൾക്കുള്ളിൽ mb-X, pb-X പോലുള്ള ഡൈനാമിക് സ്പേസിംഗ് യൂട്ടിലിറ്റികൾ ഉപയോഗിക്കരുത്; പാരന്റ് grid/flex gap ഉപയോഗിക്കുക.',
  },
  {
    key: 'dev_rule_14',
    number: 14,
    titleEn: 'Viewport Scroll Defenses',
    description:
      "Never apply global overflow: hidden on the root body. Implement Codo's custom slim scrollbar styles.\n\nMalayalam: റൂട്ട് body-യിൽ ആഗോളമായി overflow: hidden പ്രയോഗിക്കരുത്. Codo-യുടെ സ്ലിം സ്ക്രോൾബാർ സ്റ്റൈലുകൾ നടപ്പിലാക്കുക.",
  },
  {
    key: 'dev_rule_15',
    number: 15,
    titleEn: 'Theme Integrity',
    description:
      'Test every background/text utility to ensure seamless contrast scaling across Dark Mode and Light Mode.\n\nMalayalam: ഡാർക്ക് മോഡും ലൈറ്റ് മോഡും തമ്മിൽ മാറുമ്പോൾ എല്ലാ ബാക്ക്ഗ്രൗണ്ട്/ടെക്സ്റ്റ് യൂട്ടിലിറ്റികളുടെയും കോൺട്രാസ്റ്റ് പരിശോധിക്കുക.',
  },
  {
    key: 'dev_rule_16',
    number: 16,
    titleEn: 'Bidirectional Text Safety',
    description:
      'Multi-language inputs handling Arabic must explicitly set dir="rtl" and preserve caret/number alignment.\n\nMalayalam: അറബിക് പോലുള്ള മൾട്ടി-ലാംഗ്വേജ് ഇൻപുട്ടുകളിൽ dir="rtl" സജ്ജമാക്കി കാരറ്റ്/നമ്പർ അലൈൻമെന്റ് നിലനിർത്തണം.',
  },
  {
    key: 'dev_rule_17',
    number: 17,
    titleEn: 'Custom Picker Normalization',
    description:
      'Date and time pickers must handle null/undefined states cleanly and map display formatting separately from ISO payloads.\n\nMalayalam: തീയതി/സമയ പിക്കറുകൾ null/undefined സ്റ്റേറ്റുകൾ ശരിയായി കൈകാര്യം ചെയ്യുകയും ISO പേലോഡിൽ നിന്ന് ഡിസ്പ്ലേ ഫോർമാറ്റിംഗ് വേർതിരിക്കുകയും വേണം.',
  },
  {
    key: 'dev_rule_18',
    number: 18,
    titleEn: 'Strict Data Sorting',
    description:
      'All database query layers must include explicit ordering (ORDER BY created_at DESC). Random listing order is unacceptable.\n\nMalayalam: എല്ലാ ഡാറ്റാബേസ് ക്വറി ലെയറുകളിലും വ്യക്തമായ ഓർഡറിംഗ് (ORDER BY created_at DESC) ഉണ്ടായിരിക്കണം. ക്രമരഹിത ലിസ്റ്റിംഗ് അനുവദനീയമല്ല.',
  },
  {
    key: 'dev_rule_19',
    number: 19,
    titleEn: 'Skeleton Shimmer Loaders',
    description:
      'Never render a blank screen or plain text spinner during data fetch. Use layout-matching Skeleton Shimmers. Every loading state must have an explicit exit to SUCCESS, EMPTY, ERROR, TIMEOUT or CANCELLED; a skeleton or spinner must never stay active indefinitely.\n\nMalayalam: ഡാറ്റ ഫെച്ച് ചെയ്യുമ്പോൾ ശൂന്യ സ്ക്രീൻ അല്ലെങ്കിൽ സാധാരണ സ്പിന്നർ കാണിക്കരുത്; ലേഔട്ടുമായി പൊരുത്തപ്പെടുന്ന Skeleton Shimmer ഉപയോഗിക്കുക. ഓരോ ലോഡിംഗ് സ്റ്റേറ്റും SUCCESS, EMPTY, ERROR, TIMEOUT, CANCELLED എന്നിവയിൽ ഒന്നിൽ അവസാനിക്കണം; സ്കെലിറ്റൺ/സ്പിന്നർ അനന്തമായി തുടരരുത്.',
  },
  {
    key: 'dev_rule_20',
    number: 20,
    titleEn: '1.5-Second Threshold',
    description:
      'Maintain main-thread execution under 1.5s via WebP images, lazy loading, asset compression, and active PWA service workers.\n\nMalayalam: WebP ഇമേജുകൾ, ലേസി ലോഡിംഗ്, അസറ്റ് കംപ്രഷൻ, PWA സർവീസ് വർക്കറുകൾ വഴി മെയിൻ-ത്രെഡ് എക്സിക്യൂഷൻ 1.5 സെക്കൻഡിനുള്ളിൽ നിലനിർത്തുക.',
  },
  {
    key: 'dev_rule_21',
    number: 21,
    titleEn: 'Database Indexing',
    description:
      'Any database column used in WHERE, JOIN, ORDER BY, or GROUP BY must be explicitly indexed. Base indexes on real access patterns, inspect EXPLAIN plans for important queries, avoid unnecessary joins, columns and repeated queries, and monitor slow queries; an index alone does not prove a query is fast.\n\nMalayalam: WHERE, JOIN, ORDER BY, അല്ലെങ്കിൽ GROUP BY-യിൽ ഉപയോഗിക്കുന്ന ഏത് ഡാറ്റാബേസ് കോളവും വ്യക്തമായി ഇൻഡക്സ് ചെയ്തിരിക്കണം. യഥാർത്ഥ ക്വറി പാറ്റേണുകൾ അനുസരിച്ച് ഇൻഡക്സ് ചെയ്യുക, പ്രധാന ക്വറികൾക്ക് EXPLAIN പ്ലാൻ പരിശോധിക്കുക, അനാവശ്യ JOIN/കോളങ്ങൾ ഒഴിവാക്കുക, സ്ലോ ക്വറികൾ നിരീക്ഷിക്കുക.',
  },
  {
    key: 'dev_rule_22',
    number: 22,
    titleEn: 'High-Volume Scale',
    description:
      'Tables expecting more than 100 entries must implement server-side Pagination or Infinite Scroll bounds. APIs must return only the records and fields the client needs, using pagination, filters and selective fields instead of sending thousands of rows or unused columns.\n\nMalayalam: 100-ൽ അധികം എൻട്രികൾ പ്രതീക്ഷിക്കുന്ന ടേബിളുകളിൽ സർവർ-സൈഡ് പേജിനേഷൻ അല്ലെങ്കിൽ Infinite Scroll നടപ്പിലാക്കണം. API-കൾ ക്ലയന്റിന് ആവശ്യമുള്ള റെക്കോർഡുകളും ഫീൽഡുകളും മാത്രം നൽകണം; ആയിരക്കണക്കിന് റോകളോ ഉപയോഗിക്കാത്ത കോളങ്ങളോ അയക്കരുത്.',
  },
  {
    key: 'dev_rule_23',
    number: 23,
    titleEn: 'Console Scrubbing',
    description:
      'Strip all console.log(), print(), or dd() debug statements before pushing or planning output.\n\nMalayalam: പുഷ് ചെയ്യുന്നതിനോ പ്ലാൻ ഔട്ട്പുട്ടിനോ മുമ്പ് console.log(), print(), dd() ഡീബഗ് സ്റ്റേറ്റ്മെന്റുകൾ നീക്കം ചെയ്യണം.',
  },
  {
    key: 'dev_rule_24',
    number: 24,
    titleEn: 'Secret Variable Isolation',
    description:
      'All API keys and secrets must reside strictly in .env and be excluded via .gitignore.\n\nMalayalam: എല്ലാ API കീകളും സീക്രട്ടുകളും .env-ൽ മാത്രം സൂക്ഷിക്കുകയും .gitignore വഴി ഒഴിവാക്കുകയും വേണം.',
  },
  {
    key: 'dev_rule_25',
    number: 25,
    titleEn: 'Documentation Mandate',
    description:
      'Write explicit JSDoc/PHPDoc explaining the Why behind complex helper functions and business logic.\n\nMalayalam: സങ്കീർണ്ണ ഹെൽപ്പർ ഫംഗ്ഷനുകളുടെയും ബിസിനസ് ലോജിക്കിന്റെയും Why വിശദീകരിക്കുന്ന JSDoc/PHPDoc എഴുതണം.',
  },
  {
    key: 'dev_rule_26',
    number: 26,
    titleEn: 'SPA Router History Sync',
    description:
      'Modals, side drawers, and deep tabs must push state to router history. Clicking browser "Back" must close overlays sequentially instead of exiting the dashboard view.\n\nMalayalam: ബ്രൗസറിന്റെ "Back" ബട്ടൺ അടിക്കുമ്പോൾ ആപ്പ് ക്ലോസ് ആവാതെ മുൻപത്തെ മോഡലോ ടാബോ ഓർഡറിൽ ക്ലോസ് ആവണം.',
  },
  {
    key: 'dev_rule_27',
    number: 27,
    titleEn: 'Strict Test-Data Clearance',
    description:
      'Never leave dummy records (e.g., "test", "asdf") in production DB. Mock tests must run inside seeded development environments only.\n\nMalayalam: പ്രൊഡക്ഷൻ ഡാറ്റാബേസിൽ "test", "asdf" തുടങ്ങിയ അനാവശ്യ എൻട്രികൾ ഒരിക്കലും ഇടരുത്.',
  },
  {
    key: 'dev_rule_28',
    number: 28,
    titleEn: 'Layout Alignment Containment',
    description:
      'Use flex-wrap and responsive grid clamps. Dynamic content length must never break container dimensions or cause page overflow shifts.\n\nMalayalam: ഡാറ്റ കൂടുമ്പോൾ ഡിസൈൻ അലൈൻമെന്റ് തെറ്റാനോ വെറുതെ സ്പേസ് വരാനോ പാടില്ല.',
  },
  {
    key: 'dev_rule_29',
    number: 29,
    titleEn: 'Dynamic Status Feedback Toast',
    description:
      'Optimistic UI updates must revert instantly with a Toast error if the backend API fails to persist state changes.\n\nMalayalam: സ്റ്റാറ്റസ് ചേഞ്ച് ചെയ്യുമ്പോൾ ബാക്ക്എൻഡിൽ മാറിയില്ലെങ്കിൽ സ്ക്രീനിൽ ഉടൻ എറർ ടോസ്റ്റ് കാണിക്കണം.',
  },
  {
    key: 'dev_rule_30',
    number: 30,
    titleEn: 'RTL Typography Safeguards',
    description:
      'Localized Arabic strings must maintain explicit dir="rtl" containers and CSS logical properties (margin-inline-start).\n\nMalayalam: അറബിക് ഫീൽഡുകൾ റൈറ്റ്-ടു-ലെഫ്റ്റ് (dir="rtl") ആയി കൃത്യമായ ഫോർമാറ്റിൽ ആയിരിക്കണം.',
  },
  {
    key: 'dev_rule_31',
    number: 31,
    titleEn: 'Native Scrollbar Preservation',
    description:
      'Never use global overflow: hidden on container scroll wrappers without fallback custom slim scrollbars.\n\nMalayalam: ലിസ്റ്റ് വലിയതായാൽ സ്ക്രോൾബാർ അപ്രത്യക്ഷമാവരുത്; Codo സ്ലിം സ്ക്രോൾബാർ കാണിച്ചിരിക്കണം.',
  },
  {
    key: 'dev_rule_32',
    number: 32,
    titleEn: 'Immutable Array Sorting',
    description:
      'Sorting operations on datasets must create explicit copy instances ([...data].sort()) or perform sorting at database query level.\n\nMalayalam: ഡാറ്റാബേസിൽ നിന്നോ അറേയിൽ നിന്നോ ഓർഡർ കാണിക്കുമ്പോൾ ഡാറ്റ തെറ്റിയ മുൻഗണനയിൽ വരാൻ പാടില്ല.',
  },
  {
    key: 'dev_rule_33',
    number: 33,
    titleEn: 'Canonical Tag Injection',
    description:
      'Ensure all rendered pages include a self-referencing canonical tag.\n\nMalayalam: എല്ലാ റെൻഡർ ചെയ്യുന്ന പേജുകളിലും സെൽഫ്-റഫറൻസിംഗ് canonical ടാഗ് ഉണ്ടായിരിക്കണം.',
  },
  {
    key: 'dev_rule_35',
    number: 35,
    titleEn: 'Heading Hierarchy Enforcement',
    description:
      'Exactly one <h1> per page, followed sequentially by <h2>, <h3>.\n\nMalayalam: ഓരോ പേജിലും ഒരു <h1> മാത്രം; അതിന് ശേഷം <h2>, <h3> ക്രമത്തിൽ ഉപയോഗിക്കുക.',
  },
  {
    key: 'dev_rule_36',
    number: 36,
    titleEn: 'Image WebP & Alt Text Standard',
    description:
      'All image assets must use WebP extension and require non-empty alt text.\n\nMalayalam: എല്ലാ ഇമേജ് അസറ്റുകളും WebP ആയിരിക്കണം; ശൂന്യമല്ലാത്ത alt ടെക്സ്റ്റ് നിർബന്ധമാണ്.',
  },
  {
    key: 'dev_rule_37',
    number: 37,
    titleEn: 'Structured Data JSON-LD',
    description:
      'Inject valid JSON-LD schemas (Organization, LocalBusiness, FAQPage, etc.) into page metadata.\n\nMalayalam: Organization, LocalBusiness, FAQPage പോലുള്ള സാധുവായ JSON-LD സ്കീമകൾ പേജ് മെറ്റാഡാറ്റയിൽ ഇൻജക്റ്റ് ചെയ്യണം.',
  },
  {
    key: 'dev_rule_38',
    number: 38,
    titleEn: 'Conversion Telemetry & GA4 Event Tracking',
    description:
      'Attach gtag or analytics click event triggers to all WhatsApp, phone, and form submission buttons.\n\nMalayalam: WhatsApp, ഫോൺ, ഫോം സബ്മിറ്റ് ബട്ടണുകളിൽ gtag/അനലിറ്റിക്സ് ക്ലിക്ക് ഇവന്റുകൾ ബന്ധിപ്പിക്കണം.',
  },
  {
    key: 'dev_rule_40',
    number: 40,
    titleEn: 'Core Web Vitals Optimization',
    description:
      'Preload critical fonts, enforce image loading="lazy", and prevent layout shifts (CLS < 0.1).\n\nMalayalam: ക്രിട്ടിക്കൽ ഫോണ്ടുകൾ preload ചെയ്യുക, ഇമേജുകൾക്ക് loading="lazy" നൽകുക, ലേഔട്ട് ഷിഫ്റ്റ് തടയുക (CLS < 0.1).',
  },
  {
    key: 'dev_rule_43',
    number: 43,
    titleEn: 'Custom 404 Routing',
    description:
      'Include a custom branded 404 page component for all unhandled routes.\n\nMalayalam: കൈകാര്യം ചെയ്യാത്ത എല്ലാ റൂട്ടുകൾക്കും ബ്രാൻഡഡ് കസ്റ്റം 404 പേജ് ഉണ്ടായിരിക്കണം.',
  },
  {
    key: 'dev_rule_44',
    number: 44,
    titleEn: 'Cross-Browser API Consistency',
    description:
      'The same authenticated request must produce the same logical API result across supported browsers when request parameters, user identity, permissions, database state, and server state are identical. Before fixing a browser-specific data difference, compare URL, method, query, body, session, headers, status, response, timing, frontend cache, and the database result.\n\nMalayalam: ഒരേ യൂസർ, ഒരേ പാരാമീറ്ററുകൾ, ഒരേ സെർവർ സ്റ്റേറ്റ് ആണെങ്കിൽ എല്ലാ ബ്രൗസറുകളിലും ഒരേ API ഫലം ലഭിക്കണം. ബ്രൗസർ പ്രശ്നമാണെന്ന് കരുതുന്നതിന് മുമ്പ് URL, മെത്തേഡ്, ക്വറി, ബോഡി, സെഷൻ, ഹെഡറുകൾ, റെസ്പോൺസ്, ഫ്രണ്ട്എൻഡ് കാഷ്, ഡാറ്റാബേസ് ഫലം താരതമ്യം ചെയ്യണം.',
  },
  {
    key: 'dev_rule_45',
    number: 45,
    titleEn: 'No Manual Hard Refresh Dependency',
    description:
      'Production functionality must not depend on Ctrl+Shift+R or manually clearing browser cache or cookies. If a hard refresh is required to see correct data, treat it as a defect in the caching or state lifecycle.\n\nMalayalam: ശരിയായ ഡാറ്റ കാണാൻ യൂസർ Ctrl+Shift+R അമർത്തുകയോ ബ്രൗസർ കാഷ്/കുക്കികൾ മായ്ക്കുകയോ ചെയ്യേണ്ടി വരരുത്. ഹാർഡ് റിഫ്രഷ് വേണമെങ്കിൽ അത് ഒരു ഡിഫെക്ട് ആണ്.',
  },
  {
    key: 'dev_rule_46',
    number: 46,
    titleEn: 'Explicit API Cache Policy',
    description:
      'Every API endpoint must declare an intentional caching policy (Cache-Control, ETag, Last-Modified, Vary). Sensitive authenticated responses must not be stored in shared or public caches. Do not append random timestamps such as ?t=Date.now() as a permanent cache-bust.\n\nMalayalam: ഓരോ API എൻഡ്‌പോയിന്റിനും വ്യക്തമായ Cache-Control, ETag, Last-Modified, Vary നയം ഉണ്ടായിരിക്കണം. സ്വകാര്യ പ്രതികരണങ്ങൾ പങ്കിട്ട കാഷിൽ സൂക്ഷിക്കരുത്. ?t=Date.now() സ്ഥിരം പരിഹാരമാക്കരുത്.',
  },
  {
    key: 'dev_rule_47',
    number: 47,
    titleEn: 'Cache Invalidation After Mutations',
    description:
      'After a successful POST, PUT, PATCH, or DELETE (create, update, delete, bulk update or status change), invalidate or update every frontend query and state that depends on the changed resource, including lists, detail views, counters, totals, dashboards, filters and pagination, then refetch so the UI shows the latest data. A 200 response alone does not prove the UI is correct.\n\nMalayalam: POST, PUT, PATCH, DELETE വിജയിച്ച ശേഷം ആ ഡാറ്റയെ ആശ്രയിക്കുന്ന ഫ്രണ്ട്എൻഡ് ക്വറികളും സ്റ്റേറ്റും ഇൻവാലിഡേറ്റ് ചെയ്ത് വീണ്ടും ഫെച്ച് ചെയ്യണം. പഴയ ലിസ്റ്റ് സ്ക്രീനിൽ നിൽക്കരുത്. ലിസ്റ്റ്, ഡീറ്റെയിൽ, കൗണ്ടർ, ടോട്ടൽ, ഡാഷ്ബോർഡ്, ഫിൽട്ടർ, പേജിനേഷൻ എല്ലാം അപ്ഡേറ്റ് ആകണം; API 200 നൽകിയതുകൊണ്ട് മാത്രം UI ശരിയാണെന്ന് കരുതരുത്.',
  },
  {
    key: 'dev_rule_48',
    number: 48,
    titleEn: 'Frontend Query Cache Ownership',
    description:
      'Every frontend data cache must have an explicit owner, stale time, and cache time, and must define what is cached, why, who can access it, when it refreshes and what happens after a mutation. Invalidate related queries after mutations, cancel obsolete requests, and do not keep the same server data in multiple uncontrolled stores; each piece of business state has one source of truth. Never cache private or user-specific data unintentionally.\n\nMalayalam: ഓരോ ഫ്രണ്ട്എൻഡ് ഡാറ്റ കാഷിനും വ്യക്തമായ ഉടമ, stale time, cache time ഉണ്ടായിരിക്കണം. മ്യൂട്ടേഷന് ശേഷം ബന്ധപ്പെട്ട ക്വറികൾ ഇൻവാലിഡേറ്റ് ചെയ്യുക. ഒരേ സെർവർ ഡാറ്റ പല അനിയന്ത്രിത സ്റ്റോറുകളിൽ സൂക്ഷിക്കരുത്. എന്ത്, എന്തിന്, ആർക്ക് ആക്സസ്, എപ്പോൾ റിഫ്രഷ് എന്നിവ വ്യക്തമാക്കണം; സ്വകാര്യ/യൂസർ-സ്പെസിഫിക് ഡാറ്റ അബദ്ധത്തിൽ കാഷ് ചെയ്യരുത്.',
  },
  {
    key: 'dev_rule_49',
    number: 49,
    titleEn: 'Service Worker Cache Safety',
    description:
      'Version the service worker and static assets (content-hashed filenames), define cache strategies explicitly, never serve stale dynamic or private API data, serve index.html with Cache-Control: no-cache, and invalidate old caches on activation so every deployment reaches users without Ctrl+Shift+R, clearing site data, deleting cookies or restarting the browser.\n\nMalayalam: സർവീസ് വർക്കറും സ്റ്റാറ്റിക് അസറ്റുകളും വേർഷൻ ചെയ്യുക. ഡൈനാമിക്/സ്വകാര്യ API ഡാറ്റ പഴയ കാഷായി നൽകരുത്. ആക്ടിവേഷനിൽ പഴയ കാഷ് മായ്ക്കുക; യൂസർ സൈറ്റ് ഡാറ്റ മായ്ക്കേണ്ടി വരരുത്. index.html-ന് no-cache നൽകുക; ഓരോ ഡിപ്ലോയ്മെന്റും Ctrl+Shift+R, കുക്കി ഡിലീറ്റ്, ബ്രൗസർ റീസ്റ്റാർട്ട് ഇല്ലാതെ യൂസർക്ക് ലഭിക്കണം.',
  },
  {
    key: 'dev_rule_50',
    number: 50,
    titleEn: 'Request Identity & Credentials',
    description:
      'Authenticated API requests must use one consistent strategy for cookies, credentials, Authorization headers, CSRF tokens, SameSite, Secure/HTTPS, and CORS. When a session expires during an active operation, stop the loading state, keep the user\'s unsaved input, prompt re-authentication, and never allow a silent failure or an unauthorized mutation.\n\nMalayalam: ഓതന്റിക്കേഷൻ വേണ്ട എല്ലാ API അഭ്യർത്ഥനകളും കുക്കി, ക്രെഡൻഷ്യൽ, Authorization, CSRF, SameSite, Secure, CORS എന്നിവയിൽ ഒരേ തന്ത്രം ഉപയോഗിക്കണം. ഓപ്പറേഷനിടയിൽ സെഷൻ എക്സ്പയർ ആയാൽ ലോഡിംഗ് നിർത്തി, സേവ് ചെയ്യാത്ത ഡാറ്റ നിലനിർത്തി, വീണ്ടും ലോഗിൻ ആവശ്യപ്പെടണം; നിശ്ശബ്ദ പരാജയമോ അനധികൃത മ്യൂട്ടേഷനോ പാടില്ല.',
  },
  {
    key: 'dev_rule_51',
    number: 51,
    titleEn: 'API Contract & Backward Compatibility',
    description:
      'Frontend and backend must agree on request fields, response fields, data types, nullable fields, status codes, validation and authentication errors, pagination, sorting, filtering and the error response structure. Breaking changes to APIs, database structures, authentication, shared components or common response formats must be versioned or coordinated with every deployed client and integration.\n\nMalayalam: റിക്വസ്റ്റ്/റെസ്പോൺസ് ഫീൽഡുകൾ, ഡാറ്റ ടൈപ്പുകൾ, null ഫീൽഡുകൾ, സ്റ്റാറ്റസ് കോഡുകൾ, എറർ ഘടന, പേജിനേഷൻ, സോർട്ടിംഗ്, ഫിൽട്ടറിംഗ് എന്നിവയിൽ ഫ്രണ്ട്എൻഡും ബാക്കെൻഡും യോജിക്കണം. ബ്രേക്കിംഗ് മാറ്റങ്ങൾ വേർഷൻ ചെയ്യുകയോ നിലവിലുള്ള ക്ലയന്റുകളുമായി ഏകോപിപ്പിക്കുകയോ ചെയ്യണം.',
  },
  {
    key: 'dev_rule_52',
    number: 52,
    titleEn: 'Backend as Source of Truth',
    description:
      'Critical business data (payments, balances, student records, permissions, attendance, packages, wallet data, financial totals) must have one clearly defined source of truth on the backend. Frontend state, localStorage, sessionStorage and browser cache are never authoritative, and independent copies of the same business state are not allowed unless synchronization is explicitly implemented.\n\nMalayalam: പേയ്മെന്റ്, ബാലൻസ്, സ്റ്റുഡന്റ് റെക്കോർഡ്, പെർമിഷൻ, അറ്റൻഡൻസ്, വാലറ്റ്, ഫിനാൻഷ്യൽ ടോട്ടൽ തുടങ്ങിയ പ്രധാന ഡാറ്റയുടെ ഏക ഉറവിടം ബാക്കെൻഡ് ആയിരിക്കണം. ഫ്രണ്ട്എൻഡ് സ്റ്റേറ്റ്, localStorage, sessionStorage, ബ്രൗസർ കാഷ് എന്നിവ ആധികാരികമായി കണക്കാക്കരുത്.',
  },
  {
    key: 'dev_rule_53',
    number: 53,
    titleEn: 'Complete API Request Lifecycle',
    description:
      'Every asynchronous API request must explicitly handle loading, success, empty result, validation error (422), authentication error (401), authorization error (403), timeout, network failure, server error (5xx) and cancellation. No request may leave the UI in an undefined state.\n\nMalayalam: ഓരോ API അഭ്യർത്ഥനയും loading, success, empty, validation error, 401, 403, timeout, network failure, server error, cancellation എന്നിവ വ്യക്തമായി കൈകാര്യം ചെയ്യണം. ഒരു അഭ്യർത്ഥനയും UI-യെ അനിശ്ചിത അവസ്ഥയിൽ വിടരുത്.',
  },
  {
    key: 'dev_rule_54',
    number: 54,
    titleEn: 'Stale Request & Navigation Safety',
    description:
      'When several requests for the same resource can run at once, an older response must never overwrite a newer one. Use AbortController, request IDs, query keys or equivalent lifecycle control, so that when a user searches A, then AB, then ABC, a late A or AB response cannot replace the ABC result. Back, Forward, refresh, route changes, modal close and tab switching during a request must not corrupt state or trigger unintended mutations.\n\nMalayalam: ഒരേ റിസോഴ്സിന് പല അഭ്യർത്ഥനകൾ ഒരുമിച്ച് നടക്കുമ്പോൾ പഴയ റെസ്പോൺസ് പുതിയതിനെ മാറ്റിയെഴുതരുത് (A → AB → ABC). AbortController, request ID, query key എന്നിവ ഉപയോഗിക്കുക. അഭ്യർത്ഥനയ്ക്കിടയിൽ Back, Forward, refresh, route change, modal close എന്നിവ സ്റ്റേറ്റ് കേടാക്കരുത്.',
  },
  {
    key: 'dev_rule_55',
    number: 55,
    titleEn: 'Never Display Fake Business Data',
    description:
      'Never show guessed, stale or placeholder business values (such as 0, a previous total or dummy figures) as if they were current. The UI must clearly distinguish loading, real data, empty, error and stale data.\n\nMalayalam: ഊഹിച്ചതോ പഴയതോ പ്ലേസ്ഹോൾഡർ ആയതോ ആയ ബിസിനസ് വാല്യൂകൾ നിലവിലെ ഡാറ്റ എന്ന പോലെ കാണിക്കരുത്. loading, real data, empty, error, stale എന്നിവ വ്യക്തമായി വേർതിരിക്കണം.',
  },
  {
    key: 'dev_rule_56',
    number: 56,
    titleEn: 'Database Transaction Integrity',
    description:
      'When a business operation modifies multiple related records, wrap it in a database transaction. A failed operation must roll back completely and never leave partially updated business data.\n\nMalayalam: ഒരു ബിസിനസ് ഓപ്പറേഷൻ പല ബന്ധപ്പെട്ട റെക്കോർഡുകൾ മാറ്റുമ്പോൾ ട്രാൻസാക്ഷൻ ഉപയോഗിക്കണം. പരാജയപ്പെട്ടാൽ പൂർണ്ണമായി റോൾബാക്ക് ചെയ്യണം; പകുതി അപ്ഡേറ്റ് ആയ ഡാറ്റ ബാക്കിയാകരുത്.',
  },
  {
    key: 'dev_rule_57',
    number: 57,
    titleEn: 'Concurrency Safety',
    description:
      'Critical operations (payments, admissions, package updates, wallet operations, attendance, counters, financial transactions, stock-like values) must stay correct when multiple requests run simultaneously. Use row locks, optimistic versioning or atomic updates instead of read-modify-write in application code.\n\nMalayalam: പേയ്മെന്റ്, അഡ്മിഷൻ, വാലറ്റ്, അറ്റൻഡൻസ്, കൗണ്ടർ, ഫിനാൻഷ്യൽ ട്രാൻസാക്ഷൻ തുടങ്ങിയവ ഒരേ സമയം പല അഭ്യർത്ഥനകൾ വന്നാലും ശരിയായിരിക്കണം. row lock, optimistic versioning, atomic update എന്നിവ ഉപയോഗിക്കുക.',
  },
  {
    key: 'dev_rule_58',
    number: 58,
    titleEn: 'Idempotent Critical APIs',
    description:
      'Retrying an important mutation must never create duplicate business records. Enforce idempotency on the backend with idempotency keys, unique constraints or equivalent checks; the frontend lockout in Rule 8 is not enough on its own.\n\nMalayalam: പ്രധാന മ്യൂട്ടേഷൻ വീണ്ടും ശ്രമിച്ചാലും ഡ്യൂപ്ലിക്കേറ്റ് റെക്കോർഡ് ഉണ്ടാകരുത്. ബാക്കെൻഡിൽ idempotency key, unique constraint എന്നിവ ഉപയോഗിക്കുക; Rule 8-ലെ ഫ്രണ്ട്എൻഡ് ലോക്ക് മാത്രം മതിയാവില്ല.',
  },
  {
    key: 'dev_rule_59',
    number: 59,
    titleEn: 'N+1 Query Prevention',
    description:
      'Never execute one database query per returned record when the same data can be fetched with joins, eager loading, batching (WHERE id IN (...)) or aggregation. Loading 100 students must not trigger 100 extra package queries.\n\nMalayalam: ഓരോ റെക്കോർഡിനും വേറെ ഡാറ്റാബേസ് ക്വറി നടത്തരുത്. JOIN, eager loading, batching, aggregation എന്നിവ ഉപയോഗിക്കുക. 100 സ്റ്റുഡന്റ്സിനെ ലോഡ് ചെയ്യുമ്പോൾ 100 അധിക ക്വറികൾ പാടില്ല.',
  },
  {
    key: 'dev_rule_60',
    number: 60,
    titleEn: 'Backend Authorization',
    description:
      'Frontend permission hiding is not security. Every protected backend endpoint must independently verify the caller\'s identity, role and access to the specific resource. Never trust hidden buttons, frontend roles, route visibility or client-side checks.\n\nMalayalam: ഫ്രണ്ട്എൻഡിൽ ബട്ടൺ മറയ്ക്കുന്നത് സെക്യൂരിറ്റി അല്ല. ഓരോ സംരക്ഷിത ബാക്കെൻഡ് എൻഡ്‌പോയിന്റും യൂസറുടെ റോളും റിസോഴ്സ് ആക്സസും സ്വതന്ത്രമായി പരിശോധിക്കണം.',
  },
  {
    key: 'dev_rule_61',
    number: 61,
    titleEn: 'Environment Isolation',
    description:
      'Development, staging and production must use separate databases, credentials, API endpoints, storage, secrets and third-party keys. Production must never accidentally point to development or test resources, and non-production must never write to production data.\n\nMalayalam: ഡെവലപ്മെന്റ്, സ്റ്റേജിംഗ്, പ്രൊഡക്ഷൻ എന്നിവയ്ക്ക് വേറിട്ട ഡാറ്റാബേസ്, ക്രെഡൻഷ്യൽ, API എൻഡ്‌പോയിന്റ്, സ്റ്റോറേജ്, സീക്രട്ട്, തേർഡ്-പാർട്ടി കീകൾ വേണം. പ്രൊഡക്ഷൻ ഒരിക്കലും ടെസ്റ്റ് റിസോഴ്സുകൾ ഉപയോഗിക്കരുത്.',
  },
  {
    key: 'dev_rule_62',
    number: 62,
    titleEn: 'Safe Database Migrations',
    description:
      'Schema changes must ship as reviewed, re-runnable migrations. Never deploy a migration that can silently delete production data, invalidate existing records, break the currently deployed application version or cause irreversible corruption. Prefer additive changes, back up before destructive steps, and plan a rollback.\n\nMalayalam: ഡാറ്റാബേസ് മാറ്റങ്ങൾ സുരക്ഷിതമായ മൈഗ്രേഷനുകളിലൂടെ മാത്രം. പ്രൊഡക്ഷൻ ഡാറ്റ ഡിലീറ്റ് ചെയ്യുന്നതോ നിലവിലെ റെക്കോർഡുകൾ അസാധുവാക്കുന്നതോ പഴയ ആപ്പ് വേർഷൻ തകർക്കുന്നതോ ആയ മൈഗ്രേഷൻ ഡിപ്ലോയ് ചെയ്യരുത്. ബാക്കപ്പും റോൾബാക്ക് പ്ലാനും വേണം.',
  },
  {
    key: 'dev_rule_63',
    number: 63,
    titleEn: 'Production Observability',
    description:
      'Important production operations must emit useful structured logs and monitoring signals (operation, user ID, request ID, outcome, duration). Logs must never contain passwords, access tokens, API secrets or sensitive personal data.\n\nMalayalam: പ്രധാന പ്രൊഡക്ഷൻ ഓപ്പറേഷനുകൾക്ക് ഉപകാരപ്രദമായ structured ലോഗിംഗും മോണിറ്ററിംഗും വേണം. ലോഗുകളിൽ പാസ്‌വേഡ്, ആക്സസ് ടോക്കൺ, API സീക്രട്ട്, സെൻസിറ്റീവ് വ്യക്തിഗത ഡാറ്റ ഒരിക്കലും ഉണ്ടാകരുത്.',
  },
  {
    key: 'dev_rule_64',
    number: 64,
    titleEn: 'AI-Generated Code Verification',
    description:
      'Code generated with Cursor, Codex, Claude, ChatGPT or any other AI tool is not automatically trusted. It must pass the same code review, testing, security, performance and maintainability standards as hand-written code. Never merge code merely because the AI produced it successfully.\n\nMalayalam: Cursor, Codex, Claude, ChatGPT തുടങ്ങിയ AI ടൂളുകൾ എഴുതിയ കോഡ് സ്വയമേവ വിശ്വസിക്കരുത്. മനുഷ്യൻ എഴുതിയ കോഡിന്റെ അതേ റിവ്യൂ, ടെസ്റ്റിംഗ്, സെക്യൂരിറ്റി, പെർഫോമൻസ് നിലവാരം പാലിക്കണം.',
  },
  {
    key: 'dev_rule_65',
    number: 65,
    titleEn: 'Dependency Discipline',
    description:
      'Before adding a package, check whether the project already has equivalent functionality, whether the package is actively maintained, whether it is compatible with the current stack, and whether it has known security issues. Avoid unnecessary dependencies.\n\nMalayalam: പുതിയ പാക്കേജ് ചേർക്കുന്നതിന് മുമ്പ് പ്രോജക്റ്റിൽ അതേ ഫംഗ്ഷണാലിറ്റി ഉണ്ടോ, പാക്കേജ് സജീവമായി മെയിന്റെയിൻ ചെയ്യുന്നുണ്ടോ, കോംപാറ്റിബിൾ ആണോ, സെക്യൂരിറ്റി പ്രശ്നങ്ങൾ ഉണ്ടോ എന്ന് പരിശോധിക്കുക.',
  },
  {
    key: 'dev_rule_66',
    number: 66,
    titleEn: 'Root Cause Over Workarounds',
    description:
      'Do not fix bugs by blindly adding setTimeout, page reloads, forced refreshes, duplicate API calls, arbitrary retries, cache clearing or artificial delays. Reproduce production bugs in a controlled environment where practical, record the environment, browser, device, user role, API request, response, database state and reproduction steps, then fix the actual cause. If data is only correct after Ctrl+Shift+R, investigate browser cache, service worker, asset versions, API cache, frontend state, deployment and CDN (see Rules 44 and 45).\n\nMalayalam: setTimeout, പേജ് റീലോഡ്, ഫോഴ്സ്ഡ് റിഫ്രഷ്, ഡ്യൂപ്ലിക്കേറ്റ് API കോൾ, അനാവശ്യ റീട്രൈ, കാഷ് ക്ലിയറിംഗ് എന്നിവ വഴി ബഗ് മറയ്ക്കരുത്. ബഗ് റീപ്രൊഡ്യൂസ് ചെയ്ത്, എൻവയോൺമെന്റ്, ബ്രൗസർ, റോൾ, റിക്വസ്റ്റ്, റെസ്പോൺസ്, ഡാറ്റാബേസ് സ്റ്റേറ്റ് രേഖപ്പെടുത്തി യഥാർത്ഥ കാരണം പരിഹരിക്കുക.',
  },
  {
    key: 'dev_rule_67',
    number: 67,
    titleEn: 'Release Readiness',
    description:
      'A feature is not complete because it works on the developer\'s machine. Before release it must be fully implemented, code reviewed, tested, security checked, performance checked, browser checked where applicable, verified as a production build, deployed, and smoke-tested on its critical flow in production.\n\nMalayalam: ഡെവലപ്പറുടെ മെഷീനിൽ പ്രവർത്തിച്ചതുകൊണ്ട് ഫീച്ചർ പൂർത്തിയായി എന്നല്ല. റിലീസിന് മുമ്പ് കോഡ് റിവ്യൂ, ടെസ്റ്റ്, സെക്യൂരിറ്റി, പെർഫോമൻസ്, ബ്രൗസർ പരിശോധന, പ്രൊഡക്ഷൻ ബിൽഡ്, ഡിപ്ലോയ്മെന്റ്, പ്രൊഡക്ഷൻ സ്മോക്ക് ടെസ്റ്റ് എന്നിവ പൂർത്തിയാകണം.',
  },
];

export const QA_STRESS_RULES: QaStressRule[] = [
  {
    key: 'qa_apple_sandbox',
    title: 'The Apple Ecosystem Sandbox',
    description:
      'Test layouts on Safari / iOS WebKit. Reject if flexbox elements, custom scrollbars, or shadows break.\n\nMalayalam: Safari പരിതസ്ഥിതികളിലുടനീളം ക്രോസ്-പ്ലാറ്റ്ഫോം ലേഔട്ട് റെൻഡറിംഗ് പരിശോധിക്കുക. കാർഡ് റേഡിയസ്, ഷാഡോ ബൗണ്ടറികൾ തകരാതെ സ്കെയിൽ ചെയ്യുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക.',
  },
  {
    key: 'qa_click_attack',
    title: 'The Click Attack Safeguard',
    description:
      'Stress-test button structures via continuous high-speed double and triple clicks. Ensure execution locks prevent duplicate API records. Reject if duplicate calls fire or spinner is missing. Also retry after a slow response and confirm no duplicate record is created.\n\nMalayalam: ബട്ടണുകളിൽ തുടർച്ചയായ ഉയർന്ന വേഗത്തിലുള്ള ഡബിൾ/ട്രിപ്പിൾ ക്ലിക്കുകൾ ചെയ്ത് സ്ട്രെസ്-ടെസ്റ്റ് ചെയ്യുക. ഡ്യൂപ്ലിക്കേറ്റ് API റെക്കോർഡുകൾ തടയുന്ന ലോക്കുകൾ ഉറപ്പാക്കുക. സ്ലോ റെസ്പോൺസിന് ശേഷം റീട്രൈ ചെയ്താലും ഡ്യൂപ്ലിക്കേറ്റ് റെക്കോർഡ് ഉണ്ടാകരുത്.',
  },
  {
    key: 'qa_theme_interruption',
    title: 'The Theme Interruption Matrix',
    description:
      'Change interface color styles rapidly back and forth mid-form to detect and address unreadable text variables.\n\nMalayalam: ഫോം പൂരിപ്പിക്കുമ്പോൾ ഡാർക്ക്/ലൈറ്റ് തീം വേഗത്തിൽ മാറ്റി വായിക്കാൻ കഴിയാത്ത ടെക്സ്റ്റ്/കോൺട്രാസ്റ്റ് പ്രശ്നങ്ങൾ കണ്ടെത്തുക.',
  },
  {
    key: 'qa_input_interception',
    title: 'The Input Interception Prompt',
    description:
      'Open form modals, alter form field strings, and simulate a layout close command. Verify warning safeguards capture user context safely. Then walk the full form lifecycle: open → edit → cancel, validation error, API error, success, refresh and navigation. Reject if any path corrupts state or leaks old values.\n\nMalayalam: ഫോം മോഡലുകൾ തുറന്ന് ഫീൽഡുകൾ മാറ്റി ക്ലോസ് ചെയ്യാൻ ശ്രമിക്കുക. Unsaved Changes വാണിംഗ് യൂസർ കോൺടെക്സ്റ്റ് സുരക്ഷിതമായി പിടിക്കുന്നുണ്ടോ എന്ന് പരിശോധിക്കുക. open → edit → cancel / validation error / API error / success / refresh / navigation എല്ലാ വഴികളും ടെസ്റ്റ് ചെയ്യുക; സ്റ്റേറ്റ് തെറ്റിയാൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_empty_array',
    title: 'The Empty Array Fallback',
    description:
      'Simulate empty or empty-result states across relational data blocks. Confirm descriptive empty placeholder messaging handles the viewport safely.\n\nMalayalam: ശൂന്യ/എംപ്റ്റി-റിസൾട്ട് സ്റ്റേറ്റുകൾ സിമുലേറ്റ് ചെയ്യുക. വിവരണാത്മക എംപ്റ്റി പ്ലേസ്ഹോൾഡർ മെസേജിംഗ് വ്യൂപോർട്ട് സുരക്ഷിതമായി കൈകാര്യം ചെയ്യുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക.',
  },
  {
    key: 'qa_boundary_expansion',
    title: 'The Boundary Expansion Constraint',
    description:
      'Attempt long string pastes (100+ digit entries) in phone inputs. Confirm truncation rules drop unnecessary data inputs seamlessly.\n\nMalayalam: ഫോൺ ഇൻപുട്ടുകളിൽ 100+ ഡിജിറ്റ് സ്ട്രിംഗ് പേസ്റ്റ് ചെയ്യുക. അനാവശ്യ ഡാറ്റ ട്രങ്കേറ്റ് ചെയ്ത് ഡ്രോപ്പ് ചെയ്യുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക.',
  },
  {
    key: 'qa_network_break',
    title: 'The Network Break Strategy',
    description:
      'Drop network visibility mid-action or check server error routing. Confirm immediate user notifications via interactive Toast alerts. Test ONLINE → OFFLINE → ONLINE during important operations, then retry after the failure: the app must recover, show the correct state and create no duplicate data.\n\nMalayalam: ആക്ഷൻ നടക്കുമ്പോൾ നെറ്റ്‌വർക്ക് ഡ്രോപ്പ് ചെയ്യുകയോ സർവർ എറർ റൂട്ടിംഗ് പരിശോധിക്കുകയോ ചെയ്യുക. Toast അലേർട്ടുകൾ ഉടൻ കാണിക്കുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക. ONLINE → OFFLINE → ONLINE ടെസ്റ്റ് ചെയ്ത് റീട്രൈ ചെയ്യുക; ആപ്പ് ശരിയായി റിക്കവർ ചെയ്യണം, ഡ്യൂപ്ലിക്കേറ്റ് ഡാറ്റ ഉണ്ടാകരുത്.',
  },
  {
    key: 'qa_console_zero',
    title: 'Console Zero-Tolerance',
    description:
      'Keep Browser DevTools open (F12) during verification. Reject the build if ANY red error appears in the console.\n\nMalayalam: ടെസ്റ്റ് ചെയ്യുമ്പോൾ DevTools (F12) തുറന്ന് വയ്ക്കുക. കൺസോളിൽ റെഡ് എറർ വന്നാൽ ബിൽഡ് റിജക്ട് ചെയ്യണം.',
  },
  {
    key: 'qa_high_volume',
    title: 'High-Volume Scale Audit',
    description:
      'Load views with 100+ records. Reject if pagination is missing or the UI stutters under load. Test every important list with 0, 1, normal and realistic production-scale records; five dummy rows are not enough.\n\nMalayalam: 100+ റെക്കോർഡുകളുള്ള വ്യൂകൾ ലോഡ് ചെയ്യുക. പേജിനേഷൻ ഇല്ലെങ്കിലോ UI സ്റ്റട്ടർ ആയാലോ റിജക്ട് ചെയ്യുക. 0, 1, സാധാരണ, പ്രൊഡക്ഷൻ-സ്കെയിൽ റെക്കോർഡുകൾ ഉപയോഗിച്ച് ടെസ്റ്റ് ചെയ്യുക; അഞ്ച് ഡമ്മി റോ മതിയാവില്ല.',
  },
  {
    key: 'qa_script_injection',
    title: 'Script Injection Test',
    description:
      'Input <script>alert(\'xss\')</script> into form fields. Reject if the string executes or breaks layout rendering.\n\nMalayalam: ഫോം ഫീൽഡുകളിൽ സ്ക്രിപ്റ്റ് ഇൻജക്ഷൻ സ്ട്രിംഗ് നൽകുക. എക്സിക്യൂട്ട് ആയാലോ ലേഔട്ട് തകർന്നാലോ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_modal_scope',
    title: 'Modal Overlay Scope',
    description:
      'Verify Small (400px) modals for deletes, Medium (600px) for standard forms, and Large (950px+) for complex data.\n\nMalayalam: Delete-ന് Small (400px), സാധാരണ ഫോമുകൾക്ക് Medium (600px), കോംപ്ലക്സ് ഡാറ്റയ്ക്ക് Large (950px+) മോഡലുകൾ ഉറപ്പാക്കുക.',
  },
  {
    key: 'qa_rtl_stress',
    title: 'RTL Language Stress Test',
    description:
      'Enter Arabic strings mixed with numbers. Reject if carets misalign or numbers reverse order.\n\nMalayalam: അറബിക് ടെക്സ്റ്റും നമ്പറുകളും കലർത്തി ടെസ്റ്റ് ചെയ്യുക. കാരറ്റ്/നമ്പർ അലൈൻമെന്റ് തെറ്റിയാൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_browser_back',
    title: 'Browser Back Button Drill',
    description:
      'Open layered overlays and press browser Back. Reject if the app exits the view instead of closing the top modal.\n\nMalayalam: ലെയർഡ് ഓവർലേകൾ തുറന്ന് browser Back അമർത്തുക. ടോപ്പ് മോഡൽ അടയ്ക്കാതെ പേജ് വിട്ടാൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_loading_lifecycle',
    title: 'Loading Lifecycle Drill',
    description:
      'Drive every asynchronous screen through LOADING → SUCCESS, EMPTY, ERROR, TIMEOUT and CANCELLED. Reject if loading can remain indefinitely, a skeleton stays after data loads, skeleton and data render together, or the wrong skeleton remains after navigation.\n\nMalayalam: ഓരോ async സ്ക്രീനും LOADING → SUCCESS, EMPTY, ERROR, TIMEOUT, CANCELLED എന്നിവയിലൂടെ ടെസ്റ്റ് ചെയ്യുക. ലോഡിംഗ് അനന്തമായി തുടർന്നാലോ ഡാറ്റ വന്ന ശേഷവും സ്കെലിറ്റൺ നിന്നാലോ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_data_reconciliation',
    title: 'UI / API / Database Reconciliation',
    description:
      'For every critical operation trace USER ACTION → API → BACKEND → DATABASE → API RESPONSE → FRONTEND STATE → DISPLAY and confirm UI value = API value = database value, then refresh the page and confirm the same result remains. Any unexplained difference is a defect.\n\nMalayalam: പ്രധാന ഓപ്പറേഷനുകൾക്ക് UI വാല്യൂ = API വാല്യൂ = ഡാറ്റാബേസ് വാല്യൂ എന്ന് ഉറപ്പാക്കുക; പേജ് റിഫ്രഷ് ചെയ്താലും അതേ ഫലം നിലനിൽക്കണം. വിശദീകരിക്കാനാകാത്ത വ്യത്യാസം ഡിഫെക്ട് ആണ്.',
  },
  {
    key: 'qa_mutation_sync',
    title: 'Mutation Synchronization Audit',
    description:
      'After create, edit, delete and status changes, verify the list, detail view, counts, totals, dashboard, filters, pagination and related screens all show the new state. Change data in one route or session and confirm other screens do not keep showing stale data.\n\nMalayalam: create/edit/delete ചെയ്ത ശേഷം ലിസ്റ്റ്, ഡീറ്റെയിൽ, കൗണ്ട്, ടോട്ടൽ, ഡാഷ്ബോർഡ്, ഫിൽട്ടർ, പേജിനേഷൻ, ബന്ധപ്പെട്ട സ്ക്രീനുകൾ എല്ലാം പുതിയ സ്റ്റേറ്റ് കാണിക്കണം. മറ്റൊരു സ്ക്രീനിൽ പഴയ ഡാറ്റ തുടരരുത്.',
  },
  {
    key: 'qa_race_condition',
    title: 'Race Condition Drill',
    description:
      'Trigger rapid successive requests: type A → AB → ABC in search, and quickly change filters, sorting and date ranges. Reject if the final UI shows anything other than the latest selection or an older response overwrites it.\n\nMalayalam: സെർച്ചിൽ A → AB → ABC വേഗത്തിൽ ടൈപ്പ് ചെയ്യുക, ഫിൽട്ടർ, സോർട്ട്, തീയതി വേഗത്തിൽ മാറ്റുക. അവസാന UI ഏറ്റവും പുതിയ തിരഞ്ഞെടുപ്പ് മാത്രം കാണിക്കണം; പഴയ റെസ്പോൺസ് മാറ്റിയെഴുതിയാൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_navigation_during_requests',
    title: 'Navigation During Requests',
    description:
      'While an API request is active, press Back, Forward and Refresh, change route, page or filter, close the modal and switch tabs. Reject if an obsolete request modifies the new screen, state is corrupted, or an unintended mutation happens.\n\nMalayalam: API അഭ്യർത്ഥന നടക്കുമ്പോൾ Back, Forward, Refresh, route change, modal close, tab switch എന്നിവ ചെയ്യുക. പഴയ അഭ്യർത്ഥന പുതിയ സ്ക്രീൻ മാറ്റിയാലോ സ്റ്റേറ്റ് കേടായാലോ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_slow_api_timeout',
    title: 'Slow API & Timeout Test',
    description:
      'Throttle the network and force an API timeout during the full user flow. The UI must stay usable with the correct skeleton, send no duplicate or accidental submissions, and end in a clear error. Reject on freezes, infinite loading, silent failures or permanently disabled controls.\n\nMalayalam: നെറ്റ്‌വർക്ക് സ്ലോ ആക്കി API timeout ഫോഴ്സ് ചെയ്ത് മുഴുവൻ ഫ്ലോ ടെസ്റ്റ് ചെയ്യുക. ഫ്രീസ്, അനന്ത ലോഡിംഗ്, നിശ്ശബ്ദ പരാജയം, സ്ഥിരമായി ഡിസേബിൾ ആയ ബട്ടണുകൾ ഉണ്ടെങ്കിൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_cross_browser_data',
    title: 'Cross-Browser Data Consistency',
    description:
      'Test critical functionality in Chrome, Safari, Firefox, Edge, Android Chrome and iOS Safari with the same account and backend data. Business results must match; if one browser shows 260 students and another shows 760, reject and investigate the request, cache, state and database chain.\n\nMalayalam: ഒരേ അക്കൗണ്ടും ഒരേ ഡാറ്റയും ഉപയോഗിച്ച് Chrome, Safari, Firefox, Edge, Android, iOS എന്നിവയിൽ ടെസ്റ്റ് ചെയ്യുക. ഒരു ബ്രൗസറിൽ 260, മറ്റൊന്നിൽ 760 എന്ന് കാണിച്ചാൽ റിജക്ട് ചെയ്ത് കാരണം അന്വേഷിക്കുക.',
  },
  {
    key: 'qa_cache_isolation',
    title: 'Cache Isolation Test',
    description:
      'Check first visit, normal refresh, hard refresh, incognito/private mode, after deployment, logout then login, a different account and a different browser. Reject if stale data or another user\'s data is ever displayed.\n\nMalayalam: ആദ്യ സന്ദർശനം, റിഫ്രഷ്, ഹാർഡ് റിഫ്രഷ്, ഇൻകോഗ്നിറ്റോ, ഡിപ്ലോയ്മെന്റിന് ശേഷം, ലോഗൗട്ട്/ലോഗിൻ, മറ്റൊരു അക്കൗണ്ട്, മറ്റൊരു ബ്രൗസർ എന്നിവ ടെസ്റ്റ് ചെയ്യുക. പഴയതോ മറ്റൊരു യൂസറുടെയോ ഡാറ്റ കണ്ടാൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_concurrency',
    title: 'Multi-Tab & Concurrent Operations',
    description:
      'Open the same account in multiple tabs and make changes in each, then use two users or sessions to perform the same critical operation simultaneously. Reject on duplicates, lost updates, incorrect counts, incorrect balances or stale state overwriting newer state.\n\nMalayalam: ഒരേ അക്കൗണ്ട് പല ടാബുകളിൽ തുറന്ന് മാറ്റങ്ങൾ വരുത്തുക; രണ്ട് യൂസർമാർ ഒരേ സമയം ഒരേ ഓപ്പറേഷൻ ചെയ്യുക. ഡ്യൂപ്ലിക്കേറ്റ്, നഷ്ടപ്പെട്ട അപ്ഡേറ്റ്, തെറ്റായ കൗണ്ട്/ബാലൻസ് ഉണ്ടെങ്കിൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_session_expiry',
    title: 'Session Expiry Test',
    description:
      'Expire the session while viewing data, submitting a form, editing, deleting and uploading. The app must recover safely: no infinite loading, no silent failure, no unauthorized mutation and no data corruption.\n\nMalayalam: ഡാറ്റ കാണുമ്പോൾ, ഫോം സബ്മിറ്റ്, എഡിറ്റ്, ഡിലീറ്റ്, അപ്‌ലോഡ് ചെയ്യുമ്പോൾ സെഷൻ എക്സ്പയർ ചെയ്യുക. അനന്ത ലോഡിംഗ്, നിശ്ശബ്ദ പരാജയം, ഡാറ്റ കേടാകൽ എന്നിവ ഇല്ലാതെ സുരക്ഷിതമായി റിക്കവർ ചെയ്യണം.',
  },
  {
    key: 'qa_permission_boundary',
    title: 'Permission Boundary Test',
    description:
      'Call every critical operation as an authorized user, an unauthorized user, a user with the wrong role and an expired session, including direct API calls. Reject if the backend allows the action; hiding it in the frontend is not sufficient.\n\nMalayalam: ഓരോ പ്രധാന ഓപ്പറേഷനും അനുമതിയുള്ള യൂസർ, അനുമതിയില്ലാത്ത യൂസർ, തെറ്റായ റോൾ, എക്സ്പയർ ആയ സെഷൻ എന്നിവ ഉപയോഗിച്ച് (നേരിട്ടുള്ള API കോൾ ഉൾപ്പെടെ) ടെസ്റ്റ് ചെയ്യുക. ഫ്രണ്ട്എൻഡിൽ മറയ്ക്കുന്നത് മതിയാവില്ല.',
  },
  {
    key: 'qa_pagination_integrity',
    title: 'Pagination Integrity Test',
    description:
      'Check the first, a middle and the final page, a page-size change, and pagination combined with filtering, search and sorting. Reject if any record is missing or duplicated across pages.\n\nMalayalam: ആദ്യ, മധ്യ, അവസാന പേജുകൾ, പേജ് സൈസ് മാറ്റം, ഫിൽട്ടർ/സെർച്ച്/സോർട്ട് + പേജിനേഷൻ എന്നിവ ടെസ്റ്റ് ചെയ്യുക. റെക്കോർഡുകൾ നഷ്ടപ്പെട്ടാലോ ആവർത്തിച്ചാലോ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_financial_integrity',
    title: 'Financial Data Integrity',
    description:
      'On financial screens confirm displayed amount = API amount = database amount = calculated amount. Test decimals, zero, large amounts, partial payment, full payment, refund, balance and rounding.\n\nMalayalam: ഫിനാൻഷ്യൽ സ്ക്രീനുകളിൽ കാണിക്കുന്ന തുക = API തുക = ഡാറ്റാബേസ് തുക = കണക്കാക്കിയ തുക എന്ന് ഉറപ്പാക്കുക. ദശാംശം, പൂജ്യം, വലിയ തുക, ഭാഗിക/പൂർണ്ണ പേയ്മെന്റ്, റീഫണ്ട്, ബാലൻസ്, റൗണ്ടിംഗ് എന്നിവ ടെസ്റ്റ് ചെയ്യുക.',
  },
  {
    key: 'qa_api_contract',
    title: 'API Contract Verification',
    description:
      'Compare actual API responses with what the frontend expects: field names, types, null values, status codes, pagination metadata and error bodies. Reject on any mismatch.\n\nMalayalam: യഥാർത്ഥ API റെസ്പോൺസുകൾ ഫ്രണ്ട്എൻഡ് പ്രതീക്ഷിക്കുന്നതുമായി താരതമ്യം ചെയ്യുക: ഫീൽഡ് പേരുകൾ, ടൈപ്പുകൾ, null വാല്യൂ, സ്റ്റാറ്റസ് കോഡ്, പേജിനേഷൻ, എറർ. പൊരുത്തക്കേട് ഉണ്ടെങ്കിൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_production_build_env',
    title: 'Production Build & Environment',
    description:
      'Never approve a release from development mode alone; test the actual production build. Confirm production points to the production API, database, storage, credentials and configuration.\n\nMalayalam: ഡെവലപ്മെന്റ് മോഡ് മാത്രം നോക്കി റിലീസ് അംഗീകരിക്കരുത്; യഥാർത്ഥ പ്രൊഡക്ഷൻ ബിൽഡ് ടെസ്റ്റ് ചെയ്യുക. പ്രൊഡക്ഷൻ API, ഡാറ്റാബേസ്, സ്റ്റോറേജ്, ക്രെഡൻഷ്യൽ, കോൺഫിഗറേഷൻ ശരിയാണെന്ന് ഉറപ്പാക്കുക.',
  },
  {
    key: 'qa_deployment_smoke',
    title: 'Deployment Smoke Test',
    description:
      'Immediately after deployment verify: the site or app opens, login works, the main dashboard works, a critical read works, a critical create or update works, and logout works.\n\nMalayalam: ഡിപ്ലോയ്മെന്റിന് ശേഷം ഉടൻ: സൈറ്റ് തുറക്കുന്നു, ലോഗിൻ, ഡാഷ്ബോർഡ്, പ്രധാന റീഡ്, പ്രധാന create/update, ലോഗൗട്ട് എന്നിവ പ്രവർത്തിക്കുന്നുണ്ടെന്ന് പരിശോധിക്കുക.',
  },
  {
    key: 'qa_regression',
    title: 'Regression Testing',
    description:
      'Every significant change must re-test the existing business flows it can affect. A new feature passing is not enough if an existing feature has broken.\n\nMalayalam: ഓരോ പ്രധാന മാറ്റത്തിനും ബാധിക്കാവുന്ന നിലവിലുള്ള ബിസിനസ് ഫ്ലോകൾ വീണ്ടും ടെസ്റ്റ് ചെയ്യണം. പുതിയ ഫീച്ചർ പാസ്സായാലും പഴയത് തകർന്നാൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_performance_regression',
    title: 'Performance Regression Check',
    description:
      'After major changes compare API response time, number of API requests, payload size, rendering time, bundle size and database performance against the previous release. Reject unexplained regressions.\n\nMalayalam: വലിയ മാറ്റങ്ങൾക്ക് ശേഷം API റെസ്പോൺസ് സമയം, API അഭ്യർത്ഥനകളുടെ എണ്ണം, പേലോഡ് സൈസ്, റെൻഡറിംഗ് സമയം, ബണ്ടിൽ സൈസ്, ഡാറ്റാബേസ് പെർഫോമൻസ് എന്നിവ മുൻ റിലീസുമായി താരതമ്യം ചെയ്യുക.',
  },
  {
    key: 'qa_accessibility',
    title: 'Accessibility Check',
    description:
      'Test keyboard navigation, visible focus, form labels, colour contrast, form error announcements, touch target size and semantic structure. Reject if a core flow cannot be completed with the keyboard.\n\nMalayalam: കീബോർഡ് നാവിഗേഷൻ, ഫോക്കസ്, ലേബലുകൾ, കോൺട്രാസ്റ്റ്, ഫോം എററുകൾ, ടച്ച് ടാർഗെറ്റ്, സെമാന്റിക് ഘടന എന്നിവ ടെസ്റ്റ് ചെയ്യുക. കീബോർഡ് കൊണ്ട് പ്രധാന ഫ്ലോ പൂർത്തിയാക്കാനാകുന്നില്ലെങ്കിൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_responsive_matrix',
    title: 'Responsive Device Matrix',
    description:
      'Test mobile, tablet, laptop, desktop and large desktop widths in both portrait and landscape. Reject on overflow, clipped controls, unreadable text or broken layouts.\n\nMalayalam: മൊബൈൽ, ടാബ്‌ലെറ്റ്, ലാപ്‌ടോപ്പ്, ഡെസ്ക്ടോപ്പ്, വലിയ ഡെസ്ക്ടോപ്പ് എന്നിവ portrait, landscape രണ്ടിലും ടെസ്റ്റ് ചെയ്യുക. ഓവർഫ്ലോ, മുറിഞ്ഞ കൺട്രോളുകൾ, തകർന്ന ലേഔട്ട് ഉണ്ടെങ്കിൽ റിജക്ട് ചെയ്യുക.',
  },
  {
    key: 'qa_release_acceptance',
    title: 'Final Release Acceptance',
    description:
      'Before production approval confirm: critical flows pass, no blocking defects, no critical console errors, no data integrity, authentication or authorization issues, no major loading issues, no obvious browser inconsistencies, no major performance regression, and the production smoke test passes.\n\nMalayalam: പ്രൊഡക്ഷൻ അംഗീകാരത്തിന് മുമ്പ്: പ്രധാന ഫ്ലോകൾ പാസ്, ബ്ലോക്കിംഗ് ഡിഫെക്ട് ഇല്ല, കൺസോൾ എറർ ഇല്ല, ഡാറ്റ/ഓതന്റിക്കേഷൻ/ഓതറൈസേഷൻ പ്രശ്നങ്ങൾ ഇല്ല, ബ്രൗസർ പൊരുത്തക്കേട് ഇല്ല, പെർഫോമൻസ് റിഗ്രഷൻ ഇല്ല, പ്രൊഡക്ഷൻ സ്മോക്ക് ടെസ്റ്റ് പാസ് എന്ന് ഉറപ്പാക്കുക.',
  },
];

export type CompliancePipelineStage =
  | 'developer_unverified'
  | 'developer_complete'
  | 'qa_inspection'
  | 'qa_complete'
  | 'admin_ready';

export interface ComplianceCheckItem {
  rule_key: string;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  verified_by_username?: string | null;
}

export interface ComplianceCustomRule {
  rule_key: string;
  phase: 'developer' | 'tester' | 'project';
  title: string;
  subtitle: string | null;
  description: string;
  created_by: string;
  created_at: string;
}

export interface ComplianceProgress {
  verified: number;
  total: number;
}

export interface ProjectComplianceSummary {
  pipeline_stage: CompliancePipelineStage;
  developer_verified: number;
  developer_total: number;
  tester_verified: number;
  tester_total: number;
  project_verified: number;
  project_total: number;
  emergency_bypass: boolean;
}

export interface ProjectComplianceData {
  project_id: string;
  pipeline_stage: CompliancePipelineStage;
  developer_completed_at: string | null;
  developer_completed_by: string | null;
  tester_completed_at: string | null;
  tester_completed_by: string | null;
  emergency_bypass: boolean;
  emergency_bypass_by: string | null;
  emergency_bypass_at: string | null;
  emergency_bypass_reason: string | null;
  developer_progress: ComplianceProgress;
  tester_progress: ComplianceProgress;
  project_progress: ComplianceProgress;
  developer_checks: ComplianceCheckItem[];
  tester_checks: ComplianceCheckItem[];
  project_checks: ComplianceCheckItem[];
  custom_rules?: ComplianceCustomRule[];
  project?: { id: string; status: ProjectStatus; name?: string };
  /** Pending retests auto-marked verified fixed on admin finalize */
  auto_verified_retests?: number;
}

export function getPipelineStageLabel(stage: CompliancePipelineStage): string {
  switch (stage) {
    case 'developer_unverified':
      return 'Developer Unverified';
    case 'developer_complete':
      return 'Developer Complete';
    case 'qa_inspection':
      return 'QA Inspection';
    case 'qa_complete':
      return 'QA Complete';
    case 'admin_ready':
      return 'Admin Final Lock';
    default:
      return stage;
  }
}

export function isCompliancePipelineSatisfied(
  summary:
    | Pick<
        { pipeline_stage: CompliancePipelineStage | string; emergency_bypass: boolean },
        'pipeline_stage' | 'emergency_bypass'
      >
    | null
    | undefined
): boolean {
  if (!summary) return false;
  if (summary.emergency_bypass) return true;
  return summary.pipeline_stage === 'admin_ready';
}

export function isClosedProjectStatus(status: string): boolean {
  return status === 'completed' || status === 'release_ready' || status === 'archived';
}

/** Why: Admins may archive inactive projects without waiting on the full CODO pipeline. */
export function requiresComplianceToClose(status: string, role?: string | null): boolean {
  if (!isClosedProjectStatus(status)) return false;
  if (role === 'admin' && status === 'archived') return false;
  return true;
}
