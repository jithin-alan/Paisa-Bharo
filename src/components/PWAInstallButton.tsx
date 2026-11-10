import React, { useState } from 'react';
import { Download, Share, PlusSquare, CheckCircle, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  variant?: 'nav' | 'banner' | 'settings';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'nav' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#ffc800] bg-[#220c45] border border-[#5e17eb]/60 rounded-xl">
          <CheckCircle className="w-4 h-4 text-[#ffc800]" />
          <span>Paisa Bharo PWA Installed</span>
        </div>
      );
    }
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-[#290a57] via-[#1a0838] to-[#120526] border border-[#ffc800]/40 shadow-2xl text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffc800]/20 border border-[#ffc800]/40 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#ffc800]" />
              </div>
              <div>
                <h4 className="font-black text-sm">Install Paisa Bharo App</h4>
                <p className="text-xs text-purple-200/80">Play offline, get instant poll notifications & zero-delay payouts.</p>
              </div>
            </div>
            <button
              onClick={install}
              className="px-4 py-2 bg-[#ffc800] hover:bg-[#ffe043] text-gray-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 bg-[#ffc800] hover:bg-[#ffe043] text-gray-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
        title="Install as Progressive Web App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'banner' ? (
          <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-[#290a57] via-[#1a0838] to-[#120526] border border-[#ffc800]/40 shadow-2xl text-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ffc800]/20 border border-[#ffc800]/40 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-[#ffc800]" />
                </div>
                <div>
                  <h4 className="font-black text-sm">Install on iPhone / iPad</h4>
                  <p className="text-xs text-purple-200/80">Tap to see quick 2-step home screen installation guide.</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(true)}
                className="px-3.5 py-2 bg-[#ffc800] text-gray-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
              >
                <Share className="w-3.5 h-3.5" />
                <span>Guide</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 bg-[#25104d] hover:bg-[#321666] border border-[#5e17eb] text-[#ffc800] text-xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
            title="Install on iPhone / iPad"
          >
            <Share className="w-3.5 h-3.5" />
            <span>Install on iOS</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#14082b] border border-[#5e17eb] p-6 shadow-2xl text-white relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#ffc800]/20 border border-[#ffc800]/40 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-[#ffc800]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Install on iOS Safari</h3>
                  <p className="text-xs text-purple-300">Get the full native PWA experience</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-300 mb-6 bg-[#1f0c3d] p-4 rounded-xl border border-[#3b1970]">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#ffc800] text-gray-950 font-black flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    Tap the <strong className="text-white flex items-center gap-1 inline-flex">Share <Share className="w-3.5 h-3.5 inline text-[#ffc800]" /></strong> icon on your Safari bottom bar.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#ffc800] text-gray-950 font-black flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    Scroll down and select <strong className="text-white flex items-center gap-1 inline-flex"><PlusSquare className="w-3.5 h-3.5 inline text-[#ffc800]" /> Add to Home Screen</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#ffc800] text-gray-950 font-black flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    Tap <strong className="text-[#ffc800]">Add</strong> in the top-right corner. Paisa Bharo is now ready on your home screen!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#ffc800] hover:bg-[#ffe043] font-black text-gray-950 text-xs transition cursor-pointer shadow-md"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={() => {
        alert('To install Paisa Bharo, tap the install button in your browser address bar or menu (Install Paisa Bharo).');
      }}
      className="hidden sm:flex items-center gap-1.5 bg-[#25104d] hover:bg-[#321666] border border-[#5e17eb] text-[#ffc800] text-xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install PWA</span>
    </button>
  );
};
