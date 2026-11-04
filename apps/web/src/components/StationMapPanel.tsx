import { type FormEvent, useState } from "react";

import {
  defaultLocation,
  locationFromSearch,
  locationSearch,
  parseLatitude,
  parseLongitude,
  type StationLocation,
  saveStoredLocation,
  storedLocation,
} from "../lib/location";

interface StationMapPanelProps {
  station: string;
}

function initialLocation(station: string): StationLocation | null {
  return locationFromSearch(window.location.search) ?? storedLocation(station) ?? defaultLocation();
}

function mapSource(location: StationLocation): string {
  const delta = 0.004;
  const left = location.longitude - delta;
  const right = location.longitude + delta;
  const top = location.latitude + delta / 2;
  const bottom = location.latitude - delta / 2;
  const bbox = [left, bottom, right, top].map((value) => value.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.latitude},${location.longitude}`;
}

function osmLink(location: StationLocation): string {
  return `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`;
}

export function StationMapPanel({ station }: StationMapPanelProps) {
  const [location, setLocation] = useState<StationLocation | null>(() => initialLocation(station));
  const [latitudeDraft, setLatitudeDraft] = useState(() => location?.latitude.toString() ?? "");
  const [longitudeDraft, setLongitudeDraft] = useState(() => location?.longitude.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const latitude = parseLatitude(latitudeDraft);
    const longitude = parseLongitude(longitudeDraft);
    if (latitude === null || longitude === null) {
      setError("请输入有效坐标：纬度 -90–90，经度 -180–180。");
      return;
    }
    const next = { latitude, longitude };
    setLocation(next);
    setError(null);
    saveStoredLocation(station, next);
    const search = locationSearch(window.location.search, next);
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  };

  const clear = () => {
    setLocation(null);
    setLatitudeDraft("");
    setLongitudeDraft("");
    setError(null);
    saveStoredLocation(station, null);
    const search = locationSearch(window.location.search, null);
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  };

  return (
    <section className="panel" aria-labelledby="map-heading">
      <div className="panel__head">
        <div>
          <h2 id="map-heading">站点地图</h2>
          <p className="panel__hint">当前 API 不含经纬度；位置仅保存在本浏览器。</p>
        </div>
        {location ? (
          <span className="panel__tag">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </span>
        ) : null}
      </div>

      {location ? (
        <div className="station-map">
          <iframe
            key={`${location.latitude}-${location.longitude}`}
            className="station-map__frame"
            title={`站点 ${station} 位置地图`}
            src={mapSource(location)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="station-map__meta">
            <span>地图底图来自 OpenStreetMap，需要联网加载。</span>
            <a href={osmLink(location)} target="_blank" rel="noreferrer">
              在 OpenStreetMap 中打开
            </a>
          </div>
        </div>
      ) : (
        <div className="station-map__empty">
          <span className="station-map__pin" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              role="presentation"
            >
              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <strong>尚未配置站点坐标</strong>
          <p>输入经纬度后显示位置。坐标不进入后端，也不会影响测量接口。</p>
        </div>
      )}

      <form className="location-form" onSubmit={apply}>
        <label>
          纬度
          <input
            name="latitude"
            inputMode="decimal"
            value={latitudeDraft}
            onChange={(event) => setLatitudeDraft(event.target.value)}
            placeholder="例如 31.2304"
          />
        </label>
        <label>
          经度
          <input
            name="longitude"
            inputMode="decimal"
            value={longitudeDraft}
            onChange={(event) => setLongitudeDraft(event.target.value)}
            placeholder="例如 121.4737"
          />
        </label>
        <button type="submit">应用位置</button>
        {location ? (
          <button type="button" className="location-form__clear" onClick={clear}>
            清除
          </button>
        ) : null}
      </form>
      {error ? (
        <p className="location-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
