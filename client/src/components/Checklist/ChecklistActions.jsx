import { FileText, Mail, Share2, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

async function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

async function savePdfToCache(blob, filename) {
  const base64Data = await blobToBase64(blob);
  const result = await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Cache,
  });
  return result.uri;
}

async function savePdfToDocuments(blob, filename) {
  const base64Data = await blobToBase64(blob);

  // Ensure "Pocket PRC" folder exists in Documents
  try {
    await Filesystem.mkdir({
      path: 'Pocket PRC',
      directory: Directory.Documents,
      recursive: true,
    });
  } catch {
    // Directory may already exist — that's fine
  }

  const result = await Filesystem.writeFile({
    path: `Pocket PRC/${filename}`,
    data: base64Data,
    directory: Directory.Documents,
    recursive: true,
  });
  return result.uri;
}

export default function ChecklistActions({
  formData,
  generatedPdfBlob,
  onGeneratePdf,
  suggestedFilename,
  showToast,
}) {
  const isNative = Capacitor.isNativePlatform();

  const handleDownload = async () => {
    if (!generatedPdfBlob) return;
    if (isNative) {
      try {
        await savePdfToDocuments(generatedPdfBlob, suggestedFilename);
        if (showToast) showToast('PDF saved to Documents/Pocket PRC/', 'success');
      } catch (err) {
        console.error('Save error:', err);
        if (showToast) showToast('Failed to save PDF', 'error');
      }
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(generatedPdfBlob);
      link.download = suggestedFilename;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  };

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

    if (isNative) {
      try {
        const uri = await savePdfToCache(generatedPdfBlob, suggestedFilename);
        await Share.share({
          title: 'Public Records Checklist',
          text: `Public Records Checklist for ${formData.propertyAddress || 'property'}`,
          url: uri,
          dialogTitle: 'Share Checklist PDF',
        });
      } catch (err) {
        if (err.message !== 'Share canceled') {
          console.error('Share error:', err);
          if (showToast) showToast('Failed to share PDF', 'error');
        }
      }
    } else if (navigator.share && navigator.canShare) {
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
          onClick={handleDownload}
          disabled={!generatedPdfBlob}
          className="action-button bg-blue-600 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          title={!generatedPdfBlob ? 'Generate PDF first' : 'Download PDF'}
        >
          <Download size={24} />
          <span>{isNative ? 'Save PDF' : 'Download PDF'}</span>
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
