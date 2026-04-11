1. Zainstaluj zależności - npm install
2. Utwórz plik .env w głównym folderze projektu
DATABASE_URL="mysql://root:@localhost:3306/adoptions"
JWT_SECRET=jakis_ciag_znakow
PORT=3000
3. Utwórz bazę w xamppie o nazwie adoptions
4. Wykonaj migracje Prismy - npx prisma migrate dev
5. Załaduj dane startowe (seed) - npx prisma db seed albo tak: npx prisma@6 migrate dev --name init
Seed tworzy domyślne role (ADMIN, MODERATOR, NORMAL_USER) oraz przykładowe konto administratora (admin@schronisko.pl, password123)
6. Nie jestem pewny, ale chyba trzeba utworzyć folder uploads (na zdjęcia). Folder logs powinien utworzyć się sam.
7. Uruchom serwer - npm run dev

ENDPOINTY:

• /api/auth
-POST /api/auth/register — rejestracja, przyjmuje { email, password }
-POST /api/auth/login — logowanie, zwraca { token, user: { email, role } }
• /api/animals
- GET /api/animals — lista wszystkich niezdoptowanych zwierząt, bez autoryzacji
- POST /api/animals — dodaj ogłoszenie, multipart/form-data z polami name, description, image
- PATCH /api/animals/:id — edytuj ogłoszenie, te same pola co POST (wszystkie opcjonalne)
- DELETE /api/animals/:id — usuń ogłoszenie wraz ze zdjęciem

• /api/adoptions
-  POST /api/adoptions/request/:animalId — wyślij prośbę o adopcję danego zwierzaka
- GET /api/adoptions/my-sent-requests — lista prośb które sam wysłałeś
- GET /api/adoptions/my-received-requests — lista prośb o twoje zwierzęta (staff widzi wszystkie)
- PATCH /api/adoptions/status/:requestId — zmień status prośby, przyjmuje { status: "approved" | "rejected" }. 
Przy approved automatycznie oznacza zwierzaka jako adoptowanego i odrzuca pozostałe prośby dla tego zwierzaka

• /api/users
- GET /api/users — lista wszystkich użytkowników (tylko Admin/Moderator)
- GET /api/users/me — twój profil z ogłoszeniami i prośbami o adopcję
- DELETE /api/users/:id — usuń użytkownika (tylko Admin)
- PATCH /api/users/:id/role — zmień rolę użytkownika, przyjmuje { role: "ADMIN" | "MODERATOR" | "NORMAL_USER" } (tylko Admin)
