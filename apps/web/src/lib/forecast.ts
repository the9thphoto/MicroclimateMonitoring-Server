export interface ForecastCapabilities {
  provider: string;
  model: string;
  generatedAt: string;
  horizonHours: number;
  stepMinutes: number;
  bbox: [number, number, number, number];
  parameters: string[];
}

export interface ForecastFrame {
  parameter: string;
  validAt: string;
  bbox: [number, number, number, number];
  width: number;
  height: number;
  values: number[];
  noData: number;
}

export interface ForecastProvider {
  capabilities(signal?: AbortSignal): Promise<ForecastCapabilities | null>;
  frame(parameter: string, validAt: string, signal?: AbortSignal): Promise<ForecastFrame | null>;
}

/**
 * Forecast integration is intentionally disabled until a model service exists.
 * The UI reads capabilities through this seam and keeps forecast layers marked
 * as unavailable instead of fabricating a field.
 */
export const forecastProvider: ForecastProvider | null = null;

export function hasUsableCapabilities(
  capabilities: ForecastCapabilities | null,
): capabilities is ForecastCapabilities {
  return (
    capabilities !== null &&
    Array.isArray(capabilities.parameters) &&
    capabilities.parameters.length > 0 &&
    capabilities.horizonHours > 0
  );
}
