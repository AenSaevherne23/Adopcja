import { useEffect, useState } from "react";
import Navbar from "../../Komponenty/Navbar/navbar";
import { expandLink } from "../../fetches/expandLink";
import { buildImageUrl } from "../../fetches/buildImageUrl";
import "./otrzymaneWnioski.css";

function pobierzTekstStatusu(status) {
  if (status === "pending") return "Oczekuje";
  if (status === "approved") return "Zaakceptowano";
  if (status === "rejected") return "Odrzucono";
  return status;
}

function pobierzPriorytetStatusu(status) {
  if (status === "pending") return 0;
  if (status === "approved") return 1;
  if (status === "rejected") return 2;
  return 3;
}

export default function OtrzymaneWnioski() {
  const [wnioski, ustawWnioski] = useState([]);
  const [ladowanie, ustawLadowanie] = useState(true);
  const [blad, ustawBlad] = useState("");

  const token = localStorage.getItem("token");

  async function pobierzWnioski() {
    try {
      ustawBlad("");

      const odpowiedz = await fetch(
        expandLink("/api/adoptions/my-received-requests"),
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
      const lista = Array.isArray(dane) ? dane : [];

      const posortowane = [...lista].sort((a, b) => {
        const statusA = a.status || "pending";
        const statusB = b.status || "pending";
        return pobierzPriorytetStatusu(statusA) - pobierzPriorytetStatusu(statusB);
      });

      ustawWnioski(posortowane);
    } catch (bladPobierania) {
      ustawBlad(bladPobierania.message);
    } finally {
      ustawLadowanie(false);
    }
  }

  async function zmienStatus(requestId, status) {
    try {
      const odpowiedz = await fetch(
        expandLink(`/api/adoptions/status/${requestId}`),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      let dane = null;
      const typ = odpowiedz.headers.get("content-type") || "";

      if (typ.includes("application/json")) {
        dane = await odpowiedz.json();
      }

      if (!odpowiedz.ok) {
        throw new Error(dane?.error || dane?.message || "Nie udało się zmienić statusu.");
      }

      await pobierzWnioski();
    } catch (bladZmiany) {
      alert(bladZmiany.message);
    }
  }

  useEffect(() => {
    pobierzWnioski();
  }, []);

  return (
    <>
      <Navbar />

      <main className="otrzymane-wnioski">
        <section className="sekcja-wnioskow">
          <h1 className="tytul">Otrzymane wnioski</h1>

          {ladowanie && <p>Ładowanie...</p>}
          {!ladowanie && blad && <p className="blad">Błąd: {blad}</p>}
          {!ladowanie && !blad && wnioski.length === 0 && (
            <p>Brak wniosków.</p>
          )}

          <div className="lista">
            {wnioski.map((wniosek) => {
              const requestId =
                wniosek.request_id ||
                wniosek.requestId;

              const zwierze =
                wniosek.animal ||
                {};

              const nazwa =
                zwierze.name ||
                wniosek.animalName ||
                "Brak nazwy";

              const rasa =
                zwierze.cat_breed ||
                zwierze.breed ||
                wniosek.cat_breed ||
                wniosek.breed ||
                "Nie podano";

              const opis =
                zwierze.description ||
                wniosek.animalDescription ||
                "";

              const obraz =
                zwierze.image ||
                wniosek.animalImage ||
                "";

              const status =
                wniosek.status ||
                "pending";

              const userEmail =
                wniosek.userEmail ||
                wniosek.email ||
                wniosek.user?.email ||
                "Nieznany użytkownik";

              const uzasadnienie =
                wniosek.motivation ||
                wniosek.uzasadnienie ||
                "";

              return (
                <article
                  className="karta"
                  key={requestId}
                >
                  {obraz && (
                    <div className="ramka-obrazu">
                      <img
                        src={buildImageUrl(obraz)}
                        alt={nazwa}
                        className="obraz"
                      />
                    </div>
                  )}

                  <h2>Imię: {nazwa}</h2>

                  <p className="opis">
                    <strong>Rasa:</strong> {rasa}
                  </p>

                  <p className="opis">
                    <strong>Opis:</strong> {opis}
                  </p>

                  <p className="uzytkownik">
                    Wniosek od:
                    <strong> {userEmail}</strong>
                  </p>

                  {uzasadnienie && (
                    <div className="blok-uzasadnienia">
                      <h3>Uzasadnienie adopcji</h3>
                      <p>{uzasadnienie}</p>
                    </div>
                  )}

                  <div className="akcje">
                    {status === "pending" ? (
                      <>
                        <button
                          className="przycisk-akceptuj"
                          onClick={() =>
                            zmienStatus(
                              requestId,
                              "approved"
                            )
                          }
                        >
                          Zaakceptuj
                        </button>

                        <button
                          className="przycisk-odrzuc"
                          onClick={() =>
                            zmienStatus(
                              requestId,
                              "rejected"
                            )
                          }
                        >
                          Odrzuć
                        </button>
                      </>
                    ) : (
                      <div className={`status status-${status}`}>
                        {pobierzTekstStatusu(status)}
                      </div>
                    )}
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