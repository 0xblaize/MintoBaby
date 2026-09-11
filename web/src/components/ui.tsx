import React, { useState } from 'react';
import '../ui.css';

export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
      <div>
        <h1 className="mb-page-title">{title}</h1>
        {subtitle && <p className="mb-page-sub">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function Card({ children, style = {}, pad = true }: {
  children: React.ReactNode; style?: React.CSSProperties; pad?: boolean;
}) {
  return (
    <div className={`mb-card${pad ? ' mb-card-pad' : ''}`} style={style}>
      {children}
    </div>
  );
}

export function Button({ variant = 'primary', size, block, className = '', ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'ghost' | 'success' | 'danger';
    size?: 'sm' | 'md'; block?: boolean;
  }) {
  return (
    <button
      {...props}
      className={`mb-btn mb-btn-${variant}${size === 'sm' ? ' mb-btn-sm' : ''}${block ? ' mb-btn-block' : ''} ${className}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="mb-label">{label}</label>
      {children}
    </div>
  );
}

export function Alert({ kind = 'info', children }: { kind?: 'info' | 'error' | 'success' | 'warn'; children: React.ReactNode }) {
  return <div className={`mb-alert mb-alert-${kind}`}>{children}</div>;
}

export function EmptyState({ icon, title, hint, action }: {
  icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode;
}) {
  return (
    <div className="mb-empty">
      {icon && (
        <div style={{
          width: 46, height: 46, borderRadius: '50%', background: 'var(--mb-raised)',
          border: '1px solid var(--mb-border)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 14px', color: 'var(--mb-muted)',
        }}>{icon}</div>
      )}
      <div style={{ color: 'var(--mb-text-dim)', fontWeight: 600, fontSize: 14 }}>{title}</div>
      {hint && <div style={{ marginTop: 6 }}>{hint}</div>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

export function CopyChip({ text, display, style = {} }: { text: string; display?: string; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
      title="Click to copy"
      style={{
        cursor: 'pointer', fontFamily: 'var(--mb-font-mono)', fontSize: 12.5,
        background: 'var(--mb-raised)', border: `1px solid ${copied ? 'rgba(47,217,130,0.45)' : 'var(--mb-border)'}`,
        color: copied ? 'var(--mb-green)' : 'var(--mb-text)',
        borderRadius: 8, padding: '8px 14px', letterSpacing: '0.04em', transition: 'all 0.15s',
        ...style,
      }}
    >
      {copied ? 'Copied ✓' : (display ?? text)}
    </button>
  );
}

const STATUS_TONES: Record<string, string> = {
  open: 'green', known: 'green', public: 'green', done: 'green', live: 'green',
  not_open: 'gold', armed: 'gold', unavailable: 'gray', unknown: 'gray',
  expired: 'red', failed: 'red', firing: 'violet', seadrop: 'cyan',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status?.toLowerCase()] ?? 'gray';
  return <span className={`mb-badge mb-badge-${tone}`}>{(status ?? 'unknown').replace(/_/g, ' ')}</span>;
}

export function ComingSoon({ title, badge, children }: { title: string; badge?: string; children?: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: 40 }}>
      <Card style={{ textAlign: 'center', padding: '48px 36px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mb-violet)', marginBottom: 14 }}>
          {badge ?? 'Coming soon'}
        </div>
        <h1 style={{ fontFamily: 'var(--mb-font-head)', fontSize: 24, fontWeight: 700, color: 'var(--mb-text)', margin: '0 0 12px' }}>{title}</h1>
        <p style={{ color: 'var(--mb-muted)', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{children}</p>
      </Card>
    </div>
  );
}
