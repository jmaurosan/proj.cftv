import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import InteractiveFloorPlan from '../components/InteractiveFloorPlan'

export default function FloorPlanPage() {
  return (
    <div className="space-y-6">
      <ClientFilterBanner />
      <InteractiveFloorPlan />
    </div>
  )
}
