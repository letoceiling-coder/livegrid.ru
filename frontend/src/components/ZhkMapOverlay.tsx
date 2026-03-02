import { useEffect } from 'react';
import { X } from 'lucide-react';
import ZhkMap from './ZhkMap';
import { type BlockFilters } from '@/hooks/useBlocks';

interface ZhkMapOverlayProps {
  open: boolean;
  onClose: () => void;
  filters?: BlockFilters;
  onBlockClick?: (blockSlug: string) => void;
}

const ZhkMapOverlay = ({ open, onClose, filters, onBlockClick }: ZhkMapOverlayProps) => {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Карта ЖК</h2>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            Закрыть <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 p-4">
          <ZhkMap filters={filters} onBlockClick={onBlockClick} />
        </div>
      </div>
    </div>
  );
};

export default ZhkMapOverlay;
