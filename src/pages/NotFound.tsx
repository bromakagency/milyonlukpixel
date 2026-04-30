import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f4f0] flex flex-col items-center justify-center p-4">
      <div className="bg-white border-4 border-black brutal-shadow-lg p-8 md:p-16 max-w-2xl w-full text-center relative">
        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <AlertTriangle className="w-20 h-20 text-red-500 drop-shadow-[4px_4px_0_#000]" />
          </div>
          
          <h1 className="text-8xl md:text-9xl font-black font-display tracking-tighter mb-4 text-black drop-shadow-[6px_6px_0_#ffd700]">
            404
          </h1>
          
          <div className="mb-8">
            <h2 className="text-xl md:text-3xl font-bold font-mono uppercase bg-black text-white inline-block px-4 py-2 rotate-1 mb-4">
              BOŞLUĞA DÜŞTÜNÜZ!
            </h2>
            <p className="text-base md:text-lg font-mono text-gray-700 max-w-md mx-auto">
              Aradığınız pikseli bulamadık. Ya link yanlış ya da bu sayfa uzayın derinliklerinde kayboldu.
            </p>
          </div>
          
          <Link 
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-[#ffd700] hover:bg-[#ffed4a] active:bg-yellow-500 text-black border-4 border-black font-bold font-mono uppercase px-8 py-4 text-lg brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            <Home className="w-6 h-6" />
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
      
      {/* Uyarı Bandı */}
      <div className="mt-12 bg-red-500 text-white font-mono text-sm font-bold px-8 py-2 border-y-4 border-black -rotate-2 brutal-shadow-sm">
        !!! DIKKAT: YANLIŞ KOORDİNAT !!!
      </div>
    </div>
  );
}
