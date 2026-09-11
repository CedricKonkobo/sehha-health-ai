import { Button } from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-lg text-gray-600">Page introuvable</p>
      <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
    </div>
  )
}