/** Orthographic sphere geometry shared by surface points and the WebGL renderer. */
export interface MoonView { longitude: number; latitude: number; zoom: number }
export const INITIAL_VIEW: MoonView = { longitude: 8, latitude: 12, zoom: 1 };
export const radians = (degrees: number) => degrees * Math.PI / 180;
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export function projectSite(latitude: number, longitude: number, view: MoonView) {
  const lat = radians(latitude);
  const lon = radians(longitude - view.longitude);
  const pitch = radians(view.latitude);
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat) * Math.cos(pitch) - Math.cos(lat) * Math.cos(lon) * Math.sin(pitch);
  const z = Math.sin(lat) * Math.sin(pitch) + Math.cos(lat) * Math.cos(lon) * Math.cos(pitch);
  return { x, y, z };
}

export function surfaceLabels<T extends { latitude: number; longitude: number; id: string }>(
  sites: T[], view: MoonView, size: number,
) {
  const radius = size * 0.42 * view.zoom;
  const points = sites.map((site) => {
    const point = projectSite(site.latitude, site.longitude, view);
    return { site, z: point.z, x: size / 2 + point.x * radius, y: size / 2 - point.y * radius };
  }).filter((point) => point.z > 0.08 && point.x > 8 && point.x < size - 8 && point.y > 8 && point.y < size - 8);
  // Separate callouts keep Apollo 12 and 14 independently selectable at globe scale.
  const ordered = [...points].sort((a, b) => a.x - b.x);
  const leftIds = new Set(ordered.slice(0, Math.ceil(ordered.length / 2)).map((point) => point.site.id));
  return [-1, 1].flatMap((side) => {
    const column = points.filter((point) => (leftIds.has(point.site.id) ? -1 : 1) === side).sort((a, b) => a.y - b.y);
    let previous = 15;
    return column.map((point, index) => {
      const maxY = size - 24 - (column.length - index - 1) * 56;
      const labelY = clamp(Math.max(point.y, previous + 56), 24, maxY);
      previous = labelY;
      return { ...point, labelX: side < 0 ? size * 0.16 : size * 0.84, labelY };
    });
  });
}
