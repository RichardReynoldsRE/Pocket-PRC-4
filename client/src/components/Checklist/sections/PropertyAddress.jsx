export default function PropertyAddress({ formData, handleChange }) {
  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-3 sm:mb-4">
      <label className="block font-semibold mb-2 text-sm sm:text-base">Property Address *</label>
      <input
        type="text"
        value={formData.propertyAddress}
        onChange={(e) => handleChange('propertyAddress', e.target.value)}
        className="w-full p-2 sm:p-3 border border-gray-300 rounded text-sm sm:text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
        placeholder="Enter property address"
      />
    </div>
  );
}
