import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import DashboardPage from '@/pages/DashboardPage';
import StressPage from '@/pages/StressPage';
import '@/styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/stress" element={<StressPage />} />
      </Routes>
    </BrowserRouter>
  );
}
