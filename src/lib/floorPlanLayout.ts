export function getNextEquipmentPosition(positionedCount: number) {
  const columns = 7
  return {
    x: 12 + (positionedCount % columns) * 12.5,
    y: 14 + (Math.floor(positionedCount / columns) % 6) * 14,
  }
}
