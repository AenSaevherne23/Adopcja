import { useEffect, useState } from "react";
import Navbar from "../../Komponenty/Navbar/navbar";
import { expandLink } from "../../fetches/expandLink";
import { buildImageUrl } from "../../fetches/buildImageUrl";
import "./home.css";
import KotyZApi from "../../Komponenty/KotyZApi/kotyZApi";

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

function walidujUzasadnienie(uzasadnienie) {
  const bledy = [];
  const tekst = uzasadnienie.trim();

  if (tekst.length < 10) {
    bledy.push("Uzasadnienie musi mieć co najmniej 10 znaków");
  }

  if (tekst.length > 1000) {
    bledy.push("Uzasadnienie jest za długie");
  }

  return bledy;
}

export default function Home() {
  const [zwierzeta, ustawZwierzeta] = useState([]);
  const [ladowanie, ustawLadowanie] = useState(true);
  const [blad, ustawBlad] = useState("");
  const [mojeId, ustawMojeId] = useState(null);
  const [mojeWnioski, ustawMojeWnioski] = useState([]);

  const [otwartyFormularzId, ustawOtwartyFormularzId] = useState(null);
  const [uzasadnienie, ustawUzasadnienie] = useState("");
  const [bledyWniosku, ustawBledyWniosku] = useState([]);
  const [ladowanieWniosku, ustawLadowanieWniosku] = useState(false);

  const token = localStorage.getItem("token");

  function pobierzTekstStatusu(status) {
    if (status === "pending") return "Oczekuje";
    if (status === "approved") return "Zaakceptowano";
    if (status === "rejected") return "Odrzucono";
    return status;
  }

  function pobierzKlaseStatusu(status) {
    if (status === "pending") return "przycisk-status przycisk-status-oczekuje";
    if (status === "approved") return "przycisk-status przycisk-status-zaakceptowano";
    if (status === "rejected") return "przycisk-status przycisk-status-odrzucono";
    return "przycisk-status";
  }

  function znajdzStatusWniosku(animalId) {
    const wniosek = mojeWnioski.find((element) => {
      const idZwierzaka =
        element.animalId ||
        element.animal_id ||
        element.animal?.animal_id ||
        element.animal?.animalId;

      return idZwierzaka === animalId;
    });

    return wniosek?.status || null;
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

  async function pobierzMojeId() {
    if (!token) return;

    try {
      const odpowiedz = await fetch(expandLink("/api/users/me"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!odpowiedz.ok) {
        return;
      }

      const dane = await odpowiedz.json();

      const idUzytkownika =
        dane?.user_id ||
        dane?.userId ||
        dane?.id ||
        null;

      ustawMojeId(idUzytkownika);
    } catch {
    }
  }

  async function pobierzMojeWnioski() {
    if (!token) return;

    try {
      const odpowiedz = await fetch(
        expandLink("/api/adoptions/my-sent-requests"),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!odpowiedz.ok) {
        return;
      }

      const dane = await odpowiedz.json();
      ustawMojeWnioski(Array.isArray(dane) ? dane : []);
    } catch {
      ustawMojeWnioski([]);
    }
  }

  function otworzFormularzWniosku(animalId) {
    ustawOtwartyFormularzId(animalId);
    ustawUzasadnienie("");
    ustawBledyWniosku([]);
  }

  function anulujWniosek() {
    ustawOtwartyFormularzId(null);
    ustawUzasadnienie("");
    ustawBledyWniosku([]);
  }

  async function zlozWniosek(animalId) {
    if (!token) return;

    ustawBledyWniosku([]);

    const uzasadnieniePrzycięte = uzasadnienie.trim();
    const bledyWalidacji = walidujUzasadnienie(uzasadnieniePrzycięte);

    if (bledyWalidacji.length > 0) {
      ustawBledyWniosku(bledyWalidacji);
      return;
    }

    ustawLadowanieWniosku(true);

    try {
      const odpowiedz = await fetch(
        expandLink(`/api/adoptions/request/${animalId}`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            motivation: uzasadnieniePrzycięte,
          }),
        }
      );

      const dane = await odpowiedz.json();

      if (!odpowiedz.ok) {
        ustawBledyWniosku(pobierzBledyZBackendu(dane));
        return;
      }

      await pobierzMojeWnioski();
      ustawOtwartyFormularzId(null);
      ustawUzasadnienie("");
      ustawBledyWniosku([]);
    } catch {
      ustawBledyWniosku(["Nie udało się połączyć z serwerem."]);
    } finally {
      ustawLadowanieWniosku(false);
    }
  }

  useEffect(() => {
    pobierzZwierzeta();
    pobierzMojeId();
    pobierzMojeWnioski();
  }, []);

  const zwierzetaDoWyswietlenia = zwierzeta.filter((zwierze) => {
    const mojeOgloszenie = mojeId && zwierze.userId === mojeId;
    const statusWniosku = znajdzStatusWniosku(zwierze.animal_id);

    if (mojeOgloszenie) return false;
    if (statusWniosku === "approved") return false;
    if (statusWniosku === "rejected") return false;

    return true;
  });

  return (
    <>
      <Navbar />

      <main className="home">
        <section className="home-sekcja">
          <h1 className="home-tytul">Zwierzęta do adopcji</h1>

          {ladowanie && (
            <p className="home-komunikat">
              Ładowanie danych...
            </p>
          )}

          {!ladowanie && blad && (
            <p className="home-komunikat blad">
              Błąd: {blad}
            </p>
          )}

          {!ladowanie &&
            !blad &&
            zwierzetaDoWyswietlenia.length === 0 && (
              <p className="home-komunikat">
                Brak dostępnych zwierząt do adopcji.
              </p>
            )}

          <div className="lista-zwierzat">
            {zwierzetaDoWyswietlenia.map((zwierze) => {
              const statusWniosku = znajdzStatusWniosku(
                zwierze.animal_id
              );

              const czyOtwartyFormularz =
                otwartyFormularzId === zwierze.animal_id;

              const rasa =
                zwierze.cat_breed ||
                zwierze.breed ||
                "Nie podano";

              return (
                <article
                  className="karta-zwierzecia"
                  key={zwierze.animal_id || zwierze.id}
                >
                  {zwierze.image && (
                    <div className="ramka-obrazu">
                      <img
                        className="obraz-zwierzecia"
                        src={buildImageUrl(zwierze.image)}
                        alt={zwierze.name}
                      />
                    </div>
                  )}

                  <h2><strong>Imię:</strong> {zwierze.name}</h2>
                  <p><strong>Rasa:</strong> {rasa}</p>
                  <p><strong>Opis:</strong> {zwierze.description}</p>

                  {token ? (
                    <div className="akcje-ogloszenia">
                      {statusWniosku ? (
                        <div
                          className={pobierzKlaseStatusu(
                            statusWniosku
                          )}
                        >
                          {pobierzTekstStatusu(statusWniosku)}
                        </div>
                      ) : (
                        <button
                          className="przycisk-wniosek"
                          onClick={() =>
                            otworzFormularzWniosku(zwierze.animal_id)
                          }
                        >
                          Złóż wniosek
                        </button>
                      )}
                    </div>
                  ) : null}

                  {czyOtwartyFormularz && (
                    <div className="formularz-wniosku">
                      <label>
                        Dlaczego chcesz adoptować tego zwierzaka?
                        <textarea
                          value={uzasadnienie}
                          onChange={(e) => ustawUzasadnienie(e.target.value)}
                          rows="5"
                          maxLength={1000}
                          placeholder="Napisz kilka zdań uzasadnienia..."
                        />
                      </label>

                      <p className="licznik-znakow">
                        {uzasadnienie.trim().length}/1000
                      </p>

                      {bledyWniosku.length > 0 && (
                        <div className="komunikat-blad">
                          {bledyWniosku.map((bladElement, index) => (
                            <p key={index}>{bladElement}</p>
                          ))}
                        </div>
                      )}

                      <div className="akcje-formularza-wniosku">
                        <button
                          className="przycisk-wniosek"
                          onClick={() => zlozWniosek(zwierze.animal_id)}
                          disabled={ladowanieWniosku}
                        >
                          {ladowanieWniosku ? "Wysyłanie..." : "Wyślij wniosek"}
                        </button>

                        <button
                          className="przycisk-anuluj-wniosek"
                          onClick={anulujWniosek}
                          disabled={ladowanieWniosku}
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="home-sekcja">
          <KotyZApi />
        </section>
      </main>
    </>
  );
}