# Token Sharing - Projekat Prvi i Angular

## Šta je urađeno

Implementiran je sistem za deljenje autentifikacionog tokena (korisničkih podataka) između "projekat-prvi" (vanilla JS) i Angular projekta.

### Ključne izmene:

1. **AuthService** (`src/app/services/auth.service.ts`)
   - Centralizovan servis za upravljanje autentifikacijom
   - Koristi RxJS BehaviorSubject za reaktivno praćenje korisničkog stanja
   - Automatski detektuje promene u localStorage (kada se korisnik prijavi iz projekat-prvi)
   - Omogućava deljenje tokena između oba projekta

2. **Projekat-Prvi Login** (`projekat-prvi/js/auth.js`)
   - Nakon uspešnog login-a, čuva korisnika u `localStorage` pod ključem `currentUser`
   - Postavlja `sessionStorage.justLoggedIn = 'true'` za detekciju novog login-a
   - Preusmerava na Angular početnu stranicu (`/`) umesto direktno na profil
   - Dodati console.log poruke za debugging

3. **Header Komponenta** (`src/app/components/header/header.ts`)
   - Koristi AuthService za praćenje korisničkog stanja
   - Automatski detektuje kada se korisnik prijavi iz projekat-prvi
   - Prikazuje ime korisnika i link ka profilu
   - Nakon detekcije login-a, preusmerava na `/view-profile`

4. **ViewProfile Komponenta** (`src/app/pages/view-profile/view-profile.ts`)
   - Koristi AuthService za dobijanje podataka o korisniku
   - Ako korisnik nije prijavljen, preusmerava na `projekat-prvi/login.html`

5. **Login Komponenta** (`src/app/pages/login/login.ts`)
   - Ažurirana da koristi AuthService za login
   - Omogućava login i iz Angular-a ako je potrebno

## Kako funkcioniše:

1. Korisnik se prijavljuje kroz `projekat-prvi/login.html`
2. Nakon uspešne prijave, podaci se čuvaju u `localStorage.currentUser`
3. Korisnik se preusmerava na Angular početnu stranicu
4. AuthService u Angular-u detektuje korisnika iz localStorage
5. Header automatski detektuje `sessionStorage.justLoggedIn` flag
6. Korisnik se automatski preusmerava na `/view-profile`
7. ViewProfile komponenta prikazuje profil prijavljenog korisnika

## Token format:

```json
{
  "id": 1234567890,
  "name": "Ime Korisnika",
  "email": "email@example.com",
  "loginTime": "2025-12-30T10:30:00.000Z"
}
```

## Testiranje:

1. Startuj aplikaciju: `npm start`
2. Otvori browser na `http://localhost:4200`
3. Idi na `/projekat-prvi/login.html` ili klikni "Login" u header-u
4. Prijavi se sa postojećim kredencijalima
5. Nakon login-a, biće automatski preusmeravanja na Angular home, zatim na profil
6. Proveri da li se ime korisnika prikazuje u header-u
7. Otvori Developer Console (F12) da vidiš debug poruke

## Debug poruke:

Otvori Browser Console (F12) i gledaj poruke:
- "User logged in (projekat-prvi): {...}" - login iz projekat-prvi
- "localStorage after login: {...}" - potvrda čuvanja u storage
- "Header: User state changed: {...}" - Angular header detektuje korisnika
- "User just logged in, redirecting to profile" - automatska redirekcija
- "User profile loaded: {...}" - profil uspešno učitan

## Napomene:

- Oba projekta moraju biti na istom origin-u (što jeste slučaj jer je projekat-prvi build asset)
- Token se čuva u localStorage i deli između svih stranica na istom origin-u
- Za produkciju, implementirati pravu JWT autentifikaciju sa backend-om
- Lozinke trenutno nisu hash-ovane (samo za development!)
