import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const otpSchema = z.object({
  otp_code: z.string().length(6, 'Code à 6 chiffres requis'),
})

type OTPForm = z.infer<typeof otpSchema>

export default function OTPPage() {
  const [timer, setTimer] = useState(300)
  const [canResend, setCanResend] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const location = useLocation()
  const navigate = useNavigate()
  const { verifyOTP, isLoading, otpError, resendOTP, isResendingOTP } = useAuth()

  // Le backend identifie l'utilisateur par email (pas de temp_token).
  // On le récupère depuis le state de navigation, ou en repli depuis sessionStorage
  // (utile si la page est rafraîchie).
  const email: string | undefined =
    (location.state as { email?: string } | null)?.email ||
    sessionStorage.getItem('otp_email') ||
    undefined

  useEffect(() => {
    if (!email) {
      navigate('/login')
    }
  }, [email, navigate])

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true)
      return
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp_code: '' },
  })

  const otpValue = watch('otp_code')

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const currentCode = otpValue.padEnd(6, '').split('')
    currentCode[index] = value.slice(-1)
    const newCode = currentCode.join('')
    setValue('otp_code', newCode, { shouldValidate: true })

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setValue('otp_code', pasted, { shouldValidate: true })
      pasted.split('').forEach((digit, i) => {
        if (inputsRef.current[i]) inputsRef.current[i]!.value = digit
      })
      inputsRef.current[5]?.focus()
    }
  }

  const onSubmit = async (data: OTPForm) => {
    if (!email) return
    await verifyOTP({ email, otp: data.otp_code })
  }

  const minutes = Math.floor(timer / 60)
  const seconds = timer % 60

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Vérification en deux étapes</CardTitle>
            <CardDescription>
              Saisissez le code à 6 chiffres envoyé à {email || 'votre adresse email'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {otpError && (
              <Alert variant="destructive">
                {(otpError as Error).message || 'Code invalide'}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { inputsRef.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpValue[i] || ''}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="h-14 w-12 rounded-lg border-2 border-gray-200 text-center text-2xl font-bold text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary transition-all"
                    aria-label={`Chiffre ${i + 1}`}
                    disabled={isLoading}
                  />
                ))}
              </div>
              {errors.otp_code && (
                <p className="text-center text-sm text-danger">{errors.otp_code.message}</p>
              )}

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-500">
                  Code valide pendant :{' '}
                  <span className={cn('font-mono font-semibold', timer < 60 ? 'text-danger' : 'text-primary')}>
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!canResend || isResendingOTP || !email}
                  onClick={async () => {
                    if (!email) return
                    try {
                      await resendOTP(email)
                      setTimer(300)
                      setCanResend(false)
                    } catch {
                      /* l'erreur est affichée via otpError si besoin */
                    }
                  }}
                >
                  {isResendingOTP ? 'Envoi…' : 'Renvoyer le code'}
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || otpValue.length !== 6}>
                {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Vérifier
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
