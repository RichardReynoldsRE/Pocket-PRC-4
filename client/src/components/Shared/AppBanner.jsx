import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const DISMISS_KEY = 'prc_app_banner_dismissed';
const DISMISS_DAYS = 7;

function isMobileWeb() {
  if (Capacitor.isNativePlatform()) return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export default function AppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobileWeb()) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    // Small delay so the page loads first
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="bg-white border-t-2 border-brand-primary shadow-[0_-4px_20px_rgba(0,0,0,0.15)] px-4 py-3 mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          {/* App icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Smartphone size={24} className="text-white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900">Pocket PRC</p>
            <p className="text-xs text-gray-500">
              {isAndroid()
                ? 'Get the free Android app'
                : 'Get the app for a better experience'}
            </p>
          </div>

          {/* Download button */}
          <a
            href="/api/download/app"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm text-white flex-shrink-0 transition-colors"
            style={{ backgroundColor: 'var(--brand-primary)' }}
            onClick={dismiss}
          >
            <Download size={16} />
            Get App
          </a>

          {/* Close */}
          <button
            onClick={dismiss}
            className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
