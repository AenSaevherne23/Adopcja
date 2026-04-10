import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { expandLink } from "../../fetches/expandLink";
import "./rejestracja.css";

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

function walidujHaslo(email, haslo) {
  const bledy = [];

  if (haslo.length < 8) {
    bledy.push("Hasło musi mieć co najmniej 8 znaków");
  }

  if (!/[A-Z]/.test(haslo)) {
    bledy.push("Hasło musi zawierać co najmniej jedną wielką literę");
  }

  if (!/[a-z]/.test(haslo)) {
    bledy.push("Hasło musi zawierać co najmniej jedną małą literę");
  }

  if (!/[0-9]/.test(haslo)) {
    bledy.push("Hasło musi zawierać co najmniej jedną cyfrę");
  }

  if (!/[^A-Za-z0-9]/.test(haslo)) {
    bledy.push("Hasło musi zawierać co najmniej jeden znak specjalny");
  }

  const lokalnaCzesc = email?.split("@")[0]?.toLowerCase();

  if (lokalnaCzesc) {
    const segmenty = lokalnaCzesc.split(/[.\-_]/);
    const hasloMaleLitery = haslo.toLowerCase();

    const zawieraNazweUzytkownika = segmenty.some(
      (segment) => segment.length > 3 && hasloMaleLitery.includes(segment)
    );

    if (zawieraNazweUzytkownika) {
      bledy.push("Hasło nie może zawierać nazwy użytkownika z adresu email");
    }
  }

  return bledy;
}

function walidujRejestracje(email, haslo, powtorzHaslo) {
  const bledy = [];
  const emailPrzycięty = email.trim();

  if (!czyPoprawnyEmail(emailPrzycięty)) {
    bledy.push("Nieprawidłowy email");
  }

  bledy.push(...walidujHaslo(emailPrzycięty, haslo));

  if (haslo !== powtorzHaslo) {
    bledy.push("Hasła nie są takie same.");
  }

  return bledy;
}

export default function Rejestracja() {
  const navigate = useNavigate();

  const [email, ustawEmail] = useState("");
  const [haslo, ustawHaslo] = useState("");
  const [powtorzHaslo, ustawPowtorzHaslo] = useState("");
  const [bledy, ustawBledy] = useState([]);
  const [wiadomosc, ustawWiadomosc] = useState("");
  const [ladowanie, ustawLadowanie] = useState(false);

  async function obsluzRejestracje(e) {
    e.preventDefault();

    ustawBledy([]);
    ustawWiadomosc("");

    const emailPrzycięty = email.trim();
    const bledyWalidacji = walidujRejestracje(
      emailPrzycięty,
      haslo,
      powtorzHaslo
    );

    if (bledyWalidacji.length > 0) {
      ustawBledy(bledyWalidacji);
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
          email: emailPrzycięty,
          password: haslo,
        }),
      });

      const dane = await odpowiedz.json();

      if (!odpowiedz.ok) {
        ustawBledy(pobierzBledyZBackendu(dane));
        return;
      }

      ustawWiadomosc("Konto zostało utworzone pomyślnie");

      setTimeout(() => {
        navigate("/logowanie");
      }, 1000);
    } catch {
      ustawBledy(["Nie udało się połączyć z serwerem."]);
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

          {bledy.length > 0 && (
            <div className="komunikat-blad">
              {bledy.map((blad, index) => (
                <p key={index}>{blad}</p>
              ))}
            </div>
          )}

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