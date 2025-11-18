# Sales Funnel & Conversion Strategy

## Overview

This document outlines the complete sales funnel strategy for Jack of All Trades (ScopeIQ), from initial visitor awareness through conversion to paying customer and retention.

---

## Sales Funnel Stages

```
┌─────────────────────────────────────────────────────────────────┐
│                     AWARENESS STAGE                              │
│  Homepage → Product Demo → Feature Pages → Blog/Content         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     INTEREST STAGE                               │
│  Pricing Page → Feature Comparison → Testimonials → FAQs        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     CONSIDERATION STAGE                          │
│  Sign Up (Free Trial) → Plan Selection → Email Verification     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     CONVERSION STAGE                             │
│  Onboarding → First Project → Document Upload → AI Query        │
│  Trial Experience → Value Realization → Upgrade Prompts         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PURCHASE STAGE                               │
│  Trial Ending Reminder → Pricing Page → Checkout → Payment      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     RETENTION STAGE                              │
│  Onboarding Emails → Usage Tracking → Feature Updates           │
│  Customer Success → Upsells → Renewals                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Current Implementation Status

### ✅ Already Implemented

1. **Homepage** - Attractive landing page with clear value proposition
2. **Pricing Page** - Clean, conversion-focused design with 3 tiers
3. **Sign Up Flow** - Email/password registration with role selection
4. **Email Verification** - AWS Cognito email verification
5. **Onboarding Modal** - 3-step guided onboarding for new users
6. **Empty States** - Contextual guidance for projects, documents, search
7. **Soft Paywall Modals** - Empathetic upgrade prompts with free trial offers
8. **Feature Comparison** - Table comparing plan features
9. **FAQ Accordion** - Common questions answered
10. **Mobile Bottom Navigation** - Optimized mobile UX

### ❌ Missing / Needs Implementation

1. **Plan Selection During Signup** - Currently shows plan in URL but doesn't persist
2. **Trial Tracking** - No database tracking of trial start/end dates
3. **Payment Integration** - No Stripe checkout flow
4. **Trial Reminder Emails** - No automated emails before trial expires
5. **Conversion Analytics** - No tracking of funnel drop-off points
6. **Upgrade CTAs** - Limited in-app upgrade prompts during trial
7. **Usage-Based Triggers** - No prompts when approaching limits
8. **Customer Success Emails** - No automated onboarding email sequence
9. **Exit Intent Popups** - No retention attempts for cancellations
10. **Referral Program** - No viral growth mechanism

---

## Detailed Funnel Optimization Strategy

### Stage 1: Awareness (Homepage & Marketing)

**Objective:** Drive qualified traffic to the website

#### Current State:

- Clean homepage with gradient background
- Product demo section with video
- Feature grid with icons
- "Get Started Free" and "View Pricing" CTAs

#### Optimizations Needed:

**1.1 Add Social Proof Above the Fold**

```tsx
<div className="text-center mb-8">
  <div className="flex items-center justify-center gap-6">
    <div className="flex items-center gap-2">
      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
      <span className="text-gray-300">4.9/5 from 100+ reviews</span>
    </div>
    <div className="flex items-center gap-2">
      <Users className="w-5 h-5 text-primary" />
      <span className="text-gray-300">1,000+ construction teams</span>
    </div>
  </div>
</div>
```

**1.2 Add Trust Badges**

- Display logos of well-known construction companies using the platform
- Industry certifications or compliance badges
- Security badges (AWS, SOC 2, etc.)

**1.3 Add Video Testimonials**

- Short (30-60 second) video testimonials from satisfied customers
- Before/after comparisons showing time saved

**1.4 Improve CTAs**

- A/B test "Start Free Trial" vs "Get Started Free"
- Add urgency: "Join 1,000+ teams" or "Start your 14-day trial"
- Make CTAs more prominent with animation

### Stage 2: Interest (Pricing & Feature Pages)

**Objective:** Educate visitors on value proposition and pricing

#### Current State:

- Pricing page with 3 tiers (Starter, Professional, Enterprise)
- Monthly/Yearly toggle with 20% discount
- Feature comparison table
- FAQ accordion
- Social proof section

#### Optimizations Needed:

**2.1 Add Calculator/ROI Tool**

```tsx
const ROICalculator = () => {
  const [hoursPerWeek, setHoursPerWeek] = useState(5)
  const [hourlyRate, setHourlyRate] = useState(75)

  const timeSaved = hoursPerWeek * 4 // per month
  const moneySaved = timeSaved * hourlyRate
  const roiMultiple = moneySaved / 79 // Professional plan price

  return (
    <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-xl">
      <h3 className="text-2xl font-bold mb-6">Calculate Your ROI</h3>

      <div className="space-y-4">
        <div>
          <label>Hours spent searching documents per week:</label>
          <Slider
            value={[hoursPerWeek]}
            onValueChange={([v]) => setHoursPerWeek(v)}
          />
          <span>{hoursPerWeek} hours</span>
        </div>

        <div>
          <label>Average hourly rate:</label>
          <Input
            type="number"
            value={hourlyRate}
            onChange={e => setHourlyRate(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mt-6 p-6 bg-white rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">Monthly Savings</p>
          <p className="text-4xl font-bold text-primary">
            ${moneySaved.toFixed(0)}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {roiMultiple.toFixed(1)}x ROI on Professional Plan
          </p>
        </div>
      </div>
    </div>
  )
}
```

**2.2 Add Case Studies**

- Dedicated page with detailed customer success stories
- Quantifiable results (e.g., "50% reduction in document search time")
- Industry-specific case studies (commercial, residential, infrastructure)

**2.3 Improve Feature Comparison**

- Add tooltips explaining technical features
- Highlight most popular plan more prominently
- Add "Recommended for you" based on company size or industry

**2.4 Add Live Chat**

- Implement Intercom or similar for real-time support
- Proactive chat triggers on pricing page after 30 seconds
- FAQ bot to answer common questions

### Stage 3: Consideration (Sign Up Flow)

**Objective:** Convert visitors to trial users with minimal friction

#### Current State:

- Email/password signup
- Name and company fields
- Role selection (Admin/Owner/User)
- Email verification required

#### Optimizations Needed:

**3.1 Streamline Sign Up Form**

**CURRENT FORM (5 fields):**

- Name
- Company
- Email
- Password
- Confirm Password
- Role

**OPTIMIZED FORM (3 fields initially):**

```tsx
// Step 1: Essential info only
<Form>
  <FormField name="email" label="Work Email" />
  <FormField name="password" label="Password" />
  <FormField name="name" label="Full Name" />
  <Button type="submit">Start Free Trial →</Button>
</Form>

// Step 2: After email verification, collect additional info
<Form>
  <FormField name="company" label="Company Name" />
  <FormField name="industry" label="Industry" type="select" />
  <FormField name="companySize" label="Team Size" type="select" />
</Form>
```

**3.2 Add Social Sign-Up**

```tsx
<div className="space-y-4">
  <Button variant="outline" onClick={signUpWithGoogle}>
    <GoogleIcon /> Sign up with Google
  </Button>
  <Button variant="outline" onClick={signUpWithMicrosoft}>
    <MicrosoftIcon /> Sign up with Microsoft
  </Button>

  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t" />
    </div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-background px-2 text-muted-foreground">Or</span>
    </div>
  </div>

  {/* Email signup form */}
</div>
```

**3.3 Add Plan Selection Widget**

```tsx
// Display on sign-up page if plan parameter in URL
const SignUpWithPlan = () => {
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan')

  return (
    <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Selected Plan</p>
          <p className="text-2xl font-bold capitalize">{selectedPlan}</p>
          <p className="text-sm text-muted-foreground">
            14-day free trial • No credit card required
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
          Change Plan
        </Button>
      </div>
    </div>
  )
}
```

**3.4 Add Progress Indicator**

```tsx
<div className="mb-8">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-medium">Step 1 of 3</span>
    <span className="text-sm text-muted-foreground">Almost there!</span>
  </div>
  <Progress value={33} />
</div>
```

**3.5 Exit Intent Popup**

```tsx
// Trigger when user moves mouse toward browser close button
const ExitIntentModal = () => {
  return (
    <Dialog open={showExitIntent}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wait! Before you go...</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Join 1,000+ construction teams saving 10+ hours per week</p>

          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="font-semibold">🎁 Special Offer</p>
            <p className="text-sm">
              Get an extra 7 days on your trial (21 days total)
            </p>
          </div>

          <Button className="w-full">Claim Extended Trial</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Stage 4: Conversion (Trial Experience)

**Objective:** Demonstrate value during trial to convert to paid

#### Current State:

- Onboarding modal with 3 steps
- Empty states with CTAs
- Soft paywall modals when limits reached

#### Optimizations Needed:

**4.1 Personalized Onboarding**

```tsx
const PersonalizedOnboarding = () => {
  // Based on industry selected during signup
  const templates = {
    commercial: {
      sampleProject: 'Downtown Office Complex',
      sampleDocuments: ['Floor Plans', 'MEP Drawings', 'Specifications'],
    },
    residential: {
      sampleProject: 'Riverside Apartments',
      sampleDocuments: ['Site Plan', 'Elevations', 'Building Codes'],
    },
    infrastructure: {
      sampleProject: 'Highway Extension Project',
      sampleDocuments: ['Engineering Drawings', 'Soil Reports', 'Permits'],
    },
  }

  return (
    <div>
      <h3>We've set up a sample project for you</h3>
      <Button onClick={createSampleProject}>
        Create "{templates[industry].sampleProject}"
      </Button>
    </div>
  )
}
```

**4.2 Progress Checklist**

```tsx
const TrialProgressChecklist = () => {
  const tasks = [
    { id: 1, title: 'Create your first project', completed: true },
    { id: 2, title: 'Upload 5 documents', completed: true },
    { id: 3, title: 'Try AI search', completed: false },
    { id: 4, title: 'Invite a team member', completed: false },
    { id: 5, title: 'Use voice search', completed: false },
  ]

  const progress = (tasks.filter(t => t.completed).length / tasks.length) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get the most from your trial</CardTitle>
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground">
          {progress}% complete • {14 - daysInTrial} days remaining
        </p>
      </CardHeader>
      <CardContent>
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 py-2">
            {task.completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300" />
            )}
            <span
              className={task.completed ? 'line-through text-gray-500' : ''}
            >
              {task.title}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

**4.3 Trial Timer Banner**

```tsx
const TrialBanner = () => {
  const daysRemaining = getTrialDaysRemaining()

  if (daysRemaining > 7) return null // Only show in last week

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5" />
          <span className="font-medium">
            {daysRemaining} days left in your trial
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/pricing')}
        >
          Upgrade Now
        </Button>
      </div>
    </div>
  )
}
```

**4.4 In-App Messaging**

```tsx
// Show contextual upgrade messages
const UpgradePrompts = {
  // After uploading 50 documents
  documents: {
    trigger: documentCount >= 50,
    message:
      "You're getting close to the Starter plan limit (100 docs). Upgrade to Professional for unlimited documents.",
    cta: 'Upgrade to Professional',
  },

  // After creating 3 projects
  projects: {
    trigger: projectCount >= 3,
    message:
      'Managing multiple projects? Professional plan allows up to 25 projects.',
    cta: 'See Plans',
  },

  // After 10 AI queries
  aiQueries: {
    trigger: aiQueryCount >= 10,
    message: 'Loving AI search? Get advanced AI features with Professional.',
    cta: 'Learn More',
  },
}
```

**4.5 Email Automation Sequence**

```
Day 0 (Sign Up): Welcome email + Getting started guide
Day 1: "How to upload your first document" (video tutorial)
Day 3: "Power user tips: Voice search & AI analysis"
Day 5: "Invite your team for better collaboration"
Day 7: "You're halfway through your trial!" (progress update)
Day 10: "Case study: How [Company] saved 20 hours/week"
Day 11: "3 days left - Here's what you'll miss"
Day 13: "Last day of trial - Special upgrade offer"
Day 14: Trial ended (if not converted)
Day 15: "We'd love to have you back" (reactivation offer)
```

### Stage 5: Purchase (Checkout & Payment)

**Objective:** Make payment process seamless and trustworthy

#### Current State:

- Pricing page with "Start Free Trial" buttons
- No actual checkout flow

#### Optimizations Needed:

**5.1 Stripe Checkout Integration**

- Use Stripe Checkout (hosted) for simplicity and trust
- Embed Stripe Elements for custom branded experience
- Support multiple payment methods (cards, ACH, wire)

**5.2 Checkout Page Optimization**

```tsx
const CheckoutPage = () => {
  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left: Order Summary */}
      <div>
        <h2>Order Summary</h2>
        <Card>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Professional Plan (Monthly)</span>
                <span>$79.00</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>14-day free trial</span>
                <span>-$79.00</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Due Today</span>
                <span>$0.00</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You'll be charged $79.00 on {trialEndDate}. Cancel anytime.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trust Badges */}
        <div className="mt-6 flex items-center gap-4">
          <Shield className="w-5 h-5 text-green-600" />
          <span className="text-sm">Secure payment</span>
          <Lock className="w-5 h-5 text-green-600" />
          <span className="text-sm">256-bit SSL encryption</span>
        </div>

        {/* Money-back guarantee */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium">30-Day Money-Back Guarantee</p>
          <p className="text-xs text-muted-foreground">
            Not satisfied? Get a full refund within 30 days.
          </p>
        </div>
      </div>

      {/* Right: Payment Form */}
      <div>
        <h2>Payment Information</h2>
        <StripeCheckoutForm />
      </div>
    </div>
  )
}
```

**5.3 Add Checkout Abandonment Recovery**

```typescript
// Track when user starts checkout but doesn't complete
const trackCheckoutAbandonment = () => {
  // After 5 minutes, send email
  setTimeout(
    () => {
      sendEmail({
        template: 'checkout-abandoned',
        subject: 'Complete your signup for Jack of All Trades',
        body: `
        We noticed you didn't finish signing up. 
        
        Your 14-day trial is waiting! No credit card required.
        
        [Complete Sign Up]
        
        Need help? Reply to this email or chat with us.
      `,
      })
    },
    5 * 60 * 1000,
  )
}
```

**5.4 Add Coupon/Promo Code Support**

```tsx
const PromoCodeInput = () => {
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState(null)

  const applyPromoCode = async () => {
    const result = await validatePromoCode(code)
    setDiscount(result)
  }

  return (
    <div>
      <Input
        placeholder="Promo code"
        value={code}
        onChange={e => setCode(e.target.value)}
      />
      <Button onClick={applyPromoCode}>Apply</Button>

      {discount && (
        <div className="mt-2 text-green-600">
          <Check className="w-4 h-4 inline" />
          {discount.name} applied: {discount.percent}% off
        </div>
      )}
    </div>
  )
}
```

### Stage 6: Retention (Post-Purchase)

**Objective:** Maximize customer lifetime value through retention and expansion

#### Optimizations Needed:

**6.1 Welcome Email Series (Post-Purchase)**

```
Day 0: Purchase confirmation + Access to advanced features
Day 1: "Getting the most from Professional plan"
Day 7: "Exclusive webinar: Advanced AI techniques"
Day 30: "Your first month in review" (usage stats)
Day 60: "New features you might have missed"
Day 90: "Is your team growing? Consider Enterprise"
```

**6.2 Customer Success Dashboard**

```tsx
const CustomerSuccessMetrics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Impact</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-3xl font-bold">{hourseSaved}</p>
            <p className="text-sm text-muted-foreground">Hours saved</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{documentsAnalyzed}</p>
            <p className="text-sm text-muted-foreground">Documents analyzed</p>
          </div>
          <div>
            <p className="text-3xl font-bold">${costSaved}</p>
            <p className="text-sm text-muted-foreground">Cost saved</p>
          </div>
        </div>

        <Button className="mt-4 w-full" variant="outline">
          Share Your Success Story
        </Button>
      </CardContent>
    </Card>
  )
}
```

**6.3 Usage-Based Upsells**

```tsx
// Trigger when approaching plan limits
const UpsellOpportunities = {
  // Professional user with 20+ projects
  projectLimit: {
    trigger: tier === 'professional' && projectCount >= 20,
    message:
      'Managing lots of projects? Enterprise offers unlimited projects plus dedicated support.',
    cta: 'Talk to Sales',
  },

  // High storage usage
  storage: {
    trigger: storageUsed / storageLimit > 0.8,
    message:
      "You're using 80% of your storage. Upgrade to Enterprise for unlimited storage.",
    cta: 'Upgrade Plan',
  },
}
```

**6.4 Referral Program**

```tsx
const ReferralProgram = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Refer & Earn</CardTitle>
        <CardDescription>Give $50, Get $50 in account credits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={referralLink} readOnly />
            <Button onClick={copyReferralLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold">{referralCount}</p>
              <p className="text-sm">Referrals</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold">${creditsEarned}</p>
              <p className="text-sm">Credits Earned</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**6.5 Churn Prevention**

```tsx
// When user clicks "Cancel Subscription"
const CancellationFlow = () => {
  return (
    <Dialog open={showCancelDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>We're sorry to see you go</DialogTitle>
        </DialogHeader>

        {/* Step 1: Understand why */}
        <RadioGroup onValueChange={setCancelReason}>
          <RadioGroupItem value="too-expensive">Too expensive</RadioGroupItem>
          <RadioGroupItem value="not-using">Not using it enough</RadioGroupItem>
          <RadioGroupItem value="missing-features">
            Missing features
          </RadioGroupItem>
          <RadioGroupItem value="technical-issues">
            Technical issues
          </RadioGroupItem>
          <RadioGroupItem value="other">Other</RadioGroupItem>
        </RadioGroup>

        {/* Step 2: Offer alternatives */}
        {cancelReason === 'too-expensive' && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="font-semibold">💡 Can we offer you a discount?</p>
            <p className="text-sm">Get 30% off for 3 months</p>
            <Button>Apply Discount & Stay</Button>
          </div>
        )}

        {cancelReason === 'not-using' && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-semibold">📅 Pause your subscription?</p>
            <p className="text-sm">
              Pause for up to 3 months. Your data stays safe.
            </p>
            <Button>Pause Subscription</Button>
          </div>
        )}

        {/* Step 3: Final confirmation */}
        <Button variant="destructive" onClick={confirmCancellation}>
          Proceed with Cancellation
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Analytics & Tracking

### Conversion Funnel Metrics

```typescript
// Track key events throughout funnel
const trackFunnelEvent = (event: string, properties?: object) => {
  // Send to analytics platform (Mixpanel, Amplitude, GA4)
  analytics.track(event, {
    timestamp: new Date().toISOString(),
    userId: user?.id,
    companyId: user?.companyId,
    ...properties,
  })
}

// Key events to track:
const FUNNEL_EVENTS = {
  // Awareness
  HOMEPAGE_VIEWED: 'homepage_viewed',
  DEMO_VIDEO_PLAYED: 'demo_video_played',

  // Interest
  PRICING_PAGE_VIEWED: 'pricing_page_viewed',
  PLAN_COMPARED: 'plan_compared',
  FAQ_EXPANDED: 'faq_expanded',

  // Consideration
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  EMAIL_VERIFIED: 'email_verified',

  // Conversion
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FIRST_PROJECT_CREATED: 'first_project_created',
  FIRST_DOCUMENT_UPLOADED: 'first_document_uploaded',
  FIRST_AI_QUERY: 'first_ai_query',

  // Purchase
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',

  // Retention
  REFERRAL_SENT: 'referral_sent',
  PLAN_UPGRADED: 'plan_upgraded',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
}
```

### Conversion Rate Optimization (CRO) Dashboard

```tsx
const CRODashboard = () => {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Homepage → Pricing"
        value={`${((pricingViews / homepageViews) * 100).toFixed(1)}%`}
        trend="+2.3%"
      />
      <MetricCard
        title="Pricing → Sign Up"
        value={`${((signups / pricingViews) * 100).toFixed(1)}%`}
        trend="+5.1%"
      />
      <MetricCard
        title="Sign Up → Verified"
        value={`${((verified / signups) * 100).toFixed(1)}%`}
        trend="-1.2%"
      />
      <MetricCard
        title="Trial → Paid"
        value={`${((paid / verified) * 100).toFixed(1)}%`}
        trend="+8.4%"
      />
    </div>
  )
}
```

---

## A/B Testing Strategy

### Tests to Run

**1. Pricing Page**

- Test A: 3 plans (current)
- Test B: 2 plans (remove Starter, focus on Professional)
- Metric: Conversion to trial

**2. CTA Button Text**

- Test A: "Start Free Trial"
- Test B: "Get Started Free"
- Test C: "Try It Free"
- Metric: Click-through rate

**3. Trial Duration**

- Test A: 14 days (current)
- Test B: 7 days
- Test C: 30 days
- Metric: Trial-to-paid conversion

**4. Credit Card Requirement**

- Test A: No credit card required (current)
- Test B: Credit card required upfront
- Metric: Trial sign-ups vs. conversion rate

**5. Onboarding Flow**

- Test A: Modal onboarding (current)
- Test B: Full-page onboarding wizard
- Test C: No onboarding, contextual tooltips
- Metric: Time to first value, retention

---

## Implementation Priority

### Phase 1 (Week 1-2): Foundation

- [ ] Add plan selection to sign-up flow
- [ ] Implement trial tracking in database
- [ ] Add trial timer banner
- [ ] Set up Stripe products and prices

### Phase 2 (Week 3-4): Checkout Flow

- [ ] Integrate Stripe Checkout
- [ ] Build checkout page
- [ ] Add webhook handlers
- [ ] Test end-to-end payment flow

### Phase 3 (Week 5-6): Email Automation

- [ ] Set up email service (AWS SES or SendGrid)
- [ ] Create email templates
- [ ] Implement trial reminder emails
- [ ] Build onboarding email sequence

### Phase 4 (Week 7-8): Optimization

- [ ] Add analytics tracking
- [ ] Implement A/B testing framework
- [ ] Build CRO dashboard
- [ ] Add in-app messaging

### Phase 5 (Week 9-10): Retention

- [ ] Build referral program
- [ ] Create cancellation flow
- [ ] Add usage-based upsells
- [ ] Implement customer success metrics

---

## Success Metrics & Goals

### North Star Metric

**Monthly Recurring Revenue (MRR)** - Target: $50,000 within 6 months

### Supporting Metrics

| Metric             | Current | Target (3 months) | Target (6 months) |
| ------------------ | ------- | ----------------- | ----------------- |
| Homepage → Pricing | TBD     | 25%               | 30%               |
| Pricing → Sign Up  | TBD     | 15%               | 20%               |
| Sign Up → Trial    | TBD     | 80%               | 85%               |
| Trial → Paid       | TBD     | 25%               | 35%               |
| Monthly Churn      | TBD     | <5%               | <3%               |
| Average Deal Size  | $79     | $95               | $120              |
| Customer LTV       | TBD     | $2,000            | $3,000            |
| CAC Payback        | TBD     | 6 months          | 4 months          |

---

## Next Steps

1. **Instrument Analytics** - Add tracking to all funnel stages
2. **Baseline Metrics** - Collect 2 weeks of data to establish baseline
3. **Run First A/B Test** - Test CTA button text on homepage
4. **Implement Stripe** - Follow Stripe Integration Plan
5. **Build Email Automation** - Set up trial reminder emails
6. **Launch & Iterate** - Monitor metrics and optimize continuously
