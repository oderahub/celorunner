"use client";

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConfig } from 'wagmi';
import { parseEther } from 'viem';
import { readContract } from 'wagmi/actions';
import { useMiniPay } from '@/hooks/useMiniPay';
import { StakeModal } from './StakeModal';
import { ScoreSubmitModal } from './ScoreSubmitModal';
import { NotificationModal } from './NotificationModal';

// Import game scenes
import Preload from '../game/scenes/Preload';
import Splash1 from '../game/scenes/Splash1';
import Splash2 from '../game/scenes/Splash2';
import Splash3 from '../game/scenes/Splash3';
import Splash4 from '../game/scenes/Splash4';
import Splash5 from '../game/scenes/Splash5';
import MainMenu from '../game/scenes/MainMenu';
import CharacterSelect from '../game/scenes/CharacterSelect';
import Game from '../game/scenes/Game';
import GameOver from '../game/scenes/GameOver';
import OptionsMenu from '../game/scenes/OptionsMenu';
import HowToPlay from '../game/scenes/HowToPlay';
import Leaderboard from '../game/scenes/Leaderboard';

// ✅ FIXED: Active cUSD token address on Celo Sepolia testnet
const CUSD_ADDRESS = '0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b' as const;

// ERC20 ABI for cUSD approval
const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// DailyTournament contract ABI
const DAILY_TOURNAMENT_ABI = [
  {
    inputs: [],
    name: "payEntry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "score", type: "uint256" }],
    name: "submitScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getCurrentLeaderboard",
    outputs: [
      {
        components: [
          { internalType: "address", name: "playerAddress", type: "address" },
          { internalType: "uint256", name: "score", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" }
        ],
        internalType: "struct DailyTournament.Player[10]",
        name: "",
        type: "tuple[10]"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

interface CeloRidersGameProps {
  contractAddress: `0x${string}`;
}

export default function CeloRidersGame({ contractAddress }: CeloRidersGameProps) {
  // ✅ FIXED: Use new contract address
  const CORRECT_CONTRACT_ADDRESS = '0xcC36a406684c313f29848c2A0AfBdFc9A3B5503B' as const;
  contractAddress = CORRECT_CONTRACT_ADDRESS;

  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStaked, setHasStaked] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({ show: false, title: '', message: '', type: 'info' });

  const { address, isConnected, chain } = useAccount();
  const { writeContract: approveToken, data: approveHash, error: approveError } = useWriteContract();
  const { writeContract: payEntry, data: payEntryHash, error: payEntryError } = useWriteContract();
  const { writeContract: submitScore, data: submitScoreHash, error: submitScoreError } = useWriteContract();
  const { isMiniPay } = useMiniPay();
  const config = useConfig();

  // Debug: Log any transaction errors
  useEffect(() => {
    if (approveError) {
      console.error('[STAKING] ❌ Approve error:', approveError);
      setNotification({
        show: true,
        title: 'Approval Failed',
        message: approveError.message || 'Failed to approve cUSD',
        type: 'error'
      });
    }
  }, [approveError]);

  useEffect(() => {
    if (payEntryError) {
      console.error('[STAKING] ❌ PayEntry error:', payEntryError);
      setNotification({
        show: true,
        title: 'Payment Failed',
        message: payEntryError.message || 'Failed to pay entry fee',
        type: 'error'
      });
    }
  }, [payEntryError]);

  useEffect(() => {
    if (submitScoreError) {
      console.error('[SCORE] ❌ Submit error:', submitScoreError);
      setNotification({
        show: true,
        title: 'Score Submission Failed',
        message: submitScoreError.message || 'Failed to submit score',
        type: 'error'
      });
    }
  }, [submitScoreError]);

  // Debug: Log current chain
  useEffect(() => {
    if (chain) {
      console.log('[NETWORK] 🌐 Connected to:', chain.id, chain.name);
      if (chain.id !== 11142220 && chain.id !== 42220) {
        console.warn('[NETWORK] ⚠️ Wrong network! Expected Celo Sepolia (11142220) or Celo Mainnet (42220)');
        setNotification({
          show: true,
          title: 'Wrong Network',
          message: 'Please switch to Celo Sepolia Testnet in MiniPay settings',
          type: 'warning'
        });
      }
    }
  }, [chain]);

  const { isLoading: isApproving, isSuccess: hasApproved } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Debug: Track approve transaction state
  useEffect(() => {
    if (approveHash) {
      console.log('[STAKING] 📊 Approve hash received:', approveHash);
      console.log('[STAKING] 📊 isApproving:', isApproving, 'hasApproved:', hasApproved);
    }
  }, [approveHash, isApproving, hasApproved]);

  // Load staking status from localStorage on mount
  useEffect(() => {
    if (address) {
      const storageKey = `hasStaked_${address}_${contractAddress}`;
      const stored = localStorage.getItem(storageKey);
      if (stored === 'true') {
        console.log('[STAKING] 💾 Found existing stake in localStorage');
        setHasStaked(true);
      }
    }
  }, [address, contractAddress]);

  const { isLoading: isPayingEntry, isSuccess: hasEntryPaid } = useWaitForTransactionReceipt({
    hash: payEntryHash,
  });

  // Debug: Track payEntry transaction state
  useEffect(() => {
    if (payEntryHash) {
      console.log('[STAKING] 📊 PayEntry hash received:', payEntryHash);
      console.log('[STAKING] 📊 isPayingEntry:', isPayingEntry, 'hasEntryPaid:', hasEntryPaid);
    }
  }, [payEntryHash, isPayingEntry, hasEntryPaid]);

  const { isLoading: isSubmittingOnChain, isSuccess: hasScoreSubmitted } = useWaitForTransactionReceipt({
    hash: submitScoreHash,
  });

  // Handle successful cUSD approval - automatically call payEntry
  useEffect(() => {
    if (hasApproved && approveHash) {
      console.log('[STAKING] ✅ cUSD approved! Hash:', approveHash);
      console.log('[STAKING] 🔄 Checking allowance before calling payEntry...');

      // Add a small delay to ensure approval is propagated on-chain
      const checkAllowanceAndPay = async () => {
        try {
          // Wait a bit for the approval to be fully propagated
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Check the balance first
          const balance = await readContract(config, {
            address: CUSD_ADDRESS,
            abi: [{
              inputs: [{ name: "account", type: "address" }],
              name: "balanceOf",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function"
            }],
            functionName: 'balanceOf',
            args: [address!]
          });

          const balanceInCUSD = parseFloat(balance.toString()) / 1e18;
          console.log('[STAKING] 💰 cUSD Balance:', balanceInCUSD, 'cUSD');

          if (balanceInCUSD < 1) {
            console.error('[STAKING] ❌ Insufficient balance:', balanceInCUSD);
            setNotification({
              show: true,
              title: 'Insufficient Balance',
              message: `You need at least 1 cUSD. Current balance: ${balanceInCUSD.toFixed(2)} cUSD`,
              type: 'error'
            });
            return;
          }

          // Check the allowance
          const allowance = await readContract(config, {
            address: CUSD_ADDRESS,
            abi: [{
              inputs: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" }
              ],
              name: "allowance",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function"
            }],
            functionName: 'allowance',
            args: [address!, contractAddress]
          });

          const allowanceInCUSD = parseFloat(allowance.toString()) / 1e18;
          console.log('[STAKING] 💰 Allowance:', allowanceInCUSD, 'cUSD');

          if (allowanceInCUSD < 1) {
            console.error('[STAKING] ❌ Allowance too low:', allowanceInCUSD);
            setNotification({
              show: true,
              title: 'Approval Incomplete',
              message: `Approval not sufficient. Please try again. Current allowance: ${allowanceInCUSD} cUSD`,
              type: 'error'
            });
            return;
          }

          console.log('[STAKING] ✅ Allowance confirmed, calling payEntry...');
          // ✅ FIXED: Use legacy transaction format with feeCurrency
          payEntry({
            address: contractAddress,
            abi: DAILY_TOURNAMENT_ABI,
            functionName: 'payEntry',
            feeCurrency: CUSD_ADDRESS, // ✅ ADDED for MiniPay
          } as any);
          console.log('[STAKING] 📤 payEntry transaction sent to MiniPay');
        } catch (error: any) {
          console.error('[STAKING] ❌ Error in checkAllowanceAndPay:', error);
          setNotification({
            show: true,
            title: 'Transaction Failed',
            message: error?.message || 'Failed to pay entry fee. Please try again.',
            type: 'error'
          });
        }
      };

      checkAllowanceAndPay();
    }
  }, [hasApproved, approveHash, contractAddress, payEntry, address, config]);

  // Handle successful entry payment
  useEffect(() => {
    if (hasEntryPaid && address && payEntryHash) {
      console.log('[STAKING] ✅ Entry fee paid successfully! Hash:', payEntryHash);
      setHasStaked(true);

      // Persist to localStorage
      const storageKey = `hasStaked_${address}_${contractAddress}`;
      localStorage.setItem(storageKey, 'true');
      console.log('[STAKING] 💾 Saved stake status to localStorage');

      setNotification({
        show: true,
        title: 'Payment Successful! 🎉',
        message: 'Successfully staked 1 cUSD. Game starting...',
        type: 'success'
      });

      // Automatically start the game after staking
      console.log('[STAKING] 🎮 Dispatching stakeConfirmed event...');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('stakeConfirmed'));
      }, 1000);
    }
  }, [hasEntryPaid, address, contractAddress, payEntryHash]);

  // Handle successful score submission
  useEffect(() => {
    if (hasScoreSubmitted && submitScoreHash) {
      console.log('[SCORE SUBMIT] ✅ Score submitted successfully!');
      console.log('[SCORE SUBMIT] 📝 Transaction hash:', submitScoreHash);
      console.log('[SCORE SUBMIT] 📊 Score submitted:', currentScore);

      setIsSubmittingScore(false);
      setShowScoreModal(false);

      setNotification({
        show: true,
        title: 'Score Submitted! 🎉',
        message: `Your score of ${currentScore.toLocaleString()} has been submitted to the blockchain leaderboard!\n\nGood luck in the daily tournament!`,
        type: 'success'
      });

      // Log contract state check
      console.log('[SCORE SUBMIT] 💡 You can now check the leaderboard to see your score!');
    }
  }, [hasScoreSubmitted, submitScoreHash, currentScore]);

  // Handle leaderboard requests from Phaser
  useEffect(() => {
    const handleLeaderboardRequest = async () => {
      console.log('[LEADERBOARD] 📋 Leaderboard requested');
      console.log('[LEADERBOARD] 📊 Wallet connected:', isConnected);
      console.log('[LEADERBOARD] 📊 Contract address:', contractAddress);
      console.log('[LEADERBOARD] 📊 Chain ID:', chain?.id);

      if (!isConnected) {
        console.log('[LEADERBOARD] ❌ Wallet not connected, sending error');
        window.dispatchEvent(new CustomEvent('leaderboardError', {
          detail: { error: 'Wallet not connected' }
        }));
        return;
      }

      try {
        console.log('[LEADERBOARD] 🔍 Fetching leaderboard from blockchain...');
        console.log('[LEADERBOARD] 📝 Calling getCurrentLeaderboard() on contract:', contractAddress);

        const leaderboard = await readContract(config, {
          address: contractAddress,
          abi: DAILY_TOURNAMENT_ABI,
          functionName: 'getCurrentLeaderboard',
        });

        console.log('[LEADERBOARD] 📦 Raw leaderboard data from contract:', leaderboard);
        console.log('[LEADERBOARD] 📊 Number of entries:', leaderboard.length);

        // Log each entry
        leaderboard.forEach((player, index) => {
          console.log(`[LEADERBOARD] Entry ${index + 1}:`, {
            address: player.playerAddress,
            score: player.score.toString(),
            timestamp: player.timestamp.toString(),
            isZeroAddress: player.playerAddress === '0x0000000000000000000000000000000000000000',
            scoreIsZero: player.score === 0n
          });
        });

        const formattedData = leaderboard
          .map((player, index) => ({
            rank: index + 1,
            address: player.playerAddress,
            score: Number(player.score)
          }))
          .filter(entry => {
            const isValid = entry.address !== '0x0000000000000000000000000000000000000000' && entry.score > 0;
            if (!isValid) {
              console.log(`[LEADERBOARD] 🚫 Filtering out entry ${entry.rank}: address=${entry.address}, score=${entry.score}`);
            }
            return isValid;
          });

        console.log('[LEADERBOARD] ✅ Formatted leaderboard (filtered):', formattedData);
        console.log('[LEADERBOARD] 📊 Total valid entries:', formattedData.length);

        if (formattedData.length === 0) {
          console.log('[LEADERBOARD] ⚠️ No valid scores found! Leaderboard is empty.');
          console.log('[LEADERBOARD] 💡 This means either:');
          console.log('[LEADERBOARD]    1. No one has submitted scores yet');
          console.log('[LEADERBOARD]    2. All scores are 0');
          console.log('[LEADERBOARD]    3. Contract might be newly deployed');
        }

        window.dispatchEvent(new CustomEvent('leaderboardData', {
          detail: { leaderboard: formattedData }
        }));
      } catch (error: any) {
        console.error('[LEADERBOARD] ❌ Error fetching leaderboard:', error);
        console.error('[LEADERBOARD] ❌ Error details:', {
          message: error?.message,
          code: error?.code,
          data: error?.data
        });
        window.dispatchEvent(new CustomEvent('leaderboardError', {
          detail: { error: error.message || 'Failed to fetch leaderboard' }
        }));
      }
    };

    window.addEventListener('requestLeaderboard', handleLeaderboardRequest);

    return () => {
      window.removeEventListener('requestLeaderboard', handleLeaderboardRequest);
    };
  }, [isConnected, contractAddress, config, chain]);

  // Initialize Phaser game
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 640,
      height: 960,
      backgroundColor: '#000000',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 2000 },
          debug: false,
        },
      },
      scene: [
        Preload,
        Splash1,
        Splash2,
        Splash3,
        Splash4,
        Splash5,
        MainMenu,
        CharacterSelect,
        Game,
        GameOver,
        OptionsMenu,
        HowToPlay,
        Leaderboard,
      ],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    gameRef.current = new Phaser.Game(config);

    const gameStartListener = (e: Event) => handleGameStart(e as CustomEvent);
    const gameOverListener = (e: Event) => handleGameOver(e as CustomEvent<{ score: number }>);

    window.addEventListener('gameStartRequested', gameStartListener);
    window.addEventListener('gameOver', gameOverListener);

    return () => {
      window.removeEventListener('gameStartRequested', gameStartListener);
      window.removeEventListener('gameOver', gameOverListener);

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Handle game start - require wallet connection and staking
  const handleGameStart = async (_event: CustomEvent) => {
    console.log('Game start requested. Connected:', isConnected, 'Has staked:', hasStaked);

    if (!isConnected) {
      if (isMiniPay) {
        // Show beautiful connect screen only when player wants to play
        setShowConnectPrompt(true);
      } else {
        setNotification({
          show: true,
          title: 'Wallet Required',
          message: 'Please connect your wallet to play!',
          type: 'warning'
        });
      }
      return;
    }

    if (!hasStaked) {
      console.log('No stake found, showing modal');
      setShowStakeModal(true);
      return;
    }

    console.log('Dispatching stakeConfirmed event');
    window.dispatchEvent(new CustomEvent('stakeConfirmed'));
  };

  const handleStakeConfirm = async () => {
    console.log('[STAKING] 🔘 Approve button clicked!');
    console.log('[STAKING] 📊 Wallet connected:', isConnected);
    console.log('[STAKING] 📊 User address:', address);
    console.log('[STAKING] 📊 Contract address:', contractAddress);
    console.log('[STAKING] 📊 isMiniPay:', isMiniPay);

    if (!isConnected || !address) {
      console.error('[STAKING] ❌ Wallet not connected!');
      setNotification({
        show: true,
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet first.',
        type: 'error'
      });
      return;
    }

    setShowStakeModal(false);

    try {
      console.log('[STAKING] 🎯 Starting staking process...');
      console.log('[STAKING] 📝 Step 1/2: Approving cUSD for contract...');
      console.log('[STAKING] 💰 Approving 1 cUSD (', parseEther('1').toString(), 'wei)');

      // ✅ FIXED: Use legacy transaction format with feeCurrency
      const result = approveToken({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress, parseEther('1')],
        feeCurrency: CUSD_ADDRESS, // ✅ ADDED for MiniPay
      } as any);

      console.log('[STAKING] 📤 approveToken called, result:', result);
      console.log('[STAKING] 📤 Approve transaction sent to MiniPay wallet');
    } catch (error: any) {
      console.error('[STAKING] ❌ Error approving cUSD:', error);
      console.error('[STAKING] ❌ Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      setNotification({
        show: true,
        title: 'Transaction Failed',
        message: error?.message || 'Failed to approve cUSD. Please try again.',
        type: 'error'
      });
      setShowStakeModal(true);
    }
  };

  const handleStakeCancel = () => {
    setShowStakeModal(false);
  };

  // Handle game over - submit score to blockchain
  const handleGameOver = async (event: CustomEvent<{ score: number }>) => {
    const score = event.detail.score;
    setCurrentScore(score);

    console.log('[GAME OVER] 🎮 Game ended! Score:', score);
    console.log('[GAME OVER] 📊 isConnected:', isConnected);
    console.log('[GAME OVER] 📊 hasStaked:', hasStaked);
    console.log('[GAME OVER] 📊 address:', address);

    // Double-check localStorage for staked status (in case state was lost)
    const storageKey = `hasStaked_${address}_${contractAddress}`;
    const storedStake = localStorage.getItem(storageKey);
    console.log('[GAME OVER] 💾 localStorage stake status:', storedStake);

    // If localStorage says they staked but state doesn't, update state
    if (storedStake === 'true' && !hasStaked) {
      console.log('[GAME OVER] 🔄 Restoring stake status from localStorage');
      setHasStaked(true);
    }

    // Use either current state or localStorage value
    const actuallyHasStaked = hasStaked || storedStake === 'true';

    console.log('[GAME OVER] ✅ Final check - Connected:', isConnected, 'Staked:', actuallyHasStaked);

    if (!isConnected || !actuallyHasStaked) {
      console.log('[GAME OVER] ❌ Cannot submit - Connected:', isConnected, 'Staked:', actuallyHasStaked);
      setNotification({
        show: true,
        title: 'Game Over!',
        message: `Your Score: ${score.toLocaleString()}\n\nConnect your wallet and stake 1 cUSD to submit scores to the blockchain leaderboard and compete for prizes!`,
        type: 'info'
      });
      return;
    }

    console.log('[GAME OVER] ✅ Showing score submission modal');
    setShowScoreModal(true);
  };

  const handleScoreSubmitConfirm = async () => {
    console.log('[SCORE SUBMIT] 🎯 Starting score submission process...');
    console.log('[SCORE SUBMIT] 📊 Score to submit:', currentScore);
    console.log('[SCORE SUBMIT] 📊 Contract address:', contractAddress);
    console.log('[SCORE SUBMIT] 📊 User address:', address);
    console.log('[SCORE SUBMIT] 📊 Has staked:', hasStaked);

    setIsSubmittingScore(true);

    try {
      // Convert score to BigInt for contract call
      const scoreToSubmit = BigInt(Math.floor(currentScore));
      console.log('[SCORE SUBMIT] 💾 Score as BigInt:', scoreToSubmit.toString());

      // ✅ FIXED: Use legacy transaction format with feeCurrency
      const result = submitScore({
        address: contractAddress,
        abi: DAILY_TOURNAMENT_ABI,
        functionName: 'submitScore',
        args: [scoreToSubmit],
        feeCurrency: CUSD_ADDRESS, // ✅ ADDED for MiniPay
      } as any);

      console.log('[SCORE SUBMIT] 📤 Transaction sent, result:', result);
      console.log('[SCORE SUBMIT] ⏳ Waiting for transaction confirmation...');
    } catch (error: any) {
      console.error('[SCORE SUBMIT] ❌ Error submitting score:', error);
      console.error('[SCORE SUBMIT] ❌ Error details:', {
        message: error?.message,
        code: error?.code,
        data: error?.data
      });
      setNotification({
        show: true,
        title: 'Submission Failed',
        message: error?.message || 'Failed to submit score to the blockchain. Please try again.',
        type: 'error'
      });
      setIsSubmittingScore(false);
      setShowScoreModal(true); // Re-show modal on error
    }
  };

  const handleScoreSubmitCancel = () => {
    setShowScoreModal(false);
    console.log('Score submission cancelled');
  };

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center">
      {/* Game Container */}
      <div ref={containerRef} className="game-container" />

      {/* Stake Modal */}
      <StakeModal
        isOpen={showStakeModal}
        onConfirm={handleStakeConfirm}
        onCancel={handleStakeCancel}
        isMiniPay={isMiniPay}
      />

      {/* Score Submit Modal */}
      <ScoreSubmitModal
        isOpen={showScoreModal}
        score={currentScore}
        onConfirm={handleScoreSubmitConfirm}
        onCancel={handleScoreSubmitCancel}
        isSubmitting={isSubmittingScore}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.show}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />

      {/* Connect Prompt — Only when player taps Play */}
      {showConnectPrompt && isMiniPay && (
        <div className="absolute inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-10 rounded-3xl text-center max-w-md mx-6 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Compete?</h2>
            <p className="text-white text-xl mb-10 opacity-90">
              Connect MiniPay to stake 1 cUSD and enter the daily tournament!
            </p>
            <button
              onClick={async () => {
                setShowConnectPrompt(false);
                try {
                  await window.ethereum.request({ method: "eth_requestAccounts" });
                  window.location.reload();
                } catch (err) {
                  setNotification({
                    show: true,
                    title: 'Connection Failed',
                    message: 'Please try again',
                    type: 'error'
                  });
                }
              }}
              className="bg-white text-green-700 font-black text-2xl px-12 py-6 rounded-full shadow-2xl hover:scale-110 transition-all"
            >
              Connect & Play
            </button>
          </div>
        </div>
      )}

      {!isConnected && !isMiniPay && (
        <div className="absolute top-4 left-0 right-0 text-center px-4">
          <div className="bg-yellow-500 text-black px-6 py-3 rounded-lg inline-block font-bold text-sm sm:text-base">
            Connect your wallet to play CeloRiders!
          </div>
        </div>
      )}

      {isConnected && !hasStaked && !isMiniPay && (
        <div className="absolute top-4 left-0 right-0 text-center px-4">
          <div className="bg-blue-500 text-white px-6 py-3 rounded-lg inline-block font-bold text-sm sm:text-base">
            Stake 1 cUSD to play!
          </div>
        </div>
      )}

      {(isApproving || isPayingEntry) && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white text-black px-8 py-6 rounded-lg mx-4 max-w-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="font-bold text-base sm:text-lg text-center">
              {isApproving
                ? (isMiniPay ? 'Approve in MiniPay' : 'Approving cUSD...')
                : (isMiniPay ? 'Approve Payment in MiniPay' : 'Processing entry payment...')
              }
            </p>
            {isApproving && (
              <p className="text-sm text-gray-600 mt-2 text-center">
                Step 1 of 2: Approving token
                {isMiniPay && <><br />Check MiniPay for approval request</>}
              </p>
            )}
            {isPayingEntry && (
              <p className="text-sm text-gray-600 mt-2 text-center">
                Step 2 of 2: Paying entry fee
                {isMiniPay && <><br />✋ Check MiniPay to approve the payment!</>}
              </p>
            )}
          </div>
        </div>
      )}

      {isSubmittingOnChain && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white text-black px-8 py-6 rounded-lg mx-4 max-w-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="font-bold text-base sm:text-lg text-center">Submitting score to blockchain...</p>
          </div>
        </div>
      )}

      {/* Wallet Info */}
      {isConnected && (
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-10 text-white px-4 py-2 rounded-lg text-sm">
          <p className="font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          {hasStaked && (
            <p className="text-green-400 text-xs mt-1">✓ Staked</p>
          )}
        </div>
      )}

      <style jsx>{`
        .game-container {
          max-width: 100vw;
          max-height: 100vh;
        }
      `}</style>
    </div>
  );
}
