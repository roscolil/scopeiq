import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/shared/Badge'
import {
  Lock,
  Zap,
  FileText,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react'

interface PaywallFeature {
  text: string
  icon?: LucideIcon
}

interface PaywallModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: 'projects' | 'documents' | 'ai-features' | 'storage'
  currentPlan?: string
  onUpgrade?: () => void
}

const paywallContent = {
  projects: {
    icon: FolderOpen,
    title: 'Project limit reached',
    description: "You've reached your plan's project limit",
    message:
      'Your current plan allows up to 5 projects. Upgrade to Professional to create up to 25 projects, or Enterprise for unlimited projects.',
    features: [
      { text: 'Up to 25 projects', icon: CheckCircle2 },
      { text: 'Unlimited documents per project', icon: CheckCircle2 },
      { text: 'Advanced AI insights', icon: CheckCircle2 },
      { text: 'Priority support', icon: CheckCircle2 },
    ],
    recommendedPlan: 'Professional',
  },
  documents: {
    icon: FileText,
    title: 'Document processing queue full',
    description: 'Your plan has a limited document processing queue',
    message:
      'Upgrade to process more documents simultaneously and get faster AI analysis on larger document sets.',
    features: [
      { text: 'Unlimited documents', icon: CheckCircle2 },
      { text: 'Faster processing queue', icon: CheckCircle2 },
      { text: 'Batch upload support', icon: CheckCircle2 },
      { text: 'Advanced file formats', icon: CheckCircle2 },
    ],
    recommendedPlan: 'Professional',
  },
  'ai-features': {
    icon: Sparkles,
    title: 'Advanced AI features',
    description: 'Unlock powerful AI capabilities',
    message:
      'Get access to advanced AI features including custom models, deeper analysis, and priority processing for complex queries.',
    features: [
      { text: 'Custom AI models', icon: CheckCircle2 },
      { text: 'Advanced insights', icon: CheckCircle2 },
      { text: 'Priority AI processing', icon: CheckCircle2 },
      { text: 'Unlimited AI queries', icon: CheckCircle2 },
    ],
    recommendedPlan: 'Professional',
  },
  storage: {
    icon: Lock,
    title: 'Storage limit reached',
    description: 'You need more storage space',
    message:
      'Your current plan includes 1GB of storage. Upgrade to get 10GB with Professional or unlimited storage with Enterprise.',
    features: [
      { text: '10GB storage (Professional)', icon: CheckCircle2 },
      { text: 'Unlimited storage (Enterprise)', icon: CheckCircle2 },
      { text: 'Automatic backups', icon: CheckCircle2 },
      { text: 'Version history', icon: CheckCircle2 },
    ],
    recommendedPlan: 'Professional',
  },
}

export const PaywallModal = ({
  open,
  onOpenChange,
  variant,
  currentPlan = 'Starter',
  onUpgrade,
}: PaywallModalProps) => {
  const content = paywallContent[variant]
  const Icon = content.icon

  const handleUpgrade = () => {
    onUpgrade?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <DialogTitle className="text-2xl">{content.title}</DialogTitle>
            <DialogDescription className="text-base">
              {content.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Plan Badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-sm">
              Current plan: {currentPlan}
            </Badge>
          </div>

          {/* Message */}
          <p className="text-sm text-foreground/70 text-center">
            {content.message}
          </p>

          {/* Features List */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-foreground mb-3">
              Unlock with {content.recommendedPlan}:
            </p>
            <div className="space-y-2">
              {content.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  {feature.icon && (
                    <feature.icon className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                  <span className="text-sm text-foreground/80">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Info */}
          <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Start your free 14-day trial
              </span>
            </div>
            <p className="text-xs text-foreground/60">
              No credit card required • Cancel anytime
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button onClick={handleUpgrade} className="w-full sm:w-auto">
            Upgrade to {content.recommendedPlan}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
