import { formatNumber } from "@microclimate/ui";
import { useEffect, useRef, useState } from "react";

import { formatCoordinates, type StationLocation } from "../../lib/location";
import type { StationSnapshot } from "../../lib/stationDirectory";
import { CloseIcon, MapPinIcon, SearchIcon } from "../shell/icons";

interface StationPickerProps {
  open: boolean;
  selected: string;
  stations: StationSnapshot[];
  locations: Record<string, StationLocation>;
  onSelect: (stationId: string) => void;
  onClose: () => void;
}

export function StationPicker({
  open,
  selected,
  stations,
  locations,
  onSelect,
  onClose,
}: StationPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const normalized = query.trim().toLowerCase();
  const filtered = stations.filter((station) =>
    station.stationId.toLowerCase().includes(normalized),
  );
  const exact = stations.some((station) => station.stationId === query.trim());
  const showCustom = query.trim().length > 0 && !exact;

  return (
    <div className="picker-backdrop" role="presentation">
      <section className="station-picker" role="dialog" aria-modal="true" aria-label="选择站点">
        <header className="station-picker__head">
          <div>
            <p className="eyebrow">STATIONS</p>
            <h2>选择站点</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭站点选择">
            <CloseIcon size={18} />
          </button>
        </header>

        <label className="station-picker__search">
          <SearchIcon size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入站点 ID 或搜索"
            aria-label="搜索站点"
          />
        </label>

        <ul className="station-picker__list">
          {filtered.map((station) => {
            const location = locations[station.stationId];
            return (
              <li key={station.stationId}>
                <button
                  type="button"
                  className={
                    station.stationId === selected ? "station-option is-active" : "station-option"
                  }
                  onClick={() => onSelect(station.stationId)}
                >
                  <span className="station-option__pin" aria-hidden="true">
                    <MapPinIcon size={16} />
                  </span>
                  <span className="station-option__body">
                    <strong>{station.stationId}</strong>
                    <span>{location ? formatCoordinates(location) : "未配置坐标"}</span>
                  </span>
                  <span className="station-option__value">
                    {formatNumber(station.latest.temperature, 1)} °C
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && !showCustom ? (
            <li className="station-picker__empty">没有匹配的站点。</li>
          ) : null}
        </ul>

        {showCustom ? (
          <button
            type="button"
            className="station-picker__custom"
            onClick={() => onSelect(query.trim())}
          >
            使用站点 <strong>{query.trim()}</strong>
          </button>
        ) : null}
      </section>
    </div>
  );
}
