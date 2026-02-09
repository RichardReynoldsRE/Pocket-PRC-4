export default function StatusToast({ message, type, show }) {
  if (!show) return null;

  const bgClass = type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-80 z-50">
      <div className={`p-4 rounded-lg shadow-lg text-base ${bgClass}`}>{message}</div>
    </div>
  );
}
