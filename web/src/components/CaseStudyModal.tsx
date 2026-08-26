import React from 'react';
import { IconX, IconCheck } from './MintoIcons';

export interface ProjectData {
  id: string;
  name: string;
  category: string;
  year: string;
  client: string;
  headline: string;
  description: string;
  deliverables: string[];
  metrics: { label: string; value: string }[];
  accentColor?: string;
  heroGradient: string;
}

interface CaseStudyModalProps {
  project: ProjectData | null;
  onClose: () => void;
}

export function CaseStudyModal({ project, onClose }: CaseStudyModalProps) {
  if (!project) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'rgba(10, 10, 15, 0.9)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#14131a',
          border: '1px solid rgba(107, 60, 232, 0.35)',
          borderRadius: '20px',
          padding: '0',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 50px rgba(107, 60, 232, 0.25)',
          position: 'relative',
          color: '#f5f5f5',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner header */}
        <div
          style={{
            background: project.heroGradient,
            padding: '48px 40px 36px',
            borderRadius: '20px 20px 0 0',
            position: 'relative',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(10,10,15,0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IconX size={18} />
          </button>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <span
              style={{
                background: 'rgba(107,60,232,0.3)',
                border: '1px solid #6b3ce8',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 10,
                fontWeight: 600,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
              }}
            >
              {project.category} · {project.year}
            </span>
          </div>

          <h2 className="font-heading" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, margin: '0 0 10px 0', lineHeight: 1.05 }}>
            {project.name}
          </h2>
          <p style={{ fontSize: 18, color: '#e0e0ff', fontWeight: 300, maxWidth: 600, margin: 0, opacity: 0.9 }}>
            {project.headline}
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '36px 40px' }}>
          {/* Key Impact Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 36 }}>
            {project.metrics.map((m, idx) => (
              <div
                key={idx}
                style={{
                  background: '#1c1b24',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div className="font-heading" style={{ fontSize: 32, fontWeight: 700, color: '#6b3ce8', marginBottom: 4 }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 11, color: '#827e99', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 32 }}>
            <h4 className="font-heading" style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#fff' }}>
              The Challenge & Execution
            </h4>
            <p style={{ color: '#827e99', fontSize: 15, lineHeight: 1.7, fontWeight: 300 }}>
              {project.description}
            </p>
          </div>

          {/* Deliverables */}
          <div style={{ marginBottom: 36 }}>
            <h4 className="font-heading" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#fff' }}>
              Key Deliverables
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {project.deliverables.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#1c1b24',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#e0e0e0',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <IconCheck size={16} color="#6b3ce8" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 12, color: '#827e99' }}>
              Client: <strong style={{ color: '#fff' }}>{project.client}</strong>
            </span>
            <button
              onClick={onClose}
              style={{
                background: '#6b3ce8',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close Case Study
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
