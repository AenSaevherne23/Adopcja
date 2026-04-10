import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../Komponenty/Navbar/navbar";
import { expandLink } from "../../fetches/expandLink";
import { buildImageUrl } from "../../fetches/buildImageUrl";
import { pobierzRasyKotow } from "../../fetches/pobierzRasyKotow";
import "./edytujOgloszenie.css";

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

function walidujPoleTekstowe(wartosc, nazwaPola, minimum, maksimum) {
  const bledy = [];
  const tekst = wartosc.trim();

  if (tekst.length < minimum) {
    bledy.push(`${nazwaPola} musi mieć co najmniej ${minimum} znaki`);
  }

  if (tekst.length > maksimum) {
    bledy.push(`${nazwaPola} może mieć maksymalnie ${maksimum} znaków`);
  }

  if (zawieraNiedozwoloneZnaki(tekst)) {
    bledy.push(`${nazwaPola} zawiera niedozwolone znaki`);
  }

  return bledy;
}

export default function EdytujOgloszenie() {
  const location = useLocation();
  const navigate = useNavigate();
  const zwierze = location.state?.zwierze;

  const [nazwa, ustawNazwa] = useState(zwierze?.name || "");
  const [opis, ustawOpis] = useState(zwierze?.description || "");
  const [rasaKota, ustawRasaKota] = useState(
    zwierze?.cat_breed || zwierze?.breed || ""
  );
  const [zdjecie, ustawZdjecie] = useState(null);

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

    ustawBledy([]);
    ustawWiadomosc("");

    if (!token) {
      ustawBledy(["Musisz być zalogowany."]);
      return;
    }

    const bledyWalidacji = [
      ...walidujPoleTekstowe(nazwa, "Imię", 2, 50),
      ...walidujPoleTekstowe(rasaKota, "Rasa", 2, 50),
      ...walidujPoleTekstowe(opis, "Opis", 10, 1000),
      ...walidujZdjecie(zdjecie),
    ];

    if (bledyWalidacji.length > 0) {
      ustawBledy(bledyWalidacji);
      return;
    }

    const daneFormularza = new FormData();
    daneFormularza.append("name", nazwa.trim());
    daneFormularza.append("cat_breed", rasaKota.trim());
    daneFormularza.append("description", opis.trim());

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
        ustawBledy(pobierzBledyZBackendu(dane));
        return;
      }

      ustawWiadomosc("Ogłoszenie zostało zaktualizowane.");

      setTimeout(() => {
        navigate("/");
      }, 900);
    } catch {
      ustawBledy(["Nie udało się połączyć z serwerem."]);
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
              Rasa kota
              <select
                value={rasaKota}
                onChange={(e) => ustawRasaKota(e.target.value)}
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
              />
            </label>

            <label>
              Nowe zdjęcie
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => ustawZdjecie(e.target.files?.[0] || null)}
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
              {ladowanie ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}