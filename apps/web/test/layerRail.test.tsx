import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LayerRail } from "../src/features/layers/LayerRail";

describe("LayerRail", () => {
  it("marks the active layer and disables unavailable or forecast layers", () => {
    const onSelect = vi.fn();
    const onForecast = vi.fn();
    render(
      <LayerRail
        active="temperature"
        availability={{
          temperature: true,
          humidity: true,
          thi: true,
          windSpeed: false,
          aqi: true,
        }}
        onSelect={onSelect}
        onForecast={onForecast}
      />,
    );

    const temperature = screen.getByRole("button", { name: "温度" });
    expect(temperature).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "风" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "降水" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "湿度" }));
    expect(onSelect).toHaveBeenCalledWith("humidity");
  });
});
