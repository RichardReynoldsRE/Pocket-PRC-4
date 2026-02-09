import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileEdit, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import useChecklist from '../../hooks/useChecklist';
import * as checklistsApi from '../../api/checklists';
import { saveChecklist as saveToIdb } from '../../lib/db';
import { generatePRC } from './PdfGenerator';
import PropertyAddress from './sections/PropertyAddress';
import AssessorSection from './sections/AssessorSection';
import CodeEnforcementSection from './sections/CodeEnforcementSection';
import DocumentsSection from './sections/DocumentsSection';
import CompletedBySection from './sections/CompletedBySection';
import AttachmentUpload from './AttachmentUpload';
import AttachmentGallery from './AttachmentGallery';
import ChecklistActions from './ChecklistActions';
import StatusToast from '../Shared/StatusToast';
import LoadingSpinner from '../Shared/LoadingSpinner';

export default function ChecklistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formData, setFormData, handleChange, handleAmountChange, loadChecklist } = useChecklist();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [status, setStatus] = useState('draft');
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [suggestedFilename, setSuggestedFilename] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const autoSaveTimer = useRef(null);

  const showToast = useCallback((message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }, []);

  // Load existing checklist from API
  useEffect(() => {
    if (!id) return;
    checklistsApi
      .getById(id)
      .then((data) => {
        const record = data.checklist || data;
        loadChecklist(record.form_data || record);
        setStatus(record.status || 'draft');
        setLoadFailed(false);
      })
      .catch(() => {
        showToast('Failed to load checklist', 'error');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [id, loadChecklist, showToast]);

  // Default "Completed By" to signed-in user's name for new checklists
  useEffect(() => {
    if (!id && user?.name && !formData.completedBy) {
      handleChange('completedBy', user.name);
    }
  }, [id, user?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate suggested filename
  useEffect(() => {
    const addr = formData.propertyAddress || 'Property';
    const clean = addr.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    setSuggestedFilename(`PRC_${clean}_${date}.pdf`);
  }, [formData.propertyAddress]);

  // Auto-save to IndexedDB on changes (debounced)
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveToIdb({ id: id || 'draft', form_data: formData }).catch(() => {});
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [formData, id]);

  // Listen for save/load events from Header
  useEffect(() => {
    const handleSaveEvent = () => {
      const dataStr = JSON.stringify(formData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      let filename = formData.propertyAddress
        ? formData.propertyAddress.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : 'prc_progress';
      filename = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Progress saved!', 'success');
    };

    const handleLoadEvent = (e) => {
      const data = e.detail;
      if (data) {
        if (!data.attachments) data.attachments = [];
        loadChecklist(data);
        showToast('Progress loaded!', 'success');
      }
    };

    window.addEventListener('prc:save-progress', handleSaveEvent);
    window.addEventListener('prc:load-progress', handleLoadEvent);
    return () => {
      window.removeEventListener('prc:save-progress', handleSaveEvent);
      window.removeEventListener('prc:load-progress', handleLoadEvent);
    };
  }, [formData, loadChecklist, showToast]);

  const handleFileUpload = useCallback(
    (event) => {
      const files = Array.from(event.target.files);
      let processed = 0;
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFormData((prev) => ({
            ...prev,
            attachments: [
              ...prev.attachments,
              { name: file.name, data: e.target.result, type: file.type, size: file.size },
            ],
          }));
          processed++;
          if (processed === files.length) {
            showToast(`Added ${files.length} file(s)`, 'success');
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [setFormData, showToast]
  );

  const handleRemoveAttachment = useCallback(
    (index) => {
      setFormData((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== index),
      }));
      showToast('File removed', 'success');
    },
    [setFormData, showToast]
  );

  const handleRenameAttachment = useCallback(
    (index, newName) => {
      if (!newName || !newName.trim()) return;
      setFormData((prev) => ({
        ...prev,
        attachments: prev.attachments.map((att, i) =>
          i === index ? { ...att, name: newName.trim() } : att
        ),
      }));
      showToast('File renamed', 'success');
    },
    [setFormData, showToast]
  );

  const handleSaveToApi = async () => {
    setSaving(true);
    try {
      const payload = {
        property_address: formData.propertyAddress,
        form_data: formData,
      };
      if (id) {
        const result = await checklistsApi.update(id, payload);
        if (result.checklist?.form_data) {
          loadChecklist(result.checklist.form_data);
        }
      } else {
        const result = await checklistsApi.create(payload);
        if (result.checklist?.id) {
          navigate(`/checklist/${result.checklist.id}`, { replace: true });
        }
      }
      showToast('Checklist saved!', 'success');
    } catch {
      showToast('Failed to save checklist', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!id || newStatus === status) return;
    try {
      await checklistsApi.updateStatus(id, newStatus);
      setStatus(newStatus);
      const labels = { draft: 'Draft', in_progress: 'In Progress', completed: 'Completed' };
      showToast(`Marked as ${labels[newStatus]}`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleGeneratePdf = async () => {
    showToast('Generating PDF...', 'success');
    try {
      const result = await generatePRC(formData);
      setGeneratedPdfBlob(result.blob);

      const attachText =
        formData.attachments.length > 0
          ? ` with ${formData.attachments.length} attachment(s)`
          : '';
      showToast(`PDF generated${attachText}! Use Save or Share below.`, 'success');
    } catch {
      showToast('Error generating PDF', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  const STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft', icon: FileEdit, color: 'gray' },
    { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'yellow' },
    { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'green' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-4">
      {id && (
        <div className="bg-white rounded-lg shadow p-3 mb-3 sm:mb-4">
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => {
              const isActive = status === value;
              const base = `flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all`;
              const active = {
                gray: 'bg-gray-700 text-white',
                yellow: 'bg-yellow-500 text-white',
                green: 'bg-green-600 text-white',
              };
              const inactive = 'bg-gray-100 text-gray-500 hover:bg-gray-200';
              return (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value)}
                  className={`${base} ${isActive ? active[color] : inactive}`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <PropertyAddress formData={formData} handleChange={handleChange} />
      <AssessorSection
        formData={formData}
        handleChange={handleChange}
        handleAmountChange={handleAmountChange}
      />
      <CodeEnforcementSection formData={formData} handleChange={handleChange} />
      <DocumentsSection formData={formData} handleChange={handleChange} onFileUpload={handleFileUpload}>
        <AttachmentUpload onFileUpload={handleFileUpload} />
      </DocumentsSection>

      {formData.attachments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-3 sm:mb-4">
          <AttachmentGallery
            attachments={formData.attachments}
            onRemove={handleRemoveAttachment}
            onRename={handleRenameAttachment}
          />
        </div>
      )}

      <CompletedBySection formData={formData} handleChange={handleChange} />

      <div className="mb-4">
        <button
          onClick={handleSaveToApi}
          disabled={saving || loadFailed}
          className="action-button w-full py-3 rounded-lg font-bold text-base text-[var(--brand-text-on-primary)] transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          {loadFailed ? 'Cannot Save (Load Failed)' : saving ? 'Saving...' : 'Save Checklist'}
        </button>
      </div>

      <ChecklistActions
        formData={formData}
        generatedPdfBlob={generatedPdfBlob}
        onGeneratePdf={handleGeneratePdf}
        suggestedFilename={suggestedFilename}
        showToast={showToast}
      />

      <StatusToast message={toast.message} type={toast.type} show={toast.show} />
    </div>
  );
}
