import { useState } from 'react';
import { Header } from '../components/Header';
import { Grid } from '../components/Grid';
import { Modal } from '../components/Modal';
import { Footer } from '../components/Footer';
import { SalesFeed } from '../components/SalesFeed';
import { usePixels } from '../hooks/usePixels';
import { PixelFormData } from '../types';

export function Home() {
  const { createPixel } = usePixels();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ x: number; y: number } | null>(null);

  const handlePixelSelect = (x: number, y: number) => {
    setSelectedCoords({ x, y });
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: PixelFormData) => {
    await createPixel(data);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <SalesFeed />
      <Header />
      
      <main className="flex-1 w-full p-2 md:p-12 flex flex-col justify-start items-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4xKSIvPjwvc3ZnPg==')]">
        <div className="w-full flex flex-col items-center pb-8">
          <Grid onPixelSelect={handlePixelSelect} />
        </div>
      </main>

      <SalesFeed />

      <Footer />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        selectedCoords={selectedCoords}
      />
    </div>
  );
}
