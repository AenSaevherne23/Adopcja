import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { expandLink } from "../../fetches/expandLink";
import "./logowanie.css";

export default function Logowanie() {
  const navigate = useNavigate();

  const [email, ustawEmail] = useState("");
  const [haslo, ustawHaslo] = useState("");
  const [blad, ustawBlad] = useState("");
  const [wiadomosc, ustawWiadomosc] = useState("");
  const [ladowanie, ustawLadowanie] = useState(false);

  async function obsluzLogowanie(e) {
    e.preventDefault();
    ustawBlad("");
    ustawWiadomosc("");
    ustawLadowanie(true);

    try {
      const odpowiedz = await fetch(expandLink("/api/auth/login"), {
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
        throw new Error(dane.message || "Nie udało się zalogować.");
      }

      localStorage.setItem("token", dane.token);
      localStorage.setItem("email", dane.user?.email || "");
      localStorage.setItem("rola", dane.user?.role || "");

      navigate("/");
      window.location.reload();
    } catch (bladLogowania) {
      ustawBlad(bladLogowania.message);
    } finally {
      ustawLadowanie(false);
    }
  }

  return (
    <main className="strona-formularza">
      <section className="karta-formularza">
        <h1>Logowanie</h1>

        <form onSubmit={obsluzLogowanie} className="formularz">
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

          {blad && <p className="komunikat-blad">{blad}</p>}
          {wiadomosc && <p className="komunikat-poprawny">{wiadomosc}</p>}

          <button type="submit" disabled={ladowanie}>
            {ladowanie ? "Logowanie..." : "Zaloguj się"}
          </button>
        </form>

        <p className="dolny-link">
          Nie masz konta? <Link to="/rejestracja">Zarejestruj się</Link>
        </p>
      </section>
    </main>
  );
}