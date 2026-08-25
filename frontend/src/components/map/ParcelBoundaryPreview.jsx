import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polyline } from 'react-leaflet';
import { MapPinOff } from 'lucide-react';
import {
  BASE_LAYERS,
  CENTERLINE_STYLE,
  CORRIDOR_STYLE,
  parcelPathOptions,
} from './mapConstants';
import { fetchCorridor, fetchParcelFeature } from '../../services/gisService';

/**
 * Read-only boundary preview — Phase 5
 *
 * Renders one parcel's PostGIS boundary (and the project corridor around it) as
 * a small non-interactive map, for use inside the parcel record page.
 */
export default function ParcelBoundaryPreview({ parcelId }) {
  const [feature, setFeature] = useState(null);
  const [corridor, setCorridor] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState('loading');
      try {
        const parcelFeature = await fetchParcelFeature(parcelId);
        if (cancelled) return;

        if (!parcelFeature.geometry) {
          setState('no-geometry');
          return;
        }

        setFeature(parcelFeature);
        setState('ready');

        // Corridor context is optional
        if (parcelFeature.properties.project_id) {
          try {
            const res = await fetchCorridor(parcelFeature.properties.project_id);
            if (!cancelled) setCorridor(res.data);
          } catch {
            /* corridor is supplementary */
          }
        }
      } catch {
        if (!cancelled) setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [parcelId]);

  if (state === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-50">
        <span className="spinner" />
      </div>
    );
  }

  if (state !== 'ready' || !feature) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-50 text-center px-4">
        <MapPinOff className="w-6 h-6 text-neutral-300 mb-1.5" />
        <p className="text-[11px] font-semibold text-neutral-600">
          {state === 'no-geometry' ? 'No boundary mapped' : 'Boundary unavailable'}
        </p>
        <p className="text-[10px] text-neutral-400 mt-0.5">
          {state === 'no-geometry'
            ? 'Set latitude and longitude to generate a boundary.'
            : 'Could not load the parcel geometry.'}
        </p>
      </div>
    );
  }

  const base = BASE_LAYERS[0];
  const center = [feature.properties.centroid_lat, feature.properties.centroid_lng];

  const corridorFeature = corridor?.features?.find((f) => f.properties.layer === 'CORRIDOR');
  const centerlineFeature = corridor?.features?.find((f) => f.properties.layer === 'CENTERLINE');
  const centerlinePositions = centerlineFeature
    ? centerlineFeature.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    : null;

  return (
    <MapContainer
      center={center}
      zoom={16}
      className="w-full h-full"
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      attributionControl={false}
      keyboard={false}
    >
      <TileLayer url={base.url} maxZoom={base.maxZoom} />

      {corridorFeature && (
        <GeoJSON data={corridorFeature} style={() => CORRIDOR_STYLE} interactive={false} />
      )}
      {centerlinePositions && (
        <Polyline positions={centerlinePositions} pathOptions={CENTERLINE_STYLE} interactive={false} />
      )}

      <GeoJSON
        data={feature}
        style={() =>
          parcelPathOptions(feature.properties.acquisition_status, { selected: true })
        }
        interactive={false}
      />
    </MapContainer>
  );
}
