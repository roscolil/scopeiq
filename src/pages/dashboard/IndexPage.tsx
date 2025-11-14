import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
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
  Brain,
  Search,
  Database,
  ArrowRight,
  Scan,
  Sparkles,
  SearchX,
  Shield,
} from 'lucide-react'
import { FaqAccordion, ProductDemo } from '@/components/shared'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/aws-auth'

const Index = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [hasShownWelcome, setHasShownWelcome] = useState(false)

  useEffect(() => {
    // Show welcome message for authenticated users (only once). Redirect is now handled by RootRoute.
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

      // Note: Redirect is now handled by RootRedirect in App.tsx
      // This allows for proper authentication flow management
    }
  }, [isAuthenticated, user, hasShownWelcome])

  // Remove the separate redirect effect since it's now handled above

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
      {/* Clean neutral background with subtle accent */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted"></div>

      <Layout>
        <div className="relative space-y-24">
          {/* Hero Section - Redesigned */}
          <div className="py-12 md:py-20 px-4 sm:px-6">
            {/* Show subtle loading indicator when checking auth */}
            {isLoading && (
              <div className="my-8 flex items-center justify-center gap-3 text-muted-foreground animate-fade-in">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-primary/70 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse delay-200"></div>
                <span className="ml-3 text-sm">Checking authentication...</span>
              </div>
            )}

            {/* Show redirection message only when redirecting after sign-in */}
            {hasShownWelcome && (
              <div className="my-8 flex items-center justify-center gap-3 text-primary animate-fade-in">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <span className="text-sm">
                  Redirecting to your dashboard...
                </span>
              </div>
            )}

            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                {/* Left Column - Content (60%) */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Trust Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-full text-sm font-medium animate-fade-in">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 bg-primary/20 rounded-full border-2 border-background flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          🏗️
                        </span>
                      </div>
                      <div className="w-6 h-6 bg-primary/20 rounded-full border-2 border-background flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          ⚡
                        </span>
                      </div>
                    </div>
                    <span className="text-foreground">
                      Trusted by 200+ builders
                    </span>
                  </div>

                  {/* Hero Headline */}
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] animate-fade-in">
                    Stop searching.
                    <br />
                    <span className="text-primary">Start building.</span>
                  </h1>

                  {/* Subheadline */}
                  <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl animate-fade-in">
                    Ask your project documents questions. Get answers in
                    seconds. Built for contractors who work smarter.
                  </p>

                  {/* CTA Section */}
                  {!isAuthenticated && (
                    <div className="space-y-4 animate-fade-in">
                      <Button
                        size="lg"
                        className="group h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90"
                        onClick={() => navigate('/auth/signup')}
                      >
                        <span>Get Started Free</span>
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        No credit card required • Free 14-day trial
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={() => navigate('/auth/signin')}
                          className="text-sm text-foreground/60 hover:text-foreground transition-colors underline-offset-4 hover:underline"
                        >
                          Already using Jack? Sign in →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Visual (40%) */}
                <div className="lg:col-span-5 relative animate-fade-in">
                  {/* Product Screenshot Placeholder - Replace with actual screenshot */}
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
                    <div className="aspect-[4/3] bg-gradient-to-br from-muted to-background p-8">
                      {/* Mockup of Dashboard/Document Interface */}
                      <div className="space-y-4 h-full flex flex-col">
                        {/* Mock Search Bar */}
                        <div className="bg-background rounded-lg border border-border p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <Search className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="h-3 bg-muted-foreground/20 rounded w-3/4"></div>
                            </div>
                          </div>
                        </div>

                        {/* Mock Document Card */}
                        <div className="bg-background rounded-lg border border-border p-4 shadow-sm flex-1">
                          <div className="flex items-start gap-3">
                            <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 bg-foreground/80 rounded w-2/3"></div>
                              <div className="h-2 bg-muted-foreground/40 rounded w-full"></div>
                              <div className="h-2 bg-muted-foreground/40 rounded w-5/6"></div>
                            </div>
                          </div>
                        </div>

                        {/* Mock AI Badge */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg w-fit">
                          <Brain className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            AI-Powered Insights
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial Snippet */}
                  <div className="mt-6 p-4 bg-card rounded-xl border border-border shadow-md">
                    <p className="text-sm text-foreground/80 italic mb-2">
                      "Cut our spec review time by 80%. Game-changer for our
                      team."
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          MJ
                        </span>
                      </div>
                      <div className="text-xs">
                        <div className="font-medium text-foreground">
                          Mike Johnson
                        </div>
                        <div className="text-muted-foreground">
                          General Contractor, Melbourne
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating accent element */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl -z-10"></div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent/5 rounded-full blur-3xl -z-10"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Demo Section */}
          <div className="px-4 sm:px-6 py-20 bg-gradient-to-br from-background to-muted/30">
            <ProductDemo />
          </div>

          {/* Features Grid */}
          <div className="px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Everything you need to work smarter
                </h2>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                  Powerful features designed for construction professionals
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-border bg-card">
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                        <Scan className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-foreground mb-2">
                          Document Processing
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          Extract text and structure from various formats
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-foreground/80 leading-relaxed">
                    Advanced OCR and structure extraction using AWS Textract.
                    Process PDFs, images, and documents while preserving
                    formatting and relationships for intelligent analysis.
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-border bg-card">
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-accent/10 rounded-xl border border-accent/20">
                        <Sparkles className="h-7 w-7 text-accent" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-foreground mb-2">
                          AI-Powered Insights
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          Generate summaries and extract key information
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-foreground/80 leading-relaxed">
                    Leverage OpenAI's advanced language models to automatically
                    summarize documents, extract key entities, and generate
                    intelligent insights from your content.
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-border bg-card">
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                        <SearchX className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-foreground mb-2">
                          Semantic Search
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          Find information based on meaning, not keywords
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-foreground/80 leading-relaxed">
                    Powerful vector-based search using Pinecone enables you to
                    find relevant information by understanding context and
                    meaning, not just exact word matches.
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-border bg-card">
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-accent/10 rounded-xl border border-accent/20">
                        <Shield className="h-7 w-7 text-accent" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-foreground mb-2">
                          Secure Storage
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          Enterprise-grade security and compliance
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-foreground/80 leading-relaxed">
                    All documents are securely stored in AWS S3 with encryption
                    at rest and in transit, plus strict access controls to
                    ensure your sensitive data remains protected.
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-card rounded-2xl border border-border shadow-lg p-8 md:p-12">
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                    Frequently Asked Questions
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Everything you need to know about Jack of All Trades
                  </p>
                </div>
                <FaqAccordion />
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Trusted by builders nationwide
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  See how teams are transforming their document workflows with
                  Jack of All Trades
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {/* Testimonial 1 */}
                <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-primary fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-foreground/90 mb-6 leading-relaxed">
                      "Jack cut our spec review time by 80%. Instead of spending
                      days manually reviewing documents, we get instant
                      insights. It's been a complete game-changer for our
                      bidding process."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          MJ
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          Mike Johnson
                        </div>
                        <div className="text-sm text-muted-foreground">
                          General Contractor, Melbourne
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Testimonial 2 */}
                <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-primary fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-foreground/90 mb-6 leading-relaxed">
                      "The AI analysis is incredible. It catches details in
                      blueprints and specs that would take our team hours to
                      find. We've already prevented costly mistakes on multiple
                      projects."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          SC
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          Sarah Chen
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Project Manager, Sydney
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Testimonial 3 */}
                <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-primary fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-foreground/90 mb-6 leading-relaxed">
                      "We manage 50+ projects at once. Jack helps us stay
                      organized and find critical information instantly. The
                      search capabilities alone are worth the investment."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          RP
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          Robert Patel
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Operations Director, Adelaide
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats bar */}
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                    80%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Faster reviews
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                    500+
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Projects analyzed
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                    10k+
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Documents processed
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                    98%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Accuracy rate
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof Section */}
          {/* <div className="px-4 sm:px-6 pb-12">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm font-medium text-muted-foreground mb-6">
                TRUSTED BY BUILDERS NATIONWIDE
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
                {/* Placeholder for customer logos - replace with actual logos 
                <div className="h-12 w-32 bg-muted-foreground/20 rounded flex items-center justify-center text-xs font-medium text-muted-foreground">
                  Customer Logo
                </div>
                <div className="h-12 w-32 bg-muted-foreground/20 rounded flex items-center justify-center text-xs font-medium text-muted-foreground">
                  Customer Logo
                </div>
                <div className="h-12 w-32 bg-muted-foreground/20 rounded flex items-center justify-center text-xs font-medium text-muted-foreground">
                  Customer Logo
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </Layout>
    </>
  )
}

export default Index
