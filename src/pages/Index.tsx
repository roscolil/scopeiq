import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  FileText,
  BrainCircuit,
  Search,
  Database,
  ArrowRight,
  Scan,
  Sparkles,
  SearchX,
  Shield,
} from 'lucide-react'
import { FaqAccordion } from '@/components/FaqAccordion'
import { AddToHomeScreen } from '@/components/AddToHomeScreen'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/aws-auth'

const Index = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [hasShownWelcome, setHasShownWelcome] = useState(false)

  useEffect(() => {
    // Show welcome message for authenticated users (only once)
    if (
      isAuthenticated &&
      user &&
      !hasShownWelcome &&
      !localStorage.getItem('hasWelcomed')
    ) {
      const firstName = user.name?.split(' ')[0] || 'friend'
      toast({
        title: `Hello there ${firstName}!`,
        description: 'You have successfully signed in.',
      })
      localStorage.setItem('hasWelcomed', 'true')
      setHasShownWelcome(true)
    }
  }, [isAuthenticated, user, hasShownWelcome])

  // Don't redirect on loading anymore - let users see the homepage content
  // This improves perceived performance

  // Removed loading spinner - show content immediately
  // if (isLoading) {
  //   // Show a loading spinner while checking auth
  //   return <Spinner />
  // }

  // if (!isAuthenticated && !isLoading) {
  //   return (
  //     <div className="flex justify-center items-center h-screen">
  //       Please sign in to access this page.
  //     </div>
  //   )
  // }

  // Only render the body if authenticated
  return (
    <>
      {/* Dark gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Base dark gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-gray-950 to-black"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-950 via-slate-950 to-black"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/8 via-transparent to-cyan-500/3"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-500/6 via-transparent to-blue-500/4"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-500/3 via-transparent to-transparent"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-500/12 to-cyan-500/8 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-violet-500/10 to-blue-500/6 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/6 to-emerald-500/4 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-blue-500/8 to-slate-500/6 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-slate-500/4 to-violet-500/6 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-emerald-500/6 to-cyan-500/4 rounded-full blur-xl"></div>
      </div>

      <Layout>
        <div className="relative space-y-32">
          {/* Hero Section */}
          <div className="text-center py-24 px-6">
            <div className="max-w-6xl mx-auto">
              {/* Enhanced badge */}
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm font-semibold mb-12 shadow-xl animate-fade-in">
                <div className="p-1.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full">
                  <BrainCircuit className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-gray-200">
                  AI-Powered Document Intelligence
                </span>
              </div>

              {/* Dramatic gradient heading */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 animate-fade-in">
                <span className="text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text leading-tight">
                  Document Intelligence
                </span>
                <br />
                <span className="text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text">
                  Platform
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-gray-300 mt-8 max-w-4xl mx-auto leading-relaxed animate-fade-in">
                Transform your construction documents into actionable insights.
                Upload, analyze, and extract valuable information by asking
                natural language questions.
              </p>

              {!isAuthenticated && (
                <div className="mt-16 flex flex-col sm:flex-row gap-8 justify-center items-center animate-fade-in">
                  <Button
                    size="lg"
                    className="group relative px-12 py-6 h-16 text-lg font-bold overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-accent hover:shadow-2xl hover:shadow-primary/25 transition-all duration-500 transform hover:scale-105 active:scale-95 border-0"
                    onClick={() => navigate('/auth/signin')}
                  >
                    <div className="absolute inset-0 w-0 bg-white/20 transition-all duration-500 ease-out group-hover:w-full"></div>
                    <div className="relative flex items-center gap-4">
                      <span className="text-white">Get Started Free</span>
                      <ArrowRight className="h-6 w-6 text-white transition-transform duration-300 group-hover:translate-x-2" />
                    </div>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-12 py-6 h-16 text-lg font-bold rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:bg-white/20 hover:shadow-xl transition-all duration-300"
                    onClick={() => navigate('/pricing')}
                  >
                    <span className="text-gray-200">View Pricing</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-6 text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text">
                  Powerful Features
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Everything you need to transform your documents into
                  actionable insights
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="group relative overflow-hidden transition-all duration-300 hover:bg-black/50 border-0 bg-black/40 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-slate-950/50 to-gray-900/40 group-hover:from-black/65 group-hover:via-slate-950/55 group-hover:to-gray-900/45 transition-all duration-300"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-cyan-500/15 rounded-full blur-2xl group-hover:from-emerald-500/12 group-hover:to-cyan-500/18 transition-all duration-300"></div>

                  <div className="relative z-10">
                    <CardHeader className="space-y-6 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-lg rounded-xl"></div>
                          <div className="relative p-4 bg-gradient-to-br from-emerald-500/10 via-black/20 to-cyan-500/10 rounded-xl border border-white/10">
                            <Scan className="h-8 w-8 text-emerald-400" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text transition-all duration-300">
                            Document Processing
                          </CardTitle>
                          <CardDescription className="text-base text-gray-400 mt-2">
                            Extract text and structure from various formats
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-gray-300 leading-relaxed">
                      Advanced OCR and structure extraction using AWS Textract.
                      Process PDFs, images, and documents while preserving
                      formatting and relationships for intelligent analysis.
                    </CardContent>
                  </div>
                </Card>

                <Card className="group relative overflow-hidden transition-all duration-300 hover:bg-black/50 border-0 bg-black/40 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-slate-950/50 to-gray-900/40 group-hover:from-black/65 group-hover:via-slate-950/55 group-hover:to-gray-900/45 transition-all duration-300"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-blue-500/15 rounded-full blur-2xl group-hover:from-violet-500/12 group-hover:to-blue-500/18 transition-all duration-300"></div>

                  <div className="relative z-10">
                    <CardHeader className="space-y-6 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-blue-500/20 blur-lg rounded-xl"></div>
                          <div className="relative p-4 bg-gradient-to-br from-violet-500/10 via-black/20 to-blue-500/10 rounded-xl border border-white/10">
                            <Sparkles className="h-8 w-8 text-violet-400" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text transition-all duration-300">
                            AI-Powered Insights
                          </CardTitle>
                          <CardDescription className="text-base text-gray-400 mt-2">
                            Generate summaries and extract key information
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-gray-300 leading-relaxed">
                      Leverage OpenAI's advanced language models to
                      automatically summarize documents, extract key entities,
                      and generate intelligent insights from your content.
                    </CardContent>
                  </div>
                </Card>

                <Card className="group relative overflow-hidden transition-all duration-300 hover:bg-black/50 border-0 bg-black/40 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-slate-950/50 to-gray-900/40 group-hover:from-black/65 group-hover:via-slate-950/55 group-hover:to-gray-900/45 transition-all duration-300"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/15 rounded-full blur-2xl group-hover:from-cyan-500/12 group-hover:to-blue-500/18 transition-all duration-300"></div>

                  <div className="relative z-10">
                    <CardHeader className="space-y-6 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-lg rounded-xl"></div>
                          <div className="relative p-4 bg-gradient-to-br from-cyan-500/10 via-black/20 to-blue-500/10 rounded-xl border border-white/10">
                            <SearchX className="h-8 w-8 text-cyan-400" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text transition-all duration-300">
                            Semantic Search
                          </CardTitle>
                          <CardDescription className="text-base text-gray-400 mt-2">
                            Find information based on meaning, not keywords
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-gray-300 leading-relaxed">
                      Powerful vector-based search using Pinecone enables you to
                      find relevant information by understanding context and
                      meaning, not just exact word matches.
                    </CardContent>
                  </div>
                </Card>

                <Card className="group relative overflow-hidden transition-all duration-300 hover:bg-black/50 border-0 bg-black/40 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-slate-950/50 to-gray-900/40 group-hover:from-black/65 group-hover:via-slate-950/55 group-hover:to-gray-900/45 transition-all duration-300"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-cyan-500/15 rounded-full blur-2xl group-hover:from-emerald-500/12 group-hover:to-cyan-500/18 transition-all duration-300"></div>

                  <div className="relative z-10">
                    <CardHeader className="space-y-6 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-lg rounded-xl"></div>
                          <div className="relative p-4 bg-gradient-to-br from-emerald-500/10 via-black/20 to-cyan-500/10 rounded-xl border border-white/10">
                            <Shield className="h-8 w-8 text-emerald-400" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text transition-all duration-300">
                            Secure Storage
                          </CardTitle>
                          <CardDescription className="text-base text-gray-400 mt-2">
                            Enterprise-grade security and compliance
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-gray-300 leading-relaxed">
                      All documents are securely stored in AWS S3 with
                      encryption at rest and in transit, plus strict access
                      controls to ensure your sensitive data remains protected.
                    </CardContent>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="px-6">
            <div className="relative max-w-6xl mx-auto">
              {/* FAQ background with glass effect */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/10 shadow-2xl"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-slate-950/40 to-gray-900/30 rounded-3xl"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-cyan-500/15 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-500/10 to-blue-500/15 rounded-full blur-3xl"></div>

              <div className="relative z-10 py-20 px-8">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold mb-6 text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text">
                    Frequently Asked Questions
                  </h2>
                  <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                    Everything you need to know about our document intelligence
                    platform
                  </p>
                </div>
                <FaqAccordion />
              </div>
            </div>
          </div>
        </div>

        <AddToHomeScreen />
      </Layout>
    </>
  )
}

export default Index
