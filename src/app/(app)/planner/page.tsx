'use client'

import Link from 'next/link'
import { Plus, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { usePlans } from '@/hooks/use-plans'
import { formatCurrency, formatMonth } from '@/lib/formatters'

export default function PlannerPage() {
  const { plans, loading } = usePlans()

  return (
    <div className="flex flex-col flex-1">
      <Header title="Monthly Planner" />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {plans.length} plan{plans.length !== 1 ? 's' : ''} recorded
          </p>
          <Link href="/planner/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No plans yet. Create your first monthly allocation plan.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <Link key={plan.id} href={`/planner/${plan.id}`}>
                <Card className="hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {plan.status === 'finalized' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold">{formatMonth(plan.month)}</p>
                          <p className="text-sm text-muted-foreground tabular-nums tracking-tight">
                            Budget: {formatCurrency(plan.budget)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={plan.status === 'finalized' ? 'default' : 'secondary'}>
                        {plan.status}
                      </Badge>
                    </div>
                    {plan.notes && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-1">{plan.notes}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
