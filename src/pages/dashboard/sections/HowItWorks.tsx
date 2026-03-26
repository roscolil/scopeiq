import { Upload, MessageSquare, Zap } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Upload your documents',
      description: 'PDFs, plans, specs, images — any format',
      step: 1,
    },
    {
      icon: MessageSquare,
      title: 'Ask in plain English',
      description: 'We process the data. Just ask your question.',
      step: 2,
    },
    {
      icon: Zap,
      title: 'Get instant answers',
      description: 'Precise answers refereced from your documents.',
      step: 3,
    },
  ]

  return (
    <div className="px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 text-gradient-yellow">
            Get answers in three steps
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            No complicated setup. No training. Just results.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Dashed line connector - desktop only */}
          <div
            className="absolute top-12 hidden h-px border-t-2 border-dashed border-white/20 md:block"
            style={{ left: '16.67%', right: '16.67%' }}
          />

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={index} className="relative h-full">
                {/* Card */}
                <div className="group relative overflow-hidden flex flex-col items-center rounded-2xl border border-white/10 bg-brand-navy/40 backdrop-blur-sm p-8 text-center transition-all duration-300 hover:bg-brand-navy/50 h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-navy/60 via-brand-blue-dark/50 to-brand-navy/40 group-hover:from-brand-navy/65 group-hover:via-brand-blue-dark/55 group-hover:to-brand-navy/45 transition-all duration-300 rounded-2xl" />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-blue/10 to-brand-yellow/15 rounded-full blur-2xl" />

                  {/* Step number badge */}
                  <div className="relative z-10 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-yellow px-3 py-1 text-xs font-semibold text-brand-navy">
                    Step {step.step}
                  </div>

                  {/* Icon */}
                  <div className="relative z-10 mb-6 mt-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue/10 via-brand-navy/20 to-brand-yellow/10 border border-white/10">
                    <step.icon className="h-8 w-8 text-brand-yellow" />
                  </div>

                  {/* Title */}
                  <h3 className="relative z-10 mb-3 text-xl font-bold text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-300 bg-clip-text">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="relative z-10 text-gray-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
