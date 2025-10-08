import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Terms = () => {
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
                Terms of Service
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
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using Jack of All Trades ("the Service"), you
                accept and agree to be bound by the terms and provision of this
                agreement. If you do not agree to abide by the above, please do
                not use this service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                2. Description of Service
              </h2>
              <p>
                Jack of All Trades is a document management and AI-powered
                analysis platform that allows users to upload, organize, and
                query documents using artificial intelligence. The Service
                includes features for document storage, processing, and
                intelligent search capabilities.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                3. User Accounts and Registration
              </h2>
              <div className="space-y-3">
                <p>
                  3.1. You must register for an account to use certain features
                  of the Service.
                </p>
                <p>
                  3.2. You are responsible for maintaining the confidentiality
                  of your account credentials.
                </p>
                <p>
                  3.3. You are responsible for all activities that occur under
                  your account.
                </p>
                <p>
                  3.4. You must provide accurate and complete information when
                  creating your account.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                4. Acceptable Use
              </h2>
              <div className="space-y-3">
                <p>You agree not to use the Service to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    Upload or process illegal, harmful, or copyrighted content
                    without permission
                  </li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>
                    Attempt to gain unauthorized access to other user accounts
                    or data
                  </li>
                  <li>
                    Use the Service for any commercial purpose without written
                    consent
                  </li>
                  <li>Upload malicious software or code</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                5. Content and Data
              </h2>
              <div className="space-y-3">
                <p>
                  5.1. You retain ownership of any content you upload to the
                  Service.
                </p>
                <p>
                  5.2. By uploading content, you grant Jack of All Trades a
                  limited license to process, store, and analyze your content to
                  provide the Service.
                </p>
                <p>
                  5.3. You are solely responsible for the content you upload and
                  must ensure you have the right to upload and process such
                  content.
                </p>
                <p>
                  5.4. We reserve the right to remove content that violates
                  these terms or applicable laws.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                6. Privacy and Data Protection
              </h2>
              <p>
                Your privacy is important to us. Our Privacy Policy explains how
                we collect, use, and protect your information when you use the
                Service. By using the Service, you agree to the collection and
                use of information in accordance with our Privacy Policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                7. Service Availability
              </h2>
              <div className="space-y-3">
                <p>
                  7.1. We strive to maintain high availability but do not
                  guarantee uninterrupted access to the Service.
                </p>
                <p>
                  7.2. We may suspend or discontinue the Service at any time
                  with reasonable notice.
                </p>
                <p>
                  7.3. We are not liable for any downtime, data loss, or other
                  issues resulting from service interruptions.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                8. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, Jack of All Trades shall
                not be liable for any indirect, incidental, special,
                consequential, or punitive damages, or any loss of profits or
                revenues, whether incurred directly or indirectly, or any loss
                of data, use, goodwill, or other intangible losses resulting
                from your use of the Service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                9. Termination
              </h2>
              <div className="space-y-3">
                <p>
                  9.1. You may terminate your account at any time by contacting
                  us.
                </p>
                <p>
                  9.2. We may terminate or suspend your account if you violate
                  these terms.
                </p>
                <p>
                  9.3. Upon termination, your right to use the Service will
                  cease immediately.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                10. Changes to Terms
              </h2>
              <p>
                We reserve the right to modify these terms at any time. We will
                notify users of significant changes via email or through the
                Service. Your continued use of the Service after changes
                constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                11. Contact Information
              </h2>
              <p>
                If you have any questions about these Terms of Service, please
                contact us at:
              </p>
              <div className="ml-4">
                <p>Email: legal@scopeiq.com</p>
                <p>Address: [Company Address]</p>
              </div>
            </section>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default Terms
