import { formatNumber } from "@microclimate/ui";
import { useEffect, useRef, useState } from "react";

import { formatCoordinates } from "../../lib/location";
import type { NetworkStation } from "../../lib/network";
import { CloseIcon, MapPinIcon, SearchIcon } from "../shell/icons";

interface StationPickerProps {
  open: boolean;
  selected: string | null;
  stations: NetworkStation[];
  onSelect: (stationId: string | null) => void;
  onClose: () => void;
}

export function StationPicker({ open, selected, stations, onSelect, onClose }: StationPickerProps) {
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
          <li>
            <button
              type="button"
              className={selected === null ? "station-option is-active" : "station-option"}
              onClick={() => onSelect(null)}
            >
              <span className="station-option__pin" aria-hidden="true">
                <MapPinIcon size={16} />
              </span>
              <span className="station-option__body">
                <strong>全部站点</strong>
                <span>{stations.length} 个有坐标的站点</span>
              </span>
            </button>
          </li>
          {filtered.map((station) => (
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
                  <span>{formatCoordinates(station.location)}</span>
                </span>
                <span className="station-option__value">
                  {formatNumber(station.latest.temperature, 1)} °C
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="station-picker__empty">没有匹配的站点。</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
