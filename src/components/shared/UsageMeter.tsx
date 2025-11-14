import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Crown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsageMeterProps {
  label: string
  current: number
  limit: number
  unit?: string
  icon?: React.ReactNode
  onUpgrade?: () => void
  className?: string
}

export const UsageMeter = ({
  label,
  current,
  limit,
  unit = '',
  icon,
  onUpgrade,
  className,
}: UsageMeterProps) => {
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100)
  const remaining = isUnlimited ? -1 : Math.max(limit - current, 0)

  // Determine status color
  const getStatusColor = () => {
    if (isUnlimited) return 'text-primary'
    if (percentage >= 100) return 'text-destructive'
    if (percentage >= 80) return 'text-orange-500'
    return 'text-green-500'
  }

  const getProgressColor = () => {
    if (isUnlimited) return 'bg-primary'
    if (percentage >= 100) return 'bg-destructive'
    if (percentage >= 80) return 'bg-orange-500'
    return 'bg-green-500'
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="text-foreground/70">{icon}</div>}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className={cn('text-sm font-semibold', getStatusColor())}>
          {isUnlimited ? (
            <Badge variant="outline" className="border-primary text-primary">
              <Crown className="h-3 w-3 mr-1" />
              Unlimited
            </Badge>
          ) : (
            `${current} / ${limit} ${unit}`
          )}
        </div>
      </div>

      {!isUnlimited && (
        <>
          <Progress value={percentage} className="h-2">
            <div
              className={cn('h-full transition-all', getProgressColor())}
              style={{ width: `${percentage}%` }}
            />
          </Progress>

          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground/60">
              {remaining > 0 ? (
                <>
                  {remaining} {unit} remaining
                </>
              ) : (
                <span className="text-destructive font-medium">
                  Limit reached
                </span>
              )}
            </span>
            {percentage >= 80 && onUpgrade && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary"
                onClick={onUpgrade}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

interface UsageMeterCardProps {
  title: string
  meters: Array<{
    label: string
    current: number
    limit: number
    unit?: string
    icon?: React.ReactNode
  }>
  onUpgrade?: () => void
}

export const UsageMeterCard = ({
  title,
  meters,
  onUpgrade,
}: UsageMeterCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {meters.map((meter, index) => (
          <UsageMeter
            key={index}
            label={meter.label}
            current={meter.current}
            limit={meter.limit}
            unit={meter.unit}
            icon={meter.icon}
            onUpgrade={onUpgrade}
          />
        ))}
      </CardContent>
    </Card>
  )
}
