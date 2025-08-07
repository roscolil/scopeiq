import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { routes } from '@/utils/navigation'
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
      navigate(routes.auth.signup() + `?plan=${planName.toLowerCase()}`)
    }
  }

  return (
    <>
      {/* Dark gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Base dark gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-gray-900 to-black/95"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-cyan-500/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-500/8 via-transparent to-rose-500/6"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent"></div>

        {/* Multiple floating gradient orbs for dramatic effect */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-violet-500/12 to-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/8 to-emerald-500/6 rounded-full blur-2xl"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-bl from-rose-500/10 to-amber-500/8 rounded-full blur-2xl"></div>
      </div>

      <Layout>
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight mb-4 text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Choose the perfect plan for your construction document management
              needs. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span
                className={
                  billingCycle === 'monthly'
                    ? 'font-medium text-white'
                    : 'text-gray-400'
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
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-black"
                title="Toggle billing cycle"
                aria-label="Toggle billing cycle"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly'
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
              <span
                className={
                  billingCycle === 'yearly'
                    ? 'font-medium text-white'
                    : 'text-gray-400'
                }
              >
                Yearly
                <Badge
                  variant="secondary"
                  className="ml-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                >
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
                className={`relative bg-black/40 backdrop-blur-sm border-white/10 ${
                  plan.popular
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/25 scale-105'
                    : 'border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-3 py-1 border-0">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-white">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="mt-2 text-gray-400">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text">
                      {billingCycle === 'yearly' && plan.price !== 'Custom'
                        ? `$${Math.round(parseInt(plan.price.replace('$', '')) * 0.8)}`
                        : plan.price}
                    </span>
                    <span className="text-gray-400">
                      {plan.period &&
                        (billingCycle === 'yearly' ? '/year' : plan.period)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-center">
                        <Check className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0'
                        : 'bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20'
                    }`}
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
            <h2 className="text-3xl font-bold mb-8 text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto text-left space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  Can I change plans anytime?
                </h3>
                <p className="text-gray-300">
                  Yes, you can upgrade or downgrade your plan at any time.
                  Changes will be prorated on your next billing cycle.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  What happens during the free trial?
                </h3>
                <p className="text-gray-300">
                  You get full access to all features of your chosen plan for 14
                  days. No credit card required to start.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  Is my data secure?
                </h3>
                <p className="text-gray-300">
                  Absolutely. We use enterprise-grade security with encryption
                  at rest and in transit. Your data is regularly backed up and
                  secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default Pricing
