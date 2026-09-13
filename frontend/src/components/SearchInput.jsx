import { Search } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div style={{ position: 'relative', minWidth: 220, flex: '1 1 240px' }}>
      <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ paddingLeft: 32 }} />
    </div>
  );
}
