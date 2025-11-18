import { Card } from '@/components/ui/card'

export default function VideoPanel() {
  return (
    <Card className="relative w-full h-full overflow-hidden bg-black flex-shrink-0">
      {/* Video placeholder from server */}
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-black">
        <div className="text-center">
          <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-700" />
          <p className="text-gray-400 text-xs">Waiting for stream...</p>
        </div>
      </div>

      {/* Video info overlay */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur px-2 py-1 rounded-md">
        <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
        <span className="text-white text-xs font-medium">LIVE</span>
      </div>
    </Card>
  )
}
