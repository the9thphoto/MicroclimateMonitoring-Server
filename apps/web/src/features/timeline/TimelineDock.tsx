import { TimelineChart } from "@microclimate/ui";

import type { AnalysisPoint } from "../../lib/analysis";
import type { LayerDefinition } from "../../lib/layers";
import { formatLayerValue, layerColor } from "../../lib/layers";
import { RANGE_OPTIONS, type RangeKey } from "../../lib/ranges";
import { MapLegend } from "../layers/MapLegend";
import { PauseIcon, PlayIcon } from "../shell/icons";

interface TimelineDockProps {
  points: AnalysisPoint[];
  selectedIndex: number;
  selected: AnalysisPoint | null;
  layer: LayerDefinition;
  range: RangeKey;
  playing: boolean;
  speed: 1 | 2;
  canPlay: boolean;
  onRangeChange: (range: RangeKey) => void;
  onSelectIndex: (index: number) => void;
  onToggle: () => void;
  onSpeedChange: (speed: 1 | 2) => void;
  onToLatest: () => void;
  domain?: [number, number];
  source?: string;
  compact?: boolean;
}

export function TimelineDock({
  points,
  selectedIndex,
  selected,
  layer,
  range,
  playing,
  speed,
  canPlay,
  onRangeChange,
  onSelectIndex,
  onToggle,
  onSpeedChange,
  onToLatest,
  domain,
  source,
  compact = false,
}: TimelineDockProps) {
  const selectedValue = selected ? layer.valueOf(selected) : null;
  const color = layerColor(layer, selectedValue, domain);
  const chartPoints = points.map((point) => ({
    time: point.time,
    label: point.fullLabel,
    value: layer.valueOf(point),
  }));
  const sliderMax = Math.max(0, points.length - 1);
  const sliderValue = Math.max(0, selectedIndex);

  return (
    <section className="timeline-dock" aria-label="时间轴与回放">
      <div className="timeline-dock__head">
        <div className="timeline-dock__range" role="toolbar" aria-label="时间范围">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={option.key === range ? "range-chip is-active" : "range-chip"}
              aria-pressed={option.key === range}
              onClick={() => onRangeChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="timeline-dock__meta">
          <span className="source-badge">观测</span>
          <span>{points.length} 帧</span>
          <span className="timeline-dock__time" aria-live="polite">
            {selected?.fullLabel ?? "暂无观测"}
          </span>
          <strong style={{ color }}>{formatLayerValue(layer, selectedValue)}</strong>
        </div>

        <div className="timeline-dock__controls">
          <button
            type="button"
            className="play-button"
            onClick={onToggle}
            disabled={!canPlay}
            aria-label={playing ? "暂停回放" : "播放回放"}
            title={playing ? "暂停回放" : "播放回放"}
          >
            {playing ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
          </button>
          <button
            type="button"
            className="speed-button"
            onClick={() => onSpeedChange(speed === 1 ? 2 : 1)}
            aria-label={`切换播放速度，当前 ${speed} 倍`}
            title={`播放速度 ${speed}×`}
          >
            {speed}×
          </button>
          <button type="button" className="now-button" onClick={onToLatest}>
            现在
          </button>
        </div>
      </div>

      <div className="timeline-dock__body">
        <MapLegend layer={layer} domain={domain} source={source} />
        <div className="timeline-dock__chart">
          <TimelineChart
            points={chartPoints}
            color={color}
            unit={layer.unit}
            selectedTime={selected?.time ?? null}
            selectedValue={selectedValue}
            height={compact ? 56 : 76}
            ariaLabel={`${layer.label}时间曲线`}
          />
        </div>
      </div>

      <div className="timeline-dock__scrub">
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={1}
          value={sliderValue}
          disabled={!canPlay}
          aria-label="回放时间"
          aria-valuetext={
            selected
              ? `${selected.fullLabel}，${layer.label} ${formatLayerValue(layer, selectedValue)}`
              : "暂无观测"
          }
          onChange={(event) => onSelectIndex(Number(event.target.value))}
        />
        <span>{points.length > 0 ? `${sliderValue + 1} / ${points.length}` : "0 / 0"}</span>
      </div>
    </section>
  );
}
