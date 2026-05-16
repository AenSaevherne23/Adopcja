import { expandLink } from "./expandLink";

export async function pobierzKoty() {
  const response = await fetch(expandLink("/api/cats/images"));

  if (!response.ok) {
    throw new Error("Nie udało się pobrać kotów");
  }

  return await response.json();
}