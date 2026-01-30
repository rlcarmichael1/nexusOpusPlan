import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { LayoutMode, ToastMessage, ToastType } from '../types';

/**
 * UI State Interface
 */
interface UIState {
  layoutMode: LayoutMode;
  sidebarCollapsed: boolean;
  toasts: ToastMessage[];
}

/**
 * UI Context Interface
 */
interface UIContextType extends UIState {
  setLayoutMode: (mode: LayoutMode) => void;
  toggleSidebar: () => void;
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

/**
 * Detect layout mode from window size or embedding context
 */
function detectLayoutMode(): LayoutMode {
  // Check for parent frame (embedded in another app)
  if (window.parent !== window) {
    return 'sidebar';
  }
  
  // Check for custom data attribute
  const embedded = document.documentElement.dataset.embedded;
  if (embedded === 'true') {
    return 'sidebar';
  }
  
  // Check window width
  if (window.innerWidth < 800) {
    return 'sidebar';
  }
  
  return 'standalone';
}

/**
 * Create context
 */
const UIContext = createContext<UIContextType | undefined>(undefined);

/**
 * UI Provider Component
 */
interface UIProviderProps {
  children: ReactNode;
  initialLayoutMode?: LayoutMode;
}

export function UIProvider({ children, initialLayoutMode }: UIProviderProps) {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(
    initialLayoutMode || detectLayoutMode()
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /**
   * Update layout mode on window resize
   */
  useEffect(() => {
    if (initialLayoutMode) return; // Don't auto-detect if explicitly set

    const handleResize = () => {
      const detected = detectLayoutMode();
      setLayoutModeState(detected);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialLayoutMode]);

  /**
   * Set layout mode manually
   */
  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
  }, []);

  /**
   * Toggle sidebar collapsed state
   */
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  /**
   * Add a toast notification
   */
  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const toast: ToastMessage = { id, message, type, duration };

      setToasts((prev) => [...prev, toast]);

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  /**
   * Remove a toast notification
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Clear all toasts
   */
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value: UIContextType = {
    layoutMode,
    sidebarCollapsed,
    toasts,
    setLayoutMode,
    toggleSidebar,
    addToast,
    removeToast,
    clearToasts,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/**
 * Custom hook to use UI context
 */
export function useUI(): UIContextType {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

export default UIContext;
