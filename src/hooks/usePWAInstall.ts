import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Store globally so it persists across component mounts/navigations
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;

// Capture the event as early as possible (runs once on module load)
if (typeof window !== 'undefined') {
  if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
    globalIsInstalled = true;
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    console.log('[PWA] beforeinstallprompt captured');
  });

  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    console.log('[PWA] App installed');
  });
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(globalIsInstalled);

  useEffect(() => {
    // Sync with global state on mount
    if (globalDeferredPrompt && !deferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }
    if (globalIsInstalled && !isInstalled) {
      setIsInstalled(true);
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      globalIsInstalled = true;
      globalDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const hasNativePrompt = !!deferredPrompt;

  const install = useCallback(async () => {
    const prompt = globalDeferredPrompt;
    if (!prompt) return false;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      globalIsInstalled = true;
      globalDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }

    return false;
  }, []);

  // Show install option when: not installed AND (has native prompt OR is on iOS/Android in browser)
  const isInBrowser = !globalIsInstalled && !window.matchMedia('(display-mode: standalone)').matches;
  const showInstall = isInBrowser && !isInstalled;

  return {
    canInstall: showInstall,
    hasNativePrompt,
    isInstalled,
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    install,
  };
}
