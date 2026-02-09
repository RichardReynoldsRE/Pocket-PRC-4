export default function CodeEnforcementSection({ formData, handleChange }) {
  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-3 sm:mb-4">
      <h2
        className="text-base sm:text-lg font-bold mb-3 sm:mb-4"
        style={{ color: 'var(--brand-primary)' }}
      >
        2. CODE ENFORCEMENT OFFICE
      </h2>

      {/* Date Visited */}
      <div className="mb-4">
        <label className="block font-semibold mb-2 text-sm sm:text-base">Date Visited</label>
        <input
          type="date"
          value={formData.dateVisited}
          onChange={(e) => handleChange('dateVisited', e.target.value)}
          className="w-full p-2 sm:p-3 border border-gray-300 rounded text-sm sm:text-base"
        />
      </div>

      {/* Current Zoning & Overlay */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <label className="block font-semibold mb-2 text-sm sm:text-base">Current Zoning</label>
          <input
            type="text"
            value={formData.currentZoning}
            onChange={(e) => handleChange('currentZoning', e.target.value)}
            className="w-full p-2 sm:p-3 border border-gray-300 rounded text-sm sm:text-base"
            placeholder="e.g., R-1, Commercial"
          />
        </div>
        <div>
          <label className="block font-semibold mb-2 text-sm sm:text-base">Zoning Overlay?</label>
          <input
            type="text"
            value={formData.zoningOverlay}
            onChange={(e) => handleChange('zoningOverlay', e.target.value)}
            className="w-full p-2 sm:p-3 border border-gray-300 rounded text-sm sm:text-base"
            placeholder="If applicable"
          />
        </div>
      </div>

      {/* Flood Zone */}
      <div className="mb-4">
        <p className="font-semibold mb-2 text-sm sm:text-base">Flood Zone?</p>
        <div className="flex gap-4 text-sm sm:text-base">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="floodZone"
              checked={formData.floodZone === 'Yes'}
              onChange={() => handleChange('floodZone', 'Yes')}
              className="w-5 h-5"
            />
            Yes
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="floodZone"
              checked={formData.floodZone === 'No'}
              onChange={() => handleChange('floodZone', 'No')}
              className="w-5 h-5"
            />
            No
          </label>
        </div>
      </div>

      {/* Conforms to Zoning */}
      <div className="mb-4">
        <label className="block font-semibold mb-2 text-sm sm:text-base">
          Does current use appear to conform to zoning restrictions?
        </label>
        <input
          type="text"
          value={formData.conformsToZoning}
          onChange={(e) => handleChange('conformsToZoning', e.target.value)}
          className="w-full p-2 sm:p-3 border border-gray-300 rounded text-sm sm:text-base"
          placeholder="Yes/No and explanation"
        />
      </div>

      {/* Dwelling Units */}
      <div className="mb-4">
        <label className="block font-semibold mb-2 text-sm sm:text-base">
          Number of legal dwelling units permitted per ordinance?
        </label>
        <input
          type="text"
          value={formData.dwellingUnits}
          onChange={(e) => handleChange('dwellingUnits', e.target.value)}
          className="w-full p-2 sm:p-3 border border-gray-300 rounded text-sm sm:text-base"
          placeholder="e.g., 1, 2, etc."
        />
      </div>

      {/* Septic in Shoreland */}
      <div className="mb-4">
        <p className="font-semibold mb-2 text-sm sm:text-base">
          Septic system located in a shoreland zone?
        </p>
        <div className="flex flex-wrap gap-3 sm:gap-4 text-sm sm:text-base">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="septicInShoreland"
              checked={formData.septicInShoreland === 'Yes'}
              onChange={() => handleChange('septicInShoreland', 'Yes')}
              className="w-5 h-5"
            />
            Yes
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="septicInShoreland"
              checked={formData.septicInShoreland === 'No'}
              onChange={() => handleChange('septicInShoreland', 'No')}
              className="w-5 h-5"
            />
            No
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="septicInShoreland"
              checked={formData.septicInShoreland === 'N/A'}
              onChange={() => handleChange('septicInShoreland', 'N/A')}
              className="w-5 h-5"
            />
            N/A
          </label>
        </div>
      </div>

      {/* Permits Description */}
      <div>
        <label className="block font-semibold mb-2 text-sm sm:text-base">
          Record dates &amp; descriptions of permits issued or code enforcement issues (DO NOT LEAVE
          BLANK)
        </label>
        <textarea
          value={formData.permitsDescription}
          onChange={(e) => handleChange('permitsDescription', e.target.value)}
          className="w-full p-2 sm:p-3 border border-gray-300 rounded h-32 text-sm sm:text-base"
          placeholder="Enter details or 'None'..."
        />
      </div>
    </div>
  );
}
