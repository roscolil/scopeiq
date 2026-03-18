import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { contactService, type ContactFormData } from '@/services/api/contact'

const Contact = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    company: '',
    email: '',
    message: '',
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous status
    setSubmitStatus({ type: null, message: '' })

    if (!formData.name || !formData.email || !formData.message) {
      setSubmitStatus({
        type: 'error',
        message: 'Please fill in your name, email, and message.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      await contactService.submitContactForm({
        name: formData.name,
        company: formData.company || undefined,
        email: formData.email,
        message: formData.message,
      })

      setSubmitStatus({
        type: 'success',
        message:
          "Thank you for contacting us! We've received your message and will get back to you soon.",
      })

      // Reset form
      setFormData({
        name: '',
        company: '',
        email: '',
        message: '',
      })
    } catch (error) {
      console.error('Error submitting contact form:', error)
      setSubmitStatus({
        type: 'error',
        message: 'There was an error sending your message. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 hero-bg"></div>
        <div className="absolute inset-0 hero-glow"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-brand-navy/60 via-brand-blue-dark/40 to-brand-navy/70"></div>

        {/* Floating gradient orbs */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-brand-blue-light/15 to-brand-yellow/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-brand-blue-dark/12 to-brand-blue/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-brand-blue/8 to-brand-blue-light/6 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 right-0 hero-yellow-orb w-full h-full"></div>
      </div>

      <Layout>
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-gradient-to-br from-white via-brand-yellow/80 to-white bg-clip-text mb-4">
                Contact Us
              </h1>
              <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                Get in touch with our team. We'd love to hear from you and help
                with any questions about Jack.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <Card className="bg-brand-navy/50 border-brand-blue/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-brand-yellow" />
                    Our Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-300">
                  <p>Jack's Headquarters</p>
                  <p>123 Innovation Drive</p>
                  <p>Tech District, Melbourne VIC 3000</p>
                  <p>Australia</p>
                </CardContent>
              </Card>

              <Card className="bg-brand-navy/50 border-brand-blue/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Phone className="h-5 w-5 text-brand-yellow" />
                    Phone
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-300">
                  <p>+61 2 9123 4567</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Monday - Friday, 9:00 AM - 6:00 PM AEST
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-brand-navy/50 border-brand-blue/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="h-5 w-5 text-brand-yellow" />
                    Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-300">
                  <p>hello@scopeiq.com</p>
                  <p>support@scopeiq.com</p>
                  <p className="text-sm text-slate-400 mt-1">
                    We typically respond within 24 hours
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-brand-navy/50 border-brand-blue/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brand-yellow" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-300">
                  <div className="space-y-1">
                    <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p>Saturday: 10:00 AM - 4:00 PM</p>
                    <p>Sunday: Closed</p>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    All times in Australian Eastern Standard Time (AEST)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="bg-brand-navy/50 border-brand-blue/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-brand-yellow" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Success/Error Message */}
                {submitStatus.type && (
                  <div
                    className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
                      submitStatus.type === 'success'
                        ? 'bg-brand-blue-dark/30 border-brand-blue/30 text-brand-blue-light'
                        : 'bg-red-950/30 border-red-500/30 text-red-200'
                    }`}
                  >
                    {submitStatus.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-brand-yellow flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    )}
                    <p className="text-sm">{submitStatus.message}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-200">
                        Name *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                        placeholder="Your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-slate-200">
                        Company
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                        placeholder="Your company name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-slate-200">
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 resize-none"
                      placeholder="Tell us about your inquiry, project, or how we can help you..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-brand-blue to-brand-blue-light hover:from-brand-blue-dark hover:to-brand-blue text-white border-0 h-12 text-base font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <div className="text-center space-y-4 pt-8">
            <h3 className="text-2xl font-semibold text-white">
              Need Immediate Help?
            </h3>
            <p className="text-slate-300 max-w-2xl mx-auto">
              For urgent technical support or sales inquiries, you can reach us
              directly at{' '}
              <a
                href="tel:+61291234567"
                className="text-brand-yellow hover:text-brand-yellow/80 transition-colors"
              >
                +61 2 9123 4567
              </a>{' '}
              or email{' '}
              <a
                href="mailto:support@scopeiq.com"
                className="text-brand-yellow hover:text-brand-yellow/80 transition-colors"
              >
                support@scopeiq.com
              </a>
            </p>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default Contact
