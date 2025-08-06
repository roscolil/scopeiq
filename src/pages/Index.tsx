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
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Enhanced Stripe-inspired gradient background layers with more intensity */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-100/80 to-purple-50"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-50/70 via-blue-100/50 to-indigo-100/70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-200/60 via-indigo-100/30 to-purple-200/50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-100/50 via-transparent to-blue-200/40"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-primary/15 to-accent/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-accent/15 to-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-200/30 to-purple-200/30 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-violet-200/25 to-cyan-200/25 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-sky-200/20 to-indigo-200/30 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-purple-200/25 to-blue-200/20 rounded-full blur-xl"></div>
      </div>

      <Layout>
        <div className="relative space-y-32">
          {/* Hero Section */}
          <div className="text-center py-24 px-6">
            <div className="max-w-6xl mx-auto">
              {/* Enhanced badge */}
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-full text-sm font-semibold mb-12 shadow-xl animate-fade-in">
                <div className="p-1.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full">
                  <BrainCircuit className="h-4 w-4 text-transparent bg-gradient-to-br from-primary to-accent bg-clip-text" />
                </div>
                <span className="text-transparent bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text">
                  AI-Powered Document Intelligence
                </span>
              </div>

              {/* Dramatic gradient heading */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 animate-fade-in">
                <span className="text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text leading-tight">
                  Document Intelligence
                </span>
                <br />
                <span className="text-transparent bg-gradient-to-r from-primary via-blue-600 to-accent bg-clip-text">
                  Platform
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-slate-600 mt-8 max-w-4xl mx-auto leading-relaxed animate-fade-in">
                Transform your construction documents into actionable insights.
                Upload, analyze, and extract valuable information by asking
                natural language questions.
              </p>

              {!isAuthenticated && (
                <div className="mt-16 flex flex-col sm:flex-row gap-8 justify-center items-center animate-fade-in">
                  <Button
                    size="lg"
                    className="group relative px-12 py-6 h-16 text-lg font-bold overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-accent hover:shadow-2xl hover:shadow-primary/25 transition-all duration-500 transform hover:scale-105 active:scale-95 border-0"
                    onClick={() => navigate('/signin')}
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
                    className="px-12 py-6 h-16 text-lg font-bold rounded-2xl bg-white/80 backdrop-blur-sm border-2 border-white/50 hover:bg-white hover:shadow-xl transition-all duration-300"
                    onClick={() => navigate('/pricing')}
                  >
                    <span className="text-slate-700">View Pricing</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-6 text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text">
                  Powerful Features
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                  Everything you need to transform your documents into
                  actionable insights
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 border-0 bg-white/80 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-white/50 group-hover:from-white/95 group-hover:via-white/80 group-hover:to-white/60 transition-all duration-500"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/10 rounded-full blur-2xl group-hover:from-primary/10 group-hover:to-accent/20 transition-all duration-500"></div>

                  <div className="relative z-10">
                    <CardHeader className="space-y-6 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-lg rounded-xl"></div>
                          <div className="relative p-4 bg-gradient-to-br from-primary/10 via-blue-50 to-accent/10 rounded-xl border border-white/50 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-500">
                            <Scan className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text group-hover:from-primary group-hover:via-blue-700 group-hover:to-accent transition-all duration-500">
                            Document Processing
                          </CardTitle>
                          <CardDescription className="text-base text-slate-600 mt-2">
                            Extract text and structure from various formats
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-slate-600 leading-relaxed">
                      Advanced OCR and structure extraction using AWS Textract.
                      Process PDFs, images, and documents while preserving
                      formatting and relationships for intelligent analysis.
                    </CardContent>
                  </div>
                </Card>

                <Card className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent/10 border-0 bg-white/80 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-white/50 group-hover:from-white/95 group-hover:via-white/80 group-hover:to-white/60 transition-all duration-500"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/5 to-primary/10 rounded-full blur-2xl group-hover:from-accent/10 group-hover:to-primary/20 transition-all duration-500"></div>

                  <div className="relative z-10">
                    <CardHeader className="space-y-6 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 blur-lg rounded-xl"></div>
                          <div className="relative p-4 bg-gradient-to-br from-accent/10 via-blue-50 to-primary/10 rounded-xl border border-white/50 group-hover:from-accent/20 group-hover:to-primary/20 transition-all duration-500">
                            <Sparkles className="h-8 w-8 text-accent" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text group-hover:from-accent group-hover:via-blue-700 group-hover:to-primary transition-all duration-500">
                            AI-Powered Insights
                          </CardTitle>
                          <CardDescription className="text-base text-slate-600 mt-2">
                            Generate summaries and extract key information
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-slate-600 leading-relaxed">
                      Leverage OpenAI's advanced language models to
                      automatically summarize documents, extract key entities,
                      and generate intelligent insights from your content.
                    </CardContent>
                  </div>
                </Card>

                <Card className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 border-0 bg-white/80 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-white/50 group-hover:from-white/95 group-hover:via-white/80 group-hover:to-white/60 transition-all duration-500"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-blue-100/20 rounded-full blur-2xl group-hover:from-primary/10 group-hover:to-blue-100/40 transition-all duration-500"></div>

                  <div className="relative z-10">
                    <CardHeader className="space-y-6 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 blur-lg rounded-xl"></div>
                          <div className="relative p-4 bg-gradient-to-br from-primary/10 via-blue-50 to-blue-100/50 rounded-xl border border-white/50 group-hover:from-primary/20 group-hover:to-blue-100 transition-all duration-500">
                            <SearchX className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text group-hover:from-primary group-hover:via-blue-700 group-hover:to-blue-600 transition-all duration-500">
                            Semantic Search
                          </CardTitle>
                          <CardDescription className="text-base text-slate-600 mt-2">
                            Find information based on meaning, not keywords
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-slate-600 leading-relaxed">
                      Powerful vector-based search using Pinecone enables you to
                      find relevant information by understanding context and
                      meaning, not just exact word matches.
                    </CardContent>
                  </div>
                </Card>

                <Card className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/10 border-0 bg-white/80 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-white/50 group-hover:from-white/95 group-hover:via-white/80 group-hover:to-white/60 transition-all duration-500"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100/30 to-green-100/20 rounded-full blur-2xl group-hover:from-emerald-100/60 group-hover:to-green-100/40 transition-all duration-500"></div>

                  <div className="relative z-10">
                    <CardHeader className="space-y-6 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/40 to-green-200/40 blur-lg rounded-xl"></div>
                          <div className="relative p-4 bg-gradient-to-br from-emerald-100/30 via-green-50 to-emerald-50 rounded-xl border border-white/50 group-hover:from-emerald-100/60 group-hover:to-green-100/60 transition-all duration-500">
                            <Shield className="h-8 w-8 text-emerald-600" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text group-hover:from-emerald-700 group-hover:via-green-700 group-hover:to-emerald-600 transition-all duration-500">
                            Secure Storage
                          </CardTitle>
                          <CardDescription className="text-base text-slate-600 mt-2">
                            Enterprise-grade security and compliance
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-slate-600 leading-relaxed">
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
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-3xl border border-white/50 shadow-2xl"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-white/40 rounded-3xl"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-accent/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/5 to-primary/10 rounded-full blur-3xl"></div>

              <div className="relative z-10 py-20 px-8">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold mb-6 text-transparent bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 bg-clip-text">
                    Frequently Asked Questions
                  </h2>
                  <p className="text-xl text-slate-600 max-w-3xl mx-auto">
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
