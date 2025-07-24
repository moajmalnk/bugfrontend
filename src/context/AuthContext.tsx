import { toast } from "@/components/ui/use-toast";
import { ENV } from "@/lib/env";
import { User } from "@/types";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithToken: (user: User, token: string) => void;
  logout: () => void;
  register: (data: RegisterData) => Promise<boolean>;
  updateCurrentUser: (user: User) => void;
  storeIntendedDestination: (path: string) => void;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = `${ENV.API_URL}/auth`;
const AUTH_ENDPOINTS = {
  login: `${API_URL}/login.php`,
  register: `${API_URL}/register.php`,
  me: `${API_URL}/me.php`,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const updateCurrentUser = (user: User) => {
    setCurrentUser(user);
  };

  const storeIntendedDestination = (path: string) => {
    if (path && path !== "/login") {
      localStorage.setItem("intendedDestination", path);
    }
  };

  const checkAuthStatus = async () => {
    // 1. Check for token in URL (for admin deep links)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");

    if (urlToken) {
      // Use the token from the URL and store it in sessionStorage for this tab only
      sessionStorage.setItem("token", urlToken);
      // Remove token from URL to keep it clean
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Prioritize sessionStorage token, then fall back to localStorage
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(AUTH_ENDPOINTS.me, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      // // console.log("Auth check response:", data);

      if (data.success && data.data) {
        setCurrentUser(data.data);
      } else {
        // console.error("Auth check failed:", data);
        localStorage.removeItem("token");
        sessionStorage.removeItem("token"); // Also clear from session storage
        setCurrentUser(null);
      }
    } catch (error) {
      // console.error("Auth check error:", error);
      localStorage.removeItem("token");
      sessionStorage.removeItem("token"); // Also clear from session storage
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Run auth check on mount and token change
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (
    identifier: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(AUTH_ENDPOINTS.login, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        localStorage.setItem("token", data.token);
        const user = data.user;
        setCurrentUser(user);

        // Get the intended destination or default to the user's role-specific projects page
        const intendedDestination =
          localStorage.getItem("intendedDestination") ||
          `/${user.role}/projects`;
        localStorage.removeItem("intendedDestination");
        navigate(intendedDestination, { replace: true });
        return true;
      }

      // Show error message for 401/400
      toast({
        title: "Login failed",
        description: data.message || "Invalid credentials",
        variant: "destructive",
      });

      return false;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to the server",
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      const response = await fetch(AUTH_ENDPOINTS.register, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.data?.token) {
        localStorage.setItem("token", result.data.token);
        const user = result.data.user;
        setCurrentUser(user);
        navigate(`/${user.role}/projects`, { replace: true });
        return true;
      }

      // Show error message if available
      if (result.message) {
        toast({
          title: "Registration failed",
          description: result.message,
          variant: "destructive",
        });
      }

      return false;
    } catch (error) {
      // console.error("Registration error:", error);
      toast({
        title: "Error",
        description: "Failed to connect to the server",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("intendedDestination");
    setCurrentUser(null);
    navigate("/login", { replace: true });
  };

  const loginWithToken = (user: User, token: string) => {
    localStorage.setItem("token", token);
    setCurrentUser(user);

    // Get the intended destination or default to the user's role-specific projects page
    const intendedDestination =
      localStorage.getItem("intendedDestination") || `/${user.role}/projects`;
    localStorage.removeItem("intendedDestination");
    navigate(intendedDestination, { replace: true });
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    loginWithToken,
    logout,
    register,
    updateCurrentUser,
    storeIntendedDestination,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
