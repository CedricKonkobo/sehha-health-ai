import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { UserPlus } from 'lucide-react'

const registerSchema = z
  .object({
    first_name: z.string().min(2, 'Prénom requis (min 2 caractères)'),
    last_name: z.string().min(2, 'Nom requis (min 2 caractères)'),
    cin: z.string().regex(/^[A-Z]{1,2}\d{4,6}$/i, 'CIN invalide (ex: AB123456)'),
    phone: z.string().regex(/^0[5-7]\d{8}$/, 'Téléphone invalide (ex: 0612345678)'),
    email: z.string().email('Email invalide'),
    date_of_birth: z.string().optional(),
    password: z.string().min(8, 'Mot de passe requis (min 8 caractères)'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password_confirmation'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { register: registerUser, isLoading, registerError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    await registerUser({
      name: `${data.first_name} ${data.last_name}`.trim(),
      email: data.email,
      cin: data.cin,
      phone: data.phone,
      password: data.password,
      password_confirmation: data.password_confirmation,
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-primary">Créer un compte</CardTitle>
            <CardDescription>Inscription patient - Clinique Ibn Tofail</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {registerError && (
              <Alert variant="destructive">
                {(registerError as Error).message || 'Erreur lors de l\'inscription'}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="last_name" className="text-sm font-medium">Nom</label>
                  <Input id="last_name" {...register('last_name')} placeholder="Nom" />
                  {errors.last_name && <p className="text-xs text-danger">{errors.last_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="first_name" className="text-sm font-medium">Prénom</label>
                  <Input id="first_name" {...register('first_name')} placeholder="Prénom" />
                  {errors.first_name && <p className="text-xs text-danger">{errors.first_name.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="cin" className="text-sm font-medium">CIN</label>
                <Input id="cin" {...register('cin')} placeholder="AB123456" className="uppercase" />
                {errors.cin && <p className="text-xs text-danger">{errors.cin.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">Téléphone</label>
                <Input id="phone" {...register('phone')} placeholder="0612345678" type="tel" />
                {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input id="email" {...register('email')} placeholder="email@exemple.com" type="email" />
                {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="date_of_birth" className="text-sm font-medium">Date de naissance (optionnel)</label>
                <Input id="date_of_birth" {...register('date_of_birth')} type="date" />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
                <Input id="password" {...register('password')} type="password" placeholder="••••••••" />
                {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password_confirmation" className="text-sm font-medium">Confirmer le mot de passe</label>
                <Input id="password_confirmation" {...register('password_confirmation')} type="password" placeholder="••••••••" />
                {errors.password_confirmation && <p className="text-xs text-danger">{errors.password_confirmation.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Créer mon compte
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Déjà inscrit ?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}