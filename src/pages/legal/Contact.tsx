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
    <Layout>
      <div className="bg-gradient-to-b from-white to-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
          {/* Header */}
          <div className="space-y-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:scale-105 transition-all duration-200 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                Contact Us
              </h1>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Get in touch with our team. We'd love to hear from you and help
                with any questions about Jack.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <Card className="border-gray-200 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Our Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700">
                  <p>Jack Headquarters</p>
                  <p>123 Innovation Drive</p>
                  <p>Tech District, Melbourne VIC 3000</p>
                  <p>Australia</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Phone
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700">
                  <p>+61 2 9123 4567</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Monday - Friday, 9:00 AM - 6:00 PM AEST
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700">
                  <p>hello@joat.com</p>
                  <p>support@joat.com</p>
                  <p className="text-sm text-gray-500 mt-1">
                    We typically respond within 24 hours
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700">
                  <div className="space-y-1">
                    <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p>Saturday: 10:00 AM - 4:00 PM</p>
                    <p>Sunday: Closed</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    All times in Australian Eastern Standard Time (AEST)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="border-gray-200 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Success/Error Message */}
                {submitStatus.type && (
                  <div
                    className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
                      submitStatus.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {submitStatus.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <p className="text-sm">{submitStatus.message}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-700">
                        Name *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                        placeholder="Your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-gray-700">
                        Company
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                        placeholder="Your company name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="border-gray-300 focus:border-primary focus:ring-primary"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-700">
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="border-gray-300 focus:border-primary focus:ring-primary resize-none"
                      placeholder="Tell us about your inquiry, project, or how we can help you..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-white border-0 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all"
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
          <div className="text-center space-y-4 pt-8 border-t border-gray-200">
            <h3 className="text-2xl font-semibold text-gray-900">
              Need Immediate Help?
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              For urgent technical support or sales inquiries, you can reach us
              directly at{' '}
              <a
                href="tel:+61291234567"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                +61 2 9123 4567
              </a>{' '}
              or email{' '}
              <a
                href="mailto:support@scopeiq.com"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                support@joat.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Contact
