import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polyline, ScaleControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  BASE_LAYERS,
  CENTERLINE_STYLE,
  CORRIDOR_STYLE,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  getStatusStyle,
  parcelPathOptions,
} from './mapConstants';

/**
 * Imperatively fits the map to a [[south, west], [north, east]] bounds array.
 * Kept as a child component so it has access to the Leaflet map instance.
 */
function FitBounds({ bounds, padding = 0.18 }) {
  const map = useMap();
  const lastKey = useRef(null);

  useEffect(() => {
    if (!bounds) return;
    const key = JSON.stringify(bounds);
    if (key === lastKey.current) return;
    lastKey.current = key;

    const [[south, west], [north, east]] = bounds;
    // A single small parcel produces a near-zero extent; pad it so Leaflet does
    // not zoom to its maximum level.
    const latPad = Math.max((north - south) * padding, 0.0015);
    const lngPad = Math.max((east - west) * padding, 0.0015);

    map.fitBounds(
      [
        [south - latPad, west - lngPad],
        [north + latPad, east + lngPad],
      ],
      { animate: true }
    );
  }, [bounds, map, padding]);

  return null;
}

/** Recomputes tile layout when the container is resized (panel open/close). */
function InvalidateOnResize({ trigger }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(timer);
  }, [map, trigger]);
  return null;
}

/**
 * Interactive parcel map — Phase 5
 *
 * Renders three database-driven layers:
 *   1. the project acquisition corridor (PostGIS geodesic buffer)
 *   2. the project alignment centreline
 *   3. parcel polygons, coloured by acquisition status
 *
 * Clicking a parcel raises onSelectParcel with the parcel id, which the page
 * uses to load that parcel's real database record.
 */
export default function ParcelMap({
  parcelLayer,
  corridorLayer,
  selectedParcelId,
  onSelectParcel,
  bounds,
  baseLayerId = 'osm',
  showCorridor = true,
  showCenterline = true,
  showLabels = false,
  resizeTrigger,
}) {
  const baseLayer = BASE_LAYERS.find((b) => b.id === baseLayerId) || BASE_LAYERS[0];

  const corridorFeature = useMemo(
    () => corridorLayer?.features?.find((f) => f.properties.layer === 'CORRIDOR') || null,
    [corridorLayer]
  );

  const centerlineFeature = useMemo(
    () => corridorLayer?.features?.find((f) => f.properties.layer === 'CENTERLINE') || null,
    [corridorLayer]
  );

  // GeoJSON stores [lng, lat]; Leaflet's Polyline wants [lat, lng]
  const centerlinePositions = useMemo(() => {
    if (!centerlineFeature) return null;
    return centerlineFeature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  }, [centerlineFeature]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="w-full h-full"
      zoomControl
      preferCanvas={false}
    >
      <TileLayer
        key={baseLayer.id}
        url={baseLayer.url}
        attribution={baseLayer.attribution}
        maxZoom={baseLayer.maxZoom}
      />

      <ScaleControl position="bottomleft" imperial={false} />
      <FitBounds bounds={bounds} />
      <InvalidateOnResize trigger={resizeTrigger} />

      {/* ── Project acquisition corridor ─────────────────────────── */}
      {showCorridor && corridorFeature && (
        <GeoJSON
          key={`corridor-${corridorFeature.id}`}
          data={corridorFeature}
          style={() => CORRIDOR_STYLE}
          interactive={false}
        />
      )}

      {/* ── Project alignment centreline ─────────────────────────── */}
      {showCenterline && centerlinePositions && (
        <Polyline
          key={`centerline-${centerlineFeature.id}`}
          positions={centerlinePositions}
          pathOptions={CENTERLINE_STYLE}
          interactive={false}
        />
      )}

      {/* ── Parcel polygons ──────────────────────────────────────── */}
      {parcelLayer?.features?.length > 0 && (
        <GeoJSON
          // Remounting on data/selection change is what makes react-leaflet
          // re-apply the style function to every feature.
          key={`parcels-${parcelLayer.features.length}-${selectedParcelId || 'none'}-${showLabels}`}
          data={parcelLayer}
          style={(feature) =>
            parcelPathOptions(feature.properties.acquisition_status, {
              selected: feature.properties.id === selectedParcelId,
            })
          }
          onEachFeature={(feature, layer) => {
            const p = feature.properties;
            const style = getStatusStyle(p.acquisition_status);

            layer.bindTooltip(
              `<div style="font-family:Inter,sans-serif;line-height:1.45">
                 <strong>${p.parcel_code}</strong> &middot; Survey ${p.survey_number || '—'}<br/>
                 <span style="color:#475569">${p.village || ''}${p.district ? ', ' + p.district : ''}</span><br/>
                 <span style="color:${style.stroke};font-weight:600">${style.label}</span>
                 <span style="color:#64748b"> &middot; ${p.area_acres} ac</span>
               </div>`,
              { sticky: true, direction: 'top', opacity: 0.97 }
            );

            if (showLabels) {
              layer.bindTooltip(p.parcel_code, {
                permanent: true,
                direction: 'center',
                className: 'parcel-label-tooltip',
              });
            }

            layer.on({
              click: () => onSelectParcel?.(p.id),
              mouseover: (e) => e.target.setStyle({ weight: 3, fillOpacity: 0.78 }),
              mouseout: (e) =>
                e.target.setStyle(
                  parcelPathOptions(p.acquisition_status, {
                    selected: p.id === selectedParcelId,
                  })
                ),
            });
          }}
        />
      )}
    </MapContainer>
  );
}

/** Convert a PostGIS extent response into Leaflet bounds. */
export function extentToBounds(extent) {
  if (
    !extent ||
    extent.min_lat === null ||
    extent.min_lng === null ||
    extent.max_lat === null ||
    extent.max_lng === null
  ) {
    return null;
  }
  return [
    [extent.min_lat, extent.min_lng],
    [extent.max_lat, extent.max_lng],
  ];
}

/** Bounds for a single search result / parcel feature. */
export function featureBounds(result) {
  if (!result) return null;
  if (
    result.min_lat !== undefined &&
    result.min_lat !== null &&
    result.max_lat !== null
  ) {
    return [
      [result.min_lat, result.min_lng],
      [result.max_lat, result.max_lng],
    ];
  }
  if (result.geometry) {
    const layer = L.geoJSON(result.geometry);
    const b = layer.getBounds();
    if (b.isValid()) {
      return [
        [b.getSouth(), b.getWest()],
        [b.getNorth(), b.getEast()],
      ];
    }
  }
  return null;
}
