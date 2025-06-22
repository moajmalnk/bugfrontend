interface WhatsAppMessageData {
  bugTitle: string;
  bugId: string;
  status?: string;
  priority?: string;
  description?: string;
  reportedBy?: string;
  updatedBy?: string;
  projectName?: string;
}

interface WhatsAppContact {
  name: string;
  phone: string;
}

class WhatsAppService {
  // Base URL for WhatsApp deep links
  private readonly WA_BASE_URL = 'https://wa.me';
  private readonly CONTACTS_STORAGE_KEY = 'whatsapp_contacts';

  // Save frequently used contacts
  saveContact(contact: WhatsAppContact): void {
    try {
      const contacts = this.getContacts();
      const existingIndex = contacts.findIndex(c => c.phone === contact.phone);
      
      if (existingIndex >= 0) {
        contacts[existingIndex] = contact;
      } else {
        contacts.push(contact);
      }
      
      localStorage.setItem(this.CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    } catch (error) {
      //.error('Error saving WhatsApp contact:', error);
    }
  }

  // Get saved contacts
  getContacts(): WhatsAppContact[] {
    try {
      const stored = localStorage.getItem(this.CONTACTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      //.error('Error loading WhatsApp contacts:', error);
      return [];
    }
  }

  // Delete a contact
  deleteContact(phone: string): void {
    try {
      const contacts = this.getContacts().filter(c => c.phone !== phone);
      localStorage.setItem(this.CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    } catch (error) {
      //.error('Error deleting WhatsApp contact:', error);
    }
  }

  // Generate WhatsApp deep link for new bug notification
  generateNewBugLink(data: WhatsAppMessageData, phoneNumber?: string): string {
    const message = this.formatNewBugMessage(data);
    return this.createWhatsAppLink(message, phoneNumber);
  }

  // Generate WhatsApp deep link for bug status update
  generateStatusUpdateLink(data: WhatsAppMessageData, phoneNumber?: string): string {
    const message = this.formatStatusUpdateMessage(data);
    return this.createWhatsAppLink(message, phoneNumber);
  }

  // Format message for new bug notification
  private formatNewBugMessage(data: WhatsAppMessageData): string {
    const bugUrl = `${window.location.origin}/bugs/${data.bugId}`;
    
    let message = `🐛 *New Bug Reported*\n\n`;
    message += `📋 *Title:* ${data.bugTitle}\n`;
    
    if (data.projectName) {
      message += `📁 *Project:* ${data.projectName}\n`;
    }
    
    if (data.priority) {
      const priorityEmoji = this.getPriorityEmoji(data.priority);
      message += `${priorityEmoji} *Priority:* ${data.priority.toUpperCase()}\n`;
    }
    
    if (data.reportedBy) {
      message += `👤 *Reported by:* ${data.reportedBy}\n`;
    }
    
    if (data.description && data.description.length > 0) {
      const shortDescription = data.description.length > 100 
        ? data.description.substring(0, 100) + '...' 
        : data.description;
      message += `\n📝 *Description:*\n${shortDescription}\n`;
    }
    
    message += `\n🔗 *View Bug:* ${bugUrl}`;
    message += `\n\n_Sent from BugRacer 🚀_`;
    
    return message;
  }

  // Format message for status update notification
  private formatStatusUpdateMessage(data: WhatsAppMessageData): string {
    const bugUrl = `${window.location.origin}/bugs/${data.bugId}`;
    const statusEmoji = this.getStatusEmoji(data.status || '');
    
    let message = `${statusEmoji} *Bug Status Updated*\n\n`;
    message += `📋 *Title:* ${data.bugTitle}\n`;
    message += `🔄 *New Status:* ${(data.status || '').replace('_', ' ').toUpperCase()}\n`;
    
    if (data.priority) {
      const priorityEmoji = this.getPriorityEmoji(data.priority);
      message += `${priorityEmoji} *Priority:* ${data.priority.toUpperCase()}\n`;
    }
    
    if (data.updatedBy) {
      message += `👤 *Updated by:* ${data.updatedBy}\n`;
    }
    
    message += `\n🔗 *View Bug:* ${bugUrl}`;
    message += `\n\n_Sent from BugRacer 🚀_`;
    
    return message;
  }

  // Create WhatsApp deep link
  private createWhatsAppLink(message: string, phoneNumber?: string): string {
    const encodedMessage = encodeURIComponent(message);
    
    if (phoneNumber) {
      // Remove any non-numeric characters from phone number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      return `${this.WA_BASE_URL}/${cleanPhone}?text=${encodedMessage}`;
    } else {
      // Open WhatsApp without specific contact (user can choose)
      return `${this.WA_BASE_URL}?text=${encodedMessage}`;
    }
  }

  // Get emoji for bug priority
  private getPriorityEmoji(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  // Get emoji for bug status
  private getStatusEmoji(status: string): string {
    switch (status.toLowerCase()) {
      case 'fixed':
        return '✅';
      case 'in_progress':
        return '🔄';
      case 'pending':
        return '⏳';
      case 'declined':
        return '❌';
      case 'rejected':
        return '🚫';
      default:
        return '📝';
    }
  }

  // Open WhatsApp with pre-filled message
  openWhatsApp(link: string): void {
    window.open(link, '_blank');
  }

  // Share new bug via WhatsApp
  shareNewBug(data: WhatsAppMessageData, phoneNumber?: string): void {
    const link = this.generateNewBugLink(data, phoneNumber);
    this.openWhatsApp(link);
  }

  // Share status update via WhatsApp
  shareStatusUpdate(data: WhatsAppMessageData, phoneNumber?: string): void {
    const link = this.generateStatusUpdateLink(data, phoneNumber);
    this.openWhatsApp(link);
  }

  // Share to multiple contacts at once
  shareToMultipleContacts(data: WhatsAppMessageData, type: 'new_bug' | 'status_update', contacts: WhatsAppContact[]): void {
    contacts.forEach(contact => {
      const link = this.getShareableLink(data, type, contact.phone);
      // Open with a small delay to avoid overwhelming the browser
      setTimeout(() => {
        this.openWhatsApp(link);
      }, 500);
    });
  }

  // Generate QR code for easy mobile sharing
  generateQRCode(data: WhatsAppMessageData, type: 'new_bug' | 'status_update'): string {
    const link = this.getShareableLink(data, type);
    // Using QR Server API (free)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
  }

  // Get shareable link (for copying to clipboard)
  getShareableLink(data: WhatsAppMessageData, type: 'new_bug' | 'status_update', phoneNumber?: string): string {
    if (type === 'new_bug') {
      return this.generateNewBugLink(data, phoneNumber);
    } else {
      return this.generateStatusUpdateLink(data, phoneNumber);
    }
  }

  // Auto-schedule sharing (opens links at specified intervals)
  scheduleAutoShare(data: WhatsAppMessageData, type: 'new_bug' | 'status_update', contacts: WhatsAppContact[], intervalMs: number = 2000): void {
    contacts.forEach((contact, index) => {
      setTimeout(() => {
        const link = this.getShareableLink(data, type, contact.phone);
        this.openWhatsApp(link);
      }, index * intervalMs);
    });
  }
}

export const whatsappService = new WhatsAppService();
export type { WhatsAppMessageData, WhatsAppContact }; 