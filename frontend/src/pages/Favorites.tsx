import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import { Heart } from 'lucide-react';

const Favorites = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Избранное</h1>
          <p className="text-muted-foreground text-sm">Здесь будут сохранённые объекты</p>
        </div>
      </main>
      <FooterSection />
    </div>
  );
};

export default Favorites;
