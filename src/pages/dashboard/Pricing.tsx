import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { routes } from '@/utils/ui/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/shared/Badge'
import { FeatureComparison, FaqAccordion } from '@/components/shared'
import { Check, Star, Building2, HardHat, Users } from 'lucide-react'

const pricingFaqs = [
  {
    question: 'Can I change plans anytime?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated on your next billing cycle.',
  },
  {
    question: 'What happens during the free trial?',
    answer:
      'You get full access to all features of your chosen plan for 14 days. No credit card required to start.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We use enterprise-grade security with encryption at rest and in transit. Your data is regularly backed up and secure.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      "Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us within 30 days for a full refund.",
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, MasterCard, American Express), ACH transfers, and can set up invoicing for Enterprise customers.',
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'Perfect for small teams getting started',
    features: [
      'Up to 5 projects',
      '100 documents per project',
      'Basic AI search',
      'Email support',
      '1GB storage',
    ],
    buttonText: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/month',
    description: 'Best for growing construction companies',
    features: [
      'Up to 25 projects',
      'Unlimited documents',
      'Advanced AI insights',
      'Priority support',
      '10GB storage',
      'Custom integrations',
      'Team collaboration',
    ],
    buttonText: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom needs',
    features: [
      'Unlimited projects',
      'Unlimited documents',
      'Custom AI models',
      'Dedicated support',
      'Unlimited storage',
      'SSO integration',
      'Advanced security',
      'Custom training',
    ],
    buttonText: 'Contact Sales',
    popular: false,
  },
]

const Pricing = () => {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly',
  )

  const handleGetStarted = (planName: string) => {
    if (planName === 'Enterprise') {
      // Handle enterprise contact
      window.location.href = 'mailto:sales@scopeiq.com'
    } else {
      // Navigate to signup with plan parameter
      navigate(routes.auth.signup() + `?plan=${planName.toLowerCase()}`)
    }
  }

  return (
    <>
      {/* Clean neutral background */}
      <div className="fixed inset-0 -z-10 bg-background"></div>

      <Layout>
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Simple, transparent pricing
            </h1>
            <p className="text-lg md:text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
              Choose the perfect plan for your construction document management
              needs. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span
                className={
                  billingCycle === 'monthly'
                    ? 'font-medium text-foreground'
                    : 'text-foreground/50'
                }
              >
                Monthly
              </span>
              <button
                onClick={() =>
                  setBillingCycle(
                    billingCycle === 'monthly' ? 'yearly' : 'monthly',
                  )
                }
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                title="Toggle billing cycle"
                aria-label="Toggle billing cycle"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${
                    billingCycle === 'yearly'
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
              <span
                className={
                  billingCycle === 'yearly'
                    ? 'font-medium text-foreground'
                    : 'text-foreground/50'
                }
              >
                Yearly
                <Badge
                  variant="secondary"
                  className="ml-2 bg-primary/10 text-primary border-primary/20"
                >
                  Save 20%
                </Badge>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            {pricingPlans.map(plan => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.popular
                    ? 'border-primary shadow-lg ring-2 ring-primary/20'
                    : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1.5 border-0 shadow-md">
                      <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl text-foreground">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="mt-2 text-foreground/60">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-6">
                    <span className="text-4xl font-bold text-foreground">
                      {billingCycle === 'yearly' && plan.price !== 'Custom'
                        ? `$${Math.round(parseInt(plan.price.replace('$', '')) * 0.8)}`
                        : plan.price}
                    </span>
                    <span className="text-foreground/60 text-base ml-1">
                      {plan.period &&
                        (billingCycle === 'yearly' ? '/year' : plan.period)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-start">
                        <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground/80">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-6 mt-auto">
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => handleGetStarted(plan.name)}
                  >
                    {plan.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Social Proof Section */}
          <div className="mb-20 py-12 border-y border-border">
            <p className="text-center text-sm text-foreground/50 mb-8 uppercase tracking-wide">
              Trusted by construction teams nationwide
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              <div className="flex items-center gap-2 text-foreground/60">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="font-semibold">500+ Projects</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/60">
                <HardHat className="w-5 h-5 text-primary" />
                <span className="font-semibold">50+ Companies</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/60">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-semibold">1,000+ Users</span>
              </div>
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="mb-20">
            <FeatureComparison />
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center text-foreground">
              Frequently Asked Questions
            </h2>
            <FaqAccordion faqs={pricingFaqs} />
          </div>
        </div>
      </Layout>
    </>
  )
}

export default Pricing
