import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, AdminOrder } from '../services/adminApi';
import { api } from '../services/api';
import { Stats, AdminInfo } from '../types';
import { PIXEL_BLOCK_NET_PRICE_TRY, getGrossPriceFromBlocks } from '../utils/pricing';
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
  X,
  ExternalLink,
  MapPin,
  Maximize2,
  Square,
  CheckSquare,
  Search,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';

type TabType = 'dashboard' | 'pixels' | 'orders';
type DeleteTarget = { type: 'single'; ids: string[]; title?: string } | { type: 'bulk'; ids: string[] };
type OrderStatusFilter = 'all' | 'pending' | 'paid' | 'failed' | 'rejected';
type DateFilter = 'all' | 'today' | '7d' | '30d';
type RevenueRange = 'daily' | 'weekly' | 'monthly';

export function Admin() {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pixels, setPixels] = useState<any[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [previewPixel, setPreviewPixel] = useState<any | null>(null);
  const [selectedPixelIds, setSelectedPixelIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pixelSearch, setPixelSearch] = useState('');
  const [pixelDateFilter, setPixelDateFilter] = useState<DateFilter>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('daily');
  const navigate = useNavigate();

  const closePreview = useCallback(() => setPreviewPixel(null), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closePreview]);

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
      const authStatus = await adminApi.isAuthenticated();
      if (!authStatus) {
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
      const [statsData, pixelsData, ordersData] = await Promise.all([
        api.getStats(),
        api.getPixels(),
        adminApi.getOrders().catch(() => []),
      ]);
      setStats(statsData);
      setPixels(pixelsData);
      setOrders(ordersData);
      setSelectedPixelIds((current) => current.filter((id) => pixelsData.some((pixel) => pixel.id === id)));
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
    setPreviewPixel(null);
    try {
      await api.deletePixel(id);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Silme başarısız');
    }
  };

  const togglePixelSelection = (id: string) => {
    setSelectedPixelIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    );
  };

  const toggleAllPixels = () => {
    setSelectedPixelIds((current) =>
      current.length === filteredPixels.length ? [] : filteredPixels.map((pixel) => pixel.id)
    );
  };

  const requestDeletePixel = (pixel: any) => {
    setDeleteTarget({ type: 'single', ids: [pixel.id], title: pixel.title });
  };

  const requestBulkDelete = () => {
    if (selectedPixelIds.length === 0) return;
    setDeleteTarget({ type: 'bulk', ids: selectedPixelIds });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await Promise.all(deleteTarget.ids.map((id) => api.deletePixel(id)));
      setPreviewPixel(null);
      setSelectedPixelIds((current) => current.filter((id) => !deleteTarget.ids.includes(id)));
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Silme başarısız');
    } finally {
      setIsDeleting(false);
    }
  };

  const isWithinDateFilter = (value: string | undefined, filter: DateFilter) => {
    if (filter === 'all' || !value) return true;
    const date = new Date(value).getTime();
    const now = Date.now();
    if (Number.isNaN(date)) return false;
    if (filter === 'today') return new Date(value).toDateString() === new Date().toDateString();
    if (filter === '7d') return now - date <= 7 * 24 * 60 * 60 * 1000;
    return now - date <= 30 * 24 * 60 * 60 * 1000;
  };

  const getPixelPrice = (pixel: any) => getGrossPriceFromBlocks(pixel.w, pixel.h);

  const filteredPixels = useMemo(() => {
    const query = pixelSearch.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

    return pixels.filter((pixel) => {
      const price = getPixelPrice(pixel);
      const matchesQuery = !query || [pixel.title, pixel.linkUrl, `${pixel.x * 10}`, `${pixel.y * 10}`]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      const matchesMin = min === null || price >= min;
      const matchesMax = max === null || price <= max;
      return matchesQuery && matchesMin && matchesMax && isWithinDateFilter(pixel.createdAt, pixelDateFilter);
    });
  }, [pixels, pixelSearch, pixelDateFilter, minPrice, maxPrice]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
      const matchesQuery = !query || [order.title, order.linkUrl, order.email, order.merchantOid, `${order.x * 10}`, `${order.y * 10}`]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const revenueBars = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === 'paid');
    const bucketCount = revenueRange === 'daily' ? 7 : revenueRange === 'weekly' ? 8 : 6;
    const labels = Array.from({ length: bucketCount }, (_, index) => {
      const date = new Date();
      if (revenueRange === 'daily') date.setDate(date.getDate() - (bucketCount - 1 - index));
      if (revenueRange === 'weekly') date.setDate(date.getDate() - (bucketCount - 1 - index) * 7);
      if (revenueRange === 'monthly') date.setMonth(date.getMonth() - (bucketCount - 1 - index));

      const key = revenueRange === 'daily'
        ? date.toISOString().slice(0, 10)
        : revenueRange === 'weekly'
          ? `${date.getFullYear()}-${Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)}`
          : `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = revenueRange === 'daily'
        ? date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
        : revenueRange === 'weekly'
          ? `${date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}`
          : date.toLocaleDateString('tr-TR', { month: 'short' });
      return { key, label, amount: 0 };
    });

    for (const order of paidOrders) {
      const date = new Date(order.createdAt);
      const key = revenueRange === 'daily'
        ? date.toISOString().slice(0, 10)
        : revenueRange === 'weekly'
          ? `${date.getFullYear()}-${Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)}`
          : `${date.getFullYear()}-${date.getMonth() + 1}`;
      const bucket = labels.find((item) => item.key === key);
      if (bucket) bucket.amount += order.amount || 0;
    }

    const max = Math.max(1, ...labels.map((item) => item.amount));
    return labels.map((item) => ({ ...item, percent: Math.max(4, Math.round((item.amount / max) * 100)) }));
  }, [orders, revenueRange]);

  if (isLoading || !admin) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  /* ─── Pixel Preview Modal ─── */
  const PixelPreviewModal = () => {
    if (!previewPixel) return null;
    const px = previewPixel;
    const price = getGrossPriceFromBlocks(px.w, px.h).toLocaleString('tr-TR');
    const coordX = px.x * 10;
    const coordY = px.y * 10;
    const sizeW = px.w * 10;
    const sizeH = px.h * 10;
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={closePreview}
      >
        <div
          className="bg-white border-4 border-black w-full max-w-lg relative"
          style={{ boxShadow: '8px 8px 0 #000' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-black px-5 py-3 bg-black text-white">
            <span className="font-display font-black text-lg uppercase tracking-tight">Pixel Önizleme</span>
            <button onClick={closePreview} className="hover:text-red-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image */}
          <div className="relative border-b-2 border-black bg-[#f4f4f0]" style={{ height: 220 }}>
            {px.imageUrl ? (
              <img
                src={px.imageUrl}
                alt={px.title}
                className="w-full h-full object-contain p-4"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Image className="w-12 h-12" />
              </div>
            )}
            <span className="absolute top-2 right-2 bg-red-600 text-white font-mono text-xs font-bold px-2 py-1 border border-black">
              ₺{price}
            </span>
          </div>

          {/* Details */}
          <div className="px-5 py-4 space-y-3">
            <h2 className="font-display text-2xl font-black uppercase tracking-tighter leading-none">{px.title || '—'}</h2>

            <div className="grid grid-cols-2 gap-3 font-mono text-sm">
              <div className="flex items-center gap-2 border-2 border-black px-3 py-2 bg-[#ffd700]">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-black/60">Konum</p>
                  <p className="font-bold">X:{coordX} Y:{coordY}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 border-2 border-black px-3 py-2">
                <Maximize2 className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Boyut</p>
                  <p className="font-bold">{sizeW}×{sizeH} px</p>
                </div>
              </div>
            </div>

            {px.linkUrl && (
              <p className="text-xs font-mono text-gray-500 truncate border border-gray-200 px-2 py-1 bg-gray-50">
                🔗 {px.linkUrl}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 px-5 pb-5">
            {px.linkUrl && (
              <a
                href={px.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-display font-bold py-3 border-2 border-black hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Siteyi Aç
              </a>
            )}
            <button
              onClick={() => requestDeletePixel(px)}
              className="flex items-center justify-center gap-2 bg-red-600 text-white font-display font-bold px-4 py-3 border-2 border-black hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Sil
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteConfirmModal = () => {
    if (!deleteTarget) return null;
    const isBulk = deleteTarget.type === 'bulk';

    return (
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75"
        onClick={() => !isDeleting && setDeleteTarget(null)}
      >
        <div
          className="bg-white border-4 border-black w-full max-w-md"
          style={{ boxShadow: '8px 8px 0 #000' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between bg-black text-white px-5 py-3 border-b-2 border-black">
            <h3 className="font-display font-black text-xl uppercase">Silme Onayı</h3>
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="hover:text-red-400 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 border-2 border-red-600 bg-red-50 p-4">
              <Trash2 className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-black text-lg uppercase">
                  {isBulk ? `${deleteTarget.ids.length} piksel silinsin mi?` : 'Bu piksel silinsin mi?'}
                </p>
                <p className="font-mono text-sm text-gray-700 mt-1">
                  {isBulk
                    ? 'Seçili tüm pikseller haritadan kaldırılacak.'
                    : `"${deleteTarget.title || 'Seçili piksel'}" haritadan kaldırılacak.`}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 bg-white border-2 border-black font-display font-bold py-3 hover:bg-gray-100 disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white border-2 border-black font-display font-bold py-3 hover:bg-red-700 disabled:bg-gray-400"
              >
                {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabNames: Record<TabType, string> = {
    dashboard: 'Dashboard',
    pixels: 'Piksel',
    orders: 'Siparişler',
  };

  const statusLabels: Record<OrderStatusFilter, string> = {
    all: 'Tümü',
    pending: 'Bekliyor',
    paid: 'Ödendi',
    failed: 'Başarısız',
    rejected: 'Reddedildi',
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] flex">
      <PixelPreviewModal />
      <DeleteConfirmModal />
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
          {(['dashboard', 'pixels', 'orders'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 font-mono text-sm font-bold transition-colors ${
                activeTab === tab ? 'bg-red-600 text-white' : 'hover:bg-gray-800'
              }`}
            >
              {tab === 'dashboard' && <LayoutDashboard className="w-5 h-5" />}
              {tab === 'pixels' && <Image className="w-5 h-5" />}
              {tab === 'orders' && <ShoppingCart className="w-5 h-5" />}
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
                  ₺{getGrossPriceFromBlocks(1, 1).toLocaleString('tr-TR')}
                </p>
                <p className="font-mono text-xs text-black/60 mt-1">10x10 px • {PIXEL_BLOCK_NET_PRICE_TRY} TL + KDV</p>
              </div>
            </div>

            <div className="bg-white border-2 border-black brutal-shadow-lg p-4 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
                <h3 className="font-display text-xl font-black uppercase flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Gelir Grafiği
                </h3>
                <div className="flex border-2 border-black bg-white font-mono text-xs font-bold">
                  {(['daily', 'weekly', 'monthly'] as RevenueRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => setRevenueRange(range)}
                      className={`px-3 py-2 uppercase ${revenueRange === range ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    >
                      {range === 'daily' ? 'Günlük' : range === 'weekly' ? 'Haftalık' : 'Aylık'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-56 flex items-end gap-2 border-2 border-black bg-[#f4f4f0] p-4 overflow-x-auto">
                {revenueBars.map((bar) => (
                  <div key={bar.key} className="flex-1 h-full flex flex-col justify-end items-center gap-2 min-w-[42px]">
                    <div className="font-mono text-[10px] font-bold text-gray-600">
                      ₺{bar.amount.toLocaleString()}
                    </div>
                    <div className="w-full bg-red-600 border-2 border-black min-h-[10px]" style={{ height: `${bar.percent}%` }} />
                    <div className="font-mono text-[10px] text-gray-500 text-center">{bar.label}</div>
                  </div>
                ))}
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
                          ₺{getGrossPriceFromBlocks(pixel.w, pixel.h).toLocaleString('tr-TR')}
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
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h3 className="font-display text-xl font-black uppercase">Alınan Pikseller</h3>
                <p className="font-mono text-xs text-gray-500 mt-1">
                  {selectedPixelIds.length > 0 ? `${selectedPixelIds.length} piksel seçili` : `${pixels.length} piksel listeleniyor`}
                </p>
              </div>
              <button
                onClick={requestBulkDelete}
                disabled={selectedPixelIds.length === 0}
                className="flex items-center justify-center gap-2 bg-red-600 text-white border-2 border-black px-4 py-3 font-display font-bold hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Seçilenleri Sil
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 font-mono text-xs">
              <div className="md:col-span-2 flex items-center gap-2 border-2 border-black bg-white px-3 py-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  value={pixelSearch}
                  onChange={(e) => setPixelSearch(e.target.value)}
                  placeholder="Marka, link, koordinat ara"
                  className="w-full outline-none bg-transparent"
                />
              </div>
              <select
                value={pixelDateFilter}
                onChange={(e) => setPixelDateFilter(e.target.value as DateFilter)}
                className="border-2 border-black bg-white px-3 py-2 outline-none"
              >
                <option value="all">Tüm tarihler</option>
                <option value="today">Bugün</option>
                <option value="7d">Son 7 gün</option>
                <option value="30d">Son 30 gün</option>
              </select>
              <input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                type="number"
                min="0"
                placeholder="Min fiyat"
                className="border-2 border-black bg-white px-3 py-2 outline-none"
              />
              <input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                type="number"
                min="0"
                placeholder="Max fiyat"
                className="border-2 border-black bg-white px-3 py-2 outline-none"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2 w-10">
                      <button
                        onClick={toggleAllPixels}
                        disabled={filteredPixels.length === 0}
                        className="p-1 hover:text-red-600 disabled:opacity-40"
                        title={selectedPixelIds.length === pixels.length && pixels.length > 0 ? 'Tüm seçimi kaldır' : 'Tümünü seç'}
                      >
                        {selectedPixelIds.length === filteredPixels.length && filteredPixels.length > 0
                          ? <CheckSquare className="w-5 h-5" />
                          : <Square className="w-5 h-5" />}
                      </button>
                    </th>
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
                  {filteredPixels.map((pixel) => (
                    <tr key={pixel.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-2">
                        <button
                          onClick={() => togglePixelSelection(pixel.id)}
                          className="p-1 hover:text-red-600"
                          title={selectedPixelIds.includes(pixel.id) ? 'Seçimi kaldır' : 'Seç'}
                        >
                          {selectedPixelIds.includes(pixel.id)
                            ? <CheckSquare className="w-5 h-5" />
                            : <Square className="w-5 h-5" />}
                        </button>
                      </td>
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
                        ₺{getGrossPriceFromBlocks(pixel.w, pixel.h).toLocaleString('tr-TR')}
                      </td>
                      <td className="font-mono text-sm text-gray-500 p-2">
                        {pixel.createdAt ? new Date(pixel.createdAt).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPreviewPixel(pixel)}
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-black brutal-shadow-sm transition-colors"
                            title="Önizle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestDeletePixel(pixel)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white border-2 border-black brutal-shadow-sm transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPixels.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center font-mono text-sm text-gray-500 p-8">
                        Henüz pixel satışı yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white border-2 border-black brutal-shadow-lg p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h3 className="font-display text-xl font-black uppercase">Ödeme / Siparişler</h3>
                <p className="font-mono text-xs text-gray-500 mt-1">
                  {filteredOrders.length} sipariş gösteriliyor
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'paid', 'failed', 'rejected'] as OrderStatusFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setOrderStatusFilter(status)}
                    className={`border-2 border-black px-3 py-2 font-mono text-xs font-bold uppercase ${
                      orderStatusFilter === status ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2 mb-4 font-mono text-xs">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Marka, link, e-posta, sipariş no, koordinat ara"
                className="w-full outline-none bg-transparent"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Durum</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Marka</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">E-posta</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Konum</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Boyut</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Tutar</th>
                    <th className="text-left font-mono text-xs text-gray-500 uppercase p-2">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-2">
                        <span className={`inline-block border-2 border-black px-2 py-1 font-mono text-xs font-bold uppercase ${
                          order.status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="font-mono text-sm p-2 max-w-[180px] truncate">{order.title}</td>
                      <td className="font-mono text-sm p-2 max-w-[180px] truncate">{order.email || '-'}</td>
                      <td className="font-mono text-sm p-2">X:{order.x * 10} Y:{order.y * 10}</td>
                      <td className="font-mono text-sm p-2">{order.w * 10}x{order.h * 10}</td>
                      <td className="font-mono text-sm p-2 font-bold">₺{order.amount.toLocaleString()}</td>
                      <td className="font-mono text-sm text-gray-500 p-2">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR') : '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center font-mono text-sm text-gray-500 p-8">
                        Filtrelere uygun sipariş yok
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
