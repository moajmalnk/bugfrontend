import type { ComponentType } from 'react';
import { STANDARD_PALETTES } from '../../brand/brandKit';
import type { PosterTemplateDefinition, PosterTemplateProps } from '../../types';
import { StudioEngine } from './StudioEngine';
import {
  STUDIO_BY_KEY,
  STUDIO_CATALOG,
  STUDIO_TEMPLATE_KEYS,
  type StudioTemplateKey,
} from './studioSpec';

function definition(key: StudioTemplateKey): PosterTemplateDefinition {
  const entry = STUDIO_BY_KEY[key];
  return {
    key,
    label: entry.label,
    description: entry.description,
    group: entry.group,
    defaultPalette: entry.defaultPalette,
    palettes: STANDARD_PALETTES,
    fields: [...entry.fields],
    fieldLabels: entry.fieldLabels,
    usesHeroImage: entry.usesHeroImage,
    heroImageLabel: entry.heroImageLabel,
    layouts: ['square', 'portrait', 'story'],
    showsDate: true,
  };
}

function component(key: StudioTemplateKey): ComponentType<PosterTemplateProps> {
  const entry = STUDIO_BY_KEY[key];
  function StudioTemplate(props: PosterTemplateProps) {
    return <StudioEngine {...props} entry={entry} />;
  }
  StudioTemplate.displayName = `Studio(${key})`;
  return StudioTemplate;
}

export const STUDIO_TEMPLATES = Object.fromEntries(
  STUDIO_TEMPLATE_KEYS.map((key) => [key, definition(key)])
) as Record<StudioTemplateKey, PosterTemplateDefinition>;

export const STUDIO_TEMPLATE_COMPONENTS = Object.fromEntries(
  STUDIO_TEMPLATE_KEYS.map((key) => [key, component(key)])
) as Record<StudioTemplateKey, ComponentType<PosterTemplateProps>>;

export { STUDIO_CATALOG, STUDIO_TEMPLATE_KEYS, STUDIO_BY_KEY, isStudioTemplateKey } from './studioSpec';
export type { StudioTemplateKey } from './studioSpec';
