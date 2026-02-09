export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div
        className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin"
        style={{ borderTopColor: 'var(--brand-primary)' }}
      />
    </div>
  );
}
