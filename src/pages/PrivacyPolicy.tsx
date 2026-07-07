import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'July 2026';

const PrivacyPolicy = () => {
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = 'hidden';
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl pb-12">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Last Updated: {LAST_UPDATED}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 md:p-10">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Company Information</h2>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <p><strong>BugRicer AI Innovations</strong></p>
                  <p>Website: <a href="https://bugricer.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://bugricer.com</a></p>
                  <p>Email: <a href="mailto:info@bugricer.com" className="text-blue-600 dark:text-blue-400 hover:underline">info@bugricer.com</a></p>
                  <p>Phone: <a href="tel:+918086995559" className="text-blue-600 dark:text-blue-400 hover:underline">+91 8086995559</a></p>
                  <p>Address: Malappuram, Kerala, India</p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Information We Collect</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Account Information:</strong> Username, email address, phone number, role (admin, developer, tester), and custom role assignments</li>
                  <li><strong>Authentication Data:</strong> Passwords (encrypted), OTP verification codes, JWT tokens, magic-link login events, and active session records</li>
                  <li><strong>Project & Bug Data:</strong> Bug reports, fixes, priorities, statuses, project details, compliance checklists, project phase data, and per-project progress notes</li>
                  <li><strong>Work & Attendance Data:</strong> Daily check-in and checkout times, work submissions, logged tasks, hours worked, overtime (OT) requests, approval status, and project-level checkout updates</li>
                  <li><strong>Task Data:</strong> Personal tasks, shared team tasks, assignments, due dates, and time-tracking fields</li>
                  <li><strong>Documentation Data:</strong> BugDocs entries, BugSheets content, and related attachments</li>
                  <li><strong>Media Content:</strong> Screenshots, file attachments, voice notes, and meeting recordings</li>
                  <li><strong>Communication Data:</strong> In-app messages, email notifications, WhatsApp messages, and announcement broadcasts</li>
                  <li><strong>Meeting Data:</strong> Video/audio streams, meeting recordings, and participant information (BugMeet)</li>
                  <li><strong>Activity & Audit Logs:</strong> User actions across bugs, tasks, projects, users, settings, backups, and compliance — including actor, target entity, timestamps, and metadata</li>
                  <li><strong>Backup & Export Data:</strong> Backup job history, delivery email addresses, archive scope selections (database, uploads, configuration), file sizes, and job status</li>
                  <li><strong>Settings & Governance Data:</strong> Announcement content, role permissions, notification preferences, and platform configuration changes</li>
                  <li><strong>Translation Requests:</strong> Text you select and submit for Malayalam translation via our in-app context menu (processed through a third-party translation API)</li>
                  <li><strong>Device Information:</strong> IP addresses, browser details, device identifiers, and clipboard interactions initiated through platform features</li>
                  <li><strong>Notification Preferences:</strong> FCM tokens, notification settings, and communication preferences</li>
                  <li><strong>Usage Analytics:</strong> Platform usage patterns, feature interactions, and performance data</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">How We Use Your Information</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Service Provision:</strong> Operate bug tracking, project management, work updates, tasks, documentation, messaging, and collaboration tools</li>
                  <li><strong>Authentication & Security:</strong> Verify identity, manage sessions, enforce role-based and custom permission access, and protect communications</li>
                  <li><strong>Work Management:</strong> Record attendance, process check-in/checkout workflows, calculate hours, and store project progress submissions</li>
                  <li><strong>Compliance & Governance:</strong> Track project compliance rules, verification status, and phase requirements (CODO compliance)</li>
                  <li><strong>Real-time Communication:</strong> Enable messaging, video meetings, announcements, and notifications</li>
                  <li><strong>File & Backup Services:</strong> Process uploads, generate platform backups (BugBackup), and deliver archives to authorized administrators via email</li>
                  <li><strong>Activity & Audit:</strong> Maintain accurate activity histories for accountability, troubleshooting, and security review</li>
                  <li><strong>Translation Feature:</strong> Send selected text to a third-party translation provider when you explicitly request Malayalam translation</li>
                  <li><strong>Platform Improvement:</strong> Analyze usage to enhance features, reliability, and user experience</li>
                  <li><strong>Support & Legal Compliance:</strong> Respond to support requests and meet applicable legal obligations</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Data Sharing and Disclosure</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Authorized Team Members:</strong> Project data, bugs, work submissions, and messages are visible to users with appropriate roles and permissions</li>
                  <li><strong>Administrators:</strong> Admins may access activity logs, backup tools, user management, roles, announcements, and compliance records within their organization</li>
                  <li><strong>Communication Providers:</strong> Email, WhatsApp, and push notification services used to deliver platform alerts</li>
                  <li><strong>Translation Provider:</strong> Selected text submitted for translation is sent to MyMemory (or equivalent third-party translation API) solely to return translated content</li>
                  <li><strong>Cloud & Hosting Infrastructure:</strong> Data stored on servers and services that operate the platform</li>
                  <li><strong>Legal Requirements:</strong> Disclosure when required by law, regulation, or valid legal process</li>
                  <li><strong>Security Incidents:</strong> Information may be shared to protect users, the platform, or public safety</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">BugBackup & Data Exports</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-2">
                  Authorized administrators may create platform backups that can include database dumps, uploaded files, and configuration snapshots. Backup archives may be sent to a designated email address and contain sensitive organizational data.
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li>Backup job metadata (status, scope, size, timestamps) is stored in platform audit logs</li>
                  <li>Recipients are responsible for securing downloaded archives and limiting distribution</li>
                  <li>Backups should be stored encrypted and deleted when no longer required</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Data Security Measures</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Encryption:</strong> Data in transit protected using SSL/TLS</li>
                  <li><strong>Secure Storage:</strong> Databases and files protected with industry-standard safeguards</li>
                  <li><strong>Access Controls:</strong> Role-based and custom permission models limit feature and data access</li>
                  <li><strong>Activity Monitoring:</strong> Audit trails help detect unauthorized or unusual activity</li>
                  <li><strong>Backup Systems:</strong> Administrative backup tools with job logging and secure delivery practices</li>
                  <li><strong>Incident Response:</strong> Procedures for investigating and responding to security events</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Your Rights and Choices</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Access:</strong> Request access to your personal and account data</li>
                  <li><strong>Correction:</strong> Update inaccurate profile or work-related information where editable</li>
                  <li><strong>Deletion:</strong> Request account deletion subject to organizational and legal retention needs</li>
                  <li><strong>Portability:</strong> Request data export in a machine-readable format where applicable</li>
                  <li><strong>Notification Controls:</strong> Manage email, WhatsApp, and in-app notification preferences</li>
                  <li><strong>Translation Opt-out:</strong> Simply do not use the translation feature; no text is sent for translation unless you initiate it</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Data Retention</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  We retain data while your account is active and as needed to provide services. Work submissions, activity logs, compliance records, and backup job history may be retained for extended periods for audit, payroll, and operational purposes. Administrators control organizational retention through platform policies. You may request deletion subject to legal and contractual requirements.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">International Data Transfers</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  Your data may be processed on servers located outside your country of residence, including by third-party providers used for email, translation, and hosting. We apply reasonable safeguards for cross-border processing consistent with applicable law.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Contact Us</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-3">
                  For privacy questions, data access requests, or concerns about new features such as BugBackup, activity logging, or translation services:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li>Website: <a href="https://bugricer.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://bugricer.com</a></li>
                  <li>Email: <a href="mailto:info@bugricer.com" className="text-blue-600 dark:text-blue-400 hover:underline">info@bugricer.com</a></li>
                  <li>Phone: <a href="tel:+918086995559" className="text-blue-600 dark:text-blue-400 hover:underline">+91 8086995559</a></li>
                  <li>Address: Malappuram, Kerala, India</li>
                </ul>
                <p className="text-slate-700 dark:text-slate-300 mt-3">
                  We aim to respond to privacy inquiries within 30 days of receipt.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 justify-between items-center">
            <Link to="/login">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Button>
            </Link>
            <Link to="/terms-of-use">
              <Button variant="ghost" className="text-blue-600 dark:text-blue-400">
                View Terms of Use
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
