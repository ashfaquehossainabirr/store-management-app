import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ compact }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn btn-sm"
      style={{ width: compact ? 34 : '100%', justifyContent: 'center' }}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      {!compact && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
