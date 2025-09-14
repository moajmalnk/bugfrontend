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

type LoginMethod = "username" | "email" | "otp" | "forgot";

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

  // Privacy Policy Content
  const privacyPolicyContent = `
    <div class="space-y-4">
      <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Privacy Policy</h2>
      
      <div class="space-y-3 text-sm text-slate-700 dark:text-slate-300">
        <p><strong>Last Updated:</strong> January 2025</p>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Company Information</h3>
          <p><strong>BugRicer AI Innovations</strong></p>
          <p>Malappuram, Kerala, India</p>
          <p>Phone: +91 8086995559</p>
          <p>Email: bugricer@gmail.com</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Information We Collect</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Account information (username, email, phone number)</li>
            <li>Authentication data (passwords, OTP verification)</li>
            <li>Usage data and analytics</li>
            <li>Device information and IP addresses</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">How We Use Your Information</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Provide and maintain our services</li>
            <li>Authenticate users and prevent fraud</li>
            <li>Send important notifications and updates</li>
            <li>Improve our platform and user experience</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Data Security</h3>
          <p>We implement industry-standard security measures to protect your personal information. All data is encrypted and stored securely.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Contact Us</h3>
          <p>For any privacy-related questions or concerns, please contact us at bugricer@gmail.com or +91 8086995559.</p>
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
          <p>Malappuram, Kerala, India</p>
          <p>Phone: +91 8086995559</p>
          <p>Email: bugricer@gmail.com</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Acceptance of Terms</h3>
          <p>By using BugRicer, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our service.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Service Description</h3>
          <p>BugRicer is a bug tracking and project management platform designed to help teams efficiently manage software development projects and track issues.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">User Responsibilities</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Use the service in compliance with applicable laws</li>
            <li>Respect other users and maintain professional conduct</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Prohibited Activities</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Unauthorized access to other users' accounts</li>
            <li>Sharing of inappropriate or harmful content</li>
            <li>Attempting to disrupt or damage our services</li>
            <li>Violation of intellectual property rights</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Limitation of Liability</h3>
          <p>BugRicer AI Innovations shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our service.</p>
        </div>
        
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Contact Information</h3>
          <p>For questions about these terms, please contact us at bugricer@gmail.com or +91 8086995559.</p>
        </div>
      </div>
    </div>
  `;

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Enhanced Background with animated elements */}
      <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800/25 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-blue-500/10 to-transparent dark:from-blue-400/10" />
      
      {/* Floating geometric shapes - hidden on mobile for performance */}
      <div className="hidden sm:block absolute top-20 left-10 w-20 h-20 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
      <div className="hidden sm:block absolute top-40 right-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
      <div className="hidden sm:block absolute bottom-20 left-20 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-2000"></div>
      
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl relative z-10">
        <Card className={`border-0 shadow-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl transition-all duration-500 ${
          isAnimating ? 'scale-105 shadow-3xl' : ''
        }`}>
          {/* Enhanced Logo and branding inside card */}
          <div className="text-center pt-4 sm:pt-6 pb-3 sm:pb-4 px-4 sm:px-6 lg:px-8">
            <div className="relative inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-xl mb-3 sm:mb-4 lg:mb-6 transform hover:scale-105 transition-all duration-300 group">
              <BugIcon className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white group-hover:rotate-12 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-xl sm:rounded-2xl lg:rounded-3xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-1 sm:mb-2 lg:mb-3 tracking-tight">
              BugRicer
            </h1>
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Secure • Fast • Reliable</span>
            </div>
          </div>
          <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
            <CardContent className="space-y-1 sm:space-y-2 p-2 sm:p-3 lg:p-4">
              {/* Login Method Selection */}
              {!isSignUp && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleMethodChange("username")}
                      className={`group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        loginMethod === "username"
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105"
                          : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md"
                      }`}
                      title="Username Login"
                    >
                      <User className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 transition-colors ${
                        loginMethod === "username" ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                      }`} />
                      {loginMethod === "username" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMethodChange("email")}
                      className={`group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        loginMethod === "email"
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105"
                          : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md"
                      }`}
                      title="Email Login"
                    >
                      <Mail className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 transition-colors ${
                        loginMethod === "email" ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                      }`} />
                      {loginMethod === "email" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMethodChange("otp")}
                      className={`group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        loginMethod === "otp"
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105"
                          : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md"
                      }`}
                      title="OTP Login"
                    >
                      <Key className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 transition-colors ${
                        loginMethod === "otp" ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                      }`} />
                      {loginMethod === "otp" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMethodChange("forgot")}
                      className={`group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        loginMethod === "forgot"
                          ? "bg-gradient-to-br from-orange-600 to-red-600 text-white border-orange-600 shadow-lg shadow-orange-500/30 scale-105"
                          : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-md"
                      }`}
                      title="Forgot Password"
                    >
                      <Lock className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 transition-colors ${
                        loginMethod === "forgot" ? "text-white" : "text-slate-500 group-hover:text-orange-600"
                      }`} />
                      {loginMethod === "forgot" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Username Field */}
              {loginMethod === "username" && !isSignUp && (
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="username" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username
                  </Label>
                  <div className="relative group">
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField("username")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`h-10 sm:h-12 text-sm pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
                        focusedField === "username" 
                          ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 group-hover:shadow-md"
                      }`}
                    />
                    <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-blue-500 transition-colors duration-200" />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Field for Email login or SignUp only */}
              {(loginMethod === "email" || isSignUp) && (
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <div className="relative group">
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
                      className={`h-10 sm:h-12 text-sm pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
                        focusedField === "email" 
                          ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 group-hover:shadow-md"
                      } ${isSignUp ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                    <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                      {checkingUser && (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 animate-spin" />
                      )}
                      {!checkingUser && !userExists && (
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-blue-500 transition-colors duration-200" />
                      )}
                      {userExists && !checkingUser && (
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Password Field */}
              {(loginMethod === "username" ||
                loginMethod === "email" ||
                isSignUp) && (
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Password
                  </Label>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`h-10 sm:h-12 text-sm pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
                        focusedField === "password" 
                          ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 group-hover:shadow-md"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
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
                        className={`h-10 sm:h-12 text-sm pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
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
                          <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-orange-500 transition-colors duration-200" />
                        )}
                        {forgotEmailExists && !checkingForgotEmail && (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
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
                      <div className="flex w-full gap-1 sm:gap-2 p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl sm:rounded-2xl">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setOtpMethod("mail")}
                          className={`flex-1 h-8 sm:h-10 rounded-lg sm:rounded-xl transition-all duration-300 font-medium text-xs sm:text-sm ${
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
                          className={`flex-1 h-8 sm:h-10 rounded-lg sm:rounded-xl transition-all duration-300 font-medium text-xs sm:text-sm ${
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
                              className={`h-10 sm:h-12 text-sm pl-4 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
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
                                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-blue-500 transition-colors duration-200" />
                              )}
                              {userExists && !checkingUser && (
                                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
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
                                className={`h-10 sm:h-12 text-sm w-full border-2 border-slate-200 dark:border-slate-600 rounded-r-lg sm:rounded-r-xl px-2 sm:px-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all duration-300 ${
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
                                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
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
                    <div className="space-y-2 sm:space-y-3 p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl sm:rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="otp" className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            OTP
                          </Label>
                          <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                            {otpMethod === "mail" ? (
                              <>
                                <Mail className="h-3 w-3" />
                                {email}
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
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-full">
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
                          className={`h-12 sm:h-14 text-base sm:text-lg text-center font-mono tracking-widest transition-all duration-300 rounded-lg sm:rounded-xl border-2 ${
                            focusedField === "otp" 
                              ? "border-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                              : "border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 group-hover:shadow-md"
                          }`}
                        />
                        <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                          <Key className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 group-hover:text-blue-600 transition-colors duration-200" />
                        </div>
                      </div>
                      {otpCountdown === 0 && otpSent && (
                        <Button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={
                            otpMethod === "mail"
                              ? !email || !validateEmail(email) || isSendingOtp
                              : !phone || phone.length < 10 || isSendingOtp
                          }
                          className="w-full h-10 sm:h-11 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                          variant="default"
                        >
                          {isSendingOtp ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Resend OTP
                            </>
                          )}
                        </Button>
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
                      className="w-full h-10 sm:h-12 text-sm border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg sm:rounded-xl px-3 sm:px-4 transition-all duration-300"
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
            </CardContent>

            <CardFooter className="flex flex-col space-y-1 sm:space-y-2 pt-1 sm:pt-2 px-2 sm:px-3 lg:px-4 pb-2 sm:pb-3 lg:pb-4">
              {/* Success Animation Overlay */}
              {showSuccess && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-50 duration-500 max-w-sm w-full">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
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

              {/* Create Account Button - only for signup */}
              {isSignUp && (
                <Button
                  className="w-full h-10 sm:h-12 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/25 transition-all duration-300 rounded-lg sm:rounded-xl hover:scale-105 disabled:scale-100 disabled:opacity-50"
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              )}

              {/* Sign in Button - for username/email login */}
              {!isSignUp && loginMethod !== "otp" && loginMethod !== "forgot" && (
                <Button
                  className="w-full h-10 sm:h-12 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/25 transition-all duration-300 rounded-lg sm:rounded-xl hover:scale-105 disabled:scale-100 disabled:opacity-50"
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Sign in
                    </>
                  )}
                </Button>
              )}

              {/* Send OTP Button - for OTP login when OTP not sent */}
              {!isSignUp && loginMethod === "otp" && !otpSent && (
                <Button
                  className="w-full h-10 sm:h-12 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/25 transition-all duration-300 rounded-lg sm:rounded-xl hover:scale-105 disabled:scale-100 disabled:opacity-50"
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
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Send OTP
                    </>
                  )}
                </Button>
              )}

              {/* Sign in Button - for OTP login after OTP is sent */}
              {!isSignUp && loginMethod === "otp" && otpSent && (
                <Button
                  className="w-full h-10 sm:h-12 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/25 transition-all duration-300 rounded-lg sm:rounded-xl hover:scale-105 disabled:scale-100 disabled:opacity-50"
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verify & Sign in
                    </>
                  )}
                </Button>
              )}

              {/* Send Reset Link Button - for forgot password */}
              {!isSignUp && loginMethod === "forgot" && (
                <Button
                  className="w-full h-10 sm:h-12 text-sm font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-xl shadow-orange-500/25 transition-all duration-300 rounded-lg sm:rounded-xl hover:scale-105 disabled:scale-100 disabled:opacity-50"
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading || !email || !validateEmail(email) || !forgotEmailExists || checkingForgotEmail}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : checkingForgotEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              )}

              {/* <Button 
                variant="link" 
                type="button"
                className="w-full h-8 text-xs sm:text-sm"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setUsername('');
                  setEmail('');
                  setPassword('');
                  setRole('tester');
                }}
              >
                {isSignUp 
                  ? "Already have an account? Sign in" 
                  : "Don't have an account? Sign up"
                }
              </Button> */}
            </CardFooter>
          </form>
        </Card>

        {/* Enhanced Footer */}
        <div className="mt-1 sm:mt-2 text-center space-y-2">
          <div className="flex justify-center gap-4 text-xs">
            <button
              onClick={() => setShowPrivacyPolicy(true)}
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              Privacy Policy
            </button>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <button
              onClick={() => setShowTermsOfUse(true)}
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              Terms of Use
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © 2025 BugRicer. All rights reserved.
          </p>
        </div>
      </div>

      {/* Privacy Policy Dialog */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Privacy Policy
              </h2>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200 flex-shrink-0"
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
            <div className="flex justify-end p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
              <Button
                onClick={() => setShowPrivacyPolicy(false)}
                className="px-6"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Use Dialog */}
      {showTermsOfUse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Terms of Use
              </h2>
              <button
                onClick={() => setShowTermsOfUse(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200 flex-shrink-0"
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
            <div className="flex justify-end p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
              <Button
                onClick={() => setShowTermsOfUse(false)}
                className="px-6"
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

