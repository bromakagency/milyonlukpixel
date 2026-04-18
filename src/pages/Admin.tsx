import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/adminApi';
import { api } from '../services/api';
import { Stats, AdminInfo } from '../types';
import {
  LayoutDashboard,
  Image,
  LogOut,
  Menu,
  TrendingUp,
  MousePointer,
  Banknote,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';

type TabType = 'dashboard' | 'pixels';

export function Admin() {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pixels, setPixels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (admin) {
      loadData();
    }
  }, [admin, activeTab]);

  const checkAuth = async () => {
    try {
      if (!adminApi.isAuthenticated()) {
navigate('/ers-admin/login');
        return;
      }
      const adminInfo = await adminApi.getMe();
      setAdmin(adminInfo);
    } catch (error) {
navigate('/ers-admin/login');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, pixelsData] = await Promise.all([
        api.getStats(),
        api.getPixels(),
      ]);
      setStats(statsData);
      setPixels(pixelsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    adminApi.logout();
    navigate('/');
  };

  const handleDeletePixel = async (id: string) => {
    if (!confirm('Bu pixeli silmek istediğinizden emin misiniz?')) return;
    
    try {
      await api.deletePixel(id);
      await loadData();
    } catch (error) {
      alert('Silme başarısız');
    }
  };

  if (isLoading || !admin) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  const tabNames: Record<TabType, string> = {
    dashboard: 'Dashboard',
    pixels: 'Pixeller',
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-black text-white transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 border-b border-gray-800">
          <h1 className="font-display text-2xl font-black uppercase">
            Admin<br />Panel
          </h1>
          <p className="text-gray-400 font-mono text-sm mt-2">
            {admin.username}
          </p>
        </div>

        <nav className="p-4 space-y-2">
          {(['dashboard', 'pixels'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 font-mono text-sm font-bold transition-colors ${
                activeTab === tab ? 'bg-red-600 text-white' : 'hover:bg-gray-800'
              }`}
            >
              {tab === 'dashboard' && <LayoutDashboard className="w-5 h-5" />}
              {tab === 'pixels' && <Image className="w-5 h-5" />}
              {tabNames[tab]}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 font-mono text-sm font-bold hover:bg-gray-800 transition-colors text-red-400"
          >
            <LogOut className="w-5 h-5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-black uppercase">
            {tabNames[activeTab]}
          </h2>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 bg-white border-2 border-black brutal-shadow-sm"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-8">
          <h2 className="font-display text-3xl font-black uppercase">
            {tabNames[activeTab]}
          </h2>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black font-mono text-sm font-bold hover:bg-gray-100 brutal-shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border-2 border-black brutal-shadow-sm p-4 md:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Banknote className="w-5 h-5 text-red-600" />
                  <span className="font-mono text-xs text-gray-500 uppercase">Toplam Gelir</span>
                </div>
                <p className="font-display text-2xl md:text-3xl font-black">
                  ₺{stats.totalRevenue.toLocaleString()}
                </p>
              </div>

              <div className="bg-white border-2 border-black brutal-shadow-sm p-4 md:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-mono text-xs text-gray-500 uppercase">Satılan Pixel</span>
                </div>
                <p className="font-display text-2xl md:text-3xl font-black">
                  {(stats.soldPixels / 100).toLocaleString()}
                </p>
                <p className="font-mono text-xs text-gray-500 mt-1">
                  {((stats.soldPixels / stats.totalPixels) * 100).toFixed(2)}%
                </p>
              </div>

              <div className="bg-white border-2 border-black brutal-shadow-sm p-4 md:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                  <span className="font-mono text-xs text-gray-500 uppercase">Kalan</span>
                </div>
                <p className="font-display text-2xl md:text-3xl font-black">
                  {(stats.availablePixels / 100).toLocaleString()}
                </p>
              </div>

              <div className="bg-[#ffd700] border-2 border-black brutal-shadow-sm p-4 md:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Image className="w-5 h-5" />
                  <span className="font-mono text-xs text-black uppercase">Blok Fiyatı</span>
                </div>
                <p className="font-display text-2xl md:text-3xl font-black">
                  ₺100
                </p>
                <p className="font-mono text-xs text-black/60 mt-1">10x10 px</p>
              </div>
            </div>

            <div className="bg-white border-2 border-black brutal-shadow-lg p-4 md:p-6">
              <h3 className="font-display text-xl font-black uppercase mb-4">
                Son Satışlar
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Konum</th>
                      <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Boyut</th>
                      <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Başlık</th>
                      <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Fiyat</th>
                      <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pixels.slice(0, 5).map((pixel) => (
                      <tr key={pixel.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="font-mono text-sm p-2">
                          X: {pixel.x * 10}, Y: {pixel.y * 10}
                        </td>
                        <td className="font-mono text-sm p-2">
                          {pixel.w * 10}x{pixel.h * 10}
                        </td>
                        <td className="font-mono text-sm p-2">
                          {pixel.title}
                        </td>
                        <td className="font-mono text-sm p-2 font-bold">
                          ₺{(pixel.w * pixel.h * 100).toLocaleString()}
                        </td>
                        <td className="font-mono text-sm text-gray-500 p-2">
                          {pixel.createdAt ? new Date(pixel.createdAt).toLocaleDateString('tr-TR') : '-'}
                        </td>
                      </tr>
                    ))}
                    {pixels.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center font-mono text-sm text-gray-500 p-4">
                          Henüz satış yok
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Pixels Tab */}
        {activeTab === 'pixels' && (
          <div className="bg-white border-2 border-black brutal-shadow-lg p-4 md:p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Önizleme</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Konum</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Boyut</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Başlık</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Fiyat</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Tarih</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {pixels.map((pixel) => (
                    <tr key={pixel.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-2">
                        <div
                          className="w-12 h-12 bg-cover bg-center border-2 border-black"
                          style={{ backgroundImage: `url(${pixel.imageUrl})` }}
                          onError={(e) => {
                            (e.target as HTMLDivElement).style.backgroundImage = 'none';
                            (e.target as HTMLDivElement).style.backgroundColor = '#333';
                          }}
                        />
                      </td>
                      <td className="font-mono text-sm p-2">
                        X: {pixel.x * 10}, Y: {pixel.y * 10}
                      </td>
                      <td className="font-mono text-sm p-2">
                        {pixel.w * 10}x{pixel.h * 10}
                      </td>
                      <td className="font-mono text-sm p-2 max-w-[150px] truncate">
                        {pixel.title}
                      </td>
                      <td className="font-mono text-sm p-2 font-bold">
                        ₺{(pixel.w * pixel.h * 100).toLocaleString()}
                      </td>
                      <td className="font-mono text-sm text-gray-500 p-2">
                        {pixel.createdAt ? new Date(pixel.createdAt).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(pixel.linkUrl, '_blank')}
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-black brutal-shadow-sm transition-colors"
                            title="Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePixel(pixel.id)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white border-2 border-black brutal-shadow-sm transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pixels.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center font-mono text-sm text-gray-500 p-8">
                        Henüz pixel satışı yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}