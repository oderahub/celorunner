"use client";

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error
    const isChunkLoadError =
      error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('timeout');

    return {
      hasError: true,
      error,
      retryCount: isChunkLoadError ? 0 : 0
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Error caught:', error, errorInfo);

    // Auto-retry for chunk loading errors
    const isChunkLoadError =
      error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('timeout');

    if (isChunkLoadError && this.state.retryCount < 3) {
      console.log(`[ErrorBoundary] Chunk load error detected. Auto-retrying (${this.state.retryCount + 1}/3)...`);

      // Wait a bit before retrying
      setTimeout(() => {
        this.setState({
          hasError: false,
          retryCount: this.state.retryCount + 1
        });
        // Force reload
        window.location.reload();
      }, 1000);
    }
  }

  handleRetry = () => {
    console.log('[ErrorBoundary] Manual retry initiated');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunkLoadError =
        this.state.error?.name === 'ChunkLoadError' ||
        this.state.error?.message.includes('Loading chunk') ||
        this.state.error?.message.includes('timeout');

      if (isChunkLoadError) {
        return (
          <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center p-4">
            <div className="bg-[#1A1A2E] border-4 border-[#FFD700] p-8 max-w-md text-center"
                 style={{
                   fontFamily: "'Press Start 2P', monospace",
                   boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)'
                 }}>
              <div className="mb-6">
                <div className="mx-auto w-20 h-20 bg-[#FF0000] border-4 border-black flex items-center justify-center"
                     style={{ boxShadow: '4px 4px 0px #000000' }}>
                  <span className="text-4xl">⚠️</span>
                </div>
              </div>

              <h2 className="text-xl text-[#FF0000] mb-4 leading-relaxed"
                  style={{ textShadow: '0 0 20px #FF0000, 3px 3px 0px #000000' }}>
                LOADING ERROR
              </h2>

              <p className="text-white text-[10px] leading-relaxed mb-6"
                 style={{ textShadow: '2px 2px 0px #000000' }}>
                FAILED TO LOAD GAME CHUNK
                <br />
                <br />
                {this.state.retryCount > 0 && `RETRY ${this.state.retryCount}/3`}
              </p>

              <button
                onClick={this.handleRetry}
                className="w-full px-6 py-4 bg-[#00FF41] hover:bg-[#39FF14] text-black border-4 border-black text-sm"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  textShadow: '3px 3px 0px #000000',
                  boxShadow: '6px 6px 0px #000000',
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                RELOAD GAME
              </button>

              <p className="text-[#20B2AA] text-[8px] mt-4 leading-relaxed"
                 style={{ textShadow: '1px 1px 0px #000000' }}>
                IF ISSUE PERSISTS, CHECK YOUR NETWORK CONNECTION
              </p>
            </div>
          </div>
        );
      }

      // Generic error fallback
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-gray-900 border-2 border-red-500 p-8 max-w-md text-center rounded-lg">
            <h2 className="text-2xl text-red-500 mb-4 font-bold">Something went wrong</h2>
            <p className="text-gray-300 mb-6 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-6 py-3 bg-red-500 hover:bg-red-400 text-white rounded-lg font-bold"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
