import React, { useRef, useState, useEffect } from 'react';
import { motion, useDragControls } from 'motion/react';
import { Video, Server, Cpu, Network, Map as MapIcon, Upload, Save, Maximize2, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { useFetchTable, useUpdateRow } from '../hooks/useSupabase';
import { supabase } from '../services/supabase';

export default function InteractiveFloorPlan() {
  const { data: cameras, refresh: refreshCameras } = useFetchTable<any>('cameras');
  const { data: dvrs, refresh: refreshDvrs } = useFetchTable<any>('dvrs');
  const { update: updateCamera } = useUpdateRow('cameras');
  const { update: updateDVR } = useUpdateRow('dvrs');
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [mapImage, setMapImage] = useState("https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop");

  const handleDragEnd = async (id: string, table: string, e: any, info: any) => {
    if (!mapRef.current) return;

    const mapRect = mapRef.current.getBoundingClientRect();
    
    // Calculate percentage position
    const x = ((info.point.x - mapRect.left) / mapRect.width) * 100;
    const y = ((info.point.y - mapRect.top) / mapRect.height) * 100;

    // Constrain within 0-100
    const constrainedX = Math.max(0, Math.min(100, x));
    const constrainedY = Math.max(0, Math.min(100, y));

    try {
      await supabase.from(table).update({ x_pos: constrainedX, y_pos: constrainedY }).eq('id', id);
      console.log(`Posição atualizada para ${table}: ${constrainedX}, ${constrainedY}`);
    } catch (err) {
      console.error('Erro ao salvar posição:', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMapImage(url);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-sm border border-outline-variant/10">
        <div>
          <h2 className="font-headline text-xl font-bold text-primary uppercase tracking-wider flex items-center gap-3">
            <MapIcon className="w-5 h-5" /> Planta Baixa Interativa
          </h2>
          <p className="text-on-surface-variant text-xs mt-1">Arraste os ícones para posicionar os equipamentos no local real.</p>
        </div>
        <div className="flex gap-3">
          <label className="cursor-pointer px-4 py-2 bg-surface-container-highest text-on-surface text-[10px] font-bold uppercase tracking-widest rounded-sm border border-outline-variant/20 hover:bg-surface-container-high transition-all flex items-center gap-2">
            <Upload className="w-3.5 h-3.5" /> Carregar Planta
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all flex items-center gap-2 ${
              isEditing ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            {isEditing ? <Save className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isEditing ? 'SALVAR POSIÇÕES' : 'MODO EDIÇÃO'}
          </button>
        </div>
      </header>

      <div className="relative bg-surface-container-lowest rounded-sm overflow-hidden border border-outline-variant/20 min-h-[600px] flex items-center justify-center">
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-2 bg-surface-bright/80 backdrop-blur-md rounded-full border border-outline-variant/20 text-on-surface hover:text-primary transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-2 bg-surface-bright/80 backdrop-blur-md rounded-full border border-outline-variant/20 text-on-surface hover:text-primary transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Map Container */}
        <div 
          ref={mapRef}
          className="relative transition-transform duration-300 ease-out"
          style={{ 
            width: '100%', 
            maxWidth: '1200px',
            transform: `scale(${zoom})`
          }}
        >
          <img 
            src={mapImage} 
            alt="Floor Plan" 
            className="w-full h-auto opacity-60 grayscale-[0.5]"
          />

          {/* Render Markers */}
          {cameras.map((camera: any) => (
            <MapMarker 
              key={camera.id}
              id={camera.id}
              table="cameras"
              x={camera.x_pos || 50}
              y={camera.y_pos || 50}
              name={camera.name}
              status={camera.status}
              icon={Video}
              color="primary"
              isEditing={isEditing}
              onDragEnd={handleDragEnd}
            />
          ))}

          {dvrs.map((dvr: any) => (
            <MapMarker 
              key={dvr.id}
              id={dvr.id}
              table="dvrs"
              x={dvr.x_pos || 20}
              y={dvr.y_pos || 20}
              name={dvr.name}
              status={dvr.status}
              icon={Server}
              color="tertiary"
              isEditing={isEditing}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 bg-surface-bright/40 backdrop-blur-sm p-3 rounded-sm border border-outline-variant/10">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-[9px] font-bold text-on-surface-variant uppercase">
              <span className="w-2 h-2 rounded-full bg-primary"></span> Câmera
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-on-surface-variant uppercase">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span> DVR
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-on-surface-variant uppercase">
              <span className="w-2 h-2 rounded-full bg-error"></span> Alerta
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapMarker({ id, table, x, y, name, status, icon: Icon, color, isEditing, onDragEnd }: any) {
  return (
    <motion.div
      drag={isEditing}
      dragMomentum={false}
      onDragEnd={(e, info) => onDragEnd(id, table, e, info)}
      className="absolute z-20 cursor-move group"
      style={{ left: `${x}%`, top: `${y}%`, x: '-50%', y: '-50%' }}
    >
      <div className={`relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 transition-all ${
        status === 'offline' ? 'bg-error/20 border-error' : 
        color === 'primary' ? 'bg-primary/20 border-primary' : 'bg-tertiary/20 border-tertiary'
      } group-hover:scale-125`}>
        <Icon className={`w-4 h-4 ${
          status === 'offline' ? 'text-error' :
          color === 'primary' ? 'text-primary' : 'text-tertiary'
        }`} />
        
        {/* Status Pulse */}
        {status === 'online' && (
          <span className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
            color === 'primary' ? 'bg-primary' : 'bg-tertiary'
          }`}></span>
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-surface-bright border border-outline-variant/20 px-2 py-1 rounded-sm shadow-xl whitespace-nowrap">
            <p className="text-[10px] font-bold text-on-surface uppercase tracking-tight">{name}</p>
            <p className={`text-[8px] font-mono ${status === 'online' ? 'text-primary' : 'text-error'}`}>
              {status?.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
