// Deployment module for DailyTournament contract
// Deploys the daily skateboarding game tournament with cUSD staking

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DailyTournamentModule = buildModule("DailyTournamentModule", (m) => {
  // cUSD token address on Celo Sepolia testnet (ACTIVE with 697+ transactions)
  // Source: https://sepolia.celoscan.io/address/0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b
  const cUSDAddress = "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b";

  // Deploy the DailyTournament contract with cUSD address
  const dailyTournament = m.contract("DailyTournament", [cUSDAddress]);

  return { dailyTournament };
});

export default DailyTournamentModule;
