export function buildImageUrl(imagePath) {
  if (!imagePath) return "";

  // jeśli backend zwróci pełny URL
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://")
  ) {
    return imagePath;
  }

  const API_BASE =
    import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

  if (imagePath.startsWith("/")) {
    return `${API_BASE}${imagePath}`;
  }

  return `${API_BASE}/${imagePath}`;
}