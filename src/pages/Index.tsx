import { useEffect, useState } from 'react'
import { getCurrentUser } from 'aws-amplify/auth'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
// import { FileUploader } from '@/components/FileUploader'
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
  // FolderPlus,
  // Folders,
  ArrowRight,
} from 'lucide-react'
// import { SearchProducts } from '@/components/SearchProducts'
import { FaqAccordion } from '@/components/FaqAccordion'
import { AddToHomeScreen } from '@/components/AddToHomeScreen'

const Index = () => {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentUser()
        setIsAuthenticated(true)
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  return (
    <Layout>
      <div className="space-y-16">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Document Intelligence Platform
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-base sm:text-lg">
            Upload, analyze, and extract insights from your construction
            documents by asking site-relevant questions.
          </p>
          {!isAuthenticated && (
            <div className="mt-12 mb-16">
              <Button
                size="lg"
                className="group relative px-8 py-6 overflow-hidden rounded-full bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all duration-300"
                onClick={() => navigate('/signin')}
              >
                <div className="absolute inset-0 w-0 bg-white/20 transition-all duration-300 ease-out group-hover:w-full"></div>
                <div className="relative flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    Sign Up or Sign In
                  </span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Button>
            </div>
          )}
        </div>

        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Folders className="h-5 w-5 text-primary" />
                <CardTitle>Projects</CardTitle>
              </div>
              <CardDescription>
                Organize your documents in projects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create projects to organize your documents and collaborate with your team.
              </p>
              <div className="flex justify-center">
                <Button onClick={() => navigate("/projects")} className="w-full">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Manage Projects
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Upload Document</CardTitle>
              </div>
              <CardDescription>
                Supported formats: PDF, DOCX, TXT, JPG, PNG
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader />
            </CardContent>
          </Card>
        </div> */}

        {/* Product and Supplier Search */}
        {/* <SearchProducts /> */}

        {/* <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Or browse your existing documents
          </p>
          <Button onClick={() => navigate("/documents")}>
            View My Documents
          </Button>
        </div> */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Document Processing</CardTitle>
              </div>
              <CardDescription>
                Extract text and structure from various document formats
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Our platform uses AWS Textract to extract text, forms, and tables
              from documents, preserving their original structure for easy
              analysis.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">AI-Powered Insights</CardTitle>
              </div>
              <CardDescription>
                Generate summaries and extract key information
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Leverage AWS SageMaker to automatically summarize documents,
              extract key entities, and generate insights from your content.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Semantic Search</CardTitle>
              </div>
              <CardDescription>
                Find information based on meaning, not just keywords
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Our platform uses Pinecone vector database to enable powerful
              semantic search capabilities across your document library.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Secure Storage</CardTitle>
              </div>
              <CardDescription>
                Your documents are securely stored and managed
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              All documents are securely stored in AWS S3 with encryption and
              strict access controls to ensure your data remains protected.
            </CardContent>
          </Card>
        </div>
        <div className="py-8">
          <FaqAccordion />
        </div>
      </div>
      <AddToHomeScreen />
    </Layout>
  )
}

export default Index
