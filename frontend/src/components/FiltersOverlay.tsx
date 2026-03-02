import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, SlidersHorizontal } from 'lucide-react';
import { useFilters } from '@/hooks/useFilters';
import { ApartmentFilters } from '@/hooks/useApartments';

interface Props { 
  open: boolean; 
  onClose: () => void;
  onApply: (filters: ApartmentFilters, count: number) => void;
}

const FiltersOverlay = ({ open, onClose, onApply }: Props) => {
  const { filters: availableFilters, loading } = useFilters();
  const navigate = useNavigate();
  
  // Выбранные фильтры
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedBuilders, setSelectedBuilders] = useState<string[]>([]);
  const [selectedFinishings, setSelectedFinishings] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [areaMin, setAreaMin] = useState<string>('');
  const [areaMax, setAreaMax] = useState<string>('');
  const [isCity, setIsCity] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const toggleRoom = (room: number) => {
    setSelectedRooms(prev => 
      prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room]
    );
  };

  const toggleDistrict = (id: string) => {
    setSelectedDistricts(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleBuilder = (id: string) => {
    setSelectedBuilders(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const toggleFinishing = (id: string) => {
    setSelectedFinishings(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    const filters: ApartmentFilters = {};
    
    if (selectedRooms.length > 0) filters.room = selectedRooms;
    if (selectedDistricts.length > 0) filters.district = selectedDistricts;
    if (selectedBuilders.length > 0) filters.builder = selectedBuilders;
    if (selectedFinishings.length > 0) filters.finishing = selectedFinishings;
    if (priceMin) filters.price_min = parseFloat(priceMin);
    if (priceMax) filters.price_max = parseFloat(priceMax);
    if (areaMin) filters.area_min = parseFloat(areaMin);
    if (areaMax) filters.area_max = parseFloat(areaMax);
    if (isCity !== undefined) filters.is_city = isCity;

    // Передаём фильтры в HeroSection для обновления счётчика
    onApply(filters, 0);
    
    // Переходим на /catalog с фильтрами
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(`${key}[]`, String(v)));
      } else {
        queryParams.append(key, String(value));
      }
    });
    
    navigate(`/catalog?${queryParams.toString()}`);
    onClose();
  };

  const handleReset = () => {
    setSelectedRooms([]);
    setSelectedDistricts([]);
    setSelectedBuilders([]);
    setSelectedFinishings([]);
    setPriceMin('');
    setPriceMax('');
    setAreaMin('');
    setAreaMax('');
    setIsCity(undefined);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <span className="font-bold">Фильтры</span>
          </div>
          <button className="flex items-center gap-2 text-sm font-medium" onClick={onClose}>
            Закрыть <X className="w-6 h-6 text-primary" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Загрузка фильтров...</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {/* Количество комнат */}
              <div>
                <h3 className="font-bold text-sm mb-4">Количество комнат</h3>
                <div className="space-y-3">
                  {availableFilters?.rooms.map((room) => (
                    <label key={room.value} className="flex items-center gap-2.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(Number(room.value))}
                        onChange={() => toggleRoom(Number(room.value))}
                        className="w-4 h-4 rounded border-2 border-border accent-primary"
                      />
                      {room.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Районы */}
              <div>
                <h3 className="font-bold text-sm mb-4">Район</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {availableFilters?.districts.slice(0, 15).map((district) => (
                    <label key={district.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedDistricts.includes(district.id)}
                        onChange={() => toggleDistrict(district.id)}
                        className="w-4 h-4 rounded border-2 border-border accent-primary"
                      />
                      {district.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Застройщики */}
              <div>
                <h3 className="font-bold text-sm mb-4">Застройщик</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {availableFilters?.builders.slice(0, 15).map((builder) => (
                    <label key={builder.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedBuilders.includes(builder.id)}
                        onChange={() => toggleBuilder(builder.id)}
                        className="w-4 h-4 rounded border-2 border-border accent-primary"
                      />
                      {builder.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Отделка */}
              <div>
                <h3 className="font-bold text-sm mb-4">Отделка</h3>
                <div className="space-y-3">
                  {availableFilters?.finishings.map((finishing) => (
                    <label key={finishing.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedFinishings.includes(finishing.id)}
                        onChange={() => toggleFinishing(finishing.id)}
                        className="w-4 h-4 rounded border-2 border-border accent-primary"
                      />
                      {finishing.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Ценовой диапазон и площадь */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-sm mb-4">Цена, ₽</h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder={`от ${availableFilters?.price.min.toLocaleString('ru-RU') || '0'}`}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <input
                    type="number"
                    placeholder={`до ${availableFilters?.price.max.toLocaleString('ru-RU') || '0'}`}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm mb-4">Площадь, м²</h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder={`от ${availableFilters?.area.min || '0'}`}
                    value={areaMin}
                    onChange={(e) => setAreaMin(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <input
                    type="number"
                    placeholder={`до ${availableFilters?.area.max || '0'}`}
                    value={areaMax}
                    onChange={(e) => setAreaMax(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Город/Пригород */}
            <div>
              <h3 className="font-bold text-sm mb-4">Локация</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="location"
                    checked={isCity === true}
                    onChange={() => setIsCity(true)}
                    className="w-4 h-4 accent-primary"
                  />
                  В городе
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="location"
                    checked={isCity === false}
                    onChange={() => setIsCity(false)}
                    className="w-4 h-4 accent-primary"
                  />
                  За городом
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="location"
                    checked={isCity === undefined}
                    onChange={() => setIsCity(undefined)}
                    className="w-4 h-4 accent-primary"
                  />
                  Все
                </label>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleApply}
                className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Применить фильтры
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FiltersOverlay;
