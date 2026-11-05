import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LayerRail } from "../src/features/layers/LayerRail";

describe("LayerRail", () => {
  it("marks enabled overlays, primary metric and unavailable layers", () => {
    const onToggle = vi.fn();
    const onForecast = vi.fn();
    render(
      <LayerRail
        enabled={["temperature", "humidity"]}
        primary="temperature"
        availability={{
          temperature: true,
          humidity: true,
          thi: true,
          windSpeed: false,
          aqi: true,
        }}
        onToggle={onToggle}
        onForecast={onForecast}
      />,
    );

    const temperature = screen.getByRole("button", { name: "温度" });
    expect(temperature).toHaveAttribute("aria-pressed", "true");
    expect(temperature).toHaveClass("is-primary");
    expect(screen.getByRole("button", { name: "相对湿度" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "风速" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "降水" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "相对湿度" }));
    expect(onToggle).toHaveBeenCalledWith("humidity");
  });
});
