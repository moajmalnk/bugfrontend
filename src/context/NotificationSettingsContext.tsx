import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ENV } from "@/lib/env";
import { useAuth } from "./AuthContext";

type NotificationSettingsContextType = {
  emailNotificationsEnabled: boolean;
  refreshGlobalSettings: () => void;
  isLoading: boolean;
};

// Define a type for the API response structure
interface ApiResponse {
  data: {
    email_notifications_enabled: boolean;
  };
}

const NotificationSettingsContext = createContext<NotificationSettingsContextType | undefined>(undefined);

export const NotificationSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  const refreshGlobalSettings = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<ApiResponse>(`${ENV.API_URL}/settings/get.php`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          '_': new Date().getTime()
        }
      });

      if (response.data && typeof response.data.data.email_notifications_enabled === 'boolean') {
        setEmailNotificationsEnabled(response.data.data.email_notifications_enabled);
      }
    } catch (error) {
      //console.error("Failed to fetch global notification settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshGlobalSettings();
  }, [refreshGlobalSettings]);

  return (
    <NotificationSettingsContext.Provider value={{
      emailNotificationsEnabled,
      refreshGlobalSettings,
      isLoading,
    }}>
      {children}
    </NotificationSettingsContext.Provider>
  );
};

export const useNotificationSettings = () => {
  const context = useContext(NotificationSettingsContext);
  if (context === undefined) {
    throw new Error('useNotificationSettings must be used within a NotificationSettingsProvider');
  }
  return context;
};
