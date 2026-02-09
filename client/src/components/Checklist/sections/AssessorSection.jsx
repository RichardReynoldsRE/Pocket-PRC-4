export default function AssessorSection({ formData, handleChange, handleAmountChange }) {
  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-3 sm:mb-4">
      <h2
        className="text-base sm:text-lg font-bold mb-3 sm:mb-4"
        style={{ color: 'var(--brand-primary)' }}
      >
        1. ASSESSOR&apos;S OFFICE
      </h2>

      <div className="mb-4">
        <p className="font-semibold mb-2 text-sm sm:text-base">Tax Exemptions</p>
        <div className="space-y-2 sm:space-y-3">
          {/* Homestead */}
          <label className="flex items-center gap-2 text-sm sm:text-base">
            <input
              type="checkbox"
              checked={formData.homesteadExemption}
              onChange={(e) => handleChange('homesteadExemption', e.target.checked)}
              className="w-5 h-5"
            />
            <span className="flex-shrink-0">Homestead $</span>
            <input
              type="number"
              value={formData.homesteadAmount}
              onChange={(e) =>
                handleAmountChange('homesteadExemption', 'homesteadAmount', e.target.value)
              }
              className="flex-1 p-1 sm:p-2 border border-gray-300 rounded text-sm sm:text-base"
              step="0.01"
              placeholder="Amount"
            />
          </label>

          {/* Veterans */}
          <label className="flex items-center gap-2 text-sm sm:text-base">
            <input
              type="checkbox"
              checked={formData.veteransExemption}
              onChange={(e) => handleChange('veteransExemption', e.target.checked)}
              className="w-5 h-5"
            />
            <span className="flex-shrink-0">Veterans $</span>
            <input
              type="number"
              value={formData.veteransAmount}
              onChange={(e) =>
                handleAmountChange('veteransExemption', 'veteransAmount', e.target.value)
              }
              className="flex-1 p-1 sm:p-2 border border-gray-300 rounded text-sm sm:text-base"
              step="0.01"
              placeholder="Amount"
            />
          </label>

          {/* Tree Growth */}
          <label className="flex items-center gap-2 text-sm sm:text-base">
            <input
              type="checkbox"
              checked={formData.treeGrowthExemption}
              onChange={(e) => handleChange('treeGrowthExemption', e.target.checked)}
              className="w-5 h-5"
            />
            <span className="flex-shrink-0">Tree Growth $</span>
            <input
              type="number"
              value={formData.treeGrowthAmount}
              onChange={(e) =>
                handleAmountChange('treeGrowthExemption', 'treeGrowthAmount', e.target.value)
              }
              className="flex-1 p-1 sm:p-2 border border-gray-300 rounded text-sm sm:text-base"
              step="0.01"
              placeholder="Amount"
            />
          </label>

          {/* N/A */}
          <label className="flex items-center gap-2 text-sm sm:text-base">
            <input
              type="checkbox"
              checked={formData.noExemptions}
              onChange={(e) => handleChange('noExemptions', e.target.checked)}
              className="w-5 h-5"
            />
            N/A
          </label>
        </div>
      </div>

      <div className="space-y-2 text-sm sm:text-base">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.propertyDataCard}
            onChange={(e) => handleChange('propertyDataCard', e.target.checked)}
            className="w-5 h-5"
          />
          ATTACH Property Data Card - required
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.taxMap}
            onChange={(e) => handleChange('taxMap', e.target.checked)}
            className="w-5 h-5"
          />
          ATTACH Tax Map - required
        </label>
      </div>
    </div>
  );
}
