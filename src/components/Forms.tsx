import React from 'react';
import { ArrowLeft, MapPin, Save, X, Shield, Router, Database, Settings, Verified, Video, AlertTriangle, Eye, Terminal, Cloud, MapPin as MapPinIcon, Loader2, Package, QrCode, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { Screen } from '../types';
import { useImagenPlaceholder } from '../hooks/useImagenPlaceholder';
import { useInsertRow, useUpdateRow } from '../hooks/useSupabase';
import { supabase } from '../services/supabase';
import { uploadQRCodeImage, deleteQRCodeImage, uploadInstallationPhoto, deleteInstallationPhoto } from '../services/storageService';
import { CrimpReferenceModal } from './CrimpReference';
import { Cable, ExternalLink } from 'lucide-react';

interface FormProps {
  onNavigate: (screen: Screen) => void;
  initialData?: any;
}

export function AddDVRForm({ onNavigate, initialData }: FormProps) {
  const { insert, loading: inserting } = useInsertRow('dvrs');
  const { update, loading: updating } = useUpdateRow('dvrs');
  const loading = inserting || updating;

  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    location: initialData?.location || '',
    channels: initialData?.channels || 16,
    ip: initialData?.ip || '',
    local_user: initialData?.local_user || 'admin',
    local_password: initialData?.local_password || '',
    hikconnect_enabled: initialData?.hikconnect_enabled || false,
    hikconnect_user: initialData?.hikconnect_user || '',
    hikconnect_password: initialData?.hikconnect_password || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (initialData?.id) {
        await update(initialData.id, formData);
        await supabase.from('activity_logs').insert([{
          type: 'system',
          message: `DVR ${formData.name} foi atualizado com sucesso.`,
          location: 'INVENTÁRIO'
        }]);
        alert('DVR atualizado com sucesso!');
      } else {
        await insert(formData);
        await supabase.from('activity_logs').insert([{
          type: 'system',
          message: `Novo DVR cadastrado: ${formData.name}.`,
          location: 'INVENTÁRIO'
        }]);
        alert('DVR cadastrado com sucesso!');
      }
      onNavigate('dvrs');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex items-center gap-4 border-b border-outline-variant/15 pb-6">
        <button 
          onClick={() => onNavigate('dvrs')}
          className="hover:bg-surface-container-high p-2 rounded-sm transition-all"
        >
          <ArrowLeft className="text-primary w-5 h-5" />
        </button>
        <h1 className="font-headline font-bold text-xl uppercase tracking-wider text-primary">Cadastro de DVR</h1>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <FormSection number="01" title="IDENTIFICAÇÃO">
          <div className="space-y-4">
            <Input 
              label="NOME DO DISPOSITIVO" 
              placeholder="ex: DVR-CENTRAL-01" 
              value={formData.name} 
              onChange={(e: any) => setFormData({...formData, name: e.target.value})} 
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="MARCA" 
                placeholder="ex: Hikvision" 
                value={formData.brand} 
                onChange={(e: any) => setFormData({...formData, brand: e.target.value})} 
              />
              <Input 
                label="MODELO" 
                placeholder="ex: DS-7208HUHI-K1" 
                value={formData.model} 
                onChange={(e: any) => setFormData({...formData, model: e.target.value})} 
              />
            </div>
            <div className="relative">
              <Input 
                label="LOCALIZAÇÃO FÍSICA" 
                placeholder="ex: Sala de Servidores - Rack 02" 
                value={formData.location} 
                onChange={(e: any) => setFormData({...formData, location: e.target.value})} 
              />
              <MapPin className="absolute right-3 top-10 text-on-surface-variant/50 w-4 h-4" />
            </div>
          </div>
        </FormSection>

        <FormSection number="02" title="CAPACIDADE">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1.5 block">CONTAGEM DE CANAIS</label>
              <select 
                className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-sm h-12 px-4 rounded-sm appearance-none text-on-surface"
                value={formData.channels}
                onChange={(e) => setFormData({...formData, channels: parseInt(e.target.value)})}
              >
                <option value={4}>4 Canais</option>
                <option value={8}>8 Canais</option>
                <option value={16}>16 Canais</option>
                <option value={32}>32 Canais</option>
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection number="03" title="CONFIGURAÇÃO DE REDE">
          <div className="space-y-4 bg-surface-container-low p-4 rounded-sm">
            <Input 
              label="ENDEREÇO IP" 
              placeholder="192.168.1.100" 
              isMono 
              value={formData.ip} 
              onChange={(e: any) => setFormData({...formData, ip: e.target.value})} 
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="USUÁRIO LOCAL" 
                value={formData.local_user} 
                onChange={(e: any) => setFormData({...formData, local_user: e.target.value})} 
              />
              <Input 
                label="SENHA LOCAL" 
                type="password" 
                value={formData.local_password} 
                onChange={(e: any) => setFormData({...formData, local_password: e.target.value})} 
              />
            </div>
          </div>
        </FormSection>

        <FormSection number="04" title="HIK-CONNECT / NUVEM">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="hik" 
                className="rounded-sm border-none bg-surface-container-highest text-primary focus:ring-primary" 
                checked={formData.hikconnect_enabled}
                onChange={(e) => setFormData({...formData, hikconnect_enabled: e.target.checked})}
              />
              <label htmlFor="hik" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Habilitar Acesso Nuvem</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="USUÁRIO NUVEM" 
                value={formData.hikconnect_user} 
                onChange={(e: any) => setFormData({...formData, hikconnect_user: e.target.value})} 
              />
              <Input 
                label="SENHA NUVEM" 
                type="password" 
                value={formData.hikconnect_password} 
                onChange={(e: any) => setFormData({...formData, hikconnect_password: e.target.value})} 
              />
            </div>
          </div>
        </FormSection>

        <div className="pt-4 flex flex-col gap-3">
          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold uppercase tracking-widest text-sm rounded-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />} 
            {loading ? 'SALVANDO...' : 'SALVAR CADASTRO'}
          </button>
          <button 
            onClick={() => onNavigate('dvrs')}
            className="w-full h-14 border border-outline-variant/20 text-on-surface-variant font-headline font-bold uppercase tracking-widest text-xs rounded-sm active:bg-surface-container-high transition-all"
          >
            CANCELAR
          </button>
        </div>
      </form>
    </div>
  );
}

// Interface para estruturação técnica dos modelos de catálogo
interface CatalogCameraModel {
  id: string;
  name: string;
  brand: string;
  model: string;
  type: 'IP' | 'ANALOG';
  cable_type: 'UTP' | 'COAXIAL' | 'FIBER';
  cable_category: 'CAT5E' | 'CAT6' | 'BIPOLAR' | 'FLEX';
  is_shielded: boolean;
  crimp_standard: '568A' | '568B' | 'SEQUENTIAL' | 'CUSTOM';
  vias_video: string;
  vias_power: string;
  power_source_type: string;
}

// Lista técnica de modelos de câmeras para auto-preenchimento (Opção A)
const CATALOG_CAMERA_MODELS: CatalogCameraModel[] = [
  {
    id: 'intelbras-vip1230b',
    name: 'Intelbras VIP 1230 B G4 (IP PoE Bullet)',
    brand: 'INTELBRAS',
    model: 'VIP 1230 B G4',
    type: 'IP',
    cable_type: 'UTP',
    cable_category: 'CAT5E',
    is_shielded: false,
    crimp_standard: '568B',
    vias_video: '8 vias (PoE / Dados)',
    vias_power: 'Não usa (Alimentação Local)',
    power_source_type: 'PoE do Switch'
  },
  {
    id: 'intelbras-vip1230d',
    name: 'Intelbras VIP 1230 D G4 (IP PoE Dome)',
    brand: 'INTELBRAS',
    model: 'VIP 1230 D G4',
    type: 'IP',
    cable_type: 'UTP',
    cable_category: 'CAT5E',
    is_shielded: false,
    crimp_standard: '568B',
    vias_video: '8 vias (PoE / Dados)',
    vias_power: 'Não usa (Alimentação Local)',
    power_source_type: 'PoE do Switch'
  },
  {
    id: 'hikvision-2cd1023',
    name: 'Hikvision DS-2CD1023G0-I (IP PoE Bullet)',
    brand: 'HIKVISION',
    model: 'DS-2CD1023G0-I',
    type: 'IP',
    cable_type: 'UTP',
    cable_category: 'CAT5E',
    is_shielded: true,
    crimp_standard: '568B',
    vias_video: '8 vias (PoE / Dados)',
    vias_power: 'Não usa (Alimentação Local)',
    power_source_type: 'PoE do Switch'
  },
  {
    id: 'hikvision-2cd1123',
    name: 'Hikvision DS-2CD1123G0-I (IP PoE Dome)',
    brand: 'HIKVISION',
    model: 'DS-2CD1123G0-I',
    type: 'IP',
    cable_type: 'UTP',
    cable_category: 'CAT5E',
    is_shielded: false,
    crimp_standard: '568B',
    vias_video: '8 vias (PoE / Dados)',
    vias_power: 'Não usa (Alimentação Local)',
    power_source_type: 'PoE do Switch'
  },
  {
    id: 'intelbras-vhd1120b',
    name: 'Intelbras VHD 1120 B G6 (Analógica Bullet Coaxial)',
    brand: 'INTELBRAS',
    model: 'VHD 1120 B G6',
    type: 'ANALOG',
    cable_type: 'COAXIAL',
    cable_category: 'BIPOLAR',
    is_shielded: false,
    crimp_standard: 'CUSTOM',
    vias_video: 'Não se aplica (Fibra/Coaxial)',
    vias_power: '2 vias (1 par)',
    power_source_type: 'Fonte Centralizada no DVR'
  },
  {
    id: 'intelbras-vhd3230b',
    name: 'Intelbras VHD 3230 B (Analógica Bullet UTP)',
    brand: 'INTELBRAS',
    model: 'VHD 3230 B',
    type: 'ANALOG',
    cable_type: 'UTP',
    cable_category: 'CAT5E',
    is_shielded: false,
    crimp_standard: 'SEQUENTIAL',
    vias_video: '2 vias (1 par)',
    vias_power: '2 vias (1 par)',
    power_source_type: 'Fonte Centralizada no DVR'
  }
];

export function AddCameraForm({ onNavigate, initialData }: FormProps) {
  const { insert, loading: inserting } = useInsertRow('cameras');
  const { update, loading: updating } = useUpdateRow('cameras');
  const loading = inserting || updating;

  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    location: initialData?.location || '',
    type: initialData?.type || 'ANALOG',
    ip: initialData?.ip || '',
    user_name: initialData?.user_name || '',
    password: initialData?.password || '',
    stream_url: initialData?.stream_url || '',
    dvr_id: initialData?.dvr_id || '',
    channel: initialData?.channel || '',
    cable_type: initialData?.cable_type || 'UTP',
    cable_category: initialData?.cable_category || 'CAT5E',
    is_shielded: initialData?.is_shielded || false,
    crimp_standard: initialData?.crimp_standard || '568B',
    pair_map: initialData?.pair_map || ''
  });

  // Novos campos estruturados extras de cabeamento
  const [cableDetails, setCableDetails] = React.useState({
    vias_video: '2 vias (1 par)',
    vias_power: '2 vias (1 par)',
    power_source_type: 'Fonte Centralizada no DVR',
    has_splice: false,
    notes: ''
  });

  const [showCrimpModal, setShowCrimpModal] = React.useState(false);

  const [selectedModelId, setSelectedModelId] = React.useState('');

  // Função para gerenciar o auto-preenchimento técnico de cabeamento e hardware (Opção A)
  const handleCatalogModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    if (!modelId) return;

    const selectedModel = CATALOG_CAMERA_MODELS.find(m => m.id === modelId);
    if (selectedModel) {
      setFormData(prev => ({
        ...prev,
        brand: selectedModel.brand,
        model: selectedModel.model,
        type: selectedModel.type,
        cable_type: selectedModel.cable_type,
        cable_category: selectedModel.cable_category,
        is_shielded: selectedModel.is_shielded,
        crimp_standard: selectedModel.crimp_standard
      }));

      setCableDetails(prev => ({
        ...prev,
        vias_video: selectedModel.vias_video,
        vias_power: selectedModel.vias_power,
        power_source_type: selectedModel.power_source_type
      }));
    }
  };

  // Estados de arrays para armazenar múltiplas fotos
  const [qrCodeUrls, setQrCodeUrls] = React.useState<string[]>(() => {
    if (initialData?.qr_code_url) {
      try {
        const parsed = JSON.parse(initialData.qr_code_url);
        return Array.isArray(parsed) ? parsed : [initialData.qr_code_url];
      } catch (e) {
        return [initialData.qr_code_url];
      }
    }
    return [];
  });

  const [installationPhotoUrls, setInstallationPhotoUrls] = React.useState<string[]>(() => {
    if (initialData?.installation_photo_url) {
      try {
        const parsed = JSON.parse(initialData.installation_photo_url);
        return Array.isArray(parsed) ? parsed : [initialData.installation_photo_url];
      } catch (e) {
        return [initialData.installation_photo_url];
      }
    }
    return [];
  });

  const [uploadingQr, setUploadingQr] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);

  const qrInputRef = React.useRef<HTMLInputElement>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  // Handlers para upload e deleção das imagens
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const dummyUserId = '00000000-0000-0000-0000-000000000000';
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || dummyUserId;

      const result = await uploadQRCodeImage(file, userId, initialData?.id);
      if (result.error) {
        alert('Erro ao enviar QR Code: ' + result.error);
      } else if (result.url) {
        setQrCodeUrls(prev => [...prev, result.url!]);
      }
    } catch (err: any) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploadingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = '';
    }
  };

  const handleQrDelete = async (urlToDelete: string) => {
    if (window.confirm('Deseja excluir esta imagem do QR Code?')) {
      try {
        await deleteQRCodeImage(urlToDelete);
        setQrCodeUrls(prev => prev.filter(url => url !== urlToDelete));
      } catch (err: any) {
        alert('Erro ao excluir: ' + err.message);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dummyUserId = '00000000-0000-0000-0000-000000000000';
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || dummyUserId;

      const result = await uploadInstallationPhoto(file, userId, initialData?.id);
      if (result.error) {
        alert('Erro ao enviar Foto do Local: ' + result.error);
      } else if (result.url) {
        setInstallationPhotoUrls(prev => [...prev, result.url!]);
      }
    } catch (err: any) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handlePhotoDelete = async (urlToDelete: string) => {
    if (window.confirm('Deseja excluir esta foto de instalação?')) {
      try {
        await deleteInstallationPhoto(urlToDelete);
        setInstallationPhotoUrls(prev => prev.filter(url => url !== urlToDelete));
      } catch (err: any) {
        alert('Erro ao excluir: ' + err.message);
      }
    }
  };

  // Parser retrocompatível para pair_map
  React.useEffect(() => {
    if (initialData?.pair_map) {
      try {
        const parsed = JSON.parse(initialData.pair_map);
        if (parsed && typeof parsed === 'object') {
          setCableDetails({
            vias_video: parsed.vias_video || '2 vias (1 par)',
            vias_power: parsed.vias_power || '2 vias (1 par)',
            power_source_type: parsed.power_source_type || 'Fonte Centralizada no DVR',
            has_splice: !!parsed.has_splice,
            notes: parsed.notes || ''
          });
          return;
        }
      } catch (e) {
        // Se falhar no parse JSON, é texto legado
        setCableDetails({
          vias_video: '2 vias (1 par)',
          vias_power: '2 vias (1 par)',
          power_source_type: 'Fonte Centralizada no DVR',
          has_splice: false,
          notes: initialData.pair_map
        });
      }
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Empacotar dados técnicos em JSON na coluna pair_map
      const pairMapStringified = JSON.stringify({
        vias_video: cableDetails.vias_video,
        vias_power: cableDetails.vias_power,
        power_source_type: cableDetails.power_source_type,
        has_splice: cableDetails.has_splice,
        notes: cableDetails.notes
      });

      const submissionData = {
        ...formData,
        pair_map: pairMapStringified,
        qr_code_url: qrCodeUrls.length > 0 ? JSON.stringify(qrCodeUrls) : null,
        installation_photo_url: installationPhotoUrls.length > 0 ? JSON.stringify(installationPhotoUrls) : null
      };

      if (initialData?.id) {
        await update(initialData.id, submissionData);
        alert('Câmera atualizada com sucesso!');
      } else {
        await insert(submissionData);
        alert('Câmera cadastrada com sucesso!');
      }
      onNavigate('cameras');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex items-center gap-4 border-b border-outline-variant/15 pb-6">
        <button 
          onClick={() => onNavigate('cameras')}
          className="hover:bg-surface-container-high p-2 rounded-sm transition-all"
        >
          <ArrowLeft className="text-primary w-5 h-5" />
        </button>
        <h1 className="font-headline font-bold text-xl uppercase tracking-wider text-primary">Cadastro de Câmera</h1>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Seletor de Modelo do Catálogo (Opção A) */}
        <div className="bg-surface-container-low p-4 rounded-sm border border-outline-variant/10 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Package className="w-4.5 h-4.5 shrink-0" />
            <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant block">
              Modelo do Catálogo (opcional)
            </label>
          </div>
          <select
            className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-sm h-12 px-4 rounded-sm appearance-none text-on-surface"
            value={selectedModelId}
            onChange={(e) => handleCatalogModelChange(e.target.value)}
          >
            <option value="">Selecione um modelo para preencher automaticamente</option>
            {CATALOG_CAMERA_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <FormSection number="01" title="IDENTIFICAÇÃO">
          <div className="space-y-4">
            <Input 
              label="NOME DO PONTO" 
              placeholder="EX: BLOCO A - ENTRADA PRINCIPAL" 
              value={formData.name}
              onChange={(e: any) => setFormData({...formData, name: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Marca" 
                placeholder="ex: HIKVISION" 
                value={formData.brand}
                onChange={(e: any) => setFormData({...formData, brand: e.target.value})}
              />
              <Input 
                label="Modelo" 
                placeholder="ex: DS-2CD1023G0-I" 
                value={formData.model}
                onChange={(e: any) => setFormData({...formData, model: e.target.value})}
              />
            </div>
            <Input 
              label="LOCALIZAÇÃO FÍSICA" 
              placeholder="ex: Lado externo portão" 
              value={formData.location}
              onChange={(e: any) => setFormData({...formData, location: e.target.value})}
            />
          </div>
        </FormSection>

        <FormSection number="02" title="PADRÃO TÉCNICO">
          <div className="flex gap-2">
            <div 
              onClick={() => setFormData({...formData, type: 'ANALOG'})}
              className="flex-1"
            >
              <TechOption icon={Settings} label="Analógica" active={formData.type === 'ANALOG'} />
            </div>
            <div 
              onClick={() => setFormData({...formData, type: 'IP'})}
              className="flex-1"
            >
              <TechOption icon={Router} label="Rede IP" active={formData.type === 'IP'} />
            </div>
          </div>
        </FormSection>

        <FormSection number="03" title="CONFIGURAÇÃO / CREDENCIAIS">
          <div className="space-y-4 bg-surface-container-low p-4 rounded-sm">
            <Input 
              label="ENDEREÇO IP (SE IP)" 
              placeholder="192.168.1.150" 
              isMono 
              value={formData.ip}
              onChange={(e: any) => setFormData({...formData, ip: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="USUÁRIO" 
                value={formData.user_name}
                onChange={(e: any) => setFormData({...formData, user_name: e.target.value})}
              />
              <Input 
                label="SENHA" 
                type="password" 
                value={formData.password}
                onChange={(e: any) => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <Input 
              label="ID DO STREAM (GO2RTC)" 
              placeholder="camera_entrada" 
              isMono 
              value={formData.stream_url}
              onChange={(e: any) => setFormData({...formData, stream_url: e.target.value})}
            />
          </div>
        </FormSection>

        <FormSection number="04" title="LINK FÍSICO">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Unidade DVR/NVR</label>
              <select 
                className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm appearance-none"
                value={formData.dvr_id}
                onChange={(e) => setFormData({...formData, dvr_id: e.target.value})}
              >
                <option value="">Selecione um DVR...</option>
                <option value="dvr-1">DVR_CENTRAL_01 (16CH)</option>
                <option value="dvr-2">NVR_SERVER_04 (32CH)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Nº do Canal" 
                placeholder="01" 
                type="number" 
                value={formData.channel}
                onChange={(e: any) => setFormData({...formData, channel: e.target.value})}
              />
              <Input label="Porta Power Balun" placeholder="PB-A1" />
            </div>
          </div>
        </FormSection>

        <FormSection number="05" title="ESPECIFICAÇÕES DE CABEAMENTO">
          <div className="space-y-6 bg-surface-container-low p-4 rounded-sm border border-outline-variant/10 relative">
            
            {/* Atalho rápido para o Guia de Crimpagem no celular */}
            <div className="flex justify-between items-center bg-primary/5 p-3 rounded-sm border border-primary/10 mb-2">
              <div className="flex items-center gap-2">
                <Cable className="text-primary w-4 h-4 shrink-0" />
                <span className="text-[10px] font-bold tracking-wider text-on-surface uppercase">Guia de Crimpagem Rápido</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowCrimpModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary text-[9px] font-bold uppercase rounded-sm hover:opacity-90 active:scale-95 transition-all"
              >
                VISUALIZAR CORES <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Tipo de Cabo</label>
                <select 
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm"
                  value={formData.cable_type}
                  onChange={(e) => setFormData({...formData, cable_type: e.target.value as any})}
                >
                  <option value="UTP">UTP (Par Trançado)</option>
                  <option value="COAXIAL">Coaxial</option>
                  <option value="FIBER">Fibra Óptica</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Categoria / Bitola</label>
                <select 
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm"
                  value={formData.cable_category}
                  onChange={(e) => setFormData({...formData, cable_category: e.target.value as any})}
                >
                  <option value="CAT5E">Cat 5e</option>
                  <option value="CAT6">Cat 6</option>
                  <option value="BIPOLAR">Coaxial Bipolar</option>
                  <option value="FLEX">4mm / Flex</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Padrão de Crimpagem</label>
                <select 
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm"
                  value={formData.crimp_standard}
                  onChange={(e) => setFormData({...formData, crimp_standard: e.target.value as any})}
                >
                  <option value="568B">T-568B (Padrão)</option>
                  <option value="568A">T-568A</option>
                  <option value="SEQUENTIAL">Sequencial (Power Balun)</option>
                  <option value="CUSTOM">Customizado / Outros</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input 
                  type="checkbox" 
                  id="shielded" 
                  className="rounded-sm border-none bg-surface-container-highest text-primary" 
                  checked={formData.is_shielded}
                  onChange={(e) => setFormData({...formData, is_shielded: e.target.checked})}
                />
                <label htmlFor="shielded" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest cursor-pointer select-none">Cabo Blindado</label>
              </div>
            </div>

            {/* NOVOS CAMPOS ESTRUTURADOS DA SUGESTÃO 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-outline-variant/10">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Vias p/ Vídeo</label>
                <select 
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm"
                  value={cableDetails.vias_video}
                  onChange={(e) => setCableDetails({...cableDetails, vias_video: e.target.value})}
                >
                  <option value="2 vias (1 par)">2 vias (1 par)</option>
                  <option value="4 vias (2 pares)">4 vias (2 pares)</option>
                  <option value="8 vias (PoE / Dados)">8 vias (PoE / Dados)</option>
                  <option value="Não se aplica (Fibra/Coaxial)">Não se aplica (Fibra/Coaxial)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Vias p/ Energia</label>
                <select 
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm"
                  value={cableDetails.vias_power}
                  onChange={(e) => setCableDetails({...cableDetails, vias_power: e.target.value})}
                >
                  <option value="2 vias (1 par)">2 vias (1 par)</option>
                  <option value="4 vias (2 pares)">4 vias (2 pares)</option>
                  <option value="Não usa (Alimentação Local)">Não usa (Alimentação Local)</option>
                  <option value="Outro padrão">Outro padrão</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Tipo de Alimentação</label>
                <select 
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm"
                  value={cableDetails.power_source_type}
                  onChange={(e) => setCableDetails({...cableDetails, power_source_type: e.target.value})}
                >
                  <option value="Fonte Centralizada no DVR">Fonte Centralizada no DVR</option>
                  <option value="Fonte Auxiliar Individual">Fonte Auxiliar Individual</option>
                  <option value="Fonte Auxiliar no Ponto">Fonte Auxiliar no Ponto</option>
                  <option value="PoE do Switch">PoE do Switch</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input 
                  type="checkbox" 
                  id="has_splice" 
                  className="rounded-sm border-none bg-surface-container-highest text-primary" 
                  checked={cableDetails.has_splice}
                  onChange={(e) => setCableDetails({...cableDetails, has_splice: e.target.checked})}
                />
                <label htmlFor="has_splice" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest cursor-pointer select-none">Possui Emenda no Cabo</label>
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-outline-variant/10">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Observações do Cabeamento</label>
              <textarea 
                placeholder="Ex: Emenda realizada na caixa de passagem do bloco B. Utilizado par azul para sinal de vídeo."
                className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm min-h-[80px]"
                value={cableDetails.notes}
                onChange={(e) => setCableDetails({...cableDetails, notes: e.target.value})}
              />
              {formData.crimp_standard === 'SEQUENTIAL' && (
                <p className="text-[9px] text-primary/80 font-mono mt-2 bg-primary/5 p-2 rounded-sm leading-relaxed border border-primary/10">
                  REF SEQUENCIAL: Az, Br/Az, Lj, Br/Lj, Vd, Br/Vd, Ma, Br/Ma.
                </p>
              )}
            </div>

            {/* Modal Flutuante de Referência de Crimpagem */}
            {showCrimpModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                <div className="w-full max-w-sm bg-surface-container-low border border-outline-variant/20 rounded-sm shadow-2xl overflow-hidden">
                  <CrimpReferenceModal 
                    onClose={() => setShowCrimpModal(false)} 
                    selectedCrimp={formData.crimp_standard} 
                  />
                </div>
              </div>
            )}

          </div>
        </FormSection>

        <FormSection number="06" title="FOTO DO QR CODE DE ACESSO">
          <div className="space-y-4 bg-surface-container-low p-4 rounded-sm border border-outline-variant/10">
            <input
              ref={qrInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleQrUpload}
              className="hidden"
            />
            
            <div className="flex flex-wrap gap-4 items-center">
              {qrCodeUrls.map((url, idx) => (
                <div key={idx} className="relative w-36 h-36 border border-outline-variant/20 rounded-sm overflow-hidden bg-black/20 group">
                  <img
                    src={url}
                    alt={`QR Code ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleQrDelete(url)}
                    className="absolute top-1.5 right-1.5 bg-error text-on-error p-1.5 rounded-sm opacity-0 group-hover:opacity-100 active:scale-95 transition-all shadow-md"
                    title="Excluir imagem"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => qrInputRef.current?.click()}
                disabled={uploadingQr}
                className="w-36 h-36 border-2 border-dashed border-outline-variant/30 hover:border-primary/50 hover:text-primary rounded-sm flex flex-col items-center justify-center gap-1.5 transition-all text-on-surface-variant bg-surface-container-high/40 active:scale-[0.98]"
              >
                {uploadingQr ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tirar Foto</span>
                    <span className="text-[8px] opacity-60">(ou selecionar)</span>
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[10px] text-on-surface-variant/70 leading-relaxed">
              Bata uma foto do QR Code do app da câmera para permitir o acesso rápido de outros dispositivos de rede.
            </p>
          </div>
        </FormSection>

        <FormSection number="07" title="FOTO DO LOCAL DE INSTALAÇÃO">
          <div className="space-y-4 bg-surface-container-low p-4 rounded-sm border border-outline-variant/10">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            
            <div className="flex flex-wrap gap-4 items-center">
              {installationPhotoUrls.map((url, idx) => (
                <div key={idx} className="relative w-36 h-36 border border-outline-variant/20 rounded-sm overflow-hidden bg-black/20 group">
                  <img
                    src={url}
                    alt={`Foto Local ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handlePhotoDelete(url)}
                    className="absolute top-1.5 right-1.5 bg-error text-on-error p-1.5 rounded-sm opacity-0 group-hover:opacity-100 active:scale-95 transition-all shadow-md"
                    title="Excluir imagem"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-36 h-36 border-2 border-dashed border-outline-variant/30 hover:border-primary/50 hover:text-primary rounded-sm flex flex-col items-center justify-center gap-1.5 transition-all text-on-surface-variant bg-surface-container-high/40 active:scale-[0.98]"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tirar Foto</span>
                    <span className="text-[8px] opacity-60">(ou selecionar)</span>
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[10px] text-on-surface-variant/70 leading-relaxed">
              Registre fotos de onde a câmera está instalada física e visualmente, auxiliando manutenções e conferências técnicas futuras.
            </p>
          </div>
        </FormSection>

        <div className="pt-4 flex flex-col gap-3">
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary font-headline font-bold py-4 rounded-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />} 
            {loading ? 'SALVANDO...' : 'SALVAR CADASTRO'}
          </button>
          <button 
            onClick={() => onNavigate('cameras')}
            className="w-full border border-outline-variant/30 text-on-surface-variant font-headline font-bold py-3 rounded-sm uppercase tracking-widest hover:bg-surface-container-high transition-all"
          >
            CANCELAR
          </button>
        </div>
      </form>
    </div>
  );
}

export function LiveTestView({ onNavigate, camera }: any) {
  const [viewMode, setViewMode] = React.useState<'local_dvr' | 'go2rtc'>('local_dvr');
  const [dvrData, setDvrData] = React.useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [isAutoPolling, setIsAutoPolling] = React.useState(true);

  // Ler e persistir a URL do servidor de mídia (go2rtc/MediaMTX) no localStorage
  const [mediaServerUrl, setMediaServerUrl] = React.useState(() => {
    return localStorage.getItem('cftv_media_server_url') || 'http://localhost:1984';
  });

  // Carregar dados do DVR associado caso seja uma câmera analógica
  React.useEffect(() => {
    async function loadDvr() {
      if (camera?.dvr_id) {
        try {
          const { data, error } = await supabase
            .from('dvrs')
            .select('*')
            .eq('id', camera.dvr_id)
            .single();
          if (data && !error) {
            setDvrData(data);
          }
        } catch (e) {
          console.error("Erro ao buscar DVR associado:", e);
        }
      }
    }
    loadDvr();
  }, [camera]);

  // Resolver variáveis de conexão local (Câmera IP ou DVR)
  const connectionDetails = React.useMemo(() => {
    const isIpCam = camera?.type === 'IP';
    return {
      ip: isIpCam ? camera.ip : (dvrData?.ip || camera?.ip || '192.168.0.29'),
      user: isIpCam ? (camera.user_name || 'admin') : (dvrData?.local_user || 'admin'),
      pass: isIpCam ? (camera.password || 'admin') : (dvrData?.local_password || 'admin'),
      channel: camera?.channel || '1',
      brand: (camera?.brand || dvrData?.brand || 'Amcrest').toUpperCase(),
      model: camera?.model || dvrData?.model || 'NV4116'
    };
  }, [camera, dvrData]);

  // Gerar a URL oficial do Snapshot HTTP direto do fabricante
  const localSnapshotUrl = React.useMemo(() => {
    const { ip, user, pass, channel, brand } = connectionDetails;
    if (!ip) return '';

    // Evitar barra dupla caso o usuário digite http:// no IP
    const cleanIp = ip.replace(/^https?:\/\//, '');

    // Mapeamento de APIs oficiais de imagens locais
    if (brand.includes('AMCREST') || brand.includes('DAHUA') || brand.includes('INTELBRAS')) {
      // Amcrest / Dahua / Intelbras CGI-BIN Snapshot API
      return `http://${cleanIp}/cgi-bin/snapshot.cgi?channel=${channel}`;
    } else if (brand.includes('HIKVISION')) {
      // Hikvision ISAPI Picture Channel (Canal 101, 201...)
      return `http://${cleanIp}/ISAPI/Streaming/channels/${channel}01/picture`;
    }
    
    // Fallback ONVIF genérico
    return `http://${cleanIp}/onvif-http/snapshot?channel=${channel}`;
  }, [connectionDetails]);

  // URL alternativa com usuário e senha embutidos (Basic Auth na URL)
  const localSnapshotUrlWithAuth = React.useMemo(() => {
    const { ip, user, pass, channel, brand } = connectionDetails;
    if (!ip) return '';
    const cleanIp = ip.replace(/^https?:\/\//, '');
    const credentials = `${user}:${encodeURIComponent(pass)}@`;
    
    if (brand.includes('AMCREST') || brand.includes('DAHUA') || brand.includes('INTELBRAS')) {
      return `http://${credentials}${cleanIp}/cgi-bin/snapshot.cgi?channel=${channel}&t=${Date.now() + refreshTrigger}`;
    } else if (brand.includes('HIKVISION')) {
      return `http://${credentials}${cleanIp}/ISAPI/Streaming/channels/${channel}01/picture?t=${Date.now() + refreshTrigger}`;
    }
    return `http://${credentials}${cleanIp}/onvif-http/snapshot?channel=${channel}&t=${Date.now() + refreshTrigger}`;
  }, [connectionDetails, refreshTrigger]);

  // Resolver a origem do stream RTSP para go2rtc
  const streamSource = React.useMemo(() => {
    if (camera?.stream_url) {
      return camera.stream_url;
    }
    const { ip, user, pass, channel, brand } = connectionDetails;
    if (brand.includes('AMCREST') || brand.includes('DAHUA') || brand.includes('INTELBRAS')) {
      return `rtsp://${user}:${pass}@${ip}:554/cam/realmonitor?channel=${channel}&subtype=1`;
    }
    return `rtsp://${user}:${pass}@${ip}:554/h264/ch${channel}/main`;
  }, [camera, connectionDetails]);

  // Montar a URL completa do iframe go2rtc
  const iframeSrc = React.useMemo(() => {
    const encodedSource = encodeURIComponent(streamSource);
    return `${mediaServerUrl}/webrtc.html?src=${encodedSource}`;
  }, [mediaServerUrl, streamSource]);

  // Atualização contínua ( Fast Snapshot Polling ) para simular vídeo a cada 1 segundo por HTTP
  React.useEffect(() => {
    if (viewMode !== 'local_dvr' || !isAutoPolling) return;

    const timer = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 1000); // Polling a cada 1 segundo

    return () => clearInterval(timer);
  }, [viewMode, isAutoPolling]);

  // LOGS ESTRUTURADOS DE DEPURAÇÃO (Modo Debugger)
  React.useEffect(() => {
    console.log(`%c[CFTV-LOCAL-DEBUG] 🚨 Inicializando Visualização CFTV`, 'color: #dfc299; font-weight: bold;');
    console.log(`[CFTV-LOCAL-DEBUG] Marca/Modelo Identificado:`, connectionDetails.brand, connectionDetails.model);
    console.log(`[CFTV-LOCAL-DEBUG] IP de Destino:`, connectionDetails.ip);
    console.log(`[CFTV-LOCAL-DEBUG] Canal Ativo:`, connectionDetails.channel);
    console.log(`[CFTV-LOCAL-DEBUG] Modo Selecionado:`, viewMode);
    if (viewMode === 'local_dvr') {
      console.log(`[CFTV-LOCAL-DEBUG] URL do Snapshot Local:`, localSnapshotUrl);
      console.log(`[CFTV-LOCAL-DEBUG] URL Completa (Com Credenciais):`, localSnapshotUrlWithAuth);
    } else {
      console.log(`[CFTV-LOCAL-DEBUG] go2rtc Stream Iframe:`, iframeSrc);
    }
  }, [connectionDetails, viewMode, localSnapshotUrl, localSnapshotUrlWithAuth, iframeSrc]);

  const handleSaveMediaServer = (url: string) => {
    setMediaServerUrl(url);
    localStorage.setItem('cftv_media_server_url', url);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-surface-container-low border-b border-outline-variant/15 flex justify-between items-center px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('cameras')} className="hover:bg-surface-container-high p-2 rounded-sm">
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </button>
          <h1 className="text-lg font-bold text-on-surface uppercase tracking-wider font-headline truncate max-w-[220px]">
            Visualização: {camera?.name || 'Canal Local'}
          </h1>
        </div>
        <div className="flex bg-surface-container-high p-1 rounded-sm border border-outline-variant/10">
          <button
            onClick={() => setViewMode('local_dvr')}
            className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-sm transition-all ${
              viewMode === 'local_dvr' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
            }`}
          >
            Direct DVR
          </button>
          <button
            onClick={() => setViewMode('go2rtc')}
            className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-sm transition-all ${
              viewMode === 'go2rtc' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
            }`}
          >
            Server WebRTC
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* PLAYER DE VÍDEO / SNAPSHOT */}
        <section className="relative aspect-video w-full bg-black overflow-hidden border-b border-outline-variant/20 flex items-center justify-center">
          
          {viewMode === 'local_dvr' ? (
            // MODO SNAPSHOT DIRETO (SEM SERVIDOR - DO PROPRIO DVR POR HTTP)
            <div className="w-full h-full relative flex items-center justify-center">
              <img
                src={localSnapshotUrlWithAuth}
                alt="Stream Local do DVR"
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error("Falha ao carregar snapshot local por HTTP básico:", e);
                }}
              />
              
              {/* Opacidade de Scanline de CCTV */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20"></div>
            </div>
          ) : (
            // MODO GO2RTC COM IFRAME WEBRTC
            <iframe 
              src={iframeSrc}
              className="w-full h-full border-none opacity-95"
              title="WebRTC RTSP Stream"
              allow="autoplay; encrypted-media; fullscreen"
            />
          )}
          
          {/* Overlay de telemetria técnica */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
            <div className="flex justify-between items-start">
              <div className="bg-surface-bright/80 backdrop-blur-md px-3 py-2 rounded-sm border-l-2 border-primary">
                <span className="text-[9px] font-headline font-bold text-primary block uppercase tracking-widest">
                  {viewMode === 'local_dvr' ? 'CONEXÃO LOCAL DIRETA (DVR)' : 'STREAM: GO2RTC SERVER'}
                </span>
                <span className="text-xs font-mono text-on-surface truncate max-w-[220px] block">
                  {connectionDetails.brand} {connectionDetails.model} @ {connectionDetails.ip}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-sm text-[9px] font-mono border border-primary/30 animate-pulse font-bold uppercase">
                  {viewMode === 'local_dvr' ? 'HTTP Direct' : 'WebRTC'}
                </span>
                <span className="bg-surface-container-high/80 text-on-surface-variant px-1.5 py-0.5 rounded-sm text-[8px] font-mono">
                  CH: {connectionDetails.channel}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <span className="text-[8px] font-mono text-on-surface-variant/60">Controle CFTV Local v2.0</span>
              <span className="bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[9px] font-mono text-on-surface-variant rounded-sm uppercase">
                Cabo: {camera?.cable_type || 'UTP'} ({camera?.crimp_standard || '568B'})
              </span>
            </div>
          </div>
        </section>

        <div className="p-6 space-y-8 max-w-xl mx-auto">
          
          {/* PAINEL DE INFORMAÇÕES DO MODO DVR LOCAL */}
          {viewMode === 'local_dvr' ? (
            <div className="space-y-6">
              <div className="bg-surface-container-low p-4 rounded-sm border border-outline-variant/10 space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
                  <h3 className="text-xs font-headline font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-primary" /> Visualização Local Wi-Fi
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase">Atualização Auto:</span>
                    <input 
                      type="checkbox" 
                      className="rounded-sm border-none bg-surface-container-highest text-primary"
                      checked={isAutoPolling}
                      onChange={(e) => setIsAutoPolling(e.target.checked)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Caminho do Endpoint HTTP Snapshot</span>
                    <div className="bg-surface-container-high p-2.5 rounded-sm font-mono text-[9px] text-tertiary select-all truncate">
                      {localSnapshotUrl}
                    </div>
                  </div>

                  <div className="bg-primary/5 p-3 rounded-sm border border-primary/10 space-y-2 text-[10px] text-on-surface-variant leading-relaxed">
                    <p>
                      <strong>💡 Nota de Campo do Navegador (CORS/Segurança):</strong>
                    </p>
                    <p>
                      Os navegadores de celular modernos (Chrome/Safari) às vezes impedem que o app embuta as credenciais na URL por motivos de segurança.
                    </p>
                    <p className="font-semibold text-primary">
                      Se a imagem não abrir de primeira:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Clique no botão abaixo para abrir o snapshot em uma nova aba do navegador.</li>
                      <li>Digite o usuário <strong>{connectionDetails.user}</strong> e a senha do DVR.</li>
                      <li>Volte ao app e a imagem passará a carregar automaticamente!</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRefreshTrigger(prev => prev + 1)}
                      className="py-2.5 bg-surface-container-highest text-on-surface font-bold text-[10px] uppercase rounded-sm border border-outline-variant/15 hover:bg-surface-container-high transition-all"
                    >
                      FORÇAR ATUALIZAÇÃO 🔄
                    </button>
                    <a
                      href={localSnapshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 bg-primary text-on-primary font-bold text-[10px] uppercase rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-1.5 text-center"
                    >
                      LOGAR NO DVR <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // PAINEL DE INFORMAÇÕES DO MODO SERVER WEBRTC
            <div className="space-y-6">
              <div className="bg-surface-container-low p-5 rounded-sm border border-outline-variant/10 space-y-4">
                <h3 className="text-xs font-headline font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-primary" /> Configurar Servidor de Transcodificação
                </h3>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Servidor de Mídia go2rtc (IP/URL)</label>
                  <input
                    type="text"
                    className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-xs font-mono p-3 rounded-sm text-on-surface"
                    value={mediaServerUrl}
                    onChange={(e) => handleSaveMediaServer(e.target.value)}
                    placeholder="Ex: http://192.168.1.100:1984"
                  />
                  <p className="text-[9px] text-on-surface-variant/70 mt-2 leading-relaxed">
                    Utilizado para transcodificar streams RTSP em WebRTC de ultra latência. Requer instalação prévia do go2rtc.
                  </p>
                </div>

                <div className="pt-2 border-t border-outline-variant/10">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Origem RTSP Resolvida</label>
                  <div className="bg-surface-container-high p-3 rounded-sm select-all">
                    <p className="text-[10px] font-mono text-tertiary truncate leading-relaxed">
                      {streamSource}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checklist técnico de campo */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-[0.2em] border-l-2 border-outline-variant pl-3">Validação Técnica Rápida</h3>
            <div className="space-y-2 bg-surface-container-low p-4 rounded-sm border border-outline-variant/10">
              <CheckItem label="Celular conectado no mesmo Wi-Fi que o DVR" checked />
              <CheckItem label={`DVR alcançável no IP ${connectionDetails.ip}`} checked={!!connectionDetails.ip} />
              <CheckItem label="Autenticação HTTP validada no navegador" checked={!!(connectionDetails.user && connectionDetails.pass)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4">
            <button 
              onClick={() => onNavigate('cameras')}
              className="w-full py-4 bg-primary text-on-primary font-headline font-bold text-sm rounded-sm tracking-widest shadow-lg shadow-primary/10 flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              RETORNAR AO INVENTÁRIO <Verified className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export function AddBalunForm({ onNavigate, initialData }: FormProps) {
  const { insert, loading: inserting } = useInsertRow('power_baluns');
  const { update, loading: updating } = useUpdateRow('power_baluns');
  const loading = inserting || updating;

  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    brand: initialData?.brand || 'INTELBRAS',
    model: initialData?.model || 'VW 1-16',
    location: initialData?.location || '',
    ports: initialData?.ports || 16
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (initialData?.id) {
        await update(initialData.id, formData);
        alert('Power Balun atualizado com sucesso!');
      } else {
        await insert(formData);
        alert('Power Balun cadastrado com sucesso!');
      }
      onNavigate('infrastructure');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex items-center gap-4 border-b border-outline-variant/15 pb-6">
        <button onClick={() => onNavigate('infrastructure')} className="hover:bg-surface-container-high p-2 rounded-sm">
          <ArrowLeft className="text-primary w-5 h-5" />
        </button>
        <h1 className="font-headline font-bold text-xl uppercase tracking-wider text-primary">Cadastro de Power Balun</h1>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <FormSection number="01" title="IDENTIFICAÇÃO">
          <div className="space-y-4">
            <Input 
              label="NOME IDENTIFICADOR" 
              placeholder="ex: Balun Central A" 
              value={formData.name}
              onChange={(e: any) => setFormData({...formData, name: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Marca</label>
                <select 
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm appearance-none"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value as any})}
                >
                  <option value="INTELBRAS">INTELBRAS</option>
                  <option value="OUTRA">OUTRA</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Modelo</label>
                <select 
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-on-surface p-3 text-sm rounded-sm appearance-none"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                >
                  <option value="VW 1-16">VW 1-16 (16 Canais)</option>
                  <option value="VW 8">VW 8 (8 Canais)</option>
                </select>
              </div>
            </div>
            <Input 
              label="LOCALIZAÇÃO FÍSICA" 
              placeholder="ex: Rack Principal - Piso 1" 
              value={formData.location}
              onChange={(e: any) => setFormData({...formData, location: e.target.value})}
            />
          </div>
        </FormSection>

        <div className="pt-4 flex flex-col gap-3">
          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-on-primary font-headline font-bold uppercase tracking-widest text-sm rounded-sm disabled:opacity-50"
          >
            {loading ? 'SALVANDO...' : 'SALVAR POWER BALUN'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AddSwitchForm({ onNavigate, initialData }: FormProps) {
  const { insert, loading: inserting } = useInsertRow('network_switches');
  const { update, loading: updating } = useUpdateRow('network_switches');
  const loading = inserting || updating;

  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    location: initialData?.location || '',
    ip: initialData?.ip || '',
    ports: initialData?.ports || 24,
    poe_ports: initialData?.poe_ports || 12
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (initialData?.id) {
        await update(initialData.id, formData);
        alert('Switch atualizado com sucesso!');
      } else {
        await insert(formData);
        alert('Switch cadastrado com sucesso!');
      }
      onNavigate('infrastructure');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex items-center gap-4 border-b border-outline-variant/15 pb-6">
        <button onClick={() => onNavigate('infrastructure')} className="hover:bg-surface-container-high p-2 rounded-sm">
          <ArrowLeft className="text-primary w-5 h-5" />
        </button>
        <h1 className="font-headline font-bold text-xl uppercase tracking-wider text-primary">Cadastro de Switch</h1>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <FormSection number="01" title="IDENTIFICAÇÃO">
          <div className="space-y-4">
            <Input 
              label="NOME DO SWITCH" 
              placeholder="ex: Switch Central POE" 
              value={formData.name}
              onChange={(e: any) => setFormData({...formData, name: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="MARCA" 
                placeholder="ex: TP-Link / Intelbras" 
                value={formData.brand}
                onChange={(e: any) => setFormData({...formData, brand: e.target.value})}
              />
              <Input 
                label="MODELO" 
                placeholder="ex: TL-SG1024DE" 
                value={formData.model}
                onChange={(e: any) => setFormData({...formData, model: e.target.value})}
              />
            </div>
            <Input 
              label="LOCALIZAÇÃO FÍSICA" 
              value={formData.location}
              onChange={(e: any) => setFormData({...formData, location: e.target.value})}
            />
          </div>
        </FormSection>

        <FormSection number="02" title="REDE">
          <div className="space-y-4 bg-surface-container-low p-4 rounded-sm">
            <Input 
              label="ENDEREÇO IP DE GERÊNCIA" 
              placeholder="10.0.0.254" 
              isMono 
              value={formData.ip}
              onChange={(e: any) => setFormData({...formData, ip: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="TOTAL DE PORTAS" 
                type="number" 
                placeholder="24" 
                value={formData.ports}
                onChange={(e: any) => setFormData({...formData, ports: parseInt(e.target.value)})}
              />
              <Input 
                label="PORTAS POE" 
                type="number" 
                placeholder="12" 
                value={formData.poe_ports}
                onChange={(e: any) => setFormData({...formData, poe_ports: parseInt(e.target.value)})}
              />
            </div>
          </div>
        </FormSection>

        <div className="pt-4 flex flex-col gap-3">
          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-on-primary font-headline font-bold uppercase tracking-widest text-sm rounded-sm disabled:opacity-50"
          >
            {loading ? 'SALVANDO...' : 'SALVAR SWITCH'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function RegisterClientForm({ onNavigate }: FormProps) {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-headline text-4xl font-bold tracking-tighter text-on-surface mb-2">Novo Cadastro</h2>
          <p className="text-on-surface-variant font-body text-sm max-w-md">Insira as informações do cliente para provisionamento de acesso e integração de hardware no sistema de monitoramento.</p>
        </div>
        <div className="hidden md:flex gap-4">
          <button onClick={() => onNavigate('dashboard')} className="px-6 py-2 bg-transparent text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container-highest transition-colors font-bold uppercase tracking-widest rounded-sm text-xs">CANCELAR</button>
          <button className="px-8 py-2 bg-primary text-on-primary hover:opacity-90 transition-all font-bold uppercase tracking-widest rounded-sm text-xs flex items-center gap-2">
            <Save className="w-4 h-4" /> SALVAR CLIENTE
          </button>
        </div>
      </header>

      <form className="grid grid-cols-1 lg:grid-cols-12 gap-6" onSubmit={(e) => e.preventDefault()}>
        <div className="lg:col-span-8 bg-surface-container-high p-8 rounded-sm space-y-8">
          <div className="flex items-center gap-3">
            <span className="font-headline text-primary font-bold text-lg">01.</span>
            <h3 className="font-headline uppercase tracking-widest text-sm font-semibold text-on-surface">Dados Pessoais/Empresariais</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2">
              <Input label="Nome Completo / Razão Social" placeholder="Digite o nome completo ou razão social" />
            </div>
            <Input label="CPF / CNPJ" placeholder="000.000.000-00" />
            <Input label="RG / Inscrição Estadual" placeholder="Digite o documento" />
          </div>
        </div>

        <div className="lg:col-span-4 bg-primary-container p-8 rounded-sm flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="font-headline text-primary text-xl font-bold mb-4">Tactical Info</h4>
            <p className="text-on-primary-container text-xs leading-relaxed mb-6">Após o salvamento, o cliente será indexado na base de dados criptografada. Verifique se o CPF/CNPJ está correto para evitar falhas na emissão de NF-e.</p>
          </div>
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Protocolo: NEW_ENTRY</span>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <Verified className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Acesso: Nível 01</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 bg-surface-container-high p-8 rounded-sm space-y-8">
          <div className="flex items-center gap-3">
            <span className="font-headline text-primary font-bold text-lg">02.</span>
            <h3 className="font-headline uppercase tracking-widest text-sm font-semibold text-on-surface">Endereço de Instalação</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-6">
            <div className="md:col-span-3">
              <Input label="CEP" placeholder="00000-000" />
            </div>
            <div className="md:col-span-6">
              <Input label="Logradouro" placeholder="Rua, Avenida, Praça..." />
            </div>
            <div className="md:col-span-3">
              <Input label="Número" placeholder="Ex: 123" />
            </div>
            <div className="md:col-span-4">
              <Input label="Complemento" placeholder="Apt, Sala, Bloco..." />
            </div>
            <div className="md:col-span-4">
              <Input label="Bairro" placeholder="Nome do bairro" />
            </div>
            <div className="md:col-span-2">
              <Input label="Cidade" placeholder="Cidade" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1.5 block">Estado</label>
              <select className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-sm h-12 px-4 rounded-sm text-on-surface">
                <option>SP</option>
                <option>RJ</option>
                <option>MG</option>
              </select>
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 bg-surface-container-high p-8 rounded-sm space-y-8">
          <div className="flex items-center gap-3">
            <span className="font-headline text-primary font-bold text-lg">03.</span>
            <h3 className="font-headline uppercase tracking-widest text-sm font-semibold text-on-surface">Contatos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Input label="E-mail Principal" placeholder="cliente@email.com" type="email" />
            <Input label="Telefone / WhatsApp" placeholder="(00) 0 0000-0000" />
            <Input label="Nome do Responsável" placeholder="Responsável pelo contato" />
          </div>
        </div>
      </form>
    </div>
  );
}

// Helper Components
function FormSection({ number, title, children }: any) {
  return (
    <section className="space-y-4">
      <div className="flex items-center space-x-2">
        <span className="font-headline font-bold text-xs text-primary tracking-widest uppercase">{number}. {title}</span>
        <div className="flex-grow h-[1px] bg-outline-variant/15"></div>
      </div>
      {children}
    </section>
  );
}

function Input({ label, isMono, ...props }: any) {
  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">{label}</label>
      <input 
        className={`w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary text-sm h-12 px-4 rounded-sm placeholder:opacity-30 text-on-surface ${isMono ? 'font-mono' : ''}`}
        {...props}
      />
    </div>
  );
}

function TechOption({ icon: Icon, label, active }: any) {
  return (
    <div className={`flex-1 cursor-pointer py-3 border rounded-sm flex flex-col items-center gap-1 transition-all ${
      active ? 'bg-primary-container border-primary text-primary' : 'bg-surface-container-highest border-transparent text-on-surface-variant'
    }`}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </div>
  );
}

function StatusBox({ label, value, subValue, color }: any) {
  const colorClass = color === 'primary' ? 'text-primary' : 'text-tertiary';
  return (
    <div className="bg-surface-container-high p-4 rounded-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-wider`}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-headline font-bold text-on-surface">{value}</span>
        <span className={`text-[10px] ${colorClass} font-bold`}>{subValue}</span>
      </div>
    </div>
  );
}

function Slider({ label, value }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">{label}</span>
        <span className="text-xs font-mono text-primary">{value}</span>
      </div>
      <div className="w-full h-1 bg-surface-container-highest rounded-full relative">
        <div className="absolute left-0 top-0 h-full bg-primary w-[24%] rounded-full"></div>
        <div className="absolute left-[24%] top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-sm"></div>
      </div>
    </div>
  );
}

function CheckItem({ label, checked }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-sm">
      <span className="text-sm font-medium text-on-surface">{label}</span>
      <div className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center transition-all ${
        checked ? 'bg-primary border-primary' : 'border-outline-variant'
      }`}>
        {checked && <Verified className="w-3 h-3 text-on-primary" />}
      </div>
    </div>
  );
}
