export function expandLink(path) {
  const base = import.meta.env.VITE_API_BASE ?? "";
  return `${base}${path}`;
}