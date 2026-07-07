import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'July 2026';

const TermsOfUse = () => {
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
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Terms of Use</h1>
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Acceptance of Terms</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  By accessing or using BugRicer (including BugDocs, BugSheets, BugMeet, BugToDo, BugUpdate, BugMessage, Work Update, BugBackup, Activity, compliance tools, and related services), you agree to these Terms of Use and our <Link to="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">User Accounts and Authentication</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Account Creation:</strong> You must provide accurate and complete registration information</li>
                  <li><strong>Authentication:</strong> Username/password, email/password, OTP login, or magic-link sign-in may be offered</li>
                  <li><strong>Account Security:</strong> You are responsible for safeguarding your credentials and active sessions</li>
                  <li><strong>Roles & Permissions:</strong> Access is determined by assigned roles (Admin, Developer, Tester) and any custom roles with granular permissions</li>
                  <li><strong>Account Termination:</strong> We may suspend or terminate accounts that violate these terms or organizational policy</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Platform Features & Acceptable Use</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Bug & Project Management:</strong> Report, track, and resolve bugs; manage projects, fixes, and updates honestly and accurately</li>
                  <li><strong>Work Update:</strong> Submit truthful check-in/checkout records, hours, tasks, and project progress. Falsifying attendance or work data is prohibited</li>
                  <li><strong>Tasks:</strong> Use personal and shared tasks for legitimate work planning; do not assign abusive or unrelated work</li>
                  <li><strong>Documentation:</strong> BugDocs and BugSheets content must be professional and relevant to your organization</li>
                  <li><strong>Compliance (CODO):</strong> Project compliance checklists and phase rules must be completed accurately; emergency bypasses require authorized use only</li>
                  <li><strong>Activity Logs:</strong> Platform actions are recorded for audit purposes; do not attempt to evade or tamper with logging (admins may manage records per policy)</li>
                  <li><strong>Context Menu Tools:</strong> Copy, cut, paste, and translation features must not be used to exfiltrate data you are not authorized to access</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">BugBackup (Administrative Backups)</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Authorized Use Only:</strong> BugBackup is restricted to users with appropriate administrative permissions</li>
                  <li><strong>Confidential Archives:</strong> Backups may contain database contents, uploads, and configuration data — treat all archives as highly confidential</li>
                  <li><strong>Email Delivery:</strong> You are responsible for securing backup files sent to designated email addresses</li>
                  <li><strong>No Guarantee:</strong> Backup jobs run on a best-effort basis; maintain independent disaster-recovery procedures</li>
                  <li><strong>Prohibited:</strong> Sharing backup archives with unauthorized parties or using backups to circumvent access controls</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Announcements & Communications</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Announcements:</strong> Admins may publish role-targeted announcements with optional expiry dates</li>
                  <li><strong>Notifications:</strong> You may receive email, WhatsApp, browser, and in-app notifications based on your settings</li>
                  <li><strong>Messaging:</strong> In-app chat (BugMessage) must be used professionally; harassment or spam is prohibited</li>
                  <li><strong>Meetings:</strong> BugMeet sessions may be recorded with participant awareness; hosts control access</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Translation Services</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  When you select text and request Malayalam translation, the selected content is sent to a third-party translation API. Do not submit passwords, personal data of others, or confidential information unless your organization permits it. Translation results are provided as-is without warranty of accuracy.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">User Responsibilities</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li>Provide truthful account and work-related information</li>
                  <li>Maintain professional conduct in all communications</li>
                  <li>Ensure uploaded content complies with applicable laws and organizational policy</li>
                  <li>Follow security best practices and report suspected breaches promptly</li>
                  <li>Use platform resources responsibly without abuse or overload</li>
                  <li>Respect intellectual property and confidentiality obligations</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Prohibited Activities</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li>Unauthorized access to accounts, projects, backups, or admin tools</li>
                  <li>Uploading malware, or sharing offensive, discriminatory, or illegal content</li>
                  <li>Scraping, mining, or bulk-exporting data without authorization</li>
                  <li>Falsifying bugs, work hours, compliance checks, or activity records</li>
                  <li>Interfering with platform operation, backups, or audit systems</li>
                  <li>Sharing backup archives, credentials, or private organizational data externally without permission</li>
                  <li>Commercial use of the platform outside your licensed organizational scope</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Content and Data Ownership</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>User Content:</strong> You retain ownership of content you create; you grant BugRicer a license to host and process it to provide the service</li>
                  <li><strong>Organizational Data:</strong> Bugs, projects, work submissions, docs, and messages belong to your organization per your internal agreements</li>
                  <li><strong>Backups:</strong> Backup archives remain your organization&apos;s responsibility once generated or delivered</li>
                  <li><strong>Export:</strong> Data export may be available through admin tools or upon request where applicable</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Service Availability and Limitations</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li>We strive for high availability but do not guarantee uninterrupted service</li>
                  <li>Maintenance, updates, and background jobs (including backups) may temporarily affect performance</li>
                  <li>File size limits, storage quotas, and rate limits may apply</li>
                  <li>Modern browsers with JavaScript enabled are required; some mobile features may be limited</li>
                  <li>Third-party services (email, WhatsApp, translation APIs) are subject to their own availability</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Privacy and Data Protection</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  Your use of Work Update, Activity logging, BugBackup, compliance tools, translation, and other features is also governed by our <Link to="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>, which describes what we collect and how we use it.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Intellectual Property Rights</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li>BugRicer software, branding, and platform design are our intellectual property</li>
                  <li>You retain rights to your content subject to the license needed to operate the service</li>
                  <li>Do not copy, reverse engineer, or redistribute the platform without permission</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Limitation of Liability</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  BugRicer AI Innovations is not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the platform, including data loss, inaccurate translations, failed backups, work-submission disputes, or business interruption. Total liability is limited to fees paid in the twelve months preceding a claim, where applicable.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Indemnification</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  You agree to indemnify BugRicer AI Innovations against claims arising from your use of the service, violation of these terms, misuse of admin or backup features, or infringement of third-party rights.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Termination</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li>You may request account termination through your organization or administrator</li>
                  <li>We may suspend access for violations, security risks, or non-payment where applicable</li>
                  <li>Activity logs, work records, and backups may be retained per policy and legal requirements</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Modifications to Terms</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  We may update these terms when we add or change platform features. Updates take effect when posted. Continued use after changes constitutes acceptance.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Governing Law and Dispute Resolution</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  These terms are governed by the laws of India. Disputes shall be resolved through binding arbitration in accordance with applicable Indian arbitration laws, unless otherwise required by mandatory law.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Contact Information</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-3">
                  For questions about these terms or platform features:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li>Website: <a href="https://bugricer.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://bugricer.com</a></li>
                  <li>Email: <a href="mailto:info@bugricer.com" className="text-blue-600 dark:text-blue-400 hover:underline">info@bugricer.com</a></li>
                  <li>Phone: <a href="tel:+918086995559" className="text-blue-600 dark:text-blue-400 hover:underline">+91 8086995559</a></li>
                  <li>Address: Malappuram, Kerala, India</li>
                </ul>
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
            <Link to="/privacy-policy">
              <Button variant="ghost" className="text-blue-600 dark:text-blue-400">
                View Privacy Policy
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
