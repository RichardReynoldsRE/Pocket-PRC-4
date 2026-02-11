import { useState } from 'react';
import { FileText, Mail, Share2, Download, Send, X, TrendingDown } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { post } from '../../api/client';

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

// Sample lead data for demo
const SAMPLE_LEAD = {
  mlsNumber: 'MLS-2026-48291',
  offerPrice: '$425,000',
  closingDate: '03/15/2026',
  buyerName: 'James & Sarah Mitchell',
  buyerEmail: 'jmitchell@email.com',
  buyerPhone: '(207) 555-0142',
  lender: 'Maine Community Bank',
  loanType: 'Conventional 30-Year Fixed',
  agentEmail: 'agent@kwrealty.com',
  agentPhone: '(207) 555-0198',
  brokerage: 'Keller Williams Realty of Maine',
  notes: 'Buyers are pre-approved. Home inspection scheduled for next week. Requesting a 45-day closing.',
};

// Sample rate comparison data for demo
const SAMPLE_RATE_REQUEST = {
  mlsNumber: 'MLS-2026-48291',
  purchasePrice: '$425,000',
  closingDate: '03/15/2026',
  buyerName: 'James & Sarah Mitchell',
  buyerEmail: 'jmitchell@email.com',
  buyerPhone: '(207) 555-0142',
  currentLender: 'Maine Community Bank',
  loanType: 'Conventional 30-Year Fixed',
  downPayment: '20% ($85,000)',
  creditScore: '740+',
  agentEmail: 'agent@kwrealty.com',
  agentPhone: '(207) 555-0198',
  brokerage: 'Keller Williams Realty of Maine',
  notes: 'Buyers are pre-approved with current lender at 6.25%. Looking to see if Annie Mac can offer a more competitive rate. Closing in 45 days.',
};

export default function ChecklistActions({
  formData,
  generatedPdfBlob,
  onGeneratePdf,
  suggestedFilename,
  showToast,
}) {
  const isNative = Capacitor.isNativePlatform();
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [sendingLead, setSendingLead] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [sendingRate, setSendingRate] = useState(false);
  const [rateSent, setRateSent] = useState(false);

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

  const handleSendLead = async () => {
    setSendingLead(true);
    try {
      const result = await post('/api/send-lead', {
        senderName: formData.completedBy || 'Pocket PRC User',
        propertyAddress: formData.propertyAddress || 'Address Not Provided',
        leadData: SAMPLE_LEAD,
      });

      setLeadSent(true);
      setShowLeadModal(false);

      if (result.previewUrl) {
        console.log('Email preview URL:', result.previewUrl);
      }

      if (showToast) showToast('Lead sent to Mainland Title LLC!', 'success');
    } catch (err) {
      console.error('Send lead error:', err);
      if (showToast) showToast('Failed to send lead. Please try again.', 'error');
    } finally {
      setSendingLead(false);
    }
  };

  const handleSendRateRequest = async () => {
    setSendingRate(true);
    try {
      await post('/api/send-rate-request', {
        senderName: formData.completedBy || 'Pocket PRC User',
        propertyAddress: formData.propertyAddress || 'Address Not Provided',
        leadData: SAMPLE_RATE_REQUEST,
      });

      setRateSent(true);
      setShowRateModal(false);

      if (showToast) showToast('Rate request sent to Annie Mac Home Mortgage!', 'success');
    } catch (err) {
      console.error('Send rate request error:', err);
      if (showToast) showToast('Failed to send rate request. Please try again.', 'error');
    } finally {
      setSendingRate(false);
    }
  };

  return (
    <>
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

        {/* Send Lead to Mainland Title LLC */}
        <div className="mt-4">
          <button
            onClick={() => setShowLeadModal(true)}
            disabled={!generatedPdfBlob || leadSent}
            className={`w-full px-6 py-5 rounded-lg font-bold flex flex-col items-center justify-center gap-3 transition-all shadow-lg ${
              leadSent
                ? 'bg-gray-400 cursor-not-allowed'
                : !generatedPdfBlob
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#1e3a5f] hover:bg-[#2a4d7a] active:scale-[0.98]'
            }`}
            title={!generatedPdfBlob ? 'Generate PDF first' : ''}
          >
            <img
              src="/mainland-title-logo.png"
              alt="Mainland Title LLC"
              className={`h-8 object-contain brightness-0 invert ${!generatedPdfBlob || leadSent ? 'opacity-40' : ''}`}
            />
            <span className={`flex items-center gap-2 text-base ${!generatedPdfBlob || leadSent ? 'text-white/40' : 'text-white'}`}>
              <Send size={18} />
              {leadSent ? 'Lead Sent to Mainland Title LLC' : 'Send Lead to Mainland Title LLC'}
            </span>
          </button>
        </div>

        {/* Compare Rates with Annie Mac Home Mortgage */}
        <div className="mt-3">
          <button
            onClick={() => setShowRateModal(true)}
            disabled={!generatedPdfBlob || rateSent}
            className={`w-full px-6 py-5 rounded-lg font-bold flex flex-col items-center justify-center gap-3 transition-all shadow-lg ${
              rateSent
                ? 'bg-gray-400 cursor-not-allowed'
                : !generatedPdfBlob
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-white border-2 border-[#1b3c6b] hover:bg-slate-50 active:scale-[0.98]'
            }`}
            title={!generatedPdfBlob ? 'Generate PDF first' : ''}
          >
            <img
              src="/anniemac-logo.png"
              alt="Annie Mac Home Mortgage"
              className={`h-8 object-contain ${!generatedPdfBlob || rateSent ? 'opacity-30' : ''}`}
            />
            <span className={`flex items-center gap-2 text-base ${!generatedPdfBlob || rateSent ? 'text-gray-400' : 'text-[#1b3c6b]'}`}>
              <TrendingDown size={18} />
              {rateSent ? 'Rate Request Sent to Annie Mac' : 'Compare Rates with Annie Mac'}
            </span>
          </button>
        </div>
      </div>

      {/* Lead Preview Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowLeadModal(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#1e3a5f] text-white p-5 rounded-t-xl">
              <div className="flex items-center justify-between mb-3">
                <img
                  src="/mainland-title-logo.png"
                  alt="Mainland Title LLC"
                  className="h-7 object-contain brightness-0 invert"
                />
                <button
                  onClick={() => setShowLeadModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <h2 className="text-lg font-bold">Send Under Contract Lead</h2>
              <p className="text-sm opacity-80 mt-1">Review the lead details before sending</p>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Recipient */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 font-medium">
                  <Mail size={14} className="inline mr-1.5 -mt-0.5" />
                  To: csoucie@mlt.llc
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Subject: {formData.completedBy || 'User'} has sent you a new Under Contract Lead
                </p>
              </div>

              {/* Property Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Property</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Address</span>
                    <span className="font-medium">{formData.propertyAddress || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">MLS #</span>
                    <span className="font-medium">{SAMPLE_LEAD.mlsNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Offer Price</span>
                    <span className="font-medium">{SAMPLE_LEAD.offerPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Closing Date</span>
                    <span className="font-medium">{SAMPLE_LEAD.closingDate}</span>
                  </div>
                </div>
              </div>

              {/* Buyer Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Buyer</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-medium">{SAMPLE_LEAD.buyerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium">{SAMPLE_LEAD.buyerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="font-medium">{SAMPLE_LEAD.buyerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lender</span>
                    <span className="font-medium">{SAMPLE_LEAD.lender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loan Type</span>
                    <span className="font-medium">{SAMPLE_LEAD.loanType}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
                <p className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{SAMPLE_LEAD.notes}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setShowLeadModal(false)}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendLead}
                disabled={sendingLead}
                className="flex-1 py-3 rounded-lg font-semibold bg-[#1e3a5f] text-white hover:bg-[#2a4d7a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sendingLead ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annie Mac Rate Comparison Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowRateModal(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#1b3c6b] text-white p-5 rounded-t-xl">
              <div className="flex items-center justify-between mb-3">
                <img
                  src="/anniemac-logo.png"
                  alt="Annie Mac Home Mortgage"
                  className="h-7 object-contain brightness-0 invert"
                />
                <button
                  onClick={() => setShowRateModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <h2 className="text-lg font-bold">Compare Rates for Your Buyer</h2>
              <p className="text-sm opacity-80 mt-1">Review before requesting a rate comparison</p>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Recipient */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">
                  <Mail size={14} className="inline mr-1.5 -mt-0.5" />
                  To: Annie Mac Home Mortgage
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Subject: {formData.completedBy || 'User'} is requesting a rate comparison for their buyer
                </p>
              </div>

              {/* Property Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Property</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Address</span>
                    <span className="font-medium">{formData.propertyAddress || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">MLS #</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.mlsNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Purchase Price</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.purchasePrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Closing Date</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.closingDate}</span>
                  </div>
                </div>
              </div>

              {/* Buyer Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Buyer</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.buyerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.buyerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.buyerPhone}</span>
                  </div>
                </div>
              </div>

              {/* Current Financing */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Current Financing</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Lender</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.currentLender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loan Type</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.loanType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Down Payment</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.downPayment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Est. Credit Score</span>
                    <span className="font-medium">{SAMPLE_RATE_REQUEST.creditScore}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
                <p className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{SAMPLE_RATE_REQUEST.notes}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setShowRateModal(false)}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRateRequest}
                disabled={sendingRate}
                className="flex-1 py-3 rounded-lg font-semibold bg-[#1b3c6b] text-white hover:bg-[#254d82] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sendingRate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <TrendingDown size={18} />
                    Request Rates
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
