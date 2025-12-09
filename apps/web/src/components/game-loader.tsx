export function GameLoader() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-black">
      {/* Spinner */}
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
      </div>

      {/* Loading text */}
      <div className="text-white text-2xl font-semibold mb-2">
        Loading CeloRiders
      </div>

      {/* Subtitle with pulse animation */}
      <div className="text-gray-400 text-sm animate-pulse">
        Preparing your skateboarding experience...
      </div>
    </div>
  );
}
