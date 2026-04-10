import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { expandLink } from "../../fetches/expandLink";
import "./logowanie.css";

function czyPoprawnyEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function pobierzBledyZBackendu(dane) {
  if (!dane) {
    return ["Wystąpił błąd."];
  }

  if (typeof dane.error === "string") {
    return [dane.error];
  }

  if (Array.isArray(dane.error)) {
    return dane.error.map((element) => element.message || "Błędne dane");
  }

  if (Array.isArray(dane.details)) {
    return dane.details.map((element) => element.message || "Błędne dane");
  }

  if (typeof dane.message === "string") {
    return [dane.message];
  }

  return ["Wystąpił błąd."];
}

function walidujLogowanie(email, haslo) {
  const bledy = [];
  const emailPrzyciety = email.trim();

  if (!czyPoprawnyEmail(emailPrzyciety)) {
    bledy.push("Nieprawidłowy email");
  }

  if (haslo.length < 1) {
    bledy.push("Hasło jest wymagane");
  }

  return bledy;
}

export default function Logowanie() {
  const navigate = useNavigate();

  const [email, ustawEmail] = useState("");
  const [haslo, ustawHaslo] = useState("");
  const [bledy, ustawBledy] = useState([]);
  const [wiadomosc, ustawWiadomosc] = useState("");
  const [ladowanie, ustawLadowanie] = useState(false);

  async function obsluzLogowanie(e) {
    e.preventDefault();

    ustawBledy([]);
    ustawWiadomosc("");

    const emailPrzyciety = email.trim();
    const bledyWalidacji = walidujLogowanie(emailPrzyciety, haslo);

    if (bledyWalidacji.length > 0) {
      ustawBledy(bledyWalidacji);
      return;
    }

    ustawLadowanie(true);

    try {
      const odpowiedz = await fetch(expandLink("/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailPrzyciety,
          password: haslo,
        }),
      });

      const dane = await odpowiedz.json();

      if (!odpowiedz.ok) {
        ustawBledy(pobierzBledyZBackendu(dane));
        return;
      }

      localStorage.setItem("token", dane.token);
      localStorage.setItem("email", dane.user?.email || "");
      localStorage.setItem("rola", dane.user?.role || "");

      navigate("/");
      window.location.reload();
    } catch {
      ustawBledy(["Nie udało się połączyć z serwerem."]);
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

          {bledy.length > 0 && (
            <div className="komunikat-blad">
              {bledy.map((blad, index) => (
                <p key={index}>{blad}</p>
              ))}
            </div>
          )}

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