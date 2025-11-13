import { Check, X, Minus } from 'lucide-react'
import { Fragment } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FeatureComparisonProps {
  className?: string
}

interface Feature {
  category: string
  items: {
    name: string
    starter: boolean | string
    professional: boolean | string
    enterprise: boolean | string
  }[]
}

const features: Feature[] = [
  {
    category: 'Projects & Storage',
    items: [
      {
        name: 'Projects',
        starter: '5 projects',
        professional: '25 projects',
        enterprise: 'Unlimited',
      },
      {
        name: 'Documents per project',
        starter: '100 documents',
        professional: 'Unlimited',
        enterprise: 'Unlimited',
      },
      {
        name: 'Storage',
        starter: '1GB',
        professional: '10GB',
        enterprise: 'Unlimited',
      },
      {
        name: 'File retention',
        starter: '1 year',
        professional: '3 years',
        enterprise: 'Unlimited',
      },
    ],
  },
  {
    category: 'AI & Analysis',
    items: [
      {
        name: 'AI document search',
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: 'AI insights & summaries',
        starter: 'Basic',
        professional: 'Advanced',
        enterprise: 'Advanced',
      },
      {
        name: 'Construction terminology detection',
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Custom AI models',
        starter: false,
        professional: false,
        enterprise: true,
      },
      {
        name: 'Batch AI analysis',
        starter: false,
        professional: true,
        enterprise: true,
      },
      {
        name: 'AI training & fine-tuning',
        starter: false,
        professional: false,
        enterprise: true,
      },
    ],
  },
  {
    category: 'Collaboration',
    items: [
      {
        name: 'Team members',
        starter: '3 members',
        professional: '15 members',
        enterprise: 'Unlimited',
      },
      {
        name: 'User roles & permissions',
        starter: 'Basic',
        professional: 'Advanced',
        enterprise: 'Custom',
      },
      {
        name: 'Project sharing',
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Commenting & annotations',
        starter: false,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Real-time collaboration',
        starter: false,
        professional: true,
        enterprise: true,
      },
    ],
  },
  {
    category: 'Integrations',
    items: [
      {
        name: 'API access',
        starter: false,
        professional: 'Rate limited',
        enterprise: 'Unlimited',
      },
      {
        name: 'Webhooks',
        starter: false,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Custom integrations',
        starter: false,
        professional: false,
        enterprise: true,
      },
      {
        name: 'SSO (Single Sign-On)',
        starter: false,
        professional: false,
        enterprise: true,
      },
      {
        name: 'Third-party apps',
        starter: false,
        professional: 'Limited',
        enterprise: 'Full access',
      },
    ],
  },
  {
    category: 'Support & Security',
    items: [
      {
        name: 'Support type',
        starter: 'Email',
        professional: 'Priority',
        enterprise: 'Dedicated',
      },
      {
        name: 'Response time',
        starter: '48 hours',
        professional: '24 hours',
        enterprise: '4 hours',
      },
      {
        name: 'Data encryption',
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Advanced security features',
        starter: false,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Compliance certifications',
        starter: false,
        professional: false,
        enterprise: true,
      },
      {
        name: 'Audit logs',
        starter: false,
        professional: 'Basic',
        enterprise: 'Advanced',
      },
      {
        name: 'Custom SLA',
        starter: false,
        professional: false,
        enterprise: true,
      },
    ],
  },
]

const FeatureCell = ({ value }: { value: boolean | string }) => {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-5 w-5 text-emerald-600 mx-auto" />
    ) : (
      <X className="h-5 w-5 text-gray-400 mx-auto" />
    )
  }

  if (
    value === 'Basic' ||
    value === 'Limited' ||
    value.includes('Rate limited')
  ) {
    return (
      <span className="text-sm text-gray-600 flex items-center justify-center gap-1">
        <Minus className="h-4 w-4" />
        {value}
      </span>
    )
  }

  return <span className="text-sm text-gray-900 font-medium">{value}</span>
}

export const FeatureComparison = ({ className }: FeatureComparisonProps) => {
  return (
    <div className={className}>
      <Card className="bg-gradient-to-br from-white to-gray-50 border-primary/20">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold text-gray-900">
            Compare Plans
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2 font-medium">
            Find the perfect plan for your construction document management
            needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-4 px-4 text-gray-700 font-semibold">
                    Features
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        Starter
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        $29
                      </span>
                      <span className="text-sm text-gray-600">/month</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 bg-primary/5 rounded-t-lg">
                    <div className="flex flex-col items-center gap-2">
                      <Badge className="bg-primary text-white mb-1">
                        Most Popular
                      </Badge>
                      <span className="text-lg font-bold text-gray-900">
                        Professional
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        $79
                      </span>
                      <span className="text-sm text-gray-600">/month</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        Enterprise
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        Custom
                      </span>
                      <span className="text-sm text-gray-600">pricing</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((category, categoryIndex) => (
                  <Fragment key={`category-${categoryIndex}`}>
                    <tr>
                      <td
                        colSpan={4}
                        className="pt-8 pb-3 px-4 text-sm font-semibold text-primary uppercase tracking-wider"
                      >
                        {category.category}
                      </td>
                    </tr>
                    {category.items.map((item, itemIndex) => (
                      <tr
                        key={`item-${categoryIndex}-${itemIndex}`}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 text-gray-700 font-medium">
                          {item.name}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <FeatureCell value={item.starter} />
                        </td>
                        <td className="py-4 px-4 text-center bg-primary/5">
                          <FeatureCell value={item.professional} />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <FeatureCell value={item.enterprise} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet View */}
          <div className="lg:hidden space-y-8">
            {/* Plan Headers */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-100 rounded-lg">
                <div className="text-sm font-bold text-gray-900 mb-2">
                  Starter
                </div>
                <div className="text-xl font-bold text-primary">$29</div>
                <div className="text-xs text-gray-600">/mo</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <Badge className="bg-primary text-white mb-2 text-xs">
                  Popular
                </Badge>
                <div className="text-sm font-bold text-gray-900 mb-2">
                  Professional
                </div>
                <div className="text-xl font-bold text-primary">$79</div>
                <div className="text-xs text-gray-600">/mo</div>
              </div>
              <div className="text-center p-4 bg-gray-100 rounded-lg">
                <div className="text-sm font-bold text-gray-900 mb-2">
                  Enterprise
                </div>
                <div className="text-xl font-bold text-primary">Custom</div>
                <div className="text-xs text-gray-600">pricing</div>
              </div>
            </div>

            {/* Feature Categories */}
            {features.map((category, categoryIndex) => (
              <div
                key={`mobile-category-${categoryIndex}`}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  {category.category}
                </h3>
                {category.items.map((item, itemIndex) => (
                  <div
                    key={`mobile-item-${categoryIndex}-${itemIndex}`}
                    className="bg-gray-100 rounded-lg p-4"
                  >
                    <div className="font-semibold text-gray-900 mb-3 text-sm">
                      {item.name}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <FeatureCell value={item.starter} />
                      </div>
                      <div className="bg-primary/5 rounded px-2 py-1">
                        <FeatureCell value={item.professional} />
                      </div>
                      <div>
                        <FeatureCell value={item.enterprise} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
