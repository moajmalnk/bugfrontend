import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  useEffect(() => {
    // Enable body scrolling for this standalone page
    document.body.style.overflow = 'auto';
    return () => {
      // Restore overflow hidden when leaving the page
      document.body.style.overflow = 'hidden';
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/login">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Last Updated: January 2025</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 md:p-10">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="space-y-6">
              {/* Company Information */}
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

              {/* Information We Collect */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Information We Collect</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Account Information:</strong> Username, email address, phone number, role (admin, developer, tester)</li>
                  <li><strong>Authentication Data:</strong> Passwords (encrypted), OTP verification codes, JWT tokens</li>
                  <li><strong>Project Data:</strong> Bug reports, project details, status updates, priority levels</li>
                  <li><strong>Media Content:</strong> Screenshots, file attachments, voice notes, meeting recordings</li>
                  <li><strong>Communication Data:</strong> Chat messages, email notifications, WhatsApp messages</li>
                  <li><strong>Meeting Data:</strong> Video/audio streams, meeting recordings, participant information</li>
                  <li><strong>Activity Logs:</strong> User actions, system interactions, audit trails</li>
                  <li><strong>Device Information:</strong> IP addresses, browser details, device identifiers</li>
                  <li><strong>Notification Preferences:</strong> FCM tokens, notification settings, communication preferences</li>
                  <li><strong>Usage Analytics:</strong> Platform usage patterns, feature interactions, performance data</li>
                </ul>
              </div>

              {/* How We Use Your Information */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">How We Use Your Information</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Service Provision:</strong> Provide bug tracking, project management, and collaboration tools</li>
                  <li><strong>Authentication & Security:</strong> Verify user identity, prevent unauthorized access, secure communications</li>
                  <li><strong>Real-time Communication:</strong> Enable instant messaging, video meetings, and notifications</li>
                  <li><strong>File Management:</strong> Process, store, and deliver uploaded files, screenshots, and voice notes</li>
                  <li><strong>Notification Services:</strong> Send email, WhatsApp, and browser notifications about bug updates</li>
                  <li><strong>Meeting Features:</strong> Facilitate video conferencing, screen sharing, and meeting recordings</li>
                  <li><strong>Activity Tracking:</strong> Monitor user actions for audit purposes and system optimization</li>
                  <li><strong>Platform Improvement:</strong> Analyze usage patterns to enhance user experience and feature development</li>
                  <li><strong>Support Services:</strong> Provide customer support and troubleshoot technical issues</li>
                  <li><strong>Compliance:</strong> Meet legal obligations and maintain service quality standards</li>
                </ul>
              </div>

              {/* Data Sharing and Disclosure */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Data Sharing and Disclosure</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Team Members:</strong> Share project data, bug reports, and updates with authorized team members</li>
                  <li><strong>Communication Services:</strong> Use third-party services for email delivery and WhatsApp messaging</li>
                  <li><strong>Cloud Storage:</strong> Store files and media content on secure cloud infrastructure</li>
                  <li><strong>Legal Requirements:</strong> Disclose information when required by law or legal process</li>
                  <li><strong>Service Providers:</strong> Share data with trusted third-party service providers for platform operations</li>
                  <li><strong>Emergency Situations:</strong> May disclose information to protect user safety or platform security</li>
                </ul>
              </div>

              {/* Data Security Measures */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Data Security Measures</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Encryption:</strong> All data transmission encrypted using SSL/TLS protocols</li>
                  <li><strong>Secure Storage:</strong> Database and file storage protected with industry-standard encryption</li>
                  <li><strong>Access Controls:</strong> Role-based access permissions and authentication requirements</li>
                  <li><strong>Regular Audits:</strong> Periodic security assessments and vulnerability testing</li>
                  <li><strong>Backup Systems:</strong> Regular data backups with secure off-site storage</li>
                  <li><strong>Incident Response:</strong> Comprehensive security incident response procedures</li>
                </ul>
              </div>

              {/* Your Rights and Choices */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Your Rights and Choices</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Access:</strong> Request access to your personal data and account information</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate personal information</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                  <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                  <li><strong>Communication Preferences:</strong> Control notification settings and communication methods</li>
                  <li><strong>Data Retention:</strong> Understand our data retention policies and request data purging</li>
                </ul>
              </div>

              {/* Data Retention */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Data Retention</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  We retain your data for as long as your account is active and as needed to provide our services. Project data, bug reports, and communications may be retained for extended periods for audit and compliance purposes. You may request data deletion at any time, subject to legal and operational requirements.
                </p>
              </div>

              {/* International Data Transfers */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">International Data Transfers</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  Your data may be processed and stored on servers located outside your country of residence. We ensure appropriate safeguards are in place for international data transfers and comply with applicable data protection laws.
                </p>
              </div>

              {/* Contact Us */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Contact Us</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-3">
                  For any privacy-related questions, data access requests, or concerns, please contact us at:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li>Website: <a href="https://bugricer.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://bugricer.com</a></li>
                  <li>Email: <a href="mailto:info@bugricer.com" className="text-blue-600 dark:text-blue-400 hover:underline">info@bugricer.com</a></li>
                  <li>Phone: <a href="tel:+918086995559" className="text-blue-600 dark:text-blue-400 hover:underline">+91 8086995559</a></li>
                  <li>Address: Malappuram, Kerala, India</li>
                </ul>
                <p className="text-slate-700 dark:text-slate-300 mt-3">
                  We will respond to your privacy inquiries within 30 days of receipt.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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

