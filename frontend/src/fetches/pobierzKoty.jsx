const API_KEY = import.meta.env.VITE_CAT_API_KEY;

export async function pobierzKoty() {
  const response = await fetch(
    "https://api.thecatapi.com/v1/images/search?limit=6&has_breeds=true",
    {
      headers: {
        "x-api-key": API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Nie udało się pobrać kotów");
  }

  return await response.json();
}