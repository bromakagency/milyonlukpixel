import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PixelProvider } from './context/PixelContext';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { AdminLogin } from './pages/AdminLogin';

export default function App() {
  return (
    <BrowserRouter>
      <PixelProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ers-admin/login" element={<AdminLogin />} />
          <Route path="/ers-admin" element={<Admin />} />
        </Routes>
      </PixelProvider>
    </BrowserRouter>
  );
}
