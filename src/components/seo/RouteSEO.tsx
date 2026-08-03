import { SEOHead } from '@/components/seo/SEOHead';
import { useLocation } from 'react-router-dom';

const SITE = 'https://bugs.bugricer.com';

type RouteSEOConfig = {
  title: string;
  description: string;
  path: string;
  titleTemplate?: boolean;
  noindex?: boolean;
};

const PUBLIC_SEO: Record<string, RouteSEOConfig> = {
  '/': {
    title: 'BugRicer - Advanced Bug Tracking & Project Management Platform | CODO AI Innovations',
    description:
      'Professional bug tracking and project management platform for development teams. Streamline bug reporting, project collaboration, and team communication with advanced features and real-time notifications.',
    path: '/',
    titleTemplate: false,
  },
  '/home': {
    title: 'Home',
    description:
      'BugRicer home — advanced bug tracking, project management, and team collaboration for development teams.',
    path: '/home',
  },
  '/login': {
    title: 'Sign In',
    description:
      'Sign in to BugRicer to manage bugs, projects, and team collaboration securely.',
    path: '/login',
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description:
      'Read the BugRicer privacy policy — how CODO AI Innovations collects, uses, and protects your data.',
    path: '/privacy-policy',
  },
  '/terms-of-use': {
    title: 'Terms of Use',
    description:
      'BugRicer terms of use — the rules and conditions for using the BugRicer platform.',
    path: '/terms-of-use',
  },
};

const NOINDEX_PREFIXES = [
  '/admin',
  '/tester',
  '/developer',
  '/project_manager',
  '/client',
  '/meet',
  '/reset-password',
  '/docs-setup-success',
  '/docs-setup-error',
  '/dashboard',
];

/**
 * Why: One Helmet mount updates title/canonical/robots per route so public pages
 * stay indexable while the auth-gated app shell stays noindex.
 */
export function RouteSEO() {
  const { pathname } = useLocation();
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const publicConfig = PUBLIC_SEO[normalized];

  if (publicConfig) {
    const url = `${SITE}${publicConfig.path === '/' ? '/' : publicConfig.path}`;
    return (
      <SEOHead
        title={publicConfig.title}
        description={publicConfig.description}
        url={url}
        canonical={url}
        titleTemplate={publicConfig.titleTemplate !== false}
        noindex={false}
      />
    );
  }

  const shouldNoindex =
    NOINDEX_PREFIXES.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
    ) || normalized !== '/';

  return (
    <SEOHead
      title="BugRicer"
      description="BugRicer workspace — sign in to access projects, bugs, and team tools."
      url={`${SITE}${normalized}`}
      canonical={`${SITE}${normalized}`}
      titleTemplate={false}
      noindex={shouldNoindex}
    />
  );
}

export default RouteSEO;
