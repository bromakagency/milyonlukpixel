import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';

export function PaymentResult() {
  const location = useLocation();
  const isSuccess = location.pathname.includes('basarili');

  useEffect(() => {
    // If inside iframe, break out
    if (window.top !== window.self) {
      window.top!.location.href = window.location.href;
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f4f0] flex flex-col items-center justify-center p-4 selection:bg-red-600 selection:text-white">
      <div className="bg-white border-4 border-black brutal-shadow max-w-md w-full p-8 text-center space-y-6">
        {isSuccess ? (
          <>
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto" />
            <h1 className="font-display font-black text-3xl uppercase">Ödeme Başarılı!</h1>
            <p className="font-mono text-gray-600">
              Piksel alanınız onaylanmıştır. Dijital duvarda yerinizi aldınız. E-posta adresinize fatura ve bilgilendirme gönderilecektir.
            </p>
          </>
        ) : (
          <>
            <XCircle className="h-20 w-20 text-red-600 mx-auto" />
            <h1 className="font-display font-black text-3xl uppercase">Ödeme Başarısız</h1>
            <p className="font-mono text-gray-600">
              Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin veya bankanızla iletişime geçin.
            </p>
          </>
        )}
        
        <Link 
          to="/" 
          className="inline-block w-full bg-black hover:bg-red-600 text-white font-display font-bold text-xl py-4 border-2 border-black brutal-shadow transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none uppercase"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
