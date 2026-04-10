import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Komponenty/Navbar/navbar";
import { expandLink } from "../../fetches/expandLink";
import { buildImageUrl } from "../../fetches/buildImageUrl";
import "./panelZarzadzania.css";

export default function PanelZarzadzania() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const rola = localStorage.getItem("rola");
  const czyAdmin = rola === "ADMIN";
  const czyModerator = rola === "MODERATOR";
  const czyStaff = czyAdmin || czyModerator;

  const [aktywnaSekcja, ustawAktywnaSekcja] = useState("wnioski");

  const [wnioski, ustawWnioski] = useState([]);
  const [ogloszenia, ustawOgloszenia] = useState([]);
  const [uzytkownicy, ustawUzytkownicy] = useState([]);

  const [ladowanieWnioskow, ustawLadowanieWnioskow] = useState(true);
  const [ladowanieOgloszen, ustawLadowanieOgloszen] = useState(true);
  const [ladowanieUzytkownikow, ustawLadowanieUzytkownikow] = useState(true);

  const [bladWnioskow, ustawBladWnioskow] = useState("");
  const [bladOgloszen, ustawBladOgloszen] = useState("");
  const [bladUzytkownikow, ustawBladUzytkownikow] = useState("");

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

  async function pobierzWnioski() {
    try {
      ustawBladWnioskow("");

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
      ustawBladWnioskow(bladPobierania.message);
    } finally {
      ustawLadowanieWnioskow(false);
    }
  }

  async function pobierzOgloszenia() {
    try {
      ustawBladOgloszen("");

      const odpowiedz = await fetch(expandLink("/api/animals"));

      if (!odpowiedz.ok) {
        throw new Error(`HTTP ${odpowiedz.status}`);
      }

      const dane = await odpowiedz.json();
      ustawOgloszenia(Array.isArray(dane) ? dane : []);
    } catch (bladPobierania) {
      ustawBladOgloszen(bladPobierania.message);
    } finally {
      ustawLadowanieOgloszen(false);
    }
  }

  async function pobierzUzytkownikow() {
    try {
      ustawBladUzytkownikow("");

      const odpowiedz = await fetch(expandLink("/api/users"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!odpowiedz.ok) {
        throw new Error(`HTTP ${odpowiedz.status}`);
      }

      const dane = await odpowiedz.json();
      ustawUzytkownicy(Array.isArray(dane) ? dane : []);
    } catch (bladPobierania) {
      ustawBladUzytkownikow(bladPobierania.message);
    } finally {
      ustawLadowanieUzytkownikow(false);
    }
  }

  async function zmienStatusWniosku(requestId, status) {
    try {
      const odpowiedz = await fetch(
        expandLink(`/api/adoptions/status/${requestId}`),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
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
      await pobierzOgloszenia();
    } catch (bladZmiany) {
      alert(bladZmiany.message);
    }
  }

  async function usunOgloszenie(animalId, nazwa) {
    const potwierdzenie = window.confirm(
      `Czy na pewno chcesz usunąć ogłoszenie "${nazwa}"?`
    );

    if (!potwierdzenie) return;

    try {
      const odpowiedz = await fetch(expandLink(`/api/animals/${animalId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let dane = null;
      const typ = odpowiedz.headers.get("content-type") || "";

      if (typ.includes("application/json")) {
        dane = await odpowiedz.json();
      }

      if (!odpowiedz.ok) {
        throw new Error(dane?.error || dane?.message || "Nie udało się usunąć ogłoszenia.");
      }

      await pobierzOgloszenia();
    } catch (bladUsuwania) {
      alert(bladUsuwania.message);
    }
  }

  async function zmienRoleUzytkownika(userId, nowaRola) {
    try {
      const odpowiedz = await fetch(expandLink(`/api/users/${userId}/role`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: nowaRola,
        }),
      });

      let dane = null;
      const typ = odpowiedz.headers.get("content-type") || "";

      if (typ.includes("application/json")) {
        dane = await odpowiedz.json();
      }

      if (!odpowiedz.ok) {
        throw new Error(dane?.error || dane?.message || "Nie udało się zmienić roli.");
      }

      await pobierzUzytkownikow();
    } catch (bladZmiany) {
      alert(bladZmiany.message);
    }
  }

  async function usunUzytkownika(userId, email) {
    const potwierdzenie = window.confirm(
      `Czy na pewno chcesz usunąć użytkownika "${email}"?`
    );

    if (!potwierdzenie) return;

    try {
      const odpowiedz = await fetch(expandLink(`/api/users/${userId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let dane = null;
      const typ = odpowiedz.headers.get("content-type") || "";

      if (typ.includes("application/json")) {
        dane = await odpowiedz.json();
      }

      if (!odpowiedz.ok) {
        throw new Error(dane?.error || dane?.message || "Nie udało się usunąć użytkownika.");
      }

      await pobierzUzytkownikow();
    } catch (bladUsuwania) {
      alert(bladUsuwania.message);
    }
  }

  const posortowaniUzytkownicy = useMemo(() => {
    return [...uzytkownicy].sort((a, b) => {
      const emailA = a.email || "";
      const emailB = b.email || "";
      return emailA.localeCompare(emailB);
    });
  }, [uzytkownicy]);

  useEffect(() => {
    if (!czyStaff) {
      navigate("/");
      return;
    }

    pobierzWnioski();
    pobierzOgloszenia();
    pobierzUzytkownikow();
  }, []);

  if (!czyStaff) {
    return null;
  }

  return (
    <>
      <Navbar />

      <main className="panel-zarzadzania">
        <section className="sekcja-panelu">
          <h1 className="panel-tytul">Panel zarządzania</h1>

          <p className="panel-opis">
            Zalogowano jako {czyAdmin ? "administrator" : "moderator"}.
          </p>

          <div className="zakladki-panelu">
            <button
              className={`zakladka ${aktywnaSekcja === "wnioski" ? "aktywna" : ""}`}
              onClick={() => ustawAktywnaSekcja("wnioski")}
            >
              Wnioski
            </button>

            <button
              className={`zakladka ${aktywnaSekcja === "ogloszenia" ? "aktywna" : ""}`}
              onClick={() => ustawAktywnaSekcja("ogloszenia")}
            >
              Ogłoszenia
            </button>

            <button
              className={`zakladka ${aktywnaSekcja === "uzytkownicy" ? "aktywna" : ""}`}
              onClick={() => ustawAktywnaSekcja("uzytkownicy")}
            >
              Użytkownicy
            </button>
          </div>

          {aktywnaSekcja === "wnioski" && (
            <div className="sekcja-zawartosci">
              <h2>Wszystkie wnioski</h2>

              {ladowanieWnioskow && <p>Ładowanie...</p>}
              {!ladowanieWnioskow && bladWnioskow && (
                <p className="blad">Błąd: {bladWnioskow}</p>
              )}
              {!ladowanieWnioskow && !bladWnioskow && wnioski.length === 0 && (
                <p>Brak wniosków.</p>
              )}

              <div className="lista-panelowa">
                {wnioski.map((wniosek) => {
                  const requestId = wniosek.request_id || wniosek.requestId;
                  const zwierze = wniosek.animal || {};
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
                  const status = wniosek.status || "pending";
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
                    <article className="karta-panelowa" key={requestId}>
                      {obraz && (
                        <div className="ramka-obrazu-panel">
                          <img
                            src={buildImageUrl(obraz)}
                            alt={nazwa}
                            className="obraz-panel"
                          />
                        </div>
                      )}

                      <h3>Imię: {nazwa}</h3>
                      <p><strong>Rasa:</strong> {rasa}</p>
                      <p><strong>Opis:</strong> {opis}</p>
                      <p className="meta-panel">
                        Wniosek od: <strong>{userEmail}</strong>
                      </p>

                      {uzasadnienie && (
                        <div className="blok-uzasadnienia-panel">
                          <h4>Uzasadnienie adopcji</h4>
                          <p>{uzasadnienie}</p>
                        </div>
                      )}

                      <div className="akcje-panelowe">
                        {status === "pending" ? (
                          <>
                            <button
                              className="przycisk-akceptuj"
                              onClick={() =>
                                zmienStatusWniosku(requestId, "approved")
                              }
                            >
                              Zaakceptuj
                            </button>

                            <button
                              className="przycisk-odrzuc"
                              onClick={() =>
                                zmienStatusWniosku(requestId, "rejected")
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
            </div>
          )}

          {aktywnaSekcja === "ogloszenia" && (
            <div className="sekcja-zawartosci">
              <h2>Wszystkie ogłoszenia</h2>

              {ladowanieOgloszen && <p>Ładowanie...</p>}
              {!ladowanieOgloszen && bladOgloszen && (
                <p className="blad">Błąd: {bladOgloszen}</p>
              )}
              {!ladowanieOgloszen && !bladOgloszen && ogloszenia.length === 0 && (
                <p>Brak ogłoszeń.</p>
              )}

              <div className="lista-panelowa">
                {ogloszenia.map((zwierze) => {
                  const rasa =
                    zwierze.cat_breed ||
                    zwierze.breed ||
                    "Nie podano";

                  return (
                    <article className="karta-panelowa" key={zwierze.animal_id}>
                    {zwierze.image && (
                      <div className="ramka-obrazu-panel">
                        <img
                          src={buildImageUrl(zwierze.image)}
                          alt={zwierze.name}
                          className="obraz-panel"
                        />
                      </div>
                    )}

                    <h3>Imię: {zwierze.name}</h3>
                    <p><strong>Rasa:</strong> {rasa}</p>
                    <p><strong>Opis:</strong> {zwierze.description}</p>

                    <div className="akcje-panelowe">
                      <button
                        className="przycisk-edytuj"
                        onClick={() =>
                          navigate(`/edytuj-ogloszenie/${zwierze.animal_id}`, {
                            state: { zwierze },
                          })
                        }
                      >
                        Edytuj
                      </button>

                      <button
                        className="przycisk-odrzuc"
                        onClick={() => usunOgloszenie(zwierze.animal_id, zwierze.name)}
                      >
                        Usuń
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            </div>
          )}

          {aktywnaSekcja === "uzytkownicy" && (
            <div className="sekcja-zawartosci">
              <h2>Użytkownicy</h2>

              {ladowanieUzytkownikow && <p>Ładowanie...</p>}
              {!ladowanieUzytkownikow && bladUzytkownikow && (
                <p className="blad">Błąd: {bladUzytkownikow}</p>
              )}
              {!ladowanieUzytkownikow &&
                !bladUzytkownikow &&
                posortowaniUzytkownicy.length === 0 && <p>Brak użytkowników.</p>}

              <div className="lista-uzytkownikow">
                {posortowaniUzytkownicy.map((uzytkownik) => {
                  const userId =
                    uzytkownik.user_id ||
                    uzytkownik.userId ||
                    uzytkownik.id;

                  const email = uzytkownik.email || "Brak emaila";
                  const rolaUzytkownika =
                    uzytkownik.role?.name ||
                    uzytkownik.role ||
                    "NORMAL_USER";

                  return (
                    <article className="karta-uzytkownika" key={userId}>
                      <div className="wiersz-uzytkownika">
                        <span className="etykieta">Email:</span>
                        <span>{email}</span>
                      </div>

                      <div className="wiersz-uzytkownika">
                        <span className="etykieta">Rola:</span>
                        <span>{rolaUzytkownika}</span>
                      </div>

                      {czyAdmin && (
                        <div className="akcje-admina">
                          <select
                            className="select-roli"
                            value={rolaUzytkownika}
                            onChange={(e) =>
                              zmienRoleUzytkownika(userId, e.target.value)
                            }
                          >
                            <option value="NORMAL_USER">NORMAL_USER</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>

                          <button
                            className="przycisk-usun-uzytkownika"
                            onClick={() => usunUzytkownika(userId, email)}
                          >
                            Usuń użytkownika
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}