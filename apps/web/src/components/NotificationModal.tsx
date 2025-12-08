"use client";

interface NotificationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export function NotificationModal({
  isOpen,
  title,
  message,
  type = 'info',
  onClose
}: NotificationModalProps) {
  if (!isOpen) return null;

  const colors = {
    success: {
      border: '#00FF41',
      glow: 'rgba(0, 255, 65, 0.6)',
      text: '#00FF41',
      icon: '✓',
      buttonBg: '#00FF41',
      buttonText: '#000000'
    },
    error: {
      border: '#FF0000',
      glow: 'rgba(255, 0, 0, 0.6)',
      text: '#FF0000',
      icon: '✕',
      buttonBg: '#DC143C',
      buttonText: '#FFFFFF'
    },
    info: {
      border: '#20B2AA',
      glow: 'rgba(32, 178, 170, 0.6)',
      text: '#20B2AA',
      icon: 'ℹ',
      buttonBg: '#20B2AA',
      buttonText: '#000000'
    },
    warning: {
      border: '#FFD700',
      glow: 'rgba(255, 215, 0, 0.6)',
      text: '#FFD700',
      icon: '⚠',
      buttonBg: '#FFD700',
      buttonText: '#000000'
    },
  };

  const color = colors[type];

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

        .neon-text {
          text-shadow:
            0 0 10px ${color.text},
            0 0 20px ${color.text},
            0 0 30px ${color.text},
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .pulse {
          animation: pulse 2s infinite;
        }
      `}</style>

      <div className="relative bg-[#0A0E27] border-4 p-8 max-w-md mx-4 pixel-border"
           style={{
             borderColor: color.border,
             boxShadow: `0 0 30px ${color.glow}, inset 0 0 60px rgba(0, 0, 0, 0.8)`,
             fontFamily: "'Press Start 2P', monospace"
           }}>

        {/* Scanline effect overlay */}
        <div className="absolute inset-0 scanline pointer-events-none"></div>

        <div className="relative text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 border-4 border-black flex items-center justify-center pixel-border pulse"
                 style={{
                   backgroundColor: color.border,
                   boxShadow: '4px 4px 0px #000000'
                 }}>
              <span className="text-4xl text-black font-bold">{color.icon}</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl mb-6 leading-relaxed neon-text"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: color.text
              }}>
            {title.toUpperCase()}
          </h2>

          {/* Message */}
          <div className="bg-black/70 border-2 p-4 mb-6 pixel-border"
               style={{
                 borderColor: color.border,
                 boxShadow: `inset 0 0 20px ${color.glow}`
               }}>
            <p className="text-white text-[10px] leading-relaxed whitespace-pre-line"
               style={{
                 fontFamily: "'Press Start 2P', monospace",
                 textShadow: '2px 2px 0px #000000'
               }}>
              {message.toUpperCase()}
            </p>
          </div>

          {/* Button */}
          <button
            onClick={onClose}
            className="retro-button w-full px-6 py-4 border-4 border-black text-sm"
            style={{
              backgroundColor: color.buttonBg,
              color: color.buttonText,
              boxShadow: '6px 6px 0px #000000'
            }}
          >
            OK
          </button>

          {/* Corner decorations */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2"
               style={{ borderColor: color.border }}></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2"
               style={{ borderColor: color.border }}></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2"
               style={{ borderColor: color.border }}></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2"
               style={{ borderColor: color.border }}></div>
        </div>
      </div>
    </div>
  );
}
