import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { expandLink } from "../../fetches/expandLink";
import "./rejestracja.css";

export default function Rejestracja() {
  const navigate = useNavigate();

  const [email, ustawEmail] = useState("");
  const [haslo, ustawHaslo] = useState("");
  const [powtorzHaslo, ustawPowtorzHaslo] = useState("");
  const [blad, ustawBlad] = useState("");
  const [wiadomosc, ustawWiadomosc] = useState("");
  const [ladowanie, ustawLadowanie] = useState(false);

  async function obsluzRejestracje(e) {
    e.preventDefault();
    ustawBlad("");
    ustawWiadomosc("");

    if (haslo !== powtorzHaslo) {
      ustawBlad("Hasła nie są takie same.");
      return;
    }

    ustawLadowanie(true);

    try {
      const odpowiedz = await fetch(expandLink("/api/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: haslo,
        }),
      });

      const dane = await odpowiedz.json();

      if (!odpowiedz.ok) {
        throw new Error(dane.message || "Nie udało się utworzyć konta.");
      }

      ustawWiadomosc("Konto zostało utworzone.");

      setTimeout(() => {
        navigate("/logowanie");
      }, 1000);
    } catch (bladRejestracji) {
      ustawBlad(bladRejestracji.message);
    } finally {
      ustawLadowanie(false);
    }
  }

  return (
    <main className="strona-formularza">
      <section className="karta-formularza">
        <h1>Rejestracja</h1>

        <form onSubmit={obsluzRejestracje} className="formularz">
          <label>
            Adres e-mail
            <input
              type="email"
              value={email}
              onChange={(e) => ustawEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Hasło
            <input
              type="password"
              value={haslo}
              onChange={(e) => ustawHaslo(e.target.value)}
              required
            />
          </label>

          <label>
            Powtórz hasło
            <input
              type="password"
              value={powtorzHaslo}
              onChange={(e) => ustawPowtorzHaslo(e.target.value)}
              required
            />
          </label>

          {blad && <p className="komunikat-blad">{blad}</p>}
          {wiadomosc && <p className="komunikat-poprawny">{wiadomosc}</p>}

          <button type="submit" disabled={ladowanie}>
            {ladowanie ? "Tworzenie konta..." : "Zarejestruj się"}
          </button>
        </form>

        <p className="dolny-link">
          Masz już konto? <Link to="/logowanie">Zaloguj się</Link>
        </p>
      </section>
    </main>
  );
}