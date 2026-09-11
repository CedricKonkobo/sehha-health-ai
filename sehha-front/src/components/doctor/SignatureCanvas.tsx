import { useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Eraser, Save } from 'lucide-react'

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void
}

export function SignatureCanvas({ onSave }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const { x, y } = getPos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const { x, y } = getPos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.closePath()
  }, [])

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const save = () => {
    const dataUrl = canvasRef.current!.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white cursor-crosshair touch-none"
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} className="gap-1 flex-1">
          <Eraser className="h-4 w-4" />
          Effacer
        </Button>
        <Button size="sm" onClick={save} className="gap-1 flex-1">
          <Save className="h-4 w-4" />
          Valider
        </Button>
      </div>
    </div>
  )
}