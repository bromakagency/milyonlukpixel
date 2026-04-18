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
    res.status(500).json({ error: 'Email ayarlari eksik' });
    return;
  }

  if (!isPixelOrderEmail(req.body)) {
    res.status(400).json({ error: 'Gecersiz istek verisi' });
    return;
  }

  const recipients = adminEmail
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    res.status(500).json({ error: 'ADMIN_EMAIL gecersiz' });
    return;
  }

  const pixel = req.body;
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject: `Yeni Pixel Satin Alindi: ${pixel.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Yeni Pixel Satin Alindi!</h2>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">${pixel.title || 'Isimsiz'}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666;">Konum:</td><td style="padding: 8px 0; font-weight: bold;">X: ${pixel.x * 10}, Y: ${pixel.y * 10}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Boyut:</td><td style="padding: 8px 0; font-weight: bold;">${pixel.w * 10}x${pixel.h * 10} px</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Alan:</td><td style="padding: 8px 0; font-weight: bold;">${pixel.w * pixel.h} blok</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Tutar:</td><td style="padding: 8px 0; font-weight: bold; font-size: 18px;">TL${pixel.amount.toLocaleString()}</td></tr>
            </table>
          </div>
          <div style="margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Gorsel:</strong> <a href="${pixel.imageUrl}">${pixel.imageUrl}</a></p>
            <p style="margin: 5px 0;"><strong>Link:</strong> <a href="${pixel.linkUrl}">${pixel.linkUrl}</a></p>
          </div>
        </div>
      `,
    });

    if (error) {
      res.status(502).json({ error: error.message || 'Mail gonderilemedi' });
      return;
    }

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Beklenmeyen mail hatasi' });
  }
}
