export function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return -1;
  }
  return Math.min(length - 1, Math.max(0, index));
}

export function nextIndex(index: number, length: number): number {
  if (length <= 0) {
    return -1;
  }
  return Math.min(length - 1, Math.max(0, index) + 1);
}

export function isAtEnd(index: number, length: number): boolean {
  return length > 0 && index >= length - 1;
}

export function canPlay(length: number): boolean {
  return length > 1;
}

export function followLatest(
  previousIndex: number,
  previousLength: number,
  nextLength: number,
): number {
  if (nextLength <= 0) {
    return -1;
  }
  if (previousIndex < 0 || previousIndex >= previousLength - 1) {
    return nextLength - 1;
  }
  return Math.min(previousIndex, nextLength - 1);
}
