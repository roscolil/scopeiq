import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  FolderPlus,
  FileUp,
  Search,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react'

interface EmptyStateStep {
  title: string
  description: string
}

interface EmptyStateProps {
  variant: 'projects' | 'documents' | 'search'
  title?: string
  description?: string
  icon?: LucideIcon
  action?: {
    label: string
    onClick: () => void
  }
  steps?: EmptyStateStep[]
  children?: ReactNode
}

const defaultContent = {
  projects: {
    icon: FolderPlus,
    title: 'No projects yet',
    description: 'Create your first project to start organizing documents',
    steps: [
      {
        title: 'Create a project',
        description: 'Name it by job site, client, or construction phase',
      },
      {
        title: 'Upload documents',
        description: 'Add blueprints, specs, contracts, and more',
      },
      {
        title: 'Search with AI',
        description: 'Ask questions and get instant answers from your docs',
      },
    ],
  },
  documents: {
    icon: FileUp,
    title: 'No documents yet',
    description: 'Upload your first document to unlock AI-powered insights',
    steps: [
      {
        title: 'Upload a document',
        description: 'Drag and drop PDFs, images, or common file types',
      },
      {
        title: 'AI processes it',
        description: 'We analyze and make your document searchable',
      },
      {
        title: 'Ask questions',
        description: 'Get instant answers from your document library',
      },
    ],
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms or uploading more documents',
    steps: [
      {
        title: 'Try different keywords',
        description: 'Use specific terms or phrases from your documents',
      },
      {
        title: 'Check your filters',
        description: 'Remove filters to see more results',
      },
      {
        title: 'Upload more docs',
        description: 'Add documents to expand your searchable library',
      },
    ],
  },
}

export const EmptyState = ({
  variant,
  title,
  description,
  icon,
  action,
  steps,
  children,
}: EmptyStateProps) => {
  const content = defaultContent[variant]
  const Icon = icon || content.icon
  const finalTitle = title || content.title
  const finalDescription = description || content.description
  const finalSteps = steps || content.steps

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-2xl w-full p-8 md:p-12">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-foreground">
              {finalTitle}
            </h3>
            <p className="text-foreground/60">{finalDescription}</p>
          </div>

          {/* Action Button */}
          {action && (
            <div className="pt-2">
              <Button onClick={action.onClick} size="lg">
                {action.label}
              </Button>
            </div>
          )}

          {/* Steps Checklist */}
          {finalSteps && finalSteps.length > 0 && (
            <div className="pt-6">
              <div className="bg-muted rounded-lg p-6 text-left space-y-4">
                <p className="text-sm font-medium text-foreground mb-4">
                  {variant === 'search'
                    ? 'Try these tips:'
                    : 'Get started in 3 steps:'}
                </p>
                <div className="space-y-3">
                  {finalSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        {variant === 'search' ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <span className="text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {step.title}
                        </p>
                        <p className="text-sm text-foreground/60">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Custom Children */}
          {children && <div className="pt-4">{children}</div>}
        </div>
      </Card>
    </div>
  )
}
