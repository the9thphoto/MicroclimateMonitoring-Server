import { useCallback, useEffect, useRef, useState } from "react";

import type { AnalysisPoint } from "../lib/analysis";
import { canPlay, clampIndex, followLatest, isAtEnd, nextIndex } from "../lib/timeline";

export type PlaybackSpeed = 1 | 2;

export function useTimeline(points: AnalysisPoint[], station: string, range: string) {
  const [index, setIndexState] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const lengthRef = useRef(points.length);

  const setIndex = useCallback(
    (next: number) => {
      setIndexState(clampIndex(next, points.length));
    },
    [points.length],
  );

  useEffect(() => {
    const resetKey = `${station}:${range}`;
    void resetKey;
    setIndexState(-1);
    setPlaying(false);
    lengthRef.current = 0;
  }, [station, range]);

  useEffect(() => {
    const previousLength = lengthRef.current;
    lengthRef.current = points.length;
    setIndexState((current) => followLatest(current, previousLength, points.length));
  }, [points.length]);

  useEffect(() => {
    if (!playing) {
      return;
    }
    if (!canPlay(points.length)) {
      setPlaying(false);
      return;
    }
    if (isAtEnd(index, points.length)) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setIndexState(nextIndex(index, points.length)),
      speed === 2 ? 300 : 600,
    );
    return () => window.clearTimeout(timer);
  }, [playing, index, points.length, speed]);

  const toggle = useCallback(() => {
    if (!canPlay(points.length)) {
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    if (isAtEnd(index, points.length)) {
      setIndexState(0);
    }
    setPlaying(true);
  }, [index, playing, points.length]);

  const stop = useCallback(() => setPlaying(false), []);

  const toLatest = useCallback(() => {
    setPlaying(false);
    setIndexState(points.length > 0 ? points.length - 1 : -1);
  }, [points.length]);

  const selected = index >= 0 ? (points[index] ?? null) : null;

  return {
    index,
    selected,
    playing,
    speed,
    canPlay: canPlay(points.length),
    setIndex,
    setSpeed,
    toggle,
    stop,
    toLatest,
  };
}
