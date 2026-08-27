import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthSubscribeModal } from '../components/AuthSubscribeModal';
import { useAuth } from '../context/AuthContext';

/**
 * Standalone 1-page login route — renders the full AuthSubscribeModal
 * centered on a fixed dark overlay with zero scrolling.
 * If user is already signed in, redirect immediately to /setup.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/setup', { replace: true });
  }, [user, navigate]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0d0d12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      zIndex: 9999,
    }}>
      <AuthSubscribeModal
        isOpen={true}
        onClose={() => navigate('/')}
        selectedPlanTier="pro"
        initialBillingCycle="weekly"
      />
    </div>
  );
}
