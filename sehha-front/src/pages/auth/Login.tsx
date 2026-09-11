import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, LogIn } from 'lucide-react'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email ou CIN requis'),
  password: z.string().min(6, 'Mot de passe requis (min 6 caractères)'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('session') === 'expired'
  const { login, isLoading, loginError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    const isEmail = data.identifier.includes('@')
    await login({
      ...(isEmail ? { email: data.identifier } : { cin: data.identifier }),
      password: data.password,
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <LogIn className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-primary">SEHHA</CardTitle>
            <CardDescription>Connexion sécurisée à votre espace santé</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {sessionExpired && (
              <Alert variant="warning">
                Votre session a expiré. Veuillez vous reconnecter.
              </Alert>
            )}

            {loginError && (
              <Alert variant="destructive">
                {(loginError as Error).message || 'Erreur de connexion'}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-sm font-medium">
                  Email ou CIN
                </label>
                <Input
                  id="identifier"
                  placeholder="email@exemple.com ou AB123456"
                  {...register('identifier')}
                  aria-invalid={!!errors.identifier}
                  aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                />
                {errors.identifier && (
                  <p id="identifier-error" className="text-xs text-danger">
                    {errors.identifier.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-danger">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Se connecter
              </Button>
            </form>

            <div className="text-center space-y-2 pt-2">
              <p className="text-sm text-gray-500">
                Pas de compte ?{' '}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  S'inscrire
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}