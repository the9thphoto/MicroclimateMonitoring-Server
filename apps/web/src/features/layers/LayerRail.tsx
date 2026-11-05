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
  enabled: LayerId[];
  primary: LayerId;
  availability: Record<LayerId, boolean>;
  onToggle: (id: LayerId) => void;
  onForecast: (id: string) => void;
  variant?: "vertical" | "horizontal";
  showForecast?: boolean;
}

export function LayerRail({
  enabled,
  primary,
  availability,
  onToggle,
  onForecast,
  variant = "vertical",
  showForecast = true,
}: LayerRailProps) {
  return (
    <aside className={`layer-rail layer-rail--${variant}`} aria-label="图层叠加开关">
      <div className="layer-rail__group">
        {LAYERS.map((layer) => {
          const Icon = ICONS[layer.id];
          const available = availability[layer.id];
          const active = enabled.includes(layer.id);
          return (
            <button
              key={layer.id}
              type="button"
              className={[
                "layer-button",
                active ? "is-active" : "",
                layer.id === primary ? "is-primary" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
              aria-label={layer.label}
              disabled={!available}
              title={
                available
                  ? `${active ? "关闭" : "开启"}${layer.label}叠加`
                  : `${layer.label}：全网暂无数据`
              }
              onClick={() => onToggle(layer.id)}
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
              {layer.id === primary && active ? (
                <span className="layer-button__primary-badge" aria-hidden="true">
                  主
                </span>
              ) : null}
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
