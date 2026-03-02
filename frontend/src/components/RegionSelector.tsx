import { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

const REGION_KEY = 'region';
const DEFAULT_REGION = 'Москва и МО';

const REGIONS = [
  'Москва и МО',
  'Санкт-Петербург и ЛО',
  'Краснодарский край',
  'Московская область',
  'Ленинградская область',
  'Татарстан',
  'Крым',
  'Сочи',
  'Другой регион',
];

interface RegionSelectorProps {
  onRegionChange?: (region: string) => void;
}

export default function RegionSelector({ onRegionChange }: RegionSelectorProps) {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [open, setOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(REGION_KEY);
    if (stored) {
      setRegion(stored);
    } else {
      setConfirmModal(true);
    }
  }, []);

  const selectRegion = (r: string) => {
    setRegion(r);
    localStorage.setItem(REGION_KEY, r);
    setOpen(false);
    onRegionChange?.(r);
  };

  const handleConfirm = () => {
    localStorage.setItem(REGION_KEY, DEFAULT_REGION);
    setConfirmModal(false);
  };

  const handleChooseRegion = () => {
    setConfirmModal(false);
    setOpen(true);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors cursor-pointer min-h-[44px] py-2"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <span>{region}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <>
            <div className="absolute inset-0 -z-10" aria-hidden="true" onClick={() => setOpen(false)} />
            <ul
              role="listbox"
              className="absolute top-full left-0 mt-1 py-2 bg-background border border-border rounded-xl shadow-lg z-50 min-w-[220px] max-h-[300px] overflow-y-auto"
            >
              {REGIONS.map((r) => (
                <li key={r} role="option">
                  <button
                    onClick={() => selectRegion(r)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors cursor-pointer min-h-[44px] flex items-center ${r === region ? 'text-primary font-medium' : ''}`}
                  >
                    {r}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-background rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-medium mb-4">Вы находитесь в Москве?</p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-opacity cursor-pointer"
              >
                Подтвердить
              </button>
              <button
                onClick={handleChooseRegion}
                className="flex-1 py-3 rounded-lg border border-border font-medium text-sm hover:bg-secondary transition-colors cursor-pointer"
              >
                Выбрать регион
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
