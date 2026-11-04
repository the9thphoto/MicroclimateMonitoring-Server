export interface MetricTabOption {
  key: string;
  label: string;
  disabled?: boolean;
}

interface MetricTabsProps {
  options: MetricTabOption[];
  value: string;
  onChange: (key: string) => void;
  label?: string;
}

export function MetricTabs({ options, value, onChange, label = "趋势指标" }: MetricTabsProps) {
  return (
    <div className="metric-tabs" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={option.key === value && !option.disabled}
          disabled={option.disabled}
          title={option.disabled ? "该区间没有对应传感器数据" : undefined}
          className={
            option.key === value && !option.disabled
              ? "metric-tabs__tab is-active"
              : "metric-tabs__tab"
          }
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
