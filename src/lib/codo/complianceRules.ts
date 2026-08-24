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
      'Reset components cleanly on form submission and modal unmount (useEffect cleanup). Old inputs must never bleed into next entries.\n\nMalayalam: ഫോം സബ്മിറ്റ് ചെയ്താലോ മോഡൽ ക്ലോസ് ചെയ്താലോ ഫീൽഡുകൾ പൂർണ്ണമായും ക്ലിയർ ചെയ്യണം.',
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
      'Never render a blank screen or plain text spinner during data fetch. Use layout-matching Skeleton Shimmers.\n\nMalayalam: ഡാറ്റ ഫെച്ച് ചെയ്യുമ്പോൾ ശൂന്യ സ്ക്രീൻ അല്ലെങ്കിൽ സാധാരണ സ്പിന്നർ കാണിക്കരുത്; ലേഔട്ടുമായി പൊരുത്തപ്പെടുന്ന Skeleton Shimmer ഉപയോഗിക്കുക.',
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
      'Any database column used in WHERE, JOIN, ORDER BY, or GROUP BY must be explicitly indexed.\n\nMalayalam: WHERE, JOIN, ORDER BY, അല്ലെങ്കിൽ GROUP BY-യിൽ ഉപയോഗിക്കുന്ന ഏത് ഡാറ്റാബേസ് കോളവും വ്യക്തമായി ഇൻഡക്സ് ചെയ്തിരിക്കണം.',
  },
  {
    key: 'dev_rule_22',
    number: 22,
    titleEn: 'High-Volume Scale',
    description:
      'Tables expecting more than 100 entries must implement server-side Pagination or Infinite Scroll bounds.\n\nMalayalam: 100-ൽ അധികം എൻട്രികൾ പ്രതീക്ഷിക്കുന്ന ടേബിളുകളിൽ സർവർ-സൈഡ് പേജിനേഷൻ അല്ലെങ്കിൽ Infinite Scroll നടപ്പിലാക്കണം.',
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
      'Stress-test button structures via continuous high-speed double and triple clicks. Ensure execution locks prevent duplicate API records. Reject if duplicate calls fire or spinner is missing.\n\nMalayalam: ബട്ടണുകളിൽ തുടർച്ചയായ ഉയർന്ന വേഗത്തിലുള്ള ഡബിൾ/ട്രിപ്പിൾ ക്ലിക്കുകൾ ചെയ്ത് സ്ട്രെസ്-ടെസ്റ്റ് ചെയ്യുക. ഡ്യൂപ്ലിക്കേറ്റ് API റെക്കോർഡുകൾ തടയുന്ന ലോക്കുകൾ ഉറപ്പാക്കുക.',
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
      'Open form modals, alter form field strings, and simulate a layout close command. Verify warning safeguards capture user context safely.\n\nMalayalam: ഫോം മോഡലുകൾ തുറന്ന് ഫീൽഡുകൾ മാറ്റി ക്ലോസ് ചെയ്യാൻ ശ്രമിക്കുക. Unsaved Changes വാണിംഗ് യൂസർ കോൺടെക്സ്റ്റ് സുരക്ഷിതമായി പിടിക്കുന്നുണ്ടോ എന്ന് പരിശോധിക്കുക.',
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
      'Drop network visibility mid-action or check server error routing. Confirm immediate user notifications via interactive Toast alerts.\n\nMalayalam: ആക്ഷൻ നടക്കുമ്പോൾ നെറ്റ്‌വർക്ക് ഡ്രോപ്പ് ചെയ്യുകയോ സർവർ എറർ റൂട്ടിംഗ് പരിശോധിക്കുകയോ ചെയ്യുക. Toast അലേർട്ടുകൾ ഉടൻ കാണിക്കുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക.',
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
      'Load views with 100+ records. Reject if pagination is missing or the UI stutters under load.\n\nMalayalam: 100+ റെക്കോർഡുകളുള്ള വ്യൂകൾ ലോഡ് ചെയ്യുക. പേജിനേഷൻ ഇല്ലെങ്കിലോ UI സ്റ്റട്ടർ ആയാലോ റിജക്ട് ചെയ്യുക.',
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
