export type AssetStatus = "active" | "pending" | "expired" | "cancelled" | "parked";
export type InvoiceStatus = "not_billed" | "invoiced" | "paid" | "waived";
export type BillingCycle = "monthly" | "yearly" | "biennial" | "one_time";
export type NodeKind = "server" | "hosting" | "vercel";
export type HardwareCategory = "laptop" | "test_phone" | "office_device" | "network" | "other";
export type HardwareStatus = "in_stock" | "assigned" | "repair" | "retired" | "lost";
export type MailProvider = "hostinger" | "google" | "zoho" | "microsoft" | "other";
export type RecordType = "A" | "AAAA" | "CNAME" | "ALIAS" | "MX" | "TXT" | "NS";
export type TargetKind = "server" | "hosting" | "vercel" | "raw";
export type VaultKind = "password" | "ssh_private_key" | "api_token" | "recovery_code" | "other";

export interface AssetBilling {
  vendor?: string | null;
  vendor_account?: string | null;
  billing_cycle?: BillingCycle | null;
  currency?: string | null;
  vendor_cost?: string | number | null;
  client_charge?: string | number | null;
  margin_amount?: string | number | null;
  invoice_status?: InvoiceStatus | null;
  auto_renew?: number | boolean | null;
  purchased_at?: string | null;
  expires_at?: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AssetsSummary {
  clients: number;
  domains: number;
  subdomains: number;
  mailboxes: number;
  servers: number;
  hosting: number;
  vercel: number;
  hardware: number;
  renewals_30: number;
  margin_total?: number;
}

export interface AssetDomain extends AssetBilling {
  id: string;
  client_id: string;
  project_id?: string | null;
  fqdn: string;
  registrar?: string | null;
  dns_provider?: string | null;
  nameservers?: string[] | null;
  whois_privacy?: number | boolean | null;
  status: AssetStatus;
  notes?: string | null;
  client_name?: string | null;
  client_code?: string | null;
  project_name?: string | null;
  has_secret?: boolean;
  secret_fingerprint?: string | null;
  created_at?: string;
  subdomains?: AssetSubdomain[];
  emails?: AssetEmail[];
  ssl_certs?: AssetSsl[];
}

export interface AssetSubdomain {
  id: string;
  domain_id: string;
  host: string;
  fqdn: string;
  purpose?: string | null;
  record_type: RecordType;
  target_kind: TargetKind;
  target_server_id?: string | null;
  target_hosting_id?: string | null;
  target_vercel_id?: string | null;
  target_value?: string | null;
  ttl?: number | null;
  status: "active" | "disabled";
  apex?: string;
  client_id?: string;
  client_code?: string | null;
  client_name?: string | null;
  created_at?: string;
}

export interface AssetEmail extends AssetBilling {
  id: string;
  domain_id: string;
  address: string;
  provider: MailProvider;
  storage_quota_mb?: number | null;
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  assigned_contact?: string | null;
  status: "active" | "suspended" | "deleted";
  domain_fqdn?: string;
  client_code?: string | null;
  client_name?: string | null;
  has_secret?: boolean;
}

export interface AssetSsl extends AssetBilling {
  id: string;
  domain_id: string;
  subdomain_id?: string | null;
  issuer?: string | null;
  covers?: string | null;
  status: "active" | "expiring" | "expired";
  expires_at: string;
}

export interface AssetServer extends AssetBilling {
  id: string;
  hostname: string;
  public_ipv4?: string | null;
  public_ipv6?: string | null;
  ssh_user?: string | null;
  ssh_port?: number | null;
  os_name?: string | null;
  vcpus?: number | null;
  ram_mb?: number | null;
  disk_gb?: number | null;
  panel_url?: string | null;
  ownership?: "shared" | "dedicated" | "internal";
  status: AssetStatus;
  notes?: string | null;
  has_secret?: boolean;
  secret_fingerprint?: string | null;
  node_kind?: NodeKind;
  inbound_subdomains?: AssetSubdomain[];
  clients?: AssetNodeClient[];
}

export interface AssetHosting extends AssetBilling {
  id: string;
  label: string;
  panel_url?: string | null;
  package_name?: string | null;
  primary_domain?: string | null;
  public_ipv4?: string | null;
  status: AssetStatus;
  notes?: string | null;
  has_secret?: boolean;
  node_kind?: NodeKind;
  inbound_subdomains?: AssetSubdomain[];
  clients?: AssetNodeClient[];
}

export interface AssetVercel extends AssetBilling {
  id: string;
  team_slug?: string | null;
  project_name: string;
  repo_url?: string | null;
  production_domain?: string | null;
  framework?: string | null;
  status: AssetStatus;
  notes?: string | null;
  has_secret?: boolean;
  node_kind?: NodeKind;
  inbound_subdomains?: AssetSubdomain[];
  clients?: AssetNodeClient[];
}

export type AssetNode = (AssetServer | AssetHosting | AssetVercel) & {
  node_kind?: NodeKind;
  link_id?: string;
  link_role?: string | null;
};

export interface AssetNodeClient {
  link_id: string;
  role?: string | null;
  project_id?: string | null;
  client_id: string;
  client_code?: string | null;
  corporate_name?: string | null;
}

export interface AssetHardware extends AssetBilling {
  id: string;
  asset_tag: string;
  category: HardwareCategory;
  brand?: string | null;
  model?: string | null;
  serial_no?: string | null;
  imei?: string | null;
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  client_id?: string | null;
  client_code?: string | null;
  client_name?: string | null;
  purchase_date?: string | null;
  warranty_expires_at?: string | null;
  status: HardwareStatus;
  notes?: string | null;
  has_secret?: boolean;
}

export interface AssetRenewalRow {
  entity_type: string;
  entity_id: string;
  label: string;
  client_id?: string | null;
  client_code?: string | null;
  expires_at: string;
  auto_renew?: number | boolean | null;
  days_left: number;
  kind: string;
  vendor_cost?: string | number | null;
  client_charge?: string | number | null;
}

export interface ClientAssetGraph {
  client: {
    id: string;
    client_code?: string;
    corporate_name?: string;
    commercial_status?: string;
  };
  counts: {
    domains: number;
    subdomains: number;
    mailboxes: number;
    servers: number;
    hosting: number;
    vercel: number;
  };
  domains: AssetDomain[];
  emails: AssetEmail[];
  nodes: AssetNode[];
}

export interface VaultSecretMeta {
  id: string;
  entity_type: string;
  entity_id: string;
  kind: VaultKind;
  label: string;
  fingerprint?: string | null;
  created_at?: string;
  rotated_at?: string | null;
}
