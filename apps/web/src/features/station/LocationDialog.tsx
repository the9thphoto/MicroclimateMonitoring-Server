import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  CAMPUS_LABEL,
  formatCoordinates,
  isCampusLocation,
  parseLatitude,
  parseLongitude,
  type StationLocation,
} from "../../lib/location";
import { CloseIcon } from "../shell/icons";

interface LocationDialogProps {
  station: string;
  initial: StationLocation | null;
  onSave: (location: StationLocation) => void;
  onClear: () => void;
  onPickOnMap: () => void;
  onClose: () => void;
}

export function LocationDialog({
  station,
  initial,
  onSave,
  onClear,
  onPickOnMap,
  onClose,
}: LocationDialogProps) {
  const [latitude, setLatitude] = useState(initial?.latitude.toString() ?? "");
  const [longitude, setLongitude] = useState(initial?.longitude.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLatitude(initial?.latitude.toString() ?? "");
    setLongitude(initial?.longitude.toString() ?? "");
    setError(null);
    const timer = window.setTimeout(() => firstField.current?.focus(), 20);
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
  }, [initial, onClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedLatitude = parseLatitude(latitude);
    const parsedLongitude = parseLongitude(longitude);
    if (parsedLatitude === null || parsedLongitude === null) {
      setError("经纬度无效：纬度范围 -90–90，经度范围 -180–180。");
      return;
    }
    onSave({ latitude: parsedLatitude, longitude: parsedLongitude });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="location-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-title"
      >
        <header className="location-dialog__head">
          <div>
            <p className="eyebrow">STATION LOCATION</p>
            <h2 id="location-title">设置站点位置</h2>
            <p>
              {station} · {formatCoordinates(initial)}
              {isCampusLocation(initial) ? ` · ${CAMPUS_LABEL}` : ""}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭位置设置">
            <CloseIcon size={18} />
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="location-dialog__fields">
            <label>
              纬度
              <input
                ref={firstField}
                inputMode="decimal"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                placeholder="例如 31.2304"
              />
            </label>
            <label>
              经度
              <input
                inputMode="decimal"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                placeholder="例如 121.4737"
              />
            </label>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <p className="form-hint">
            API 不保存坐标；位置仅保存在本浏览器。也可以在地图上直接点选。
          </p>
          <div className="location-dialog__actions">
            <button type="button" className="button button--ghost" onClick={onPickOnMap}>
              在地图上选点
            </button>
            {initial ? (
              <button type="button" className="button button--danger" onClick={onClear}>
                清除位置
              </button>
            ) : null}
            <span className="location-dialog__spacer" />
            <button type="button" className="button button--ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="button button--primary">
              保存
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
