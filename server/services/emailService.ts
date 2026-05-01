import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bromakagency@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Milyonluk Pixel <noreply@milyonlukpixel.com>';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

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

export const emailService = {
  async sendNewPixelNotification(pixel: PixelOrderEmail): Promise<boolean> {
    if (!RESEND_API_KEY || !resend) {
      console.log('RESEND_API_KEY not set, skipping email');
      return false;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `Yeni Pixel Satın Alındı: ${pixel.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Yeni Pixel Satın Alındı!</h2>
            
            <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${pixel.title || 'İsimsiz'}</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Konum:</td>
                  <td style="padding: 8px 0; font-weight: bold;">X: ${pixel.x * 10}, Y: ${pixel.y * 10}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Boyut:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${pixel.w * 10}x${pixel.h * 10} px</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Alan:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${pixel.w * pixel.h} blok</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Tutar:</td>
                  <td style="padding: 8px 0; font-weight: bold; font-size: 18px;">₺${pixel.amount.toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Görsel:</strong> <a href="${pixel.imageUrl}">${pixel.imageUrl}</a></p>
              <p style="margin: 5px 0;"><strong>Link:</strong> <a href="${pixel.linkUrl}">${pixel.linkUrl}</a></p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            
            <p style="color: #666; font-size: 12px;">
              Bu email Milyonluk Pixel sitesinden otomatik olarak gönderilmiştir.<br/>
              Tarih: ${new Date().toLocaleString('tr-TR')}
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        return false;
      }

      console.log('Email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  },

  async sendPixelApprovedNotification(pixel: PixelOrderEmail, customerEmail: string): Promise<boolean> {
    if (!customerEmail || !RESEND_API_KEY || !resend) return false;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `Pixel Talepleriniz Onaylandı: ${pixel.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #22c55e;">Pixel Talepleriniz Onaylandı!</h2>
            
            <p>Merhaba,</p>
            <p>Satın aldığınız pixel artık sitede yayında!</p>
            
            <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${pixel.title}</h3>
              <p style="color: #666; margin: 0;">Konum: X: ${pixel.x * 10}, Y: ${pixel.y * 10} | Boyut: ${pixel.w * 10}x${pixel.h * 10} px</p>
            </div>
            
            <p>Sitemizi ziyaret ederek pixelinizi görebilirsiniz.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">
              Milyonluk Pixel
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  },
};