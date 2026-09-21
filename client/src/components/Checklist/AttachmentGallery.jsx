import { Trash2, FileText, Upload } from 'lucide-react';

export default function AttachmentGallery({ attachments, onRemove }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Attached Files ({attachments.length}):</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {attachments.map((attachment, index) => (
          <div key={attachment.id || index} className="relative group">
            {attachment.type?.startsWith('image/') ? (
              <img
                src={attachment.url}
                alt={attachment.name}
                className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
              />
            ) : (
              <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-200">
                <FileText size={48} className="text-gray-400" />
              </div>
            )}

            {/* Pending badge */}
            {!attachment.isServer && (
              <div className="absolute top-2 left-2 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <Upload size={10} /> Pending
              </div>
            )}

            {/* Delete button */}
            <button
              onClick={() => onRemove(index)}
              className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
              title="Remove file"
            >
              <Trash2 size={16} />
            </button>

            {/* Bottom overlay with name/size */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 rounded-b-lg">
              <p className="truncate">{attachment.name || 'Unknown'}</p>
              <p className="text-gray-300">
                {((attachment.size || 0) / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <p className="text-sm text-red-800">
          <strong>{attachments.length}</strong> file(s) will be included in your PDF with their
          names
        </p>
      </div>
    </div>
  );
}
