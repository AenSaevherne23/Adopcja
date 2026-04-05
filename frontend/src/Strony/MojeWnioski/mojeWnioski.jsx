import { useEffect, useState } from "react";
import Navbar from "../../Komponenty/Navbar/navbar";
import { expandLink } from "../../fetches/expandLink";
import { buildImageUrl } from "../../fetches/buildImageUrl";
import "./mojeWnioski.css";

export default function MojeWnioski() {
  const [wnioski, ustawWnioski] = useState([]);
  const [ladowanie, ustawLadowanie] = useState(true);
  const [blad, ustawBlad] = useState("");

  const token = localStorage.getItem("token");

  function pobierzTekstStatusu(status) {
    if (status === "pending") return "Oczekuje";
    if (status === "approved") return "Zaakceptowano";
    if (status === "rejected") return "Odrzucono";
    return status;
  }

  function pobierzKlaseStatusu(status) {
    if (status === "pending") return "status status-oczekuje";
    if (status === "approved") return "status status-zaakceptowano";
    if (status === "rejected") return "status status-odrzucono";
    return "status";
  }

  useEffect(() => {
    async function pobierzWnioski() {
      if (!token) {
        ustawBlad("Musisz być zalogowany.");
        ustawLadowanie(false);
        return;
      }

      try {
        ustawBlad("");

        const odpowiedz = await fetch(
          expandLink("/api/adoptions/my-sent-requests"),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!odpowiedz.ok) {
          throw new Error(`HTTP ${odpowiedz.status}`);
        }

        const dane = await odpowiedz.json();
        ustawWnioski(Array.isArray(dane) ? dane : []);
      } catch (bladPobierania) {
        ustawBlad(bladPobierania.message);
      } finally {
        ustawLadowanie(false);
      }
    }

    pobierzWnioski();
  }, [token]);

  return (
    <>
      <Navbar />

      <main className="moje-wnioski">
        <section className="moje-wnioski-sekcja">
          <h1 className="moje-wnioski-tytul">Moje wnioski</h1>

          {ladowanie && <p className="moje-wnioski-komunikat">Ładowanie danych...</p>}
          {!ladowanie && blad && (
            <p className="moje-wnioski-komunikat blad">Błąd: {blad}</p>
          )}
          {!ladowanie && !blad && wnioski.length === 0 && (
            <p className="moje-wnioski-komunikat">Nie masz jeszcze żadnych wniosków.</p>
          )}

          <div className="lista-wnioskow">
            {wnioski.map((wniosek) => {
              const requestId = wniosek.request_id || wniosek.requestId;
              const zwierze =
                wniosek.animal ||
                wniosek.zwierze ||
                {};

              const nazwa =
                zwierze.name ||
                wniosek.animalName ||
                wniosek.name ||
                "Brak nazwy";

              const opis =
                zwierze.description ||
                wniosek.animalDescription ||
                wniosek.description ||
                "Brak opisu";

              const obraz =
                zwierze.image ||
                wniosek.animalImage ||
                wniosek.image ||
                "";

              const status = wniosek.status || "pending";

              return (
                <article className="karta-wniosku" key={requestId}>
                  {obraz && (
                    <div className="ramka-obrazu-wniosku">
                      <img
                        className="obraz-wniosku"
                        src={buildImageUrl(obraz)}
                        alt={nazwa}
                      />
                    </div>
                  )}

                  <h2>{nazwa}</h2>
                  <p>{opis}</p>

                  <div className={pobierzKlaseStatusu(status)}>
                    {pobierzTekstStatusu(status)}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}