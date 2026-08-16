/**
 * Parse semver-like strings (1.2, 1.2.0, 1.10.1) into numeric segments.
 */
export function parseVersionSegments(version: string): number[] {
  const trimmed = version.trim();
  if (!trimmed) {
    return [0];
  }
  return trimmed.split('.').map((part) => {
    const match = part.match(/^(\d+)/);
    const num = match ? parseInt(match[1], 10) : 0;
    return Number.isFinite(num) ? num : 0;
  });
}

/**
 * Compare two version strings numerically per segment.
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareVersions(a: string, b: string): number {
  const segmentsA = parseVersionSegments(a);
  const segmentsB = parseVersionSegments(b);
  const length = Math.max(segmentsA.length, segmentsB.length);

  for (let i = 0; i < length; i += 1) {
    const partA = segmentsA[i] ?? 0;
    const partB = segmentsB[i] ?? 0;
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  return 0;
}

/** True when latest is strictly newer than current. */
export function isUpdateAvailable(currentVersion: string, latestVersion: string): boolean {
  return compareVersions(currentVersion, latestVersion) < 0;
}
