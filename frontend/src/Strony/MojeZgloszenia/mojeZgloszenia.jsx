import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Komponenty/Navbar/navbar";
import { expandLink } from "../../fetches/expandLink";
import { buildImageUrl } from "../../fetches/buildImageUrl";
import "./mojeZgloszenia.css";

export default function MojeZgloszenia() {
  const navigate = useNavigate();

  const [zwierzeta, ustawZwierzeta] = useState([]);
  const [ladowanie, ustawLadowanie] = useState(true);
  const [blad, ustawBlad] = useState("");
  const [mojeId, ustawMojeId] = useState(null);

  const token = localStorage.getItem("token");

  async function pobierzMojeId() {
    if (!token) return null;

    try {
      const odpowiedz = await fetch(expandLink("/api/users/me"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!odpowiedz.ok) {
        return null;
      }

      const dane = await odpowiedz.json();

      const idUzytkownika =
        dane?.user_id ||
        dane?.userId ||
        dane?.id ||
        null;

      ustawMojeId(idUzytkownika);
      return idUzytkownika;
    } catch {
      return null;
    }
  }

  async function pobierzZwierzeta() {
    try {
      ustawBlad("");

      const odpowiedz = await fetch(expandLink("/api/animals"));

      if (!odpowiedz.ok) {
        throw new Error(`HTTP ${odpowiedz.status}`);
      }

      const dane = await odpowiedz.json();
      ustawZwierzeta(Array.isArray(dane) ? dane : []);
    } catch (bladPobierania) {
      ustawBlad(bladPobierania.message);
    } finally {
      ustawLadowanie(false);
    }
  }

  async function usunOgloszenie(animalId, nazwa) {
    if (!token) return;

    const potwierdzenie = window.confirm(
      `Czy na pewno chcesz usunąć ogłoszenie "${nazwa}"?`
    );

    if (!potwierdzenie) return;

    try {
      const odpowiedz = await fetch(expandLink(`/api/animals/${animalId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let dane = null;
      const typTresci = odpowiedz.headers.get("content-type") || "";

      if (typTresci.includes("application/json")) {
        dane = await odpowiedz.json();
      }

      if (!odpowiedz.ok) {
        throw new Error(dane?.message || "Nie udało się usunąć ogłoszenia.");
      }

      ustawZwierzeta((poprzednie) =>
        poprzednie.filter((zwierze) => zwierze.animal_id !== animalId)
      );
    } catch (bladUsuwania) {
      alert(bladUsuwania.message);
    }
  }

  useEffect(() => {
    async function inicjalizuj() {
      await pobierzMojeId();
      await pobierzZwierzeta();
    }

    inicjalizuj();
  }, []);

  const mojeZwierzetta = zwierzeta.filter((zwierze) => mojeId && zwierze.userId === mojeId);

  return (
    <>
      <Navbar />

      <main className="moje-zgloszenia">
        <section className="sekcja-zgloszen">
          <h1 className="tytul">Moje zgłoszenia</h1>

          {ladowanie && <p>Ładowanie...</p>}
          {!ladowanie && blad && <p className="blad">Błąd: {blad}</p>}
          {!ladowanie && !blad && mojeZwierzetta.length === 0 && (
            <p>Nie masz jeszcze żadnych ogłoszeń.</p>
          )}

          <div className="lista-zgloszen">
          {mojeZwierzetta.map((zwierze) => {
            const rasa =
              zwierze.cat_breed ||
              zwierze.breed ||
              "Nie podano";

            return (
              <article className="karta-zgloszenia" key={zwierze.animal_id}>
                {zwierze.image && (
                  <div className="ramka-obrazu">
                    <img
                      src={buildImageUrl(zwierze.image)}
                      alt={zwierze.name}
                      className="obraz"
                    />
                  </div>
                )}

                <h2><strong>Imię:</strong> {zwierze.name}</h2>
                <p><strong>Rasa:</strong> {rasa}</p>
                <p><strong>Opis:</strong> {zwierze.description}</p>

                <div className="akcje-ogloszenia">
                  <button
                    className="przycisk-edytuj"
                    onClick={() =>
                      navigate(`/edytuj-ogloszenie/${zwierze.animal_id}`, {
                        state: { zwierze },
                      })
                    }
                  >
                    Edytuj
                  </button>

                  <button
                    className="przycisk-usun"
                    onClick={() =>
                      usunOgloszenie(zwierze.animal_id, zwierze.name)
                    }
                  >
                    Usuń
                  </button>
                </div>
              </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}