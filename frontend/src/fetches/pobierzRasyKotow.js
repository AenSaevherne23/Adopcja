const API_KEY = import.meta.env.VITE_CAT_API_KEY;

export async function pobierzRasyKotow() {
  const odpowiedz = await fetch("https://api.thecatapi.com/v1/breeds", {
    headers: {
      "x-api-key": API_KEY,
    },
  });

  if (!odpowiedz.ok) {
    throw new Error("Nie udało się pobrać ras kotów.");
  }

  const dane = await odpowiedz.json();

  return Array.isArray(dane) ? dane : [];
}