import { ENV } from '@/lib/env';

export interface WhatsAppMessageData {
  id: string;
  message: string;
  otp?: string;
  phone: string;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "failed";
  expires_at?: string;
}

export interface WhatsAppMessageResponse {
  success: boolean;
  message: string;
  otp?: string;
  phone?: string;
  email?: string;
  expires_at?: string;
}

export interface WhatsAppMessageHistoryResponse {
  success: boolean;
  data: {
    messages: WhatsAppMessageData[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface VoiceNoteData {
  id: string;
  phone: string;
  duration: number;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  sent_by: string;
  download_url?: string;
  file_path: string;
}

export interface VoiceNoteHistoryResponse {
  success: boolean;
  data: {
    voice_notes: VoiceNoteData[];
    total: number;
    limit: number;
    offset: number;
  };
}

class WhatsAppMessageService {
  private baseUrl = `${ENV.API_URL}/auth`;

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    // Log the response for debugging
    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('API Response Text:', responseText);
    
    if (!response.ok) {
      try {
        const error = JSON.parse(responseText);
        throw new Error(error.message || 'Request failed');
      } catch (parseError) {
        throw new Error(`Server error: ${responseText.substring(0, 200)}`);
      }
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }
  }

  async sendOTP(method: 'whatsapp' | 'mail', identifier: string): Promise<WhatsAppMessageResponse> {
    const payload = method === 'whatsapp' 
      ? { method: 'whatsapp', phone: identifier }
      : { method: 'mail', email: identifier };

    const response = await fetch(`${this.baseUrl}/send_otp.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    return data;
  }

  async getMessageHistory(params?: {
    limit?: number;
    offset?: number;
    phone?: string;
  }): Promise<WhatsAppMessageHistoryResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.phone) searchParams.append('phone', params.phone);

    const url = `${this.baseUrl}/get_whatsapp_messages.php${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    return this.fetchWithAuth(url);
  }

  async sendCustomMessage(phone: string, message: string): Promise<{ success: boolean; message: string }> {
    // This would integrate with your WhatsApp API
    // For now, we'll simulate sending a message
    const apikey = "05ce7a9046414e42b3983330611f8bf5";
    const url = `http://148.251.129.118/whatsapp/api/send?mobile=${phone}&msg=${encodeURIComponent(message)}&apikey=${apikey}`;
    
    try {
      const response = await fetch(url);
      const result = await response.text();
      
      // Log the response for debugging
      console.log('WhatsApp API response:', result);
      
      return {
        success: true,
        message: 'Message sent successfully'
      };
    } catch (error) {
      throw new Error('Failed to send WhatsApp message');
    }
  }

  async sendVoiceNote(phone: string, audioBlob: Blob, duration: number): Promise<{ success: boolean; message: string }> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('mobile', phone);
      formData.append('audio', audioBlob, 'voice-note.wav');
      formData.append('duration', duration.toString());
      formData.append('apikey', '05ce7a9046414e42b3983330611f8bf5');
      
      // This would integrate with your WhatsApp API for voice notes
      // For now, we'll simulate sending a voice note
      const url = `http://148.251.129.118/whatsapp/api/send-voice`;
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.text();
      console.log('WhatsApp Voice API response:', result);
      
      return {
        success: true,
        message: 'Voice note sent successfully'
      };
    } catch (error) {
      throw new Error('Failed to send WhatsApp voice note');
    }
  }

  async getVoiceNoteHistory(params?: {
    limit?: number;
    offset?: number;
    phone?: string;
  }): Promise<VoiceNoteHistoryResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.phone) searchParams.append('phone', params.phone);

    const url = `${this.baseUrl}/get_voice_notes.php${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    return this.fetchWithAuth(url);
  }

  async downloadVoiceNote(voiceNoteId: string): Promise<Blob> {
    const url = `${this.baseUrl}/download_voice_note.php?id=${voiceNoteId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to download voice note');
    }
    
    return response.blob();
  }

  // Utility function to extract OTP from message
  extractOTP(message: string): string | null {
    const otpMatch = message.match(/\b\d{6}\b/);
    return otpMatch ? otpMatch[0] : null;
  }

  // Utility function to copy OTP to clipboard
  async copyOTP(otp: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(otp);
    } catch (error) {
      throw new Error('Failed to copy OTP to clipboard');
    }
  }

  // Utility function to copy all OTPs from messages
  async copyAllOTPs(messages: WhatsAppMessageData[]): Promise<string[]> {
    const otps = messages
      .map((msg) => msg.otp || this.extractOTP(msg.message))
      .filter(Boolean) as string[];

    if (otps.length > 0) {
      await navigator.clipboard.writeText(otps.join(', '));
    }

    return otps;
  }

  // Format phone number for display
  formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +91, format it nicely
    if (cleaned.startsWith('+91')) {
      const number = cleaned.substring(3);
      if (number.length === 10) {
        return `+91 ${number.substring(0, 5)} ${number.substring(5)}`;
      }
    }
    
    return cleaned;
  }

  // Check if OTP is expired
  isOTPExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  // Get time remaining for OTP
  getOTPTimeRemaining(expiresAt: string): number {
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    return Math.max(0, Math.floor((expires - now) / 1000));
  }
}

export const whatsappMessageService = new WhatsAppMessageService(); 