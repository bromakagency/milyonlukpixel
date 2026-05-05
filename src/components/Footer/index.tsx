import { useState, ReactNode } from 'react';
import {
  Cookie,
  FileText,
  Info,
  Instagram,
  Mail,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Twitter,
} from 'lucide-react';

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

const CONTACT_EMAIL = 'milyonlukpiksel@gmail.com';
const X_URL = 'https://x.com/MilyonlukPiksel';
const INSTAGRAM_URL = 'https://www.instagram.com/milyonlukpikselcom';

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

function TextBody({ text }: { text: string }) {
  const lines = text.trim().split('\n');

  return (
    <div>
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return null;

        if (line === line.toUpperCase() && line.length < 70 && !/^\d+\./.test(line)) {
          return (
            <h2 key={index} className="font-display font-black text-lg uppercase mb-3 border-b-2 border-black pb-1">
              {line}
            </h2>
          );
        }

        if (/^\d+\. /.test(line)) {
          return (
            <h3 key={index} className="font-bold font-mono text-sm uppercase mt-4 mb-1 text-black">
              {line}
            </h3>
          );
        }

        return (
          <p key={index} className="text-gray-700 mb-2">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function ContactLinks() {
  return (
    <div className="space-y-1">
      <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 font-mono text-sm hover:text-red-600 transition-colors">
        <Mail className="w-3 h-3" /> {CONTACT_EMAIL}
      </a>
      <a href={X_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-mono text-sm hover:text-red-600 transition-colors">
        <Twitter className="w-3 h-3" /> x.com/MilyonlukPiksel
      </a>
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-mono text-sm hover:text-red-600 transition-colors">
        <Instagram className="w-3 h-3" /> instagram.com/milyonlukpikselcom
      </a>
    </div>
  );
}

export function Footer() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const close = () => setActiveModal(null);

  const links: [ModalType, string][] = [
    ['hakkimizda', 'Hakkımızda'],
    ['iletisim', 'İletişim'],
    ['on-bilgilendirme', 'Ön Bilgilendirme'],
    ['mesafeli-satis', 'Mesafeli Satış'],
    ['iptal-iade', 'İptal / İade'],
    ['kvkk', 'KVKK'],
    ['gizlilik', 'Gizlilik'],
    ['cerez', 'Çerez'],
  ];

  return (
    <>
      <footer className="w-full border-t-2 border-black bg-white pt-2 pb-3 px-4">
        <div className="max-w-5xl mx-auto space-y-1">
          <p className="font-mono text-[10px] text-gray-400 text-center">© {new Date().getFullYear()} Milyonluk Piksel</p>

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            {links.map(([id, label], index) => (
              <span key={id} className="flex items-center gap-3">
                <button
                  onClick={() => setActiveModal(id)}
                  className="font-mono text-[10px] text-gray-400 hover:text-red-600 transition-colors"
                >
                  {label}
                </button>
                {index < links.length - 1 && <span className="text-gray-200 text-[10px]">·</span>}
              </span>
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <img
              src="/images/PayTR_logo.svg"
              alt="PayTR Güvenli Ödeme"
              className="h-5 opacity-40 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
            />
          </div>
        </div>
      </footer>

      {activeModal === 'hakkimizda' && (
        <LegalModal title="Hakkımızda" icon={<Info className="w-4 h-4" />} onClose={close}>
          <p className="text-gray-800 mb-4">
            <span className="font-bold text-black">Milyonluk Piksel</span>, markaların ve projelerin dijital görünürlüğünü
            artırmak için oluşturulmuş piksel reklam platformudur.
          </p>
          <div className="border-l-4 border-[#ffd700] pl-4 bg-[#fffdf0] py-3 pr-3">
            <p className="text-gray-700">
              Satın alınan alanlar; görsel, bağlantı ve açıklama metniyle birlikte ödeme sonrasında yayınlanır.
              Platform kurallarına aykırı içerikler yayından kaldırılabilir.
            </p>
          </div>
          <button onClick={() => setActiveModal('iletisim')} className="mt-4 font-mono text-xs font-bold underline hover:text-red-600 transition-colors block">
            → İletişim kanallarımız için tıklayın
          </button>
        </LegalModal>
      )}

      {activeModal === 'iletisim' && (
        <LegalModal title="İletişim" icon={<Mail className="w-4 h-4" />} onClose={close}>
          <div className="space-y-3">
            <div className="border-2 border-black p-4 bg-[#f4f4f0]">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">Resmi Bilgiler</span>
              <div className="font-mono text-sm space-y-1 mt-2">
                <p><span className="text-gray-500">Marka:</span> <b>Milyonluk Piksel</b></p>
                <p><span className="text-gray-500">Web:</span> milyonlukpiksel.com</p>
              </div>
            </div>
            <div className="border-2 border-black p-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">Bize Ulaşın</span>
              <ContactLinks />
            </div>
          </div>
        </LegalModal>
      )}

      {activeModal === 'on-bilgilendirme' && (
        <LegalModal title="Ön Bilgilendirme Formu" icon={<ScrollText className="w-4 h-4" />} onClose={close}>
          <TextBody text={`ÖN BİLGİLENDİRME FORMU

İşbu Ön Bilgilendirme Formu, milyonlukpiksel.com üzerinden sunulan dijital reklam alanı hizmetine ilişkin olarak, alıcıya mesafeli sözleşme kurulmadan önce bilgi verilmesi amacıyla hazırlanmıştır.

1. Sağlayıcı Bilgileri
Marka: Milyonluk Piksel
Web: milyonlukpiksel.com
E-posta: ${CONTACT_EMAIL}
X: ${X_URL}
Instagram: instagram.com/milyonlukpikselcom

2. Hizmetin Konusu
milyonlukpiksel.com üzerinden kullanıcıların seçtiği piksel alanlarının, kullanıcı tarafından sağlanan görsel, bağlantı adresi ve kısa açıklama metni ile birlikte dijital reklam alanı olarak yayınlanması hizmetidir.

3. Hizmetin Temel Nitelikleri
Satış, toplam 1.000.000 piksellik alan içinde 10x10 bloklar halinde yapılır. Her blok 10x10 piksel boyutundadır. Yayınlama işlemi ödeme sonrasında gerçekleştirilir.

4. Fiyatlandırma
Toplam ücret seçilen blok sayısına göre ödeme öncesinde sistem üzerinde gösterilir.

5. İfa / Yayın Süreci
Ödeme tamamlandıktan sonra içerik yayına alınır. Platform kurallarına aykırı olduğu tespit edilen içerikler yayından kaldırılabilir.

6. Cayma Hakkı
Dijital ortamda ifa edilen ve kişiselleştirilmiş içerik içeren hizmetlerde cayma hakkı mevzuattaki istisnalar kapsamında değerlendirilebilir.

7. Şikayet ve İletişim
Alıcı taleplerini ${CONTACT_EMAIL} adresine veya resmi sosyal medya hesaplarına iletebilir.

8. Onay
Alıcı, ödeme öncesinde bu formu okuyup anladığını ve elektronik ortamda onayladığını kabul eder.`} />
        </LegalModal>
      )}

      {activeModal === 'mesafeli-satis' && (
        <LegalModal title="Mesafeli Satış Sözleşmesi" icon={<FileText className="w-4 h-4" />} onClose={close}>
          <TextBody text={`MESAFELİ SATIŞ SÖZLEŞMESİ

1. Taraflar
İşbu sözleşme, Milyonluk Piksel ile milyonlukpiksel.com üzerinden hizmet satın alan alıcı arasında elektronik ortamda kurulmuştur.

Sağlayıcı İletişim Bilgileri
E-posta: ${CONTACT_EMAIL}
X: ${X_URL}
Instagram: instagram.com/milyonlukpikselcom

2. Sözleşmenin Konusu
Alıcının seçtiği piksel reklam alanının, alıcının sağladığı içerik doğrultusunda dijital ortamda yayınlanması hizmetinin şart ve koşullarının belirlenmesidir.

3. Hizmetin Kapsamı
Hizmet, 10x10 bloklar halinde piksel alanı tahsisini kapsar. Alıcı görsel, bağlantı adresi ve kısa açıklama metni sağlar.

4. Ücret ve Ödeme
Hizmet bedeli seçilen blok sayısına göre sistem üzerinde gösterilir. Ödeme, site üzerinde sunulan ödeme yöntemleriyle tahsil edilir.

5. Yayın Onayı ve İçerik Politikası
Hukuka aykırı, yanıltıcı, müstehcen, +18, nefret söylemi, yasa dışı bahis/kumar, fikri mülkiyet ihlali içeren içerikler kabul edilmez. İçeriğe ilişkin tüm hukuki sorumluluk alıcıya aittir.

6. Yayın Süresi
Satın alınan piksel alanı, milyonlukpiksel.com aktif kaldığı sürece yayında tutulur. Bu ifade belirli bir süre veya ömür boyu garanti anlamına gelmez.

7. Alıcının Sorumlulukları
Alıcı, sağladığı görsel, metin ve bağlantının kullanım hakkına sahip olduğunu kabul eder.

8. Sorumluluğun Sınırı
Teknik bakım, sunucu kesintisi, siber saldırı, altyapı arızası veya mücbir sebep kaynaklı aksamalardan dolayı platform sorumlu tutulamaz.

9. Cayma Hakkı / İptal / İade
Cayma, iptal ve iade şartları İptal / İade / Cayma Hakkı Politikası ile birlikte uygulanır.

10. Uyuşmazlık
Uyuşmazlıklarda Türk Hukuku uygulanır.

11. Yürürlük
Alıcı, ödeme işlemini tamamlayarak işbu sözleşmenin koşullarını kabul etmiş sayılır.`} />
        </LegalModal>
      )}

      {activeModal === 'iptal-iade' && (
        <LegalModal title="İptal / İade / Cayma Hakkı" icon={<RotateCcw className="w-4 h-4" />} onClose={close}>
          <TextBody text={`İPTAL / İADE / CAYMA HAKKI POLİTİKASI

milyonlukpiksel.com üzerinden sunulan hizmet; dijital reklam alanı tahsisi ve kullanıcı tarafından sağlanan görsel, bağlantı ve açıklama metni ile kişiselleştirilmiş yayın hizmetidir.

Mesafeli sözleşmelerde tüketiciye genel olarak 14 gün cayma hakkı tanınır. Bununla birlikte kişiselleştirilmiş ve elektronik ortamda ifa edilen dijital hizmetlerde mevzuat kapsamında istisnalar bulunabilir.

Yayınlanması yasak veya sınırlı içerik örnekleri
Yasa dışı içerikler, +18 içerikler, üçüncü kişi haklarını ihlal eden içerikler, yanıltıcı bağlantılar, zararlı yazılım veya dolandırıcılık amaçlı yönlendirmeler kabul edilmez.

İletişim
İptal / iade talepleri için: ${CONTACT_EMAIL}
X: ${X_URL}
Instagram: instagram.com/milyonlukpikselcom`} />
        </LegalModal>
      )}

      {activeModal === 'kvkk' && (
        <LegalModal title="KVKK Aydınlatma Metni" icon={<ShieldCheck className="w-4 h-4" />} onClose={close}>
          <TextBody text={`KİŞİSEL VERİLERİN KORUNMASI AYDINLATMA METNİ

Bu aydınlatma metni, milyonlukpiksel.com üzerinden sunulan hizmetler kapsamında işlenen kişisel verilere ilişkin hazırlanmıştır.

1. Veri Sorumlusu İletişim
Marka: Milyonluk Piksel
E-posta: ${CONTACT_EMAIL}
X: ${X_URL}
Instagram: instagram.com/milyonlukpikselcom

2. İşlenen Kişisel Veriler
E-posta adresi, IP adresi ve işlem güvenliği bilgileri, yüklenen görseller ve içerik verileri, ödeme ve işlem bilgileri.

3. Kişisel Verilerin İşlenme Amaçları
Hizmet sunulması, kullanıcı ile iletişim kurulması, ödeme işlemlerinin gerçekleştirilmesi, hukuki yükümlülüklerin yerine getirilmesi, güvenlik ve dolandırıcılık önleme.

4. Verilerin Aktarımı
Kişisel veriler ödeme altyapısı sağlayıcılarına ve yasal yükümlülükler kapsamında yetkili kurumlara aktarılabilir.

5. Veri Toplama Yöntemi
Kişisel veriler site üzerindeki formlar ve kullanıcı işlemleri aracılığıyla elektronik ortamda toplanır.

6. KVKK Kapsamındaki Haklarınız
KVKK'nın 11. maddesi kapsamındaki başvurularınızı ${CONTACT_EMAIL} adresine iletebilirsiniz.`} />
        </LegalModal>
      )}

      {activeModal === 'gizlilik' && (
        <LegalModal title="Gizlilik Politikası" icon={<ShieldCheck className="w-4 h-4" />} onClose={close}>
          <TextBody text={`GİZLİLİK POLİTİKASI

milyonlukpiksel.com, kullanıcılarının gizliliğini önemser ve kişisel verilerin korunmasına özen gösterir.

1. Toplanan Bilgiler
İletişim bilgileri, teknik veriler, kullanıcı tarafından yüklenen içerikler ve ödeme işlem bilgileri.

2. Bilgilerin Kullanımı
Toplanan bilgiler hizmet sunmak, kullanıcı deneyimini geliştirmek, güvenliği sağlamak ve teknik sorunları çözmek amacıyla kullanılır.

3. Üçüncü Taraflar
Kullanıcı bilgileri ödeme sağlayıcıları ve teknik altyapı hizmetleri dışında üçüncü kişilerle paylaşılmaz.

4. Veri Güvenliği
Site, kullanıcı verilerini korumak için gerekli teknik önlemleri alır. İnternet ortamında yüzde 100 güvenlik garanti edilemez.

5. Harici Bağlantılar
Site üzerinden yönlendirilen bağlantıların içeriklerinden site sorumlu değildir.`} />
        </LegalModal>
      )}

      {activeModal === 'cerez' && (
        <LegalModal title="Çerez Politikası" icon={<Cookie className="w-4 h-4" />} onClose={close}>
          <TextBody text={`ÇEREZ POLİTİKASI

milyonlukpiksel.com, kullanıcı deneyimini geliştirmek amacıyla çerezler kullanabilir.

1. Çerez Nedir?
Çerezler, ziyaret edilen web siteleri tarafından tarayıcınıza kaydedilen küçük veri dosyalarıdır.

2. Kullanılan Çerez Türleri
Zorunlu çerezler ve analitik çerezler kullanılabilir.

3. Çerezlerin Kullanım Amaçları
Site performansını artırmak ve kullanıcı deneyimini geliştirmek amacıyla kullanılır.

4. Çerez Kontrolü
Kullanıcılar tarayıcı ayarlarından çerezleri kontrol edebilir veya silebilir.`} />
        </LegalModal>
      )}
    </>
  );
}
