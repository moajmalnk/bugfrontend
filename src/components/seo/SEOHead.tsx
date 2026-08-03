import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  noindex?: boolean;
  canonical?: string;
  /** When false, use title as-is (already includes brand). Default true. */
  titleTemplate?: boolean;
}

const defaultSEO = {
  title: 'BugRicer - Advanced Bug Tracking & Project Management Platform',
  description: 'Professional bug tracking and project management platform for development teams. Streamline bug reporting, project collaboration, and team communication with advanced features and real-time notifications.',
  keywords: 'bug tracking, project management, software development, team collaboration, bug reporting, issue tracking, development tools, CODO AI, BugRicer',
  image: 'https://bugbackend.bugricer.com/uploads/dashboard.png',
  url: 'https://bugs.bugricer.com',
  type: 'website' as const,
  author: 'CODO AI Innovations',
};

function resolveTitle(title: string | undefined, useTemplate: boolean): string {
  if (!title) return defaultSEO.title;
  if (!useTemplate) return title;
  if (/bugricer/i.test(title)) return title;
  return `${title} | BugRicer`;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  section,
  tags,
  noindex = false,
  canonical,
  titleTemplate = true,
}) => {
  const seo = {
    title: resolveTitle(title, titleTemplate),
    description: description || defaultSEO.description,
    keywords: keywords || defaultSEO.keywords,
    image: image || defaultSEO.image,
    url: url || defaultSEO.url,
    type,
    author: author || defaultSEO.author,
    publishedTime,
    modifiedTime,
    section,
    tags,
    noindex,
    canonical: canonical || url || defaultSEO.url,
  };

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="title" content={seo.title} />
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      <meta name="author" content={seo.author} />

      <meta
        name="robots"
        content={
          seo.noindex
            ? 'noindex, nofollow'
            : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        }
      />

      <link rel="canonical" href={seo.canonical} />

      <meta property="og:type" content={seo.type} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={seo.title} />
      <meta property="og:site_name" content="BugRicer" />
      <meta property="og:locale" content="en_US" />

      {seo.type === 'article' && (
        <>
          {seo.publishedTime && (
            <meta property="article:published_time" content={seo.publishedTime} />
          )}
          {seo.modifiedTime && (
            <meta property="article:modified_time" content={seo.modifiedTime} />
          )}
          {seo.author && <meta property="article:author" content={seo.author} />}
          {seo.section && <meta property="article:section" content={seo.section} />}
          {seo.tags?.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seo.url} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
      <meta name="twitter:image:alt" content={seo.title} />
      <meta name="twitter:site" content="@codoacademy" />
      <meta name="twitter:creator" content="@codoacademy" />

      <meta name="application-name" content="BugRicer" />
      <meta name="apple-mobile-web-app-title" content="BugRicer" />

      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': seo.type === 'article' ? 'Article' : 'WebPage',
          headline: seo.title,
          description: seo.description,
          image: seo.image,
          url: seo.url,
          author: {
            '@type': 'Organization',
            name: seo.author,
          },
          publisher: {
            '@type': 'Organization',
            name: 'CODO AI Innovations',
            url: 'https://codoacademy.com',
          },
          ...(seo.type === 'article' && {
            datePublished: seo.publishedTime,
            dateModified: seo.modifiedTime,
            articleSection: seo.section,
            keywords: seo.tags?.join(', '),
          }),
        })}
      </script>
    </Helmet>
  );
};

export const useSEO = (props: SEOHeadProps) => {
  return <SEOHead {...props} />;
};

export default SEOHead;
