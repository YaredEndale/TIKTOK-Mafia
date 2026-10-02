'use client';

import React, { useState } from 'react';
import { ClipCategory } from '@/lib/game-engine';

interface ClipMarkerConsoleProps {
  onMarkClip: (category: ClipCategory, description: string) => Promise<void>;
}

const CATEGORIES: { category: ClipCategory; label: string; icon: string; color: string }[] = [
  { category: 'PLOT_TWIST', label: 'Plot Twist', icon: '🌪️', color: '#ffb703' },
  { category: 'BLUFF', label: 'Bluff / Lie', icon: '🎭', color: '#a855f7' },
  { category: 'BETRAYAL', label: 'Betrayal', icon: '🗡️', color: '#ec4899' },
  { category: 'ACCUSATION', label: 'Accusation', icon: '👉', color: '#f97316' },
  { category: 'SAVE', label: 'Clutch Save', icon: '💉', color: '#00f59b' },
  { category: 'ELIMINATION', label: 'Elimination', icon: '💀', color: '#64748b' },
  { category: 'FUNNY', label: 'Hilarious', icon: '😂', color: '#10b981' },
  { category: 'OTHER', label: 'Epic Moment', icon: '🔥', color: '#ff2a5f' },
];

export function ClipMarkerConsole({ onMarkClip }: ClipMarkerConsoleProps) {
  const [selectedCategory, setSelectedCategory] = useState<ClipCategory>('PLOT_TWIST');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastMarkedFeedback, setLastMarkedFeedback] = useState<string | null>(null);

  const handleSubmit = async (categoryToUse = selectedCategory, customDesc = description) => {
    try {
      setIsSubmitting(true);
      await onMarkClip(categoryToUse, customDesc.trim() || `${categoryToUse} moment marked`);
      setDescription('');
      setLastMarkedFeedback(`✓ Marked ${categoryToUse}`);
      setTimeout(() => setLastMarkedFeedback(null), 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🎬</span>
          <h2 style={{ fontSize: 17, fontWeight: 900 }}>Mark Clip for TikTok</h2>
        </div>
        {lastMarkedFeedback && (
          <span
            className="badge"
            style={{
              background: 'var(--role-doctor-bg)',
              color: 'var(--role-doctor)',
              fontSize: 12,
            }}
          >
            {lastMarkedFeedback}
          </span>
        )}
      </div>

      {/* Category Pills Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.category;
          return (
            <button
              key={cat.category}
              type="button"
              onClick={() => setSelectedCategory(cat.category)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: isSelected ? `${cat.color}25` : 'rgba(255, 255, 255, 0.04)',
                border: isSelected ? `2px solid ${cat.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Description & Action */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Clip note (e.g. 'Player 3 caught lying about alibi')..."
          className="form-input"
          style={{ flex: 1, minHeight: 46, height: 46, fontSize: 14 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
        <button
          onClick={() => handleSubmit()}
          disabled={isSubmitting}
          className="btn-primary"
          style={{
            width: 'auto',
            minHeight: 46,
            height: 46,
            padding: '0 20px',
            fontSize: 14,
            whiteSpace: 'nowrap',
          }}
        >
          {isSubmitting ? 'Tagging...' : '⭐ Tag Moment'}
        </button>
      </div>

      {/* Instant 1-Click Fast Action Chips */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>
          QUICK TAG:
        </span>
        {['PLOT_TWIST', 'BLUFF', 'BETRAYAL', 'SAVE'].map((catKey) => {
          const cat = CATEGORIES.find((c) => c.category === catKey)!;
          return (
            <button
              key={catKey}
              onClick={() => handleSubmit(cat.category, `Instant ${cat.label}`)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 9999,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
