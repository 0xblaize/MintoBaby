import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import SetupPage from './pages/SetupPage';
import TelegramGuidePage from './pages/TelegramGuidePage';
import TerminalGuidePage from './pages/TerminalGuidePage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SubscribePage from './pages/SubscribePage';
import ScanPage from './pages/ScanPage';
import MintPage from './pages/MintPage';
import SchedulePage from './pages/SchedulePage';
import CopyMintPage from './pages/CopyMintPage';
import SchedulesPage from './pages/SchedulesPage';
import WalletPage from './pages/WalletPage';
import MintoBabyStudio from './pages/MintoBabyStudio';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Home Page: MINTOBABY Studio Landing Page */}
        <Route path="/" element={<MintoBabyStudio />} />

        {/* Standalone 1-Page Dedicated Login/Signup Route (Clean Sign In only) */}
        <Route path="login" element={<LoginPage />} />

        {/* Post-Signup Mandatory Payment & Activation Gating Route */}
        <Route path="subscribe" element={<SubscribePage />} />

        {/* Legacy /landing & /agency redirect to root "/" */}
        <Route path="landing" element={<Navigate to="/" replace />} />
        <Route path="agency" element={<Navigate to="/" replace />} />

        {/* Console & App Dashboard Routes */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="telegram-guide" element={<TelegramGuidePage />} />
          <Route path="terminal-guide" element={<TerminalGuidePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="mint" element={<MintPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="copymint" element={<CopyMintPage />} />
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="wallet" element={<WalletPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
