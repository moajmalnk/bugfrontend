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
  login: (username: string, password: string) => Promise<boolean>;
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
    if (path !== '/login') {
      localStorage.setItem('intendedDestination', path);
    }
  };

  const checkAuthStatus = async () => {
    const token = localStorage.getItem("token");
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
        setCurrentUser(null);
      }
    } catch (error) {
      // console.error("Auth check error:", error);
      localStorage.removeItem("token");
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
    username: string,
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
          username,
          password,
        }),
      });

      const data = await response.json();
      // // console.log('Login response:', data);

      if (data.success && data.data?.token) {
        localStorage.setItem("token", data.data.token);
        setCurrentUser(data.data.user);
        
        // Get the intended destination or default to /projects
        const intendedDestination = localStorage.getItem('intendedDestination') || '/projects';
        localStorage.removeItem('intendedDestination'); // Clear the stored destination
        navigate(intendedDestination, { replace: true });
        return true;
      }

      // Show error message if available
      if (data.message) {
        toast({
          title: "Login failed",
          description: data.message,
          variant: "destructive",
        });
      }

      return false;
    } catch (error) {
      // console.error("Login error:", error);
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
        setCurrentUser(result.data.user);
        navigate("/projects", { replace: true });
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
    setCurrentUser(null);
    navigate("/login", { replace: true });
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
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