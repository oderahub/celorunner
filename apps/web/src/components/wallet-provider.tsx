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
  const { connect, connectors } = useConnect();
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    // Prevent multiple attempts
    if (hasAttempted) return;

    const attemptMiniPayConnect = () => {
      if (typeof window === "undefined" || !window.ethereum) return false;

      // CRITICAL: MiniPay identifies itself like this
      const isMiniPay = (window.ethereum as any)?.isMiniPay;
      if (isMiniPay) {
        console.log("✅ MiniPay detected! Attempting auto-connect...");

        // Find injected connector (RainbowKit creates it with id: "injected")
        const injected = connectors.find(c => c.id === "injected" || c.name === "Injected");

        if (injected && (injected as any).ready) {
          setHasAttempted(true);
          connect({ connector: injected });
          console.log("✅ Auto-connect to MiniPay successful");
          return true;
        } else {
          console.log("⏳ MiniPay found but connector not ready yet...", {
            hasInjected: !!injected,
            ready: (injected as any)?.ready,
            connectorsCount: connectors.length
          });
        }
      }
      return false;
    };

    // Try immediately
    if (attemptMiniPayConnect()) return;

    // If not ready yet, poll aggressively (MiniPay provider loads async)
    const interval = setInterval(() => {
      if (attemptMiniPayConnect()) {
        clearInterval(interval);
      }
    }, 300);

    // Cleanup after 10 seconds max
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!hasAttempted) {
        console.warn("⚠️ MiniPay auto-connect timed out after 10s");
        setHasAttempted(true);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [connect, connectors, hasAttempted]);

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
