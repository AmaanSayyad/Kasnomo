'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useOverflowStore } from '@/lib/store';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Custom Components
import { WalletConnectModal } from '@/components/wallet/WalletConnectModal';

/**
 * Wallet Sync component for Kaspa
 * Handles automatic reconnection for KasWare wallet
 */
function WalletSync() {
  const {
    setAddress,
    setIsConnected,
    setNetwork,
    refreshWalletBalance,
    fetchBalance,
    preferredNetwork
  } = useOverflowStore();

  useEffect(() => {
    const syncKaspa = async () => {
      if (typeof window === 'undefined') return;

      const kasware = (window as any).kasware;
      if (!kasware) return;

      try {
        const accounts = await kasware.getAccounts();
        if (accounts && accounts.length > 0 && preferredNetwork === 'KAS') {
          const address = accounts[0];
          setAddress(address);
          setIsConnected(true);
          setNetwork('KAS');
          
          // Fetch both wallet and house balance
          refreshWalletBalance();
          if (fetchBalance) {
            fetchBalance(address);
          }
        }
      } catch (err) {
        console.error('Kaspa sync error:', err);
      }
    };

    syncKaspa();

    // Listen for account changes
    if (typeof window !== 'undefined' && (window as any).kasware) {
      (window as any).kasware.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          const address = accounts[0];
          setAddress(address);
          setIsConnected(true);
          setNetwork('KAS');
          
          // Fetch both wallet and house balance
          refreshWalletBalance();
          if (fetchBalance) {
            fetchBalance(address);
          }
        } else {
          setAddress(null);
          setIsConnected(false);
          setNetwork(null);
        }
      });
    }
  }, [preferredNetwork, setAddress, setIsConnected, setNetwork, refreshWalletBalance, fetchBalance]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeApp = async () => {
      try {
        const { updateAllPrices, loadTargetCells, startGlobalPriceFeed } = useOverflowStore.getState();

        await loadTargetCells().catch(console.error);
        const stopPriceFeed = startGlobalPriceFeed(updateAllPrices);
        setIsReady(true);
        return () => { if (stopPriceFeed) stopPriceFeed(); };
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WalletSync />
      {children}
      <WalletConnectModal />
      <ToastProvider />
    </QueryClientProvider>
  );
}

