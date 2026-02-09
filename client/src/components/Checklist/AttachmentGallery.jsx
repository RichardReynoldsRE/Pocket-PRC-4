import { useState } from 'react';
import { Trash2, Pencil, FileText } from 'lucide-react';

export default function AttachmentGallery({ attachments, onRemove, onRename }) {
  const [renamingIndex, setRenamingIndex] = useState(null);

  const handleRenameKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      onRename(index, e.target.value);
      setRenamingIndex(null);
    } else if (e.key === 'Escape') {
      setRenamingIndex(null);
    }
  };

  const handleRenameBlur = (e, index) => {
    onRename(index, e.target.value);
    setRenamingIndex(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Attached Files ({attachments.length}):</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {attachments.map((attachment, index) => (
          <div key={index} className="relative group">
            {attachment.type?.startsWith('image/') ? (
              <img
                src={attachment.data}
                alt={attachment.name}
                className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
              />
            ) : (
              <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-200">
                <FileText size={48} className="text-gray-400" />
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

            {/* Rename button */}
            <button
              onClick={() => setRenamingIndex(index)}
              className="absolute top-2 right-14 bg-blue-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
              title="Rename file"
            >
              <Pencil size={16} />
            </button>

            {/* Bottom overlay with name/size or rename input */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 rounded-b-lg">
              {renamingIndex === index ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    defaultValue={attachment.name || 'Unknown'}
                    onKeyDown={(e) => handleRenameKeyDown(e, index)}
                    onBlur={(e) => handleRenameBlur(e, index)}
                    autoFocus
                    className="flex-1 px-2 py-1 text-black rounded text-xs"
                    placeholder="Enter filename"
                  />
                </div>
              ) : (
                <>
                  <p className="truncate">{attachment.name || 'Unknown'}</p>
                  <p className="text-gray-300">
                    {((attachment.size || 0) / 1024).toFixed(1)} KB
                  </p>
                </>
              )}
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
