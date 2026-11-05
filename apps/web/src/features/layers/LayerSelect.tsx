import type { LayerDefinition, LayerId } from "../../lib/layers";

interface LayerSelectProps {
  layers: LayerDefinition[];
  value: LayerId;
  onChange: (id: LayerId) => void;
  label?: string;
}

export function LayerSelect({ layers, value, onChange, label = "主指标" }: LayerSelectProps) {
  return (
    <label className="layer-select">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as LayerId)}
      >
        {layers.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.label}
          </option>
        ))}
      </select>
    </label>
  );
}
