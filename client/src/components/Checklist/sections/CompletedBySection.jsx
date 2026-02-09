export default function CompletedBySection({ formData, handleChange }) {
  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-3 sm:mb-4">
      <h2
        className="text-base sm:text-lg font-bold mb-3 sm:mb-4"
        style={{ color: 'var(--brand-primary)' }}
      >
        4. COMPLETED BY
      </h2>
      <input
        type="text"
        value={formData.completedBy}
        onChange={(e) => handleChange('completedBy', e.target.value)}
        className="w-full p-2 sm:p-3 border border-gray-300 rounded text-sm sm:text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
        placeholder="Your name"
      />
    </div>
  );
}
