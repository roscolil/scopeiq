import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  itemCount?: number
}

// Enhanced skeleton with shimmer effect and stagger animation
const EnhancedSkeleton = ({
  className,
  delay = 0,
}: {
  className?: string
  delay?: number
}) => {
  return (
    <Skeleton
      className={cn(
        'relative overflow-hidden',
        'before:absolute before:inset-0',
        'before:-translate-x-full',
        'before:animate-[shimmer_2s_infinite]',
        'before:bg-gradient-to-r',
        'before:from-transparent before:via-white/10 before:to-transparent',
        className,
      )}
      style={{
        animationDelay: `${delay}ms`,
        opacity: 0,
        animation: `fadeIn 0.3s ease-in ${delay}ms forwards`,
      }}
    />
  )
}

// Staggered container for progressive loading
const StaggerContainer = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return <div className={cn('space-y-4', className)}>{children}</div>
}

export const DocumentListSkeleton = ({ itemCount = 3 }: SkeletonProps) => {
  return (
    <StaggerContainer className="grid grid-cols-1 gap-4">
      {Array.from({ length: itemCount }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                {/* File icon skeleton */}
                <EnhancedSkeleton
                  className="h-8 w-8 rounded"
                  delay={index * 50}
                />
                <div className="space-y-2">
                  {/* Document title skeleton */}
                  <EnhancedSkeleton
                    className="h-4 w-[200px]"
                    delay={index * 50 + 25}
                  />
                  {/* Document metadata skeleton (size • date) */}
                  <EnhancedSkeleton
                    className="h-3 w-[120px]"
                    delay={index * 50 + 50}
                  />
                </div>
              </div>
              {/* More options dropdown skeleton */}
              <EnhancedSkeleton
                className="h-8 w-8 rounded"
                delay={index * 50 + 75}
              />
            </div>
          </CardHeader>
          <CardFooter className="p-4 pt-0 flex justify-between items-center">
            {/* Status badge skeleton */}
            <EnhancedSkeleton
              className="h-6 w-20 rounded-full"
              delay={index * 50 + 100}
            />
            {/* View button skeleton */}
            <EnhancedSkeleton
              className="h-8 w-16 rounded"
              delay={index * 50 + 125}
            />
          </CardFooter>
        </Card>
      ))}
    </StaggerContainer>
  )
}

export const ProjectListSkeleton = ({ itemCount = 3 }: SkeletonProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: itemCount }).map((_, index) => (
        <Card
          key={index}
          className="cursor-pointer hover:shadow-md transition-shadow"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EnhancedSkeleton
                  className="h-9 w-9 rounded-lg"
                  delay={index * 100}
                />
                <div className="space-y-2">
                  <EnhancedSkeleton
                    className="h-5 w-[160px]"
                    delay={index * 100 + 50}
                  />
                  <div className="flex items-center gap-2">
                    <EnhancedSkeleton
                      className="h-2 w-2 rounded-full"
                      delay={index * 100 + 75}
                    />
                    <EnhancedSkeleton
                      className="h-3 w-[50px]"
                      delay={index * 100 + 100}
                    />
                  </div>
                </div>
              </div>
              <EnhancedSkeleton
                className="h-8 w-8 rounded"
                delay={index * 100 + 125}
              />
            </div>
          </CardHeader>

          <CardContent className="pb-3">
            <EnhancedSkeleton
              className="h-3 w-full mb-2"
              delay={index * 100 + 150}
            />
            <EnhancedSkeleton
              className="h-3 w-[80%] mb-4"
              delay={index * 100 + 175}
            />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <EnhancedSkeleton
                  className="h-4 w-4"
                  delay={index * 100 + 200}
                />
                <EnhancedSkeleton
                  className="h-4 w-[100px]"
                  delay={index * 100 + 225}
                />
              </div>
              <EnhancedSkeleton
                className="h-3 w-[120px]"
                delay={index * 100 + 250}
              />
            </div>
          </CardContent>

          <CardFooter>
            <EnhancedSkeleton
              className="h-8 w-full rounded"
              delay={index * 100 + 275}
            />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export const ProjectRowsSkeleton = ({ itemCount = 3 }: SkeletonProps) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-4 w-[180px] mb-1" />
              <Skeleton className="h-3 w-[120px]" />
            </div>
            <Skeleton className="h-3 w-[80px]" />
          </div>
          <Skeleton className="h-px w-full bg-border" />
        </div>
      ))}
    </div>
  )
}

export const DocumentViewerSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Document header skeleton */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-[300px]" />
          </div>
        </div>

        <div className="p-5">
          {/* Document info panel skeleton */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-xs">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index}>
                    <Skeleton className="h-3 w-[80px] mb-1" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Document content skeleton */}
          <div className="p-4 bg-background rounded-md border">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-4 w-[92%]" />
              <div className="space-y-2 mt-6">
                <Skeleton className="h-4 w-[88%]" />
                <Skeleton className="h-4 w-[94%]" />
                <Skeleton className="h-4 w-[79%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const AIActionsSkeleton = () => {
  return (
    <Card className="mb-32 md:mb-0">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-[100px]" />
        </div>
        <Skeleton className="h-4 w-[250px]" />
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Document status skeleton */}
          <div className="border rounded-lg p-3 bg-secondary/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
              <Skeleton className="h-6 w-6" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-[150px]" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>

          {/* Query scope skeleton */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-10 w-[200px]" />
          </div>

          {/* Query input skeleton */}
          <div>
            <div className="flex items-center mb-2 gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-3 w-[300px] mb-3" />
            <Skeleton className="h-[60px] w-full mb-3" />

            <div className="flex justify-between gap-2">
              <Skeleton className="h-10 w-[150px]" />
              <Skeleton className="h-10 w-[100px]" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PageHeaderSkeletonProps {
  showBackButton?: boolean
  showActions?: number
}

export const PageHeaderSkeleton = ({
  showBackButton = false,
  showActions = 2,
}: PageHeaderSkeletonProps) => {
  return (
    <div className="space-y-4">
      {showBackButton && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <Skeleton className="h-8 w-[300px] mb-2" />
          <Skeleton className="h-4 w-[200px] mb-1" />
          <Skeleton className="h-3 w-[150px]" />
        </div>

        <div className="flex gap-2">
          {Array.from({ length: showActions }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-[100px]" />
          ))}
        </div>
      </div>
    </div>
  )
}

export const ProjectsWithDocumentsSkeleton = ({
  itemCount = 2,
}: SkeletonProps) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-[200px]" />
              <Skeleton className="h-4 w-[160px]" />
              <Skeleton className="h-3 w-[100px]" />
            </div>
            <Skeleton className="h-8 w-[100px]" />
          </div>

          {/* Documents list within project */}
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, docIndex) => (
              <Card key={docIndex} className="overflow-hidden">
                <CardHeader className="p-4 pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[180px]" />
                        <Skeleton className="h-3 w-[120px]" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex justify-between items-center">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export const TabsSkeleton = () => {
  return (
    <div className="w-full">
      <div className="flex mb-4">
        <Skeleton className="h-10 w-32 rounded-l-md" />
        <Skeleton className="h-10 w-32 rounded-r-md" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[95%]" />
      </div>
    </div>
  )
}

export const ProjectDetailsSkeleton = () => {
  return (
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Enhanced darker and more vivid gradient background layers with more variation */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950/95 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/70 via-cyan-950/60 to-violet-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-950/50 via-blue-950/70 to-indigo-950/60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/25 via-blue-950/10 to-purple-400/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-blue-500/15"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-violet-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/8 to-emerald-500/6 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-blue-500/10 to-slate-500/8 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-slate-500/6 to-violet-500/8 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-emerald-500/8 to-cyan-500/6 rounded-full blur-xl"></div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Back button skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
        </div>

        {/* Project header skeleton */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <Skeleton className="h-10 w-[300px] mb-2" />
            <Skeleton className="h-5 w-[200px] mb-2" />
            <Skeleton className="h-4 w-[150px]" />
          </div>

          {/* Actions skeleton - desktop */}
          <div className="hidden md:flex gap-2">
            <Skeleton className="h-9 w-[120px]" />
            <Skeleton className="h-9 w-[80px]" />
            <Skeleton className="h-9 w-[80px]" />
          </div>

          {/* Actions skeleton - mobile dropdown */}
          <div className="md:hidden">
            <Skeleton className="h-9 w-full" />
          </div>
        </div>

        {/* AI Tools section skeleton */}
        <div className="mb-2 md:mb-4">
          <AIActionsSkeleton />
        </div>

        {/* Documents section header skeleton */}
        <div className="flex justify-between items-center border-b pb-4">
          <Skeleton className="h-6 w-[120px]" />
          <Skeleton className="h-9 w-[140px]" />
        </div>

        {/* Documents list skeleton */}
        <DocumentListSkeleton itemCount={3} />
      </div>
    </>
  )
}

export const NumberSkeleton = ({
  className = '',
  color = 'bg-gray-200',
}: {
  className?: string
  color?: string
}) => {
  return (
    <div className={`h-8 w-12 rounded ${color} animate-pulse ${className}`} />
  )
}
