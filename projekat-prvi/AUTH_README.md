# Login i Register Sistem

## Opis
Dodat je kompletan login i register sistem u projekat-prvi koji koristi **Local Storage** kao bazu podataka.

## Funkcionalnosti

### Registracija (register.html)
- Korisnici mogu da se registruju sa imenom, emailom i lozinkom
- Lozinka mora imati najmanje 6 karaktera
- Sistem proverava da li email već postoji
- Podaci se čuvaju u Local Storage

### Login (login.html)
- Korisnici mogu da se prijave sa emailom i lozinkom
- Sistem proverava kredencijale iz Local Storage
- Posle uspešne prijave, **automatski se redirektuje na Angular projekat** (http://localhost:4200)

### Angular Projekat
- Prikazuje informacije o ulogovanom korisniku (ime i email)
- Ima dugme za odjavu koje vraća korisnika na login stranicu
- Informacije o korisniku se čitaju iz Local Storage

## Kako testirati

1. **Pokreni projekat-prvi** (npr. sa Live Server ili bilo kojim web serverom)
2. **Pokreni Angular projekat**:
   ```bash
   cd ipi-stranica
   ng serve
   ```
3. Otvori **register.html** i kreiraj nalog
4. Prijavi se na **login.html**
5. Automatski ćeš biti preusmeren na Angular projekat
6. Angular projekat će prikazati tvoje ime i email
7. Možeš se odjaviti klikom na "Odjavi se"

## Linkovi u navigaciji
Dodati su novi linkovi u navigaciju svih stranica:
- **Login** - vodi na login stranicu
- **Registracija** - vodi na register stranicu

## Tehnička implementacija

### Local Storage struktura
```javascript
// Lista svih korisnika
users: [
  {
    id: 1234567890,
    name: "Ime Prezime",
    email: "email@example.com",
    password: "lozinka123",
    createdAt: "2025-12-29T..."
  }
]

// Trenutno ulogovani korisnik
currentUser: {
  id: 1234567890,
  name: "Ime Prezime",
  email: "email@example.com",
  loginTime: "2025-12-29T..."
}
```

### Fajlovi
- `login.html` - Stranica za prijavu
- `register.html` - Stranica za registraciju
- `css/auth.css` - Stilovi za autentifikaciju
- `js/auth.js` - JavaScript logika za Local Storage

## Napomena
⚠️ **VAŽNO**: Ovo je demo verzija. U produkcijskoj aplikaciji:
- Lozinke bi trebalo heširovati
- Koristiti pravu bazu podataka
- Implementirati bezbednosne mere (CSRF tokeni, HTTPS, itd.)
