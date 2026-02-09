import { useState, useEffect } from 'react';
import { get, put } from '../../api/client';
import StatusToast from '../Shared/StatusToast';

export default function BrandingSettings() {
  const [form, setForm] = useState({
    app_name: 'Pocket PRC',
    primary_color: '#b91c1c',
    secondary_color: '#fbbf24',
    brokerage_name: '',
    logo_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    get('/api/branding')
      .then((data) => {
        setForm((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await put('/api/admin/branding', form);
      // Apply colors immediately
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', form.primary_color);
      root.style.setProperty('--brand-secondary', form.secondary_color);
      showToast('Branding saved!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
          <input
            type="text"
            value={form.app_name}
            onChange={(e) => handleChange('app_name', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brokerage Name</label>
          <input
            type="text"
            value={form.brokerage_name}
            onChange={(e) => handleChange('brokerage_name', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-base"
            placeholder="Keller Williams Realty of Maine"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={form.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
          <input
            type="text"
            value={form.logo_url}
            onChange={(e) => handleChange('logo_url', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-base"
            placeholder="https://..."
          />
          {form.logo_url && (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="max-h-16 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="action-button w-full py-3 rounded-lg font-bold text-base text-[var(--brand-text-on-primary)] transition-colors disabled:opacity-50"
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        {saving ? 'Saving...' : 'Save Branding'}
      </button>

      <StatusToast message={toast.message} type={toast.type} show={toast.show} />
    </form>
  );
}
