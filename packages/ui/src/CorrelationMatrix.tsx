export interface CorrelationMetric {
  key: string;
  label: string;
}

interface CorrelationMatrixProps {
  metrics: CorrelationMetric[];
  values: (number | null)[][];
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function mix(from: string, to: string, ratio: number): string {
  const [fromR, fromG, fromB] = hexToRgb(from);
  const [toR, toG, toB] = hexToRgb(to);
  const channel = (left: number, right: number) =>
    Math.round(left + (right - left) * ratio)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(fromR, toR)}${channel(fromG, toG)}${channel(fromB, toB)}`;
}

function cellStyle(value: number | null): { background: string; color: string } {
  if (value === null) {
    return { background: "var(--chart-cell-empty, #0f172a)", color: "var(--chart-axis)" };
  }
  const strength = Math.min(1, Math.abs(value));
  const background =
    value >= 0 ? mix("#0f172a", "#ef4444", strength) : mix("#0f172a", "#3b82f6", strength);
  return { background, color: strength > 0.2 ? "#ffffff" : "var(--chart-axis)" };
}

export function CorrelationMatrix({ metrics, values }: CorrelationMatrixProps) {
  return (
    <div className="correlation">
      <div className="correlation__scroll">
        <table className="correlation__table">
          <caption>要素间 Pearson 相关系数矩阵</caption>
          <thead>
            <tr>
              <th scope="col">要素</th>
              {metrics.map((metric) => (
                <th scope="col" key={metric.key}>
                  {metric.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((rowMetric, rowIndex) => (
              <tr key={rowMetric.key}>
                <th scope="row">{rowMetric.label}</th>
                {metrics.map((columnMetric, columnIndex) => {
                  const value = values[rowIndex]?.[columnIndex] ?? null;
                  const style = cellStyle(value);
                  return (
                    <td
                      key={columnMetric.key}
                      style={style}
                      title={`${rowMetric.label} × ${columnMetric.label}：${
                        value === null ? "样本不足" : value.toFixed(2)
                      }`}
                    >
                      {value === null ? "—" : value.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="correlation__legend" aria-hidden="true">
        <span>-1</span>
        <i style={{ background: "linear-gradient(90deg, #3b82f6, #0f172a, #ef4444)" }} />
        <span>+1</span>
        <span className="correlation__legend-note">蓝负红正</span>
      </div>
    </div>
  );
}
