import { Camera, Image } from 'lucide-react';

export default function AttachmentUpload({ onFileUpload }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-[var(--brand-primary)] hover:bg-red-50 transition-colors cursor-pointer">
        <Camera size={32} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-700 text-center">Take Photo</span>
        <input
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          onChange={onFileUpload}
          className="hidden"
        />
      </label>

      <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-[var(--brand-primary)] hover:bg-red-50 transition-colors cursor-pointer">
        <Image size={32} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-700 text-center">Choose Files</span>
        <input
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={onFileUpload}
          className="hidden"
        />
      </label>
    </div>
  );
}
