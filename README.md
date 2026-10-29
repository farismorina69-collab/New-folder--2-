# Civic KS 🇽🇰

Platformë qytetare në gjuhën shqipe dhe angleze për raportimin dhe ndjekjen e problemeve të infrastrukturës publike në Kosovë. Ndërtuar me React, Vite, Firebase dhe OpenStreetMap.

## Kërkesat

- Node.js LTS (npm përfshihet me instaluesin): https://nodejs.org/
- Një projekt Firebase me Authentication, Firestore dhe Storage të aktivizuar.
- Firebase CLI për rregullat, indekset dhe Hosting: `npm install -g firebase-tools`

## Instalimi lokal

```sh
npm install
npm run dev
```

Hap adresën lokale që paraqet Vite. `.env` duhet plotësuar me konfigurimin e projektit tënd përpara se të përdorësh autentikimin ose të dhënat. Vite lexon variablat vetëm gjatë nisjes; rinise serverin pas ndryshimit të tyre.

Në një kopje të re, krijo `.env` nga shembulli vetëm nëse skedari ende nuk ekziston (mos e mbishkruaj një konfigurim ekzistues):

```powershell
Copy-Item .env.example .env
```

## Konfigurimi i Firebase

1. Krijo projekt në [Firebase Console](https://console.firebase.google.com/).
2. Te **Authentication → Sign-in method**, aktivizo **Email/Password** dhe **Google** (konfiguro email-in e mbështetjes në Firebase për Google sign-in).
3. Te **Authentication → Settings → Authorized domains**, shto domenin lokal/prod të aplikacionit kur nevojitet.
4. Krijo Firestore Database në mënyrën Production.
5. Aktivizo Firebase Storage.
6. Te **Project settings → General → Your apps**, regjistro një aplikacion Web dhe kopjo vlerat e konfigurimit në `.env`.
7. Vendos URL-në e saktë të bucket-it `storageBucket` nga konfigurimi i Firebase (zakonisht `PROJECT_ID.firebasestorage.app` ose vlerë e ngjashme e shfaqur në Console). Mos përdor vlera të sajuara.
8. Publiko rregullat dhe indekset:

```sh
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,storage
```

`.env.example` përmban vetëm emrat e variablave. Firebase Web API key është identifikues i konfigurimit të klientit; siguria varet nga Authentication dhe rregullat e publikuara, jo nga fshehja e tij. Mos vendos kurrë çelësa të Firebase Admin SDK ose kredenciale shërbimi në variabla `VITE_*`.

## Administratorët

Roli admin lexohet nga Firebase custom claim `admin: true`. Nuk ka UI në klient për caktimin e këtij roli. Përdor Firebase Admin SDK në një mjedis të besuar (skript administrimi lokal ose shërbim server-side) dhe mbaji kredencialet jashtë aplikacionit web:

```js
await getAuth().setCustomUserClaims(uid, { admin: true })
```

Pas caktimit, përdoruesi duhet të dalë dhe të kyçet përsëri që token-i i ri të përmbajë claim-in. Ruaj kredencialet Admin SDK jashtë repository-t dhe mos i vendos në `.env` të Vite-it. Raportet dhe status history përditësohen në një Firestore transaction; rregullat lejojnë këto shkrime vetëm për token-a me claim-in e besuar.

## Komandat

```sh
npm run dev       # server zhvillimi
npm run lint      # kontroll statik
npm run build     # build për prodhim
npm run preview   # shërbe build-in lokal
```

## Deploy në Firebase Hosting

```sh
npm run build
firebase deploy --only hosting
```

`firebase.json` rishkruan URL-të SPA te `index.html`. Shto domenin e Hosting te **Authentication → Authorized domains** dhe vendos konfigurimin përkatës në build environment.

## Veçoritë dhe kufizimet

- Shqip/English me zgjedhës të gjuhës, dark/light theme dhe ikona Font Awesome.
- Email/fjalëkalim, hyrje me Google, verifikim email-i, rivendosje fjalëkalimi dhe sinkronizim sesioni.
- Raportime me fotografi (JPG/PNG/WebP, deri 5 MB), status, komunë/kategori dhe koordinata të zgjedhura në hartë.
- Raportime publike, filtra/kërkim në raportimet e fundit të ngarkuara, hartë OpenStreetMap dhe statistika aggregate nga Firestore.
- Deri në tetë karta me fotografi shfaqen në galerinë publike; shembujt ilustrues etiketohen qartë dhe nuk ruhen si raportime reale.
- Panel personal me statistika aggregate dhe ngarkim me faqe, profil, konfirmime unike për përdorues dhe histori statusi.
- Ndryshimi i statusit dhe historisë së tij kufizohet në custom claim admin.
- Komentet, njoftimet email/push, moderimi i avancuar dhe deduplikimi automatik nuk janë implementuar. Nuk paraqiten si funksione aktive.
- Kërkimi dhe filtrat në faqen e raportimeve veprojnë mbi deri në 60 raportimet më të reja të ngarkuara nga klienti; nuk janë kërkim full-text në tërë bazën e të dhënave.
- Statistikat janë aggregate count queries reale, por rifreskohen kur faqja ngarkohet.
- Kontakti `hello@example.com` është adresë demonstrimi; zëvendësoje me kontakt real përpara publikimit.
- Tile-at përdorin serverët publikë të OpenStreetMap; respekto politikat e tile usage dhe mos i përdor për trafik të rëndë pa një ofrues të përshtatshëm.
- Zgjedhja e vendndodhjes është opsionale dhe vetëm pika e klikuar publikohet; aplikacioni nuk lexon GPS të përdoruesit.

## Modeli i të dhënave

- `users/{uid}`: emri publik, email-i, koha e krijimit dhe komuna e preferuar. Lexohet vetëm nga pronari.
- `reports/{reportId}`: përmbajtja publike, komunë/kategori, koordinata opsionale, fotografi, autor UID, status, numër konfirmimesh, timestamp-e dhe treguesi i historikut të fundit.
- `reports/{reportId}/confirmations/{uid}`: një konfirmim për UID; transaksioni rrit numrin e raportit atomikisht.
- `reports/{reportId}/statusHistory/{historyId}`: gjendja fillestare dhe përditësime publike të krijuara atomikisht me raportin ose ndryshimin admin.

Rregullat kufizojnë fushat, gjatësitë, statuset, ownership-in, konfirmimet dhe ngarkimet. Gjithsesi, ky projekt nuk është audituar për prodhim: konfiguro domain-et, verifiko rules në Emulator Suite dhe bëj shqyrtim operacional/privatësie përpara nisjes publike.
