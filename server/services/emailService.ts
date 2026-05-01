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
          <div style="background-color: #f4f4f0; padding: 30px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 3px solid #000000; box-shadow: 8px 8px 0px #000000;">
              <!-- Header -->
              <div style="background-color: #ffd700; border-bottom: 3px solid #000000; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #000000;">
                  YENİ PİKSEL SATIŞI
                </h1>
              </div>

              <!-- Body -->
              <div style="padding: 30px;">
                <p style="margin-top: 0; font-size: 16px; line-height: 1.5; color: #000000;">
                  Bir kullanıcı yeni bir piksel alanı satın aldı. Detaylar aşağıdadır:
                </p>

                <div style="border: 2px solid #000000; background-color: #f9f9f9; padding: 20px; margin: 25px 0;">
                  <h2 style="margin-top: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 10px;">
                    ${pixel.title || 'İsimsiz Piksel'}
                  </h2>
                  
                  <table style="width: 100%; border-collapse: collapse; font-family: 'Courier New', Courier, monospace;">
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-size: 13px; text-transform: uppercase;">Konum:</td>
                      <td style="padding: 8px 0; font-weight: bold; font-size: 15px;">X: ${pixel.x * 10}, Y: ${pixel.y * 10}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-size: 13px; text-transform: uppercase;">Boyut:</td>
                      <td style="padding: 8px 0; font-weight: bold; font-size: 15px;">${pixel.w * 10}x${pixel.h * 10} px</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-size: 13px; text-transform: uppercase;">Alan:</td>
                      <td style="padding: 8px 0; font-weight: bold; font-size: 15px;">${pixel.w * pixel.h} Blok</td>
                    </tr>
                    <tr style="border-top: 1px solid #ddd;">
                      <td style="padding: 12px 0 0 0; color: #666; font-size: 13px; text-transform: uppercase;">Toplam Tutar:</td>
                      <td style="padding: 12px 0 0 0; font-weight: 900; font-size: 20px; color: #ef4444;">₺${pixel.amount.toLocaleString('tr-TR')}</td>
                    </tr>
                  </table>
                </div>

                <div style="margin: 25px 0; font-size: 14px;">
                  <p style="margin: 5px 0;"><strong>Görsel:</strong> <a href="${pixel.imageUrl}" style="color: #ef4444; text-decoration: underline;">${pixel.imageUrl.substring(0, 50)}...</a></p>
                  <p style="margin: 5px 0;"><strong>Hedef Link:</strong> <a href="${pixel.linkUrl}" style="color: #ef4444; text-decoration: underline;">${pixel.linkUrl}</a></p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #000000; color: #ffffff; padding: 15px; text-align: center; font-size: 11px; font-family: 'Courier New', Courier, monospace; text-transform: uppercase;">
                MİLYONLUK PİKSEL OTOMASYON SİSTEMİ | ${new Date().toLocaleDateString('tr-TR')}
              </div>
            </div>
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
          <div style="background-color: #f4f4f0; padding: 30px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 3px solid #000000; box-shadow: 8px 8px 0px #000000;">
              <!-- Header -->
              <div style="background-color: #ffd700; border-bottom: 3px solid #000000; padding: 25px; text-align: center;">
                <h1 style="margin: 0; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #000000;">
                  TEBRİKLER!
                </h1>
                <p style="margin: 10px 0 0 0; font-size: 14px; font-weight: bold; color: #000000; text-transform: uppercase;">
                  Pikseliniz Yayına Alındı
                </p>
              </div>

              <!-- Body -->
              <div style="padding: 30px;">
                <p style="margin-top: 0; font-size: 16px; line-height: 1.6; color: #000000;">
                  Merhaba,<br/><br/>
                  Siparişiniz başarıyla tamamlandı! Satın aldığınız piksel alanı şu an <strong>milyonlukpiksel.com</strong> üzerinde tüm dünyanın görebileceği şekilde yayında.
                </p>

                <div style="border: 2px solid #000000; background-color: #f9f9f9; padding: 20px; margin: 25px 0;">
                  <h2 style="margin-top: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 10px;">
                    ${pixel.title}
                  </h2>
                  
                  <table style="width: 100%; border-collapse: collapse; font-family: 'Courier New', Courier, monospace;">
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-size: 13px; text-transform: uppercase;">Konum:</td>
                      <td style="padding: 8px 0; font-weight: bold; font-size: 15px;">X: ${pixel.x * 10}, Y: ${pixel.y * 10}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666; font-size: 13px; text-transform: uppercase;">Boyut:</td>
                      <td style="padding: 8px 0; font-weight: bold; font-size: 15px;">${pixel.w * 10}x${pixel.h * 10} px</td>
                    </tr>
                  </table>
                </div>

                <p style="font-size: 15px; color: #000000; margin-bottom: 25px;">
                  Pikselinizi ve diğer reklamları görmek için sitemizi ziyaret edebilirsiniz.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://www.milyonlukpiksel.com" 
                     style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; font-weight: 900; font-size: 16px; text-transform: uppercase; padding: 15px 30px; border: 3px solid #000000; box-shadow: 5px 5px 0px #000000;">
                    PİKSELİNİ GÖRÜNTÜLE
                  </a>
                </div>

                <p style="margin: 20px 0 0 0; color: #666; font-size: 13px; text-align: center;">
                  Site adresi: <a href="https://www.milyonlukpiksel.com" style="color: #ef4444; font-weight: bold; text-decoration: none;">milyonlukpiksel.com</a>
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #000000; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; font-weight: bold; letter-spacing: 1px;">
                MİLYONLUK PİKSEL
              </div>
            </div>
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
