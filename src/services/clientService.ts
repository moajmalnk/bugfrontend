import { ENV } from '@/lib/env';
import { Client, ClientAttachment } from '@/types';

class ClientService {
  private baseUrl = `${ENV.API_URL}/clients`;

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async getClients(): Promise<Client[]> {
    const response = await fetch(`${this.baseUrl}/get.php`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch clients');
    }
    return data.data || [];
  }

  async getClient(clientId: string): Promise<Client> {
    const response = await fetch(`${this.baseUrl}/get.php?id=${encodeURIComponent(clientId)}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch client');
    }
    return data.data;
  }

  async createClient(payload: Partial<Client>): Promise<Client> {
    const response = await fetch(`${this.baseUrl}/create.php`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create client');
    }
    return data.data;
  }

  async updateClient(clientId: string, payload: Partial<Client>): Promise<Client> {
    const response = await fetch(`${this.baseUrl}/update.php`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id: clientId, ...payload }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update client');
    }
    return data.data;
  }

  async deleteClient(clientId: string, force = false): Promise<void> {
    const url = `${this.baseUrl}/delete.php?id=${encodeURIComponent(clientId)}${force ? '&force=true' : ''}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete client');
    }
  }

  async uploadAttachments(clientId: string, files: File[]): Promise<ClientAttachment[]> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('client_id', clientId);
    files.forEach((file) => formData.append('files[]', file));

    const response = await fetch(`${this.baseUrl}/upload_attachment.php`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload attachments');
    }
    return data.data || [];
  }

  async getAttachments(clientId: string): Promise<ClientAttachment[]> {
    const response = await fetch(
      `${this.baseUrl}/get_attachments.php?client_id=${encodeURIComponent(clientId)}`,
      { headers: this.getAuthHeaders() }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch attachments');
    }
    return data.data || [];
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/delete_attachment.php?id=${encodeURIComponent(attachmentId)}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete attachment');
    }
  }
}

export const clientService = new ClientService();
