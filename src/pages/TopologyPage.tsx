import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import NetworkTopology from '../components/NetworkTopology'

export default function TopologyPage() {
  return (
    <div className="space-y-6">
      <ClientFilterBanner />
      <NetworkTopology />
    </div>
  )
}
