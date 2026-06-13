import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [light, setLight] = useState(() => localStorage.getItem('valdocco-theme') === 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    localStorage.setItem('valdocco-theme', light ? 'light' : 'dark');
  }, [light]);

  return (
    <button
      onClick={() => setLight((v) => !v)}
      aria-label="Cambiar tema"
      className="rounded-full border border-line bg-surface p-2 text-secondary transition-colors hover:text-primary"
    >
      {light ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
