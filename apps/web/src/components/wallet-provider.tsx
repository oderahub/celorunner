"use client";

import { RainbowKitProvider, connectorsForWallets } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, http, useConnect } from "wagmi";
import { celo } from "wagmi/chains";
import { defineChain } from "viem";

// Define Celo Sepolia testnet
export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'CELO',
    symbol: 'CELO',
  },
  rpcUrls: {
    default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
  },
  blockExplorers: {
    default: { name: 'CeloScan', url: 'https://sepolia.celoscan.io' },
  },
  testnet: true,
});

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet],
    },
  ],
  {
    appName: "CeloRiders",
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  }
);

const wagmiConfig = createConfig({
  chains: [celoSepolia, celo],
  connectors,
  transports: {
    [celoSepolia.id]: http(),
    [celo.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { connect, connectors, status, error } = useConnect();
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  // Monitor connection status and log results
  useEffect(() => {
    if (status === 'success' && connectionAttempted) {
      console.log('[MiniPay Auto-Connect] ✅ Connection successful!');
    } else if (status === 'error' && error) {
      console.error('[MiniPay Auto-Connect] ❌ Connection failed:', error);
      // Reset to allow retry
      setConnectionAttempted(false);
    }
  }, [status, error, connectionAttempted]);

  useEffect(() => {
    // Skip if already connected or attempting
    if (status === 'success' || status === 'pending' || connectionAttempted) {
      return;
    }

    const attemptConnect = () => {
      console.log('[MiniPay Auto-Connect] Checking for MiniPay...');
      console.log('[MiniPay Auto-Connect] window.ethereum exists:', !!window.ethereum);
      console.log('[MiniPay Auto-Connect] isMiniPay:', window.ethereum?.isMiniPay);
      console.log('[MiniPay Auto-Connect] Available connectors:', connectors.map(c => c.id));

      if (window.ethereum && window.ethereum.isMiniPay) {
        console.log('[MiniPay Auto-Connect] ✅ MiniPay detected! Auto-connecting...');

        const injectedConnector = connectors.find((c) => c.id === "injected");
        if (injectedConnector) {
          console.log('[MiniPay Auto-Connect] Found injected connector, connecting...');
          setConnectionAttempted(true);
          connect({ connector: injectedConnector });
        } else {
          console.error('[MiniPay Auto-Connect] ❌ No injected connector found!');
        }
        return true;
      }
      return false;
    };

    // Attempt 1: Try immediately
    if (attemptConnect()) {
      return;
    }

    // Attempt 2: Listen for ethereum#initialized event (standard for injected wallets)
    const handleEthereumInitialized = () => {
      console.log('[MiniPay Auto-Connect] ethereum#initialized event fired');
      attemptConnect();
    };
    window.addEventListener('ethereum#initialized', handleEthereumInitialized);

    // Attempt 3: Delayed retry for MiniPay (300ms is recommended in Celo docs)
    const retryTimeout = setTimeout(() => {
      console.log('[MiniPay Auto-Connect] Delayed retry...');
      attemptConnect();
    }, 300);

    // Attempt 4: Final retry after 1 second
    const finalRetryTimeout = setTimeout(() => {
      console.log('[MiniPay Auto-Connect] Final retry...');
      if (!connectionAttempted) {
        attemptConnect();
      }
    }, 1000);

    // Cleanup
    return () => {
      window.removeEventListener('ethereum#initialized', handleEthereumInitialized);
      clearTimeout(retryTimeout);
      clearTimeout(finalRetryTimeout);
    };
  }, [connect, connectors, status, connectionAttempted]);

  return <>{children}</>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <WalletProviderInner>{children}</WalletProviderInner>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
