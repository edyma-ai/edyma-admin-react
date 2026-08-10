import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Card padded={false} className="mt-10">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for does not exist or moved during the rebuild."
        action={<Button onClick={() => navigate('/')}>Back to overview</Button>}
      />
    </Card>
  )
}
