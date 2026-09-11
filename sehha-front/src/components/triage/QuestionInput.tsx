import { useState, useRef, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Send } from 'lucide-react'
import type { TriageQuestion } from '@/types/triage'

interface QuestionInputProps {
  question: TriageQuestion
  onAnswer: (answer: string) => void
  disabled: boolean
}

export function QuestionInput({ onAnswer, disabled }: QuestionInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onAnswer(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          handleInput()
        }}
        onKeyDown={handleKeyDown}
        placeholder="Décrivez votre réponse... (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:bg-gray-50 max-h-[140px]"
      />
      <Button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        size="icon"
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
