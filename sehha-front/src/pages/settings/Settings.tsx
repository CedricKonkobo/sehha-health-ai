// src/pages/settings/Settings.tsx
// Page paramètres patient — uniquement les champs autorisés par le backend :
// téléphone, email, mot de passe. Les données médicales restent en lecture seule.
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Settings as SettingsIcon, User, Phone, Mail,
  Lock, CheckCircle2, AlertTriangle, Shield, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { patientApi } from '@/lib/patientApi'

// ── Schémas de validation ─────────────────────────────────────────────────────

const contactSchema = z.object({
  phone: z
    .string()
    .regex(/^(\+212|0)[5-7]\d{8}$/, 'Téléphone invalide (ex : 0612345678 ou +212612345678)')
    .or(z.literal(''))
    .optional(),
  email: z.string().email('Email invalide').or(z.literal('')).optional(),
})

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Mot de passe actuel requis'),
    new_password: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères'),
    new_password_confirmation: z.string(),
  })
  .refine((d) => d.new_password === d.new_password_confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['new_password_confirmation'],
  })

type ContactForm = z.infer<typeof contactSchema>
type PasswordForm = z.infer<typeof passwordSchema>

// ── Composant ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)
  const [contactSuccess, setContactSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // ── Formulaire coordonnées ────────────────────────────────────────────────

  const {
    register: registerContact,
    handleSubmit: handleContact,
    formState: { errors: contactErrors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { phone: '', email: user?.email ?? '' },
  })

  const contactMutation = useMutation({
    mutationFn: (data: ContactForm) =>
      patientApi.updateProfile({
        phone: data.phone || undefined,
        email: data.email || undefined,
      }),
    onSuccess: () => {
      setContactSuccess(true)
      addToast('Coordonnées mises à jour', 'success')
      setTimeout(() => setContactSuccess(false), 3000)
    },
    onError: (e: any) => {
      addToast(e?.message || 'Erreur lors de la mise à jour', 'error')
    },
  })

  // ── Formulaire mot de passe ───────────────────────────────────────────────

  const {
    register: registerPwd,
    handleSubmit: handlePassword,
    formState: { errors: pwdErrors },
    reset: resetPwd,
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      patientApi.updateProfile({
        current_password: data.current_password,
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation,
      }),
    onSuccess: () => {
      setPasswordSuccess(true)
      resetPwd()
      addToast('Mot de passe modifié avec succès', 'success')
      setTimeout(() => setPasswordSuccess(false), 3000)
    },
    onError: (e: any) => {
      addToast(e?.message || 'Mot de passe actuel incorrect', 'error')
    },
  })

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-primary" />
        Paramètres
      </h1>

      {/* Profil (lecture seule) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            Mon profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary">{user?.role}</Badge>
                {user?.is_active && <Badge variant="success">Actif</Badge>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            {user?.email && (
              <div>
                <p className="text-xs text-gray-500">Email actuel</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            )}
            {user?.cin && (
              <div>
                <p className="text-xs text-gray-500">CIN</p>
                <p className="text-sm font-medium font-mono">{user.cin}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1 pt-1">
            <Info className="h-3 w-3" />
            Le nom et le CIN ne peuvent pas être modifiés — contactez l'administration.
          </p>
        </CardContent>
      </Card>

      {/* Données médicales — notice lecture seule */}
      <Alert className="flex items-start gap-3 bg-blue-50 border-blue-200 text-blue-800">
        <Shield className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Données médicales — lecture seule</p>
          <p className="text-sm mt-0.5">
            Vos allergies, antécédents, constantes vitales et consultations ne peuvent être
            modifiés que par un soignant autorisé. C'est une garantie de sécurité de votre
            dossier médical électronique.
          </p>
        </div>
      </Alert>

      {/* Coordonnées modifiables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-primary" />
            Mes coordonnées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleContact((data) => contactMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  {...registerContact('phone')}
                  type="tel"
                  placeholder="0612345678"
                  className="pl-9"
                />
              </div>
              {contactErrors.phone && (
                <p className="text-xs text-red-500 mt-1">{contactErrors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  {...registerContact('email')}
                  type="email"
                  placeholder="votre@email.com"
                  className="pl-9"
                />
              </div>
              {contactErrors.email && (
                <p className="text-xs text-red-500 mt-1">{contactErrors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={contactMutation.isPending}
              className="w-full gap-2"
            >
              {contactMutation.isPending ? (
                <><LoadingSpinner size="sm" /> Mise à jour...</>
              ) : contactSuccess ? (
                <><CheckCircle2 className="h-4 w-4" /> Sauvegardé !</>
              ) : (
                'Mettre à jour les coordonnées'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" />
            Modifier mon mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassword((data) => passwordMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Mot de passe actuel</label>
              <Input
                {...registerPwd('current_password')}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {pwdErrors.current_password && (
                <p className="text-xs text-red-500 mt-1">{pwdErrors.current_password.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nouveau mot de passe</label>
              <Input
                {...registerPwd('new_password')}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {pwdErrors.new_password && (
                <p className="text-xs text-red-500 mt-1">{pwdErrors.new_password.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Confirmer le nouveau mot de passe</label>
              <Input
                {...registerPwd('new_password_confirmation')}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {pwdErrors.new_password_confirmation && (
                <p className="text-xs text-red-500 mt-1">{pwdErrors.new_password_confirmation.message}</p>
              )}
            </div>

            {/* Règles */}
            <div className="rounded-lg bg-gray-50 p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500">Règles :</p>
              <p className="text-xs text-gray-500">• Minimum 8 caractères</p>
              <p className="text-xs text-gray-500">• Évitez les mots de passe courants</p>
            </div>

            <Button
              type="submit"
              disabled={passwordMutation.isPending}
              className="w-full gap-2"
            >
              {passwordMutation.isPending ? (
                <><LoadingSpinner size="sm" /> Modification...</>
              ) : passwordSuccess ? (
                <><CheckCircle2 className="h-4 w-4" /> Mot de passe modifié !</>
              ) : (
                'Modifier le mot de passe'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sécurité info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-gray-900">Sécurité de votre compte</p>
              <p className="text-xs text-gray-500 mt-1">
                Vos données médicales sont chiffrées AES-256. Chaque accès à votre dossier est
                enregistré dans un journal d'audit horodaté. En cas de problème,
                contactez votre établissement de santé.
              </p>
              {user?.last_login_at && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Dernière connexion : {new Date(user.last_login_at).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
