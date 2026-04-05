import { Link, useNavigate } from "react-router-dom";
import "./navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const zalogowany = !!token;

  function wyloguj() {
    localStorage.removeItem("token");
    localStorage.removeItem("rola");
    localStorage.removeItem("email");
    navigate("/");
    window.location.reload();
  }

  return (
    <header className="navbar">
      <div className="navbar-lewa">
        <Link to="/" className="navbar-logo">
          Adopcja
        </Link>
      </div>

      <nav className="navbar-prawa">
        {!zalogowany ? (
          <>
            <Link to="/logowanie" className="navbar-przycisk">
              Zaloguj się
            </Link>
            <Link
              to="/rejestracja"
              className="navbar-przycisk navbar-przycisk-akcent"
            >
              Zarejestruj się
            </Link>
          </>
        ) : (
          <>
            <Link to="/moje-zgloszenia" className="navbar-przycisk">
              Moje zgłoszenia
            </Link>

            <Link to="/moje-wnioski" className="navbar-przycisk">
              Moje wnioski
            </Link>

            <Link to="/otrzymane-wnioski" className="navbar-przycisk">
              Wnioski do moich ogłoszeń
            </Link>

            <Link
              to="/dodaj-ogloszenie"
              className="navbar-przycisk navbar-przycisk-akcent"
            >
              Dodaj ogłoszenie
            </Link>

            <button
              type="button"
              className="navbar-przycisk navbar-przycisk-wyjdz"
              onClick={wyloguj}
            >
              Wyloguj się
            </button>
          </>
        )}
      </nav>
    </header>
  );
}