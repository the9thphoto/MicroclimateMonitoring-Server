import type { ScalarField } from "./field";

interface ContourLine {
  type: "Feature";
  properties: { level: number };
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

export interface IsothermCollection {
  type: "FeatureCollection";
  features: ContourLine[];
}

function levelRange(field: ScalarField): number[] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of field.values) {
    if (Number.isFinite(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return [];
  }
  const start = Math.ceil(min);
  const end = Math.floor(max);
  const levels: number[] = [];
  for (let level = start; level <= end && levels.length < 24; level += 1) {
    levels.push(level);
  }
  return levels;
}

export function buildIsotherms(field: ScalarField): IsothermCollection {
  const features: ContourLine[] = [];
  const levels = levelRange(field);
  if (levels.length === 0) {
    return { type: "FeatureCollection", features };
  }
  const { west, east, south, north } = field.bounds;
  const lonStep = (east - west) / field.width;
  const latStep = (north - south) / field.height;

  for (let y = 0; y < field.height - 1; y += 1) {
    const latTop = north - (y / field.height) * (north - south);
    const latBottom = latTop - latStep;
    for (let x = 0; x < field.width - 1; x += 1) {
      const index = y * field.width + x;
      const v00 = field.values[index];
      const v10 = field.values[index + 1];
      const v11 = field.values[index + field.width + 1];
      const v01 = field.values[index + field.width];
      const a00 = field.alpha[index] ?? 0;
      const a10 = field.alpha[index + 1] ?? 0;
      const a11 = field.alpha[index + field.width + 1] ?? 0;
      const a01 = field.alpha[index + field.width] ?? 0;
      if (
        v00 === undefined ||
        v10 === undefined ||
        v11 === undefined ||
        v01 === undefined ||
        !Number.isFinite(v00) ||
        !Number.isFinite(v10) ||
        !Number.isFinite(v11) ||
        !Number.isFinite(v01) ||
        a00 < 0.05 ||
        a10 < 0.05 ||
        a11 < 0.05 ||
        a01 < 0.05
      ) {
        continue;
      }
      const lonLeft = west + (x / field.width) * (east - west);
      const lonRight = lonLeft + lonStep;
      const top = (level: number): [number, number] => {
        const t = (level - v00) / (v10 - v00);
        return [lonLeft + t * lonStep, latTop];
      };
      const right = (level: number): [number, number] => {
        const t = (level - v10) / (v11 - v10);
        return [lonRight, latTop - t * latStep];
      };
      const bottom = (level: number): [number, number] => {
        const t = (level - v01) / (v11 - v01);
        return [lonLeft + t * lonStep, latBottom];
      };
      const left = (level: number): [number, number] => {
        const t = (level - v00) / (v01 - v00);
        return [lonLeft, latTop - t * latStep];
      };

      for (const level of levels) {
        const corners = [v00, v10, v11, v01];
        let crossings = 0;
        for (const value of corners) {
          if (value > level) {
            crossings += 1;
          }
        }
        if (crossings === 0 || crossings === 4) {
          continue;
        }
        const intersections: [number, number][] = [];
        if (v00 <= level !== v10 <= level) intersections.push(top(level));
        if (v10 <= level !== v11 <= level) intersections.push(right(level));
        if (v11 <= level !== v01 <= level) intersections.push(bottom(level));
        if (v01 <= level !== v00 <= level) intersections.push(left(level));
        if (intersections.length < 2) {
          continue;
        }
        features.push({
          type: "Feature",
          properties: { level },
          geometry: {
            type: "LineString",
            coordinates:
              intersections.length === 2
                ? [intersections[0]!, intersections[1]!]
                : [intersections[0]!, intersections[1]!],
          },
        });
        if (intersections.length === 4) {
          features.push({
            type: "Feature",
            properties: { level },
            geometry: {
              type: "LineString",
              coordinates: [intersections[2]!, intersections[3]!],
            },
          });
        }
      }
    }
  }
  return { type: "FeatureCollection", features };
}
