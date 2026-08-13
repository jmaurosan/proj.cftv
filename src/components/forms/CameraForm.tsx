import { useState, useEffect, useMemo, useCallback, type FormEvent, useRef } from 'react'
import type { Camera, Dvr, PowerBalun, Switch } from '../../lib/types'
import { getAvailableChannels } from '../../lib/dvrChannels'
import { STATUS_OPTIONS, CAMERA_TYPES, CAMERA_TECHNOLOGY_OPTIONS, RESOLUTION_OPTIONS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import {
  uploadQRCodeImage,
  deleteQRCodeImage,
  uploadInstallationPhoto,
  deleteInstallationPhoto,
  getQRCodeImageUrl,
  getInstallationPhotoUrl,
} from '../../services/storageService'
import {
  createCameraInstallationPhoto,
  deleteCameraInstallationPhoto,
  listCameraInstallationPhotos,
} from '../../services/cameraInstallationPhotosService'
import {
  buildCameraPhotoGallery,
  CAMERA_INSTALLATION_PHOTO_LIMIT,
  type CameraInstallationPhotoRecord,
} from '../../lib/cameraInstallationPhotos'
import { getBalunOptionLabel, resolvePowerSourceForBalun } from '../../lib/balunConfiguration'
import {
  buildCameraModelNotes as buildCatalogCameraModelNotes,
  findEquipmentModelByText,
  parseCameraModelDetails as parseCatalogCameraModelDetails,
} from '../../lib/equipmentModelCatalog'
import { useAuth } from '../../hooks/useAuth'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import { useUtpCables } from '../../hooks/useUtpCables'
import { usePowerCables } from '../../hooks/usePowerCables'
import { useClient } from '../../contexts/ClientContext'
import { CABLE_PRESETS, detectCablePreset } from '../../lib/cableConfiguration'
import type { PairFunction } from '../../lib/balunConfiguration'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import LabelScanner from '../ui/LabelScanner'
import SiteSelector from '../ui/SiteSelector'
import UtpCableForm from './UtpCableForm'
import PowerCableForm from './PowerCableForm'
import { applyScannedLabel } from '../../lib/labelScanMerge'
import type { EquipmentLabelData } from '../../services/geminiService'
import { CameraIcon, X, QrCode, MapPin, Zap, HardDrive, Cable, Video, Pencil, Plus } from 'lucide-react'

interface CameraFormProps {
  initialData?: Camera | null
  relocationMode?: boolean
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

const POWER_SOURCE_OPTIONS = [
  { value: 'power_supply', label: 'Fonte de alimentação (inclusive com balun passivo)' },
  { value: 'power_balun', label: 'Power Balun' },
  { value: 'poe', label: 'PoE' },
  { value: 'unknown', label: 'Não informado' },
] as const

const POWER_SUPPLY_VOLTAGE_OPTIONS = [
  { value: '12V', label: '12V' },
  { value: '24V', label: '24V' },
] as const

const POWER_SUPPLY_CURRENT_OPTIONS = [
  { value: 1, label: '1A' },
  { value: 2, label: '2A' },
  { value: 2.5, label: '2,5A' },
  { value: 5, label: '5A' },
  { value: 10, label: '10A' },
  { value: 20, label: '20A' },
  { value: 30, label: '30A' },
] as const

const parseCameraModelDetails = (notes?: string | null) => {
  const lensMatch = notes?.match(/(?:Lente|Lens)\s*:\s*([^|;]+)/i)
  const irMatch = notes?.match(/(?:IR|Distância IR|Distancia IR)\s*:\s*(\d+(?:[.,]\d+)?)\s*m?/i)
  const voltageMatch = notes?.match(/(?:Tensão|Tensao|Voltage)\s*:\s*([^|;]+)/i)
  const currentMatch = notes?.match(/(?:Corrente|Current)\s*:\s*(\d+(?:[.,]\d+)?)\s*A?/i)

  return {
    lensType: lensMatch?.[1]?.trim() ?? '',
    irDistanceMeters: irMatch?.[1]?.replace(',', '.') ?? '',
    operatingVoltage: voltageMatch?.[1]?.trim() ?? '',
    currentConsumption: currentMatch?.[1]?.replace(',', '.') ?? '',
  }
}

const buildCameraModelNotes = (
  lensType: string,
  irDistanceMeters: string,
  operatingVoltage: string,
  currentConsumption: string,
) =>
  [
    lensType ? `Lente: ${lensType}` : '',
    irDistanceMeters ? `IR: ${irDistanceMeters.replace('.', ',')}m` : '',
    operatingVoltage ? `Tensão: ${operatingVoltage}` : '',
    currentConsumption ? `Corrente: ${currentConsumption.replace('.', ',')}A` : '',
  ].filter(Boolean).join(' | ') || null

const normalizeCatalogText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const CAMERA_BRAND_CORRECTIONS: Record<string, string> = {
  jbl: 'JFL',
  hikvision: 'Hikivision',
  _other_: '',
}

const CAMERA_MODEL_CORRECTIONS: Record<string, string> = {
  'thc-b1220c-pm': 'THC-B1220C-P',
  'thc-b1220c-p': 'THC-B1220C-P',
}

const normalizeCameraBrand = (value: string) => {
  const trimmed = value.trim()
  return CAMERA_BRAND_CORRECTIONS[normalizeCatalogText(trimmed)] ?? trimmed
}

const normalizeCameraModel = (value: string) => {
  const trimmed = value.trim()
  return CAMERA_MODEL_CORRECTIONS[normalizeCatalogText(trimmed)] ?? trimmed
}

export default function CameraForm({ initialData, relocationMode = false, onSubmit, onCancel }: CameraFormProps) {
  const [selectedExistingCameraId, setSelectedExistingCameraId] = useState(initialData?.id ?? '')
  const [name, setName] = useState(initialData?.name ?? '')
  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [model, setModel] = useState(initialData?.model ?? '')
  const [lensType, setLensType] = useState(initialData?.lens_type ?? '')
  const [irDistanceMeters, setIrDistanceMeters] = useState(initialData?.ir_distance_meters?.toString() ?? '')
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number ?? '')
  const [installationDate, setInstallationDate] = useState(initialData?.installation_date ?? '')
  const [connectionType, setConnectionType] = useState(initialData?.connection_type ?? 'analogica')
  const getDefaultTechnology = (nextConnectionType: string) => {
    if (nextConnectionType === 'wifi') return 'wifi_smart'
    if (nextConnectionType === 'ip') return 'ip_onvif'
    return 'multi_hd'
  }
  const [technology, setTechnology] = useState(initialData?.technology ?? getDefaultTechnology(initialData?.connection_type ?? 'analogica'))
  const [dvrId, setDvrId] = useState(initialData?.dvr_id ?? '')
  const [channelNumber, setChannelNumber] = useState(initialData?.channel_number ?? 1)
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address ?? '')
  const [macAddress, setMacAddress] = useState(initialData?.mac_address ?? '')
  const [poePowered, setPoePowered] = useState(initialData?.poe_powered ?? false)
  const getDefaultPowerSource = () => {
    if (initialData?.power_source_type) return initialData.power_source_type
    if (initialData?.poe_powered) return 'poe'
    if (initialData?.balun_id) return 'power_balun'
    return 'power_supply'
  }
  const [powerSourceType, setPowerSourceType] = useState(getDefaultPowerSource())
  const [powerSupplyVoltage, setPowerSupplyVoltage] = useState(initialData?.power_supply_voltage ?? '12V')
  const [powerSupplyCurrent, setPowerSupplyCurrent] = useState(initialData?.power_supply_current_a?.toString() ?? '')
  const [operatingVoltage, setOperatingVoltage] = useState(initialData?.operating_voltage ?? '12V')
  const [currentConsumption, setCurrentConsumption] = useState(initialData?.current_consumption_a?.toString() ?? '')
  const [powerSupplyBrand, setPowerSupplyBrand] = useState(initialData?.power_supply_brand ?? '')
  const [powerSupplyModel, setPowerSupplyModel] = useState(initialData?.power_supply_model ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [type, setType] = useState(initialData?.type ?? 'dome')
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  const [resolution, setResolution] = useState(initialData?.resolution ?? '1080p')
  const [rtspUrl, setRtspUrl] = useState(initialData?.rtsp_url ?? '')
  const [streamingUser, setStreamingUser] = useState(initialData?.streaming_user ?? '')
  const [streamingPassword, setStreamingPassword] = useState(initialData?.streaming_password ?? '')
  const [mediaMtxStreamName, setMediaMtxStreamName] = useState(initialData?.media_mtx_stream_name ?? '')
  const [balunId, setBalunId] = useState(initialData?.balun_id ?? '')
  const [balunPort, setBalunPort] = useState(initialData?.balun_port ?? '')
  const [switchId, setSwitchId] = useState(initialData?.switch_id ?? '')
  const [switchPort, setSwitchPort] = useState(initialData?.switch_port ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [siteId, setSiteId] = useState(initialData?.site_id ?? '')
  const [qrCodeUrl, setQrCodeUrl] = useState(initialData?.qr_code_url ?? '')
  const [installationPhotoUrl, setInstallationPhotoUrl] = useState(initialData?.installation_photo_url ?? '')
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)
  const [installationPhotos, setInstallationPhotos] = useState<CameraInstallationPhotoRecord[]>([])
  const [installationPhotoPreviews, setInstallationPhotoPreviews] = useState<Record<string, string | null>>({})
  const [fullscreenPhoto, setFullscreenPhoto] = useState<{ url: string; alt: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingQr, setUploadingQr] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [otherBrandMode, setOtherBrandMode] = useState(false)

  const [dvrs, setDvrs] = useState<Dvr[]>([])
  const [baluns, setBaluns] = useState<PowerBalun[]>([])
  const [switches, setSwitches] = useState<Switch[]>([])
  const [existingCameras, setExistingCameras] = useState<Camera[]>([])

  const isIP = connectionType === 'ip' || connectionType === 'wifi'
  const selectedBalun = baluns.find((balun) => balun.id === balunId)
  const { models: cameraModels, saveModel } = useEquipmentModels('camera')
  const { models: powerSupplyModels, saveModel: savePowerSupplyModel } = useEquipmentModels('power_supply')
  const installationPhotoGallery = useMemo(() => buildCameraPhotoGallery({
    legacyPhotoUrl: installationPhotoUrl,
    photos: installationPhotos,
  }), [installationPhotoUrl, installationPhotos])
  const canAddInstallationPhoto = installationPhotoGallery.length < CAMERA_INSTALLATION_PHOTO_LIMIT

  const technologyOptions = useMemo(() => {
    const analogTechnologies = ['multi_hd', 'hdcvi', 'ahd', 'hdtvi', 'cvbs', 'full_color']
    const ipTechnologies = connectionType === 'wifi'
      ? ['wifi_smart', 'ip_onvif', 'full_color']
      : ['ip_onvif', 'full_color']
    const allowed = connectionType === 'analogica' ? analogTechnologies : ipTechnologies
    return CAMERA_TECHNOLOGY_OPTIONS.filter((option) => allowed.includes(option.value))
  }, [connectionType])

  const handleConnectionTypeChange = (nextConnectionType: string) => {
    setConnectionType(nextConnectionType)
    const nextDefaultTechnology = getDefaultTechnology(nextConnectionType)
    const nextAllowed = nextConnectionType === 'analogica'
      ? ['multi_hd', 'hdcvi', 'ahd', 'hdtvi', 'cvbs', 'full_color']
      : nextConnectionType === 'wifi'
        ? ['wifi_smart', 'ip_onvif', 'full_color']
        : ['ip_onvif', 'full_color']
    if (!nextAllowed.includes(technology)) setTechnology(nextDefaultTechnology)
  }
  
  // Extrai marcas únicas dos modelos cadastrados
  const brandOptions = useMemo(() => {
    const brands = new Set<string>()
    cameraModels.forEach((m) => { if (m.brand) brands.add(m.brand) })
    return Array.from(brands).sort().map((b) => ({ value: b, label: b }))
  }, [cameraModels])

  const lensOptions = useMemo(() => {
    const lenses = new Set<string>()
    cameraModels.forEach((model) => {
      const details = parseCameraModelDetails(model.notes)
      const lens = model.lens_type || details.lensType
      if (lens) lenses.add(lens)
    })
    return Array.from(lenses).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }))
  }, [cameraModels])

  const cameraNameOrLocationValues = useMemo(() => {
    const values = new Set<string>()
    existingCameras.forEach((camera) => {
      values.add(normalizeCatalogText(camera.name))
      values.add(normalizeCatalogText(camera.location))
    })
    return values
  }, [existingCameras])

  const isCameraModelCandidate = useCallback((value: string) => {
    const normalized = normalizeCatalogText(value)
    return Boolean(normalized) && !cameraNameOrLocationValues.has(normalized)
  }, [cameraNameOrLocationValues])

  const cameraModelOptions = useMemo(() => {
    const options = new Map<string, string>()
    cameraModels.forEach((item) => {
      if (item.model && isCameraModelCandidate(item.model)) {
        options.set(normalizeCatalogText(item.model), item.model)
      }
    })
    existingCameras.forEach((camera) => {
      if (camera.model && isCameraModelCandidate(camera.model)) {
        options.set(normalizeCatalogText(camera.model), camera.model)
      }
    })
    return Array.from(options.values()).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }))
  }, [cameraModels, existingCameras, isCameraModelCandidate])

  const handleCameraModelSelect = (modelId: string) => {
    const selectedModel = cameraModels.find((item) => item.id === modelId)
    if (!selectedModel) return

    const details = parseCatalogCameraModelDetails(selectedModel.notes)
    setOtherBrandMode(false)
    setBrand(selectedModel.brand)
    setModel(selectedModel.model)
    if (selectedModel.resolution) setResolution(selectedModel.resolution)
    if (selectedModel.lens_type || details.lensType) setLensType(selectedModel.lens_type || details.lensType)
    if (selectedModel.ir_distance_meters || details.irDistanceMeters) {
      setIrDistanceMeters((selectedModel.ir_distance_meters ?? details.irDistanceMeters).toString())
    }
    if (selectedModel.operating_voltage || details.operatingVoltage) setOperatingVoltage(selectedModel.operating_voltage || details.operatingVoltage)
    if (selectedModel.current_consumption_a || details.currentConsumption) {
      setCurrentConsumption((selectedModel.current_consumption_a ?? details.currentConsumption).toString())
    }
    if (details.connectionType === 'ip' || details.connectionType === 'wifi' || details.connectionType === 'analogica') {
      handleConnectionTypeChange(details.connectionType)
    }
    if (details.technology) setTechnology(details.technology)
    if (details.powerSourceType) setPowerSourceType(details.powerSourceType)
    if (details.powerSupplyVoltage) setPowerSupplyVoltage(details.powerSupplyVoltage)
    if (details.powerSupplyCurrent) setPowerSupplyCurrent(details.powerSupplyCurrent)
  }

  const handleCameraModelFromExistingCamera = (camera: Camera) => {
    setOtherBrandMode(false)
    if (camera.brand) setBrand(camera.brand)
    if (camera.model) setModel(camera.model)
    if (camera.resolution) setResolution(camera.resolution)
    if (camera.lens_type) setLensType(camera.lens_type)
    if (camera.ir_distance_meters) setIrDistanceMeters(camera.ir_distance_meters.toString())
    if (camera.operating_voltage) setOperatingVoltage(camera.operating_voltage)
    if (camera.current_consumption_a) setCurrentConsumption(camera.current_consumption_a.toString())
    if (camera.connection_type) handleConnectionTypeChange(camera.connection_type)
    if (camera.technology) setTechnology(camera.technology)
    if (camera.power_source_type) setPowerSourceType(camera.power_source_type)
    if (camera.power_supply_voltage) setPowerSupplyVoltage(camera.power_supply_voltage)
    if (camera.power_supply_current_a) setPowerSupplyCurrent(camera.power_supply_current_a.toString())
    if (camera.power_supply_brand) setPowerSupplyBrand(camera.power_supply_brand)
    if (camera.power_supply_model) setPowerSupplyModel(camera.power_supply_model)
  }

  const handleCameraModelTextChange = (nextModel: string) => {
    setModel(nextModel)
    const normalizedModel = normalizeCatalogText(nextModel)
    const selectedModel = findEquipmentModelByText(cameraModels, nextModel, brand)
    if (selectedModel) {
      handleCameraModelSelect(selectedModel.id)
      return
    }

    const existingCameraWithModel = existingCameras.find((camera) => (
      camera.model && camera.model.toLocaleLowerCase('pt-BR') === normalizedModel
    ))
    if (existingCameraWithModel) handleCameraModelFromExistingCamera(existingCameraWithModel)
  }

  useEffect(() => {
    const clientId = initialData?.client_id ?? selectedClientId
    if (!clientId) {
      setDvrs([])
      setBaluns([])
      setSwitches([])
      setExistingCameras([])
      return
    }

    Promise.all([
      supabase.from('dvrs').select('id, name, total_channels, analog_channels, ip_channels, operation_mode, disabled_analog_channels').eq('client_id', clientId).order('name'),
      supabase.from('power_baluns').select('*').eq('client_id', clientId).order('name'),
      supabase.from('switches').select('id, name, is_poe, total_ports').eq('client_id', clientId).order('name'),
      supabase.from('cameras').select('*').eq('client_id', clientId).order('name'),
    ]).then(([dvrsRes, balunsRes, switchesRes, camerasRes]) => {
      setDvrs((dvrsRes.data as Dvr[]) || [])
      setBaluns((balunsRes.data as PowerBalun[]) || [])
      setSwitches((switchesRes.data as Switch[]) || [])
      setExistingCameras((camerasRes.data as Camera[]) || [])
    })
  }, [initialData?.client_id, selectedClientId])

  const applyCameraData = (camera: Camera) => {
    setSelectedExistingCameraId(camera.id)
    setName(camera.name ?? '')
    setBrand(camera.brand ?? '')
    setModel(camera.model ?? '')
    setLensType(camera.lens_type ?? '')
    setIrDistanceMeters(camera.ir_distance_meters?.toString() ?? '')
    setSerialNumber(camera.serial_number ?? '')
    setInstallationDate(camera.installation_date ?? '')
    handleConnectionTypeChange(camera.connection_type ?? 'analogica')
    setDvrId(camera.dvr_id ?? '')
    setChannelNumber(camera.channel_number ?? 1)
    setTechnology(camera.technology ?? getDefaultTechnology(camera.connection_type ?? 'analogica'))
    setIpAddress(camera.ip_address ?? '')
    setMacAddress(camera.mac_address ?? '')
    setPoePowered(camera.poe_powered ?? false)
    setPowerSourceType(camera.power_source_type ?? (camera.poe_powered ? 'poe' : 'power_supply'))
    setPowerSupplyVoltage(camera.power_supply_voltage ?? '12V')
    setPowerSupplyCurrent(camera.power_supply_current_a?.toString() ?? '')
    setOperatingVoltage(camera.operating_voltage ?? '12V')
    setCurrentConsumption(camera.current_consumption_a?.toString() ?? '')
    setPowerSupplyBrand(camera.power_supply_brand ?? '')
    setPowerSupplyModel(camera.power_supply_model ?? '')
    setLocation(camera.location ?? '')
    setType(camera.type ?? 'dome')
    setStatus(camera.status ?? 'ativo')
    setResolution(camera.resolution ?? '1080p')
    setRtspUrl(camera.rtsp_url ?? '')
    setStreamingUser(camera.streaming_user ?? '')
    setStreamingPassword(camera.streaming_password ?? '')
    setMediaMtxStreamName(camera.media_mtx_stream_name ?? '')
    setBalunId(camera.balun_id ?? '')
    setBalunPort(camera.balun_port ?? '')
    setSwitchId(camera.switch_id ?? '')
    setSwitchPort(camera.switch_port ?? '')
    setNotes(camera.notes ?? '')
    setQrCodeUrl(camera.qr_code_url ?? '')
    setInstallationPhotoUrl(camera.installation_photo_url ?? '')
  }

  const handleExistingCameraSelect = (cameraId: string) => {
    if (!cameraId) {
      setSelectedExistingCameraId('')
      return
    }
    const camera = existingCameras.find((item) => item.id === cameraId)
    if (camera) applyCameraData(camera)
  }

  useEffect(() => {
    if (!selectedBalun) return
    setPowerSourceType((current) => resolvePowerSourceForBalun(selectedBalun.balun_type ?? 'power', current))
  }, [selectedBalun])

  useEffect(() => {
    let cancelled = false
    async function loadPreview() {
      if (!qrCodeUrl) {
        setQrPreviewUrl(null)
        return
      }
      const signedUrl = await getQRCodeImageUrl(qrCodeUrl)
      if (!cancelled) setQrPreviewUrl(signedUrl)
    }
    loadPreview()
    return () => {
      cancelled = true
    }
  }, [qrCodeUrl])

  useEffect(() => {
    let cancelled = false
    async function loadPhotos() {
      if (!initialData?.id) {
        setInstallationPhotos([])
        return
      }
      const result = await listCameraInstallationPhotos(initialData.id)
      if (!cancelled) {
        if (result.error) setError(result.error)
        setInstallationPhotos(result.data)
      }
    }
    loadPhotos()
    return () => {
      cancelled = true
    }
  }, [initialData?.id])

  useEffect(() => {
    let cancelled = false
    async function loadPreviews() {
      const entries = await Promise.all(
        installationPhotoGallery.map(async (photo) => [
          photo.storagePath,
          await getInstallationPhotoUrl(photo.storagePath),
        ] as const),
      )
      if (!cancelled) setInstallationPhotoPreviews(Object.fromEntries(entries))
    }
    loadPreviews()
    return () => {
      cancelled = true
    }
  }, [installationPhotoGallery])

  // Auto-mark PoE when selecting a PoE switch for IP cameras
  useEffect(() => {
    if (isIP && switchId) {
      const sw = switches.find((s) => s.id === switchId)
      if (sw?.is_poe) {
        setPoePowered(true)
        setPowerSourceType('poe')
      }
    }
  }, [switchId, isIP, switches])

  const handlePowerSupplyModelSelect = (modelId: string) => {
    const m = powerSupplyModels.find((x) => x.id === modelId)
    if (!m) return
    setPowerSupplyBrand(m.brand)
    setPowerSupplyModel(m.model)
    const currentMatch = m.notes?.match(/(\d+(?:[.,]\d+)?)A/i)
    const voltageMatch = m.notes?.match(/(\d+V)/i)
    if (currentMatch?.[1]) setPowerSupplyCurrent(currentMatch[1].replace(',', '.'))
    if (voltageMatch?.[1]) setPowerSupplyVoltage(voltageMatch[1].toUpperCase())
  }

  const handlePowerSupplyModelTextChange = (nextModel: string) => {
    setPowerSupplyModel(nextModel)
    const selectedModel = findEquipmentModelByText(powerSupplyModels, nextModel, powerSupplyBrand)
    if (!selectedModel?.id) return
    handlePowerSupplyModelSelect(selectedModel.id)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const normalizedBrand = normalizeCameraBrand(brand)
    const normalizedModel = normalizeCameraModel(model)
    const result = await onSubmit({
      name,
      __camera_id: selectedExistingCameraId || initialData?.id || null,
      brand: normalizedBrand || null,
      model: normalizedModel || null,
      lens_type: lensType || null,
      ir_distance_meters: irDistanceMeters ? Number(irDistanceMeters) : null,
      serial_number: serialNumber || null,
      installation_date: installationDate || null,
      technology: technology || null,
      connection_type: connectionType,
      dvr_id: dvrId || null,
      channel_number: dvrId && channelNumber ? channelNumber : null,
      ip_address: isIP && ipAddress ? ipAddress : null,
      mac_address: isIP && macAddress ? macAddress : null,
      poe_powered: powerSourceType === 'poe' ? true : isIP ? poePowered : false,
      power_source_type: powerSourceType === 'unknown' ? null : powerSourceType,
      power_supply_voltage: powerSourceType === 'power_supply' ? powerSupplyVoltage || null : null,
      power_supply_current_a: powerSourceType === 'power_supply' && powerSupplyCurrent ? Number(powerSupplyCurrent) : null,
      operating_voltage: operatingVoltage || null,
      current_consumption_a: currentConsumption ? Number(currentConsumption) : null,
      power_supply_brand: powerSourceType === 'power_supply' ? powerSupplyBrand || null : null,
      power_supply_model: powerSourceType === 'power_supply' ? powerSupplyModel || null : null,
      location,
      type,
      status,
      resolution,
      balun_id: !isIP && balunId ? balunId : null,
      balun_port: !isIP && balunPort ? Number(balunPort) : null,
      switch_id: switchId || null,
      switch_port: switchPort ? Number(switchPort) : null,
      rtsp_url: rtspUrl.trim() || null,
      streaming_user: streamingUser.trim() || null,
      streaming_password: streamingPassword || null,
      media_mtx_stream_name: mediaMtxStreamName.trim() || null,
      qr_code_url: isIP ? qrCodeUrl || null : null,
      installation_photo_url: installationPhotoUrl || null,
      notes: notes || null,
      site_id: siteId || null,
    })
    if (result.error) {
      setError(result.error)
    } else {
      if (initialData?.qr_code_url && (!isIP || qrCodeUrl !== initialData.qr_code_url)) {
        await deleteQRCodeImage(initialData.qr_code_url)
      }
      if (initialData?.installation_photo_url && installationPhotoUrl !== initialData.installation_photo_url) {
        await deleteInstallationPhoto(initialData.installation_photo_url)
      }
      const catalogModel = normalizedModel.trim()
      const canSaveCameraModel = Boolean(normalizedBrand.trim() && catalogModel && isCameraModelCandidate(catalogModel))
      if (canSaveCameraModel) {
        // Salva no catálogo automaticamente
        await saveModel({
          type: 'camera',
          brand: normalizedBrand.trim(),
          model: catalogModel,
          resolution,
          lens_type: lensType || null,
          ir_distance_meters: irDistanceMeters ? Number(irDistanceMeters) : null,
          operating_voltage: operatingVoltage || null,
          current_consumption_a: currentConsumption ? Number(currentConsumption) : null,
          channel_count: null,
          poe_standard: null,
          max_ports: null,
          is_poe: false,
          notes: buildCatalogCameraModelNotes({
            lensType,
            irDistanceMeters,
            operatingVoltage,
            currentConsumption,
            connectionType,
            technology,
            powerSourceType,
            powerSupplyVoltage,
            powerSupplyCurrent,
          }),
        })
      }
    }
    if (!result.error && powerSourceType === 'power_supply' && powerSupplyBrand && powerSupplyModel) {
      await savePowerSupplyModel({
        type: 'power_supply',
        brand: powerSupplyBrand,
        model: powerSupplyModel,
        resolution: null,
        channel_count: null,
        poe_standard: null,
        max_ports: null,
        is_poe: false,
        notes: `${powerSupplyVoltage}${powerSupplyCurrent ? ` ${powerSupplyCurrent.replace('.', ',')}A` : ''}`,
      })
    }
    setLoading(false)
  }

  const poeSwitches = switches.filter((s) => s.is_poe)
  const activeCameraId = selectedExistingCameraId || initialData?.id
  const otherCameras = existingCameras.filter((camera) => camera.id !== activeCameraId)
  const selectedDvr = dvrs.find((dvr) => dvr.id === dvrId)
  const selectedSwitch = switches.find((sw) => sw.id === switchId)

  // Fase B + Ch2 — pools separados + canais BNC convertidos em IP (Enhanced IP Mode)
  const channelOptions = (() => {
    if (!selectedDvr) {
      return Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `Canal ${i + 1}`, disabled: false }))
    }
    const analog = selectedDvr.analog_channels ?? selectedDvr.total_channels ?? 0
    const ip = selectedDvr.ip_channels ?? 0
    const disabled = selectedDvr.disabled_analog_channels ?? []

    const cameraKind: 'analogica' | 'ip' | 'wifi' = connectionType === 'wifi'
      ? 'wifi'
      : isIP ? 'ip' : 'analogica'
    const available = getAvailableChannels(cameraKind, analog, ip, disabled)

    return available.map((value) => {
      const occupiedBy = otherCameras.find((camera) => camera.dvr_id === dvrId && camera.channel_number === value)
      const isConverted = disabled.includes(value)
      const kindLabel = value > analog
        ? 'IP'
        : isConverted
          ? 'IP (convertido)'
          : 'BNC'
      const suffix = ` · ${kindLabel}`
      return {
        value,
        label: occupiedBy
          ? activeCameraId
            ? `Canal ${value}${suffix} — trocar com ${occupiedBy.name}`
            : `Canal ${value}${suffix} — ocupado por ${occupiedBy.name}`
          : `Canal ${value}${suffix}`,
        disabled: Boolean(occupiedBy) && !activeCameraId,
      }
    })
  })()

  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingQr(true)

    // Se já tinha uma imagem anterior, remove
    if (qrCodeUrl && qrCodeUrl !== initialData?.qr_code_url) {
      await deleteQRCodeImage(qrCodeUrl)
    }

    const result = await uploadQRCodeImage(file, user.id, initialData?.id)
    if (result.error) {
      setError('Erro ao fazer upload da foto: ' + result.error)
    } else if (result.url) {
      setQrCodeUrl(result.url)
      setError(null)
    }
    setUploadingQr(false)
    e.target.value = ''
  }

  const handleRemoveQr = async () => {
    if (qrCodeUrl && qrCodeUrl !== initialData?.qr_code_url) {
      await deleteQRCodeImage(qrCodeUrl)
    }
    setQrCodeUrl('')
  }

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !user) return

    const remainingSlots = CAMERA_INSTALLATION_PHOTO_LIMIT - installationPhotoGallery.length
    if (remainingSlots <= 0) {
      setError(`Limite de ${CAMERA_INSTALLATION_PHOTO_LIMIT} mídias por câmera atingido.`)
      e.target.value = ''
      return
    }

    const selectedFiles = files.slice(0, remainingSlots)
    if (selectedFiles.length < files.length) {
      setError(`Foram selecionados ${files.length} arquivos, mas só há ${remainingSlots} vaga(s) na galeria.`)
    }

    if (!initialData?.id && (installationPhotoUrl || selectedFiles.length > 1)) {
      setError('Salve a câmera para anexar várias fotos ou vídeos. Antes de salvar, apenas a primeira mídia fica vinculada.')
    }

    setUploadingPhoto(true)

    if (!initialData?.id && installationPhotoUrl && installationPhotoUrl !== initialData?.installation_photo_url) {
      await deleteInstallationPhoto(installationPhotoUrl)
    }

    let nextSortOrder = installationPhotoGallery.length + 1
    for (const file of selectedFiles) {
      const result = await uploadInstallationPhoto(file, user.id, initialData?.id)
      if (result.error) {
        setError('Erro ao fazer upload da mídia: ' + result.error)
        break
      }
      if (!result.url) continue

      if (initialData?.id) {
        const created = await createCameraInstallationPhoto({
          cameraId: initialData.id,
          storagePath: result.url,
          userId: user.id,
          sortOrder: nextSortOrder,
        })
        if (created.error || !created.data) {
          await deleteInstallationPhoto(result.url)
          setError(created.error || 'Erro ao vincular a mídia à câmera.')
          break
        }
        setInstallationPhotos((current) => [...current, created.data!])
        setError(null)
        nextSortOrder += 1
      } else {
        setInstallationPhotoUrl(result.url)
        setError(null)
        break
      }
    }

    setUploadingPhoto(false)
    e.target.value = ''
  }

  const handleRemoveInstallationPhoto = async (photo: { id: string | null; storagePath: string; isLegacy: boolean }) => {
    if (photo.isLegacy) {
      if (installationPhotoUrl && installationPhotoUrl !== initialData?.installation_photo_url) {
        await deleteInstallationPhoto(installationPhotoUrl)
      }
      setInstallationPhotoUrl('')
      setError(null)
      return
    }

    if (photo.id) {
      const result = await deleteCameraInstallationPhoto(photo.id)
      if (result.error) {
        setError(result.error)
        return
      }
    }

    await deleteInstallationPhoto(photo.storagePath)
    setInstallationPhotos((current) => current.filter((item) => item.id !== photo.id))
    setError(null)
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {relocationMode && initialData && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text-secondary space-y-1">
          <p className="font-semibold text-text-primary">Realocação sem novo cadastro</p>
          <p>
            Altere apenas o DVR/canal, balun/porta ou switch/porta necessário. O app mantém fotos, RTSP, observações e demais dados da câmera.
          </p>
          <p className="text-xs text-text-muted">
            Posição atual: {selectedDvr ? `${selectedDvr.name} canal ${channelNumber || '-'}` : 'sem DVR'} · {selectedBalun ? `${selectedBalun.name} porta ${balunPort || '-'}` : 'sem balun'}{selectedSwitch ? ` · ${selectedSwitch.name} porta ${switchPort || '-'}` : ''}
          </p>
        </div>
      )}

      {/* Connection Type Toggle */}
      <div className="flex gap-2 p-1 bg-bg-tertiary rounded-lg w-fit">
        <button
          key="analogica"
          type="button"
          onClick={() => handleConnectionTypeChange('analogica')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            connectionType === 'analogica'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Analógica (DVR)
        </button>
        <button
          key="ip"
          type="button"
          onClick={() => handleConnectionTypeChange('ip')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            connectionType === 'ip'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          IP (Rede)
        </button>
        <button
          key="wifi"
          type="button"
          onClick={() => handleConnectionTypeChange('wifi')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            connectionType === 'wifi'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Wi-Fi
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            label="Nome"
            value={name}
            onChange={(e) => {
              const nextName = e.target.value
              setName(nextName)
              const existingCamera = existingCameras.find((camera) =>
                camera.name.toLocaleLowerCase('pt-BR') === nextName.toLocaleLowerCase('pt-BR')
              )
              if (existingCamera) applyCameraData(existingCamera)
              else if (!initialData) setSelectedExistingCameraId('')
            }}
            required
            placeholder="Ex: Camera Hall Principal"
            list="existing-camera-names"
          />
          <datalist id="existing-camera-names">
            {existingCameras.map((camera) => (
              <option key={camera.id} value={camera.name}>
                {camera.dvr_id ? `Canal ${camera.channel_number ?? '-'}${camera.location ? ` · ${camera.location}` : ''}` : camera.location ?? ''}
              </option>
            ))}
          </datalist>
        </div>
        {brandOptions.length > 0 ? (
          <Select
            label="Marca"
            value={otherBrandMode ? '__other__' : brand}
            onChange={(e) => {
              const val = e.target.value
              if (val === '__other__') {
                setOtherBrandMode(true)
                setBrand('')
              } else {
                setOtherBrandMode(false)
                setBrand(val)
              }
            }}
            options={[
              { value: '', label: 'Selecione ou digite uma marca' },
              ...brandOptions,
              { value: '__other__', label: 'Outra (digitar)' }
            ]}
          />
        ) : (
          <Input label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Intelbras, Hikvision" />
        )}
      </div>
      {existingCameras.length > 0 && !initialData && (
        <div className="bg-bg-tertiary/50 border border-border-light rounded-lg p-3">
          <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5 mb-2">
            <CameraIcon className="w-3.5 h-3.5" />
            Câmera já cadastrada
          </label>
          <Select
            value={selectedExistingCameraId}
            onChange={(e) => handleExistingCameraSelect(e.target.value)}
            options={existingCameras.map((camera) => ({
              value: camera.id,
              label: `${camera.name}${camera.dvr_id ? ` · canal ${camera.channel_number ?? '-'}` : ''}${camera.location ? ` · ${camera.location}` : ''}`,
            }))}
            placeholder="Selecione para editar ou realocar sem duplicar"
          />
          {selectedExistingCameraId && (
            <p className="mt-2 text-xs text-accent">
              Esta câmera será atualizada. Se escolher um canal ocupado, o app troca as duas câmeras de posição.
            </p>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <LabelScanner
          equipmentType="camera"
          onResult={(scanned: EquipmentLabelData) => {
            applyScannedLabel(scanned, [
              { key: 'brand', label: 'Marca', current: brand, setter: setBrand },
              { key: 'model', label: 'Modelo', current: model, setter: setModel },
              { key: 'serial_number', label: 'Nº de série', current: serialNumber, setter: setSerialNumber },
              { key: 'mac_address', label: 'MAC', current: macAddress, setter: setMacAddress },
            ])
          }}
        />
      </div>
      {cameraModels.length > 0 && (
        <div className="bg-bg-tertiary/50 border border-border-light rounded-lg p-3">
          <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5 mb-2">
            <Video className="w-3.5 h-3.5" />
            Modelo cadastrado (opcional)
          </label>
          <Select
            value=""
            onChange={(e) => handleCameraModelSelect(e.target.value)}
            options={cameraModels.map((item) => ({
              value: item.id,
              label: `${item.brand ? `${item.brand} ` : ''}${item.model}${item.resolution ? ` · ${item.resolution}` : ''}`,
            }))}
            placeholder="Selecione para preencher automaticamente"
          />
        </div>
      )}
      {/* Campo para digitar nova marca quando selecionar "Outra" */}
      {otherBrandMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Digite a marca"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex: Intelbras"
            autoFocus
          />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Modelo da câmera"
          value={model}
          onChange={(e) => handleCameraModelTextChange(e.target.value)}
          placeholder="Ex: THC-B1220C-P"
          list="camera-models"
        />
        <Input label="Tipo da lente" value={lensType} onChange={(e) => setLensType(e.target.value)} placeholder="Ex: 2.8 mm, 3.6 mm, varifocal" list="camera-lenses" />
        <datalist id="camera-models">
          {cameraModelOptions.map((modelOption) => <option key={modelOption} value={modelOption} />)}
        </datalist>
        <datalist id="camera-lenses">
          {lensOptions.map((lens) => <option key={lens} value={lens} />)}
        </datalist>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Distância de IR (m)"
          type="number"
          min={0}
          step="0.1"
          value={irDistanceMeters}
          onChange={(e) => setIrDistanceMeters(e.target.value)}
          placeholder="Ex: 20, 30, 50"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="SN / Número de série" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Número de série do equipamento" />
        <Input label="Data de instalação" type="date" value={installationDate} onChange={(e) => setInstallationDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Ex: Estacionamento" />
        <Select
          label="Tecnologia"
          value={technology}
          onChange={(e) => setTechnology(e.target.value)}
          options={technologyOptions}
          required
        />
      </div>

      <SiteSelector value={siteId} onChange={setSiteId} />

      {/* Analógica: DVR + Canal */}
      {!isIP && (
        <div className="border border-border-light rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-accent" />
            Posição no DVR
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="DVR (opcional)"
              value={dvrId}
              onChange={(e) => setDvrId(e.target.value)}
              options={dvrs.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Sem DVR"
            />
            <Select
              label="Canal"
              value={channelNumber}
              onChange={(e) => setChannelNumber(Number(e.target.value))}
              options={channelOptions}
              disabled={!dvrId}
            />
          </div>
          <p className="text-xs text-text-muted">
            Para realocar uma câmera existente, selecione outro DVR/canal. Se o canal estiver ocupado, as duas câmeras trocam de posição.
          </p>
        </div>
      )}

      {/* IP/Wi-Fi: Endereço IP + MAC */}
      {isIP && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Endereço IP (opcional)"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.100"
            />
            <Input
              label="MAC Address (opcional)"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="DVR/NVR (opcional)"
              value={dvrId}
              onChange={(e) => setDvrId(e.target.value)}
              options={dvrs.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Nenhum"
            />
            <Select
              label="Canal"
              value={channelNumber}
              onChange={(e) => setChannelNumber(Number(e.target.value))}
              options={channelOptions}
              disabled={!dvrId}
            />
          </div>
          <p className="text-xs text-text-muted">
            Se esta câmera IP estiver gravando em DVR/NVR, altere aqui o equipamento e o canal. Se for câmera IP direta, deixe sem DVR/NVR.
          </p>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)} options={CAMERA_TYPES} />
        <Select label="Resolução" value={resolution} onChange={(e) => setResolution(e.target.value)} options={RESOLUTION_OPTIONS} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
      </div>

      <div className="border border-border-light rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Visualização local / MediaMTX
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nome do stream MediaMTX"
            value={mediaMtxStreamName}
            onChange={(e) => setMediaMtxStreamName(e.target.value)}
            placeholder="Ex: sala"
          />
          <Input
            label="URL RTSP personalizada"
            value={rtspUrl}
            onChange={(e) => setRtspUrl(e.target.value)}
            placeholder="rtsp://usuario:senha@192.168.0.130:554/..."
          />
          <Input
            label="Usuário de visualização"
            value={streamingUser}
            onChange={(e) => setStreamingUser(e.target.value)}
            placeholder="Ex: admin"
          />
          <Input
            label="Senha de visualização"
            type="password"
            value={streamingPassword}
            onChange={(e) => setStreamingPassword(e.target.value)}
            placeholder="Senha RTSP/câmera"
          />
        </div>
        <p className="text-xs text-text-muted">
          Use o nome do stream quando uma configuração do MediaMTX já funcionou, como sala. A URL RTSP personalizada tem prioridade sobre o IP/canal gerado automaticamente.
        </p>
      </div>

      {/* Balun - only for analog cameras */}
      {!isIP && (
        <div className="border border-border-light rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Cable className="w-4 h-4 text-accent" />
            Caminho no balun
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Balun / Power Balun (opcional)"
              value={balunId}
              onChange={(e) => {
                const nextBalunId = e.target.value
                setBalunId(nextBalunId)
                setBalunPort('')
                const nextBalun = baluns.find((balun) => balun.id === nextBalunId)
                if (nextBalun) {
                  setPowerSourceType((current) => resolvePowerSourceForBalun(nextBalun.balun_type ?? 'power', current))
                }
              }}
              options={baluns.map((b) => ({
                value: b.id,
                label: getBalunOptionLabel(b.name, b.balun_type ?? 'power'),
              }))}
              placeholder="Sem balun"
            />
            <Select
              label="Porta do Balun"
              value={balunPort}
              onChange={(e) => setBalunPort(e.target.value)}
              options={(() => {
                const b = baluns.find((x) => x.id === balunId)
                const max = b?.total_ports ?? 16
                return Array.from({ length: max }, (_, i) => {
                  const value = i + 1
                  const occupiedBy = otherCameras.find((camera) => camera.balun_id === balunId && camera.balun_port === value)
                  return {
                    value,
                    label: occupiedBy ? `Porta ${value} - ocupada por ${occupiedBy.name}` : `Porta ${value}`,
                    disabled: Boolean(occupiedBy),
                  }
                })
              })()}
              placeholder="Selecione"
              disabled={!balunId}
            />
          </div>
          <p className="text-xs text-text-muted">
            Para mover para outro power balun ou trocar de porta, escolha uma porta livre. Portas ocupadas aparecem bloqueadas.
          </p>
        </div>
      )}

      {!isIP && selectedBalun && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${selectedBalun.balun_type === 'passive' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-accent/30 bg-accent/10 text-text-secondary'}`}>
          {selectedBalun.balun_type === 'passive'
            ? 'Balun passivo: transmite o vídeo. A câmera deve usar fonte de alimentação separada.'
            : 'Power Balun: transmite o vídeo e fornece alimentação para a câmera.'}
        </div>
      )}

      {/* Switch - apenas para câmeras IP */}
      {isIP && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Switch PoE (opcional)"
            value={switchId}
            onChange={(e) => setSwitchId(e.target.value)}
            options={(poeSwitches.length > 0 ? poeSwitches : switches).map((s) => ({
              value: s.id,
              label: `${s.name}${s.is_poe ? ' ⚡' : ''}`,
            }))}
            placeholder="Nenhum"
          />
          <Select
            label="Porta do Switch"
            value={switchPort}
            onChange={(e) => setSwitchPort(e.target.value)}
            options={(() => {
              const s = switches.find((x) => x.id === switchId)
              const max = s?.total_ports ?? 24
              return Array.from({ length: max }, (_, i) => {
                const value = i + 1
                const occupiedBy = otherCameras.find((camera) => camera.switch_id === switchId && camera.switch_port === value)
                return {
                  value,
                  label: occupiedBy ? `Porta ${value} - ocupada por ${occupiedBy.name}` : `Porta ${value}`,
                  disabled: Boolean(occupiedBy),
                }
              })
            })()}
            placeholder="Selecione"
          />
        </div>
      )}

      {/* Cabeamento (resumo somente leitura) */}
      {initialData?.id && (
        <CablingSummary cameraId={initialData.id} />
      )}

      {/* Alimentação */}
      <div className="border border-border-light rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          Alimentação da Câmera
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipo de alimentação"
            value={powerSourceType}
            onChange={(e) => {
              setPowerSourceType(e.target.value)
              if (e.target.value === 'poe') setPoePowered(true)
              if (e.target.value !== 'poe') setPoePowered(false)
            }}
            options={POWER_SOURCE_OPTIONS}
          />
          {powerSourceType === 'power_supply' && powerSupplyModels.length > 0 && (
            <Select
              label="Modelo de fonte salvo"
              value=""
              onChange={(e) => handlePowerSupplyModelSelect(e.target.value)}
              options={[
                { value: '', label: 'Selecione uma fonte cadastrada' },
                ...powerSupplyModels.map((m) => ({
                  value: m.id,
                  label: `${m.brand} ${m.model}${m.notes ? ` (${m.notes})` : ''}`,
                })),
              ]}
            />
          )}
        </div>

        {powerSourceType === 'power_supply' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tensão"
              value={powerSupplyVoltage}
              onChange={(e) => setPowerSupplyVoltage(e.target.value)}
              options={POWER_SUPPLY_VOLTAGE_OPTIONS}
            />
            <Select
              label="Corrente"
              value={powerSupplyCurrent}
              onChange={(e) => setPowerSupplyCurrent(e.target.value)}
              options={POWER_SUPPLY_CURRENT_OPTIONS}
              placeholder="Selecione"
            />
            <Input
              label="Marca da fonte"
              value={powerSupplyBrand}
              onChange={(e) => setPowerSupplyBrand(e.target.value)}
              placeholder="Ex: Intelbras, Hayonik"
            />
            <Input
              label="Modelo da fonte"
              value={powerSupplyModel}
              onChange={(e) => handlePowerSupplyModelTextChange(e.target.value)}
              placeholder="Ex: EF 1205, 12V 10A"
              list="power-supply-models"
            />
            <datalist id="power-supply-models">
              {powerSupplyModels.map((item) => <option key={item.id} value={item.model} />)}
            </datalist>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border-light pt-3">
          <Select
            label="Tensão consumida pela câmera"
            value={operatingVoltage}
            onChange={(e) => setOperatingVoltage(e.target.value)}
            options={POWER_SUPPLY_VOLTAGE_OPTIONS}
          />
          <Input
            label="Corrente consumida (A)"
            type="number"
            min={0}
            step="0.01"
            value={currentConsumption}
            onChange={(e) => setCurrentConsumption(e.target.value)}
            placeholder="Ex: 0,35"
          />
        </div>
      </div>
      {isIP && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5" />
            Foto do QR Code de Acesso
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleQrFileChange}
            className="hidden"
          />

          {qrCodeUrl ? (
            <div className="relative w-fit group">
              {qrPreviewUrl ? (
                <img
                  src={qrPreviewUrl}
                  alt="QR Code da câmera"
                  className="w-48 h-48 object-contain border border-border-light rounded-lg bg-bg-primary"
                />
              ) : (
                <div className="w-48 h-48 border border-border-light rounded-lg bg-bg-primary flex items-center justify-center text-xs text-text-muted">
                  Preparando QR...
                </div>
              )}
              <button
                type="button"
                onClick={handleRemoveQr}
                className="absolute -top-2 -right-2 w-7 h-7 bg-danger text-white rounded-full flex items-center justify-center shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                title="Remover foto"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 px-2 py-1 bg-bg-tertiary/90 backdrop-blur-sm text-text-primary text-xs rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                Substituir
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingQr}
              className="w-full sm:w-auto flex items-center gap-2 px-4 py-8 border-2 border-dashed border-border-light rounded-lg text-text-muted hover:border-accent hover:text-accent transition-colors"
            >
              {uploadingQr ? (
                <span className="animate-pulse">Compactando e enviando...</span>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <CameraIcon className="w-5 h-5" />
                    <Video className="w-5 h-5" />
                  </div>
                  <span>Tirar foto do QR Code</span>
                  <span className="text-xs opacity-60">(ou selecionar arquivo)</span>
                </>
              )}
            </button>
          )}

          <p className="text-xs text-text-muted">
            Disponível para câmeras IP/Wi-Fi. A imagem é compactada antes do envio.
          </p>
        </div>
      )}

      {/* ── Fotos do local de instalação ── */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Fotos e vídeos do Local de Instalação ({installationPhotoGallery.length}/{CAMERA_INSTALLATION_PHOTO_LIMIT})
        </label>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          capture="environment"
          onChange={handlePhotoFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {installationPhotoGallery.map((photo, index) => {
            const previewUrl = installationPhotoPreviews[photo.storagePath]
            return (
              <div key={`${photo.id || 'legacy'}-${photo.storagePath}`} className="relative group">
                {previewUrl ? (
                  photo.mediaKind === 'video' ? (
                    <video
                      src={previewUrl}
                      controls
                      preload="metadata"
                      className="w-full aspect-[4/3] object-cover border border-border-light rounded-lg bg-bg-primary"
                      aria-label={`Vídeo ${index + 1} do local de instalação`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFullscreenPhoto({
                        url: previewUrl,
                        alt: `Foto ${index + 1} do local de instalação`,
                      })}
                      className="block w-full"
                      title="Ver foto em tela cheia"
                    >
                      <img
                        src={previewUrl}
                        alt={`Foto ${index + 1} do local de instalação`}
                        className="w-full aspect-[4/3] object-cover border border-border-light rounded-lg bg-bg-primary cursor-zoom-in"
                      />
                    </button>
                  )
                ) : (
                  <div className="w-full aspect-[4/3] border border-border-light rounded-lg bg-bg-primary flex items-center justify-center text-xs text-text-muted">
                    Preparando mídia...
                  </div>
                )}
                <div className="absolute left-2 top-2 rounded bg-bg-primary/85 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                  {photo.mediaKind === 'video' ? 'Vídeo' : 'Foto'} {index + 1}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveInstallationPhoto(photo)}
                  className="absolute -top-2 -right-2 z-10 w-7 h-7 bg-danger text-white rounded-full flex items-center justify-center shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  title="Remover foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}

          {canAddInstallationPhoto && (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-2 px-4 border-2 border-dashed border-border-light rounded-lg text-text-muted hover:border-accent hover:text-accent transition-colors"
            >
              {uploadingPhoto ? (
                <span className="animate-pulse text-sm">Enviando...</span>
              ) : (
                <>
                  <CameraIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Adicionar mídias</span>
                  <span className="text-xs opacity-60">fotos ou vídeos</span>
                </>
              )}
            </button>
          )}
        </div>

        {!canAddInstallationPhoto && (
          <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs text-success">
            Limite de {CAMERA_INSTALLATION_PHOTO_LIMIT} mídias atingido para esta câmera.
          </div>
        )}

        <p className="text-xs text-text-muted">
          Registre fotos e vídeos do ponto da câmera para conferência física futura.
          {!initialData?.id && installationPhotoGallery.length > 0 ? ' Salve a câmera para anexar mais mídias.' : ''}
        </p>
      </div>

      <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
    {fullscreenPhoto && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
        role="dialog"
        aria-modal="true"
        onClick={() => setFullscreenPhoto(null)}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setFullscreenPhoto(null)
          }}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          title="Fechar foto"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={fullscreenPhoto.url}
          alt={fullscreenPhoto.alt}
          className="max-h-[92vh] max-w-[96vw] rounded-lg border border-white/10 object-contain shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    )}
    </>
  )
}

interface CablingSummaryProps {
  cameraId: string
}

function CablingSummary({ cameraId }: CablingSummaryProps) {
  const { data: utpCables, loading: loadingUtp } = useUtpCables()
  const { data: powerCables, loading: loadingPower } = usePowerCables()

  const [editingUtpCableId, setEditingUtpCableId] = useState<string | null>(null)
  const [creatingUtp, setCreatingUtp] = useState(false)
  const [editingPowerCableId, setEditingPowerCableId] = useState<string | null>(null)
  const [creatingPower, setCreatingPower] = useState(false)

  const linkedUtp = utpCables.filter((cable) =>
    cable.utp_cable_pairs?.some((pair) => pair.camera_id === cameraId),
  )
  const linkedPower = powerCables.filter((cable) => cable.camera_ids?.includes(cameraId))

  const loading = loadingUtp || loadingPower

  return (
    <div className="border border-border-light rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Cable className="w-4 h-4 text-accent" />
        Cabeamento
      </h3>

      {loading ? (
        <p className="text-xs text-text-muted">Carregando cabos…</p>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-text-secondary">Cabos UTP</p>
              {linkedUtp.length === 0 && (
                <button
                  type="button"
                  onClick={() => setCreatingUtp(true)}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Vincular a cabo UTP
                </button>
              )}
            </div>
            {linkedUtp.length === 0 ? (
              <p className="text-xs text-text-muted">
                Sem cabo UTP vinculado. Clique acima para criar ou associar.
              </p>
            ) : (
              linkedUtp.map((cable) => {
                const functions = [1, 2, 3, 4]
                  .map((n) => cable.utp_cable_pairs?.find((p) => p.pair_number === n)?.function ?? 'nao_utilizado')
                  .map((fn) => fn as PairFunction)
                const preset = detectCablePreset(functions)
                const videoPairs = cable.utp_cable_pairs?.filter((p) => p.function === 'video') ?? []
                const sisterIds = videoPairs
                  .map((p) => p.camera_id)
                  .filter((id): id is string => Boolean(id) && id !== cameraId)
                const myPair = videoPairs.find((p) => p.camera_id === cameraId)?.pair_number
                return (
                  <div
                    key={cable.id}
                    className="rounded-md border border-border-light bg-bg-primary/50 px-3 py-2 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary truncate">
                        {cable.name ?? 'Cabo sem nome'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-accent">{CABLE_PRESETS[preset].label}</span>
                        <button
                          type="button"
                          onClick={() => setEditingUtpCableId(cable.id)}
                          className="text-text-muted hover:text-accent p-1 rounded-md hover:bg-bg-tertiary"
                          title="Editar cabo"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-text-muted">
                      {myPair ? `Esta câmera ocupa o par ${myPair}.` : 'Câmera vinculada sem par de vídeo.'}
                      {sisterIds.length > 0 && (
                        <> Compartilhado com <strong>{sisterIds.length}</strong> outra(s) câmera(s).</>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-text-secondary">Alimentação paralela</p>
              {linkedPower.length === 0 && (
                <button
                  type="button"
                  onClick={() => setCreatingPower(true)}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Vincular a cabo de alimentação
                </button>
              )}
            </div>
            {linkedPower.length === 0 ? (
              <p className="text-xs text-text-muted">
                Sem cabo paralelo de alimentação. Clique acima para criar ou associar.
              </p>
            ) : (
              linkedPower.map((cable) => (
                <div
                  key={cable.id}
                  className="rounded-md border border-border-light bg-bg-primary/50 px-3 py-2 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary truncate">{cable.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-accent">
                        {cable.voltage ?? '—'}
                        {cable.wire_gauge_mm2 ? ` · ${cable.wire_gauge_mm2.toString().replace('.', ',')} mm²` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingPowerCableId(cable.id)}
                        className="text-text-muted hover:text-accent p-1 rounded-md hover:bg-bg-tertiary"
                        title="Editar cabo de alimentação"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-text-muted">
                    Alimenta {cable.camera_ids?.length ?? 0} câmera(s)
                    {cable.power_source_info ? ` · ${cable.power_source_info}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Modais aninhados */}
      <Modal
        open={!!editingUtpCableId}
        onClose={() => setEditingUtpCableId(null)}
        title="Editar cabo UTP"
        size="lg"
      >
        {editingUtpCableId && (
          <UtpCableForm
            cableId={editingUtpCableId}
            onClose={() => setEditingUtpCableId(null)}
          />
        )}
      </Modal>

      <Modal
        open={creatingUtp}
        onClose={() => setCreatingUtp(false)}
        title="Vincular a cabo UTP"
        size="lg"
      >
        <UtpCableForm
          anchorCameraId={cameraId}
          onClose={() => setCreatingUtp(false)}
        />
      </Modal>

      <Modal
        open={!!editingPowerCableId}
        onClose={() => setEditingPowerCableId(null)}
        title="Editar cabo de alimentação"
        size="lg"
      >
        {editingPowerCableId && (
          <PowerCableForm
            powerCableId={editingPowerCableId}
            onClose={() => setEditingPowerCableId(null)}
          />
        )}
      </Modal>

      <Modal
        open={creatingPower}
        onClose={() => setCreatingPower(false)}
        title="Vincular a cabo de alimentação"
        size="lg"
      >
        <PowerCableForm
          onClose={() => setCreatingPower(false)}
        />
      </Modal>
    </div>
  )
}
