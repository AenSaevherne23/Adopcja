import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Strony/Home/home";
import Logowanie from "./Strony/Logowanie/logowanie";
import Rejestracja from "./Strony/Rejestracja/rejestracja";
import DodajOgloszenie from "./Strony/DodajOgloszenie/dodajOgloszenie";
import EdytujOgloszenie from "./Strony/EdytujOgloszenie/edytujOgloszenie";
import MojeWnioski from "./Strony/MojeWnioski/mojeWnioski";
import OtrzymaneWnioski from "./Strony/OtrzymaneWnioski/otrzymaneWnioski";
import MojeZgloszenia from "./Strony/MojeZgloszenia/mojeZgloszenia";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/logowanie" element={<Logowanie />} />
        <Route path="/rejestracja" element={<Rejestracja />} />
        <Route path="/dodaj-ogloszenie" element={<DodajOgloszenie />} />
        <Route path="/edytuj-ogloszenie/:id" element={<EdytujOgloszenie />} />
        <Route path="/moje-wnioski" element={<MojeWnioski />} />
        <Route path="/otrzymane-wnioski" element={<OtrzymaneWnioski />} />
        <Route path="/moje-zgloszenia" element={<MojeZgloszenia />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;