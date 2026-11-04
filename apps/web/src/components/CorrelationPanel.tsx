import { CorrelationMatrix as CorrelationMatrixView, EmptyState } from "@microclimate/ui";
import { useMemo } from "react";

import { type AnalysisPoint, correlationMatrix } from "../lib/analysis";

interface CorrelationPanelProps {
  points: AnalysisPoint[];
}

export function CorrelationPanel({ points }: CorrelationPanelProps) {
  const correlation = useMemo(() => correlationMatrix(points), [points]);

  return (
    <section className="panel" aria-labelledby="correlation-heading">
      <div className="panel__head">
        <div>
          <h2 id="correlation-heading">要素相关</h2>
          <p className="panel__hint">Pearson 相关系数，仅使用共同有效样本（≥3）。</p>
        </div>
        <span className="panel__tag">{correlation.metrics.length} 个要素</span>
      </div>

      {correlation.metrics.length < 2 ? (
        <EmptyState
          title="样本不足"
          description="至少需要两个字段各有 3 条有效记录才能计算相关性。"
        />
      ) : (
        <>
          <CorrelationMatrixView metrics={correlation.metrics} values={correlation.values} />
          <p className="panel__note">
            相关不等于因果；单站时序相关只反映共同变化，不代表空间代表性。
          </p>
        </>
      )}
    </section>
  );
}
