import { Layout } from '@/components/layout/Layout'
import { CommonTermsManager } from '@/components/shared/CommonTermsManager'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Database, Search, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const CommonTermsManagement = () => {
  const navigate = useNavigate()

  return (
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Enhanced darker and more vivid blue gradient background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/95 to-indigo-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/70 via-blue-950/80 to-violet-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-blue-950/60 via-indigo-950/80 to-blue-950/70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/25 via-blue-950/15 to-indigo-400/25"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-blue-600/20"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-indigo-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/8 to-blue-500/6 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-blue-500/10 to-indigo-500/8 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-tr from-indigo-500/6 to-blue-500/8 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-10 w-48 h-48 bg-gradient-to-l from-blue-500/8 to-cyan-500/6 rounded-full blur-xl"></div>
      </div>

      <Layout>
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Common Terms Management
              </h1>
              <p className="text-slate-200 mt-2">
                Manage industry-standard construction terms, codes, and
                specifications shared across all projects
              </p>
            </div>
          </div>

          {/* Benefits Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-emerald-400">
                  <Zap className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-300">
                  Faster search results by caching common industry terms once
                  and sharing across all projects.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <Search className="h-5 w-5" />
                  Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-300">
                  Consistent, industry-standard definitions for building codes,
                  safety regulations, and material specs.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-purple-400">
                  <Database className="h-5 w-5" />
                  Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-300">
                  Reduced storage costs and duplicate embeddings by centralizing
                  common construction knowledge.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Main Management Interface */}
          <CommonTermsManager />

          {/* Technical Details Card */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-200">How It Works</CardTitle>
              <CardDescription>
                Technical implementation of the common terms namespace system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-200">
                    Namespace Structure
                  </h4>
                  <div className="bg-slate-800/50 p-4 rounded-lg font-mono text-sm text-slate-300">
                    <div>
                      project_&#123;projectId&#125; → Project-specific content
                    </div>
                    <div>common_terms → Shared industry knowledge</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-200">
                    Search Strategy
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                      <span>
                        <strong>Smart routing:</strong> Automatically detects
                        query type
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                      <span>
                        <strong>Hybrid search:</strong> Combines project +
                        common results
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                      <span>
                        <strong>Weighted scoring:</strong> Balances relevance
                        and source
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export default CommonTermsManagement
