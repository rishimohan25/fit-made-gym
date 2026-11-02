'use client';

import React, { useState, useEffect } from 'react';
import { renderQrSvg } from '@/lib/qrcode';

export default function GymQrModal({ isOpen, onClose }) {
  const [gymUrl, setGymUrl] = useState('');
  const [gymName, setGymName] = useState('FIT MADE GYM');
  const [tagline, setTagline] = useState('STAY FIT. BE ON TOP • ESTD 2017');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGymUrl(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const qrSvgString = renderQrSvg(gymUrl || 'https://fitmadegym.com', {
    size: 280,
    margin: 2,
    darkColor: '#0f172a',
    lightColor: '#ffffff',
  });

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(gymUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fit-made-gym-qr-${new Date().toISOString().slice(0, 10)}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="qr-modal-backdrop" onClick={onClose}>
      <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <div>
            <h3>📲 Gym Floor QR Code</h3>
            <p className="subtitle">Print or display this poster at the front desk and workout stations.</p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Poster Preview Section */}
        <div className="poster-preview-card printable-poster-area">
          <div className="poster-logo-container">
            <img src="/images/logo.png" alt="FIT MADE GYM" className="poster-logo-img" />
          </div>

          <h2 className="poster-gym-title">{gymName}</h2>
          <div className="poster-tagline-badge">{tagline}</div>
          <p className="poster-subtitle">SCAN TO ACCESS TODAY'S WORKOUT PROTOCOL</p>

          <div
            className="qr-visual-box"
            dangerouslySetInnerHTML={{ __html: qrSvgString }}
          />

          <div className="poster-steps-grid">
            <div className="step-item">
              <span className="step-num">1</span>
              <span>Open Phone Camera</span>
            </div>
            <div className="step-item">
              <span className="step-num">2</span>
              <span>Scan QR Code</span>
            </div>
            <div className="step-item">
              <span className="step-num">3</span>
              <span>Crush Today's Lift!</span>
            </div>
          </div>

          <div className="poster-footer-url">{gymUrl}</div>
        </div>

        {/* Controls & Configuration */}
        <div className="qr-config-panel non-printable">
          <div className="input-group">
            <label>Gym Name:</label>
            <input
              type="text"
              className="gym-text-input"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="FIT MADE GYM"
            />
          </div>

          <div className="input-group">
            <label>Tagline / Motto:</label>
            <input
              type="text"
              className="gym-text-input"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="STAY FIT. BE ON TOP • ESTD 2017"
            />
          </div>

          <div className="input-group">
            <label>Live Gym URL (Encoded in QR):</label>
            <div className="url-input-row">
              <input
                type="text"
                className="gym-text-input"
                value={gymUrl}
                onChange={(e) => setGymUrl(e.target.value)}
                placeholder="https://..."
              />
              <button className="btn-secondary" onClick={handleCopyUrl}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="action-buttons-row">
            <button className="btn-action primary" onClick={handlePrint}>
              🖨️ Print Gym Wall Poster
            </button>
            <button className="btn-action outline" onClick={handleDownloadSvg}>
              ⬇️ Download High-Res SVG
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .qr-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }

        .qr-modal-card {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          max-width: 540px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 1.75rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          color: #f8fafc;
        }

        .qr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }

        .qr-modal-header h3 {
          margin: 0;
          font-size: 1.3rem;
          color: #f8fafc;
        }

        .subtitle {
          margin: 0.25rem 0 0 0;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #94a3b8;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.15s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .poster-preview-card {
          background: #ffffff;
          color: #0f172a;
          border-radius: 16px;
          padding: 1.75rem 1rem;
          text-align: center;
          margin-bottom: 1.25rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        }

        .poster-logo-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .poster-logo-img {
          width: 100px;
          height: 100px;
          object-fit: contain;
          border-radius: 50%;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.15));
        }

        .poster-gym-title {
          font-size: 1.65rem;
          font-weight: 900;
          margin: 0.25rem 0;
          color: #132247;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .poster-tagline-badge {
          display: inline-block;
          background: #f97316;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 0.3rem 0.85rem;
          border-radius: 999px;
          margin-bottom: 0.65rem;
        }

        .poster-subtitle {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.05em;
          margin: 0 0 1rem 0;
        }

        .qr-visual-box {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0.5rem 0 1rem 0;
        }

        .poster-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          background: #f1f5f9;
          padding: 0.75rem;
          border-radius: 12px;
          margin-bottom: 0.75rem;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #334155;
        }

        .step-num {
          background: #132247;
          color: #ffffff;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }

        .poster-footer-url {
          font-size: 0.75rem;
          color: #64748b;
          font-family: monospace;
          word-break: break-all;
        }

        .qr-config-panel {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .input-group label {
          display: block;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 0.35rem;
          font-weight: 500;
        }

        .gym-text-input {
          width: 100%;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          padding: 0.6rem 0.85rem;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
        }

        .gym-text-input:focus {
          border-color: #3b82f6;
        }

        .url-input-row {
          display: flex;
          gap: 0.5rem;
        }

        .btn-secondary {
          background: #334155;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          flex-shrink: 0;
        }

        .action-buttons-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .btn-action {
          padding: 0.75rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          transition: all 0.15s ease;
        }

        .btn-action.primary {
          background: #f97316;
          border: none;
          color: #ffffff;
        }

        .btn-action.primary:hover {
          background: #ea580c;
        }

        .btn-action.outline {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #f8fafc;
        }

        .btn-action.outline:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .printable-poster-area,
          .printable-poster-area * {
            visibility: visible;
          }
          .printable-poster-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            box-shadow: none;
            padding: 2rem;
          }
          .non-printable {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
