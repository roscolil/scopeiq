import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { FolderPlus, FileUp, MessageSquare, CheckCircle2 } from 'lucide-react'

interface OnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export const OnboardingModal = ({
  open,
  onOpenChange,
  onComplete,
}: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [projectName, setProjectName] = useState('')
  const [skipped, setSkipped] = useState(false)

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    setSkipped(true)
    onOpenChange(false)
    onComplete?.()
  }

  const handleComplete = () => {
    onOpenChange(false)
    onComplete?.()
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderPlus className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Create your first project
              </h3>
              <p className="text-sm text-foreground/60">
                Projects help you organize documents by job site, client, or
                phase. Give your first project a name to get started.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Downtown Office Renovation"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileUp className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Upload a sample document
              </h3>
              <p className="text-sm text-foreground/60">
                Try uploading a blueprint, specification, or contract. Our AI
                will analyze it and make it searchable in seconds.
              </p>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <FileUp className="w-8 h-8 text-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-foreground/60 mb-1">
                Drag and drop a file here, or click to browse
              </p>
              <p className="text-xs text-foreground/40">
                Supports PDF, images, and common document formats
              </p>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Ask your first AI question
              </h3>
              <p className="text-sm text-foreground/60">
                Our AI can answer questions about your documents, find specific
                details, and provide insights across all your projects.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Try asking:</p>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  "What's the total square footage?"
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  "List all the materials needed"
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  "When is the completion date?"
                </li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open && !skipped} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-4">
          <div className="space-y-2">
            <DialogTitle className="text-2xl">Welcome to Jack of All Trades!</DialogTitle>
            <DialogDescription>
              Let's get you set up in just 3 quick steps
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-foreground/50">
              <span>
                Step {currentStep} of {totalSteps}
              </span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        {getStepContent()}

        <div className="flex justify-between pt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button
              onClick={handleNext}
              disabled={currentStep === 1 && !projectName.trim()}
            >
              {currentStep === totalSteps ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
