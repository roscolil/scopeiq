import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Privacy = () => {
  const navigate = useNavigate()

  return (
    <>
      {/* Full viewport gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950/95 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/70 via-cyan-950/60 to-violet-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-950/50 via-blue-950/70 to-indigo-950/60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/25 via-blue-950/10 to-purple-400/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-blue-500/15"></div>

        {/* Floating gradient orbs */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-violet-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/8 to-emerald-500/6 rounded-full blur-2xl"></div>
      </div>

      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
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

            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-gradient-to-br from-white via-cyan-200 to-violet-200 bg-clip-text mb-4">
                Privacy Policy
              </h1>
              <p className="text-slate-300 text-lg">
                Last updated: August 9, 2025
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-8 text-slate-200">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                1. Introduction
              </h2>
              <p>
                ScopeIQ ("we," "our," or "us") is committed to protecting your
                privacy. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our
                document management and AI analysis service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                2. Information We Collect
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-cyan-200 mb-2">
                    2.1 Personal Information
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Name and email address</li>
                    <li>Account credentials</li>
                    <li>Company or organization information</li>
                    <li>Contact information</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-cyan-200 mb-2">
                    2.2 Document and Content Data
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Documents and files you upload</li>
                    <li>Document metadata (file names, sizes, types)</li>
                    <li>
                      Content extracted from your documents for processing
                    </li>
                    <li>Search queries and interactions with AI features</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-cyan-200 mb-2">
                    2.3 Technical Information
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>IP address and location data</li>
                    <li>Browser type and version</li>
                    <li>Device information</li>
                    <li>Usage patterns and analytics</li>
                    <li>Log files and error reports</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                3. How We Use Your Information
              </h2>
              <div className="space-y-3">
                <p>We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide and maintain the ScopeIQ service</li>
                  <li>
                    Process and analyze your documents using AI technology
                  </li>
                  <li>Enable document search and query functionality</li>
                  <li>Authenticate your account and ensure security</li>
                  <li>Improve our services and develop new features</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Send important service notifications and updates</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                4. Data Storage and Security
              </h2>
              <div className="space-y-3">
                <p>
                  4.1. <strong>Storage:</strong> Your data is stored securely
                  using industry-standard cloud infrastructure with encryption
                  at rest and in transit.
                </p>
                <p>
                  4.2. <strong>Security Measures:</strong> We implement
                  appropriate technical and organizational measures to protect
                  your data against unauthorized access, alteration, disclosure,
                  or destruction.
                </p>
                <p>
                  4.3. <strong>Data Location:</strong> Your data may be stored
                  and processed in various locations to ensure optimal
                  performance and reliability.
                </p>
                <p>
                  4.4. <strong>Retention:</strong> We retain your data only as
                  long as necessary to provide our services or as required by
                  law.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                5. Data Sharing and Third Parties
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-cyan-200 mb-2">
                    5.1 Service Providers
                  </h3>
                  <p>
                    We may share your information with trusted third-party
                    service providers who assist us in operating our service,
                    including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Cloud storage and computing providers (AWS)</li>
                    <li>AI and machine learning service providers (OpenAI)</li>
                    <li>Analytics and monitoring services</li>
                    <li>Customer support platforms</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-cyan-200 mb-2">
                    5.2 Legal Requirements
                  </h3>
                  <p>
                    We may disclose your information if required by law, legal
                    process, or to protect the rights, property, or safety of
                    ScopeIQ, our users, or others.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-cyan-200 mb-2">
                    5.3 Business Transfers
                  </h3>
                  <p>
                    In the event of a merger, acquisition, or sale of assets,
                    your information may be transferred as part of the
                    transaction.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                6. Your Rights and Choices
              </h2>
              <div className="space-y-3">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access your personal information</li>
                  <li>Correct or update your information</li>
                  <li>Delete your account and associated data</li>
                  <li>Export your data</li>
                  <li>Object to certain processing activities</li>
                  <li>Withdraw consent where applicable</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, please contact us at
                  privacy@scopeiq.com.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                7. AI and Machine Learning
              </h2>
              <div className="space-y-3">
                <p>
                  7.1. <strong>AI Processing:</strong> We use artificial
                  intelligence to analyze and process your documents to provide
                  search and query functionality.
                </p>
                <p>
                  7.2. <strong>Data Usage:</strong> Your document content may be
                  processed by AI systems to generate embeddings, summaries, and
                  responses to queries.
                </p>
                <p>
                  7.3. <strong>Third-Party AI:</strong> We use third-party AI
                  services (such as OpenAI) which have their own privacy
                  policies and data handling practices.
                </p>
                <p>
                  7.4. <strong>No Training:</strong> Your data is not used to
                  train or improve third-party AI models unless explicitly
                  consented to.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                8. Cookies and Tracking
              </h2>
              <div className="space-y-3">
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Maintain your session and keep you logged in</li>
                  <li>Remember your preferences</li>
                  <li>Analyze usage patterns and improve our service</li>
                  <li>Provide personalized features</li>
                </ul>
                <p className="mt-4">
                  You can control cookie settings through your browser
                  preferences.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                9. International Data Transfers
              </h2>
              <p>
                Your information may be transferred to and processed in
                countries other than your own. We ensure that such transfers
                comply with applicable data protection laws and include
                appropriate safeguards.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                10. Children's Privacy
              </h2>
              <p>
                Our service is not intended for children under 13 years of age.
                We do not knowingly collect personal information from children
                under 13. If you are a parent or guardian and believe your child
                has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                11. Changes to This Privacy Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by posting the new Privacy
                Policy on this page and updating the "Last updated" date. Your
                continued use of the service after changes constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                12. Contact Us
              </h2>
              <p>
                If you have any questions about this Privacy Policy or our data
                practices, please contact us at:
              </p>
              <div className="ml-4 space-y-1">
                <p>Email: privacy@scopeiq.com</p>
                <p>Address: [Company Address]</p>
                <p>Phone: [Company Phone]</p>
              </div>
            </section>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default Privacy
