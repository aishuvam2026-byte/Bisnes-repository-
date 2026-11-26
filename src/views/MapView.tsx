import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { Phone, MessageSquare, Plus, Navigation, MapPin, ShieldCheck } from 'lucide-react';
import L from 'leaflet';

export const MapView: React.FC<{ onSelectCustomerForOrder?: (c: Customer) => void }> = ({
  onSelectCustomerForOrder,
}) => {
  const { customers, settings, openMorePage } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if map already initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        [settings.businessCoordinates.lat, settings.businessCoordinates.lng],
        8
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // 150 km Free Delivery Radius Circle around Nuapatna
      const circle = L.circle([settings.businessCoordinates.lat, settings.businessCoordinates.lng], {
        color: '#0284C7',
        fillColor: '#38BDF8',
        fillOpacity: 0.12,
        radius: settings.freeDeliveryRadiusKm * 1000, // in meters
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);

      circle.bindTooltip(`Rupam 150 km Free Delivery Zone`, { permanent: false, direction: 'top' });

      // Hub Marker (Nuapatna)
      const hubIcon = L.divIcon({
        className: 'custom-hub-icon',
        html: `<div style="background:#0284C7;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3)">R</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([settings.businessCoordinates.lat, settings.businessCoordinates.lng], { icon: hubIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;"><b>Rupam Wholesale Hub</b><br/>Nuapatna, Cuttack 754035<br/>150 km Free Delivery Center</div>`
        );

      // Customer Markers
      customers.forEach((c) => {
        // Status color: red for pending udhaar, amber for pending balance, green for active/regular
        const pinColor = c.pendingUdhaar > 0 ? '#DC2626' : c.pendingBalance > 0 ? '#D97706' : '#16A34A';

        const pinIcon = L.divIcon({
          className: 'custom-cust-icon',
          html: `<div style="background:${pinColor};color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.25)">📍</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const popupContent = `
          <div style="font-family:sans-serif;padding:4px;min-width:180px;">
            <div style="font-weight:bold;font-size:13px;color:#111827;">${c.shopName}</div>
            <div style="font-size:11px;color:#4B5563;margin-top:2px;">${c.ownerName} • ${c.city}</div>
            <div style="font-size:11px;font-weight:bold;color:${c.distanceKm <= 150 ? '#059669' : '#D97706'};margin-top:4px;">
              ${c.distanceKm} km from Nuapatna ${c.distanceKm <= 150 ? '(Free Delivery)' : '(+Delivery Fee)'}
            </div>
            ${
              c.pendingUdhaar > 0
                ? `<div style="color:#DC2626;font-size:11px;font-weight:bold;">Pending Udhaar: ₹${c.pendingUdhaar}</div>`
                : ''
            }
            <div style="margin-top:8px;display:flex;gap:4px;">
              <a href="tel:${c.phone}" style="background:#0284C7;color:white;padding:4px 8px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:bold;">Call</a>
              <a href="https://wa.me/91${c.phone}" target="_blank" style="background:#16A34A;color:white;padding:4px 8px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:bold;">WhatsApp</a>
            </div>
          </div>
        `;

        L.marker([c.lat, c.lng], { icon: pinIcon }).addTo(map).bindPopup(popupContent);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [customers, settings]);

  return (
    <div className="space-y-4 pb-28">
      {/* Map Legend Banner */}
      <div className="glass-card rounded-3xl p-4 border border-white/90 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">Retailer Map &amp; 150 km Radius</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">Nuapatna Hub</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Shop
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Balance Pending
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Udhaar Due
          </span>
        </div>
      </div>

      {/* Leaflet Map Surface */}
      <div className="glass-card rounded-3xl p-2 border border-white/90 shadow-lg overflow-hidden h-[420px] relative">
        <div ref={mapContainerRef} className="w-full h-full rounded-2xl" />
      </div>

      {/* Customer Quick List with Distance */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
          Retailer Shops by Distance
        </span>

        {customers.slice(0, 5).map((c) => (
          <div
            key={c.id}
            className="glass-card rounded-2xl p-3 flex items-center justify-between gap-2 border border-slate-100"
          >
            <div>
              <h4 className="font-bold text-slate-900 text-xs">{c.shopName}</h4>
              <p className="text-[11px] text-slate-500">{c.city} • {c.distanceKm} km from Nuapatna</p>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${c.phone}`}
                className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
              <a
                href={`https://wa.me/91${c.phone}`}
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
