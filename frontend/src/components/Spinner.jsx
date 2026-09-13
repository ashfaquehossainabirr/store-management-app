export default function Spinner({ size = 20 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: '2.5px solid var(--border-hairline)',
        borderTopColor: 'var(--accent-cyan)',
        borderRadius: '50%',
        animation: 'sf-spin 0.7s linear infinite',
      }}
    >
      <style>{`@keyframes sf-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
