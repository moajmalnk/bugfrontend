import {
  Client,
  CommercialStatus,
  MarketIndustry,
  ReferralSource,
} from '@/types';
import { z } from 'zod';

export const COMMERCIAL_STATUS_OPTIONS: { value: CommercialStatus; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'ended', label: 'Ended' },
];

export const MARKET_INDUSTRY_OPTIONS: { value: MarketIndustry; label: string }[] = [
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'education', label: 'Education' },
  { value: 'saas', label: 'SaaS' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];

export const REFERRAL_SOURCE_OPTIONS: { value: ReferralSource; label: string }[] = [
  { value: 'direct', label: 'Direct' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'event', label: 'Event' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
];

export const clientFormSchema = z.object({
  corporate_name: z.string().min(1, 'Corporate name is required'),
  website: z.string().optional(),
  market_industry: z.string().optional(),
  gst_tax_id: z.string().optional(),
  commercial_status: z.enum(['lead', 'active', 'inactive', 'ended']).default('lead'),
  primary_contact_name: z.string().optional(),
  position: z.string().optional(),
  hq_location: z.string().optional(),
  direct_email: z.string().email('Invalid email').optional().or(z.literal('')),
  direct_phone: z.string().optional(),
  birthday: z.string().optional(),
  date_of_joining: z.string().optional(),
  date_of_ending: z.string().optional(),
  referral_source: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const emptyClientFormValues = (): ClientFormValues => ({
  corporate_name: '',
  website: '',
  market_industry: '',
  gst_tax_id: '',
  commercial_status: 'lead',
  primary_contact_name: '',
  position: '',
  hq_location: '',
  direct_email: '',
  direct_phone: '',
  birthday: '',
  date_of_joining: '',
  date_of_ending: '',
  referral_source: '',
  notes: '',
});

export function clientToFormValues(client: Client): ClientFormValues {
  return {
    corporate_name: client.corporate_name || '',
    website: client.website || '',
    market_industry: client.market_industry || '',
    gst_tax_id: client.gst_tax_id || '',
    commercial_status: client.commercial_status || 'lead',
    primary_contact_name: client.primary_contact_name || '',
    position: client.position || '',
    hq_location: client.hq_location || '',
    direct_email: client.direct_email || '',
    direct_phone: client.direct_phone || '',
    birthday: client.birthday || '',
    date_of_joining: client.date_of_joining || '',
    date_of_ending: client.date_of_ending || '',
    referral_source: client.referral_source || '',
    notes: client.notes || '',
  };
}

export function formValuesToClientPayload(values: ClientFormValues): Partial<Client> {
  const trim = (v?: string) => (v?.trim() ? v.trim() : null);
  return {
    corporate_name: values.corporate_name.trim(),
    website: trim(values.website),
    market_industry: (values.market_industry as MarketIndustry) || null,
    gst_tax_id: trim(values.gst_tax_id),
    commercial_status: values.commercial_status,
    primary_contact_name: trim(values.primary_contact_name),
    position: trim(values.position),
    hq_location: trim(values.hq_location),
    direct_email: trim(values.direct_email),
    direct_phone: trim(values.direct_phone),
    birthday: trim(values.birthday),
    date_of_joining: trim(values.date_of_joining),
    date_of_ending: trim(values.date_of_ending),
    referral_source: (values.referral_source as ReferralSource) || null,
    notes: trim(values.notes),
  };
}

export function getCommercialStatusLabel(status?: CommercialStatus | string | null): string {
  return COMMERCIAL_STATUS_OPTIONS.find((o) => o.value === status)?.label || 'Unknown';
}

export function getMarketIndustryLabel(industry?: MarketIndustry | string | null): string {
  return MARKET_INDUSTRY_OPTIONS.find((o) => o.value === industry)?.label || '—';
}

export function getReferralSourceLabel(source?: ReferralSource | string | null): string {
  return REFERRAL_SOURCE_OPTIONS.find((o) => o.value === source)?.label || '—';
}

export function getClientDisplayName(client?: { corporate_name?: string | null } | null): string {
  return client?.corporate_name?.trim() || '';
}
