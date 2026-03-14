export function screenToCanvas(screenX, screenY, pan, zoom) {
  return {
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom,
  }
}

export function hitTestZones(canvasX, canvasY, zones) {
  for (let i = zones.length - 1; i >= 0; i--) {
    const z = zones[i]
    if (
      canvasX >= z.x &&
      canvasX <= z.x + z.width &&
      canvasY >= z.y &&
      canvasY <= z.y + z.height
    ) {
      return z
    }
  }
  return null
}
