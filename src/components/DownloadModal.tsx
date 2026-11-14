import React, { useState } from 'react';
import { CheckCircle2, Download, FileCode2, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DownloadModalProps {
  onClose: () => void;
}

function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const APK_BUILD_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail

# N RUNNER - Android APK Build Script (Capacitor)
# Run inside the N RUNNER project root with Node.js + Android Studio/SDK installed.

npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build

if [ ! -d "android" ]; then
  npx cap add android
fi

npx cap sync android
cd android
./gradlew assembleDebug

echo "APK generated at: android/app/build/outputs/apk/debug/app-debug.apk"
`;

export const DownloadModal: React.FC<DownloadModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } = usePWAInstall();
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [downloadedScript, setDownloadedScript] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      setInstallMessage(
        accepted
          ? 'N RUNNER installed! Launch it from your home screen or app launcher.'
          : 'Install cancelled. You can install anytime from this menu.',
      );
      return;
    }

    if (isIOS) {
      setInstallMessage(
        'In Safari, tap the Share button at the bottom, then choose "Add to Home Screen".',
      );
    } else if (isAndroid) {
      setInstallMessage(
        'Open this game URL in Chrome, tap the 3-dot menu (⋮), and tap "Install app" or "Add to Home screen".',
      );
    } else if (isInIframe) {
      setInstallMessage(
        'Open the app URL directly in Chrome or Edge (outside preview frame) and click the Install icon in the address bar.',
      );
    } else {
      setInstallMessage(
        'Click the Install icon in your browser address bar or open browser menu → "Install N RUNNER".',
      );
    }
  };

  const handleDownloadApkScript = () => {
    triggerFileDownload('build-n-runner-apk.sh', APK_BUILD_SCRIPT, 'text/x-shellscript');
    setDownloadedScript(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-400/35 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 id="download-modal-title" className="font-display text-xl font-bold text-white">
              Download N RUNNER
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Install for offline mobile & desktop play or export Android APK
            </p>
          </div>
          <button
            type="button"
            aria-label="Close download options"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Option 1: Direct PWA App Install */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-400/30 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  Install Game App (Android / iOS / PC)
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Adds N RUNNER directly to your home screen with offline caching and full-screen
                  gameplay.
                </p>
              </div>
            </div>

            {isInstalled ? (
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Installed on Device
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer"
              >
                <Download className="w-5 h-5" />
                {isInstallable ? 'Install N RUNNER Now' : 'Install / Add to Home Screen'}
              </button>
            )}

            {installMessage && (
              <p
                data-testid="install-guidance"
                className="text-xs text-amber-200 bg-slate-900 border border-amber-400/25 rounded-lg p-3 leading-relaxed"
              >
                {installMessage}
              </p>
            )}
          </div>

          {/* Option 2: Android APK Build Script Download */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/15 flex items-center justify-center shrink-0">
                <FileCode2 className="w-5 h-5 text-slate-200" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Android APK Build Script</div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Download the Capacitor APK build script (`build-n-runner-apk.sh`) to compile a
                  signed/debug `.apk` for Android phones.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadApkScript}
              className="w-full flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-semibold text-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              {downloadedScript ? 'Downloaded build-n-runner-apk.sh' : 'Download APK Build Script (.sh)'}
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
