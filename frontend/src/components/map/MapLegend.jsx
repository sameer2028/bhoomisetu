import { Layers, Eye, EyeOff, Route, SquareDashedBottom } from 'lucide-react';
import {
  BASE_LAYERS,
  PARCEL_STATUS_ORDER,
  formatAcres,
  getStatusStyle,
} from './mapConstants';

/**
 * Map legend — Phase 5
 *
 * Doubles as the layer control: each status row is a visibility toggle and
 * carries the live parcel count / acreage for the current filter, so the legend
 * is a data readout rather than decoration.
 */
export default function MapLegend({
  stats,
  activeStatuses,
  onToggleStatus,
  onShowAllStatuses,
  showCorridor,
  onToggleCorridor,
  showCenterline,
  onToggleCenterline,
  showLabels,
  onToggleLabels,
  baseLayerId,
  onChangeBaseLayer,
  hasCorridor,
}) {
  const byStatus = stats?.by_status || [];
  const countFor = (status) => byStatus.find((s) => s.status === status) || { parcel_count: 0, area_acres: 0 };
  const allActive = activeStatuses.length === 0;

  return (
    <div className="absolute bottom-4 right-4 z-[1000] w-64 bg-white/97 backdrop-blur-sm rounded-xl border border-neutral-200 shadow-lg overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-neutral-100 flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-700" /> Legend &amp; Layers
        </h3>
        {!allActive && (
          <button
            onClick={onShowAllStatuses}
            className="text-[10px] font-semibold text-blue-700 hover:underline"
          >
            Show all
          </button>
        )}
      </div>

      {/* Acquisition status layers */}
      <div className="px-2 py-2">
        <p className="px-1.5 pb-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
          Acquisition Status
        </p>
        <ul className="space-y-0.5">
          {PARCEL_STATUS_ORDER.map((status) => {
            const style = getStatusStyle(status);
            const row = countFor(status);
            const isActive = allActive || activeStatuses.includes(status);

            return (
              <li key={status}>
                <button
                  onClick={() => onToggleStatus(status)}
                  title={style.description}
                  className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-left transition-colors ${
                    isActive ? 'hover:bg-neutral-50' : 'opacity-45 hover:bg-neutral-50'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-sm border flex-shrink-0 ${style.swatchClass}`}
                    style={{ backgroundColor: style.fill, borderColor: style.stroke }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] font-semibold text-neutral-800 truncate leading-tight">
                      {style.label}
                    </span>
                    <span className="block text-[9.5px] text-neutral-400 leading-tight">
                      {formatAcres(row.area_acres)}
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-neutral-700 tabular-nums flex-shrink-0">
                    {row.parcel_count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Reference layers */}
      <div className="px-2 py-2 border-t border-neutral-100">
        <p className="px-1.5 pb-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
          Reference Layers
        </p>

        <button
          onClick={onToggleCorridor}
          disabled={!hasCorridor}
          className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SquareDashedBottom className="w-3.5 h-3.5 text-blue-800 flex-shrink-0" />
          <span className="flex-1 text-[11px] font-medium text-neutral-700 text-left truncate">
            Acquisition Corridor
          </span>
          {showCorridor ? (
            <Eye className="w-3.5 h-3.5 text-blue-700" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-neutral-300" />
          )}
        </button>

        <button
          onClick={onToggleCenterline}
          disabled={!hasCorridor}
          className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Route className="w-3.5 h-3.5 text-blue-800 flex-shrink-0" />
          <span className="flex-1 text-[11px] font-medium text-neutral-700 text-left truncate">
            Alignment Centreline
          </span>
          {showCenterline ? (
            <Eye className="w-3.5 h-3.5 text-blue-700" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-neutral-300" />
          )}
        </button>

        <button
          onClick={onToggleLabels}
          className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-neutral-50 transition-colors"
        >
          <span className="w-3.5 flex-shrink-0 text-center text-[10px] font-mono font-bold text-blue-800">
            ID
          </span>
          <span className="flex-1 text-[11px] font-medium text-neutral-700 text-left truncate">
            Parcel Labels
          </span>
          {showLabels ? (
            <Eye className="w-3.5 h-3.5 text-blue-700" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-neutral-300" />
          )}
        </button>
      </div>

      {/* Base map */}
      <div className="px-3 py-2.5 border-t border-neutral-100 bg-neutral-50/60">
        <p className="pb-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
          Base Map
        </p>
        <div className="flex gap-1">
          {BASE_LAYERS.map((layer) => (
            <button
              key={layer.id}
              onClick={() => onChangeBaseLayer(layer.id)}
              className={`flex-1 px-1.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                baseLayerId === layer.id
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
