import { expandLink } from "./expandLink";

export async function pobierzRasyKotow() {
  const response = await fetch(expandLink("/api/cats/breeds"));

  if (!response.ok) {
    throw new Error("Nie udało się pobrać ras kotów");
  }

  return await response.json();
}