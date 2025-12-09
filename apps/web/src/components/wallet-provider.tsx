"use client";

import { RainbowKitProvider, connectorsForWallets } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, http, useConnect, useAccount } from "wagmi";
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
  // CRUCIAL FOR MINIPAY (Dec 2025)
  pollingInterval: 4_000,
  // Prevents wagmi from thinking no wallet is present
  syncConnectedChain: true,
});

const queryClient = new QueryClient();

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isConnected || attempted) return;

    const tryConnectMiniPay = async () => {
      if (typeof window === "undefined" || !window.ethereum) return;

      // THIS IS THE KEY: MiniPay requires manual activation (Dec 2025)
      if ((window.ethereum as any)?.isMiniPay) {
        try {
          console.log("✅ MiniPay detected — forcing eth_requestAccounts");

          // This wakes up MiniPay and makes it behave like a real provider
          await window.ethereum.request({ method: "eth_requestAccounts" });

          // Now find and connect the injected connector
          const injected = connectors.find(
            (c) => c.id === "injected" || c.type === "injected"
          );

          if (injected) {
            await connect({ connector: injected });
            console.log("✅ Successfully connected to MiniPay!");
          }
        } catch (err: any) {
          // User rejected or something went wrong
          console.warn("⚠️ MiniPay connection failed or rejected:", err.message);
        } finally {
          setAttempted(true);
        }
      }
    };

    // Try immediately
    tryConnectMiniPay();

    // Also try again after a delay (in case provider loads late)
    const timer = setTimeout(tryConnectMiniPay, 800);

    return () => clearTimeout(timer);
  }, [connect, connectors, isConnected, attempted]);

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
