import { Layout } from '@/components/layout/Layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Linkedin, Twitter, Mail } from 'lucide-react'

const OurTeam = () => {
  const teamMembers = [
    {
      name: 'Paul Yerondais',
      role: 'Co-Founder',
      bio: 'Passionate about transforming the construction industry through AI and intelligent document processing.',
      image: '/placeholder.svg',
      linkedin: '#',
      twitter: '#',
      email: 'paul@exelion.ai',
    },
    {
      name: 'Mark Bray',
      role: 'Co-founder',
      bio: 'Expert in machine learning and AI systems with 10+ years in enterprise software development.',
      image: '/placeholder.svg',
      linkedin: '#',
      twitter: '#',
      email: 'mark@exelion.ai',
    },
    {
      name: 'Ross Lillis',
      role: 'Tech Lead',
      bio: 'Former construction project manager turned product leader, bridging industry needs with technology.',
      image: '/placeholder.svg',
      linkedin: '#',
      twitter: '#',
      email: 'ross@exelion.ai',
    },
    {
      name: 'The Stig',
      role: 'Lead Driver',
      bio: 'Full-stack developer specializing in document processing and real-time collaboration systems.',
      image: '/placeholder.svg',
      linkedin: '#',
      twitter: '#',
      email: 'stig@exelion.ai',
    },
  ]

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Our Team</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Meet the passionate individuals behind Jack of All Trades who are
            dedicated to revolutionizing how construction professionals work
            with documents and data.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-semibold mb-4 text-center">
            Our Mission
          </h2>
          <p className="text-lg text-center text-muted-foreground max-w-4xl mx-auto">
            We believe that construction professionals deserve tools that
            understand their workflow, not force them to adapt to rigid
            software. Our team combines deep industry knowledge with
            cutting-edge AI to create solutions that truly serve the people who
            build our world.
          </p>
        </div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-16">
          {teamMembers.map((member, index) => (
            <Card
              key={index}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <CardHeader className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
                  {member.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </div>
                <CardTitle className="text-xl">{member.name}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary" className="text-sm">
                    {member.role}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 text-center">
                  {member.bio}
                </p>
                <div className="flex justify-center space-x-4">
                  <a
                    href={member.linkedin}
                    className="text-muted-foreground hover:text-blue-600 transition-colors"
                    aria-label={`${member.name} LinkedIn`}
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a
                    href={member.twitter}
                    className="text-muted-foreground hover:text-blue-400 transition-colors"
                    aria-label={`${member.name} Twitter`}
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a
                    href={`mailto:${member.email}`}
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                    aria-label={`Email ${member.name}`}
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Company Values */}
        <div className="text-center">
          <h2 className="text-3xl font-semibold mb-8 text-white">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">
                Innovation
              </h3>
              <p className="text-muted-foreground">
                We constantly push the boundaries of what's possible with AI and
                construction technology.
              </p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3 text-green-600">
                Reliability
              </h3>
              <p className="text-muted-foreground">
                Our solutions are built to work consistently in the demanding
                environment of construction projects.
              </p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3 text-purple-600">
                Collaboration
              </h3>
              <p className="text-muted-foreground">
                We believe the best solutions come from understanding and
                working closely with our users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default OurTeam
