import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { pobierzKoty } from "../../fetches/pobierzKoty";
import "./kotyZApi.css";

export default function KotyZApi() {
  const [koty, ustawKoty] = useState([]);
  const [ladowanie, ustawLadowanie] = useState(true);
  const [blad, ustawBlad] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function pobierzDaneKotow() {
      try {
        const dane = await pobierzKoty();
        ustawKoty(Array.isArray(dane) ? dane : []);
      } catch (error) {
        ustawBlad(error.message || "Nie udało się pobrać kotów z API.");
      } finally {
        ustawLadowanie(false);
      }
    }

    pobierzDaneKotow();
  }, []);

  return (
    <section className="koty-api-sekcja">
      <h2 className="koty-api-tytul">Nie znalazłeś idealnego pupila?</h2>
      <p className="koty-api-opis">
        Sprawdź inne koty, które mogą Ci się spodobać.
      </p>

      {ladowanie && (
        <p className="koty-api-komunikat">Ładowanie kotów...</p>
      )}

      {!ladowanie && blad && (
        <p className="koty-api-komunikat blad">Błąd: {blad}</p>
      )}

      {!ladowanie && !blad && koty.length === 0 && (
        <p className="koty-api-komunikat">Brak danych o kotach.</p>
      )}

      <div className="lista-kotow-api">
        {koty.map((kot) => {
          const rasa = kot.breeds?.[0];

          return (
            <article className="karta-kota-api" key={kot.id}>
              <div className="ramka-obrazu-kota-api">
                <img
                  className="obraz-kota-api"
                  src={kot.url}
                  alt={rasa?.name || "Kot"}
                />
              </div>

              <div className="znacznik-api">Inspiracja</div>

              <h3 className="nazwa-kota-api">
                {rasa?.name || "Kot bez przypisanej rasy"}
              </h3>

              <p className="opis-kota-api">
                {rasa?.temperament || "Brak dodatkowego opisu temperamentu."}
              </p>
              
                <div className="akcje-kota-api">
                <button
                    className="przycisk-inspiracja"
                    onClick={() => {
                    const linkDocelowy =
                        rasa?.wikipedia_url ||
                        rasa?.cfa_url ||
                        rasa?.vetstreet_url ||
                        "https://thecatapi.com/";

                    window.open(linkDocelowy, "_blank");
                    }}
                >
                    Zobacz szczegóły
                </button>
                </div>
              
            </article>
          );
        })}
      </div>
    </section>
  );
}