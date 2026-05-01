import { useState, ReactNode } from 'react';
import { Mail, Phone, MapPin, Building2, Info, FileText, ShieldCheck, Cookie, RotateCcw, ScrollText } from 'lucide-react';

type ModalType =
  | 'hakkimizda'
  | 'iletisim'
  | 'on-bilgilendirme'
  | 'mesafeli-satis'
  | 'iptal-iade'
  | 'kvkk'
  | 'gizlilik'
  | 'cerez'
  | null;

interface PageDef {
  id: ModalType;
  label: string;
}

const PAGES: PageDef[] = [
  { id: 'hakkimizda',       label: 'Hakkımızda' },
  { id: 'iletisim',         label: 'İletişim' },
  { id: 'on-bilgilendirme', label: 'Ön Bilgilendirme' },
  { id: 'mesafeli-satis',   label: 'Mesafeli Satış' },
  { id: 'iptal-iade',       label: 'İptal / İade' },
  { id: 'kvkk',             label: 'KVKK' },
  { id: 'gizlilik',         label: 'Gizlilik' },
  { id: 'cerez',            label: 'Çerez Politikası' },
];

// Yeniden kullanılabilir modal wrapper
function LegalModal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border-t-4 md:border-4 border-black w-full md:max-w-xl brutal-shadow-lg rounded-t-2xl md:rounded-none max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-black text-white p-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[#ffd700]">{icon}</span>
            <h2 className="font-display font-black text-base uppercase tracking-wider">{title}</h2>
          </div>
          <button onClick={onClose} className="hover:text-red-400 font-mono text-lg font-bold transition-colors">
            [X]
          </button>
        </div>
        <div className="p-5 overflow-y-auto text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// Paragraf gruplayıcı — düz metni bölümlere ayırır
function TextBody({ text }: { text: string }) {
  const lines = text.trim().split('\n');
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // Büyük başlık (tüm büyük harf, kısa)
    if (line === line.toUpperCase() && line.length < 60 && !/^\d+\./.test(line)) {
      elements.push(
        <h2 key={i} className="font-display font-black text-lg uppercase mb-3 border-b-2 border-black pb-1">{line}</h2>
      );
    }
    // Madde başlığı (1. 2. gibi)
    else if (/^\d+\. /.test(line)) {
      elements.push(
        <h3 key={i} className="font-bold font-mono text-sm uppercase mt-4 mb-1 text-black">{line}</h3>
      );
    }
    else {
      elements.push(
        <p key={i} className="text-gray-700 mb-2">{line}</p>
      );
    }
    i++;
  }

  return <div className="space-y-0">{elements}</div>;
}

export function Footer() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const close = () => setActiveModal(null);

  return (
    <>
      {/* ── Minimal Footer ── */}
      <footer className="w-full border-t-2 border-black bg-white pt-2 pb-3 px-4">
        <div className="max-w-5xl mx-auto space-y-1">

          {/* Copyright */}
          <p className="font-mono text-[10px] text-gray-400 text-center">© {new Date().getFullYear()} Milyonluk Piksel</p>

          {/* Tüm linkler — aynı stil, ortalı */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            {([
              ['hakkimizda',       'Hakkımızda'],
              ['iletisim',         'İletişim'],
              ['on-bilgilendirme', 'Ön Bilgilendirme'],
              ['mesafeli-satis',   'Mesafeli Satış'],
              ['iptal-iade',       'İptal / İade'],
              ['kvkk',             'KVKK'],
              ['gizlilik',         'Gizlilik'],
              ['cerez',            'Çerez'],
            ] as [ModalType, string][]).map(([id, label], idx, arr) => (
              <span key={id} className="flex items-center gap-3">
                <button
                  onClick={() => setActiveModal(id)}
                  className="font-mono text-[10px] text-gray-400 hover:text-red-600 transition-colors"
                >
                  {label}
                </button>
                {idx < arr.length - 1 && <span className="text-gray-200 text-[10px]">·</span>}
              </span>
            ))}
          </div>

        </div>
      </footer>

      {/* ── Hakkımızda ── */}
      {activeModal === 'hakkimizda' && (
        <LegalModal title="Hakkımızda" icon={<Info className="w-4 h-4" />} onClose={close}>
          <p className="text-gray-800 mb-4">
            <span className="font-bold text-black">Milyonluk Piksel</span>, dijital dünyada
            markaların görünürlüğünü artırmak amacıyla oluşturulmuş bir reklam platformudur.
            Kullanıcılar, <span className="font-bold">milyonlukpiksel.com</span> üzerinden piksel
            alanları satın alarak kendi web sitelerini, markalarını veya projelerini tanıtabilir.
          </p>
          <div className="border-l-4 border-[#ffd700] pl-4 bg-[#fffdf0] py-3 pr-3">
            <p className="text-gray-700">
              Platform üzerinde satın alınan alanlar; görsel, bağlantı ve açıklama metni ile
              birlikte yayınlanır. Tüm içerikler yayınlanmadan önce incelenir ve platform
              kurallarına aykırı içerikler yayınlanmaz.
            </p>
          </div>
          <button onClick={() => setActiveModal('iletisim')} className="mt-4 font-mono text-xs font-bold underline hover:text-red-600 transition-colors block">
            → İletişim bilgilerimiz için tıklayın
          </button>
        </LegalModal>
      )}

      {/* ── İletişim ── */}
      {activeModal === 'iletisim' && (
        <LegalModal title="İletişim" icon={<Mail className="w-4 h-4" />} onClose={close}>
          <div className="space-y-3">
            <div className="border-2 border-black p-4 bg-[#f4f4f0]">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">Firma Bilgileri</span>
              </div>
              <div className="font-mono text-sm space-y-1">
                <p><span className="text-gray-500">Firma:</span> <b>Bromak Agency</b></p>
                <p><span className="text-gray-500">Yetkili:</span> Enes Umut Parlak</p>
                <p><span className="text-gray-500">Vergi Dairesi:</span> Meram — <span className="text-gray-500">No:</span> 7220881193</p>
              </div>
            </div>
            <div className="border-2 border-black p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">Adres</span>
              </div>
              <p className="font-mono text-sm">Esenler Mah. Horasan Sk. No:4/4<br />Selçuklu / Konya / Türkiye</p>
            </div>
            <div className="border-2 border-black p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">Bize Ulaşın</span>
              </div>
              <div className="space-y-1">
                <a href="mailto:bromakagency@gmail.com" className="flex items-center gap-2 font-mono text-sm hover:text-red-600 transition-colors">
                  <Mail className="w-3 h-3" /> bromakagency@gmail.com
                </a>
                <a href="tel:+905413660496" className="flex items-center gap-2 font-mono text-sm hover:text-red-600 transition-colors">
                  <Phone className="w-3 h-3" /> 0541 366 04 96
                </a>
                <a href="tel:+905050638543" className="flex items-center gap-2 font-mono text-sm hover:text-red-600 transition-colors">
                  <Phone className="w-3 h-3" /> 0505 063 85 43
                </a>
              </div>
            </div>
          </div>
        </LegalModal>
      )}

      {/* ── Ön Bilgilendirme ── */}
      {activeModal === 'on-bilgilendirme' && (
        <LegalModal title="Ön Bilgilendirme Formu" icon={<ScrollText className="w-4 h-4" />} onClose={close}>
          <TextBody text={`ÖN BİLGİLENDİRME FORMU

İşbu Ön Bilgilendirme Formu, milyonlukpiksel.com üzerinden sunulan dijital reklam alanı hizmetine ilişkin olarak, alıcıya mesafeli sözleşme kurulmadan önce bilgi verilmesi amacıyla hazırlanmıştır.

1. Satıcı / Sağlayıcı Bilgileri
Ticari Unvan: Bromak Agency — İşleten: Enes Umut Parlak — Vergi No: 7220881193
Adres: Esenler Mah. Horasan Sk. No:4/4 Selçuklu/Konya Türkiye
E-posta: bromakagency@gmail.com — Tel: 0541 366 04 96 / 0505 063 85 43

2. Hizmetin Konusu
milyonlukpiksel.com üzerinden kullanıcıların seçtiği piksel alanlarının, kullanıcı tarafından sağlanan görsel, bağlantı adresi ve kısa açıklama metni ile birlikte dijital reklam alanı olarak yayınlanması hizmetidir.

3. Hizmetin Temel Nitelikleri
Satış, toplam 1.000.000 piksellik alan içinde 10x10 bloklar halinde yapılır. Her blok 10x10 piksel boyutundadır. Yayınlama işlemi otomatik değil, yönetici onayı sonrasında gerçekleştirilir. Hukuka aykırı içerikler yayınlanmaz.

4. Fiyatlandırma
Blok başlangıç fiyatı 100 TL + KDV'dir. Toplam ücret seçilen blok sayısına göre ödeme öncesinde sistem üzerinde gösterilir.

5. İfa / Yayın Süreci
Ödeme tamamlandıktan sonra içerik yönetici incelemesine alınır. İçerik uygun bulunursa yayınlanır. Yayınlanan alan, milyonlukpiksel.com yayında kaldığı sürece sitede gösterilir.

6. Cayma Hakkı
Cayma hakkı ve istisnalarına ilişkin değerlendirme yürürlükteki tüketici mevzuatına göre yapılır. Detaylar İptal/İade Politikası ve Mesafeli Satış Sözleşmesi'nde düzenlenmiştir.

7. Şikâyet ve İletişim
Alıcı taleplerini bromakagency@gmail.com adresine iletebilir.

8. Onay
Alıcı, ödeme öncesinde bu formu okuyup anladığını ve elektronik ortamda onayladığını kabul eder.`} />
        </LegalModal>
      )}

      {/* ── Mesafeli Satış ── */}
      {activeModal === 'mesafeli-satis' && (
        <LegalModal title="Mesafeli Satış Sözleşmesi" icon={<FileText className="w-4 h-4" />} onClose={close}>
          <TextBody text={`MESAFELİ SATIŞ SÖZLEŞMESİ

1. Taraflar
İşbu sözleşme, Bromak Agency ile milyonlukpiksel.com üzerinden hizmet satın alan alıcı arasında elektronik ortamda kurulmuştur. Satıcı: Bromak Agency — E-posta: bromakagency@gmail.com

2. Sözleşmenin Konusu
Alıcının seçtiği piksel reklam alanının, alıcının sağladığı içerik doğrultusunda dijital ortamda yayınlanması hizmetinin şart ve koşullarının belirlenmesidir.

3. Hizmetin Kapsamı
Hizmet, 10x10 bloklar halinde piksel alanı tahsisini kapsar. İçerik, ödeme sonrası otomatik yayınlanmaz; satıcı tarafından incelenerek uygun bulunması halinde yayınlanır.

4. Ücret ve Ödeme
Hizmet bedeli seçilen blok sayısına göre sistem üzerinde gösterilir. Net fiyatlara KDV eklenir ve toplam tahsilat tutarı ödeme öncesinde kullanıcıya bildirilir.

5. Yayın Onayı ve İçerik Politikası
Satıcı; hukuka aykırı, yanıltıcı, müstehcen, +18, nefret söylemi, yasa dışı bahis/kumar, fikri mülkiyet ihlali içeren içerikleri reddetme hakkına sahiptir. İçeriğe ilişkin tüm hukuki sorumluluk alıcıya aittir.

6. Yayın Süresi
Satın alınan piksel alanı, milyonlukpiksel.com aktif kaldığı sürece yayında tutulur. Bu ifade belirli bir yıl veya ömür boyu garanti anlamına gelmez.

7. Alıcının Sorumlulukları
Alıcı, sağladığı görsel, metin ve bağlantının kullanım hakkına sahip olduğunu kabul eder. Üçüncü kişilere ait içerikleri izinsiz kullanmayacağını kabul eder.

8. Satıcının Sorumluluğunun Sınırı
Satıcı, teknik bakım, sunucu kesintisi, siber saldırı, altyapı arızası veya mücbir sebepten kaynaklanan aksamalardan sorumlu tutulamaz.

9. Cayma Hakkı / İptal / İade
Mesafeli sözleşmelerde genel kural olarak 14 gün cayma hakkı vardır. Hizmetin niteliği ve ifanın başlaması durumunda mevzuattaki istisnalar ayrıca değerlendirilir.

10. Uyuşmazlık
Uyuşmazlıklarda Türk Hukuku uygulanır. Yetkili tüketici hakem heyetleri ve tüketici mahkemeleri yetkilidir.

11. Yürürlük
Alıcı, ödeme işlemini tamamlayarak işbu sözleşmenin tüm koşullarını kabul etmiş sayılır.`} />
        </LegalModal>
      )}

      {/* ── İptal / İade ── */}
      {activeModal === 'iptal-iade' && (
        <LegalModal title="İptal / İade / Cayma Hakkı" icon={<RotateCcw className="w-4 h-4" />} onClose={close}>
          <TextBody text={`İPTAL / İADE / CAYMA HAKKI POLİTİKASI

milyonlukpiksel.com üzerinden sunulan hizmet; dijital reklam alanı tahsisi ve kullanıcı tarafından sağlanan görsel, bağlantı ve açıklama metni ile kişiselleştirilmiş yayın hizmetidir.

Mesafeli sözleşmelerde tüketiciye genel olarak 14 gün cayma hakkı tanınır. Bununla birlikte bazı hizmetler ve elektronik ortamda ifa edilen dijital teslimlerde istisnalar bulunur.

Bu kapsamda:
Ödeme yapılmış olsa bile içerik henüz incelenmemiş ve yayın süreci başlamamışsa talep somut duruma göre değerlendirilebilir. İçerik onaylanıp yayınlandığında hizmet ifasına başlanmış olur. Kişiselleştirilmiş içeriklerde ifaya başlanması sonrasında iade talebi kabul edilmeyebilir. Hukuka aykırı içeriklerin reddedilmesi halinde ödeme iptali/iadesi satıcı inisiyatifiyle gerçekleştirilebilir.

Yasak İçerikler
Yasa dışı içerikler, +18 içerikler, üçüncü kişi haklarını ihlal eden içerikler, yanıltıcı bağlantılar, zararlı yazılım veya dolandırıcılık amaçlı yönlendirmeler kabul edilmez.

İletişim
İptal / iade talepleri için: bromakagency@gmail.com`} />
        </LegalModal>
      )}

      {/* ── KVKK ── */}
      {activeModal === 'kvkk' && (
        <LegalModal title="KVKK Aydınlatma Metni" icon={<ShieldCheck className="w-4 h-4" />} onClose={close}>
          <TextBody text={`KİŞİSEL VERİLERİN KORUNMASI AYDINLATMA METNİ

Bu aydınlatma metni, milyonlukpiksel.com üzerinden sunulan hizmetler kapsamında veri sorumlusu sıfatıyla Bromak Agency tarafından işlenen kişisel verilere ilişkin hazırlanmıştır.

1. Veri Sorumlusu
Bromak Agency — Enes Umut Parlak — bromakagency@gmail.com — Selçuklu / Konya / Türkiye

2. İşlenen Kişisel Veriler
Ad, soyad (varsa), e-posta adresi, telefon numarası (varsa), IP adresi ve işlem güvenliği bilgileri, yüklenen görseller ve içerik verileri, ödeme ve işlem bilgileri.

3. Kişisel Verilerin İşlenme Amaçları
Hizmet sunulması (piksel alanı satışı ve yayını), kullanıcı ile iletişim kurulması, ödeme işlemlerinin gerçekleştirilmesi, hukuki yükümlülüklerin yerine getirilmesi, güvenlik ve dolandırıcılık önleme.

4. Verilerin Aktarımı
Kişisel veriler; ödeme altyapısı sağlayıcılarına (PAYTR vb.) ve yasal yükümlülükler kapsamında yetkili kurumlara aktarılabilir.

5. Veri Toplama Yöntemi
Kişisel veriler, site üzerindeki formlar ve kullanıcı işlemleri aracılığıyla elektronik ortamda toplanır.

6. KVKK Kapsamındaki Haklarınız
KVKK'nın 11. maddesi kapsamında verilerinizin işlenip işlenmediğini öğrenme, işlenen veriler hakkında bilgi talep etme, düzeltme veya silme talep etme haklarına sahipsiniz.

Başvurular: bromakagency@gmail.com`} />
        </LegalModal>
      )}

      {/* ── Gizlilik ── */}
      {activeModal === 'gizlilik' && (
        <LegalModal title="Gizlilik Politikası" icon={<ShieldCheck className="w-4 h-4" />} onClose={close}>
          <TextBody text={`GİZLİLİK POLİTİKASI

milyonlukpiksel.com, kullanıcılarının gizliliğini önemser ve kişisel verilerin korunmasına azami özen gösterir.

1. Toplanan Bilgiler
İletişim bilgileri (e-posta vb.), teknik veriler (IP adresi, tarayıcı bilgisi), kullanıcı tarafından yüklenen içerikler.

2. Bilgilerin Kullanımı
Toplanan bilgiler; hizmet sunmak, kullanıcı deneyimini geliştirmek ve teknik sorunları çözmek amacıyla kullanılır.

3. Üçüncü Taraflar
Kullanıcı bilgileri; ödeme sağlayıcıları ve teknik altyapı hizmetleri dışında üçüncü kişilerle paylaşılmaz.

4. Veri Güvenliği
Site, kullanıcı verilerini korumak için gerekli teknik önlemleri almaktadır. Ancak internet ortamında %100 güvenlik garanti edilemez.

5. Harici Bağlantılar
Site üzerinden yönlendirilen bağlantıların içeriklerinden site sorumlu değildir.`} />
        </LegalModal>
      )}

      {/* ── Çerez Politikası ── */}
      {activeModal === 'cerez' && (
        <LegalModal title="Çerez Politikası" icon={<Cookie className="w-4 h-4" />} onClose={close}>
          <TextBody text={`ÇEREZ POLİTİKASI

milyonlukpiksel.com, kullanıcı deneyimini geliştirmek amacıyla çerezler kullanmaktadır.

1. Çerez Nedir?
Çerezler, ziyaret edilen web siteleri tarafından tarayıcınıza kaydedilen küçük veri dosyalarıdır.

2. Kullanılan Çerez Türleri
Zorunlu çerezler (site çalışması için) ve analitik çerezler (ziyaretçi istatistikleri için).

3. Çerezlerin Kullanım Amaçları
Site performansını artırmak ve kullanıcı deneyimini geliştirmek amacıyla kullanılır.

4. Çerez Kontrolü
Kullanıcılar, tarayıcı ayarlarından çerezleri kontrol edebilir veya silebilir.`} />
        </LegalModal>
      )}
    </>
  );
}
