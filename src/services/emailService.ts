import { ENV } from "@/lib/env";
import { notificationService } from "./notificationService";

// Helper function to get role-neutral URL for sharing
const getRoleBasedUrl = (path: string, role?: string): string => {
  // For sharing, we want role-neutral URLs that work for all users
  // The route handler will redirect to the appropriate role-based URL
  return `${window.location.origin}${path}`;
};

// Helper function to generate personalized email content for each recipient
const generatePersonalizedEmailContent = (template: string, recipientRole: string, bugLink: string): string => {
  return template.replace(/\${bugLink}/g, bugLink);
};

export const sendEmailNotification = async (
  to: string[],
  subject: string,
  body: string,
  attachments: string[] = []
) => {
  try {
    // Check if user email notifications are enabled (per-user setting)
    const settings = notificationService.getSettings();
    if (!settings.emailNotifications) {
      return { success: true, message: 'User email notifications disabled' };
    }

    const token = localStorage.getItem("token");
    if (!token) {
        return { success: false, message: 'User is not authenticated.' };
    }

    // Ensure correct API URL path
    const apiUrl = `${ENV.API_URL}/send-bug-notification.php`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ to, subject, body, attachments }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send notification' };
  }
};

// Fetch tester emails from the backend
// const res = await fetch(`${ENV.API_URL}/get_all_testers.php`);
// const data = await res.json();
// const testerEmails = data.emails; // This should be an array of emails

// Define 'description' and 'name' before using them
// const name = data.name || "Unknown Bug";
// const description = data.description || "No description provided.";

// Define currentUser or get it from your authentication/user context
// const currentUser = { name: "Bug Ricer" }; // Replace this with actual user fetching logic

// await sendEmailNotification(
//   testerEmails,
//   `New Bug Reported: ${name}`,
//   `<b>${name}</b><br/>${description}<br/><br/>Reported by: ${currentUser?.name || "Bug Ricer"}`,
//   data.attachments || []
// );

// Add this function to get all notification recipients with role information
export const getNotificationRecipients = async (projectId: string): Promise<Array<{email: string, role: string}>> => {
  if (!projectId) {
    return [];
  }
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      // Not a fatal error, just means user is not logged in.
      // The backend will handle the auth check.
      return [];
    }

    const res = await fetch(`${ENV.API_URL}/projects/get_notification_recipients.php?project_id=${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch recipients: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    const data = await res.json();

    if (data.success && Array.isArray(data.recipients)) {
        return data.recipients;
    }

    return [];
  } catch (error) {
    return [];
  }
};

// Add function to send bug status update notification
export const sendBugStatusUpdateNotification = async (bug: any) => {
  try {
    // Check if email notifications are enabled
    const settings = notificationService.getSettings();
    if (!settings.statusChangeNotifications) {
      return { success: true, message: 'Email notifications disabled' };
    }

    let emailResult = { success: true, message: 'Email notifications disabled' };
    let browserResult = false;

    // Send email notification if enabled
    if (settings.statusChangeNotifications) {
      const recipients = await getNotificationRecipients(bug.project_id);

      if (recipients.length > 0) {
        // Extract just the emails for the API call
        const recipientEmails = recipients.map(r => r.email);
        
        // Generate personalized content for each recipient
        const personalizedBodies = recipients.map(recipient => {
          const bugLink = getRoleBasedUrl(`/bugs/${bug.id}`, recipient.role);
          return generatePersonalizedEmailContent(`
          <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background-color: #65a30d; color: #ffffff; padding: 20px; text-align: center;">
                 <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
                  <img src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f41e/32.png" alt="Bug Ricer Logo" style="width: 30px; height: 30px; margin-right: 10px; vertical-align: middle;">
                  BugRicer Alert
                </h1>
                <p style="margin: 5px 0 0 0; font-size: 16px;">Bug Fixed</p>
              </div>
              
              <!-- Body -->
              <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">${bug.title}</h3>
                <p style="white-space: pre-line; margin-bottom: 15px; font-size: 14px;">${bug.description || "No description provided."}</p>
                
                ${bug.expected_result ? `
                <div style="margin-bottom: 15px; padding: 12px; background-color: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #0c4a6e;"><strong>✅ Expected Result:</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #0c4a6e; white-space: pre-line;">${bug.expected_result}</p>
                </div>
                ` : ''}
                
                ${bug.actual_result ? `
                <div style="margin-bottom: 15px; padding: 12px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;"><strong>❌ Actual Result:</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #991b1b; white-space: pre-line;">${bug.actual_result}</p>
                </div>
                ` : ''}
                
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Previous Status:</strong> <span style="font-weight: normal; text-transform: capitalize;">Pending</span></p>
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>New Status:</strong> <span style="font-weight: normal; text-transform: capitalize; color: #65a30d;">Fixed</span></p>
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Priority:</strong> <span style="font-weight: normal; text-transform: capitalize;">${bug.priority}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Updated On:</strong> <span style="font-weight: normal;">${new Date().toLocaleString()}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Updated By:</strong> <span style="font-weight: normal;">${bug.updated_by_name || 'Bug Ricer User'}</span></p>
                <p style="margin-top: 18px; text-align: center;">
                  <a href="${bugLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 500; font-size: 16px;">View Bug Details</a>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; color: #64748b; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated notification from Bug Ricer. Please do not reply to this email.</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Bug Ricer. All rights reserved.</p>
              </div>
              
            </div>
          </div>
          `, recipient.role, bugLink);
        });

        // Use the first personalized body for the email (since we can't send different bodies to different recipients in one call)
        // In a more sophisticated system, you might want to send individual emails
        emailResult = await sendEmailNotification(
          recipientEmails,
          `[${bug.project_name || 'BugRicer'}] Bug Fixed: ${bug.title}`,
          personalizedBodies[0]
        );
      } else {
        emailResult = { success: false, message: "No recipients found" };
      }
    }

    // Send browser notification if enabled
    if (settings.browserNotifications && settings.statusChangeNotifications) {
      browserResult = await notificationService.sendBugStatusNotification(bug.title, bug.status);
    }

    return {
      success: emailResult.success || browserResult,
      message: emailResult.message,
      emailSent: emailResult.success,
      browserNotificationSent: browserResult
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send notification' };
  }
};

// Define a sample bug object or fetch it from your data source
// const bug = {
//   title: "Sample Bug",
//   description: "This is a sample bug description.",
//   priority: "High",
//   status: "Fixed",
//   updated_by_name: currentUser?.name || "Bug Ricer"
// };

// await sendBugStatusUpdateNotification({
//   ...bug,
//   status: bug.status,
//   updated_by_name: currentUser?.name || "Bug Ricer" // Include updater name
// });

// Add function to send new bug notification
export const sendNewBugNotification = async (bug: any) => {
  try {
    // Check if email notifications are enabled
    const settings = notificationService.getSettings();
    if (!settings.newBugNotifications) {
      return { success: true, message: 'User new bug notifications disabled' };
    }

    let emailResult = { success: true, message: 'Email notifications disabled' };
    let browserResult = false;

    // Send email notification if enabled
    if (settings.newBugNotifications) {
      const recipients = await getNotificationRecipients(bug.project_id);

      if (recipients.length > 0) {
        // Extract just the emails for the API call
        const recipientEmails = recipients.map(r => r.email);
        
        // Generate personalized content for each recipient
        const personalizedBodies = recipients.map(recipient => {
          const bugLink = getRoleBasedUrl(`/bugs/${bug.id}`, recipient.role);
          return generatePersonalizedEmailContent(`
          <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background-color: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
                 <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
                  <img src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f41e/32.png" alt="Bug Ricer Logo" style="width: 30px; height: 30px; margin-right: 10px; vertical-align: middle;">
                  BugRicer Alert
                </h1>
                <p style="margin: 5px 0 0 0; font-size: 16px;">New Bug Reported</p>
              </div>
              
              <!-- Body -->
              <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">${bug.title}</h3>
                <p style="white-space: pre-line; margin-bottom: 15px; font-size: 14px;">${bug.description || "No description provided."}</p>
                
                ${bug.expected_result ? `
                <div style="margin-bottom: 15px; padding: 12px; background-color: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #0c4a6e;"><strong>✅ Expected Result:</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #0c4a6e; white-space: pre-line;">${bug.expected_result}</p>
                </div>
                ` : ''}
                
                ${bug.actual_result ? `
                <div style="margin-bottom: 15px; padding: 12px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;"><strong>❌ Actual Result:</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #991b1b; white-space: pre-line;">${bug.actual_result}</p>
                </div>
                ` : ''}
                
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Status:</strong> <span style="font-weight: normal; text-transform: capitalize; color: #dc2626;">Pending</span></p>
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Priority:</strong> <span style="font-weight: normal; text-transform: capitalize;">${bug.priority}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Reported On:</strong> <span style="font-weight: normal;">${new Date().toLocaleString()}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Reported By:</strong> <span style="font-weight: normal;">${bug.reported_by_name || 'Bug Ricer User'}</span></p>
                <p style="margin-top: 18px; text-align: center;">
                  <a href="${bugLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 500; font-size: 16px;">View Bug Details</a>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; color: #64748b; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated notification from Bug Ricer. Please do not reply to this email.</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Bug Ricer. All rights reserved.</p>
              </div>
              
            </div>
          </div>
          `, recipient.role, bugLink);
        });

        emailResult = await sendEmailNotification(
          recipientEmails,
          `[${bug.project_name || 'BugRicer'}] New Bug Reported: ${bug.title}`,
          personalizedBodies[0],
          bug.attachments || []
        );
      } else {
        emailResult = { success: false, message: "No recipients found" };
      }
    }

    // Send browser notification if enabled
    if (settings.browserNotifications && settings.newBugNotifications) {
      browserResult = await notificationService.sendNewBugNotification(bug.title);
    }

    return {
      success: emailResult.success || browserResult,
      message: emailResult.message,
      emailSent: emailResult.success,
      browserNotificationSent: browserResult
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send notification' };
  }
};

// Add function to send general bug notification (for other status changes)
export const sendBugNotification = async (bug: any, subject: string, statusChange?: { from: string, to: string }) => {
  try {
    // Check if email notifications are enabled
    const settings = notificationService.getSettings();
    if (!settings.statusChangeNotifications) {
      return { success: true, message: 'Email notifications disabled' };
    }

    let emailResult = { success: true, message: 'Email notifications disabled' };
    let browserResult = false;

    // Send email notification if enabled
    if (settings.statusChangeNotifications) {
      const recipients = await getNotificationRecipients(bug.project_id);

      if (recipients.length > 0) {
        // Extract just the emails for the API call
        const recipientEmails = recipients.map(r => r.email);
        
        const statusChangeContent = statusChange ? `
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Previous Status:</strong> <span style="font-weight: normal; text-transform: capitalize;">${statusChange.from}</span></p>
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>New Status:</strong> <span style="font-weight: normal; text-transform: capitalize;">${statusChange.to}</span></p>
        ` : `
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Status:</strong> <span style="font-weight: normal; text-transform: capitalize;">${bug.status}</span></p>
        `;

        // Generate personalized content for each recipient
        const personalizedBodies = recipients.map(recipient => {
          const bugLink = getRoleBasedUrl(`/bugs/${bug.id}`, recipient.role);
          return generatePersonalizedEmailContent(`
          <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
                 <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
                  <img src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f41e/32.png" alt="Bug Ricer Logo" style="width: 30px; height: 30px; margin-right: 10px; vertical-align: middle;">
                  BugRicer Alert
                </h1>
                <p style="margin: 5px 0 0 0; font-size: 16px;">Bug Update</p>
              </div>
              
              <!-- Body -->
              <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">${bug.title}</h3>
                <p style="white-space: pre-line; margin-bottom: 15px; font-size: 14px;">${bug.description || "No description provided."}</p>
                
                ${bug.expected_result ? `
                <div style="margin-bottom: 15px; padding: 12px; background-color: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #0c4a6e;"><strong>✅ Expected Result:</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #0c4a6e; white-space: pre-line;">${bug.expected_result}</p>
                </div>
                ` : ''}
                
                ${bug.actual_result ? `
                <div style="margin-bottom: 15px; padding: 12px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;"><strong>❌ Actual Result:</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #991b1b; white-space: pre-line;">${bug.actual_result}</p>
                </div>
                ` : ''}
                
                ${statusChangeContent}
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Priority:</strong> <span style="font-weight: normal; text-transform: capitalize;">${bug.priority}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Updated On:</strong> <span style="font-weight: normal;">${new Date().toLocaleString()}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Updated By:</strong> <span style="font-weight: normal;">${bug.updated_by_name || 'Bug Ricer User'}</span></p>
                <p style="margin-top: 18px; text-align: center;">
                  <a href="${bugLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 500; font-size: 16px;">View Bug Details</a>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; color: #64748b; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated notification from Bug Ricer. Please do not reply to this email.</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Bug Ricer. All rights reserved.</p>
              </div>
              
            </div>
          </div>
          `, recipient.role, bugLink);
        });

        emailResult = await sendEmailNotification(
          recipientEmails,
          `[${bug.project_name || 'BugRicer'}] ${subject}`,
          personalizedBodies[0]
        );
      } else {
        emailResult = { success: false, message: "No recipients found" };
      }
    }

    // Send browser notification if enabled
    if (settings.browserNotifications && settings.statusChangeNotifications) {
      const statusText = statusChange ? statusChange.to : bug.status;
      browserResult = await notificationService.sendBugStatusNotification(bug.title, statusText);
    }

    return {
      success: emailResult.success || browserResult,
      message: emailResult.message,
      emailSent: emailResult.success,
      browserNotificationSent: browserResult
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send notification' };
  }
};

export const sendNewUpdateNotification = async (update: any) => {
  try {
    // Check if email notifications are enabled
    const settings = notificationService.getSettings();
    if (!settings.emailNotifications) {
      return { success: true, message: 'User email notifications disabled' };
    }

    let emailResult = { success: true, message: 'Email notifications disabled' };
    let browserResult = false;

    // Send email notification if enabled
    if (settings.emailNotifications) {
      const recipients = await getNotificationRecipients(update.project_id);

      if (recipients.length > 0) {
        // Extract just the emails for the API call
        const recipientEmails = recipients.map(r => r.email);
        
        // Generate personalized content for each recipient
        const personalizedBodies = recipients.map(recipient => {
          const updateLink = getRoleBasedUrl(`/updates/${update.id}`, recipient.role);
          return generatePersonalizedEmailContent(`
          <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">BugRicer Update</h1>
                <p style="margin: 5px 0 0 0; font-size: 16px;">New Update Posted</p>
              </div>
              <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">${update.title}</h3>
                <p style="white-space: pre-line; margin-bottom: 15px; font-size: 14px;">${update.description || "No description provided."}</p>
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Type:</strong> <span style="font-weight: normal; text-transform: capitalize;">${update.type}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Created On:</strong> <span style="font-weight: normal;">${new Date(update.created_at).toLocaleString()}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Created By:</strong> <span style="font-weight: normal;">${update.created_by || 'Bug Ricer User'}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Project:</strong> <span style="font-weight: normal;">${update.project_name || 'BugRicer Project'}</span></p>
                <p style="margin-top: 18px; text-align: center;">
                  <a href="${updateLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 500; font-size: 16px;">View Update Details</a>
                </p>
              </div>
              <div style="background-color: #f8fafc; color: #64748b; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated notification from Bug Ricer. Please do not reply to this email.</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Bug Ricer. All rights reserved.</p>
              </div>
            </div>
          </div>
          `, recipient.role, updateLink);
        });

        emailResult = await sendEmailNotification(
          recipientEmails,
          `[${update.project_name || 'BugRicer'}] New Update: ${update.title}`,
          personalizedBodies[0]
        );
      } else {
        emailResult = { success: false, message: "No recipients found" };
      }
    }

    // Optionally, send browser notification if you want
    // if (settings.browserNotifications) { ... }

    return {
      success: emailResult.success,
      message: emailResult.message,
      emailSent: emailResult.success
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send notification' };
  }
};

// Add function to check global email enabled
export const isGlobalEmailEnabled = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${ENV.API_URL}/settings/get.php`);
    const data = await res.json();
    return !!data.data?.email_notifications_enabled;
  } catch {
    return true; // fallback to enabled
  }
};