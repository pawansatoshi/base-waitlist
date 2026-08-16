'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import sdk from '@farcaster/miniapp-sdk';

interface MiniAppContextValue {
  context: Awaited<typeof sdk.context> | null;
  isReady: boolean;
  isInMiniApp: boolean;
}

export const MiniAppContext = createContext<MiniAppContextValue | null>(null);

export function useMiniApp() {
  const context = useContext(MiniAppContext);
  if (!context) {
    throw new Error('useMiniApp must be used within MiniAppProvider');
  }
  return context;
}

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<Awaited<typeof sdk.context> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (cancelled) return;
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          const ctx = await sdk.context;
          if (cancelled) return;
          setContext(ctx);
          await sdk.actions.ready();
        }
      } catch (error) {
        console.error('Mini App initialization failed:', error);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    void init();
    return () => { cancelled = true; };
  }, []);

  return (
    <MiniAppContext.Provider value={{ context, isReady, isInMiniApp }}>
      {children}
    </MiniAppContext.Provider>
  );
}
