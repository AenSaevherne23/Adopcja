import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { expandLink } from "../../fetches/expandLink";
import Navbar from "../../Komponenty/Navbar/navbar";
import "./dodajOgloszenie.css";

export default function DodajOgloszenie() {
  const navigate = useNavigate();

  const [nazwa, ustawNazwa] = useState("");
  const [opis, ustawOpis] = useState("");
  const [zdjecie, ustawZdjecie] = useState(null);

  const [blad, ustawBlad] = useState("");
  const [wiadomosc, ustawWiadomosc] = useState("");
  const [ladowanie, ustawLadowanie] = useState(false);

  const token = localStorage.getItem("token");

  async function obsluzDodawanie(e) {
    e.preventDefault();

    ustawBlad("");
    ustawWiadomosc("");

    if (!token) {
      ustawBlad("Musisz być zalogowany, aby dodać ogłoszenie.");
      return;
    }

    if (!nazwa.trim() || !opis.trim() || !zdjecie) {
      ustawBlad("Uzupełnij nazwę, opis i wybierz zdjęcie.");
      return;
    }

    const daneFormularza = new FormData();
    daneFormularza.append("name", nazwa);
    daneFormularza.append("description", opis);
    daneFormularza.append("image", zdjecie);

    ustawLadowanie(true);

    try {
      const odpowiedz = await fetch(expandLink("/api/animals"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: daneFormularza,
      });

      let dane = {};
      const typTresci = odpowiedz.headers.get("content-type");

      if (typTresci && typTresci.includes("application/json")) {
        dane = await odpowiedz.json();
      }

      if (!odpowiedz.ok) {
        throw new Error(dane.message || "Nie udało się dodać ogłoszenia.");
      }

      ustawWiadomosc("Ogłoszenie zostało dodane.");

      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (bladDodawania) {
      ustawBlad(bladDodawania.message);
    } finally {
      ustawLadowanie(false);
    }
  }

    return (
    <>
        <Navbar />

        <main className="strona-dodawania">
        <section className="karta-dodawania">
            <h1>Dodaj ogłoszenie</h1>

            <form onSubmit={obsluzDodawanie} className="formularz-dodawania">
            <label>
                Imię zwierzęcia
                <input
                type="text"
                value={nazwa}
                onChange={(e) => ustawNazwa(e.target.value)}
                maxLength={50}
                required
                />
            </label>

            <label>
                Opis
                <textarea
                value={opis}
                onChange={(e) => ustawOpis(e.target.value)}
                rows="6"
                required
                />
            </label>

            <label>
                Zdjęcie
                <input
                type="file"
                accept="image/*"
                onChange={(e) => ustawZdjecie(e.target.files?.[0] || null)}
                required
                />
            </label>

            {blad && <p className="komunikat-blad">{blad}</p>}
            {wiadomosc && <p className="komunikat-poprawny">{wiadomosc}</p>}

            <button type="submit" disabled={ladowanie}>
                {ladowanie ? "Dodawanie..." : "Dodaj ogłoszenie"}
            </button>
            </form>
        </section>
        </main>
    </>
    );
}