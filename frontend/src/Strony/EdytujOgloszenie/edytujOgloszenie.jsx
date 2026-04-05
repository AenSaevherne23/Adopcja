import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../Komponenty/Navbar/navbar";
import { expandLink } from "../../fetches/expandLink";
import { buildImageUrl } from "../../fetches/buildImageUrl";
import "./edytujOgloszenie.css";

export default function EdytujOgloszenie() {
  const location = useLocation();
  const navigate = useNavigate();
  const zwierze = location.state?.zwierze;

  const [nazwa, ustawNazwa] = useState(zwierze?.name || "");
  const [opis, ustawOpis] = useState(zwierze?.description || "");
  const [zdjecie, ustawZdjecie] = useState(null);
  const [blad, ustawBlad] = useState("");
  const [wiadomosc, ustawWiadomosc] = useState("");
  const [ladowanie, ustawLadowanie] = useState(false);

  const token = localStorage.getItem("token");

  if (!zwierze) {
    return (
      <>
        <Navbar />
        <main className="strona-edycji">
          <section className="karta-edycji">
            <h1>Nie znaleziono danych ogłoszenia</h1>
            <button onClick={() => navigate("/")}>Wróć</button>
          </section>
        </main>
      </>
    );
  }

  async function obsluzEdycje(e) {
    e.preventDefault();
    ustawBlad("");
    ustawWiadomosc("");

    if (!token) {
      ustawBlad("Musisz być zalogowany.");
      return;
    }

    const daneFormularza = new FormData();

    if (nazwa.trim()) {
      daneFormularza.append("name", nazwa);
    }

    if (opis.trim()) {
      daneFormularza.append("description", opis);
    }

    if (zdjecie) {
      daneFormularza.append("image", zdjecie);
    }

    ustawLadowanie(true);

    try {
      const odpowiedz = await fetch(
        expandLink(`/api/animals/${zwierze.animal_id}`),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: daneFormularza,
        }
      );

      let dane = null;
      const typTresci = odpowiedz.headers.get("content-type") || "";

      if (typTresci.includes("application/json")) {
        dane = await odpowiedz.json();
      } else {
        const tekstBledu = await odpowiedz.text();
        dane = { message: tekstBledu };
      }

      if (!odpowiedz.ok) {
        throw new Error(dane?.message || "Nie udało się zapisać zmian.");
      }

      ustawWiadomosc("Ogłoszenie zostało zaktualizowane.");

      setTimeout(() => {
        navigate("/");
      }, 900);
    } catch (bladEdycji) {
      ustawBlad(bladEdycji.message);
    } finally {
      ustawLadowanie(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="strona-edycji">
        <section className="karta-edycji">
          <h1>Edytuj ogłoszenie</h1>

          <div className="podglad-obecny">
            <p>Obecne zdjęcie:</p>
            {zwierze.image ? (
              <div className="ramka-podgladu">
                <img
                  src={buildImageUrl(zwierze.image)}
                  alt={zwierze.name}
                  className="obraz-podgladu"
                />
              </div>
            ) : (
              <p>Brak zdjęcia</p>
            )}
          </div>

          <form onSubmit={obsluzEdycje} className="formularz-edycji">
            <label>
              Imię zwierzęcia
              <input
                type="text"
                value={nazwa}
                onChange={(e) => ustawNazwa(e.target.value)}
                maxLength={50}
              />
            </label>

            <label>
              Opis
              <textarea
                value={opis}
                onChange={(e) => ustawOpis(e.target.value)}
                rows="6"
              />
            </label>

            <label>
              Nowe zdjęcie
              <input
                type="file"
                accept="image/*"
                onChange={(e) => ustawZdjecie(e.target.files?.[0] || null)}
              />
            </label>

            {blad && <p className="komunikat-blad">{blad}</p>}
            {wiadomosc && <p className="komunikat-poprawny">{wiadomosc}</p>}

            <button type="submit" disabled={ladowanie}>
              {ladowanie ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}