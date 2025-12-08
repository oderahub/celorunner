"use client";

interface ScoreSubmitModalProps {
  isOpen: boolean;
  score: number;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ScoreSubmitModal({ isOpen, score, onConfirm, onCancel, isSubmitting = false }: ScoreSubmitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .pixel-border {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }

        .retro-button {
          font-family: 'Press Start 2P', monospace;
          text-shadow: 3px 3px 0px #000000;
          image-rendering: pixelated;
          transition: transform 0.1s ease;
        }

        .retro-button:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .retro-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .retro-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .neon-glow-gold {
          text-shadow:
            0 0 10px #FFD700,
            0 0 20px #FFD700,
            0 0 30px #FFD700,
            3px 3px 0px #000000;
        }

        .scanline {
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15),
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
        }

        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.3; }
        }

        .blink {
          animation: blink 1s infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      <div className="relative bg-[#0A0E27] border-4 border-[#FFD700] p-8 max-w-md mx-4 pixel-border"
           style={{
             boxShadow: '0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 60px rgba(0, 0, 0, 0.8)',
             fontFamily: "'Press Start 2P', monospace"
           }}>

        {/* Scanline effect overlay */}
        <div className="absolute inset-0 scanline pointer-events-none"></div>

        <div className="relative text-center">
          {/* Trophy Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-[#FFD700] border-4 border-black flex items-center justify-center pixel-border"
                 style={{ boxShadow: '4px 4px 0px #000000' }}>
              <span className="text-4xl">🏆</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl text-[#FF0000] mb-6 leading-relaxed"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                textShadow: '0 0 20px #FF0000, 3px 3px 0px #000000'
              }}>
            GAME OVER!
          </h2>

          {/* Score Display */}
          <div className="bg-black/70 border-4 border-[#00FF41] p-6 mb-6 pixel-border"
               style={{ boxShadow: '0 0 20px rgba(0, 255, 65, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.9)' }}>
            <p className="text-[#20B2AA] text-xs mb-3"
               style={{
                 fontFamily: "'Press Start 2P', monospace",
                 textShadow: '2px 2px 0px #000000'
               }}>
              YOUR SCORE
            </p>
            <p className="text-5xl text-[#FFD700] neon-glow-gold leading-tight"
               style={{ fontFamily: "'Press Start 2P', monospace" }}>
              {score.toLocaleString()}
            </p>
          </div>

          {/* Message */}
          <p className="text-white mb-6 text-[10px] leading-relaxed"
             style={{
               fontFamily: "'Press Start 2P', monospace",
               textShadow: '2px 2px 0px #000000'
             }}>
            SUBMIT TO BLOCKCHAIN LEADERBOARD!
          </p>

          {/* Info Box */}
          <div className="bg-[#FFD700]/10 border-2 border-[#FFD700] p-4 mb-6 text-left pixel-border"
               style={{ boxShadow: 'inset 0 0 20px rgba(255, 215, 0, 0.1)' }}>
            <p className="text-[#FFD700] font-semibold mb-2 text-xs"
               style={{
                 fontFamily: "'Press Start 2P', monospace",
                 textShadow: '2px 2px 0px #000000'
               }}>
              TOP 10 REWARDS:
            </p>
            <div className="text-[#20B2AA] text-[9px] space-y-1 leading-relaxed"
                 style={{
                   fontFamily: "'Press Start 2P', monospace",
                   textShadow: '1px 1px 0px #000000'
                 }}>
              <p>DAILY PRIZES @ MIDNIGHT</p>
              <p className="text-[#00FF41]">BEST SCORE WINS!</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4">
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="retro-button w-full px-6 py-4 bg-[#00FF41] hover:bg-[#39FF14] disabled:bg-[#006600] text-black border-4 border-black text-sm flex items-center justify-center gap-3"
              style={{ boxShadow: '6px 6px 0px #000000' }}
            >
              {isSubmitting ? (
                <>
                  <div className="spin border-4 border-black border-t-[#FFD700] w-4 h-4 rounded-full"></div>
                  <span>SENDING...</span>
                </>
              ) : (
                'SUBMIT SCORE'
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="retro-button w-full px-6 py-3 bg-[#DC143C] hover:bg-[#FF0000] disabled:bg-[#660000] text-white border-4 border-black text-xs"
              style={{ boxShadow: '4px 4px 0px #000000' }}
            >
              SKIP
            </button>
          </div>

          {/* Corner decorations */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#FFD700]"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#FFD700]"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#FFD700]"></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#FFD700]"></div>
        </div>
      </div>
    </div>
  );
}
