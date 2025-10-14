import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  colorBlind: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  lineHeight: 'tight' | 'normal' | 'relaxed';
  spacing: 'compact' | 'normal' | 'comfortable';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  resetSettings: () => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  setFocus: (elementId: string) => void;
  skipToContent: () => void;
}

const defaultSettings: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  screenReader: false,
  keyboardNavigation: false,
  focusVisible: true,
  colorBlind: 'none',
  fontSize: 'medium',
  lineHeight: 'normal',
  spacing: 'normal',
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load settings from localStorage or use defaults
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Detect system preferences
  useEffect(() => {
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
    };

    const handleChange = () => {
      setSettings(prev => ({
        ...prev,
        reducedMotion: mediaQueries.reducedMotion.matches,
        highContrast: mediaQueries.highContrast.matches,
      }));
    };

    // Set initial values
    handleChange();

    // Listen for changes
    mediaQueries.reducedMotion.addEventListener('change', handleChange);
    mediaQueries.highContrast.addEventListener('change', handleChange);

    return () => {
      mediaQueries.reducedMotion.removeEventListener('change', handleChange);
      mediaQueries.highContrast.removeEventListener('change', handleChange);
    };
  }, []);

  // Detect screen reader usage
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasScreenReader = !!(
        window.speechSynthesis ||
        window.navigator.userAgent.includes('NVDA') ||
        window.navigator.userAgent.includes('JAWS') ||
        window.navigator.userAgent.includes('VoiceOver') ||
        window.navigator.userAgent.includes('TalkBack')
      );
      
      setSettings(prev => ({ ...prev, screenReader: hasScreenReader }));
    };

    detectScreenReader();
  }, []);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--transition-duration', '0.01ms');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    // Apply high contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply large text
    if (settings.largeText) {
      root.style.fontSize = '1.125rem';
    } else {
      root.style.fontSize = '';
    }

    // Apply color blind support
    if (settings.colorBlind !== 'none') {
      root.classList.add(`colorblind-${settings.colorBlind}`);
    } else {
      root.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
    }

    // Apply font size
    const fontSizeMap = {
      small: '0.875rem',
      medium: '1rem',
      large: '1.125rem',
      'extra-large': '1.25rem',
    };
    root.style.setProperty('--base-font-size', fontSizeMap[settings.fontSize]);

    // Apply line height
    const lineHeightMap = {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    };
    root.style.setProperty('--base-line-height', lineHeightMap[settings.lineHeight]);

    // Apply spacing
    const spacingMap = {
      compact: '0.5rem',
      normal: '1rem',
      comfortable: '1.5rem',
    };
    root.style.setProperty('--base-spacing', spacingMap[settings.spacing]);

  }, [settings]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.screenReader) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      // Remove after announcement
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  };

  const setFocus = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const skipToContent = () => {
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const value: AccessibilityContextType = {
    settings,
    updateSetting,
    resetSettings,
    announceToScreenReader,
    setFocus,
    skipToContent,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Skip to content component
export const SkipToContent: React.FC = () => {
  const { skipToContent } = useAccessibility();

  return (
    <button
      onClick={skipToContent}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      tabIndex={1}
    >
      Skip to main content
    </button>
  );
};

// Screen reader only text component
export const ScreenReaderOnly: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <span className="sr-only" aria-hidden="false">
      {children}
    </span>
  );
};

// Focus trap component
export const FocusTrap: React.FC<{ 
  children: ReactNode; 
  active: boolean;
  onEscape?: () => void;
}> = ({ children, active, onEscape }) => {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape]);

  if (!active) return <>{children}</>;

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onEscape) {
          onEscape();
        }
      }}
    >
      {children}
    </div>
  );
};

export default AccessibilityProvider;
