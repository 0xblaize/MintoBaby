import { useNavigate } from 'react-router-dom';
import { AuthSubscribeModal } from '../components/AuthSubscribeModal';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0a0f',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
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
