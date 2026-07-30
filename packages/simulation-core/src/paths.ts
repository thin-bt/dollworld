/**
 * Repository-relative safe POSIX path checks for config and name-data references.
 * Rejects absolute paths, drive letters, backslashes, `.` / `..`, and empty segments.
 */
export function isSafeRelativePosixPath(path: string): boolean {
  if (path.length === 0) {
    return false;
  }
  if (path.startsWith("/") || path.includes("\\")) {
    return false;
  }
  if (/^[A-Za-z]:/.test(path)) {
    return false;
  }
  if (path.includes("//")) {
    return false;
  }

  const segments = path.split("/");
  for (const segment of segments) {
    if (segment.length === 0 || segment === "." || segment === "..") {
      return false;
    }
  }

  return true;
}
