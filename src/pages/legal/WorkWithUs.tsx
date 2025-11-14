import { Layout } from '@/components/layout/Layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Clock,
  DollarSign,
  Users,
  Code,
  Briefcase,
  Heart,
  ArrowRight,
  Mail,
} from 'lucide-react'

const WorkWithUs = () => {
  const openPositions = [
    {
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      location: 'Remote / San Francisco',
      type: 'Full-time',
      salary: '$120K - $180K',
      description:
        'Join our engineering team to build the next generation of AI-powered construction tools.',
      requirements: [
        '5+ years React/TypeScript experience',
        'Experience with AI/ML integrations',
        'Strong backend development skills',
        'Construction industry knowledge a plus',
      ],
    },
    {
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote / New York',
      type: 'Full-time',
      salary: '$100K - $140K',
      description:
        'Design intuitive experiences that make complex construction workflows simple and efficient.',
      requirements: [
        '3+ years product design experience',
        'Experience with B2B SaaS products',
        'Strong user research skills',
        'Figma proficiency required',
      ],
    },
    {
      title: 'Construction Industry Specialist',
      department: 'Product',
      location: 'Remote',
      type: 'Full-time',
      salary: '$90K - $130K',
      description:
        'Bridge the gap between construction industry needs and our technology solutions.',
      requirements: [
        '5+ years construction industry experience',
        'Project management background',
        'Strong communication skills',
        'Technology adoption experience',
      ],
    },
    {
      title: 'AI/ML Engineer',
      department: 'Engineering',
      location: 'Remote / San Francisco',
      type: 'Full-time',
      salary: '$140K - $200K',
      description:
        'Develop and improve our document processing and analysis AI models.',
      requirements: [
        'PhD/MS in AI/ML or equivalent experience',
        'Experience with NLP and document processing',
        'Python, TensorFlow/PyTorch experience',
        'Production ML system experience',
      ],
    },
  ]

  const benefits = [
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Health & Wellness',
      description:
        'Comprehensive health insurance, dental, vision, and mental health support',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Flexible Schedule',
      description:
        "Work when you're most productive with flexible hours and unlimited PTO",
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Remote First',
      description:
        'Work from anywhere with occasional team gatherings and offsites',
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: 'Growth & Learning',
      description:
        'Annual learning budget, conference attendance, and mentorship programs',
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Equity & Bonuses',
      description: 'Competitive equity package and performance-based bonuses',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Great Team',
      description:
        'Work with passionate, talented people who care about making an impact',
    },
  ]

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Work With Us
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join our mission to transform the construction industry with AI.
            We're looking for passionate individuals who want to make a real
            impact.
          </p>
        </div>

        {/* Company Culture */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-semibold mb-4 text-center text-white">
            Why Jack?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-3">
                🚀 High Impact Work
              </h3>
              <p className="text-muted-foreground">
                Your work directly helps construction professionals save time,
                reduce errors, and build better projects.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">
                🧠 Cutting-Edge Technology
              </h3>
              <p className="text-muted-foreground">
                Work with the latest AI technologies, from large language models
                to computer vision systems.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">
                💡 Innovation Freedom
              </h3>
              <p className="text-muted-foreground">
                We encourage experimentation and give you the autonomy to
                explore new solutions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">
                🌱 Growth Opportunities
              </h3>
              <p className="text-muted-foreground">
                Rapid company growth means rapid career growth with new
                challenges and responsibilities.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold text-center mb-8 text-foreground">
            Benefits & Perks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6">
                <div className="flex justify-center mb-4 text-blue-600">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold text-center mb-8 text-foreground">
            Open Positions
          </h2>
          <div className="space-y-6">
            {openPositions.map((position, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">
                        {position.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline">{position.department}</Badge>
                        <Badge variant="outline">
                          <MapPin className="w-3 h-3 mr-1" />
                          {position.location}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {position.type}
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {position.salary}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-base">
                    {position.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Key Requirements:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {position.requirements.map((req, reqIndex) => (
                        <li key={reqIndex}>{req}</li>
                      ))}
                    </ul>
                  </div>
                  <Button className="w-full sm:w-auto">
                    Apply Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center bg-muted/50 rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">
            Don't See Your Role?
          </h2>
          <p className="text-muted-foreground mb-6">
            We're always looking for talented individuals. Send us your resume
            and tell us how you'd like to contribute.
          </p>
          <Button size="lg" className="gap-2">
            <Mail className="w-4 h-4" />
            careers@scopeiq.com
          </Button>
        </div>
      </div>
    </Layout>
  )
}

export default WorkWithUs
