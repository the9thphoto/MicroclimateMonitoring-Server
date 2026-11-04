import type { ComponentType } from "react";

import type { LayerId } from "../../lib/layers";
import { FORECAST_LAYERS, LAYERS } from "../../lib/layers";
import {
  AirIcon,
  ComfortIcon,
  ForecastIcon,
  HumidityIcon,
  TemperatureIcon,
  WindIcon,
} from "../shell/icons";

const ICONS: Record<LayerId, ComponentType<{ size?: number }>> = {
  temperature: TemperatureIcon,
  humidity: HumidityIcon,
  thi: ComfortIcon,
  windSpeed: WindIcon,
  aqi: AirIcon,
};

interface LayerRailProps {
  active: LayerId;
  availability: Record<LayerId, boolean>;
  onSelect: (id: LayerId) => void;
  onForecast: (id: string) => void;
  variant?: "vertical" | "horizontal";
  showForecast?: boolean;
}

export function LayerRail({
  active,
  availability,
  onSelect,
  onForecast,
  variant = "vertical",
  showForecast = true,
}: LayerRailProps) {
  return (
    <aside className={`layer-rail layer-rail--${variant}`} aria-label="地图图层">
      <div className="layer-rail__group">
        {LAYERS.map((layer) => {
          const Icon = ICONS[layer.id];
          const enabled = availability[layer.id];
          return (
            <button
              key={layer.id}
              type="button"
              className={layer.id === active ? "layer-button is-active" : "layer-button"}
              aria-pressed={layer.id === active}
              disabled={!enabled}
              title={enabled ? layer.label : `${layer.label}：该站点未接入`}
              onClick={() => onSelect(layer.id)}
            >
              <span
                className="layer-button__swatch"
                style={{ background: `linear-gradient(90deg, ${layer.stops.join(", ")})` }}
                aria-hidden="true"
              />
              <span className="layer-button__icon">
                <Icon size={18} />
              </span>
              <span className="layer-button__label">{layer.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {showForecast ? (
        <div className="layer-rail__group layer-rail__group--forecast">
          <span className="layer-rail__caption">预报</span>
          {FORECAST_LAYERS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className="layer-button"
              disabled
              title={`${layer.label}：预报服务未接入`}
              onClick={() => onForecast(layer.id)}
            >
              <span className="layer-button__icon">
                <ForecastIcon size={18} />
              </span>
              <span className="layer-button__label">{layer.shortLabel}</span>
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
