import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthSubscribeModal } from '../components/AuthSubscribeModal';
import { useAuth } from '../context/AuthContext';

/**
 * Dedicated 1-Page Static Login & Subscription Portal
 * Rigidly centered horizontally and vertically on a static dark canvas (#0d0d12).
 * NO fluid water particle background canvas. ZERO scrolling required.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const isPaid = localStorage.getItem('mintobaby_user_logged_in') === 'true' || Boolean(localStorage.getItem('mintobaby_subscription')) || Boolean(localStorage.getItem('mintobaby_session'));
    if (user && isPaid) {
      navigate('/setup', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      inset: 0,
      background: '#0d0d12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      color: '#e8e6f0',
      overflow: 'hidden',
      zIndex: 9999
    }}>
      {/* Ambient subtle purple glow - static background */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,90,240,0.15) 0%, rgba(13,13,18,0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Primary Authentication & Subscription Component - Single Unified Design */}
      <AuthSubscribeModal
        isOpen={true}
        onClose={() => navigate('/')}
        selectedPlanTier="pro"
        initialBillingCycle="weekly"
      />
    </div>
  );
}
