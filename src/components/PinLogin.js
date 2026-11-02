'use client';
import { useState } from 'react';

export default function PinLogin({ role, onLoginSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, pin })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem(`auth_token_${role}`, data.token);
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'Invalid PIN');
      }
    } catch (err) {
      setError('Connection error');
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>{role === 'trainer' ? 'Trainer Login' : 'Welcome Back'}</h2>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>Please enter your 4-digit PIN.</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            maxLength={4}
            className="input text-center"
            style={{ fontSize: '2rem', letterSpacing: '0.5rem', padding: '1rem', width: '200px', margin: '0 auto', display: 'block' }}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\\D/g, ''))}
            autoFocus
          />
          
          {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}
          
          <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%', padding: '0.75rem' }} disabled={loading || pin.length < 4}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
