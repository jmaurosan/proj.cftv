import Input from './Input'
import { calculatePowerWatts } from '../../lib/powerConsumption'

interface Props {
  powerWatts: string
  operatingVoltage: string
  currentConsumption: string
  onPowerWattsChange: (value: string) => void
  onOperatingVoltageChange: (value: string) => void
  onCurrentConsumptionChange: (value: string) => void
}

export default function PowerConsumptionFields(props: Props) {
  const calculated = calculatePowerWatts({
    power_watts: props.powerWatts ? Number(props.powerWatts.replace(',', '.')) : null,
    operating_voltage: props.operatingVoltage,
    current_consumption_a: props.currentConsumption ? Number(props.currentConsumption.replace(',', '.')) : null,
  })
  const automatic = !props.powerWatts && calculated != null

  return (
    <div className="rounded-lg border border-border-light bg-bg-tertiary/20 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-text-primary">Consumo elétrico</p>
        <p className="text-xs text-text-muted">Informe watts diretamente ou tensão e corrente para cálculo automático.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Potência informada (W)" type="number" min={0} step="0.01" value={props.powerWatts} onChange={(event) => props.onPowerWattsChange(event.target.value)} placeholder="Ex: 18" />
        <Input label="Tensão de operação" value={props.operatingVoltage} onChange={(event) => props.onOperatingVoltageChange(event.target.value)} placeholder="Ex: 12V" />
        <Input label="Corrente (A)" type="number" min={0} step="0.001" value={props.currentConsumption} onChange={(event) => props.onCurrentConsumptionChange(event.target.value)} placeholder="Ex: 0,45" />
      </div>
      <p className={`text-xs ${calculated != null ? 'text-accent' : 'text-text-muted'}`}>
        {calculated != null
          ? `${automatic ? 'Calculado automaticamente' : 'Consumo considerado'}: ${calculated.toLocaleString('pt-BR')} W`
          : 'Consumo ainda não calculável. Informe W ou uma tensão única com a corrente.'}
      </p>
    </div>
  )
}
