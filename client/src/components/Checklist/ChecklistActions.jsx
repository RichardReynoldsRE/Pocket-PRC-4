import { FileText, Mail, Share2 } from 'lucide-react';

export default function ChecklistActions({
  formData,
  generatedPdfBlob,
  onGeneratePdf,
  suggestedFilename,
}) {
  const handleEmail = () => {
    if (!generatedPdfBlob) return;
    const subject = encodeURIComponent(
      `Public Records Checklist - ${formData.propertyAddress || 'Property'}`
    );
    const body = encodeURIComponent(
      `Please find attached the Public Records Checklist.\n\n` +
        `Property Address: ${formData.propertyAddress || 'N/A'}\n` +
        `Completed By: ${formData.completedBy || 'N/A'}\n` +
        `Date: ${new Date().toLocaleDateString()}\n\n` +
        `Note: The PDF file has been downloaded to your device. Please attach it to this email.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShare = async () => {
    if (!generatedPdfBlob) return;

    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([generatedPdfBlob], suggestedFilename, {
          type: 'application/pdf',
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Public Records Checklist',
            text: `Public Records Checklist for ${formData.propertyAddress || 'property'}`,
          });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
        }
      }
    }
  };

  return (
    <div className="px-0 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onGeneratePdf}
          className="action-button bg-yellow-400 text-gray-900 px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors shadow-lg"
        >
          <FileText size={24} />
          <span>Generate PDF</span>
        </button>

        <button
          onClick={handleEmail}
          disabled={!generatedPdfBlob}
          className="action-button bg-blue-600 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          title={!generatedPdfBlob ? 'Generate PDF first' : 'Open email with PDF'}
        >
          <Mail size={24} />
          <span>Email PDF</span>
        </button>

        <button
          onClick={handleShare}
          disabled={!generatedPdfBlob}
          className="action-button bg-green-600 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          title={!generatedPdfBlob ? 'Generate PDF first' : 'Share PDF'}
        >
          <Share2 size={24} />
          <span>Share PDF</span>
        </button>
      </div>
    </div>
  );
}
