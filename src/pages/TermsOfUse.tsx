import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft } from 'lucide-react';

const TermsOfUse = () => {
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
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Terms of Use</h1>
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

              {/* User Accounts and Authentication */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">User Accounts and Authentication</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Account Creation:</strong> You must provide accurate and complete information during registration</li>
                  <li><strong>Authentication Methods:</strong> Username/password, email/password, or OTP-based login via email/WhatsApp</li>
                  <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your credentials</li>
                  <li><strong>Role Assignment:</strong> User roles (Admin, Developer, Tester) determine access permissions</li>
                  <li><strong>Account Termination:</strong> We reserve the right to suspend or terminate accounts for violations</li>
                </ul>
              </div>

              {/* User Responsibilities */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">User Responsibilities</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Accurate Information:</strong> Provide truthful and up-to-date account information</li>
                  <li><strong>Professional Conduct:</strong> Maintain respectful and professional communication with team members</li>
                  <li><strong>Content Responsibility:</strong> Ensure all uploaded files and messages comply with applicable laws</li>
                  <li><strong>Security Compliance:</strong> Follow security best practices and report security concerns</li>
                  <li><strong>Resource Usage:</strong> Use platform resources responsibly and avoid system abuse</li>
                  <li><strong>Intellectual Property:</strong> Respect intellectual property rights of others</li>
                  <li><strong>Legal Compliance:</strong> Use the service in compliance with all applicable laws and regulations</li>
                </ul>
              </div>

              {/* Prohibited Activities */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Prohibited Activities</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Unauthorized Access:</strong> Attempting to access other users' accounts or restricted areas</li>
                  <li><strong>Malicious Content:</strong> Uploading viruses, malware, or other harmful files</li>
                  <li><strong>Inappropriate Content:</strong> Sharing offensive, discriminatory, or inappropriate material</li>
                  <li><strong>System Interference:</strong> Attempting to disrupt, damage, or overload our services</li>
                  <li><strong>Data Violations:</strong> Unauthorized data scraping, mining, or extraction</li>
                  <li><strong>Privacy Breaches:</strong> Sharing or misusing other users' personal information</li>
                  <li><strong>Commercial Use:</strong> Using the platform for unauthorized commercial purposes</li>
                  <li><strong>False Reporting:</strong> Creating false bug reports or misleading information</li>
                </ul>
              </div>

              {/* Content and Data Ownership */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Content and Data Ownership</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>User Content:</strong> You retain ownership of content you upload but grant us usage rights</li>
                  <li><strong>Platform Data:</strong> Bug reports, project data, and communications belong to your organization</li>
                  <li><strong>Meeting Recordings:</strong> Video/audio recordings are stored securely and accessible to authorized users</li>
                  <li><strong>File Storage:</strong> Uploaded files are stored securely and accessible based on user permissions</li>
                  <li><strong>Data Export:</strong> You may export your data in standard formats upon request</li>
                </ul>
              </div>

              {/* Communication and Notification Services */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Communication and Notification Services</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Email Notifications:</strong> You may receive email updates about bug status changes and project activities</li>
                  <li><strong>WhatsApp Messages:</strong> Optional WhatsApp notifications for important updates</li>
                  <li><strong>Browser Notifications:</strong> Real-time browser notifications for immediate updates</li>
                  <li><strong>In-app Messaging:</strong> Internal chat system for team communication</li>
                  <li><strong>Communication Preferences:</strong> You can customize notification settings in your account</li>
                </ul>
              </div>

              {/* Video Conferencing and Meetings */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Video Conferencing and Meetings</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Meeting Features:</strong> Video calls, screen sharing, meeting recordings, and participant management</li>
                  <li><strong>Recording Consent:</strong> Participants are notified when meetings are being recorded</li>
                  <li><strong>Meeting Security:</strong> Meeting rooms may be locked and access controlled by hosts</li>
                  <li><strong>Data Privacy:</strong> Meeting data is processed securely and accessed only by authorized participants</li>
                  <li><strong>Technical Requirements:</strong> Users must have compatible devices and stable internet connection</li>
                </ul>
              </div>

              {/* Service Availability and Limitations */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Service Availability and Limitations</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Uptime:</strong> We strive for high availability but cannot guarantee uninterrupted service</li>
                  <li><strong>Maintenance:</strong> Scheduled maintenance may temporarily affect service availability</li>
                  <li><strong>Technical Limits:</strong> File size limits, storage quotas, and usage restrictions may apply</li>
                  <li><strong>Browser Compatibility:</strong> Service requires modern web browsers with JavaScript enabled</li>
                  <li><strong>Mobile Access:</strong> Optimized for mobile devices but some features may be limited</li>
                </ul>
              </div>

              {/* Privacy and Data Protection */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Privacy and Data Protection</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  Your privacy is important to us. Please review our <Link to="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link> to understand how we collect, use, and protect your information. By using our service, you consent to our data practices as described in the Privacy Policy.
                </p>
              </div>

              {/* Intellectual Property Rights */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Intellectual Property Rights</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>Platform Rights:</strong> BugRicer platform, software, and trademarks are our intellectual property</li>
                  <li><strong>User Content:</strong> You retain rights to content you create but grant us necessary usage rights</li>
                  <li><strong>Third-party Content:</strong> Respect intellectual property rights of third parties</li>
                  <li><strong>License Grant:</strong> You grant us a license to use your content for service provision</li>
                </ul>
              </div>

              {/* Limitation of Liability */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Limitation of Liability</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  BugRicer AI Innovations shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our service, including but not limited to data loss, business interruption, or security breaches. Our total liability shall not exceed the amount you paid for the service in the 12 months preceding the claim.
                </p>
              </div>

              {/* Indemnification */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Indemnification</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  You agree to indemnify and hold harmless BugRicer AI Innovations from any claims, damages, or expenses arising from your use of the service, violation of these terms, or infringement of any rights of another party.
                </p>
              </div>

              {/* Termination */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Termination</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  <li><strong>User Termination:</strong> You may terminate your account at any time</li>
                  <li><strong>Service Termination:</strong> We may suspend or terminate accounts for terms violations</li>
                  <li><strong>Data Retention:</strong> Some data may be retained for legal and operational purposes</li>
                  <li><strong>Effect of Termination:</strong> Access to the service will cease upon account termination</li>
                </ul>
              </div>

              {/* Modifications to Terms */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Modifications to Terms</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  We reserve the right to modify these Terms of Use at any time. Changes will be effective upon posting on our platform. Your continued use of the service constitutes acceptance of modified terms.
                </p>
              </div>

              {/* Governing Law and Dispute Resolution */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Governing Law and Dispute Resolution</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  These terms are governed by the laws of India. Any disputes arising from these terms or your use of the service shall be resolved through binding arbitration in accordance with Indian arbitration laws.
                </p>
              </div>

              {/* Contact Information */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Contact Information</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-3">
                  For questions about these terms, please contact us at:
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

          {/* Footer Actions */}
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

