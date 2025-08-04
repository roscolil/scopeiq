import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface SkeletonProps {
  itemCount?: number
}

export const DocumentListSkeleton = ({ itemCount = 3 }: SkeletonProps) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: itemCount }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export const ProjectListSkeleton = ({ itemCount = 6 }: SkeletonProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: itemCount }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <div className="space-y-2">
              <Skeleton className="h-5 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-3 w-[100px]" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-[80px]" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </CardContent>
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
