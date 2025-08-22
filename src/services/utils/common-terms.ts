import { addCommonTerm, type CommonContentType } from '../ai/embedding'

// Common terms data for construction industry
export const CONSTRUCTION_COMMON_TERMS = {
  building_codes: [
    {
      id: 'ibc_2021',
      title: 'International Building Code 2021',
      content:
        'The International Building Code (IBC) is a model building code developed by the International Code Council. It provides minimum requirements to safeguard the public health, safety and general welfare of the occupants of new and existing buildings and structures.',
      metadata: { standard: 'IBC', year: 2021, category: 'building_code' },
    },
    {
      id: 'ada_compliance',
      title: 'Americans with Disabilities Act Compliance',
      content:
        'ADA compliance ensures that buildings and facilities are accessible to people with disabilities. Requirements include accessible routes, parking spaces, ramps, doorways, restrooms, and signage.',
      metadata: { standard: 'ADA', category: 'accessibility' },
    },
    {
      id: 'fire_safety_codes',
      title: 'Fire Safety Building Codes',
      content:
        'Fire safety codes include requirements for fire exits, sprinkler systems, fire-resistant materials, smoke detection systems, and emergency evacuation procedures in buildings.',
      metadata: { category: 'fire_safety', priority: 'high' },
    },
  ],

  safety_regulations: [
    {
      id: 'osha_construction',
      title: 'OSHA Construction Safety Standards',
      content:
        'OSHA 29 CFR 1926 covers construction safety standards including fall protection, scaffolding, excavation safety, personal protective equipment (PPE), and hazard communication.',
      metadata: {
        standard: 'OSHA',
        regulation: '29_CFR_1926',
        category: 'safety',
      },
    },
    {
      id: 'fall_protection',
      title: 'Fall Protection Requirements',
      content:
        'Fall protection is required when working at heights of 6 feet or more. Methods include guardrails, safety nets, personal fall arrest systems, and warning line systems.',
      metadata: { category: 'fall_protection', height_requirement: 6 },
    },
    {
      id: 'ppe_requirements',
      title: 'Personal Protective Equipment Requirements',
      content:
        'Required PPE in construction includes hard hats, safety glasses, high-visibility clothing, safety shoes, gloves, and respiratory protection when necessary.',
      metadata: { category: 'ppe', mandatory: true },
    },
  ],

  material_specifications: [
    {
      id: 'concrete_grades',
      title: 'Concrete Strength Grades',
      content:
        'Common concrete grades: C20 (20 MPa), C25 (25 MPa), C30 (30 MPa), C35 (35 MPa), C40 (40 MPa). Higher grades provide greater compressive strength for structural applications.',
      metadata: { material: 'concrete', units: 'MPa', category: 'structural' },
    },
    {
      id: 'steel_grades',
      title: 'Structural Steel Grades',
      content:
        'Common structural steel grades include A36 (36 ksi yield), A572 Grade 50 (50 ksi yield), and A992 (50 ksi minimum yield). Used for beams, columns, and connections.',
      metadata: { material: 'steel', units: 'ksi', category: 'structural' },
    },
    {
      id: 'insulation_r_values',
      title: 'Insulation R-Values',
      content:
        'R-value measures thermal resistance. Common values: R-13 to R-15 for 2x4 walls, R-19 to R-21 for 2x6 walls, R-30 to R-60 for attics depending on climate zone.',
      metadata: {
        material: 'insulation',
        category: 'thermal',
        units: 'R-value',
      },
    },
  ],

  industry_standards: [
    {
      id: 'astm_standards',
      title: 'ASTM International Standards',
      content:
        'ASTM develops technical standards for materials, products, systems, and services. Common in construction: ASTM C150 (cement), ASTM A615 (rebar), ASTM D1556 (soil density).',
      metadata: { organization: 'ASTM', category: 'standards' },
    },
    {
      id: 'iso_construction',
      title: 'ISO Construction Standards',
      content:
        'ISO standards for construction include ISO 9001 (quality management), ISO 14001 (environmental management), and ISO 45001 (occupational health and safety).',
      metadata: { organization: 'ISO', category: 'management_systems' },
    },
  ],

  measurement_units: [
    {
      id: 'construction_measurements',
      title: 'Common Construction Measurements',
      content:
        'Standard measurements: 1 foot = 12 inches, 1 yard = 3 feet, 1 meter = 3.28 feet, 1 square foot = 144 square inches, 1 cubic yard = 27 cubic feet, 1 PSI = 6.895 kPa.',
      metadata: { category: 'conversions', system: 'imperial_metric' },
    },
  ],

  equipment_specs: [
    {
      id: 'crane_specifications',
      title: 'Construction Crane Specifications',
      content:
        'Tower cranes: lifting capacity 4-20 tons, maximum height 80-300m. Mobile cranes: capacity 25-1200 tons, boom length 30-100m. All-terrain cranes offer mobility and lifting capacity.',
      metadata: { equipment: 'crane', category: 'lifting' },
    },
    {
      id: 'excavator_specs',
      title: 'Excavator Specifications',
      content:
        'Mini excavators: 1-6 tons, compact for tight spaces. Standard excavators: 20-45 tons for general construction. Large excavators: 45+ tons for heavy earthwork and demolition.',
      metadata: { equipment: 'excavator', category: 'earthwork' },
    },
  ],
}

// Function to initialize common terms in Pinecone
export async function initializeCommonTerms() {
  try {
    console.log('Initializing common terms in Pinecone...')

    for (const [contentType, terms] of Object.entries(
      CONSTRUCTION_COMMON_TERMS,
    )) {
      console.log(`Adding ${terms.length} ${contentType} terms...`)

      for (const term of terms) {
        await addCommonTerm({
          contentType: contentType as CommonContentType,
          id: term.id,
          content: `${term.title}\n\n${term.content}`,
          metadata: {
            title: term.title,
            content_type: contentType,
            ...term.metadata,
          },
        })
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('Common terms initialization completed successfully!')
  } catch (error) {
    console.error('Error initializing common terms:', error)
    throw error
  }
}

// Function to add custom common terms
export async function addCustomCommonTerm({
  contentType,
  id,
  title,
  content,
  metadata = {},
}: {
  contentType: CommonContentType
  id: string
  title: string
  content: string
  metadata?: Record<string, string | number | boolean>
}) {
  await addCommonTerm({
    contentType,
    id,
    content: `${title}\n\n${content}`,
    metadata: {
      title,
      content_type: contentType,
      is_custom: true,
      ...metadata,
    },
  })
}

// Function to get all available content types
export function getAvailableContentTypes(): CommonContentType[] {
  return Object.keys(CONSTRUCTION_COMMON_TERMS) as CommonContentType[]
}

// Function to get terms count by content type
export function getTermsCountByType(): Record<string, number> {
  return Object.fromEntries(
    Object.entries(CONSTRUCTION_COMMON_TERMS).map(([type, terms]) => [
      type,
      terms.length,
    ]),
  )
}
