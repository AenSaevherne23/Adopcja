import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { expandLink } from "../../fetches/expandLink";
import { pobierzRasyKotow } from "../../fetches/pobierzRasyKotow";
import Navbar from "../../Komponenty/Navbar/navbar";
import "./dodajOgloszenie.css";

const DOZWOLONE_TYPY_PLIKOW = ["image/jpeg", "image/png", "image/webp"];
const MAKSYMALNY_ROZMIAR_PLIKU = 5 * 1024 * 1024;

function zawieraNiedozwoloneZnaki(tekst) {
  return /[<>{}()[\]'";]/.test(tekst);
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

function walidujZdjecie(plik) {
  const bledy = [];

  if (!plik) {
    bledy.push("Musisz dodać zdjęcie!");
    return bledy;
  }

  if (!DOZWOLONE_TYPY_PLIKOW.includes(plik.type)) {
    bledy.push("Nieprawidłowy format pliku (tylko JPG, PNG, WEBP).");
  }

  if (plik.size > MAKSYMALNY_ROZMIAR_PLIKU) {
    bledy.push("Zdjęcie może mieć maksymalnie 5 MB.");
  }

  return bledy;
}

function walidujFormularz(nazwa, rasaKota, opis, zdjecie) {
  const bledy = [];

  const nazwaPrzycieta = nazwa.trim();
  const rasaPrzycieta = rasaKota.trim();
  const opisPrzyciety = opis.trim();

  if (nazwaPrzycieta.length < 2) {
    bledy.push("Imię musi mieć co najmniej 2 znaki");
  }

  if (nazwaPrzycieta.length > 50) {
    bledy.push("Imię może mieć maksymalnie 50 znaków");
  }

  if (zawieraNiedozwoloneZnaki(nazwaPrzycieta)) {
    bledy.push("Imię zawiera niedozwolone znaki");
  }

  if (rasaPrzycieta.length < 2) {
    bledy.push("Rasa musi mieć co najmniej 2 znaki");
  }

  if (rasaPrzycieta.length > 50) {
    bledy.push("Rasa może mieć maksymalnie 50 znaków");
  }

  if (zawieraNiedozwoloneZnaki(rasaPrzycieta)) {
    bledy.push("Rasa zawiera niedozwolone znaki");
  }

  if (opisPrzyciety.length < 10) {
    bledy.push("Opis musi mieć co najmniej 10 znaków");
  }

  if (opisPrzyciety.length > 1000) {
    bledy.push("Opis może mieć maksymalnie 1000 znaków");
  }

  if (zawieraNiedozwoloneZnaki(opisPrzyciety)) {
    bledy.push("Opis zawiera niedozwolone znaki");
  }

  bledy.push(...walidujZdjecie(zdjecie));

  return bledy;
}

export default function DodajOgloszenie() {
  const navigate = useNavigate();

  const [nazwa, ustawNazwa] = useState("");
  const [opis, ustawOpis] = useState("");
  const [zdjecie, ustawZdjecie] = useState(null);
  const [rasaKota, ustawRasaKota] = useState("");

  const [rasyKotow, ustawRasyKotow] = useState([]);
  const [ladowanieRas, ustawLadowanieRas] = useState(true);

  const [bledy, ustawBledy] = useState([]);
  const [wiadomosc, ustawWiadomosc] = useState("");
  const [ladowanie, ustawLadowanie] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    async function zaladujRasyKotow() {
      try {
        const dane = await pobierzRasyKotow();

        const posortowaneRasy = [...dane].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );

        ustawRasyKotow(posortowaneRasy);
      } catch (error) {
        console.error(error);
      } finally {
        ustawLadowanieRas(false);
      }
    }

    zaladujRasyKotow();
  }, []);

  async function obsluzDodawanie(e) {
    e.preventDefault();

    ustawBledy([]);
    ustawWiadomosc("");

    if (!token) {
      ustawBledy(["Musisz być zalogowany, aby dodać ogłoszenie."]);
      return;
    }

    const bledyWalidacji = walidujFormularz(nazwa, rasaKota, opis, zdjecie);

    if (bledyWalidacji.length > 0) {
      ustawBledy(bledyWalidacji);
      return;
    }

    const daneFormularza = new FormData();
    daneFormularza.append("name", nazwa.trim());
    daneFormularza.append("description", opis.trim());
    daneFormularza.append("image", zdjecie);
    daneFormularza.append("cat_breed", rasaKota.trim());

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
        ustawBledy(pobierzBledyZBackendu(dane));
        return;
      }

      ustawWiadomosc("Ogłoszenie zostało dodane.");

      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch {
      ustawBledy(["Nie udało się połączyć z serwerem."]);
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
              Rasa kota
              <select
                value={rasaKota}
                onChange={(e) => ustawRasaKota(e.target.value)}
                required
                disabled={ladowanieRas}
              >
                <option value="">
                  {ladowanieRas ? "Ładowanie ras..." : "Wybierz rasę"}
                </option>

                {rasyKotow.map((rasa) => (
                  <option key={rasa.id} value={rasa.name}>
                    {rasa.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Opis
              <textarea
                value={opis}
                onChange={(e) => ustawOpis(e.target.value)}
                rows="6"
                maxLength={1000}
                required
              />
            </label>

            <label>
              Zdjęcie
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => ustawZdjecie(e.target.files?.[0] || null)}
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

            <button type="submit" disabled={ladowanie || ladowanieRas}>
              {ladowanie ? "Dodawanie..." : "Dodaj ogłoszenie"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}