import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapHub { id: number; name: string; latitude: number; longitude: number; label?: string; muted?: boolean }

/** Bản đồ Hub (OpenStreetMap). Nhãn mỗi Hub hiển thị số xe khả dụng như mockup. */
export function HubMap({ hubs, selectedId, onSelect, height = 420 }: { hubs: MapHub[]; selectedId?: number | null; onSelect?: (id: number) => void; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([10.8755, 106.8015], 15);
    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);
    let errors = 0;
    osm.on('tileerror', () => {
      if (++errors !== 3 || !map.current) return;
      map.current.removeLayer(osm);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: 'Tiles © Esri',
      }).addTo(map.current);
    });
    layer.current = L.layerGroup().addTo(map.current);
    // Leaflet chỉ tải tile cho kích thước khung lúc khởi tạo; khi layout co giãn
    // phải báo lại kích thước, nếu không sẽ có vùng xám không có tile.
    const m = map.current;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    const t = setTimeout(() => m.invalidateSize(), 200);
    return () => { ro.disconnect(); clearTimeout(t); m.remove(); map.current = null; fitted.current = false; };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    hubs.forEach((h) => {
      const icon = L.divIcon({
        className: 'pin-wrap',
        html: `<div class="hub-pin ${h.id === selectedId ? 'sel' : ''} ${h.muted ? 'empty' : ''}">📍 ${escapeHtml(h.label ?? h.name)}</div>`,
        iconSize: [0, 0], iconAnchor: [20, 14],
      });
      L.marker([h.latitude, h.longitude], { icon }).on('click', () => onSelect?.(h.id)).addTo(layer.current!);
    });
    if (hubs.length > 1 && !fitted.current) {
      fitted.current = true;
      map.current.fitBounds(L.latLngBounds(hubs.map((h) => [h.latitude, h.longitude] as [number, number])).pad(0.25));
    }
  }, [hubs, selectedId, onSelect]);

  useEffect(() => {
    const h = hubs.find((x) => x.id === selectedId);
    if (h && map.current && !map.current.getBounds().pad(-0.1).contains([h.latitude, h.longitude])) map.current.panTo([h.latitude, h.longitude]);
  }, [selectedId, hubs]);

  return <div ref={el} className="map" style={{ height }} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
