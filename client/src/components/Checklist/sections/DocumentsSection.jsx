export default function DocumentsSection({ formData, handleChange, children }) {
  const docs = [
    { field: 'codeEnforcementDocs', label: 'Pertinent code enforcement file documents' },
    { field: 'zoneOverlays', label: 'Zone Overlays' },
    { field: 'recordedSurvey', label: 'Recorded survey' },
    { field: 'easements', label: 'Recorded easements, restrictions, covenants' },
    { field: 'associationDocs', label: 'Association declarations, bylaws, rules/regs' },
    { field: 'associationFinancials', label: 'Association financial statements' },
    { field: 'condoCertificate', label: 'Condominium resale certificate' },
    { field: 'septicDesign', label: 'Septic Design (HHE 200)' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-3 sm:mb-4">
      <h2
        className="text-base sm:text-lg font-bold mb-3 sm:mb-4"
        style={{ color: 'var(--brand-primary)' }}
      >
        3. SUBMIT THE FOLLOWING DOCUMENTS
      </h2>

      <div className="space-y-2 mb-6 text-sm sm:text-base">
        {docs.map(({ field, label }) => (
          <label key={field} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData[field]}
              onChange={(e) => handleChange(field, e.target.checked)}
              className="w-5 h-5"
            />
            {label}
          </label>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Photos/Documents
        </label>
        {children}
        <p className="text-xs text-gray-500 text-center mt-2">
          Files will be included in PDF with their names
        </p>
      </div>
    </div>
  );
}
