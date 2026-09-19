import { ENV } from "@/lib/env";
import type {
  AssetDomain,
  AssetEmail,
  AssetHardware,
  AssetHosting,
  AssetNode,
  AssetRenewalRow,
  AssetServer,
  AssetSubdomain,
  AssetVercel,
  AssetsSummary,
  ClientAssetGraph,
  NodeKind,
  Paginated,
  VaultSecretMeta,
} from "@/types/assets";

class AssetsService {
  private baseUrl = `${ENV.API_URL}/assets`;

  private headers(): HeadersInit {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  private async parse<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }
    return (data.data ?? data) as T;
  }

  private qs(params: Record<string, string | number | undefined>): string {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === "") return;
      sp.set(k, String(v));
    });
    const q = sp.toString();
    return q ? `?${q}` : "";
  }

  async summary(): Promise<AssetsSummary> {
    const response = await fetch(`${this.baseUrl}/summary.php`, { headers: this.headers() });
    return this.parse<AssetsSummary>(response);
  }

  async clientGraph(clientId: string): Promise<ClientAssetGraph> {
    const response = await fetch(
      `${this.baseUrl}/client_graph.php${this.qs({ client_id: clientId })}`,
      { headers: this.headers() }
    );
    return this.parse<ClientAssetGraph>(response);
  }

  async listDomains(params: Record<string, string | number | undefined>): Promise<Paginated<AssetDomain>> {
    const response = await fetch(`${this.baseUrl}/domains/list.php${this.qs(params)}`, {
      headers: this.headers(),
    });
    return this.parse<Paginated<AssetDomain>>(response);
  }

  async getDomain(id: string): Promise<AssetDomain> {
    const response = await fetch(`${this.baseUrl}/domains/get.php${this.qs({ id })}`, {
      headers: this.headers(),
    });
    return this.parse<AssetDomain>(response);
  }

  async saveDomain(payload: Record<string, unknown>, id?: string): Promise<AssetDomain> {
    const url = id ? `${this.baseUrl}/domains/update.php` : `${this.baseUrl}/domains/create.php`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(id ? { id, ...payload } : payload),
    });
    return this.parse<AssetDomain>(response);
  }

  async deleteDomain(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/domains/delete.php${this.qs({ id })}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    await this.parse(response);
  }

  async listSubdomains(params: Record<string, string | number | undefined>): Promise<Paginated<AssetSubdomain>> {
    const response = await fetch(`${this.baseUrl}/subdomains/list.php${this.qs(params)}`, {
      headers: this.headers(),
    });
    return this.parse<Paginated<AssetSubdomain>>(response);
  }

  async saveSubdomain(payload: Record<string, unknown>, id?: string): Promise<AssetSubdomain> {
    const url = id ? `${this.baseUrl}/subdomains/update.php` : `${this.baseUrl}/subdomains/create.php`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(id ? { id, ...payload } : payload),
    });
    return this.parse<AssetSubdomain>(response);
  }

  async deleteSubdomain(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/subdomains/delete.php${this.qs({ id })}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    await this.parse(response);
  }

  async listEmails(params: Record<string, string | number | undefined>): Promise<Paginated<AssetEmail>> {
    const response = await fetch(`${this.baseUrl}/emails/list.php${this.qs(params)}`, {
      headers: this.headers(),
    });
    return this.parse<Paginated<AssetEmail>>(response);
  }

  async saveEmail(payload: Record<string, unknown>, id?: string): Promise<AssetEmail> {
    const url = id ? `${this.baseUrl}/emails/update.php` : `${this.baseUrl}/emails/create.php`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(id ? { id, ...payload } : payload),
    });
    return this.parse<AssetEmail>(response);
  }

  async deleteEmail(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/emails/delete.php${this.qs({ id })}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    await this.parse(response);
  }

  async createSsl(payload: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/ssl/create.php`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return this.parse(response);
  }

  async deleteSsl(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/ssl/delete.php${this.qs({ id })}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    await this.parse(response);
  }

  private nodeFolder(kind: NodeKind): string {
    if (kind === "server") return "servers";
    if (kind === "hosting") return "hosting";
    return "vercel";
  }

  async listNodes(kind: NodeKind, params: Record<string, string | number | undefined>): Promise<Paginated<AssetNode>> {
    const response = await fetch(`${this.baseUrl}/${this.nodeFolder(kind)}/list.php${this.qs(params)}`, {
      headers: this.headers(),
    });
    return this.parse<Paginated<AssetNode>>(response);
  }

  async getNode(kind: NodeKind, id: string): Promise<AssetServer | AssetHosting | AssetVercel> {
    const response = await fetch(`${this.baseUrl}/${this.nodeFolder(kind)}/get.php${this.qs({ id })}`, {
      headers: this.headers(),
    });
    return this.parse(response);
  }

  async saveNode(kind: NodeKind, payload: Record<string, unknown>, id?: string): Promise<AssetNode> {
    const folder = this.nodeFolder(kind);
    const url = id ? `${this.baseUrl}/${folder}/update.php` : `${this.baseUrl}/${folder}/create.php`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(id ? { id, ...payload } : payload),
    });
    return this.parse<AssetNode>(response);
  }

  async deleteNode(kind: NodeKind, id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${this.nodeFolder(kind)}/delete.php${this.qs({ id })}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    await this.parse(response);
  }

  async linkNode(payload: Record<string, unknown>): Promise<{ id: string }> {
    const response = await fetch(`${this.baseUrl}/nodes/link.php`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return this.parse<{ id: string }>(response);
  }

  async unlinkNode(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/nodes/unlink.php`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ id }),
    });
    await this.parse(response);
  }

  async listHardware(params: Record<string, string | number | undefined>): Promise<Paginated<AssetHardware>> {
    const response = await fetch(`${this.baseUrl}/hardware/list.php${this.qs(params)}`, {
      headers: this.headers(),
    });
    return this.parse<Paginated<AssetHardware>>(response);
  }

  async getHardware(id: string): Promise<AssetHardware> {
    const response = await fetch(`${this.baseUrl}/hardware/get.php${this.qs({ id })}`, {
      headers: this.headers(),
    });
    return this.parse<AssetHardware>(response);
  }

  async saveHardware(payload: Record<string, unknown>, id?: string): Promise<AssetHardware> {
    const url = id ? `${this.baseUrl}/hardware/update.php` : `${this.baseUrl}/hardware/create.php`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(id ? { id, ...payload } : payload),
    });
    return this.parse<AssetHardware>(response);
  }

  async assignHardware(id: string, assigned_user_id: string | null): Promise<AssetHardware> {
    const response = await fetch(`${this.baseUrl}/hardware/assign.php`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ id, assigned_user_id }),
    });
    return this.parse<AssetHardware>(response);
  }

  async deleteHardware(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/hardware/delete.php${this.qs({ id })}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    await this.parse(response);
  }

  async listRenewals(days = 30): Promise<{ items: AssetRenewalRow[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/renewals.php${this.qs({ days })}`, {
      headers: this.headers(),
    });
    return this.parse(response);
  }

  async listVault(entityType: string, entityId: string): Promise<VaultSecretMeta[]> {
    const response = await fetch(
      `${this.baseUrl}/vault/list.php${this.qs({ entity_type: entityType, entity_id: entityId })}`,
      { headers: this.headers() }
    );
    return this.parse<VaultSecretMeta[]>(response);
  }

  async storeVault(payload: Record<string, unknown>): Promise<{ id: string; fingerprint: string }> {
    const response = await fetch(`${this.baseUrl}/vault/store.php`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return this.parse(response);
  }

  async revealVault(id: string): Promise<{ secret: string; label: string; kind: string; fingerprint?: string }> {
    const response = await fetch(`${this.baseUrl}/vault/reveal.php`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ id }),
    });
    return this.parse(response);
  }

  async rotateVault(id: string, secret: string): Promise<{ fingerprint: string }> {
    const response = await fetch(`${this.baseUrl}/vault/rotate.php`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ id, secret }),
    });
    return this.parse(response);
  }

  async deleteVault(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/vault/delete.php${this.qs({ id })}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    await this.parse(response);
  }
}

export const assetsService = new AssetsService();
