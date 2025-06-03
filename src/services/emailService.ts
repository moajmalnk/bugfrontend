import { ENV } from "@/lib/env";
import { notificationService } from "./notificationService";

export const sendEmailNotification = async (
  to: string[],
  subject: string,
  body: string,
  attachments: string[] = []
) => {
  try {
    // Check if email notifications are enabled
    const settings = notificationService.getSettings();
    if (!settings.emailNotifications) {
      console.log("Email notifications are disabled, skipping email");
      return { success: true, message: 'Email notifications disabled' };
    }

    // Ensure correct API URL path
    const apiUrl = `${ENV.API_URL}/send-bug-notification.php`;
    // // console.log("Sending email notification:");
    // // console.log("- API URL:", apiUrl);
    // // console.log("- Recipients:", to);
    // // console.log("- Subject:", subject);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ to, subject, body, attachments }),
    });
    
    // // console.log("Response status:", response.status);
    // // console.log("Response headers:", response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      // // console.error("Email API error response:", errorText);
      throw new Error(`HTTP error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    // // console.log("Email API success response:", data);
    return data;
  } catch (error) {
    // // console.error("Email notification error:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send email' };
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

// Add this function to get all notification recipients
export const getNotificationRecipients = async (): Promise<string[]> => {
  try {
    // Fetch admin emails
    const adminResponse = await fetch(`${ENV.API_URL}/get_all_admins.php`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const adminData = await adminResponse.json();
    const adminEmails = adminData.success ? adminData.emails : [];
    
    // Fetch developer emails
    const devResponse = await fetch(`${ENV.API_URL}/get_all_developers.php`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const devData = await devResponse.json();
    const devEmails = devData.success ? devData.emails : [];
    
    // Combine both arrays of emails
    const allRecipients = [...adminEmails, ...devEmails];
    
    // Remove duplicates in case someone is both admin and developer
    return [...new Set(allRecipients)];
  } catch (error) {
    // // console.error("Error fetching notification recipients:", error);
    return []; // Return empty array on error
  }
};

// Add this function to get tester and admin recipients
export const getBugStatusUpdateRecipients = async (): Promise<string[]> => {
  try {
    // Fetch admin emails
    const adminResponse = await fetch(`${ENV.API_URL}/get_all_admins.php`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const adminData = await adminResponse.json();
    const adminEmails = adminData.success ? adminData.emails : [];
    
    // Fetch tester emails
    const testerResponse = await fetch(`${ENV.API_URL}/get_all_testers.php`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const testerData = await testerResponse.json();
    const testerEmails = testerData.success ? testerData.emails : [];
    
    // Combine both arrays of emails
    const allRecipients = [...adminEmails, ...testerEmails];
    
    // Remove duplicates
    return [...new Set(allRecipients)];
  } catch (error) {
    // // console.error("Error fetching notification recipients:", error);
    return []; // Return empty array on error
  }
};

// Add function to send bug status update notification
export const sendBugStatusUpdateNotification = async (bug: any) => {
  try {
    // Check if email notifications are enabled
    const settings = notificationService.getSettings();
    
    let emailResult = { success: true, message: 'Email notifications disabled' };
    let browserResult = false;
    
    // Send email notification if enabled
    if (settings.emailNotifications && settings.statusChangeNotifications) {
      const recipients = await getBugStatusUpdateRecipients();
      
      if (recipients.length > 0) {
        emailResult = await sendEmailNotification(
          recipients,
          `Bug Fixed: ${bug.title}`,
          `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background-color: #65a30d; color: #ffffff; padding: 20px; text-align: center;">
                 <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
                  <img src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f41e/32.png" alt="Bug Ricer Logo" style="width: 30px; height: 30px; margin-right: 10px; vertical-align: middle;">
                  BugRacer Alert
                </h1>
                <p style="margin: 5px 0 0 0; font-size: 16px;">Bug Fixed</p>
              </div>
              
              <!-- Body -->
              <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">${bug.title}</h3>
                <p style="white-space: pre-line; margin-bottom: 15px; font-size: 14px;">${bug.description || "No description provided."}</p>
                
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Previous Status:</strong> <span style="font-weight: normal; text-transform: capitalize;">Pending</span></p>
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>New Status:</strong> <span style="font-weight: normal; text-transform: capitalize; color: #65a30d;">Fixed</span></p>
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Priority:</strong> <span style="font-weight: normal; text-transform: capitalize;">${bug.priority}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Updated On:</strong> <span style="font-weight: normal;">${new Date().toLocaleString()}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Updated By:</strong> <span style="font-weight: normal;">${bug.updated_by_name || 'Bug Ricer User'}</span></p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; color: #64748b; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated notification from Bug Ricer. Please do not reply to this email.</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Bug Ricer. All rights reserved.</p>
              </div>
              
            </div>
          </div>
          `
        );
      } else {
        emailResult = { success: false, message: "No recipients found" };
      }
    } else {
      console.log("Email notifications or status change notifications are disabled, skipping email");
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
    // // console.error("Error sending bug status update notification:", error);
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
    
    let emailResult = { success: true, message: 'Email notifications disabled' };
    let browserResult = false;
    
    // Send email notification if enabled
    if (settings.emailNotifications && settings.newBugNotifications) {
      const recipients = await getNotificationRecipients();
      
      if (recipients.length > 0) {
        emailResult = await sendEmailNotification(
          recipients,
          `New Bug Reported: ${bug.title}`,
          `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background-color: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
                 <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
                  <img src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f41e/32.png" alt="Bug Ricer Logo" style="width: 30px; height: 30px; margin-right: 10px; vertical-align: middle;">
                  BugRacer Alert
                </h1>
                <p style="margin: 5px 0 0 0; font-size: 16px;">New Bug Reported</p>
              </div>
              
              <!-- Body -->
              <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">${bug.title}</h3>
                <p style="white-space: pre-line; margin-bottom: 15px; font-size: 14px;">${bug.description || "No description provided."}</p>
                
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Status:</strong> <span style="font-weight: normal; text-transform: capitalize; color: #dc2626;">Pending</span></p>
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Priority:</strong> <span style="font-weight: normal; text-transform: capitalize;">${bug.priority}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Reported On:</strong> <span style="font-weight: normal;">${new Date().toLocaleString()}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Reported By:</strong> <span style="font-weight: normal;">${bug.reported_by_name || 'Bug Ricer User'}</span></p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; color: #64748b; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated notification from Bug Ricer. Please do not reply to this email.</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Bug Ricer. All rights reserved.</p>
              </div>
              
            </div>
          </div>
          `,
          bug.attachments || []
        );
      } else {
        emailResult = { success: false, message: "No recipients found" };
      }
    } else {
      console.log("Email notifications or new bug notifications are disabled, skipping email");
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
    console.error("Error sending new bug notification:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send notification' };
  }
};

// Add function to send general bug notification (for other status changes)
export const sendBugNotification = async (bug: any, subject: string, statusChange?: { from: string, to: string }) => {
  try {
    // Check if email notifications are enabled
    const settings = notificationService.getSettings();
    
    let emailResult = { success: true, message: 'Email notifications disabled' };
    let browserResult = false;
    
    // Send email notification if enabled
    if (settings.emailNotifications && settings.statusChangeNotifications) {
      const recipients = await getBugStatusUpdateRecipients();
      
      if (recipients.length > 0) {
        const statusChangeContent = statusChange ? `
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Previous Status:</strong> <span style="font-weight: normal; text-transform: capitalize;">${statusChange.from}</span></p>
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>New Status:</strong> <span style="font-weight: normal; text-transform: capitalize;">${statusChange.to}</span></p>
        ` : `
          <p style="font-size: 14px; margin-bottom: 5px;"><strong>Status:</strong> <span style="font-weight: normal; text-transform: capitalize;">${bug.status}</span></p>
        `;
        
        emailResult = await sendEmailNotification(
          recipients,
          subject,
          `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
                 <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
                  <img src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f41e/32.png" alt="Bug Ricer Logo" style="width: 30px; height: 30px; margin-right: 10px; vertical-align: middle;">
                  BugRacer Alert
                </h1>
                <p style="margin: 5px 0 0 0; font-size: 16px;">Bug Update</p>
              </div>
              
              <!-- Body -->
              <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">${bug.title}</h3>
                <p style="white-space: pre-line; margin-bottom: 15px; font-size: 14px;">${bug.description || "No description provided."}</p>
                
                ${statusChangeContent}
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Priority:</strong> <span style="font-weight: normal; text-transform: capitalize;">${bug.priority}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Updated On:</strong> <span style="font-weight: normal;">${new Date().toLocaleString()}</span></p>
                <p style="font-size: 14px; margin-bottom: 0;"><strong>Updated By:</strong> <span style="font-weight: normal;">${bug.updated_by_name || 'Bug Ricer User'}</span></p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; color: #64748b; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated notification from Bug Ricer. Please do not reply to this email.</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Bug Ricer. All rights reserved.</p>
              </div>
              
            </div>
          </div>
          `
        );
      } else {
        emailResult = { success: false, message: "No recipients found" };
      }
    } else {
      console.log("Email notifications or status change notifications are disabled, skipping email");
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
    console.error("Error sending bug notification:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send notification' };
  }
};