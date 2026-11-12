import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { getTranslation } from '../services/i18n';

interface Props {
  language: string;
}

export const OfflineIndicator: React.FC<Props> = ({ language }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <aside aria-label="Connectivity Status" className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 flex items-center gap-2.5 rounded-xl bg-[#fb8500]/95 backdrop-blur-md px-3.5 py-2.5 text-xs font-semibold text-white shadow-2xl border border-[#ffd099]">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
      </span>
      <WifiOff className="w-4 h-4 shrink-0" />
      <span className="flex-1">{getTranslation(language, 'offlineMode')}</span>
    </aside>
  );
};
