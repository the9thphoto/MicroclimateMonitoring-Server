import { windBarbSvg } from "../../lib/wind";

const SAMPLES = [
  { label: "静风", mps: 0.5 },
  { label: "5 kt", mps: 2.57 },
  { label: "10 kt", mps: 5.14 },
  { label: "50 kt", mps: 25.72 },
];

export function WindBarbKey() {
  return (
    <div className="wind-barb-key" role="img" aria-label="风羽图例：静风、5 节、10 节、50 节">
      <strong>风羽</strong>
      {SAMPLES.map((sample) => (
        <span key={sample.label}>
          <img
            src={`data:image/svg+xml,${encodeURIComponent(windBarbSvg(0, sample.mps, 24))}`}
            alt=""
            aria-hidden="true"
          />
          {sample.label}
        </span>
      ))}
    </div>
  );
}
