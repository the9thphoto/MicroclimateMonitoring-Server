import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AqiScale } from "../src/AqiScale";
import { BoxPlot } from "../src/BoxPlot";
import { ComfortGauge } from "../src/ComfortGauge";
import { CorrelationMatrix } from "../src/CorrelationMatrix";
import { HeatmapGrid } from "../src/HeatmapGrid";
import { Sparkline } from "../src/Sparkline";
import { WindRose } from "../src/WindRose";

describe("visual primitives", () => {
  it("renders sparkline paths and an empty placeholder", () => {
    const { container } = render(<Sparkline values={[20, 21, 19, 22]} color="#e4572e" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("polyline")).not.toBeNull();

    const { container: empty } = render(<Sparkline values={[null]} color="#e4572e" />);
    expect(empty.querySelector(".sparkline--empty")).not.toBeNull();
  });

  it("renders the comfort gauge with a value", () => {
    render(
      <ComfortGauge
        value={21.5}
        segments={[
          { from: 0, to: 17, color: "#22d3ee", label: "偏凉" },
          { from: 17, to: 24, color: "#10b981", label: "舒适" },
          { from: 24, to: 40, color: "#f97316", label: "偏暖" },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: /温湿指数 21.5/ })).toBeInTheDocument();
    expect(screen.getByText("21.5")).toBeInTheDocument();
  });

  it("renders a heatmap cell with an accessible title", () => {
    const cells = Array.from({ length: 24 }, (_, hour) => ({
      date: "2026-11-04",
      hour,
      value: hour === 10 ? 21 : null,
      count: hour === 10 ? 3 : 0,
    }));
    render(
      <HeatmapGrid
        days={[{ date: "2026-11-04", label: "11/04" }]}
        cells={cells}
        min={21}
        max={21}
        colors={["#dbeafe", "#dc2626"]}
        unit="°C"
        ariaLabel="温度日历热力图"
      />,
    );
    expect(screen.getByRole("img", { name: "温度日历热力图" })).toBeInTheDocument();
    expect(screen.getByTitle("11/04 10:00 21.0 °C（3 个采样）")).toBeInTheDocument();
  });

  it("renders eight wind rose sectors and the calm centre", () => {
    const bins = [
      { direction: 0, label: "北", count: 3, averageSpeed: 2.5, maxSpeed: 4 },
      { direction: 45, label: "东北", count: 0, averageSpeed: 0, maxSpeed: 0 },
      { direction: 90, label: "东", count: 1, averageSpeed: 3, maxSpeed: 3 },
      { direction: 135, label: "东南", count: 0, averageSpeed: 0, maxSpeed: 0 },
      { direction: 180, label: "南", count: 0, averageSpeed: 0, maxSpeed: 0 },
      { direction: 225, label: "西南", count: 0, averageSpeed: 0, maxSpeed: 0 },
      { direction: 270, label: "西", count: 0, averageSpeed: 0, maxSpeed: 0 },
      { direction: 315, label: "西北", count: 0, averageSpeed: 0, maxSpeed: 0 },
    ];
    render(<WindRose bins={bins} />);
    expect(screen.getByRole("img", { name: /主导风向 北/ })).toBeInTheDocument();
    expect(screen.getByText("北")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders a box plot and a correlation matrix", () => {
    render(
      <BoxPlot
        hours={[
          { hour: 10, label: "10:00", min: 18, q1: 19, median: 20, q3: 22, max: 23, count: 5 },
        ]}
        unit="°C"
        label="温度"
        color="#e4572e"
      />,
    );
    expect(screen.getByRole("img", { name: "温度按小时分布箱线图" })).toBeInTheDocument();

    render(
      <CorrelationMatrix
        metrics={[
          { key: "temperature", label: "温度" },
          { key: "humidity", label: "湿度" },
        ]}
        values={[
          [1, -0.8],
          [-0.8, 1],
        ]}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByText("1.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-0.80").length).toBeGreaterThan(0);
  });

  it("renders the AQI scale", () => {
    render(<AqiScale value={75} label="良" tone="moderate" />);
    expect(screen.getByRole("img", { name: /空气质量指数 75，良/ })).toBeInTheDocument();
  });
});
