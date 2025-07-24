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
import { AlertCircle, BugIcon, Key, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type LoginMethod = "username" | "email" | "otp";

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
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center">
          <BugIcon className="h-10 w-10 sm:h-12 sm:w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-sm sm:text-base text-muted-foreground">
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
        toast({
          title: "OTP Sent",
          description:
            otpMethod === "mail"
              ? "A one-time password has been sent to your email"
              : "A one-time password has been sent to your WhatsApp",
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
        // Set token and user in localStorage/sessionStorage
        // localStorage.setItem("token", data.token); // Remove this line
        // Use the correct variables already set above
        // localStorage.setItem("token", token); // If you have a token variable
        // No need to set again if already set
        // Optionally, update context state if needed
        // Call a context method to set currentUser and isAuthenticated
        // Then navigate
        // navigate(`/${user.role}/projects`, { replace: true }); // This line is removed
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

  const handleMethodChange = (method: LoginMethod) => {
    setLoginMethod(method);
    setUsername("");
    setEmail("");
    setPassword("");
    setOtp("");
    setOtpSent(false);
    setOtpCountdown(0);
  };

  const isFormValid = () => {
    switch (loginMethod) {
      case "username":
        return username.trim() && password.trim();
      case "email":
        return email.trim() && password.trim() && validateEmail(email);
      case "otp":
        if (otpMethod === "mail") {
          return (
            email.trim() &&
            validateEmail(email) &&
            otpSent &&
            otp.trim() &&
            validateOtp(otp)
          );
        } else {
          // WhatsApp
          return (
            phone.trim() &&
            phone.length >= 8 && // or your minimum phone length
            otpSent &&
            otp.trim() &&
            validateOtp(otp)
          );
        }
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
    } catch (error) {
      setUserExists(false);
      toast({
        title: "Error",
        description: "Failed to check user existence.",
        variant: "destructive",
      });
    } finally {
      setCheckingUser(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-2">
            <BugIcon className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">BugRacer</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track bugs, ship faster
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl sm:text-2xl">
              {isSignUp ? "Create Account" : "Sign in"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isSignUp
                ? "Fill in your details to create a new account"
                : "Choose your preferred login method"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
            <CardContent className="space-y-3 sm:space-y-4">
              {/* Login Method Selection */}
              {!isSignUp && (
                <div className="space-y-2">
                  <Label className="text-sm">Login Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleMethodChange("username")}
                      className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs transition-colors ${
                        loginMethod === "username"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted/50"
                      }`}
                    >
                      <User className="h-3 w-3" />
                      Username
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMethodChange("email")}
                      className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs transition-colors ${
                        loginMethod === "email"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted/50"
                      }`}
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMethodChange("otp")}
                      className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs transition-colors ${
                        loginMethod === "otp"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted/50"
                      }`}
                    >
                      <Key className="h-3 w-3" />
                      OTP
                    </button>
                  </div>
                </div>
              )}

              {/* Username Field */}
              {loginMethod === "username" && !isSignUp && (
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-sm">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter Your Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* Email Field for Email login or SignUp only */}
              {(loginMethod === "email" || isSignUp) && (
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => {
                      if (validateEmail(email)) checkUserExists("email", email);
                    }}
                    required
                    disabled={isSignUp}
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* Password Field */}
              {(loginMethod === "username" ||
                loginMethod === "email" ||
                isSignUp) && (
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-sm">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* OTP Section */}
              {loginMethod === "otp" && !isSignUp && (
                <div className="space-y-3">
                  {/* OTP Method Toggle */}
                  <div className="flex w-full gap-2 mb-2">
                    <Button
                      type="button"
                      variant={otpMethod === "mail" ? "default" : "outline"}
                      onClick={() => setOtpMethod("mail")}
                      className={`flex-1 rounded-r-none ${
                        otpMethod === "mail" ? "" : "border"
                      }`}
                      style={{
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                      }}
                    >
                      Mail
                    </Button>
                    <Button
                      type="button"
                      variant={otpMethod === "whatsapp" ? "default" : "outline"}
                      onClick={() => setOtpMethod("whatsapp")}
                      className={`flex-1 rounded-l-none ${
                        otpMethod === "whatsapp" ? "" : "border"
                      }`}
                      style={{
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                      }}
                    >
                      WhatsApp
                    </Button>
                  </div>
                  {/* Input for email or phone */}
                  {otpMethod === "mail" ? (
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter Your Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => {
                        if (validateEmail(email))
                          checkUserExists("email", email);
                      }}
                      required
                      className="h-9 text-sm"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className="px-3 py-2 border border-input rounded-l-md text-sm bg-input"
                        style={{ borderRight: 0 }}
                      >
                        +91
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="Enter 10-digit number"
                        value={phone}
                        onChange={(e) =>
                          setPhone(
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        onBlur={() => {
                          if (phone.length === 10)
                            checkUserExists("phone", "+91" + phone);
                        }}
                        required
                        className="h-9 text-sm flex-1 border border-input rounded-r-md px-3 bg-input text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ borderLeft: 0 }}
                        maxLength={10}
                        pattern="\d{10}"
                        inputMode="numeric"
                      />
                    </div>
                  )}
                  {/* Send OTP Button */}
                  {!otpSent ? (
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={
                        otpMethod === "mail"
                          ? !email ||
                            !validateEmail(email) ||
                            isSendingOtp ||
                            !userExists
                          : !phone ||
                            phone.length < 10 ||
                            isSendingOtp ||
                            !userExists
                      }
                      className="w-full h-9 text-sm"
                      variant="outline"
                    >
                      {isSendingOtp ? "Sending..." : "Send OTP"}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="otp" className="text-sm">
                          One-Time Password
                        </Label>
                        {otpCountdown > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Expires in {otpCountdown}s
                          </span>
                        )}
                      </div>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        required
                        maxLength={6}
                        className="h-9 text-sm"
                      />
                      {otpCountdown === 0 && otpSent && (
                        <Button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={
                            !email || !validateEmail(email) || isSendingOtp
                          }
                          className="w-full h-9 text-sm"
                          variant="outline"
                        >
                          {isSendingOtp ? "Sending..." : "Resend OTP"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sign Up Fields */}
              {isSignUp && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="role" className="text-sm">
                      Role
                    </Label>
                    <select
                      id="role"
                      className="w-full h-9 text-sm border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md border px-3"
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

                  <Alert
                    variant="default"
                    className="bg-muted/50 text-foreground border-primary/20"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-medium">
                      Registration Disabled
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      This platform will allow external users within a few days.
                      It is currently for testing purposes only.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-2 pt-2">
              <Button
                className="w-full h-9 text-sm"
                type="submit"
                disabled={isLoading || isSignUp || !isFormValid()}
              >
                {isLoading
                  ? isSignUp
                    ? "Creating account..."
                    : "Signing in..."
                  : isSignUp
                  ? "Create Account"
                  : "Sign in"}
              </Button>

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

        {/* <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-xs sm:text-sm">First time here?</h3>
              <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Create a new account to start tracking bugs with BugRacer.
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
