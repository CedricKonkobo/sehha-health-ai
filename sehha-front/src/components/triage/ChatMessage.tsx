import { motion } from 'framer-motion'
import { Bot, User, AlertCircle } from 'lucide-react'
import type { TriageMessage } from '@/types/triage'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: TriageMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === 'bot'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3', isBot ? 'flex-row' : 'flex-row-reverse')}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isBot ? 'bg-primary-100 text-primary' : 'bg-gray-100 text-gray-600'
        )}
      >
        {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
          isBot
            ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-none shadow-sm'
            : 'bg-primary text-white rounded-tr-none'
        )}
      >
        {message.type === 'result' && (
          <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
            <AlertCircle className="h-4 w-4" />
            Résultat du triage
          </div>
        )}
        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    </motion.div>
  )
}
