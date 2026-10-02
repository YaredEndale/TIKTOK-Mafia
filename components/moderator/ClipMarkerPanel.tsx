'use client';

import React, { useState } from 'react';
import { CLIP_CATEGORIES, ClipCategory, ClipMarker } from '@/lib/game-engine';

interface ClipMarkerPanelProps {
  clips: ClipMarker[];
  onMarkClip: (category: ClipCategory, description: string) => Promise<void>;
}

export const ClipMarkerPanel: React.FC<ClipMarkerPanelProps> = ({ clips, onMarkClip }) => {
  const [selectedCategory, setSelectedCategory] = useState<ClipCategory>('BLUFF');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onMarkClip(selectedCategory, description.trim());
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (cat: ClipCategory) => {
    switch (cat) {
      case 'BLUFF':
        return '#f59e0b';
      case 'ACCUSATION':
        return '#ef4444';
      case 'BETRAYAL':
        return '#ec4899';
      case 'SAVE':
        return '#00f59b';
      case 'PLOT_TWIST':
        return '#8b5cf6';
      case 'FUNNY':
        return '#06b6d4';
      default:
        return '#94a3b8';
    }
  };

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontSize: 16, fontWeight: 800 }}>Highlight Clip Markers</h4>
        <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {clips.length} Marked
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        {/* Category Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {CLIP_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const color = getCategoryColor(cat);

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: isSelected ? `${color}25` : 'rgba(255,255,255,0.04)',
                  border: isSelected ? `1.5px solid ${color}` : '1px solid var(--border-subtle)',
                  color: isSelected ? color : 'var(--text-muted)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Quick note (e.g. Alice accused Bob fiercely)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            style={{ minHeight: 40, height: 40, fontSize: 13, flex: 1 }}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: 'auto', minHeight: 40, height: 40, padding: '0 16px', fontSize: 13 }}
          >
            Mark Clip
          </button>
        </div>
      </form>

      {/* Recent Clips List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180 }}>
        {clips.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
            No clips marked yet. Tap a category above to bookmark key stream moments.
          </p>
        ) : (
          clips.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: getCategoryColor(c.category) }}>
                  [{c.category}]
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{c.description || 'Moment marked'}</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
