'use client';

import React, { useState, useEffect, useRef } from 'react';
import HumanBodyInfographic from '@/components/HumanBodyInfographic';

export default function MemberWorkoutPage() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);
  const [formattedDate, setFormattedDate] = useState('');

  // Set completion state: { [exerciseId_setIndex]: boolean }
  const [completedSets, setCompletedSets] = useState({});
  // Completed warmups, cardio, stretches
  const [completedItems, setCompletedItems] = useState({});

  // Rest Timer State
  const [activeTimer, setActiveTimer] = useState(null); // { secondsLeft: number, totalSeconds: number, exerciseName: string }
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Fetch today's routine on mount
  useEffect(() => {
    const fetchTodayRoutine = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/routine');
        const data = await res.json();
        if (data.success) {
          setSchedule(data.schedule);
        }
      } catch (err) {
        console.error('Failed to load today routine:', err);
      } finally {
        setLoading(false);
      }
    };

    const today = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    setFormattedDate(today.toLocaleDateString(undefined, options));

    fetchTodayRoutine();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (activeTimer && activeTimer.secondsLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setActiveTimer((prev) => {
          if (!prev) return null;
          if (prev.secondsLeft <= 1) {
            clearInterval(timerIntervalRef.current);
            playTimerFinishSound();
            return null;
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [activeTimer]);

  // Audio tone on rest timer completion
  const playTimerFinishSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // ignore
    }
  };

  const toggleSetComplete = (exId, setIndex, restSeconds, exName) => {
    const key = `${exId}_${setIndex}`;
    const nextState = !completedSets[key];
    setCompletedSets((prev) => ({ ...prev, [key]: nextState }));

    if (nextState && restSeconds > 0) {
      setActiveTimer({
        secondsLeft: restSeconds,
        totalSeconds: restSeconds,
        exerciseName: exName,
      });
    }
  };

  const toggleItemComplete = (id) => {
    setCompletedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const cancelTimer = () => {
    clearInterval(timerIntervalRef.current);
    setActiveTimer(null);
  };

  const allDayPrimaryMuscles = Array.from(
    new Set((schedule?.workouts || []).flatMap((w) => w.primary_muscles || []))
  );
  const allDaySecondaryMuscles = Array.from(
    new Set((schedule?.workouts || []).flatMap((w) => w.secondary_muscles || []))
  ).filter((m) => !allDayPrimaryMuscles.includes(m));

  return (
    <main className="mobile-workout-page">
      {/* Top Header */}
      <header className="page-header">
        <div className="header-brand-row">
          <div className="brand-badge">
            <img src="/images/logo.png" alt="FIT MADE GYM" className="brand-logo-img" />
            <div className="brand-titles">
              <span className="brand-name">FIT MADE GYM</span>
              <span className="brand-motto">STAY FIT. BE ON TOP</span>
            </div>
          </div>
        </div>

        {/* Date Display */}
        {formattedDate && (
          <div className="today-date-banner">
            <span className="live-pulse-dot"></span>
            <span className="date-text">TODAY • {formattedDate.toUpperCase()}</span>
          </div>
        )}
      </header>

      {/* Routine Banner */}
      {loading ? (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Loading today's training protocol...</p>
        </div>
      ) : schedule ? (
        <div className="workout-content-wrapper">
          <section className="routine-hero-card">
            <div className="hero-top-row">
              <span className="day-status-pill today-pill">
                🔥 Today’s Protocol ({schedule.day_name})
              </span>
              <span className="exercise-count-tag">
                {(schedule.workouts || []).length} Exercises • {(schedule.cardio || []).length} Cardio • {(schedule.stretches || []).length} Stretches
              </span>
            </div>

            <h1 className="target-focus-title">{schedule.target_focus}</h1>
            <p className="focus-description">
              Follow your structured 4-phase program: Warm-up, Working sets, Cardio finisher, and Targeted stretches.
            </p>

            {/* Overall Day Human Body Infographic */}
            <div className="hero-infographic-container">
              <HumanBodyInfographic
                primaryMuscles={allDayPrimaryMuscles}
                secondaryMuscles={allDaySecondaryMuscles}
                title="Today's Target Muscle Activation"
                exerciseName={schedule.target_focus}
                imageUrl={schedule.workouts?.[0]?.imageUrl || ''}
              />
            </div>
          </section>

          {/* Rest Timer Float Bar */}
          {activeTimer && (
            <div className="rest-timer-bar">
              <div className="timer-info">
                <span className="timer-label">⏱️ Rest Countdown:</span>
                <span className="timer-digits">
                  {Math.floor(activeTimer.secondsLeft / 60)}:
                  {String(activeTimer.secondsLeft % 60).padStart(2, '0')}
                </span>
                <span className="timer-for">({activeTimer.exerciseName})</span>
              </div>
              <button className="timer-cancel-btn" onClick={cancelTimer}>
                Skip Rest ⏩
              </button>
            </div>
          )}

          {/* Section 1: Warm-Up Details */}
          {schedule.warmups && schedule.warmups.length > 0 && (
            <section className="routine-section">
              <div className="section-header-row">
                <span className="section-step-num">1</span>
                <div>
                  <h2 className="section-title">Warm-Up & Mobility Drills</h2>
                  <p className="section-sub">Prepare joint capsules and elevate internal muscle temperature.</p>
                </div>
              </div>

              <div className="warmup-cards-list">
                {schedule.warmups.map((w, idx) => {
                  const isDone = !!completedItems[w.id || idx];
                  return (
                    <div key={w.id || idx} className={`warmup-card ${isDone ? 'item-done' : ''}`}>
                      <div className="warmup-header">
                        <button
                          type="button"
                          className={`check-circle-btn ${isDone ? 'checked' : ''}`}
                          onClick={() => toggleItemComplete(w.id || idx)}
                        >
                          {isDone ? '✓' : '○'}
                        </button>
                        <div className="warmup-title-block">
                          <h3 className="warmup-name">{w.name}</h3>
                          <span className="warmup-reps-badge">{w.target_reps}</span>
                        </div>
                      </div>
                      {w.coach_notes && <p className="warmup-notes">💡 {w.coach_notes}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 2: Workouts Only For That Day */}
          <section className="routine-section">
            <div className="section-header-row">
              <span className="section-step-num">2</span>
              <div>
                <h2 className="section-title">Working Sets & Exercises</h2>
                <p className="section-sub">Hit target reps with controlled eccentrics. Check off completed sets.</p>
              </div>
            </div>

            <div className="workouts-cards-list">
              {(schedule.workouts || []).map((ex, exIdx) => {
                const isExpanded = expandedExerciseId === (ex.id || exIdx);
                const totalSets = ex.target_sets || 3;

                return (
                  <article key={ex.id || exIdx} className="workout-card">
                    <div className="workout-card-top">
                      <div className="exercise-index-pill">#{exIdx + 1}</div>
                      <div className="workout-main-info">
                        <h3 className="workout-exercise-name">{ex.exercise_name}</h3>
                        <div className="workout-meta-badges">
                          <span className="meta-badge sets-badge">
                            🎯 {ex.target_sets} Sets × {ex.target_reps}
                          </span>
                          <span className="meta-badge rest-badge">
                            ⏱️ {ex.rest_seconds || 60}s Rest
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Realistic Action Diagram Preview (if image exists) */}
                    {ex.imageUrl && (
                      <div className="exercise-action-preview-card">
                        <img
                          src={ex.imageUrl}
                          alt={ex.exercise_name}
                          className="exercise-action-preview-img"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {ex.coach_notes && (
                      <div className="coach-cue-box">
                        <span className="cue-icon">🏋️</span>
                        <p>{ex.coach_notes}</p>
                      </div>
                    )}

                    {/* Interactive Set Check-off Boxes */}
                    <div className="sets-tracker-tray">
                      <span className="tracker-label">Mark Sets:</span>
                      <div className="set-checkboxes-row">
                        {Array.from({ length: totalSets }).map((_, setIdx) => {
                          const key = `${ex.id || exIdx}_${setIdx}`;
                          const isDone = !!completedSets[key];
                          return (
                            <button
                              key={setIdx}
                              type="button"
                              className={`set-check-btn ${isDone ? 'done' : ''}`}
                              onClick={() =>
                                toggleSetComplete(
                                  ex.id || exIdx,
                                  setIdx,
                                  ex.rest_seconds || 60,
                                  ex.exercise_name
                                )
                              }
                            >
                              <span className="set-label">Set {setIdx + 1}</span>
                              <span className="set-status">{isDone ? '✓' : '○'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Toggle Button for Exercise Specific Human Infographic */}
                    <button
                      type="button"
                      className="toggle-infographic-btn"
                      onClick={() => setExpandedExerciseId(isExpanded ? null : (ex.id || exIdx))}
                    >
                      <span>{isExpanded ? 'Hide Muscle Diagram ▲' : 'Show Muscle Infographic ▼'}</span>
                    </button>

                    {/* Expandable Exercise-Specific Infographic */}
                    {isExpanded && (
                      <div className="exercise-infographic-expanded">
                        <HumanBodyInfographic
                          primaryMuscles={ex.primary_muscles || []}
                          secondaryMuscles={ex.secondary_muscles || []}
                          title={`${ex.exercise_name} Muscle Engagement`}
                          imageUrl={ex.imageUrl}
                          compact={true}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* Section 3: Cardio Section */}
          {schedule.cardio && schedule.cardio.length > 0 && (
            <section className="routine-section">
              <div className="section-header-row">
                <span className="section-step-num cardio-num">3</span>
                <div>
                  <h2 className="section-title">Cardio & Conditioning</h2>
                  <p className="section-sub">Post-lift cardiovascular finisher to optimize endurance and fat oxidation.</p>
                </div>
              </div>

              <div className="cardio-cards-list">
                {schedule.cardio.map((c, cIdx) => {
                  const isDone = !!completedItems[c.id || `cardio-${cIdx}`];
                  return (
                    <div key={c.id || cIdx} className={`cardio-card ${isDone ? 'item-done' : ''}`}>
                      <div className="cardio-header">
                        <button
                          type="button"
                          className={`check-circle-btn ${isDone ? 'checked' : ''}`}
                          onClick={() => toggleItemComplete(c.id || `cardio-${cIdx}`)}
                        >
                          {isDone ? '✓' : '○'}
                        </button>
                        <div className="cardio-info-block">
                          <h3 className="cardio-name">{c.name}</h3>
                          <div className="cardio-badges">
                            <span className="cardio-duration-badge">⏱️ {c.duration_minutes || 15} Mins</span>
                            {c.equipment && <span className="cardio-equip-badge">📍 {c.equipment}</span>}
                            {c.target_intensity && <span className="cardio-intensity-badge">⚡ {c.target_intensity}</span>}
                          </div>
                        </div>
                      </div>
                      {c.coach_notes && <p className="cardio-notes">💡 {c.coach_notes}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 4: Stretches & Cool-Down */}
          {schedule.stretches && schedule.stretches.length > 0 && (
            <section className="routine-section">
              <div className="section-header-row">
                <span className="section-step-num stretch-num">4</span>
                <div>
                  <h2 className="section-title">Stretches & Cool-Down</h2>
                  <p className="section-sub">Lengthen trained muscle fibers, decompress joints, and speed recovery.</p>
                </div>
              </div>

              <div className="stretch-cards-list">
                {schedule.stretches.map((s, sIdx) => {
                  const isDone = !!completedItems[s.id || `stretch-${sIdx}`];
                  return (
                    <div key={s.id || sIdx} className={`stretch-card ${isDone ? 'item-done' : ''}`}>
                      <div className="stretch-header">
                        <button
                          type="button"
                          className={`check-circle-btn ${isDone ? 'checked' : ''}`}
                          onClick={() => toggleItemComplete(s.id || `stretch-${sIdx}`)}
                        >
                          {isDone ? '✓' : '○'}
                        </button>
                        <div className="stretch-info-block">
                          <h3 className="stretch-name">{s.name}</h3>
                          <span className="stretch-duration-badge">{s.target_duration}</span>
                        </div>
                      </div>
                      {s.coach_notes && <p className="stretch-notes">🧘 {s.coach_notes}</p>}
                      {s.muscles && s.muscles.length > 0 && (
                        <div className="stretch-muscles-row">
                          {s.muscles.map((m) => (
                            <span key={m} className="muscle-pill stretch-pill">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="no-routine-card">
          <p>No workout routine scheduled for today.</p>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="page-footer">
        <div className="footer-logo-row">
          <img src="/images/logo.png" alt="FIT MADE GYM" className="footer-logo-img" />
          <div className="footer-brand-text">
            <span className="footer-gym-title">FIT MADE GYM</span>
            <span className="footer-gym-motto">STAY FIT. BE ON TOP • ESTD 2017</span>
          </div>
        </div>
        <p className="footer-gym-note">Personal Gym Training Protocol • Scanned via QR Code</p>
      </footer>

      <style jsx>{`
        .page-header {
          margin-bottom: 1.25rem;
        }

        .header-brand-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .brand-badge {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.35rem 0.85rem 0.35rem 0.5rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .brand-logo-img {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: contain;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);
        }

        .brand-titles {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-size: 0.95rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          color: #f8fafc;
          line-height: 1.1;
        }

        .brand-motto {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #f97316;
          text-transform: uppercase;
        }

        .today-date-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.45rem 0.85rem;
          border-radius: 10px;
          width: fit-content;
        }

        .live-pulse-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10b981;
          animation: pulse 1.5s infinite;
        }

        .date-text {
          font-size: 0.75rem;
          font-weight: 700;
          color: #cbd5e1;
          letter-spacing: 0.05em;
        }

        .routine-hero-card {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        .hero-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .day-status-pill {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
        }

        .today-pill {
          background: #ef4444;
          color: #ffffff;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }

        .exercise-count-tag {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .target-focus-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0.25rem 0 0.5rem 0;
          line-height: 1.2;
        }

        .focus-description {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 1.25rem;
          line-height: 1.4;
        }

        .hero-infographic-container {
          margin-top: 0.5rem;
        }

        .rest-timer-bar {
          position: sticky;
          top: 1rem;
          z-index: 100;
          background: #1e1b4b;
          border: 2px solid #6366f1;
          color: #ffffff;
          padding: 0.75rem 1rem;
          border-radius: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
          animation: slideDown 0.2s ease;
        }

        .timer-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .timer-label {
          font-size: 0.8rem;
          color: #c7d2fe;
          font-weight: 600;
        }

        .timer-digits {
          font-size: 1.25rem;
          font-weight: 800;
          font-family: monospace;
          color: #fbbf24;
        }

        .timer-for {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .timer-cancel-btn {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          cursor: pointer;
        }

        .routine-section {
          margin-bottom: 2rem;
        }

        .section-header-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .section-step-num {
          background: #ef4444;
          color: #ffffff;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          flex-shrink: 0;
          margin-top: 0.15rem;
        }

        .section-step-num.cardio-num {
          background: #3b82f6;
        }

        .section-step-num.stretch-num {
          background: #10b981;
        }

        .section-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .section-sub {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0.15rem 0 0 0;
        }

        .check-circle-btn {
          background: #1f2937;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #94a3b8;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 800;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .check-circle-btn.checked {
          background: #10b981;
          border-color: #10b981;
          color: #ffffff;
        }

        .item-done {
          opacity: 0.65;
          border-color: rgba(16, 185, 129, 0.4) !important;
        }

        .warmup-cards-list, .cardio-cards-list, .stretch-cards-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .warmup-card, .cardio-card, .stretch-card {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 0.9rem 1rem;
          transition: all 0.15s ease;
        }

        .warmup-header, .cardio-header, .stretch-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.4rem;
        }

        .warmup-title-block, .cardio-info-block, .stretch-info-block {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .warmup-name, .cardio-name, .stretch-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #f8fafc;
          margin: 0;
        }

        .warmup-reps-badge, .cardio-duration-badge, .stretch-duration-badge {
          background: #1e293b;
          color: #38bdf8;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          border: 1px solid rgba(56, 189, 248, 0.2);
        }

        .cardio-badges {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .cardio-equip-badge {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
        }

        .cardio-intensity-badge {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
        }

        .warmup-notes, .cardio-notes, .stretch-notes {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0.35rem 0 0 0;
          line-height: 1.4;
        }

        .stretch-muscles-row {
          display: flex;
          gap: 0.35rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }

        .stretch-pill {
          background: rgba(16, 185, 129, 0.15);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.3);
          font-size: 0.7rem;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }

        .workouts-cards-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .workout-card {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.15rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }

        .workout-card-top {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .exercise-index-pill {
          background: #1e293b;
          color: #f8fafc;
          font-size: 0.8rem;
          font-weight: 800;
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .workout-main-info {
          flex: 1;
        }

        .workout-exercise-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 0.35rem 0;
        }

        .workout-meta-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .meta-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
        }

        .sets-badge {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .rest-badge {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .exercise-action-preview-card {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 0.6rem;
          margin-bottom: 0.85rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
          overflow: hidden;
        }

        .exercise-action-preview-img {
          width: 100%;
          max-height: 240px;
          object-fit: contain;
          border-radius: 8px;
        }

        .coach-cue-box {
          background: #1a2234;
          border-left: 3px solid #ef4444;
          padding: 0.5rem 0.75rem;
          border-radius: 0 8px 8px 0;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.85rem;
        }

        .cue-icon {
          font-size: 0.9rem;
          margin-top: 0.05rem;
        }

        .coach-cue-box p {
          font-size: 0.8rem;
          color: #cbd5e1;
          margin: 0;
          line-height: 1.4;
        }

        .sets-tracker-tray {
          background: rgba(0, 0, 0, 0.25);
          padding: 0.65rem;
          border-radius: 10px;
          margin-bottom: 0.85rem;
        }

        .tracker-label {
          display: block;
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 0.4rem;
        }

        .set-checkboxes-row {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .set-check-btn {
          flex: 1;
          min-width: 65px;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          padding: 0.45rem 0.25rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.15s ease;
        }

        .set-check-btn.done {
          background: #059669;
          border-color: #10b981;
          color: #ffffff;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        }

        .toggle-infographic-btn {
          width: 100%;
          background: transparent;
          border: 1px dashed rgba(255, 255, 255, 0.15);
          color: #94a3b8;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          transition: all 0.15s ease;
        }

        .toggle-infographic-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #f8fafc;
        }

        .exercise-infographic-expanded {
          margin-top: 0.75rem;
          animation: fadeIn 0.2s ease;
        }

        .page-footer {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          text-align: center;
        }

        .footer-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          margin-bottom: 0.5rem;
        }

        .footer-logo-img {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: contain;
        }

        .footer-brand-text {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .footer-gym-title {
          font-size: 1rem;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: 0.05em;
          line-height: 1.1;
        }

        .footer-gym-motto {
          font-size: 0.7rem;
          font-weight: 700;
          color: #f97316;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .footer-gym-note {
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 0.85rem;
        }

        .loading-card, .no-routine-card {
          text-align: center;
          padding: 3rem 1rem;
          color: #94a3b8;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #ef4444;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem auto;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.9); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </main>
  );
}
