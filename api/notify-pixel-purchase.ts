import { Resend } from 'resend';

interface PixelOrderEmail {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  amount: number;
}

function isPixelOrderEmail(value: unknown): value is PixelOrderEmail {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.title === 'string' &&
    typeof body.x === 'number' &&
    typeof body.y === 'number' &&
    typeof body.w === 'number' &&
    typeof body.h === 'number' &&
    typeof body.imageUrl === 'string' &&
    typeof body.linkUrl === 'string' &&
    typeof body.amount === 'number'
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const fromEmail = process.env.FROM_EMAIL;

  if (!apiKey || !adminEmail || !fromEmail) {
    res.status(500).json({ error: 'E-posta ayarları eksik' });
    return;
  }

  if (!isPixelOrderEmail(req.body)) {
    res.status(400).json({ error: 'Geçersiz istek verisi' });
    return;
  }

  const recipients = adminEmail
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    res.status(500).json({ error: 'ADMIN_EMAIL geçersiz' });
    return;
  }

  const pixel = req.body;
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject: `Yeni Pixel Satın Alındı: ${pixel.title}`,
      html: `
        <!doctype html>
        <html lang="tr">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Yeni Pixel Satın Alındı</title>
          </head>
          <body style="margin:0;padding:0;">
        <div style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
            <div style="padding:24px 28px;background:linear-gradient(135deg,#111827 0%,#1f2937 60%,#ef4444 100%);">
              <p style="margin:0 0 8px 0;color:#d1d5db;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Milyonluk Pixel</p>
              <h2 style="margin:0;color:#ffffff;font-size:26px;line-height:1.2;font-weight:800;">Yeni Pixel Satın Alındı</h2>
              <p style="margin:10px 0 0 0;color:#f3f4f6;font-size:14px;">Yeni bir satın alma işlemi gerçekleşti. Detaylar aşağıda.</p>
            </div>

            <div style="padding:24px 28px;">
              <div style="display:inline-block;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;letter-spacing:0.02em;">
                SATIŞ BİLDİRİMİ
              </div>

              <h3 style="margin:16px 0 6px 0;font-size:24px;line-height:1.2;color:#111827;">${pixel.title || 'İsimsiz'}</h3>
              <p style="margin:0 0 20px 0;color:#6b7280;font-size:14px;">Pixel alanı başarıyla rezerve edildi.</p>

              <div style="background:#111827;border-radius:14px;padding:18px 20px;margin-bottom:18px;">
                <p style="margin:0 0 8px 0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Toplam Tutar</p>
                <p style="margin:0;color:#ffffff;font-size:34px;line-height:1;font-weight:800;">TL${pixel.amount.toLocaleString('tr-TR')}</p>
              </div>

              <table style="width:100%;border-collapse:separate;border-spacing:0 10px;">
                <tr>
                  <td style="width:38%;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-right:none;border-radius:10px 0 0 10px;color:#6b7280;font-size:14px;">Konum</td>
                  <td style="padding:12px 14px;background:#ffffff;border:1px solid #e5e7eb;border-left:none;border-radius:0 10px 10px 0;color:#111827;font-size:14px;font-weight:700;">X: ${pixel.x * 10}, Y: ${pixel.y * 10}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-right:none;border-radius:10px 0 0 10px;color:#6b7280;font-size:14px;">Boyut</td>
                  <td style="padding:12px 14px;background:#ffffff;border:1px solid #e5e7eb;border-left:none;border-radius:0 10px 10px 0;color:#111827;font-size:14px;font-weight:700;">${pixel.w * 10}x${pixel.h * 10} px</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-right:none;border-radius:10px 0 0 10px;color:#6b7280;font-size:14px;">Alan</td>
                  <td style="padding:12px 14px;background:#ffffff;border:1px solid #e5e7eb;border-left:none;border-radius:0 10px 10px 0;color:#111827;font-size:14px;font-weight:700;">${pixel.w * pixel.h} blok</td>
                </tr>
              </table>

              <div style="margin-top:22px;padding:16px;border:1px dashed #d1d5db;border-radius:12px;background:#fcfcfd;">
                <p style="margin:0 0 10px 0;color:#111827;font-size:13px;font-weight:700;">Bağlantılar</p>
                <p style="margin:0 0 8px 0;font-size:13px;color:#374151;"><strong>Görsel:</strong> <a href="${pixel.imageUrl}" style="color:#2563eb;text-decoration:none;">${pixel.imageUrl}</a></p>
                <p style="margin:0;font-size:13px;color:#374151;"><strong>Link:</strong> <a href="${pixel.linkUrl}" style="color:#2563eb;text-decoration:none;">${pixel.linkUrl}</a></p>
              </div>
            </div>

            <div style="padding:14px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#6b7280;font-size:12px;">Bu bildirim otomatik gönderildi.</p>
            </div>
          </div>
        </div>
          </body>
        </html>
      `,
    });

    if (error) {
      res.status(502).json({ error: error.message || 'E-posta gönderilemedi' });
      return;
    }

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Beklenmeyen e-posta hatası' });
  }
}
