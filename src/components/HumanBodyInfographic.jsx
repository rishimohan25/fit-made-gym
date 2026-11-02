'use client';

import React, { useState, useMemo } from 'react';
import Model from 'react-body-highlighter';
import { MUSCLE_LABEL_MAP } from '@/lib/exercises';

/**
 * HumanBodyInfographic Component
 * Supports:
 * 1. Realistic movement anatomy illustration (like the user's reference image)
 * 2. Vector whole-body muscle silhouette (Anterior & Posterior) with glowing highlights
 */
export default function HumanBodyInfographic({
  primaryMuscles = [],
  secondaryMuscles = [],
  title = '',
  exerciseName = '',
  imageUrl = '',
  compact = false,
  showToggle = true,
  theme = 'dark',
}) {
  const [activeTab, setActiveTab] = useState('both'); // 'both' | 'anterior' | 'posterior'
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);

  const isLight = theme === 'light';

  // Format data for react-body-highlighter
  const data = useMemo(() => {
    const list = [];
    if (primaryMuscles && primaryMuscles.length > 0) {
      list.push({
        name: 'Primary Driver',
        muscles: primaryMuscles,
        frequency: 2,
      });
    }
    if (secondaryMuscles && secondaryMuscles.length > 0) {
      list.push({
        name: 'Secondary / Synergist',
        muscles: secondaryMuscles,
        frequency: 1,
      });
    }
    return list;
  }, [primaryMuscles, secondaryMuscles]);

  // Amber for secondary, Crimson Red for primary
  const highlightedColors = ['#f59e0b', '#ef4444'];

  const handleMuscleClick = ({ muscle }) => {
    setSelectedMuscle(muscle);
    setTimeout(() => {
      setSelectedMuscle(null);
    }, 4000);
  };

  const hasAnyMuscles = (primaryMuscles && primaryMuscles.length > 0) || (secondaryMuscles && secondaryMuscles.length > 0);

  return (
    <div className={`human-infographic-container ${compact ? 'compact' : ''} ${isLight ? 'theme-light' : ''}`}>
      {title && (
        <div className="infographic-header">
          <div className="infographic-title-row">
            <span className="human-icon">🧬</span>
            <h4>{title}</h4>
          </div>
          {exerciseName && <span className="exercise-tag">{exerciseName}</span>}
        </div>
      )}

      {/* Realistic Exercise Action Diagram (Start & Finish positions) */}
      {imageUrl && (
        <div className="realistic-action-box">
          <div className="action-box-header">
            <span className="action-badge">🎯 Muscular Action & Execution</span>
            <button
              type="button"
              className="zoom-btn"
              onClick={() => setShowEnlargedImage(true)}
              title="Enlarge diagram"
            >
              🔍 Enlarge
            </button>
          </div>
          <div className="image-frame" onClick={() => setShowEnlargedImage(true)}>
            <img
              src={imageUrl}
              alt={exerciseName || 'Exercise Anatomy'}
              className="action-render-img"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {showToggle && !compact && (
        <div className="view-toggle-pills">
          <button
            type="button"
            className={`toggle-pill ${activeTab === 'both' ? 'active' : ''}`}
            onClick={() => setActiveTab('both')}
          >
            Full Body Map
          </button>
          <button
            type="button"
            className={`toggle-pill ${activeTab === 'anterior' ? 'active' : ''}`}
            onClick={() => setActiveTab('anterior')}
          >
            Front (Anterior)
          </button>
          <button
            type="button"
            className={`toggle-pill ${activeTab === 'posterior' ? 'active' : ''}`}
            onClick={() => setActiveTab('posterior')}
          >
            Back (Posterior)
          </button>
        </div>
      )}

      {/* Anatomical Model Views */}
      <div className={`models-stage ${activeTab === 'both' ? 'dual' : 'single'}`}>
        {(activeTab === 'both' || activeTab === 'anterior') && (
          <div className="model-wrapper anterior-card">
            <div className="model-label">Anterior (Front)</div>
            <div className="model-svg-holder">
              <Model
                type="anterior"
                data={data}
                bodyColor={isLight ? '#cbd5e1' : '#334155'}
                highlightedColors={highlightedColors}
                style={{ width: compact ? '105px' : '140px', margin: '0 auto' }}
                onClick={handleMuscleClick}
              />
            </div>
          </div>
        )}

        {(activeTab === 'both' || activeTab === 'posterior') && (
          <div className="model-wrapper posterior-card">
            <div className="model-label">Posterior (Back)</div>
            <div className="model-svg-holder">
              <Model
                type="posterior"
                data={data}
                bodyColor={isLight ? '#cbd5e1' : '#334155'}
                highlightedColors={highlightedColors}
                style={{ width: compact ? '105px' : '140px', margin: '0 auto' }}
                onClick={handleMuscleClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* Selected Muscle Interactive Toast */}
      {selectedMuscle && (
        <div className="muscle-interactive-toast">
          ✨ <strong>{MUSCLE_LABEL_MAP[selectedMuscle] || selectedMuscle}</strong>
          {primaryMuscles.includes(selectedMuscle) && <span className="badge badge-primary">Primary Target</span>}
          {secondaryMuscles.includes(selectedMuscle) && <span className="badge badge-secondary">Synergist</span>}
        </div>
      )}

      {/* Legend & Muscle Breakdown Tags */}
      {hasAnyMuscles && (
        <div className="muscle-legend-tray">
          {primaryMuscles && primaryMuscles.length > 0 && (
            <div className="legend-group primary-group">
              <span className="legend-indicator dot-primary"></span>
              <span className="legend-label">Primary Driver:</span>
              <div className="muscle-chips">
                {primaryMuscles.map((m) => (
                  <span key={m} className="muscle-chip primary">
                    {MUSCLE_LABEL_MAP[m] || m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {secondaryMuscles && secondaryMuscles.length > 0 && (
            <div className="legend-group secondary-group">
              <span className="legend-indicator dot-secondary"></span>
              <span className="legend-label">Stabilizers / Synergists:</span>
              <div className="muscle-chips">
                {secondaryMuscles.map((m) => (
                  <span key={m} className="muscle-chip secondary">
                    {MUSCLE_LABEL_MAP[m] || m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enlarged Lightbox Modal */}
      {showEnlargedImage && imageUrl && (
        <div className="image-lightbox-backdrop" onClick={() => setShowEnlargedImage(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <h4>{exerciseName || 'Exercise Movement Diagram'}</h4>
              <button className="lightbox-close" onClick={() => setShowEnlargedImage(false)}>
                ✕
              </button>
            </div>
            <img src={imageUrl} alt={exerciseName} className="enlarged-img" />
          </div>
        </div>
      )}

      <style jsx>{`
        .human-infographic-container {
          background: radial-gradient(130% 120% at 50% 0%, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.25rem;
          color: #f8fafc;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }

        .human-infographic-container.compact {
          padding: 0.75rem;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 12px;
        }

        .infographic-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .infographic-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .human-icon {
          font-size: 1.15rem;
        }

        .infographic-header h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .exercise-tag {
          font-size: 0.8rem;
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-weight: 500;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .realistic-action-box {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 0.75rem;
          margin-bottom: 1rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }

        .action-box-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .action-badge {
          background: #ef4444;
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
        }

        .zoom-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #cbd5e1;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .zoom-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .image-frame {
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          border-radius: 8px;
          background: #090d16;
        }

        .action-render-img {
          max-width: 100%;
          height: auto;
          max-height: 260px;
          object-fit: contain;
          transition: transform 0.2s ease;
        }

        .image-frame:hover .action-render-img {
          transform: scale(1.02);
        }

        .view-toggle-pills {
          display: flex;
          justify-content: center;
          gap: 0.35rem;
          margin-bottom: 1rem;
          background: rgba(0, 0, 0, 0.25);
          padding: 0.25rem;
          border-radius: 10px;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }

        .toggle-pill {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.3rem 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .toggle-pill:hover {
          color: #f1f5f9;
        }

        .toggle-pill.active {
          background: #3b82f6;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
        }

        .models-stage {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.25rem;
          margin: 0.5rem 0;
          flex-wrap: wrap;
        }

        .compact .models-stage {
          gap: 0.75rem;
        }

        .model-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(15, 23, 42, 0.5);
          padding: 0.75rem 0.5rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
        }

        .compact .model-wrapper {
          padding: 0.4rem;
        }

        .model-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 0.4rem;
        }

        .model-svg-holder {
          display: flex;
          justify-content: center;
          align-items: center;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
        }

        .muscle-interactive-toast {
          background: #1e1b4b;
          border: 1px solid #4338ca;
          color: #c7d2fe;
          font-size: 0.8rem;
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          text-align: center;
          margin: 0.5rem auto;
          width: fit-content;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: fadeIn 0.2s ease;
        }

        .badge {
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-primary {
          background: #dc2626;
          color: #ffffff;
        }

        .badge-secondary {
          background: #d97706;
          color: #ffffff;
        }

        .muscle-legend-tray {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.8rem;
        }

        .legend-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .legend-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dot-primary {
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
        }

        .dot-secondary {
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
        }

        .legend-label {
          color: #94a3b8;
          font-weight: 500;
          font-size: 0.75rem;
        }

        .muscle-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .muscle-chip {
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .muscle-chip.primary {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .muscle-chip.secondary {
          background: rgba(245, 158, 11, 0.15);
          color: #fde68a;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        /* Lightbox modal */
        .image-lightbox-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
        }

        .lightbox-content {
          background: #111827;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          padding: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .lightbox-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .lightbox-header h4 {
          margin: 0;
          color: #f8fafc;
        }

        .lightbox-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 1.2rem;
          cursor: pointer;
        }

        .enlarged-img {
          width: 100%;
          height: auto;
          border-radius: 10px;
          background: #ffffff;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Light Theme Overrides */
        .human-infographic-container.theme-light {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .human-infographic-container.theme-light.compact {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .human-infographic-container.theme-light .infographic-header {
          border-bottom: 1px solid #f1f5f9;
        }

        .human-infographic-container.theme-light .infographic-header h4 {
          color: #475569;
        }

        .human-infographic-container.theme-light .exercise-tag {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }

        .human-infographic-container.theme-light .realistic-action-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
        }

        .human-infographic-container.theme-light .zoom-btn {
          background: #e2e8f0;
          border: 1px solid #cbd5e1;
          color: #334155;
        }

        .human-infographic-container.theme-light .zoom-btn:hover {
          background: #cbd5e1;
          color: #0f172a;
        }

        .human-infographic-container.theme-light .image-frame {
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }

        .human-infographic-container.theme-light .view-toggle-pills {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }

        .human-infographic-container.theme-light .toggle-pill {
          color: #64748b;
        }

        .human-infographic-container.theme-light .toggle-pill:hover {
          color: #0f172a;
        }

        .human-infographic-container.theme-light .toggle-pill.active {
          background: #2563eb;
          color: #ffffff;
        }

        .human-infographic-container.theme-light .model-wrapper {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .human-infographic-container.theme-light .model-label {
          color: #64748b;
        }

        .human-infographic-container.theme-light .muscle-interactive-toast {
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          color: #3730a3;
        }

        .human-infographic-container.theme-light .muscle-legend-tray {
          border-top: 1px solid #f1f5f9;
        }

        .human-infographic-container.theme-light .legend-label {
          color: #475569;
        }

        .human-infographic-container.theme-light .muscle-chip.primary {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }

        .human-infographic-container.theme-light .muscle-chip.secondary {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fcd34d;
        }

        .human-infographic-container.theme-light .lightbox-content {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
        }

        .human-infographic-container.theme-light .lightbox-header h4 {
          color: #0f172a;
        }
      `}</style>
    </div>
  );
}
