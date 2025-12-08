"use client";

interface StakeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isMiniPay: boolean;
}

export function StakeModal({ isOpen, onConfirm, onCancel, isMiniPay }: StakeModalProps) {
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

        .retro-button:hover {
          transform: scale(1.05);
        }

        .retro-button:active {
          transform: scale(0.98);
        }

        .neon-glow {
          text-shadow:
            0 0 10px currentColor,
            0 0 20px currentColor,
            0 0 30px currentColor,
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
      `}</style>

      <div className="relative bg-[#0A0E27] border-4 border-[#00FF41] p-8 max-w-md mx-4 pixel-border"
           style={{
             boxShadow: '0 0 20px rgba(0, 255, 65, 0.5), inset 0 0 60px rgba(0, 0, 0, 0.8)',
             fontFamily: "'Press Start 2P', monospace"
           }}>

        {/* Scanline effect overlay */}
        <div className="absolute inset-0 scanline pointer-events-none"></div>

        <div className="relative text-center">
          {/* Pixel Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-[#FFD700] border-4 border-black flex items-center justify-center pixel-border"
                 style={{ boxShadow: '4px 4px 0px #000000' }}>
              <span className="text-4xl">💰</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl text-[#00FF41] mb-6 neon-glow leading-relaxed"
              style={{ fontFamily: "'Press Start 2P', monospace" }}>
            {isMiniPay ? 'INSERT COIN' : 'STAKE TO PLAY'}
          </h2>

          {/* Message */}
          <p className="text-white mb-6 text-xs leading-relaxed"
             style={{
               fontFamily: "'Press Start 2P', monospace",
               textShadow: '2px 2px 0px #000000'
             }}>
            {isMiniPay
              ? '1 cUSD TO ENTER DAILY TOURNAMENT'
              : '1 cUSD ENTRY FEE - TOP 10 WIN PRIZES!'}
          </p>

          {/* Prize Info Box */}
          <div className="bg-black/70 border-2 border-[#FFD700] p-4 mb-6 text-left pixel-border"
               style={{ boxShadow: 'inset 0 0 20px rgba(255, 215, 0, 0.2)' }}>
            <p className="text-[#FFD700] font-semibold mb-3 text-xs"
               style={{
                 fontFamily: "'Press Start 2P', monospace",
                 textShadow: '2px 2px 0px #000000'
               }}>
              PRIZE POOL:
            </p>
            <div className="text-[#20B2AA] text-[10px] space-y-2 leading-relaxed"
                 style={{
                   fontFamily: "'Press Start 2P', monospace",
                   textShadow: '1px 1px 0px #000000'
                 }}>
              <p>1ST: 30%  2ND: 20%</p>
              <p>3RD: 15%  4TH: 10%</p>
              <p>5TH: 8%   6TH: 6%</p>
              <p>7-10: 1.5% EACH</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4">
            <button
              onClick={onConfirm}
              className="retro-button w-full px-6 py-4 bg-[#00FF41] hover:bg-[#39FF14] text-black border-4 border-black text-sm"
              style={{ boxShadow: '6px 6px 0px #000000' }}
            >
              INSERT COIN
            </button>
            <button
              onClick={onCancel}
              className="retro-button w-full px-6 py-3 bg-[#DC143C] hover:bg-[#FF0000] text-white border-4 border-black text-xs"
              style={{ boxShadow: '4px 4px 0px #000000' }}
            >
              CANCEL
            </button>
          </div>

          {/* Retro corner decorations */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#00FF41]"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00FF41]"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00FF41]"></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#00FF41]"></div>
        </div>
      </div>
    </div>
  );
}
