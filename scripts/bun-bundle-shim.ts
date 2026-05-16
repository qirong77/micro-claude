// Shim for bun:bundle — used during esbuild bundling for Node.js.
// All features are disabled since this runs outside of Bun.
export function feature(name: string): boolean {
  return false;
}
