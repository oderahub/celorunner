// Contract addresses for different networks

export const CONTRACTS = {
  DailyTournament: {
    // Celo Sepolia Testnet (chain ID: 11142220) - uses cUSD (0xdE9e...0aB00b)
    11142220: process.env.NEXT_PUBLIC_TOURNAMENT_CONTRACT_SEPOLIA as `0x${string}` || '0xcC36a406684c313f29848c2A0AfBdFc9A3B5503B',
    // Celo Mainnet
    42220: process.env.NEXT_PUBLIC_TOURNAMENT_CONTRACT_MAINNET as `0x${string}` || '0x0000000000000000000000000000000000000000',
  }
} as const;

// Helper to get contract address for current chain
export function getTournamentContract(chainId: number): `0x${string}` {
  return CONTRACTS.DailyTournament[chainId as keyof typeof CONTRACTS.DailyTournament] ||
         CONTRACTS.DailyTournament[11142220]; // Default to Celo Sepolia
}
