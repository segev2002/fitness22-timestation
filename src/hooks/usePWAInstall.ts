import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export interface PWAInstallState {
  // Can the app be installed (prompt available)
  canInstall: boolean;
  // Is the app already installed/running as PWA
  isInstalled: boolean;
  // Is this iOS Safari (needs manual install instructions)
  isIOSSafari: boolean;
  // Show iOS install modal
  showIOSModal: boolean;
  // Trigger the install prompt
  installApp: () => Promise<void>;
  // Show iOS instructions modal
  showIOSInstructions: () => void;
  // Hide iOS instructions modal
  hideIOSInstructions: () => void;
}

export const usePWAInstall = (): PWAInstallState => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Detect if running in standalone mode (already installed)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running as PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    // Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Capture the beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app was installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Detect iOS Safari
  const isIOSSafari = useCallback((): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    
    return isIOS && isSafari;
  }, []);

  // Trigger install prompt
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      // If no prompt available, might be iOS
      if (isIOSSafari()) {
        setShowIOSModal(true);
      }
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      // Clear the deferred prompt - can only be used once
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  }, [deferredPrompt, isIOSSafari]);

  const showIOSInstructions = useCallback(() => {
    setShowIOSModal(true);
  }, []);

  const hideIOSInstructions = useCallback(() => {
    setShowIOSModal(false);
  }, []);

  return {
    canInstall: deferredPrompt !== null,
    isInstalled,
    isIOSSafari: isIOSSafari(),
    showIOSModal,
    installApp,
    showIOSInstructions,
    hideIOSInstructions,
  };
};
