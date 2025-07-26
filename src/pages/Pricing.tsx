import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/Badge'
import { Check, Star } from 'lucide-react'

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
      navigate(`/signup?plan=${planName.toLowerCase()}`)
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Choose the perfect plan for your construction document management
            needs. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span
              className={
                billingCycle === 'monthly'
                  ? 'font-medium'
                  : 'text-muted-foreground'
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
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="Toggle billing cycle"
              aria-label="Toggle billing cycle"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={
                billingCycle === 'yearly'
                  ? 'font-medium'
                  : 'text-muted-foreground'
              }
            >
              Yearly
              <Badge variant="secondary" className="ml-2">
                Save 20%
              </Badge>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map(plan => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="mt-2">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {billingCycle === 'yearly' && plan.price !== 'Custom'
                      ? `$${Math.round(parseInt(plan.price.replace('$', '')) * 0.8)}`
                      : plan.price}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.period &&
                      (billingCycle === 'yearly' ? '/year' : plan.period)}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleGetStarted(plan.name)}
                >
                  {plan.buttonText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto text-left space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                will be prorated on your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                What happens during the free trial?
              </h3>
              <p className="text-muted-foreground">
                You get full access to all features of your chosen plan for 14
                days. No credit card required to start.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Is my data secure?</h3>
              <p className="text-muted-foreground">
                Absolutely. We use enterprise-grade security with encryption at
                rest and in transit. Your data is regularly backed up and
                secure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Pricing
