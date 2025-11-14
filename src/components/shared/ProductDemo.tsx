import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'

interface ProductDemoProps {
  className?: string
}

export const ProductDemo = ({ className }: ProductDemoProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  // Demo features to highlight
  const demoFeatures = [
    {
      title: 'Upload Documents',
      description: 'Drag and drop PDFs, blueprints, and specs',
      time: '0:05',
    },
    {
      title: 'AI Analysis',
      description: 'Automatic extraction and insights',
      time: '0:15',
    },
    {
      title: 'Smart Search',
      description: 'Ask questions in natural language',
      time: '0:30',
    },
    {
      title: 'Team Collaboration',
      description: 'Share projects and findings',
      time: '0:45',
    },
  ]

  return (
    <div className={className}>
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            See it in action
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Watch how Jack transforms your workflow
          </h2>
          <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
            From upload to insights. See how construction
            teams are saving hours every day.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border-primary/20">
              <CardContent className="p-0">
                {/* Video Container */}
                <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900">
                  {/* Placeholder for actual video */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      {/* Play button overlay */}
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="group relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-110 shadow-xl"
                      >
                        {isPlaying ? (
                          <Pause className="h-8 w-8 text-white" />
                        ) : (
                          <Play className="h-8 w-8 text-white ml-1" />
                        )}
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                      </button>

                      {/* Placeholder text */}
                      <div className="text-white/90">
                        <p className="text-sm font-medium">
                          Product Demo Video
                        </p>
                        <p className="text-xs text-white/60">
                          Click to {isPlaying ? 'pause' : 'play'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Video would go here */}
                  {/* <video
                    src="/path-to-video.mp4"
                    className="w-full h-full object-cover"
                    controls={false}
                  /> */}

                  {/* Controls overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:text-white hover:bg-white/20"
                          onClick={() => setIsPlaying(!isPlaying)}
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:text-white hover:bg-white/20"
                          onClick={() => setIsMuted(!isMuted)}
                        >
                          {isMuted ? (
                            <VolumeX className="h-5 w-5" />
                          ) : (
                            <Volume2 className="h-5 w-5" />
                          )}
                        </Button>
                        <span className="text-white text-sm font-medium">
                          0:00 / 1:00
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:text-white hover:bg-white/20"
                      >
                        <Maximize className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-primary rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Video stats */}
                <div className="p-4 bg-slate-900/50 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        1:00
                      </div>
                      <div className="text-xs text-gray-400">Duration</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        10k+
                      </div>
                      <div className="text-xs text-gray-400">Views</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        4.9/5
                      </div>
                      <div className="text-xs text-gray-400">Rating</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA below video */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Play className="h-5 w-5 mr-2" />
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline">
                Schedule Live Demo
              </Button>
            </div>
          </div>

          {/* Timeline / Key Features */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground mb-4">
              What you'll see
            </h3>
            {demoFeatures.map((feature, index) => (
              <Card
                key={index}
                className="group hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-md"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-foreground/60 mt-1">
                        {feature.description}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-2 text-xs border-primary/30 text-primary"
                      >
                        {feature.time}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Additional info */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground mb-2">
                  💡 Pro Tip
                </h4>
                <p className="text-sm text-foreground/70">
                  Watch with sound on to hear our construction expert walk
                  through a real project scenario.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom stats/testimonial */}
        <div className="mt-12 text-center">
          <div className="inline-block p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <p className="text-lg italic text-foreground/80 mb-3">
              "The video demo sold me immediately. Seeing it in action made it
              clear how much time we'd save."
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">TM</span>
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground text-sm">
                  Tom Martinez
                </div>
                <div className="text-xs text-foreground/60">
                  Project Director, Melbourne
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
