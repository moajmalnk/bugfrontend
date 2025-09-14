
interface WhatsAppMessageData {
  bugTitle?: string;
  bugId?: string;
  status?: string;
  priority?: string;
  description?: string;
  expectedResult?: string;
  actualResult?: string;
  reportedBy?: string;
  updatedBy?: string;
  projectName?: string;
  // For general updates
  updateTitle?: string;
  updateId?: string;
  updateType?: string;
  updateStatus?: string;
  createdBy?: string;
}

interface WhatsAppContact {
  name: string;
  phone: string;
}

class WhatsAppService {
  // Base URL for WhatsApp deep links
  private readonly WA_BASE_URL = 'https://wa.me';
  private readonly CONTACTS_STORAGE_KEY = 'whatsapp_contacts';

  // Helper method to get role-neutral URL for sharing
  private getRoleBasedUrl(path: string): string {
    // For sharing, we want role-neutral URLs that work for all users
    // The route handler will redirect to the appropriate role-based URL
    return `${window.location.origin}${path}`;
  }

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

  // PRIVATE: Get formatted message based on type
  private getMessageForType(data: WhatsAppMessageData, type: 'new_bug' | 'status_update' | 'update_details'): string {
    switch (type) {
      case 'new_bug':
        return this.formatNewBugMessage(data);
      case 'status_update':
        return this.formatStatusUpdateMessage(data);
      case 'update_details':
        return this.formatUpdateDetailsMessage(data);
      default:
        return '';
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

  // Generate WhatsApp deep link for general update
  generateUpdateDetailsLink(data: WhatsAppMessageData, phoneNumber?: string): string {
    const message = this.formatUpdateDetailsMessage(data);
    return this.createWhatsAppLink(message, phoneNumber);
  }

  // Format message for new bug notification
  private formatNewBugMessage(data: WhatsAppMessageData): string {
    const bugUrl = this.getRoleBasedUrl(`/bugs/${data.bugId}`);
    
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

    // Add Expected Result if provided
    if (data.expectedResult && data.expectedResult.trim()) {
      const shortExpected = data.expectedResult.length > 100 
        ? data.expectedResult.substring(0, 100) + '...' 
        : data.expectedResult;
      message += `\n✅ *Expected Result:*\n${shortExpected}\n`;
    }

    // Add Actual Result if provided
    if (data.actualResult && data.actualResult.trim()) {
      const shortActual = data.actualResult.length > 100 
        ? data.actualResult.substring(0, 100) + '...' 
        : data.actualResult;
      message += `\n❌ *Actual Result:*\n${shortActual}\n`;
    }
    
    message += `\n🔗 *View Bug:* ${bugUrl}`;
    message += `\n\n_Sent from BugRicer 🚀_`;
    
    return message;
  }

  // Format message for status update notification
  private formatStatusUpdateMessage(data: WhatsAppMessageData): string {
    const bugUrl = this.getRoleBasedUrl(`/bugs/${data.bugId}`);
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
    message += `\n\n_Sent from BugRicer 🚀_`;
    
    return message;
  }

  // Format message for a general update
  private formatUpdateDetailsMessage(data: WhatsAppMessageData): string {
    const updateUrl = this.getRoleBasedUrl(`/updates/${data.updateId}`);
    
    let message = `📣 *New Update Published*\n\n`;
    message += `📋 *Title:* ${data.updateTitle}\n`;
    
    if (data.projectName) {
      message += `📁 *Project:* ${data.projectName}\n`;
    }
    
    if (data.updateType) {
      message += `🔧 *Type:* ${data.updateType.charAt(0).toUpperCase() + data.updateType.slice(1)}\n`;
    }

    if (data.updateStatus) {
      message += `📊 *Status:* ${data.updateStatus.charAt(0).toUpperCase() + data.updateStatus.slice(1)}\n`;
    }
    
    if (data.createdBy) {
      message += `👤 *Published by:* ${data.createdBy}\n`;
    }
    
    if (data.description && data.description.length > 0) {
      const shortDescription = data.description.length > 100 
        ? data.description.substring(0, 100) + '...' 
        : data.description;
      message += `\n📝 *Description:*\n${shortDescription}\n`;
    }
    
    message += `\n🔗 *View Update:* ${updateUrl}`;
    message += `\n\n_Sent from BugRicer 🚀_`;
    
    return message;
  }

  // Create WhatsApp deep link for app
  private createWhatsAppLink(message: string, phoneNumber?: string): string {
    const encodedMessage = encodeURIComponent(message);
    
    if (phoneNumber) {
      // Remove any non-numeric characters from phone number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      return `${this.WA_BASE_URL}/${cleanPhone}?text=${encodedMessage}`;
    } else {
      // Open WhatsApp without specific contact (user can choose)
      return `${this.WA_BASE_URL}/?text=${encodedMessage}`;
    }
  }

  // Create WhatsApp deep link for web
  private createWhatsAppWebLink(message: string, phoneNumber?: string): string {
    const encodedMessage = encodeURIComponent(message);
    let url = 'https://web.whatsapp.com/send';

    if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        url += `?phone=${cleanPhone}&text=${encodedMessage}`;
    } else {
        url += `?text=${encodedMessage}`;
    }
    return url;
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
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  // Share new bug via WhatsApp
  shareNewBug(data: WhatsAppMessageData, phoneNumber?: string): void {
    const link = this.getShareableLink(data, 'new_bug', phoneNumber);
    this.openWhatsApp(link);
  }

  // Share status update via WhatsApp
  shareStatusUpdate(data: WhatsAppMessageData, phoneNumber?: string): void {
    const link = this.getShareableLink(data, 'status_update', phoneNumber);
    this.openWhatsApp(link);
  }
  
  // Share update details via WhatsApp
  shareUpdateDetails(data: WhatsAppMessageData, phoneNumber?: string): void {
    const link = this.getShareableLink(data, 'update_details', phoneNumber);
    this.openWhatsApp(link);
  }

  // Share to multiple contacts at once
  shareToMultipleContacts(data: WhatsAppMessageData, type: 'new_bug' | 'status_update' | 'update_details', contacts: WhatsAppContact[]): void {
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

  // Get shareable link (for app or copying)
  getShareableLink(data: WhatsAppMessageData, type: 'new_bug' | 'status_update' | 'update_details', phoneNumber?: string): string {
    const message = this.getMessageForType(data, type);
    return this.createWhatsAppLink(message, phoneNumber);
  }

  // Get shareable web link (for opening in browser)
  getWebShareableLink(data: WhatsAppMessageData, type: 'new_bug' | 'status_update' | 'update_details', phoneNumber?: string): string {
    const message = this.getMessageForType(data, type);
    return this.createWhatsAppWebLink(message, phoneNumber);
  }

  // Auto-schedule sharing (opens links at specified intervals)
  scheduleAutoShare(data: WhatsAppMessageData, type: 'new_bug' | 'status_update' | 'update_details', contacts: WhatsAppContact[], intervalMs: number = 2000): void {
    contacts.forEach((contact, index) => {
      setTimeout(() => {
        const link = this.getShareableLink(data, type, contact.phone);
        this.openWhatsApp(link);
      }, index * intervalMs);
    });
  }
}

export const whatsappService = new WhatsAppService();
export type { WhatsAppContact, WhatsAppMessageData };
