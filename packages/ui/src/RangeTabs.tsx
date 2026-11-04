export interface RangeOption {
  key: string;
  label: string;
}

interface RangeTabsProps {
  options: RangeOption[];
  value: string;
  onChange: (key: string) => void;
}

export function RangeTabs({ options, value, onChange }: RangeTabsProps) {
  return (
    <div className="range-tabs" role="tablist" aria-label="时间范围">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={option.key === value}
          className={option.key === value ? "range-tabs__tab is-active" : "range-tabs__tab"}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
