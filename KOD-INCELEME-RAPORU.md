# Milyonluk Piksel - Detaylı Kod İnceleme Raporu

Projeyi inceledim. Ödeme akışı, piksel alma, grid, admin panel ve veritabanı şemasını kontrol ettim. İşte tespit ettiğim sorunlar ve problemler.

---

## 🔴 KRİTİK SORUNLAR

### 1. Image Proxy Güvenlik Kontrolü Devre Dışı
**Dosya:** `server.ts:943`

```typescript
if (false && !imageUrl.startsWith('https://cdn.milyonlukpiksel.com')...
```

`if (false)` ile başlayan satır, domain kısıtlamasını tamamen devre dışı bırakıyor. **Herhangi bir URL** proxy üzerinden geçirilebilir. Bu ciddi bir güvenlik açığıdır.

---

### 2. PayTR Test Mode Prod Risk
**Dosya:** `server.ts:651-652`

```typescript
const test_mode = process.env.PAYTR_TEST_MODE || (process.env.NODE_ENV === 'production' ? '0' : '1');
```

NODE_ENV production'da test mode açık kalabilir. PAYTR_TEST_MODE env variable'ı set edilmezse beklenmedik davranış olabilir. Production ortamında test modu aktif kalırsa ödemeler gerçek transaction olarak işlenmeyebilir veya PayTR test geçişleri görülebilir.

---

### 3. PayTR Callback Rate Limit Yok
**Dosya:** `server.ts:727`

Webhook endpoint'inde rate limiting yok. Saldırı veya abuse riski mevcut. Token brute-force veya callback flooding koruması eksik.

---

### 4. Duplicate E-posta Bildirimi
**Dosya:** `server.ts:497` ve `server.ts:842`

Ödeme başarılı olduğunda `emailService.sendNewPixelNotification` iki kez çağrılıyor:
- `server.ts:497` - admin panel üzerinden pixel oluşturulduğunda
- `server.ts:842` - PayTR callback'te ödeme onaylandığında

Aynı satış için çift email gönderimi olabilir.

---

## 🟠 YÜKSEK ÖNCELİKLİ

### 5. localStorage Bağımlılığı - Başarısız Ödeme Ekranı Kırılganlığı
**Dosya:** `Modal/index.tsx:269-278`

```typescript
const tempId = 'PXL-' + Math.random().toString(16).substring(2, 6).toUpperCase() + '-' + Math.random().toString(16).substring(2, 6).toUpperCase();
localStorage.setItem('lastPurchasedId', tempId);
localStorage.setItem('lastMerchantOid', res.oid);
```

Ödeme başarılı olduktan sonra, kullanıcı başarı sayfasına ulaşmadan önce localStorage temizlenirse, başarı ekranı çalışmaz ve kullanıcı ana sayfaya yönlendirilir. Kritik bir kırılganlık.

---

### 6. Merchant OID Validation Uyumsuzluğu
**Dosya:** `server.ts:883`

```typescript
if (!/^MP\d+[A-F0-9]{8}$/.test(oid))  // Regex
// Ama oid şöyle oluşuyor:
const merchant_oid = 'MP' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();
// Date.now() = 13+ haneli, + 8 hane hex = 21+ karakter
```

Regex `MP` + sadece digit + 8 hex karakter bekliyor ama gerçek oid çok daha uzun. **Bu validation işlevsiz ve tamamen rastgele çalışıyor.** Örneğin:
- Regex: `MP1234567890123ABCDEF` (21 karakter - geçersiz)
- Gerçek OID: `MP1746134567890A1B2C3D4E5F6` (25 karakter - geçersiz)

---

### 7. Hardcoded Sahte Telefon Numarası
**Dosya:** `server.ts:643`

```typescript
const user_phone = '05555555555';
```

PayTR'ye gönderilen bu numara, fraud detection'a takılabilir veya gerçek ödeme işlemlerinde sorun yaratabilir.

---

### 8. JWT Secret'ta Hardcoded Fallback
**Dosya:** `adminService.ts:40-41, 50-51`

```typescript
const secret = JWT_SECRET || 'fallback-secret-change-in-production';
```

Production'da JWT_SECRET set edilmezse, güvensiz fallback kullanılır. Bu durumda token kolayca çözülebilir.

---

### 9. Müşteriye Ödeme Sonrası E-posta Gönderilmiyor
**Dosya:** `server.ts`

`sellerService.sendPixelApprovedNotification` fonksiyonu tanımlı (`server/services/emailService.ts:87-127`) ama **hiçbir yerde çağrılmıyor**. Müşteri ödeme sonrası onay e-postası almıyor.

---

## 🟡 ORTA ÖNCELİKLİ

### 10. Grid Dimenison Hesaplama Tutarsızlığı
**Dosyalar:** `server.ts:595`, `supabase.ts:218`, `usePixels.ts:7`

```typescript
// server.ts:595 ve supabase.ts:218
acc + (p.w * 10 * p.h * 10)  // Backend

// usePixels.ts:7
p.w * 10 * p.h * 10  // Frontend
```

Aynı hesaplama 3 farklı yerde yazılmış. Tek bir utility function olmalı. Şu anda farklı dosyalarda farklı şekillerde hesaplanıyor.

---

### 11. Email Validation After Token Request
**Dosya:** `server.ts:114-124`

`validatePurchasePayload` email'i normalize edip küçük harfe çeviriyor ama sonra tekrar regex check yapılıyor. Validation'da tutarsızlık mevcut.

---

### 12. Admin Stats Hesaplaması Şüpheli
**Dosya:** `Admin.tsx:549-550`

```typescript
<p>{(stats.soldPixels / 100).toLocaleString()}</p>
```

Burada `soldPixels` zaten piksel sayısı (w*10*h*10) cinsinden. Bölü 100 ne anlama geliyor? Blok sayısına çevirmek istiyorsa `soldPixels / 100` doğru görünüyor. Ama bu kasıtlı mı emin değilim.

---

### 13. PaymentResult Encoding Hatası
**Dosya:** `PaymentResult.tsx:211, 225`

```typescript
alert('Logo hazırlanıyor. Lütfen birkaç saniye sonra tekrar deneyin.');
alert('Kart indirilirken bir hata oluştu. Lütfen farklı bir tarayıcıda deneyin.');
```

Türkçe karakterler bozulmuş - encoding problemi. Dosya UTF-8 olarak kaydedilmemiş olabilir.

---

### 14. API_URL Fallback Logic
**Dosya:** `Modal/index.tsx:16`

```typescript
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
```

Production'da VITE_API_URL set edilmezse boş string olur ve API call'ları başarısız olur.

---

### 15. Proxy Image Content-Length Yanıltıcı
**Dosya:** `server.ts:957`

```typescript
const contentLength = Number(response.headers.get('content-length') || 0);
```

Header kolaylıkla manipüle edilebilir. Gerçek boyut kontrolü dosya yüklendikten sonra (`server.ts:961-967`) yapılıyor ama header'a güvenmek yanıltıcı olabilir.

---

## 🔵 DÜŞÜK ÖNCELİKLİ / BUGS

### 16. Dead Code - clampWarning
**Dosya:** `Modal/index.tsx`

`setClampWarning` kullanılıyor ama UI'da render edilmiyor. Kullanılmayan state.

---

### 17. Alert'te Encoding Hatası
**Dosya:** `PaymentResult.tsx:211, 225`

Yukarıda belirtildi - Türkçe karakter problemi.

---

### 18. SalesFeed Fallback Data
**Dosya:** `SalesFeed/index.tsx`

Gerçek satış yoksa placeholder'lar gösteriliyor ama bunlar statik string - "Milyonluk Piksel" vs gerçek satış logları değil. Fallback data satış bilgisi içermiyor.

---

### 19. Iframe Resizer Timeout Kullanıcıya Bildirilmiyor
**Dosya:** `Modal/index.tsx:111`

```typescript
console.warn('PayTR iFrame resizer başlatılamadı.');
```

Sadece console log atılıyor, kullanıcıya timeout hakkında bilgi verilmiyor.

---

### 20. PayTR Token Expire Süresi Yok
Token'ın ne kadar geçerli olduğu bilinmiyor. Kullanıcı ödeme sayfasında beklerken token expire olursa ne olur?

---

### 21. Payment Status Polling Sonrası Zayıf Bilgilendirme
**Dosya:** `PaymentResult.tsx:76-80`

10 denemeden sonra direkt failed'e atlayıp kullanıcıya bankanın onay vermediğini söylüyor ama aslında daha fazla bekleme şansı olabilir.

---

## 📊 VERİTABANI ŞEMA NOTLARI

### `pixels_location_idx` Unique Index Yetersiz
**Dosya:** `schema.sql:24`

```sql
CREATE UNIQUE INDEX pixels_location_idx ON pixels (x, y);
```

Sadece sol üst koordinatı kapsıyor. w ve h'yi içermiyor. Overlap trigger'ı ile birlikte çalışıyor ama index tek başına yeterli değil.

---

### Trigger'lar Doğru Tanımlanmış
- `check_pixel_overlap` - overlap kontrolü ✓
- `check_order_overlap` - race condition koruması ✓

---

### Orders Tablo Eksiklikleri
- `customer_name` field var ama kullanılmıyor
- `address` field yok (PayTR'ye gönderiliyor ama DB'de kayıtlı değil)

---

## 📌 ÖZET TABLOSU

| # | Sorun | Öncelik | Dosya: Satır |
|---|-------|---------|--------------|
| 1 | Proxy güvenlik devre dışı | 🔴 Kritik | server.ts:943 |
| 2 | Test mode prod risk | 🔴 Kritik | server.ts:651 |
| 3 | Callback rate limit yok | 🔴 Kritik | server.ts:727 |
| 4 | Duplicate email bildirimi | 🟠 Yüksek | server.ts:497,842 |
| 5 | localStorage kırılganlığı | 🟠 Yüksek | Modal/index.tsx:269 |
| 6 | OID validation regex hatalı | 🟠 Yüksek | server.ts:883 |
| 7 | Hardcoded telefon | 🟠 Yüksek | server.ts:643 |
| 8 | JWT fallback güvensiz | 🟠 Yüksek | adminService.ts:40 |
| 9 | Müşteri email yok | 🟠 Yüksek | server.ts (genel) |
| 10 | Dimension hesap tutarsızlığı | 🟡 Orta | 3 farklı dosya |
| 11 | Email validation tutarsız | 🟡 Orta | server.ts:114 |
| 12 | Admin stats hesap şüpheli | 🟡 Orta | Admin.tsx:549 |
| 13 | Encoding hatası | 🟡 Orta | PaymentResult.tsx:211 |
| 14 | API_URL boş string riski | 🟡 Orta | Modal/index.tsx:16 |
| 15 | Content-length header güven | 🟡 Orta | server.ts:957 |
| 16 | Dead code clampWarning | 🔵 Düşük | Modal/index.tsx |
| 17 | Encoding hatası (UI) | 🔵 Düşük | PaymentResult.tsx |
| 18 | SalesFeed fallback | 🔵 Düşük | SalesFeed/index.tsx |
| 19 | Iframe resizer timeout | 🔵 Düşük | Modal/index.tsx:111 |
| 20 | Token expire süresi | 🔵 Düşük | Modal/index.tsx |
| 21 | Polling sonrası bilgilendirme | 🔵 Düşük | PaymentResult.tsx |

---

## ✅ DOĞRU ÇALIŞAN ŞEYLER

- PayTR entegrasyonu genel yapısı
- Pixel overlap trigger'ları (veritabanı seviyesinde koruma)
- Realtime subscription'lar (Supabase)
- Grid canvas render'ı ve zoom
- Form validation
- Fiyat hesaplama (KDV dahil)
- Admin panel genel yapısı

---

## 🔧 ÖNERİLEN İYİLEŞTİRMELER SIRALAMASI

1. **Hemen düzeltilmeli:** `if (false)` proxy kontrolünü kaldır (server.ts:943)
2. **Hemen düzeltilmeli:** OID regex'i düzelt (server.ts:883)
3. **Hemen düzeltilmeli:** PAYTR_TEST_MODE env'i explicit olarak kontrol et
4. **Yüksek öncelik:** localStorage yerine sessionStorage veya URL parametreleri kullan
5. **Yüksek öncelik:** Müşteri onay e-postası gönderimini entegre et
6. **Orta öncelik:** Tekrar eden dimension hesaplamalarını tek bir util function'a taşı
7. **Orta öncelik:** Türkçe encoding hatası düzelt (PaymentResult.tsx)

---

*Bu rapor inceleme amacıyla hazırlanmıştır. Hiçbir değişiklik yapılmamıştır.*