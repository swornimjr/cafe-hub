export function SkeletonLine({ width = '100%', height = 14, mb = 10 }) {
  return (
    <div
      className="skeleton-box"
      style={{ width, height, marginBottom: mb, borderRadius: 6, flexShrink: 0 }}
    />
  );
}

export function SkeletonCard({ lines = 3, titleWidth = '40%' }) {
  return (
    <div className="card">
      <SkeletonLine width={titleWidth} height={12} mb={18} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? '65%' : '100%'} mb={i === lines - 1 ? 0 : 10} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div className="card">
      <SkeletonLine width="35%" height={12} mb={18} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < rows - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{ flex: 1 }}>
            <SkeletonLine width="55%" height={13} mb={6} />
            <SkeletonLine width="35%" height={10} mb={0} />
          </div>
          <SkeletonLine width={64} height={28} mb={0} />
        </div>
      ))}
    </div>
  );
}
