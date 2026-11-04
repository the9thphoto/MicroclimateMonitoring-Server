import type { DataQuality } from "../lib/analysis";

interface DataQualityPanelProps {
  quality: DataQuality;
  rangeLabel: string;
}

export function DataQualityPanel({ quality, rangeLabel }: DataQualityPanelProps) {
  const percent = Math.round(quality.coverage * 100);
  const level = percent >= 80 ? "good" : percent >= 40 ? "fair" : "low";

  return (
    <section className="panel" aria-labelledby="quality-heading">
      <div className="panel__head">
        <div>
          <h2 id="quality-heading">数据质量</h2>
          <p className="panel__hint">按 60 秒上报间隔估算 {rangeLabel} 区间的采样覆盖。</p>
        </div>
        <span className={`quality-badge quality-badge--${level}`}>{percent}% 覆盖</span>
      </div>

      <div className="quality-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, percent)}%` }} />
      </div>

      <dl className="quality-grid">
        <div>
          <dt>有效采样</dt>
          <dd>{quality.count} 条</dd>
        </div>
        <div>
          <dt>理论采样</dt>
          <dd>{quality.expected} 条</dd>
        </div>
        <div>
          <dt>最大间隔</dt>
          <dd>{quality.maxGapMinutes} 分钟</dd>
        </div>
        <div>
          <dt>断档次数</dt>
          <dd>{quality.gaps} 次</dd>
        </div>
      </dl>

      <p className="panel__note">
        {percent >= 80
          ? "采样密度充足，区间统计具有代表性。"
          : "覆盖率偏低，趋势与统计仅反映已有采样，不代表完整时间段。"}
      </p>
    </section>
  );
}
