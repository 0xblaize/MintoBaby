const COLORS: Record<string, string> = {
  open:    '#00ff88',
  not_open:'#ffd700',
  expired: '#ff4444',
  armed:   '#ffd700',
  firing:  '#ff8800',
  done:    '#00ff88',
  failed:  '#ff4444',
  known:   '#00ff88',
  unavailable: '#888',
  public:  '#00ff88',
  seadrop: '#00ccff',
  unknown: '#888',
};

export function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] ?? '#888';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      color: '#000',
      background: color,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {status.replace('_', ' ')}
    </span>
  );
}
