/**
 * Why: Browsers cannot re-prompt after Location is denied. Users need
 * platform-specific steps (Mac/Windows/iOS/Android × Safari/Chrome/Edge).
 */

export type LocationClientOs = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'other';
export type LocationClientBrowser =
  | 'safari'
  | 'chrome'
  | 'firefox'
  | 'edge'
  | 'samsung'
  | 'other';

export type LocationClientInfo = {
  os: LocationClientOs;
  browser: LocationClientBrowser;
  isMobile: boolean;
  isPwa: boolean;
  label: string;
};

export type LocationHelpGuide = {
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
};

function ua(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia?.('(display-mode: standalone)');
  if (mq?.matches) return true;
  // iOS Safari "Add to Home Screen"
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

export function detectLocationClient(): LocationClientInfo {
  const agent = ua();
  const lower = agent.toLowerCase();
  const isIPadOs =
    typeof navigator !== 'undefined' &&
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1;

  let os: LocationClientOs = 'other';
  if (/iphone|ipod/.test(lower) || isIPadOs || /ipad/.test(lower)) os = 'ios';
  else if (/android/.test(lower)) os = 'android';
  else if (/mac os x|macintosh/.test(lower)) os = 'macos';
  else if (/windows/.test(lower)) os = 'windows';
  else if (/linux/.test(lower)) os = 'linux';

  let browser: LocationClientBrowser = 'other';
  if (/edg\//.test(lower)) browser = 'edge';
  else if (/fxios|firefox/.test(lower)) browser = 'firefox';
  else if (/crios|chrome|chromium/.test(lower) && !/edg\//.test(lower)) browser = 'chrome';
  else if (/safari/.test(lower) && !/chrome|crios|chromium|android/.test(lower)) {
    browser = 'safari';
  } else if (/samsungbrowser/.test(lower)) browser = 'samsung';

  // iOS Chrome still uses WebKit — treat help as Safari settings when needed
  if (os === 'ios' && /crios/.test(lower)) browser = 'chrome';

  const isMobile =
    os === 'ios' ||
    os === 'android' ||
    /mobile|tablet/.test(lower) ||
    isIPadOs;

  const isPwa = isStandalonePwa();
  const osLabel =
    os === 'ios'
      ? 'iPhone / iPad'
      : os === 'android'
        ? 'Android'
        : os === 'macos'
          ? 'Mac'
          : os === 'windows'
            ? 'Windows'
            : os === 'linux'
              ? 'Linux'
              : 'this device';
  const browserLabel =
    browser === 'safari'
      ? 'Safari'
      : browser === 'chrome'
        ? 'Chrome'
        : browser === 'edge'
          ? 'Edge'
          : browser === 'firefox'
            ? 'Firefox'
            : browser === 'samsung'
              ? 'Samsung Internet'
              : 'your browser';

  return {
    os,
    browser,
    isMobile,
    isPwa,
    label: isPwa ? `${osLabel} · App` : `${osLabel} · ${browserLabel}`,
  };
}

function siteHost(): string {
  if (typeof window === 'undefined') return 'this site';
  return window.location.hostname || 'this site';
}

/** Platform-specific unlock steps when Location is permanently blocked. */
export function getLocationPermissionHelp(
  client: LocationClientInfo = detectLocationClient()
): LocationHelpGuide {
  const host = siteHost();

  if (client.isPwa && client.os === 'ios') {
    return {
      title: 'Allow Location for this app (iPhone / iPad)',
      summary:
        'Home Screen apps use iOS Settings — the browser lock icon will not work here.',
      steps: [
        'Open Settings → Privacy & Security → Location Services (turn On).',
        'Scroll to find this app (or Safari Websites) and set Location to While Using.',
        'Return here and tap “I’ve allowed location”.',
      ],
      tip: 'If the app is missing from the list, delete it from the Home Screen and open BugRicer in Safari once, allow Location, then re-add to Home Screen.',
    };
  }

  if (client.os === 'ios') {
    if (client.browser === 'chrome' || client.browser === 'edge' || client.browser === 'firefox') {
      return {
        title: `Allow Location in ${client.label}`,
        summary: 'iOS stores Location for each browser in Settings — not only in the address bar.',
        steps: [
          `Open iOS Settings → ${client.browser === 'chrome' ? 'Chrome' : client.browser === 'edge' ? 'Edge' : 'Firefox'}.`,
          'Tap Location → While Using the App (or Ask).',
          `Also check Settings → Safari → Location if ${host} was blocked system-wide.`,
          'Return to BugRicer and tap “I’ve allowed location”.',
        ],
        tip: 'On iPhone, denying once often requires Settings — the in-page button cannot force a new prompt.',
      };
    }
    return {
      title: 'Allow Location in Safari (iPhone / iPad)',
      summary: 'Safari blocks Location after Deny until you change it in Settings or the aA / lock menu.',
      steps: [
        `Tap aA (or the lock) left of the address bar → Website Settings.`,
        'Set Location to Allow (or Ask).',
        'If that option is missing: Settings → Safari → Location → Allow / Ask.',
        'Or: Settings → Privacy & Security → Location Services → Safari Websites → Allow.',
        'Return here and tap “I’ve allowed location”.',
      ],
      tip: 'Refresh the page after changing Settings if the old block remains.',
    };
  }

  if (client.os === 'android') {
    if (client.browser === 'samsung') {
      return {
        title: 'Allow Location in Samsung Internet',
        summary: 'Android needs both device Location and site permission.',
        steps: [
          'Turn on device Location (quick settings tile).',
          'Tap the lock / permissions icon in the address bar → Permissions → Location → Allow.',
          `Or: Menu ⋮ → Settings → Sites and downloads → Site permissions → Location → ${host} → Allow.`,
          'Return here and tap “I’ve allowed location”.',
        ],
      };
    }
    return {
      title: 'Allow Location on Android',
      summary: 'Chrome/Edge remember Deny until you change Site settings.',
      steps: [
        'Turn on device Location (quick settings).',
        'Tap the lock (or tune) icon left of the URL → Permissions → Location → Allow.',
        `Or: Menu ⋮ → Settings → Site settings → Location → ${host} → Allow.`,
        'Return here and tap “I’ve allowed location”.',
      ],
      tip: 'If GPS is off or battery saver is extreme, Office check-in may time out even after Allow.',
    };
  }

  if (client.os === 'macos') {
    if (client.browser === 'safari') {
      return {
        title: 'Allow Location in Safari (Mac)',
        summary: 'Safari uses both website settings and macOS Privacy.',
        steps: [
          `Safari menu → Settings… → Websites → Location → find ${host} → Allow.`,
          'Or click the lock / page icon in the Smart Search field → Website Settings → Location → Allow.',
          'Also check System Settings → Privacy & Security → Location Services → Safari → On.',
          'Reload BugRicer, then tap “I’ve allowed location”.',
        ],
        tip: 'macOS must allow Safari under Location Services or the site setting alone will fail.',
      };
    }
    if (client.browser === 'firefox') {
      return {
        title: 'Allow Location in Firefox (Mac)',
        summary: 'Firefox stores Location under Page Info / Permissions.',
        steps: [
          'Click the lock icon left of the URL → Connection secure → More information.',
          'Permissions tab → Access your location → uncheck Block / set Allow.',
          'Or: Settings → Privacy & Security → Permissions → Location → Settings… → allow this site.',
          'Reload and tap “I’ve allowed location”.',
        ],
      };
    }
    // Chrome / Edge / other on Mac
    return {
      title: `Allow Location in ${client.browser === 'edge' ? 'Edge' : 'Chrome'} (Mac)`,
      summary: 'After Deny, the browser will not ask again until Site settings are changed.',
      steps: [
        'Click the tune / lock icon left of the address bar.',
        'Site settings (or Permissions) → Location → Allow.',
        `Or paste chrome://settings/content/siteDetails?site=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')} in a new tab (Edge: edge://settings/content/all).`,
        'Also ensure System Settings → Privacy & Security → Location Services is On for your browser.',
        'Reload BugRicer, then tap “I’ve allowed location”.',
      ],
      tip: 'If Location Services is Off for Chrome/Edge at the Mac level, the site Allow toggle will not work.',
    };
  }

  if (client.os === 'windows') {
    if (client.browser === 'edge') {
      return {
        title: 'Allow Location in Edge (Windows)',
        summary: 'Windows Location and Edge site permission must both be on.',
        steps: [
          'Click the lock / permissions icon left of the URL → Permissions for this site → Location → Allow.',
          'Or: Settings (⋯) → Cookies and site permissions → Location → Allow → add this site.',
          'Windows: Settings → Privacy & security → Location → Location services On, and allow Microsoft Edge.',
          'Reload BugRicer, then tap “I’ve allowed location”.',
        ],
      };
    }
    if (client.browser === 'firefox') {
      return {
        title: 'Allow Location in Firefox (Windows)',
        summary: 'Firefox keeps a separate Location block list.',
        steps: [
          'Click the lock icon → Connection secure → More information → Permissions → Location → Allow.',
          'Or: Settings → Privacy & Security → Permissions → Location → Settings… → remove the block for this site.',
          'Windows Location must be On (Settings → Privacy & security → Location).',
          'Reload and tap “I’ve allowed location”.',
        ],
      };
    }
    return {
      title: 'Allow Location in Chrome (Windows)',
      summary: 'Deny is sticky until you change Site settings.',
      steps: [
        'Click the tune / lock icon left of the address bar → Site settings → Location → Allow.',
        'Or open chrome://settings/content/location and allow this site.',
        'Windows: Settings → Privacy & security → Location → On, and allow your browser.',
        'Reload BugRicer, then tap “I’ve allowed location”.',
      ],
      tip: 'Corporate PCs sometimes disable Location via policy — use WFH request if GPS cannot be enabled.',
    };
  }

  // Generic fallback
  return {
    title: 'Allow Location for this site',
    summary: 'Your browser blocked Location. Change site permission, then try again.',
    steps: [
      'Open the site controls (lock / tune icon) next to the URL.',
      'Set Location to Allow.',
      'Confirm device Location / GPS is turned on.',
      'Reload this page and tap “I’ve allowed location”.',
    ],
    tip: 'Browsers cannot show the Allow prompt again until you unlock the block in settings.',
  };
}

/** Alternate guides so users can switch if detection is wrong. */
export function getAlternateLocationHelpGuides(): Array<{
  key: string;
  label: string;
  guide: LocationHelpGuide;
}> {
  const presets: Array<{ key: string; label: string; client: LocationClientInfo }> = [
    {
      key: 'macos-chrome',
      label: 'Mac · Chrome',
      client: {
        os: 'macos',
        browser: 'chrome',
        isMobile: false,
        isPwa: false,
        label: 'Mac · Chrome',
      },
    },
    {
      key: 'macos-safari',
      label: 'Mac · Safari',
      client: {
        os: 'macos',
        browser: 'safari',
        isMobile: false,
        isPwa: false,
        label: 'Mac · Safari',
      },
    },
    {
      key: 'windows-chrome',
      label: 'Windows · Chrome',
      client: {
        os: 'windows',
        browser: 'chrome',
        isMobile: false,
        isPwa: false,
        label: 'Windows · Chrome',
      },
    },
    {
      key: 'windows-edge',
      label: 'Windows · Edge',
      client: {
        os: 'windows',
        browser: 'edge',
        isMobile: false,
        isPwa: false,
        label: 'Windows · Edge',
      },
    },
    {
      key: 'ios-safari',
      label: 'iPhone · Safari',
      client: {
        os: 'ios',
        browser: 'safari',
        isMobile: true,
        isPwa: false,
        label: 'iPhone / iPad · Safari',
      },
    },
    {
      key: 'android-chrome',
      label: 'Android · Chrome',
      client: {
        os: 'android',
        browser: 'chrome',
        isMobile: true,
        isPwa: false,
        label: 'Android · Chrome',
      },
    },
  ];

  return presets.map((p) => ({
    key: p.key,
    label: p.label,
    guide: getLocationPermissionHelp(p.client),
  }));
}
