import { useEffect, useState } from "react";
import Navbar from "../../Komponenty/Navbar/navbar";
import { expandLink } from "../../fetches/expandLink";
import { buildImageUrl } from "../../fetches/buildImageUrl";
import "./home.css";
import KotyZApi from "../../Komponenty/KotyZApi/kotyZApi";

export default function Home() {
  const [zwierzeta, ustawZwierzeta] = useState([]);
  const [ladowanie, ustawLadowanie] = useState(true);
  const [blad, ustawBlad] = useState("");
  const [mojeId, ustawMojeId] = useState(null);
  const [mojeWnioski, ustawMojeWnioski] = useState([]);

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

  async function zlozWniosek(animalId, nazwa) {
    if (!token) return;

    const potwierdzenie = window.confirm(
      `Czy chcesz złożyć wniosek o adopcję zwierzęcia "${nazwa}"?`
    );

    if (!potwierdzenie) return;

    try {
      const odpowiedz = await fetch(
        expandLink(`/api/adoptions/request/${animalId}`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let dane = null;
      const typTresci = odpowiedz.headers.get("content-type") || "";

      if (typTresci.includes("application/json")) {
        dane = await odpowiedz.json();
      }

      if (!odpowiedz.ok) {
        throw new Error(dane?.message || "Nie udało się złożyć wniosku.");
      }

      await pobierzMojeWnioski();
    } catch (bladWniosku) {
      alert(bladWniosku.message);
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

        {/* SEKCJA 1 — wasze ogłoszenia */}
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

                  <h2>{zwierze.name}</h2>
                  <p>{zwierze.description}</p>

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
                            zlozWniosek(
                              zwierze.animal_id,
                              zwierze.name
                            )
                          }
                        >
                          Złóż wniosek
                        </button>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {/* SEKCJA 2 — koty z API */}
        <section className="home-sekcja">
          <KotyZApi />
        </section>

      </main>
    </>
  );
}