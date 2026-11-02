'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import HumanBodyInfographic from '@/components/HumanBodyInfographic';
import GymQrModal from '@/components/GymQrModal';
import { MUSCLE_LABEL_MAP } from '@/lib/exercises';
import { renderQrSvg } from '@/lib/qrcode';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ALL_MUSCLE_KEYS = Object.keys(MUSCLE_LABEL_MAP);

export default function AdminDashboardPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [gymOrigin, setGymOrigin] = useState('');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('fit_made_gym_theme') || 'dark';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } catch (e) {}
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('fit_made_gym_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    } catch (e) {}
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGymOrigin(window.location.origin);
    }
  }, []);

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Routine management state
  const [selectedDay, setSelectedDay] = useState(1);
  const [daySchedules, setDaySchedules] = useState({});
  const [standardExercises, setStandardExercises] = useState([]);
  const [groupedExercises, setGroupedExercises] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  // Add workout form state
  const [addMode, setAddMode] = useState('standard'); // 'standard' | 'custom' | 'webSearch'
  const [selectedStandardId, setSelectedStandardId] = useState('');
  const [standardPreview, setStandardPreview] = useState(null);

  // Direct custom workout manual form (without searching)
  const [customWorkoutForm, setCustomWorkoutForm] = useState({
    name: '',
    target_sets: 3,
    target_reps: '10-12 reps',
    rest_seconds: 60,
    coach_notes: '',
    primary_muscles: ['chest'],
    secondary_muscles: [],
    imageUrl: '',
  });

  // Web search state (Exa only) - supports workout, cardio, and stretch
  const [searchType, setSearchType] = useState('workout'); // 'workout' | 'cardio' | 'stretch'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchCardioResult, setSearchCardioResult] = useState(null);
  const [searchStretchResult, setSearchStretchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false);

  // Verify auth session on load
  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        setAdminUsername(data.username);
        loadAllData();
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Load all schedules and standard exercises
  const loadAllData = async () => {
    try {
      const resRoutines = await fetch('/api/routine?all=true');
      const dataRoutines = await resRoutines.json();
      if (dataRoutines.success) {
        const map = {};
        (dataRoutines.schedules || []).forEach((s) => {
          map[s.day_of_week] = s;
        });
        setDaySchedules(map);
      }

      const resEx = await fetch('/api/exercises/standard');
      const dataEx = await resEx.json();
      if (dataEx.success) {
        setStandardExercises(dataEx.exercises || []);
        setGroupedExercises(dataEx.grouped || {});
        if (dataEx.exercises && dataEx.exercises.length > 0) {
          setSelectedStandardId(dataEx.exercises[0].id);
          setStandardPreview(dataEx.exercises[0]);
        }
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: loginForm.username,
          password: loginForm.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setAdminUsername(data.username);
        loadAllData();
      } else {
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError('Connection error during login');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setIsAuthenticated(false);
    setLoginForm({ username: '', password: '' });
  };

  // Handle Change Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setShowPasswordModal(false), 2000);
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Network error updating password' });
    }
  };

  // Current day data accessor
  const currentDayData = daySchedules[selectedDay] || {
    day_of_week: selectedDay,
    day_name: DAY_NAMES[selectedDay - 1],
    target_focus: 'Strength Training',
    warmups: [],
    workouts: [],
    cardio: [],
    stretches: [],
  };

  // Update target focus for current day
  const handleTargetFocusChange = (val) => {
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        target_focus: val,
      },
    }));
  };

  // Workouts update helpers
  const handleWorkoutFieldChange = (index, field, value) => {
    const nextWorkouts = [...(currentDayData.workouts || [])];
    nextWorkouts[index] = { ...nextWorkouts[index], [field]: value };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        workouts: nextWorkouts,
      },
    }));
  };

  // Clone from Last Week / Another Day / Blueprint
  const handleCloneRoutine = async (sourceType, sourceDay = 1) => {
    try {
      setIsCloning(true);
      const res = await fetch('/api/routine/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_day: selectedDay,
          source_type: sourceType,
          source_day: sourceDay,
        }),
      });
      const data = await res.json();
      if (data.success && data.schedule) {
        setDaySchedules((prev) => ({
          ...prev,
          [selectedDay]: data.schedule,
        }));
        setToastMessage(
          `✅ Loaded ${
            sourceType === 'last_week'
              ? `last week's ${DAY_NAMES[selectedDay - 1]} routine`
              : sourceType === 'day'
              ? `${DAY_NAMES[sourceDay - 1]}'s routine`
              : 'standard blueprint'
          }! Tweak any exercises or reps below, then click Save.`
        );
        setTimeout(() => setToastMessage(''), 4500);
      } else {
        alert(data.error || 'Failed to clone routine');
      }
    } catch (err) {
      alert('Error cloning routine: ' + err.message);
    } finally {
      setIsCloning(false);
    }
  };

  const handleDeleteWorkout = (index) => {
    const nextWorkouts = (currentDayData.workouts || []).filter((_, i) => i !== index);
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        workouts: nextWorkouts,
      },
    }));
  };

  const handleMoveWorkout = (index, direction) => {
    const nextWorkouts = [...(currentDayData.workouts || [])];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= nextWorkouts.length) return;
    const temp = nextWorkouts[index];
    nextWorkouts[index] = nextWorkouts[targetIdx];
    nextWorkouts[targetIdx] = temp;
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        workouts: nextWorkouts,
      },
    }));
  };

  // Warm-ups update helpers
  const handleWarmupFieldChange = (index, field, value) => {
    const nextWarmups = [...(currentDayData.warmups || [])];
    nextWarmups[index] = { ...nextWarmups[index], [field]: value };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        warmups: nextWarmups,
      },
    }));
  };

  const handleDeleteWarmup = (index) => {
    const nextWarmups = (currentDayData.warmups || []).filter((_, i) => i !== index);
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        warmups: nextWarmups,
      },
    }));
  };

  const handleAddQuickWarmup = () => {
    const newWarmup = {
      id: `w-${Date.now()}`,
      name: 'Dynamic Arm & Leg Swings',
      target_reps: '2 sets × 15 reps',
      duration_seconds: 120,
      coach_notes: 'Elevate heart rate and mobility.',
      muscles: ['quadriceps', 'front-deltoids'],
    };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        warmups: [...(currentDayData.warmups || []), newWarmup],
      },
    }));
  };

  // Cardio update helpers
  const handleCardioFieldChange = (index, field, value) => {
    const nextCardio = [...(currentDayData.cardio || [])];
    nextCardio[index] = { ...nextCardio[index], [field]: value };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        cardio: nextCardio,
      },
    }));
  };

  const handleDeleteCardio = (index) => {
    const nextCardio = (currentDayData.cardio || []).filter((_, i) => i !== index);
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        cardio: nextCardio,
      },
    }));
  };

  const handleAddQuickCardio = () => {
    const newCardio = {
      id: `c-${Date.now()}`,
      name: '12-3-30 Incline Treadmill Walk',
      duration_minutes: 20,
      target_intensity: 'Zone 2 (120-135 BPM)',
      equipment: 'Treadmill',
      coach_notes: '12% incline, 3.0-3.5 mph speed.',
    };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        cardio: [...(currentDayData.cardio || []), newCardio],
      },
    }));
  };

  // Stretches update helpers
  const handleStretchFieldChange = (index, field, value) => {
    const nextStretches = [...(currentDayData.stretches || [])];
    nextStretches[index] = { ...nextStretches[index], [field]: value };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        stretches: nextStretches,
      },
    }));
  };

  const handleDeleteStretch = (index) => {
    const nextStretches = (currentDayData.stretches || []).filter((_, i) => i !== index);
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        stretches: nextStretches,
      },
    }));
  };

  const handleAddQuickStretch = () => {
    const newStretch = {
      id: `s-${Date.now()}`,
      name: 'Doorway Chest & Shoulder Opener',
      target_duration: '2 sets × 30s',
      coach_notes: 'Breathe deeply and decompress chest cavity.',
      muscles: ['chest', 'front-deltoids'],
    };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        stretches: [...(currentDayData.stretches || []), newStretch],
      },
    }));
  };

  // Standard Exercise Dropdown selection change
  const handleStandardSelect = (e) => {
    const id = e.target.value;
    setSelectedStandardId(id);
    const found = standardExercises.find((ex) => ex.id === id);
    setStandardPreview(found || null);
  };

  // Add standard workout to day
  const handleAddStandardToDay = () => {
    if (!standardPreview) return;
    const newWorkout = {
      id: `ex-${Date.now()}`,
      exercise_name: standardPreview.name,
      target_sets: standardPreview.defaultSets || 3,
      target_reps: standardPreview.defaultReps || '10-12 reps',
      rest_seconds: standardPreview.restSeconds || 60,
      coach_notes: standardPreview.coachNotes || '',
      primary_muscles: standardPreview.primaryMuscles || [],
      secondary_muscles: standardPreview.secondaryMuscles || [],
      imageUrl: standardPreview.imageUrl || '',
    };

    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        workouts: [...(currentDayData.workouts || []), newWorkout],
      },
    }));

    showToast(`Added "${newWorkout.exercise_name}" to ${DAY_NAMES[selectedDay - 1]}`);
  };

  // Web search via Exa (supports workout, cardio, stretch)
  const handleWebSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);
    setSearchCardioResult(null);
    setSearchStretchResult(null);

    try {
      const res = await fetch('/api/exercises/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName: searchQuery.trim(), type: searchType }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.type === 'cardio') {
          setSearchCardioResult(data.cardio);
        } else if (data.type === 'stretch') {
          setSearchStretchResult(data.stretch);
        } else {
          setSearchResult(data.exercise);
        }
      } else {
        setSearchError(data.error || 'Failed to search');
      }
    } catch (err) {
      setSearchError('Error performing web search');
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleSearchMuscle = (muscle, type = 'primary') => {
    if (!searchResult) return;
    const isPrimary = type === 'primary';
    const currentList = isPrimary ? searchResult.primaryMuscles : searchResult.secondaryMuscles;
    const otherList = isPrimary ? searchResult.secondaryMuscles : searchResult.primaryMuscles;

    let updatedCurrent;
    if (currentList.includes(muscle)) {
      updatedCurrent = currentList.filter((m) => m !== muscle);
    } else {
      updatedCurrent = [...currentList, muscle];
    }
    const updatedOther = otherList.filter((m) => m !== muscle);

    setSearchResult({
      ...searchResult,
      primaryMuscles: isPrimary ? updatedCurrent : updatedOther,
      secondaryMuscles: isPrimary ? updatedOther : updatedCurrent,
    });
  };

  const handleAddSearchResultToDay = () => {
    if (!searchResult) return;
    const newWorkout = {
      id: `ex-${Date.now()}`,
      exercise_name: searchResult.name,
      target_sets: searchResult.defaultSets || 3,
      target_reps: searchResult.defaultReps || '10-12 reps',
      rest_seconds: searchResult.restSeconds || 60,
      coach_notes: searchResult.coachNotes || '',
      primary_muscles: searchResult.primaryMuscles || [],
      secondary_muscles: searchResult.secondaryMuscles || [],
      imageUrl: searchResult.imageUrl || '',
    };

    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        workouts: [...(currentDayData.workouts || []), newWorkout],
      },
    }));

    setStandardExercises((prev) => [...prev, searchResult]);
    setSearchResult(null);
    setSearchQuery('');
    showToast(`Added custom "${newWorkout.exercise_name}" to ${DAY_NAMES[selectedDay - 1]}`);
  };

  const handleAddSearchCardioToDay = () => {
    if (!searchCardioResult) return;
    const newCardio = {
      id: `c-${Date.now()}`,
      name: searchCardioResult.name,
      duration_minutes: searchCardioResult.duration_minutes || 20,
      equipment: searchCardioResult.equipment || 'Cardio Station',
      target_intensity: searchCardioResult.target_intensity || 'Zone 2',
      coach_notes: searchCardioResult.coach_notes || '',
    };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        cardio: [...(currentDayData.cardio || []), newCardio],
      },
    }));
    showToast(`Added cardio "${newCardio.name}" to ${DAY_NAMES[selectedDay - 1]}`);
    setSearchCardioResult(null);
    setSearchQuery('');
  };

  const handleAddSearchStretchToDay = () => {
    if (!searchStretchResult) return;
    const newStretch = {
      id: `s-${Date.now()}`,
      name: searchStretchResult.name,
      target_duration: searchStretchResult.target_duration || '60 seconds',
      muscles: searchStretchResult.muscles || ['hamstring', 'upper-back'],
      coach_notes: searchStretchResult.coach_notes || '',
    };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        stretches: [...(currentDayData.stretches || []), newStretch],
      },
    }));
    showToast(`Added stretch "${newStretch.name}" to ${DAY_NAMES[selectedDay - 1]}`);
    setSearchStretchResult(null);
    setSearchQuery('');
  };

  // Direct Custom Workout Addition (No search required)
  const handleAddDirectCustomWorkout = () => {
    if (!customWorkoutForm.name.trim()) {
      alert('Please enter an exercise name.');
      return;
    }
    const newWorkout = {
      id: `ex-custom-${Date.now()}`,
      exercise_name: customWorkoutForm.name.trim(),
      target_sets: customWorkoutForm.target_sets || 3,
      target_reps: customWorkoutForm.target_reps || '10-12 reps',
      rest_seconds: customWorkoutForm.rest_seconds || 60,
      coach_notes: customWorkoutForm.coach_notes || 'Execute with controlled tempo and strict form.',
      primary_muscles: customWorkoutForm.primary_muscles || ['chest'],
      secondary_muscles: customWorkoutForm.secondary_muscles || [],
      imageUrl: customWorkoutForm.imageUrl || '',
    };
    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...currentDayData,
        workouts: [...(currentDayData.workouts || []), newWorkout],
      },
    }));
    showToast(`Added "${newWorkout.exercise_name}" to ${DAY_NAMES[selectedDay - 1]}`);
    setCustomWorkoutForm({
      name: '',
      target_sets: 3,
      target_reps: '10-12 reps',
      rest_seconds: 60,
      coach_notes: '',
      primary_muscles: ['chest'],
      secondary_muscles: [],
      imageUrl: '',
    });
  };

  const handleToggleCustomMuscle = (muscle, type = 'primary') => {
    const isPrimary = type === 'primary';
    const currentList = isPrimary ? customWorkoutForm.primary_muscles : customWorkoutForm.secondary_muscles;
    const otherList = isPrimary ? customWorkoutForm.secondary_muscles : customWorkoutForm.primary_muscles;

    let updatedCurrent;
    if (currentList.includes(muscle)) {
      updatedCurrent = currentList.filter((m) => m !== muscle);
    } else {
      updatedCurrent = [...currentList, muscle];
    }
    const updatedOther = otherList.filter((m) => m !== muscle);

    setCustomWorkoutForm({
      ...customWorkoutForm,
      primary_muscles: isPrimary ? updatedCurrent : updatedOther,
      secondary_muscles: isPrimary ? updatedOther : updatedCurrent,
    });
  };

  // Save current day to backend
  const handleSaveDay = async () => {
    try {
      setIsSaving(true);
      const res = await fetch('/api/routine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentDayData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Saved ${DAY_NAMES[selectedDay - 1]} routine successfully! ✓`);
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (err) {
      alert('Network error saving routine');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  if (authLoading) {
    return (
      <div className="admin-loading-screen">
        <div className="spinner"></div>
        <p>Verifying admin session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`login-backdrop ${theme === 'light' ? 'light-mode' : ''}`}>
        <div className="login-card">
          <div className="login-header-row">
            <div className="login-logo-row">
              <img src="/images/logo.png" alt="FIT MADE GYM" className="login-logo-img" />
              <div className="login-title-col">
                <h2>FIT MADE GYM</h2>
                <span className="login-motto">STAY FIT. BE ON TOP • ESTD 2017</span>
              </div>
            </div>
            <button
              type="button"
              className="login-theme-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
          <p className="login-subtitle">Trainer sign in to update daily workouts, reps, cardio, and stretches.</p>

          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="form-field">
              <label>Username</label>
              <input
                type="text"
                className="admin-input"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="admin"
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                className="admin-input"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && <div className="login-error-alert">{loginError}</div>}

            <button type="submit" className="login-submit-btn">
              Sign In to Admin
            </button>
          </form>

          <div className="default-creds-hint">
            <span>Default setup:</span> <strong>admin</strong> / <strong>gympassword123</strong>
            <p>(You can change this password at any time inside)</p>
          </div>

          <div className="back-to-member-link">
            <Link href="/">← Back to Gym Member Page</Link>
          </div>
        </div>

        <style jsx>{`
          .login-backdrop {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at 50% 20%, #1e293b 0%, #090d16 100%);
            padding: 1rem;
          }
          .login-card {
            background: #111827;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 20px;
            padding: 2.25rem 2rem;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            color: #f8fafc;
          }
          .login-header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.5rem;
          }
          .login-theme-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            font-size: 1rem;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .login-theme-btn:hover {
            transform: scale(1.05);
            background: rgba(255, 255, 255, 0.15);
          }
          .login-logo-row {
            display: flex;
            align-items: center;
            gap: 0.85rem;
          }
          .login-logo-img {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            object-fit: contain;
          }
          .login-title-col {
            display: flex;
            flex-direction: column;
          }
          .login-card h2 {
            margin: 0;
            font-size: 1.4rem;
            font-weight: 800;
            color: #f8fafc;
            letter-spacing: 0.04em;
          }
          .login-motto {
            font-size: 0.65rem;
            font-weight: 700;
            color: #f97316;
            letter-spacing: 0.08em;
          }
          .login-subtitle {
            font-size: 0.85rem;
            color: #94a3b8;
            margin-bottom: 1.5rem;
          }
          .login-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .form-field label {
            display: block;
            font-size: 0.8rem;
            color: #cbd5e1;
            font-weight: 600;
            margin-bottom: 0.35rem;
          }
          .admin-input {
            width: 100%;
            background: #1f2937;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            padding: 0.75rem 1rem;
            color: #ffffff;
            font-size: 0.95rem;
            outline: none;
          }
          .admin-input:focus {
            border-color: #ef4444;
          }
          .login-error-alert {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid #ef4444;
            color: #fca5a5;
            padding: 0.6rem 0.85rem;
            border-radius: 8px;
            font-size: 0.85rem;
          }
          .login-submit-btn {
            background: #ef4444;
            border: none;
            color: #ffffff;
            font-weight: 700;
            padding: 0.85rem;
            border-radius: 10px;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 0.5rem;
            transition: all 0.15s ease;
          }
          .login-submit-btn:hover {
            background: #dc2626;
          }
          .default-creds-hint {
            margin-top: 1.5rem;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 8px;
            padding: 0.65rem 0.85rem;
            font-size: 0.75rem;
            color: #94a3b8;
            text-align: center;
          }
          .default-creds-hint p {
            margin: 0.2rem 0 0 0;
            color: #64748b;
          }
          .back-to-member-link {
            text-align: center;
            margin-top: 1.25rem;
            font-size: 0.85rem;
            color: #60a5fa;
          }

          /* Light Mode Overrides for Login */
          .login-backdrop.light-mode {
            background: radial-gradient(circle at 50% 20%, #f1f5f9 0%, #cbd5e1 100%);
          }
          .login-backdrop.light-mode .login-card {
            background: #ffffff;
            border-color: #e2e8f0;
            color: #0f172a;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
          }
          .login-backdrop.light-mode .login-card h2 {
            color: #0f172a;
          }
          .login-backdrop.light-mode .login-subtitle {
            color: #64748b;
          }
          .login-backdrop.light-mode .form-field label {
            color: #475569;
          }
          .login-backdrop.light-mode .admin-input {
            background: #f8fafc;
            border-color: #cbd5e1;
            color: #0f172a;
          }
          .login-backdrop.light-mode .admin-input:focus {
            background: #ffffff;
            border-color: #ef4444;
          }
          .login-backdrop.light-mode .default-creds-hint {
            background: #f1f5f9;
            color: #475569;
          }
          .login-backdrop.light-mode .login-theme-btn {
            background: #f1f5f9;
            border-color: #cbd5e1;
          }
        `}</style>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className={`admin-page-container ${theme === 'light' ? 'light-mode' : ''}`}>
      {/* Admin Top Navigation */}
      <header className="admin-top-nav">
        <div className="nav-brand-group">
          <img src="/images/logo.png" alt="FIT MADE GYM" className="admin-nav-logo" />
          <div className="nav-title-col">
            <span className="brand-badge-pill">⚙️ ADMIN PORTAL</span>
            <h1 className="nav-title">FIT MADE GYM</h1>
            <span className="nav-motto">STAY FIT. BE ON TOP • ESTD 2017</span>
          </div>
        </div>

        <div className="nav-actions-group">
          <button
            type="button"
            className="nav-btn theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <Link href="/" className="nav-btn member-preview-btn">
            👁️ Member View
          </Link>
          <button className="nav-btn qr-btn" onClick={() => setShowQrModal(true)}>
            📲 QR Poster
          </button>
          <button className="nav-btn password-btn" onClick={() => setShowPasswordModal(true)}>
            🔑 Change Password
          </button>
          <button className="nav-btn logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Floating Save Banner */}
      <div className="save-action-banner">
        <div>
          <strong>Editing: {DAY_NAMES[selectedDay - 1]}</strong>
          <span className="save-sub-text">
            {' '}• {(currentDayData.workouts || []).length} Exercises • {(currentDayData.cardio || []).length} Cardio • {(currentDayData.stretches || []).length} Stretches
          </span>
        </div>
        <button className="btn-save-primary" onClick={handleSaveDay} disabled={isSaving}>
          {isSaving ? 'Saving...' : '💾 Save All Changes for This Day'}
        </button>
      </div>

      {toastMessage && <div className="floating-toast">{toastMessage}</div>}

      {/* Day Tabs */}
      <nav className="day-tabs-container">
        {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
          const isSelected = selectedDay === dayNum;
          const count = (daySchedules[dayNum]?.workouts || []).length;
          return (
            <button
              key={dayNum}
              type="button"
              className={`day-tab ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedDay(dayNum)}
            >
              <span className="tab-day-title">{DAY_NAMES[dayNum - 1]}</span>
              <span className="tab-exercise-badge">{count} exercises</span>
            </button>
          );
        })}
      </nav>

      <main className="admin-editor-layout">
        {/* Left Column: Routine Details */}
        <section className="editor-main-col">
          {/* Base on Existing Workout Bar */}
          <div className="clone-routine-bar">
            <div className="clone-bar-header">
              <div className="clone-title-group">
                <span className="clone-icon">↺</span>
                <div>
                  <h4 className="clone-heading">Base Today on an Existing Routine</h4>
                  <p className="clone-desc">
                    Import last week&apos;s exercises or another day so you only need to update specific movements or reps instead of starting fresh.
                  </p>
                </div>
              </div>

              <div className="clone-actions-group">
                <button
                  type="button"
                  className="btn-clone-action btn-last-week"
                  onClick={() => handleCloneRoutine('last_week')}
                  disabled={isCloning}
                  title={`Load last week's exact routine for ${DAY_NAMES[selectedDay - 1]}`}
                >
                  {isCloning ? 'Loading...' : `📅 Load Last Week (${DAY_NAMES[selectedDay - 1]})`}
                </button>

                <div className="clone-select-wrap">
                  <select
                    className="clone-day-select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleCloneRoutine('day', parseInt(e.target.value, 10));
                    }}
                    disabled={isCloning}
                  >
                    <option value="">📑 Copy from Another Day...</option>
                    {DAY_NAMES.map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        Copy from {name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-clone-action btn-standard"
                  onClick={() => handleCloneRoutine('standard')}
                  disabled={isCloning}
                  title="Reset to default gym blueprint for this day"
                >
                  🌟 Standard Blueprint
                </button>
              </div>
            </div>
          </div>

          {/* Target Focus Banner Edit */}
          <div className="admin-card target-focus-card">
            <label className="field-label">Target Focus / Muscle Group for {DAY_NAMES[selectedDay - 1]}:</label>
            <input
              type="text"
              className="focus-input-large"
              value={currentDayData.target_focus || ''}
              onChange={(e) => handleTargetFocusChange(e.target.value)}
              placeholder="e.g. Chest & Triceps Hypertrophy"
            />
          </div>

          {/* Warm-Up Section */}
          <div className="admin-card">
            <div className="card-header-row">
              <h3>⚡ 1. Warm-Up & Mobility ({currentDayData.warmups?.length || 0})</h3>
              <button type="button" className="btn-add-item" onClick={handleAddQuickWarmup}>
                + Add Warm-Up
              </button>
            </div>

            <div className="items-edit-list">
              {(currentDayData.warmups || []).map((w, idx) => (
                <div key={w.id || idx} className="edit-item-card warmup-edit-item">
                  <div className="edit-item-row">
                    <span className="item-order-pill">W{idx + 1}</span>
                    <input
                      type="text"
                      className="edit-input-title"
                      value={w.name || ''}
                      onChange={(e) => handleWarmupFieldChange(idx, 'name', e.target.value)}
                      placeholder="Warm-up Name"
                    />
                    <input
                      type="text"
                      className="edit-input-reps"
                      value={w.target_reps || ''}
                      onChange={(e) => handleWarmupFieldChange(idx, 'target_reps', e.target.value)}
                      placeholder="e.g. 2 sets × 15 reps"
                    />
                    <button
                      type="button"
                      className="btn-delete-item"
                      onClick={() => handleDeleteWarmup(idx)}
                      title="Delete Warm-Up"
                    >
                      🗑️
                    </button>
                  </div>
                  <input
                    type="text"
                    className="edit-input-notes"
                    value={w.coach_notes || ''}
                    onChange={(e) => handleWarmupFieldChange(idx, 'coach_notes', e.target.value)}
                    placeholder="Coach instructions or mobility cue"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Workouts Section */}
          <div className="admin-card">
            <div className="card-header-row">
              <h3>🏋️ 2. Scheduled Workouts ({currentDayData.workouts?.length || 0})</h3>
              <span className="card-header-hint">Adjust sets, reps, form cues, and illustration image below</span>
            </div>

            <div className="items-edit-list">
              {(currentDayData.workouts || []).map((ex, idx) => (
                <div key={ex.id || idx} className="edit-item-card workout-edit-item">
                  <div className="workout-header-bar">
                    <div className="workout-title-area">
                      <span className="workout-num-pill">#{idx + 1}</span>
                      <input
                        type="text"
                        className="workout-name-input"
                        value={ex.exercise_name || ''}
                        onChange={(e) => handleWorkoutFieldChange(idx, 'exercise_name', e.target.value)}
                        placeholder="Exercise Name"
                      />
                    </div>
                    <div className="reorder-group">
                      <button
                        type="button"
                        className="btn-order"
                        onClick={() => handleMoveWorkout(idx, -1)}
                        disabled={idx === 0}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn-order"
                        onClick={() => handleMoveWorkout(idx, 1)}
                        disabled={idx === (currentDayData.workouts?.length || 0) - 1}
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="btn-delete-item"
                        onClick={() => handleDeleteWorkout(idx)}
                        title="Delete Exercise"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="workout-numbers-grid">
                    <div className="grid-cell">
                      <label>Target Sets:</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="admin-input-sm"
                        value={ex.target_sets || 3}
                        onChange={(e) => handleWorkoutFieldChange(idx, 'target_sets', parseInt(e.target.value) || 3)}
                      />
                    </div>
                    <div className="grid-cell">
                      <label>Target Reps:</label>
                      <input
                        type="text"
                        className="admin-input-sm"
                        value={ex.target_reps || ''}
                        onChange={(e) => handleWorkoutFieldChange(idx, 'target_reps', e.target.value)}
                        placeholder="e.g. 8-10 reps"
                      />
                    </div>
                    <div className="grid-cell">
                      <label>Rest (Seconds):</label>
                      <input
                        type="number"
                        min="0"
                        step="15"
                        className="admin-input-sm"
                        value={ex.rest_seconds || 60}
                        onChange={(e) => handleWorkoutFieldChange(idx, 'rest_seconds', parseInt(e.target.value) || 60)}
                      />
                    </div>
                  </div>

                  <div className="workout-field-row">
                    <label>Action Diagram / Illustration Image URL:</label>
                    <input
                      type="text"
                      className="admin-input-sm"
                      value={ex.imageUrl || ''}
                      onChange={(e) => handleWorkoutFieldChange(idx, 'imageUrl', e.target.value)}
                      placeholder="e.g. /images/exercises/lat-pulldown.png or https://..."
                    />
                  </div>

                  <div className="workout-notes-row">
                    <label>Form Cues & Coach Notes:</label>
                    <textarea
                      rows="2"
                      className="admin-textarea"
                      value={ex.coach_notes || ''}
                      onChange={(e) => handleWorkoutFieldChange(idx, 'coach_notes', e.target.value)}
                      placeholder="Tips on tempo, breathing, and joint alignment..."
                    />
                  </div>

                  {/* Muscle Infographic Preview */}
                  <div className="workout-mini-infographic">
                    <HumanBodyInfographic
                      primaryMuscles={ex.primary_muscles || []}
                      secondaryMuscles={ex.secondary_muscles || []}
                      imageUrl={ex.imageUrl}
                      compact={true}
                      showToggle={false}
                      theme={theme}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Cardio Finisher */}
          <div className="admin-card">
            <div className="card-header-row">
              <h3>🏃 3. Cardio & Conditioning ({currentDayData.cardio?.length || 0})</h3>
              <div className="card-header-actions">
                <button
                  type="button"
                  className="btn-add-item btn-search-badge"
                  onClick={() => {
                    setAddMode('webSearch');
                    setSearchType('cardio');
                    setSearchQuery('');
                  }}
                  title="Search web via Exa for cardio conditioning drills"
                >
                  🔍 Search Cardio (Exa)
                </button>
                <button type="button" className="btn-add-item" onClick={handleAddQuickCardio}>
                  + Add Cardio
                </button>
              </div>
            </div>

            <div className="items-edit-list">
              {(currentDayData.cardio || []).map((c, idx) => (
                <div key={c.id || idx} className="edit-item-card cardio-edit-item">
                  <div className="edit-item-row">
                    <span className="item-order-pill">C{idx + 1}</span>
                    <input
                      type="text"
                      className="edit-input-title"
                      value={c.name || ''}
                      onChange={(e) => handleCardioFieldChange(idx, 'name', e.target.value)}
                      placeholder="Cardio Routine (e.g. Incline Treadmill Walk)"
                    />
                    <input
                      type="number"
                      className="edit-input-duration"
                      value={c.duration_minutes || 15}
                      onChange={(e) => handleCardioFieldChange(idx, 'duration_minutes', parseInt(e.target.value) || 15)}
                      placeholder="Mins"
                    />
                    <span className="min-label">min</span>
                    <button
                      type="button"
                      className="btn-delete-item"
                      onClick={() => handleDeleteCardio(idx)}
                      title="Delete Cardio"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="cardio-sub-row">
                    <input
                      type="text"
                      className="edit-input-notes"
                      value={c.equipment || ''}
                      onChange={(e) => handleCardioFieldChange(idx, 'equipment', e.target.value)}
                      placeholder="Equipment (e.g. Treadmill, StairMaster)"
                    />
                    <input
                      type="text"
                      className="edit-input-notes"
                      value={c.target_intensity || ''}
                      onChange={(e) => handleCardioFieldChange(idx, 'target_intensity', e.target.value)}
                      placeholder="Target Intensity (e.g. Zone 2 - 130 BPM)"
                    />
                  </div>
                  <input
                    type="text"
                    className="edit-input-notes mt-2"
                    value={c.coach_notes || ''}
                    onChange={(e) => handleCardioFieldChange(idx, 'coach_notes', e.target.value)}
                    placeholder="Coach guidance (e.g. Incline 12%, Speed 3.2 mph)"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Stretches & Cool-Down */}
          <div className="admin-card">
            <div className="card-header-row">
              <h3>🧘 4. Post-Workout Stretches ({currentDayData.stretches?.length || 0})</h3>
              <div className="card-header-actions">
                <button
                  type="button"
                  className="btn-add-item btn-search-badge"
                  onClick={() => {
                    setAddMode('webSearch');
                    setSearchType('stretch');
                    setSearchQuery('');
                  }}
                  title="Search web via Exa for stretches and mobility routines"
                >
                  🔍 Search Stretches (Exa)
                </button>
                <button type="button" className="btn-add-item" onClick={handleAddQuickStretch}>
                  + Add Stretch
                </button>
              </div>
            </div>

            <div className="items-edit-list">
              {(currentDayData.stretches || []).map((s, idx) => (
                <div key={s.id || idx} className="edit-item-card stretch-edit-item">
                  <div className="edit-item-row">
                    <span className="item-order-pill">S{idx + 1}</span>
                    <input
                      type="text"
                      className="edit-input-title"
                      value={s.name || ''}
                      onChange={(e) => handleStretchFieldChange(idx, 'name', e.target.value)}
                      placeholder="Stretch Name (e.g. Doorway Chest Stretch)"
                    />
                    <input
                      type="text"
                      className="edit-input-reps"
                      value={s.target_duration || ''}
                      onChange={(e) => handleStretchFieldChange(idx, 'target_duration', e.target.value)}
                      placeholder="e.g. 2 sets × 30s"
                    />
                    <button
                      type="button"
                      className="btn-delete-item"
                      onClick={() => handleDeleteStretch(idx)}
                      title="Delete Stretch"
                    >
                      🗑️
                    </button>
                  </div>
                  <input
                    type="text"
                    className="edit-input-notes"
                    value={s.coach_notes || ''}
                    onChange={(e) => handleStretchFieldChange(idx, 'coach_notes', e.target.value)}
                    placeholder="Mobility instructions and breathing cues"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Add Workout Panel & Gym QR Stand */}
        <aside className="editor-sidebar-col">
          {/* Permanent Gym Floor QR Code Card */}
          <div className="admin-card gym-qr-dashboard-card">
            <div className="qr-card-header">
              <span className="qr-card-icon">📱</span>
              <div>
                <h3 className="sidebar-title">Gym Floor QR Code</h3>
                <p className="qr-card-subtitle">Permanent wall scan for daily training</p>
              </div>
            </div>

            <div className="qr-dashboard-preview">
              <div
                className="qr-dashboard-svg-wrap"
                dangerouslySetInnerHTML={{
                  __html: renderQrSvg(gymOrigin || 'https://fitmadegym.com', {
                    size: 130,
                    margin: 1,
                    darkColor: '#0f172a',
                    lightColor: '#ffffff',
                  }),
                }}
              />
              <div className="qr-dashboard-info">
                <span className="qr-live-pill">● Scan Active</span>
                <p className="qr-url-text">{gymOrigin || 'http://localhost:3000'}</p>
                <div className="qr-quick-actions">
                  <button
                    type="button"
                    className="qr-mini-btn"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(gymOrigin);
                        setToastMessage('Link copied to clipboard!');
                        setTimeout(() => setToastMessage(''), 2500);
                      }
                    }}
                  >
                    📋 Copy Link
                  </button>
                  <button
                    type="button"
                    className="qr-mini-btn btn-print"
                    onClick={() => setShowQrModal(true)}
                  >
                    🖨️ Poster
                  </button>
                </div>
              </div>
            </div>
            <p className="qr-admin-tip">
              💡 Members scan this single QR code to view today&apos;s workout. Automatically updates every midnight.
            </p>
          </div>

          <div className="admin-card add-workout-panel">
            <h3 className="sidebar-title">➕ Add to Today&apos;s Protocol</h3>

            {/* Mode Switcher */}
            <div className="add-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${addMode === 'standard' ? 'active' : ''}`}
                onClick={() => setAddMode('standard')}
              >
                Standard
              </button>
              <button
                type="button"
                className={`mode-btn ${addMode === 'custom' ? 'active' : ''}`}
                onClick={() => setAddMode('custom')}
              >
                ✏️ Custom
              </button>
              <button
                type="button"
                className={`mode-btn ${addMode === 'webSearch' ? 'active' : ''}`}
                onClick={() => setAddMode('webSearch')}
              >
                🌐 Web Search
              </button>
            </div>

            {/* Mode 1: Standard Dropdown */}
            {addMode === 'standard' && (
              <div className="standard-dropdown-panel">
                <label className="field-label">Select Standard Exercise:</label>
                <select
                  className="admin-select"
                  value={selectedStandardId}
                  onChange={handleStandardSelect}
                >
                  {Object.entries(groupedExercises).map(([category, items]) => (
                    <optgroup key={category} label={`── ${category.toUpperCase()} ──`}>
                      {items.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {standardPreview && (
                  <div className="standard-preview-box">
                    <div className="preview-meta">
                      <strong>{standardPreview.name}</strong>
                      <span className="preview-cat-badge">{standardPreview.category}</span>
                    </div>
                    <p className="preview-notes">{standardPreview.coachNotes}</p>

                    <div className="preview-infographic-holder">
                      <HumanBodyInfographic
                        primaryMuscles={standardPreview.primaryMuscles || []}
                        secondaryMuscles={standardPreview.secondaryMuscles || []}
                        imageUrl={standardPreview.imageUrl}
                        compact={true}
                        showToggle={false}
                        theme={theme}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-add-to-day"
                      onClick={handleAddStandardToDay}
                    >
                      + Add to {DAY_NAMES[selectedDay - 1]}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Direct Custom Exercise (No search required) */}
            {addMode === 'custom' && (
              <div className="custom-direct-panel">
                <p className="search-instruction">
                  Type any exercise name directly without searching. Perfect for unique gym variations or specialty equipment.
                </p>

                <div className="field-group mb-2">
                  <label className="field-label">Exercise Name *:</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={customWorkoutForm.name}
                    onChange={(e) => setCustomWorkoutForm({ ...customWorkoutForm, name: e.target.value })}
                    placeholder="e.g. Landmine Hack Squat, Ring Dips..."
                    required
                  />
                </div>

                <div className="custom-input-grid mb-2">
                  <div className="grid-cell">
                    <label className="field-label">Target Sets:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="admin-input-sm"
                      value={customWorkoutForm.target_sets}
                      onChange={(e) => setCustomWorkoutForm({ ...customWorkoutForm, target_sets: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  <div className="grid-cell">
                    <label className="field-label">Target Reps:</label>
                    <input
                      type="text"
                      className="admin-input-sm"
                      value={customWorkoutForm.target_reps}
                      onChange={(e) => setCustomWorkoutForm({ ...customWorkoutForm, target_reps: e.target.value })}
                      placeholder="e.g. 8-10 reps"
                    />
                  </div>
                  <div className="grid-cell">
                    <label className="field-label">Rest (sec):</label>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      className="admin-input-sm"
                      value={customWorkoutForm.rest_seconds}
                      onChange={(e) => setCustomWorkoutForm({ ...customWorkoutForm, rest_seconds: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                </div>

                <div className="field-group mb-2">
                  <label className="field-label">Form Cues / Coach Notes:</label>
                  <textarea
                    rows="2"
                    className="admin-textarea"
                    value={customWorkoutForm.coach_notes}
                    onChange={(e) => setCustomWorkoutForm({ ...customWorkoutForm, coach_notes: e.target.value })}
                    placeholder="Execution tips, tempo, range of motion cues..."
                  />
                </div>

                <div className="field-group mb-2">
                  <label className="field-label">Optional Image / Diagram URL:</label>
                  <input
                    type="text"
                    className="admin-input-sm"
                    value={customWorkoutForm.imageUrl}
                    onChange={(e) => setCustomWorkoutForm({ ...customWorkoutForm, imageUrl: e.target.value })}
                    placeholder="https://... or /images/exercises/..."
                  />
                </div>

                {/* Target Muscle Selector */}
                <div className="muscle-customizer mb-2">
                  <span className="customizer-label">Tap to select targeted muscles:</span>
                  <div className="muscle-toggle-chips">
                    {ALL_MUSCLE_KEYS.slice(0, 16).map((m) => {
                      const isPrimary = customWorkoutForm.primary_muscles?.includes(m);
                      const isSecondary = customWorkoutForm.secondary_muscles?.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`muscle-tag-chip ${isPrimary ? 'primary-active' : isSecondary ? 'secondary-active' : ''}`}
                          onClick={() => handleToggleCustomMuscle(m, isPrimary ? 'secondary' : 'primary')}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Infographic preview */}
                <div className="search-infographic-preview mb-2">
                  <HumanBodyInfographic
                    primaryMuscles={customWorkoutForm.primary_muscles}
                    secondaryMuscles={customWorkoutForm.secondary_muscles}
                    imageUrl={customWorkoutForm.imageUrl}
                    compact={true}
                    showToggle={false}
                    theme={theme}
                  />
                </div>

                <button
                  type="button"
                  className="btn-add-to-day"
                  onClick={handleAddDirectCustomWorkout}
                >
                  ➕ Add to {DAY_NAMES[selectedDay - 1]} Directly
                </button>
              </div>
            )}

            {/* Mode 3: Web Search for Workouts, Cardio & Stretches (Exa) */}
            {addMode === 'webSearch' && (
              <div className="web-search-panel">
                <div className="search-type-pills mb-2">
                  <button
                    type="button"
                    className={`search-type-pill ${searchType === 'workout' ? 'active' : ''}`}
                    onClick={() => { setSearchType('workout'); setSearchResult(null); setSearchCardioResult(null); setSearchStretchResult(null); }}
                  >
                    🏋️ Workouts
                  </button>
                  <button
                    type="button"
                    className={`search-type-pill ${searchType === 'cardio' ? 'active' : ''}`}
                    onClick={() => { setSearchType('cardio'); setSearchResult(null); setSearchCardioResult(null); setSearchStretchResult(null); }}
                  >
                    🏃 Cardio
                  </button>
                  <button
                    type="button"
                    className={`search-type-pill ${searchType === 'stretch' ? 'active' : ''}`}
                    onClick={() => { setSearchType('stretch'); setSearchResult(null); setSearchCardioResult(null); setSearchStretchResult(null); }}
                  >
                    🧘 Stretches
                  </button>
                </div>

                <p className="search-instruction">
                  {searchType === 'workout' && 'Search web via Exa for any lift or exercise. Automatically extracts biomechanics and active muscles.'}
                  {searchType === 'cardio' && 'Search web via Exa for conditioning drills (e.g. Assault Bike HIIT, 12-3-30 Treadmill, Sled Push).'}
                  {searchType === 'stretch' && 'Search web via Exa for mobility and stretches (e.g. Couch Stretch, Pigeon Pose, 90/90 Hip Flow).'}
                </p>

                <form onSubmit={handleWebSearch} className="search-form">
                  <input
                    type="text"
                    className="admin-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchType === 'workout'
                        ? 'e.g. Single-Arm Lat Pulldown, Sissy Squat...'
                        : searchType === 'cardio'
                        ? 'e.g. Assault Bike Sprint Intervals, Rowing Tabata...'
                        : 'e.g. Couch Stretch, Pigeon Pose, World Greatest Stretch...'
                    }
                    required
                  />
                  <button type="submit" className="btn-search" disabled={isSearching}>
                    {isSearching ? 'Searching Exa...' : `🔍 Search ${searchType.charAt(0).toUpperCase() + searchType.slice(1)}`}
                  </button>
                </form>

                {searchError && <div className="search-error-msg">{searchError}</div>}

                {/* Workout Result */}
                {searchType === 'workout' && searchResult && (
                  <div className="search-result-card">
                    <div className="result-header">
                      <h4>{searchResult.name}</h4>
                      <span className="source-tag">Source: {searchResult.source}</span>
                    </div>

                    <p className="result-notes">{searchResult.coachNotes}</p>

                    <div className="field-group mb-2">
                      <label className="field-label">Illustration / Diagram Image URL:</label>
                      <input
                        type="text"
                        className="admin-input-sm"
                        value={searchResult.imageUrl || ''}
                        onChange={(e) => setSearchResult({ ...searchResult, imageUrl: e.target.value })}
                        placeholder="https://... or /images/exercises/..."
                      />
                    </div>

                    {/* Muscle Toggle Pills */}
                    <div className="muscle-customizer">
                      <span className="customizer-label">Toggle active muscles:</span>
                      <div className="muscle-toggle-chips">
                        {ALL_MUSCLE_KEYS.slice(0, 16).map((m) => {
                          const isPrimary = searchResult.primaryMuscles?.includes(m);
                          const isSecondary = searchResult.secondaryMuscles?.includes(m);
                          return (
                            <button
                              key={m}
                              type="button"
                              className={`muscle-tag-chip ${isPrimary ? 'primary-active' : isSecondary ? 'secondary-active' : ''}`}
                              onClick={() => handleToggleSearchMuscle(m, isPrimary ? 'secondary' : 'primary')}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live Infographic Preview */}
                    <div className="search-infographic-preview">
                      <HumanBodyInfographic
                        primaryMuscles={searchResult.primaryMuscles || []}
                        secondaryMuscles={searchResult.secondaryMuscles || []}
                        imageUrl={searchResult.imageUrl}
                        compact={true}
                        showToggle={false}
                        theme={theme}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-add-to-day"
                      onClick={handleAddSearchResultToDay}
                    >
                      ✓ Add Custom Exercise to Routine
                    </button>
                  </div>
                )}

                {/* Cardio Result */}
                {searchType === 'cardio' && searchCardioResult && (
                  <div className="search-result-card">
                    <div className="result-header">
                      <h4>🏃 {searchCardioResult.name}</h4>
                      <span className="source-tag">Source: {searchCardioResult.source}</span>
                    </div>

                    <div className="cardio-result-meta mb-2">
                      <div><strong>Equipment:</strong> {searchCardioResult.equipment}</div>
                      <div><strong>Duration:</strong> {searchCardioResult.duration_minutes} minutes</div>
                      <div><strong>Intensity:</strong> {searchCardioResult.target_intensity}</div>
                    </div>

                    <p className="result-notes">{searchCardioResult.coach_notes}</p>

                    <button
                      type="button"
                      className="btn-add-to-day"
                      onClick={handleAddSearchCardioToDay}
                    >
                      ✓ Add Cardio to {DAY_NAMES[selectedDay - 1]}
                    </button>
                  </div>
                )}

                {/* Stretch Result */}
                {searchType === 'stretch' && searchStretchResult && (
                  <div className="search-result-card">
                    <div className="result-header">
                      <h4>🧘 {searchStretchResult.name}</h4>
                      <span className="source-tag">Source: {searchStretchResult.source}</span>
                    </div>

                    <div className="cardio-result-meta mb-2">
                      <div><strong>Target Duration:</strong> {searchStretchResult.target_duration}</div>
                      <div><strong>Muscles:</strong> {(searchStretchResult.muscles || []).join(', ')}</div>
                    </div>

                    <p className="result-notes">{searchStretchResult.coach_notes}</p>

                    <button
                      type="button"
                      className="btn-add-to-day"
                      onClick={handleAddSearchStretchToDay}
                    >
                      ✓ Add Stretch to {DAY_NAMES[selectedDay - 1]}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-backdrop" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Change Admin Password</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="field-group">
                <label>Current Password:</label>
                <input
                  type="password"
                  className="admin-input"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <label>New Password:</label>
                <input
                  type="password"
                  className="admin-input"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Min 4 characters"
                  required
                />
              </div>

              <div className="field-group">
                <label>Confirm New Password:</label>
                <input
                  type="password"
                  className="admin-input"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </div>

              {passwordMsg.text && (
                <div className={`password-msg ${passwordMsg.type}`}>{passwordMsg.text}</div>
              )}

              <button type="submit" className="btn-save-password">
                Save New Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Poster Modal */}
      <GymQrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />

      <style jsx>{`
        .admin-page-container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 1.5rem 1rem 5rem 1rem;
          color: #f8fafc;
        }

        .admin-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-wrap: wrap;
          gap: 1rem;
        }

        .nav-brand-group {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .admin-nav-logo {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: contain;
        }

        .nav-title-col {
          display: flex;
          flex-direction: column;
        }

        .brand-badge-pill {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          background: #ef4444;
          color: #ffffff;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          display: inline-block;
          margin-bottom: 0.2rem;
          width: fit-content;
        }

        .nav-title {
          font-size: 1.4rem;
          font-weight: 800;
          margin: 0;
          line-height: 1.1;
        }

        .nav-motto {
          font-size: 0.65rem;
          font-weight: 700;
          color: #f97316;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .nav-actions-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .nav-btn {
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: #1e293b;
          color: #f8fafc;
          transition: all 0.15s ease;
        }

        .nav-btn:hover {
          background: #334155;
        }

        .member-preview-btn {
          background: #2563eb;
          border-color: #3b82f6;
        }

        .member-preview-btn:hover {
          background: #1d4ed8;
        }

        .qr-btn {
          background: #059669;
          border-color: #10b981;
        }

        .save-action-banner {
          position: sticky;
          top: 1rem;
          z-index: 100;
          background: #1e1b4b;
          border: 2px solid #6366f1;
          border-radius: 14px;
          padding: 0.85rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .save-sub-text {
          font-size: 0.85rem;
          color: #c7d2fe;
        }

        .btn-save-primary {
          background: #10b981;
          color: #ffffff;
          font-weight: 700;
          border: none;
          padding: 0.65rem 1.25rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.15s ease;
        }

        .btn-save-primary:hover {
          background: #059669;
        }

        .floating-toast {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: #059669;
          color: #ffffff;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
          z-index: 9999;
          animation: slideUp 0.2s ease;
        }

        .day-tabs-container {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .day-tab {
          flex: 1;
          min-width: 120px;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 0.75rem 0.5rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          transition: all 0.15s ease;
        }

        .day-tab:hover {
          background: #1f2937;
        }

        .day-tab.active {
          background: #ef4444;
          border-color: #ef4444;
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.35);
        }

        .tab-day-title {
          font-size: 0.95rem;
          font-weight: 700;
        }

        .tab-exercise-badge {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .admin-editor-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .admin-editor-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Clone & Template Action Bar */
        .clone-routine-bar {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 16px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.25rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
        }

        .clone-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .clone-title-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          max-width: 520px;
        }

        .clone-icon {
          font-size: 1.5rem;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.15);
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .clone-heading {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: #f8fafc;
        }

        .clone-desc {
          margin: 0.2rem 0 0 0;
          font-size: 0.75rem;
          color: #94a3b8;
          line-height: 1.3;
        }

        .clone-actions-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-clone-action {
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .btn-last-week {
          background: #1e3a8a;
          border-color: #3b82f6;
          color: #bfdbfe;
        }

        .btn-last-week:hover:not(:disabled) {
          background: #2563eb;
          color: #ffffff;
        }

        .clone-select-wrap {
          position: relative;
        }

        .clone-day-select {
          background: #1f2937;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #cbd5e1;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.45rem 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          outline: none;
        }

        .clone-day-select:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.3);
        }

        .btn-standard {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
        }

        .btn-standard:hover:not(:disabled) {
          background: #334155;
          color: #ffffff;
        }

        .btn-clone-action:disabled, .clone-day-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .admin-card {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }

        .field-label {
          display: block;
          font-size: 0.85rem;
          color: #94a3b8;
          font-weight: 600;
          margin-bottom: 0.4rem;
        }

        .focus-input-large {
          width: 100%;
          background: #1f2937;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 1.2rem;
          font-weight: 700;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          outline: none;
        }

        .focus-input-large:focus {
          border-color: #ef4444;
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .card-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-search-badge {
          background: rgba(59, 130, 246, 0.15) !important;
          border-color: rgba(59, 130, 246, 0.35) !important;
          color: #93c5fd !important;
          transition: all 0.15s ease;
        }

        .btn-search-badge:hover {
          background: #2563eb !important;
          color: #ffffff !important;
        }

        .card-header-row h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .card-header-hint {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .btn-add-item {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #38bdf8;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          cursor: pointer;
        }

        .items-edit-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .edit-item-card {
          background: #1f2937;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 0.85rem;
        }

        .edit-item-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.4rem;
        }

        .item-order-pill {
          background: #374151;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }

        .edit-input-title {
          flex: 2;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 0.45rem 0.65rem;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .edit-input-reps, .edit-input-duration {
          flex: 1;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #38bdf8;
          padding: 0.45rem 0.65rem;
          border-radius: 6px;
          font-size: 0.85rem;
        }

        .edit-input-notes {
          width: 100%;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          padding: 0.4rem 0.65rem;
          border-radius: 6px;
          font-size: 0.8rem;
        }

        .cardio-sub-row {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.35rem;
        }

        .min-label {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .btn-delete-item {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 0.2rem 0.4rem;
          opacity: 0.7;
          transition: opacity 0.15s ease;
        }

        .btn-delete-item:hover {
          opacity: 1;
        }

        .workout-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .workout-title-area {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .workout-num-pill {
          background: #ef4444;
          color: #ffffff;
          font-weight: 800;
          font-size: 0.8rem;
          padding: 0.25rem 0.55rem;
          border-radius: 6px;
        }

        .workout-name-input {
          flex: 1;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-weight: 700;
          font-size: 1rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
        }

        .reorder-group {
          display: flex;
          gap: 0.25rem;
        }

        .btn-order {
          background: #374151;
          border: none;
          color: #cbd5e1;
          font-size: 0.75rem;
          padding: 0.35rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-order:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .workout-numbers-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.65rem;
          margin-bottom: 0.65rem;
        }

        .grid-cell label, .workout-field-row label {
          display: block;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 0.2rem;
        }

        .workout-field-row {
          margin-bottom: 0.65rem;
        }

        .admin-input-sm {
          width: 100%;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 0.4rem 0.5rem;
          border-radius: 6px;
          font-size: 0.85rem;
        }

        .workout-notes-row label {
          display: block;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 0.2rem;
        }

        .admin-textarea {
          width: 100%;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 0.5rem 0.65rem;
          border-radius: 6px;
          font-size: 0.85rem;
          resize: vertical;
        }

        .workout-mini-infographic {
          margin-top: 0.75rem;
        }

        /* Gym Floor QR Dashboard Card */
        .gym-qr-dashboard-card {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(249, 115, 22, 0.3);
          border-radius: 16px;
          padding: 1.15rem;
          margin-bottom: 1.25rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        }

        .qr-card-header {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 0.85rem;
        }

        .qr-card-icon {
          font-size: 1.4rem;
        }

        .qr-card-subtitle {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0;
        }

        .qr-dashboard-preview {
          display: flex;
          gap: 0.85rem;
          align-items: center;
          background: rgba(0, 0, 0, 0.3);
          padding: 0.75rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 0.75rem;
        }

        .qr-dashboard-svg-wrap {
          background: #ffffff;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .qr-dashboard-info {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
          flex: 1;
        }

        .qr-live-pill {
          font-size: 0.65rem;
          font-weight: 700;
          color: #10b981;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .qr-url-text {
          font-size: 0.75rem;
          color: #cbd5e1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: monospace;
          margin: 0;
        }

        .qr-quick-actions {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .qr-mini-btn {
          background: #334155;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          padding: 0.3rem 0.55rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .qr-mini-btn:hover {
          background: #475569;
        }

        .qr-mini-btn.btn-print {
          background: #ea580c;
          border-color: #f97316;
        }

        .qr-mini-btn.btn-print:hover {
          background: #c2410c;
        }

        .qr-admin-tip {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.35;
        }

        /* Add Workout Sidebar Panel */
        .sidebar-title {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .add-mode-toggle {
          display: flex;
          background: #1f2937;
          padding: 0.25rem;
          border-radius: 10px;
          margin-bottom: 1.25rem;
        }

        .mode-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .mode-btn.active {
          background: #ef4444;
          color: #ffffff;
        }

        .admin-select {
          width: 100%;
          background: #1f2937;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 0.65rem;
          border-radius: 8px;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .standard-preview-box, .search-result-card {
          background: #1f2937;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem;
          margin-top: 0.75rem;
        }

        .preview-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .preview-cat-badge {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }

        .preview-notes, .result-notes {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 0.85rem;
          line-height: 1.4;
        }

        .preview-infographic-holder, .search-infographic-preview {
          margin-bottom: 1rem;
        }

        .btn-add-to-day {
          width: 100%;
          background: #10b981;
          color: #ffffff;
          font-weight: 700;
          border: none;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.15s ease;
        }

        .btn-add-to-day:hover {
          background: #059669;
        }

        .custom-direct-panel {
          margin-top: 0.5rem;
        }

        .custom-input-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .search-type-pills {
          display: flex;
          background: #111827;
          border-radius: 8px;
          padding: 0.2rem;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }

        .search-type-pill {
          flex: 1;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.25rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
        }

        .search-type-pill.active {
          background: #3b82f6;
          color: #ffffff;
        }

        .cardio-result-meta {
          background: rgba(0, 0, 0, 0.25);
          padding: 0.6rem;
          border-radius: 8px;
          font-size: 0.8rem;
          color: #cbd5e1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          line-height: 1.4;
        }

        .search-instruction {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 0.85rem;
          line-height: 1.4;
        }

        .search-form {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          margin-bottom: 1rem;
        }

        .btn-search {
          background: #ef4444;
          color: #ffffff;
          font-weight: 600;
          border: none;
          padding: 0.65rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
        }

        .search-error-msg {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
          margin-bottom: 0.85rem;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .result-header h4 {
          margin: 0;
          font-size: 1rem;
        }

        .source-tag {
          font-size: 0.7rem;
          color: #64748b;
        }

        .muscle-customizer {
          margin-bottom: 0.85rem;
        }

        .customizer-label {
          display: block;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 0.35rem;
        }

        .muscle-toggle-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
        }

        .muscle-tag-chip {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #94a3b8;
          font-size: 0.7rem;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          cursor: pointer;
        }

        .muscle-tag-chip.primary-active {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
        }

        .muscle-tag-chip.secondary-active {
          background: #f59e0b;
          color: #ffffff;
          border-color: #f59e0b;
        }

        /* Modal Styles */
        .modal-backdrop {
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

        .modal-card {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 18px;
          max-width: 420px;
          width: 100%;
          padding: 1.75rem;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .modal-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 1.1rem;
          cursor: pointer;
        }

        .password-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .field-group label {
          display: block;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 0.35rem;
        }

        .password-msg {
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
        }

        .password-msg.error {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }

        .password-msg.success {
          background: rgba(16, 185, 129, 0.15);
          color: #6ee7b7;
        }

        .btn-save-password {
          background: #ef4444;
          color: #ffffff;
          font-weight: 700;
          border: none;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 0.5rem;
        }

        .admin-loading-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .mt-2 {
          margin-top: 0.5rem;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Light Mode Specific Overrides for Admin Dashboard */
        .admin-page-container.light-mode {
          color: #0f172a;
        }

        .admin-page-container.light-mode .admin-top-nav {
          border-bottom-color: #e2e8f0;
        }

        .admin-page-container.light-mode .nav-title {
          color: #0f172a;
        }

        .admin-page-container.light-mode .nav-btn {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #334155;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .admin-page-container.light-mode .nav-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .admin-page-container.light-mode .member-preview-btn {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
        }

        .admin-page-container.light-mode .member-preview-btn:hover {
          background: #dbeafe;
        }

        .admin-page-container.light-mode .qr-btn {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #047857;
        }

        .admin-page-container.light-mode .qr-btn:hover {
          background: #d1fae5;
        }

        .admin-page-container.light-mode .save-action-banner {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        }

        .admin-page-container.light-mode .save-sub-text {
          color: #64748b;
        }

        .admin-page-container.light-mode .day-tab {
          background: #ffffff;
          border-color: #e2e8f0;
          color: #334155;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .admin-page-container.light-mode .day-tab:hover {
          background: #f8fafc;
        }

        .admin-page-container.light-mode .day-tab.active {
          background: #ef4444;
          border-color: #ef4444;
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }

        .admin-page-container.light-mode .clone-routine-bar {
          background: #ffffff;
          border-color: #e2e8f0;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }

        .admin-page-container.light-mode .clone-heading {
          color: #0f172a;
        }

        .admin-page-container.light-mode .clone-desc {
          color: #64748b;
        }

        .admin-page-container.light-mode .clone-day-select {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #334155;
        }

        .admin-page-container.light-mode .btn-standard {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #334155;
        }

        .admin-page-container.light-mode .btn-standard:hover:not(:disabled) {
          background: #e2e8f0;
          color: #0f172a;
        }

        .admin-page-container.light-mode .admin-card {
          background: #ffffff;
          border-color: #e2e8f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .admin-page-container.light-mode .field-label {
          color: #475569;
        }

        .admin-page-container.light-mode .focus-input-large {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .admin-page-container.light-mode .focus-input-large:focus {
          background: #ffffff;
          border-color: #ef4444;
        }

        .admin-page-container.light-mode .card-header-row h3 {
          color: #0f172a;
        }

        .admin-page-container.light-mode .card-header-hint {
          color: #64748b;
        }

        .admin-page-container.light-mode .btn-add-item {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #0284c7;
        }

        .admin-page-container.light-mode .btn-add-item:hover {
          background: #e2e8f0;
        }

        .admin-page-container.light-mode .edit-item-card {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .admin-page-container.light-mode .item-order-pill {
          background: #e2e8f0;
          color: #475569;
        }

        .admin-page-container.light-mode .edit-input-title,
        .admin-page-container.light-mode .workout-name-input {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .admin-page-container.light-mode .edit-input-reps,
        .admin-page-container.light-mode .edit-input-duration {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0369a1;
        }

        .admin-page-container.light-mode .edit-input-notes,
        .admin-page-container.light-mode .admin-input-sm,
        .admin-page-container.light-mode .admin-textarea,
        .admin-page-container.light-mode .admin-select {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .admin-page-container.light-mode .btn-order {
          background: #e2e8f0;
          color: #334155;
        }

        .admin-page-container.light-mode .grid-cell label,
        .admin-page-container.light-mode .workout-field-row label,
        .admin-page-container.light-mode .workout-notes-row label {
          color: #64748b;
        }

        .admin-page-container.light-mode .gym-qr-dashboard-card {
          background: #ffffff;
          border-color: #e2e8f0;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }

        .admin-page-container.light-mode .qr-dashboard-preview {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .admin-page-container.light-mode .qr-url-text {
          color: #334155;
        }

        .admin-page-container.light-mode .qr-mini-btn {
          background: #e2e8f0;
          border-color: #cbd5e1;
          color: #334155;
        }

        .admin-page-container.light-mode .qr-mini-btn:hover {
          background: #cbd5e1;
        }

        .admin-page-container.light-mode .add-mode-toggle {
          background: #f1f5f9;
        }

        .admin-page-container.light-mode .mode-btn {
          color: #64748b;
        }

        .admin-page-container.light-mode .mode-btn.active {
          background: #ef4444;
          color: #ffffff;
        }

        .admin-page-container.light-mode .standard-preview-box,
        .admin-page-container.light-mode .search-result-card {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .admin-page-container.light-mode .preview-meta strong,
        .admin-page-container.light-mode .result-header h4 {
          color: #0f172a;
        }

        .admin-page-container.light-mode .preview-notes,
        .admin-page-container.light-mode .result-notes,
        .admin-page-container.light-mode .search-instruction {
          color: #64748b;
        }

        .admin-page-container.light-mode .search-type-pills {
          background: #f1f5f9;
        }

        .admin-page-container.light-mode .search-type-pill {
          color: #64748b;
        }

        .admin-page-container.light-mode .search-type-pill.active {
          background: #2563eb;
          color: #ffffff;
        }

        .admin-page-container.light-mode .muscle-tag-chip {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #475569;
        }

        .admin-page-container.light-mode .muscle-tag-chip.primary-active {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
        }

        .admin-page-container.light-mode .muscle-tag-chip.secondary-active {
          background: #f59e0b;
          color: #ffffff;
          border-color: #f59e0b;
        }

        .admin-page-container.light-mode .modal-card {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
        }

        .admin-page-container.light-mode .modal-header h3 {
          color: #0f172a;
        }

        .admin-page-container.light-mode .field-group label {
          color: #475569;
        }
      `}</style>
    </div>
  );
}
