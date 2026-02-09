import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Save, Upload, ChevronDown, LogOut, Shield, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { brandConfig } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    const event = new CustomEvent('prc:save-progress');
    window.dispatchEvent(event);
  };

  const handleLoadFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        window.dispatchEvent(new CustomEvent('prc:load-progress', { detail: data }));
      } catch {
        // handled by consumer
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header
      className="sticky top-0 z-30 text-[var(--brand-text-on-primary)] p-4 shadow-lg"
      style={{ backgroundColor: 'var(--brand-primary)' }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Home size={28} />
            <div className="text-left">
              <h1 className="text-xl font-bold">{brandConfig.app_name || 'Pocket PRC'}</h1>
              <p className="text-xs opacity-75">v4.0</p>
            </div>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                {initial}
              </div>
              <ChevronDown size={16} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border text-gray-800 py-1 z-40">
                <div className="px-4 py-2 border-b text-sm">
                  <p className="font-semibold truncate">{user?.name}</p>
                  <p className="text-gray-500 text-xs truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <User size={16} /> Profile
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => { setDropdownOpen(false); navigate('/admin'); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Shield size={16} /> Admin
                  </button>
                )}
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSave}
            className="action-button bg-white px-4 py-3 rounded-lg font-bold text-base flex items-center justify-center gap-2 hover:bg-gray-100 shadow-md transition-colors"
            style={{ color: 'var(--brand-primary)' }}
          >
            <Save size={24} />
            Save Progress
          </button>
          <label
            className="action-button bg-white px-4 py-3 rounded-lg font-bold text-base flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 shadow-md transition-colors"
            style={{ color: 'var(--brand-primary)' }}
          >
            <Upload size={24} />
            Load Progress
            <input type="file" accept=".json" onChange={handleLoadFile} className="hidden" />
          </label>
        </div>
      </div>
    </header>
  );
}
