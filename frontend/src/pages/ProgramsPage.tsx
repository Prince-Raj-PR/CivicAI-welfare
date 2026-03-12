import { Search, MapPin, DollarSign, Building2 } from 'lucide-react'

export default function ProgramsPage() {
  // Mock data for demonstration
  const programs = [
    {
      id: 1,
      name: 'Supplemental Nutrition Assistance Program (SNAP)',
      description: 'Provides food assistance to low-income individuals and families.',
      type: 'Food Assistance',
      agency: 'USDA',
      maxBenefit: 835,
      location: 'Nationwide',
    },
    {
      id: 2,
      name: 'Medicaid',
      description: 'Health insurance program for low-income individuals and families.',
      type: 'Healthcare',
      agency: 'CMS',
      maxBenefit: 0,
      location: 'Nationwide',
    },
    {
      id: 3,
      name: 'Housing Choice Voucher Program',
      description: 'Rental assistance for low-income families, elderly, and disabled.',
      type: 'Housing',
      agency: 'HUD',
      maxBenefit: 1200,
      location: 'Nationwide',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse Programs</h1>
        <p className="text-gray-600 mt-2">
          Discover welfare programs you may be eligible for
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search programs..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div key={program.id} className="card hover:shadow-lg transition-shadow">
            {/* Program Type Badge */}
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                {program.type}
              </span>
            </div>

            {/* Program Name */}
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {program.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4">
              {program.description}
            </p>

            {/* Program Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600">
                <Building2 className="w-4 h-4 mr-2" />
                <span>{program.agency}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{program.location}</span>
              </div>
              {program.maxBenefit > 0 && (
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span>Up to ${program.maxBenefit}/month</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="btn btn-primary w-full">
                Check Eligibility
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}