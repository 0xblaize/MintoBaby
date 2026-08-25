import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout }        from './components/Layout';
import Dashboard         from './pages/Dashboard';
import ScanPage          from './pages/ScanPage';
import MintPage          from './pages/MintPage';
import SchedulePage      from './pages/SchedulePage';
import CopyMintPage      from './pages/CopyMintPage';
import SchedulesPage     from './pages/SchedulesPage';
import WalletPage        from './pages/WalletPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index        element={<Dashboard />}     />
          <Route path="scan"      element={<ScanPage />}      />
          <Route path="mint"      element={<MintPage />}      />
          <Route path="schedule"  element={<SchedulePage />}  />
          <Route path="copymint"  element={<CopyMintPage />}  />
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="wallet"    element={<WalletPage />}    />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
