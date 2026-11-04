import { ComfortScatter, type ComfortScatterPoint } from "@microclimate/ui";
import { useMemo } from "react";

import {
  type AnalysisPoint,
  COMFORT_COLORS,
  COMFORT_LEGEND,
  comfortFromThi,
  comfortZoneShare,
} from "../lib/analysis";

interface ComfortPanelProps {
  points: AnalysisPoint[];
}

export function ComfortPanel({ points }: ComfortPanelProps) {
  const { scatter, share } = useMemo(() => {
    const usable = points.filter((point) => point.temperature !== null && point.humidity !== null);
    const items: ComfortScatterPoint[] = usable.map((point) => {
      const comfort = comfortFromThi(point.thi);
      return {
        label: point.fullLabel,
        temperature: point.temperature ?? 0,
        humidity: point.humidity ?? 0,
        comfort: comfort.label,
        color: COMFORT_COLORS[comfort.key],
      };
    });
    return { scatter: items, share: comfortZoneShare(points) };
  }, [points]);

  return (
    <section className="panel" aria-labelledby="comfort-heading">
      <div className="panel__head">
        <div>
          <h2 id="comfort-heading">温湿分布</h2>
          <p className="panel__hint">每个点代表一条观测，颜色表示体感等级。</p>
        </div>
      </div>

      <div className="comfort-chart">
        <ComfortScatter points={scatter} />
      </div>

      <div className="comfort-foot">
        <p className="comfort-share">
          舒适区间占比
          <strong>{share === null ? "—" : `${Math.round(share * 100)}%`}</strong>
        </p>
        <ul className="comfort-legend" aria-label="体感等级图例">
          {COMFORT_LEGEND.map((item) => (
            <li key={item.key}>
              <i style={{ background: item.color }} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <p className="panel__note">绿色虚线区域为 18–26 °C、40–65 % 的常见舒适区间。</p>
    </section>
  );
}
