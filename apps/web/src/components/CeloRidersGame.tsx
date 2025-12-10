'use client'

import { useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConfig } from 'wagmi'
import { parseEther } from 'viem'
import { readContract } from 'wagmi/actions'
import { useMiniPay } from '@/hooks/useMiniPay'
import { StakeModal } from './StakeModal'
import { ScoreSubmitModal } from './ScoreSubmitModal'
import { NotificationModal } from './NotificationModal'

// Import game scenes
import Preload from '../game/scenes/Preload'
import Splash1 from '../game/scenes/Splash1'
import Splash2 from '../game/scenes/Splash2'
import Splash3 from '../game/scenes/Splash3'
import Splash4 from '../game/scenes/Splash4'
import Splash5 from '../game/scenes/Splash5'
import MainMenu from '../game/scenes/MainMenu'
import CharacterSelect from '../game/scenes/CharacterSelect'
import Game from '../game/scenes/Game'
import GameOver from '../game/scenes/GameOver'
import OptionsMenu from '../game/scenes/OptionsMenu'
import HowToPlay from '../game/scenes/HowToPlay'
import Leaderboard from '../game/scenes/Leaderboard'

// cUSD & Contract
const CUSD_ADDRESS = '0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b' as const
const CORRECT_CONTRACT_ADDRESS = '0xcC36a406684c313f29848c2A0AfBdFc9A3B5503B' as const

// ABIs
const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

const DAILY_TOURNAMENT_ABI = [
  { inputs: [], name: 'payEntry', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [{ internalType: 'uint256', name: 'score', type: 'uint256' }],
    name: 'submitScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getCurrentLeaderboard',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'playerAddress', type: 'address' },
          { internalType: 'uint256', name: 'score', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' }
        ],
        internalType: 'struct DailyTournament.Player[10]',
        name: '',
        type: 'tuple[10]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const

interface CeloRidersGameProps {
  contractAddress: `0x${string}`
}

export default function CeloRidersGame({ contractAddress }: CeloRidersGameProps) {
  contractAddress = CORRECT_CONTRACT_ADDRESS

  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasStaked, setHasStaked] = useState(false)
  const [showStakeModal, setShowStakeModal] = useState(false)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [currentScore, setCurrentScore] = useState(0)
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>({ show: false, title: '', message: '', type: 'info' })

  // NEW: Force show connect button for first few seconds
  const [showConnectButton, setShowConnectButton] = useState(true)

  const { address, isConnected, chain } = useAccount()
  const { writeContract: approveToken, data: approveHash, error: approveError } = useWriteContract()
  const { writeContract: payEntry, data: payEntryHash, error: payEntryError } = useWriteContract()
  const {
    writeContract: submitScore,
    data: submitScoreHash,
    error: submitScoreError
  } = useWriteContract()
  const { isMiniPay } = useMiniPay()
  const config = useConfig()

  // Hide connect button after 3 seconds (or when connected)
  useEffect(() => {
    if (isMiniPay) {
      const timer = setTimeout(() => setShowConnectButton(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isMiniPay])

  // Load staking status
  useEffect(() => {
    if (address) {
      const key = `hasStaked_${address}_${contractAddress}`
      if (localStorage.getItem(key) === 'true') setHasStaked(true)
    }
  }, [address, contractAddress])

  // Transaction monitoring
  const { isLoading: isApproving, isSuccess: hasApproved } = useWaitForTransactionReceipt({
    hash: approveHash
  })
  const { isLoading: isPayingEntry, isSuccess: hasEntryPaid } = useWaitForTransactionReceipt({
    hash: payEntryHash
  })
  const { isLoading: isSubmittingOnChain, isSuccess: hasScoreSubmitted } =
    useWaitForTransactionReceipt({ hash: submitScoreHash })

  // Auto payEntry after approval
  useEffect(() => {
    if (hasApproved && approveHash && address) {
      const checkAndPay = async () => {
        await new Promise((r) => setTimeout(r, 2000))
        const balance = await readContract(config, {
          address: CUSD_ADDRESS,
          abi: [
            {
              inputs: [{ name: 'account', type: 'address' }],
              name: 'balanceOf',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'balanceOf',
          args: [address]
        })
        if (Number(balance) / 1e18 < 1)
          return setNotification({
            show: true,
            title: 'Low Balance',
            message: 'Need 1+ cUSD',
            type: 'error'
          })

        payEntry({
          address: contractAddress,
          abi: DAILY_TOURNAMENT_ABI,
          functionName: 'payEntry',
          feeCurrency: CUSD_ADDRESS
        } as any)
      }
      checkAndPay()
    }
  }, [hasApproved, approveHash, address, config, contractAddress, payEntry])

  // Success handlers
  useEffect(() => {
    if (hasEntryPaid && address) {
      setHasStaked(true)
      localStorage.setItem(`hasStaked_${address}_${contractAddress}`, 'true')
      setNotification({
        show: true,
        title: 'Staked!',
        message: '1 cUSD paid. Select character to start!',
        type: 'success'
      })
      // Don't automatically dispatch stakeConfirmed - let the user click the character
      // This prevents race conditions and ensures the scene is ready
    }
  }, [hasEntryPaid, address, contractAddress])
  useEffect(() => {
    if (hasScoreSubmitted) {
      setIsSubmittingScore(false)
      setShowScoreModal(false)
      setNotification({
        show: true,
        title: 'Score Submitted!',
        message: `Your score: ${currentScore.toLocaleString()}`,
        type: 'success'
      })
    }
  }, [hasScoreSubmitted, currentScore])

  // Leaderboard handler (unchanged — keep your existing one)

  // Use refs to avoid stale closures
  const isConnectedRef = useRef(isConnected)
  const hasStakedRef = useRef(hasStaked)

  // Keep refs up to date
  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    hasStakedRef.current = hasStaked
  }, [hasStaked])

  // Initialize Phaser
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 640,
      height: 960,
      backgroundColor: '#000000',
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 2000 } } },
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
        Leaderboard
      ],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
    }
    gameRef.current = new Phaser.Game(config)

    // Use refs to get current values
    const handleGameStartRequested = () => {
      if (isConnectedRef.current && hasStakedRef.current) {
        window.dispatchEvent(new CustomEvent('stakeConfirmed'))
      } else if (!isConnectedRef.current) {
        setShowConnectButton(true)
      } else {
        setShowStakeModal(true)
      }
    }

    const handleGameOver = (e: any) => {
      setCurrentScore(e.detail.score)
      if (isConnectedRef.current && hasStakedRef.current) setShowScoreModal(true)
    }

    window.addEventListener('gameStartRequested', handleGameStartRequested)
    window.addEventListener('gameOver', handleGameOver)

    return () => {
      window.removeEventListener('gameStartRequested', handleGameStartRequested)
      window.removeEventListener('gameOver', handleGameOver)
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  const handleStakeConfirm = async () => {
    if (!isConnected || !address) return
    setShowStakeModal(false)
    approveToken({
      address: CUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [contractAddress, parseEther('1')],
      feeCurrency: CUSD_ADDRESS
    } as any)
  }

  const handleScoreSubmitConfirm = async () => {
    setIsSubmittingScore(true)
    submitScore({
      address: contractAddress,
      abi: DAILY_TOURNAMENT_ABI,
      functionName: 'submitScore',
      args: [BigInt(Math.floor(currentScore))],
      feeCurrency: CUSD_ADDRESS
    } as any)
  }

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center">
      <div ref={containerRef} className="game-container" />

      {/* PERFECT MINIPAY CONNECT SCREEN — SHOWS EVERY TIME */}
      {(showConnectButton || !isConnected) && isMiniPay && (
        <div className="absolute inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-8 rounded-2xl text-center max-w-sm mx-4 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Play?</h2>
            <p className="text-white mb-8 opacity-90 text-lg">
              Tap below to connect your MiniPay wallet and start earning!
            </p>
            <button
              onClick={async () => {
                try {
                  await window.ethereum.request({ method: 'eth_requestAccounts' })
                  setShowConnectButton(false)
                  window.location.reload()
                } catch (err) {
                  console.error('Connect failed:', err)
                }
              }}
              className="bg-white text-green-700 font-bold text-xl px-8 py-4 rounded-full hover:scale-105 transition-transform shadow-lg"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      )}

      {/* Other overlays (non-MiniPay, staking, etc.) */}
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

      {/* Modals */}
      <StakeModal
        isOpen={showStakeModal}
        onConfirm={handleStakeConfirm}
        onCancel={() => setShowStakeModal(false)}
        isMiniPay={isMiniPay}
      />
      <ScoreSubmitModal
        isOpen={showScoreModal}
        score={currentScore}
        onConfirm={handleScoreSubmitConfirm}
        onCancel={() => setShowScoreModal(false)}
        isSubmitting={isSubmittingScore}
      />
      <NotificationModal
        isOpen={notification.show}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />

      {/* Loading overlays */}
      {(isApproving || isPayingEntry || isSubmittingOnChain) && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white text-black p-8 rounded-lg text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-500 mx-auto mb-4" />
            <p className="font-bold text-lg">
              {isApproving
                ? 'Approve cUSD...'
                : isPayingEntry
                ? 'Paying entry...'
                : 'Submitting score...'}
            </p>
          </div>
        </div>
      )}

      {/* Wallet info */}
      {isConnected && (
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-10 text-white px-4 py-2 rounded-lg text-sm font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
          {hasStaked && <span className="block text-green-400 text-xs">Staked</span>}
        </div>
      )}

      <style jsx>{`
        .game-container {
          max-width: 100vw;
          max-height: 100vh;
        }
      `}</style>
    </div>
  )
}
