"use client";

import { useChainId } from 'wagmi';
import dynamic from 'next/dynamic';
import { getTournamentContract } from "@/lib/contracts";
import { GameLoader } from "@/components/game-loader";

// Dynamically import CeloRidersGame with SSR disabled (Phaser needs browser APIs)
const CeloRidersGame = dynamic(() => import("@/components/CeloRidersGame"), {
  ssr: false,
  loading: () => <GameLoader />,
});

export default function Home() {
  const chainId = useChainId();
  const contractAddress = getTournamentContract(chainId);

  return (
    <main className="flex-1 w-full h-screen overflow-hidden bg-black">
      <CeloRidersGame contractAddress={contractAddress} />
    </main>
  );
}
