import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/env";
import axios from "axios";
import { 
  AlertCircle, 
  BugIcon, 
  Key, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Lock,
  FileText,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { GOOGLE_OAUTH_CONFIG } from '@/config/google-oauth-config';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { clearGoogleOAuthCache, handleGoogleOAuthError } from '@/utils/googleOAuthUtils';

type LoginMethod = "username" | "email" | "otp" | "forgot" | "magic";

type ApiResponse = { success: boolean; message?: string; user?: any };

const Login = () => {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("username");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState("tester");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMethod, setOtpMethod] = useState<"mail" | "whatsapp">("mail");
  const [phone, setPhone] = useState("");
  const [userExists, setUserExists] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [forgotEmailExists, setForgotEmailExists] = useState(false);
  const [checkingForgotEmail, setCheckingForgotEmail] = useState(false);
  const [magicEmailExists, setMagicEmailExists] = useState(false);
  const [checkingMagicEmail, setCheckingMagicEmail] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfUse, setShowTermsOfUse] = useState(false);
  const {
    login,
    register,
    isAuthenticated,
    isLoading: isAuthLoading,
    currentUser,
    loginWithToken,
  } = useAuth();
  const navigate = useNavigate();

  // OTP countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            setOtpSent(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCountdown]);

  useEffect(() => {
    // Only redirect if authenticated AND token exists
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (isAuthenticated && currentUser && token) {
      // navigate to projects
    }

    // Check for magic link token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get('magic_token');
    
    if (magicToken) {
      handleMagicLinkVerification(magicToken);
    }
  }, [isAuthenticated, currentUser, navigate]);

  if (isAuthLoading) {
    // Show loading spinner
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4 animate-pulse">
            <BugIcon className="h-8 w-8 text-white" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateOtp = (otp: string) => {
    return /^\d{6}$/.test(otp);
  };

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    try {
      let payload;
      if (otpMethod === "whatsapp") {
        if (!phone) {
          toast({
            title: "Invalid Phone",
            description: "Please enter a valid phone number",
            variant: "destructive",
          });
          return;
        }
        payload = { method: "whatsapp", phone: "+91" + phone };
      } else {
        if (!email || !validateEmail(email)) {
          toast({
            title: "Invalid Email",
            description: "Please enter a valid email address",
            variant: "destructive",
          });
          return;
        }
        payload = { method: "mail", email };
      }
      const response = await axios.post<ApiResponse>(
        `${API_BASE_URL}/send_otp.php`,
        payload
      );
      const data = response.data as any;
      if (data.success) {
        setOtpSent(true);
        setOtpCountdown(60);

        // Show secure OTP sent message (without displaying the actual OTP)
        const toastDescription =
          otpMethod === "mail"
            ? "A one-time password has been sent to your email"
            : "A one-time password has been sent to your WhatsApp";

        toast({
          title: "OTP Sent",
          description: toastDescription,
          variant: "default",
        });
      } else {
        throw new Error(data.message || "Failed to send OTP");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error.message ||
          "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let success = false;
      let user = null;

      switch (loginMethod) {
        case "username":
        case "email": {
          const identifier = loginMethod === "username" ? username : email;
          if (!identifier || !password) {
            toast({
              title: "Login failed",
              description: "Invalid credentials",
              variant: "destructive",
            });
            return;
          }
          if (loginMethod === "email" && !validateEmail(email)) {
            toast({
              title: "Login failed",
              description: "Invalid credentials",
              variant: "destructive",
            });
            return;
          }
          const response = await axios.post<ApiResponse>(
            `${API_BASE_URL}/login.php`,
            { identifier, password }
          );
          const data = response.data as any;
          if (data.success && data.token && data.user) {
            localStorage.setItem("token", data.token);
            login(identifier, password);
          } else {
            toast({
              title: "Login failed",
              description: "Invalid credentials",
              variant: "destructive",
            });
          }
          break;
        }
        case "otp": {
          let payload;
          if (otpMethod === "whatsapp") {
            if (!phone || !otp) {
              toast({
                title: "Validation Error",
                description: "Phone and OTP are required",
                variant: "destructive",
              });
              return;
            }
            payload = { method: "whatsapp", phone: "+91" + phone, otp };
          } else {
            if (!email || !otp) {
              toast({
                title: "Validation Error",
                description: "Email and OTP are required",
                variant: "destructive",
              });
              return;
            }
            if (!validateEmail(email)) {
              toast({
                title: "Invalid Email",
                description: "Please enter a valid email address",
                variant: "destructive",
              });
              return;
            }
            payload = { method: "mail", email, otp };
          }
          const response = await axios.post<ApiResponse>(
            `${API_BASE_URL}/verify_otp.php`,
            payload
          );
          const data = response.data as any;
          if (data.success) {
            success = true;
            user = data.user;
            if (data.token) {
              loginWithToken(user, data.token);
            }
          } else {
            toast({
              title: "OTP Login failed",
              description: data.message || "Invalid or expired OTP",
              variant: "destructive",
            });
          }
          break;
        }
      }

      if (success && user) {
        setShowSuccess(true);
        setIsAnimating(true);
        
        // Show success animation
        setTimeout(() => {
          setShowSuccess(false);
          setIsAnimating(false);
          // Navigate after animation
          navigate(`/${user.role}/projects`, { replace: true });
        }, 1500);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error.message ||
          "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkVerification = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/verify_magic_link_simple.php`, {
        token: token
      });

      if ((response.data as any).success) {
        const { token: jwtToken, user } = response.data as { token: string; user: any };
        localStorage.setItem("token", jwtToken);
        sessionStorage.setItem("token", jwtToken);
        
        // Update auth context
        loginWithToken(user, jwtToken);
        
        // Show success animation
        setShowSuccess(true);
        setIsAnimating(true);
        
        toast({
          title: "Welcome back! ✨",
          description: `Signed in with magic link as ${user.username}`,
          variant: "default",
        });
        
        setTimeout(() => {
          setShowSuccess(false);
          setIsAnimating(false);
          // Navigate to the appropriate dashboard based on user role
          navigate(`/${user.role}/projects`, { replace: true });
        }, 1500);
      } else {
        throw new Error((response.data as any).message || "Magic link verification failed");
      }
    } catch (error: any) {
      console.error("Magic link verification error:", error);
      toast({
        title: "Magic Link Error",
        description: (error.response?.data as any)?.message || "Invalid or expired magic link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Registration Disabled",
      description:
        "This platform will allow external users within a few days. It is currently for testing purposes only.",
      variant: "default",
    });
  };

  const handleForgotPassword = async () => {
    if (!email || !validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!forgotEmailExists) {
      toast({
        title: "Email Not Found",
        description: "Please verify the email address exists before sending reset link",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/forgot_password.php`, { 
        email: email.trim().toLowerCase() 
      });
      
      const data = response.data as any;
      if (data.success) {
        toast({
          title: "Reset Link Sent",
          description: "A password reset link has been sent to your email address.",
          variant: "default",
        });
        
        // Reset form
        setEmail("");
        setForgotEmailExists(false);
        setLoginMethod("username");
      } else {
        throw new Error(data.message || "Failed to send reset link");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email || !validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!magicEmailExists) {
      toast({
        title: "Email Not Found",
        description: "Please verify the email address exists before sending magic link",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/send_magic_link_simple.php`, { 
        email: email.trim().toLowerCase() 
      });
      
      const data = response.data as any;
      if (data.success) {
        toast({
          title: "Magic Link Sent! ✨",
          description: "A secure magic link has been sent to your email address.",
          variant: "default",
        });
        
        // Reset form
        setEmail("");
        setMagicEmailExists(false);
        setLoginMethod("username");
      } else {
        throw new Error(data.message || "Failed to send magic link");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error.message || "Failed to send magic link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast({
        title: "Google Sign-In Failed",
        description: "No credential received from Google",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/google-login.php`, {
        id_token: credentialResponse.credential
      });
      
      const data = response.data as any;
      if (data.success && data.token && data.user) {
        // Store the token
        localStorage.setItem("token", data.token);
        
        // Update auth context
        loginWithToken(data.user, data.token);
        
        // Show success animation
        setShowSuccess(true);
        setIsAnimating(true);
        
        setTimeout(() => {
          setShowSuccess(false);
          setIsAnimating(false);
          // Navigate to the appropriate dashboard based on user role
          navigate(`/${data.user.role}/projects`, { replace: true });
        }, 1500);
      } else {
        throw new Error(data.message || "Google Sign-In failed");
      }
    } catch (error: any) {
      toast({
        title: "Google Sign-In Failed",
        description: error?.response?.data?.message || error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodChange = (method: LoginMethod) => {
    setLoginMethod(method);
    setUsername("");
    setEmail("");
    setPassword("");
    setOtp("");
    setOtpSent(false);
    setOtpCountdown(0);
    setForgotEmailExists(false);
    setCheckingForgotEmail(false);
    setMagicEmailExists(false);
    setCheckingMagicEmail(false);
  };

  const isFormValid = () => {
    switch (loginMethod) {
      case "username":
        return username.trim() && password.trim();
      case "email":
        return email.trim() && password.trim() && validateEmail(email);
      case "otp":
        // For OTP method, form is valid when OTP is sent and user has entered valid OTP
        if (otpMethod === "mail") {
          return (
            email.trim() &&
            validateEmail(email) &&
            userExists &&
            otpSent &&
            otp.trim() &&
            validateOtp(otp)
          );
        } else {
          // WhatsApp
          return (
            phone.trim() &&
            phone.length >= 10 &&
            userExists &&
            otpSent &&
            otp.trim() &&
            validateOtp(otp)
          );
        }
      case "forgot":
        return email.trim() && validateEmail(email) && forgotEmailExists;
      case "magic":
        return email.trim() && validateEmail(email) && magicEmailExists;
      default:
        return false;
    }
  };

  const checkUserExists = async (type: "email" | "phone", value: string) => {
    setCheckingUser(true);
    setUserExists(false);
    try {
      const response = await axios.post(`${API_BASE_URL}/check_user.php`, {
        type,
        value,
      });
      const exists = (response.data as { exists: boolean }).exists;
      setUserExists(exists);
      if (!exists) {
        toast({
          title: "User Not Found",
          description: `No user found with this ${type}.`,
          variant: "destructive",
        });
      }
      return exists;
    } catch (error) {
      setUserExists(false);
      toast({
        title: "Error",
        description: "Failed to check user existence.",
        variant: "destructive",
      });
      return false;
    } finally {
      setCheckingUser(false);
    }
  };

  const checkForgotEmailExists = async (email: string) => {
    setCheckingForgotEmail(true);
    setForgotEmailExists(false);
    try {
      const response = await axios.post(`${API_BASE_URL}/check_user.php`, {
        type: "email",
        value: email,
      });
      const exists = (response.data as { exists: boolean }).exists;
      setForgotEmailExists(exists);
      return exists;
    } catch (error) {
      setForgotEmailExists(false);
      return false;
    } finally {
      setCheckingForgotEmail(false);
    }
  };

  const checkMagicEmailExists = async (email: string) => {
    setCheckingMagicEmail(true);
    setMagicEmailExists(false);
    try {
      const response = await axios.post(`${API_BASE_URL}/check_user.php`, {
        type: "email",
        value: email,
      });
      const exists = (response.data as { exists: boolean }).exists;
      setMagicEmailExists(exists);
      return exists;
    } catch (error) {
      setMagicEmailExists(false);
      return false;
    } finally {
      setCheckingMagicEmail(false);
    }
  };

  // Privacy Policy Content
  const privacyPolicyContent = `
    <div class="space-y-4">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Privacy Policy</h2>
      
      <div class="space-y-3 text-sm text-slate-700 dark:text-slate-300">
        <p><strong>Last Updated:</strong> January 2025</p>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Company Information</h3>
          <p><strong>BugRicer AI Innovations</strong></p>
          <p>Website: https://bugricer.com</p>
          <p>Email: info@bugricer.com</p>
          <p>Phone: +91 8086995559</p>
          <p>Address: Malappuram, Kerala, India</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Information We Collect</h3>
          <ul class="list-disc list-inside space-y-1">
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
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">How We Use Your Information</h3>
          <ul class="list-disc list-inside space-y-1">
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
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Data Sharing and Disclosure</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Team Members:</strong> Share project data, bug reports, and updates with authorized team members</li>
            <li><strong>Communication Services:</strong> Use third-party services for email delivery and WhatsApp messaging</li>
            <li><strong>Cloud Storage:</strong> Store files and media content on secure cloud infrastructure</li>
            <li><strong>Legal Requirements:</strong> Disclose information when required by law or legal process</li>
            <li><strong>Service Providers:</strong> Share data with trusted third-party service providers for platform operations</li>
            <li><strong>Emergency Situations:</strong> May disclose information to protect user safety or platform security</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Data Security Measures</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Encryption:</strong> All data transmission encrypted using SSL/TLS protocols</li>
            <li><strong>Secure Storage:</strong> Database and file storage protected with industry-standard encryption</li>
            <li><strong>Access Controls:</strong> Role-based access permissions and authentication requirements</li>
            <li><strong>Regular Audits:</strong> Periodic security assessments and vulnerability testing</li>
            <li><strong>Backup Systems:</strong> Regular data backups with secure off-site storage</li>
            <li><strong>Incident Response:</strong> Comprehensive security incident response procedures</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Your Rights and Choices</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Access:</strong> Request access to your personal data and account information</li>
            <li><strong>Correction:</strong> Update or correct inaccurate personal information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
            <li><strong>Communication Preferences:</strong> Control notification settings and communication methods</li>
            <li><strong>Data Retention:</strong> Understand our data retention policies and request data purging</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Data Retention</h3>
          <p>We retain your data for as long as your account is active and as needed to provide our services. Project data, bug reports, and communications may be retained for extended periods for audit and compliance purposes. You may request data deletion at any time, subject to legal and operational requirements.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">International Data Transfers</h3>
          <p>Your data may be processed and stored on servers located outside your country of residence. We ensure appropriate safeguards are in place for international data transfers and comply with applicable data protection laws.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Contact Us</h3>
          <p>For any privacy-related questions, data access requests, or concerns, please contact us at:</p>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li>Website: https://bugricer.com</li>
            <li>Email: info@bugricer.com</li>
            <li>Phone: +91 8086995559</li>
            <li>Address: Malappuram, Kerala, India</li>
          </ul>
          <p class="mt-2">We will respond to your privacy inquiries within 30 days of receipt.</p>
        </div>
      </div>
    </div>
  `;

  // Terms of Use Content
  const termsOfUseContent = `
    <div class="space-y-4">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Terms of Use</h2>
      
      <div class="space-y-3 text-sm text-slate-700 dark:text-slate-300">
        <p><strong>Last Updated:</strong> January 2025</p>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Company Information</h3>
          <p><strong>BugRicer AI Innovations</strong></p>
          <p>Website: https://bugricer.com</p>
          <p>Email: info@bugricer.com</p>
          <p>Phone: +91 8086995559</p>
          <p>Address: Malappuram, Kerala, India</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Company Information</h3>
          <p><strong>BugRicer AI Innovations</strong></p>
          <p>Website: https://bugricer.com</p>
          <p>Email: info@bugricer.com</p>
          <p>Phone: +91 8086995559</p>
          <p>Address: Malappuram, Kerala, India</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">User Accounts and Authentication</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Account Creation:</strong> You must provide accurate and complete information during registration</li>
            <li><strong>Authentication Methods:</strong> Username/password, email/password, or OTP-based login via email/WhatsApp</li>
            <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your credentials</li>
            <li><strong>Role Assignment:</strong> User roles (Admin, Developer, Tester) determine access permissions</li>
            <li><strong>Account Termination:</strong> We reserve the right to suspend or terminate accounts for violations</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">User Responsibilities</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Accurate Information:</strong> Provide truthful and up-to-date account information</li>
            <li><strong>Professional Conduct:</strong> Maintain respectful and professional communication with team members</li>
            <li><strong>Content Responsibility:</strong> Ensure all uploaded files and messages comply with applicable laws</li>
            <li><strong>Security Compliance:</strong> Follow security best practices and report security concerns</li>
            <li><strong>Resource Usage:</strong> Use platform resources responsibly and avoid system abuse</li>
            <li><strong>Intellectual Property:</strong> Respect intellectual property rights of others</li>
            <li><strong>Legal Compliance:</strong> Use the service in compliance with all applicable laws and regulations</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Prohibited Activities</h3>
          <ul class="list-disc list-inside space-y-1">
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
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Content and Data Ownership</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>User Content:</strong> You retain ownership of content you upload but grant us usage rights</li>
            <li><strong>Platform Data:</strong> Bug reports, project data, and communications belong to your organization</li>
            <li><strong>Meeting Recordings:</strong> Video/audio recordings are stored securely and accessible to authorized users</li>
            <li><strong>File Storage:</strong> Uploaded files are stored securely and accessible based on user permissions</li>
            <li><strong>Data Export:</strong> You may export your data in standard formats upon request</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Communication and Notification Services</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Email Notifications:</strong> You may receive email updates about bug status changes and project activities</li>
            <li><strong>WhatsApp Messages:</strong> Optional WhatsApp notifications for important updates</li>
            <li><strong>Browser Notifications:</strong> Real-time browser notifications for immediate updates</li>
            <li><strong>In-app Messaging:</strong> Internal chat system for team communication</li>
            <li><strong>Communication Preferences:</strong> You can customize notification settings in your account</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Video Conferencing and Meetings</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Meeting Features:</strong> Video calls, screen sharing, meeting recordings, and participant management</li>
            <li><strong>Recording Consent:</strong> Participants are notified when meetings are being recorded</li>
            <li><strong>Meeting Security:</strong> Meeting rooms may be locked and access controlled by hosts</li>
            <li><strong>Data Privacy:</strong> Meeting data is processed securely and accessed only by authorized participants</li>
            <li><strong>Technical Requirements:</strong> Users must have compatible devices and stable internet connection</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Service Availability and Limitations</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Uptime:</strong> We strive for high availability but cannot guarantee uninterrupted service</li>
            <li><strong>Maintenance:</strong> Scheduled maintenance may temporarily affect service availability</li>
            <li><strong>Technical Limits:</strong> File size limits, storage quotas, and usage restrictions may apply</li>
            <li><strong>Browser Compatibility:</strong> Service requires modern web browsers with JavaScript enabled</li>
            <li><strong>Mobile Access:</strong> Optimized for mobile devices but some features may be limited</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Privacy and Data Protection</h3>
          <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information. By using our service, you consent to our data practices as described in the Privacy Policy.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Intellectual Property Rights</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Platform Rights:</strong> BugRicer platform, software, and trademarks are our intellectual property</li>
            <li><strong>User Content:</strong> You retain rights to content you create but grant us necessary usage rights</li>
            <li><strong>Third-party Content:</strong> Respect intellectual property rights of third parties</li>
            <li><strong>License Grant:</strong> You grant us a license to use your content for service provision</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Limitation of Liability</h3>
          <p>BugRicer AI Innovations shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our service, including but not limited to data loss, business interruption, or security breaches. Our total liability shall not exceed the amount you paid for the service in the 12 months preceding the claim.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Indemnification</h3>
          <p>You agree to indemnify and hold harmless BugRicer AI Innovations from any claims, damages, or expenses arising from your use of the service, violation of these terms, or infringement of any rights of another party.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Termination</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>User Termination:</strong> You may terminate your account at any time</li>
            <li><strong>Service Termination:</strong> We may suspend or terminate accounts for terms violations</li>
            <li><strong>Data Retention:</strong> Some data may be retained for legal and operational purposes</li>
            <li><strong>Effect of Termination:</strong> Access to the service will cease upon account termination</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Modifications to Terms</h3>
          <p>We reserve the right to modify these Terms of Use at any time. Changes will be effective upon posting on our platform. Your continued use of the service constitutes acceptance of modified terms.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Governing Law and Dispute Resolution</h3>
          <p>These terms are governed by the laws of India. Any disputes arising from these terms or your use of the service shall be resolved through binding arbitration in accordance with Indian arbitration laws.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Contact Information</h3>
          <p>For questions about these terms, please contact us at:</p>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li>Website: https://bugricer.com</li>
            <li>Email: info@bugricer.com</li>
            <li>Phone: +91 8086995559</li>
            <li>Address: Malappuram, Kerala, India</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:20px_20px]" />
      
      {/* Floating elements for depth - hidden on mobile for performance */}
      <div className="hidden sm:block absolute top-20 left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="hidden sm:block absolute bottom-20 right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="w-full max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl relative z-10">
        <div className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 transition-all duration-700 ${
          isAnimating ? 'scale-105 shadow-2xl' : 'hover:shadow-2xl'
        }`}>
          {/* Header Section */}
          <div className="text-center px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
            <div className="relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6 transform hover:scale-105 transition-all duration-300 group">
              <BugIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white group-hover:rotate-12 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-xl sm:rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 tracking-tight">
              Welcome back
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed px-2">
              Sign in to your account to continue
            </p>
          </div>
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              {/* Login Method Selection */}
              {!isSignUp && (
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex justify-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => handleMethodChange("username")}
                      className={`group relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        loginMethod === "username"
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105"
                          : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md"
                      }`}
                      title="Username Login"
                    >
                      <User className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
                        loginMethod === "username" ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                      }`} />
                      {loginMethod === "username" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMethodChange("email")}
                      className={`group relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        loginMethod === "email"
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105"
                          : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md"
                      }`}
                      title="Email Login"
                    >
                      <Mail className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
                        loginMethod === "email" ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                      }`} />
                      {loginMethod === "email" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMethodChange("otp")}
                      className={`group relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        loginMethod === "otp"
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105"
                          : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md"
                      }`}
                      title="OTP Login"
                    >
                      <Key className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
                        loginMethod === "otp" ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                      }`} />
                      {loginMethod === "otp" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMethodChange("forgot")}
                      className={`group relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        loginMethod === "forgot"
                          ? "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-500/30 scale-105"
                          : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-md"
                      }`}
                      title="Forgot Password"
                    >
                      <Lock className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
                        loginMethod === "forgot" ? "text-white" : "text-slate-500 group-hover:text-orange-600"
                      }`} />
                      {loginMethod === "forgot" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMethodChange("magic")}
                      className={`group relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        loginMethod === "magic"
                          ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/30 scale-105"
                          : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md"
                      }`}
                      title="Magic Link Sign-In"
                    >
                      <Sparkles className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
                        loginMethod === "magic" ? "text-white" : "text-slate-500 group-hover:text-purple-600"
                      }`} />
                      {loginMethod === "magic" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                    {/* Google Sign-In Button */}
                    <GoogleSignInButton
                      variant="icon"
                      onSuccess={handleGoogleLogin}
                      onError={(error) => {
                        console.error('Google OAuth Error:', error);
                        
                        if (error?.type === 'setup_required') {
                          toast({
                            title: "Google OAuth Setup Required",
                            description: `Google Sign-In is not configured for your current domain (${error.currentOrigin}). Please check the console for setup instructions or contact support.`,
                            variant: "destructive",
                          });
                          
                          // Clear cache and suggest refresh
                          setTimeout(() => {
                            clearGoogleOAuthCache();
                          }, 1000);
                        } else {
                          const errorMessage = handleGoogleOAuthError(error);
                          toast({
                            title: "Google Sign-In Error",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Username Field */}
              {loginMethod === "username" && !isSignUp && (
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="username" className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    Username
                  </Label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField("username")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`h-11 sm:h-12 text-sm pl-3 sm:pl-4 pr-3 sm:pr-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 w-full focus:outline-none ${
                        focusedField === "username" 
                          ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Email Field for Email login or SignUp only */}
              {(loginMethod === "email" || isSignUp) && (
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={async () => {
                        setFocusedField(null);
                        if (validateEmail(email)) {
                          await checkUserExists("email", email);
                        }
                      }}
                      required
                      disabled={isSignUp}
                      className={`h-11 sm:h-12 text-sm pl-3 sm:pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 w-full focus:outline-none ${
                        focusedField === "email" 
                          ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                      } ${isSignUp ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                    <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                      {checkingUser && (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 animate-spin" />
                      )}
                      {!checkingUser && !userExists && (
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                      )}
                      {userExists && !checkingUser && (
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Password Field */}
              {(loginMethod === "username" ||
                loginMethod === "email" ||
                isSignUp) && (
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`h-11 sm:h-12 text-sm pl-3 sm:pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 w-full focus:outline-none ${
                        focusedField === "password" 
                          ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 touch-manipulation"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot Password Section */}
              {loginMethod === "forgot" && !isSignUp && (
                <div className="space-y-2 sm:space-y-3">                    
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="forgot-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <div className="relative group">
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("forgot-email")}
                        onBlur={async () => {
                          setFocusedField(null);
                          if (validateEmail(email)) {
                            await checkForgotEmailExists(email);
                          }
                        }}
                        required
                        className={`h-11 sm:h-12 text-sm pl-3 sm:pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
                          focusedField === "forgot-email" 
                            ? "border-orange-500 ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/10" 
                            : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 group-hover:shadow-md"
                        }`}
                      />
                      <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                        {checkingForgotEmail && (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 animate-spin" />
                        )}
                        {!checkingForgotEmail && !forgotEmailExists && (
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 group-hover:text-orange-500 transition-colors duration-200" />
                        )}
                        {forgotEmailExists && !checkingForgotEmail && (
                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    {!forgotEmailExists && email && validateEmail(email) && !checkingForgotEmail && (
                      <div className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        No account found with this email address
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Magic Link Section */}
              {loginMethod === "magic" && !isSignUp && (
                <div className="space-y-2 sm:space-y-3">                    
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="magic-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Email Address
                    </Label>
                    <div className="relative group">
                      <Input
                        id="magic-email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("magic-email")}
                        onBlur={async () => {
                          setFocusedField(null);
                          if (validateEmail(email)) {
                            await checkMagicEmailExists(email);
                          }
                        }}
                        required
                        className={`h-11 sm:h-12 text-sm pl-3 sm:pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
                          focusedField === "magic-email" 
                            ? "border-purple-500 ring-4 ring-purple-500/20 shadow-lg shadow-purple-500/10" 
                            : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 group-hover:shadow-md"
                        }`}
                      />
                      <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                        {checkingMagicEmail && (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 animate-spin" />
                        )}
                        {!checkingMagicEmail && !magicEmailExists && (
                          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 group-hover:text-purple-500 transition-colors duration-200" />
                        )}
                        {magicEmailExists && !checkingMagicEmail && (
                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    {!magicEmailExists && email && validateEmail(email) && !checkingMagicEmail && (
                      <div className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        No account found with this email address
                      </div>
                    )}
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      We'll send you a secure link to sign in without a password
                    </div>
                  </div>
                </div>
              )}

              {/* OTP Section */}
              {loginMethod === "otp" && !isSignUp && (
                <div className="space-y-3 sm:space-y-4">
                  {/* OTP Method Toggle - only show when OTP not sent */}
                  {!otpSent && (
                    <div className="space-y-1 sm:space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Send OTP via
                      </Label>
                      <div className="flex w-full gap-1 sm:gap-2 p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg sm:rounded-xl">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setOtpMethod("mail")}
                          className={`flex-1 h-9 sm:h-10 rounded-md sm:rounded-lg transition-all duration-300 font-medium text-xs sm:text-sm ${
                            otpMethod === "mail" 
                              ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-lg scale-105" 
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:scale-105"
                          }`}
                        >
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Email
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setOtpMethod("whatsapp")}
                          className={`flex-1 h-9 sm:h-10 rounded-md sm:rounded-lg transition-all duration-300 font-medium text-xs sm:text-sm ${
                            otpMethod === "whatsapp" 
                              ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-lg scale-105" 
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:scale-105"
                          }`}
                        >
                          <Key className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Input for email or phone - only show when OTP not sent */}
                  {!otpSent && (
                    <>
                      {otpMethod === "mail" ? (
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="otp-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email Address
                          </Label>
                          <div className="relative group">
                            <Input
                              id="otp-email"
                              type="email"
                              placeholder="Enter your email address"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              onFocus={() => setFocusedField("otp-email")}
                              onBlur={async () => {
                                setFocusedField(null);
                                if (validateEmail(email)) {
                                  await checkUserExists("email", email);
                                }
                              }}
                              required
                              className={`h-11 sm:h-12 text-sm pl-3 sm:pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
                                focusedField === "otp-email" 
                                  ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                                  : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 group-hover:shadow-md"
                              }`}
                            />
                            <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                              {checkingUser && (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 animate-spin" />
                              )}
                              {!checkingUser && !userExists && (
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 group-hover:text-blue-500 transition-colors duration-200" />
                              )}
                              {userExists && !checkingUser && (
                                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="otp-phone" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Phone Number
                          </Label>
                          <div className="flex items-center group w-full">
                            <span className="px-2 sm:px-3 py-2.5 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-l-lg sm:rounded-l-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">
                              +91
                            </span>
                            <div className="relative flex-1 min-w-0">
                              <input
                                id="otp-phone"
                                type="tel"
                                placeholder="Enter 10-digit number"
                                value={phone}
                                onChange={(e) =>
                                  setPhone(
                                    e.target.value.replace(/\D/g, "").slice(0, 10)
                                  )
                                }
                                onFocus={() => setFocusedField("otp-phone")}
                                onBlur={async () => {
                                  setFocusedField(null);
                                  if (phone.length === 10) {
                                    await checkUserExists("phone", "+91" + phone);
                                  }
                                }}
                                required
                                className={`h-11 sm:h-12 text-sm w-full border-2 border-slate-200 dark:border-slate-600 rounded-r-lg sm:rounded-r-xl px-2 sm:px-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all duration-300 ${
                                  focusedField === "otp-phone" 
                                    ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                                    : "hover:border-slate-300 dark:hover:border-slate-500 group-hover:shadow-md"
                                }`}
                                style={{ borderLeft: 0 }}
                                maxLength={10}
                                pattern="\d{10}"
                                inputMode="numeric"
                              />
                              <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                                {checkingUser && (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 animate-spin" />
                                )}
                                {userExists && !checkingUser && (
                                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {/* OTP Input - shown after OTP is sent */}
                  {otpSent && (
                    <div className="space-y-3 sm:space-y-4 p-4 sm:p-5 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg sm:rounded-xl md:rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Label htmlFor="otp" className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            OTP
                          </Label>
                          <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                            {otpMethod === "mail" ? (
                              <>
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[120px] sm:max-w-none">{email}</span>
                              </>
                            ) : (
                              <>
                                <Key className="h-3 w-3" />
                                +91{phone}
                              </>
                            )}
                          </div>
                        </div>
                        {otpCountdown > 0 && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-full self-start sm:self-auto">
                            Expires in {otpCountdown}s
                          </span>
                        )}
                      </div>
                      <div className="relative group">
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) =>
                            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          onFocus={() => setFocusedField("otp")}
                          onBlur={() => setFocusedField(null)}
                          required
                          maxLength={6}
                          className={`h-11 sm:h-12 md:h-14 text-base sm:text-lg text-center font-mono tracking-widest transition-all duration-300 rounded-lg sm:rounded-xl border-2 ${
                            focusedField === "otp" 
                              ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                              : "border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 group-hover:shadow-md"
                          }`}
                        />
                        <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                          <Key className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-400 group-hover:text-blue-600 transition-colors duration-200" />
                        </div>
                      </div>
                      {otpCountdown === 0 && otpSent && (
                        <div className="mt-4 sm:mt-5">
                          <Button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={
                              otpMethod === "mail"
                                ? !email || !validateEmail(email) || isSendingOtp
                                : !phone || phone.length < 10 || isSendingOtp
                            }
                            className="w-full h-10 sm:h-11 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 touch-manipulation"
                            variant="default"
                          >
                            {isSendingOtp ? (
                              <>
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                Resend OTP
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sign Up Fields */}
              {isSignUp && (
                <>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="role" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Role
                    </Label>
                    <select
                      id="role"
                      className="w-full h-11 sm:h-12 text-sm border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg sm:rounded-xl px-3 sm:px-4 transition-all duration-300"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                      disabled
                    >
                      <option value="tester">Tester</option>
                      <option value="developer">Developer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg sm:rounded-xl shadow-lg">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Registration Disabled
                    </AlertTitle>
                    <AlertDescription className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                      This platform will allow external users within a few days.
                      It is currently for testing purposes only.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>

            {/* Success Animation Overlay */}
            {showSuccess && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-50 duration-500 max-w-xs sm:max-w-sm w-full">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Login Successful!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Redirecting to your dashboard...
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4 sm:space-y-5 mt-6 sm:mt-8">
              {/* Create Account Button - only for signup */}
              {isSignUp && (
                <Button
                  className="w-full h-11 sm:h-12 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-blue-500/20 touch-manipulation"
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              )}

              {/* Sign in Button - for username/email login */}
              {!isSignUp && loginMethod !== "otp" && loginMethod !== "forgot" && loginMethod !== "magic" && (
                <Button
                  className="w-full h-11 sm:h-12 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-blue-500/20 touch-manipulation"
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Sign in
                    </>
                  )}
                </Button>
              )}

              {/* Send OTP Button - for OTP login when OTP not sent */}
              {!isSignUp && loginMethod === "otp" && !otpSent && (
                <Button
                  className="w-full h-11 sm:h-12 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-blue-500/20 touch-manipulation"
                  type="button"
                  onClick={handleSendOtp}
                  disabled={
                    isSendingOtp ||
                    (otpMethod === "mail"
                      ? !email || !validateEmail(email) || !userExists
                      : !phone || phone.length < 10 || !userExists)
                  }
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Send OTP
                    </>
                  )}
                </Button>
              )}

              {/* Sign in Button - for OTP login after OTP is sent */}
              {!isSignUp && loginMethod === "otp" && otpSent && (
                <Button
                  className="w-full h-11 sm:h-12 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-blue-500/20 touch-manipulation"
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Verify & Sign in
                    </>
                  )}
                </Button>
              )}

              {/* Send Reset Link Button - for forgot password */}
              {!isSignUp && loginMethod === "forgot" && (
                <Button
                  className="w-full h-11 sm:h-12 text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-orange-500/20 touch-manipulation"
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading || !email || !validateEmail(email) || !forgotEmailExists || checkingForgotEmail}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : checkingForgotEmail ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              )}

              {/* Send Magic Link Button - for magic link */}
              {!isSignUp && loginMethod === "magic" && (
                <Button
                  className="w-full h-11 sm:h-12 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-purple-500/20 touch-manipulation"
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isLoading || !email || !validateEmail(email) || !magicEmailExists || checkingMagicEmail}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : checkingMagicEmail ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Send Magic Link
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 text-center space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-6 text-xs">
              <button
                onClick={() => setShowPrivacyPolicy(true)}
                className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center gap-1 touch-manipulation"
              >
                <FileText className="h-3 w-3" />
                Privacy Policy
              </button>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
              <button
                onClick={() => setShowTermsOfUse(true)}
                className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center gap-1 touch-manipulation"
              >
                <FileText className="h-3 w-3" />
                Terms of Use
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
              © 2025 BugRicer | CODO AI Innovations
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Policy Dialog */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-xs sm:max-w-lg md:max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Privacy Policy
              </h2>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200 flex-shrink-0 touch-manipulation"
              >
                <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: privacyPolicyContent }}
              />
            </div>
            <div className="flex justify-between items-center p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPrivacyPolicy(false);
                  navigate('/privacy-policy');
                }}
                className="px-4 sm:px-6 h-9 sm:h-10 text-sm touch-manipulation"
              >
                More
              </Button>
              <Button
                onClick={() => setShowPrivacyPolicy(false)}
                className="px-4 sm:px-6 h-9 sm:h-10 text-sm touch-manipulation"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Use Dialog */}
      {showTermsOfUse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-xs sm:max-w-lg md:max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Terms of Use
              </h2>
              <button
                onClick={() => setShowTermsOfUse(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200 flex-shrink-0 touch-manipulation"
              >
                <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: termsOfUseContent }}
              />
            </div>
            <div className="flex justify-between items-center p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTermsOfUse(false);
                  navigate('/terms-of-use');
                }}
                className="px-4 sm:px-6 h-9 sm:h-10 text-sm touch-manipulation"
              >
                More
              </Button>
              <Button
                onClick={() => setShowTermsOfUse(false)}
                className="px-4 sm:px-6 h-9 sm:h-10 text-sm touch-manipulation"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

