# WAT4 Projektbericht — Web Application Testing

## Genutzte KI-Werkzeuge

- **GitHub Copilot** — Ideen für Testfälle, Hilfe bei der Playwright-Konfiguration
- **Claude (Anthropic)** — Dokumentation und Präsentation

---

## 1. Anwendungsübersicht

Als Testobjekt wurde **OWASP Juice Shop** gewählt — eine absichtlich verwundbare Webanwendung, die für Security-Training und CTF-Wettbewerbe entwickelt wurde. Sie simuliert einen E-Commerce-Shop mit vollständigem Frontend (Angular), REST-API (Express/Node.js) und Datenbank (SQLite).

Der Grund für die Wahl ist, dass Juice Shop eine realistische Anwendung mit vielen verschiedenen Endpunkten und UI-Flows bietet. Das macht es einfach, auf allen Ebenen der Testpyramide sinnvolle Tests zu schreiben — von einfachen Unit Tests für Hilfsfunktionen bis hin zu E2E-Tests, die echte Nutzerflows abbilden.

Das Repository wurde geforkt unter: `juice-shop-wat4`

---

## 2. Test Setup

### Frameworks

Für die Tests werden zwei Frameworks eingesetzt:

**Playwright** wird für Unit-, Integration- und E2E-Tests verwendet. Der Vorteil ist, dass man mit einem einzigen Framework alle drei Ebenen abdecken kann — Unit Tests laufen ohne Browser, Integration Tests über die API, und E2E Tests im echten Browser. Die Tests sind in TypeScript geschrieben.

**k6** (von Grafana Labs) wird für den Load Test verwendet. Die Skripte sind in JavaScript, und k6 bietet gute eingebaute Metriken und Thresholds.

### Verzeichnisstruktur

```
test/
├── playwright/
│   ├── unit/           → security.spec.ts, utils.spec.ts
│   ├── integration/    → basket-items.spec.ts, product-reviews.spec.ts
│   └── e2e/            → cart.spec.ts, login.spec.ts
└── load/
    └── k6/             → products-search.js, place-order.js
```

### Ausführung

```bash
# Playwright Tests (Unit + Integration + E2E)
npx playwright test

# k6 Load Test (Anwendung muss laufen)
npm run test:product-search:k6
```

Playwright startet die Anwendung automatisch über die `webServer`-Konfiguration in `playwright.config.ts`. Der Load Test muss manuell nach dem Start der Anwendung ausgeführt werden.

### Test Isolation

Ein wichtiger Punkt war, die Tests voneinander unabhängig zu halten:

- **Unit Tests** importieren direkt TypeScript-Module, keine externen Abhängigkeiten.
- **Integration Tests** laufen mit `test.describe.serial`, weil sie auf denselben Basket zugreifen und sequenziell aufeinander aufbauen.
- **E2E Tests** setzen Cookie-Consent und Welcome-Banner vor jedem Test per Cookie-Seeding, damit die Tests nicht durch UI-Dialoge gestört werden.
- **Load Tests** sind weitgehend zustandslos — `products-search.js` sendet unabhängige GET-Requests, `place-order.js` loggt sich je Test neu ein und führt einen vollständigen Checkout-Flow durch.

---

## 3. Tests

### 3.1 Unit Tests (40)

#### security.spec.ts (5 Tests)

**Datei:** `test/playwright/unit/security.spec.ts`

Getestet wird das Modul `lib/insecurity.ts`, das zentrale Sicherheitsfunktionen enthält (Coupons, JWT, Sanitization). Diese Funktionen sind kritisch für die Authentifizierung und Datensicherheit der Anwendung.

| # | Test | Kurzbeschreibung |
|---|------|-----------------|
| 1 | Coupon Round-Trip | Generierter Coupon kann wieder korrekt dekodiert werden |
| 2 | Abgelaufener Coupon | Coupon von 2001 wird als ungültig abgewiesen |
| 3 | JWT Signierung | Frisch signiertes Token besteht die Verifikation |
| 4 | Manipuliertes JWT | Token mit geändertem letzten Zeichen wird abgelehnt |
| 5 | XSS Sanitization | Script-Tags werden entfernt, sicherer HTML-Content bleibt |

#### utils.spec.ts (35 Tests)

**Datei:** `test/playwright/unit/utils.spec.ts`

Getestet wird das Modul `lib/utils.ts`, das viele kleinere Hilfsfunktionen enthält, die quer durch die Anwendung genutzt werden. Da diese Funktionen keine externen Abhängigkeiten haben, eignen sie sich ideal für Unit Tests.

| Funktionsgruppe | Tests | Was wird geprüft |
|----------------|-------|-----------------|
| `startsWith` / `endsWith` / `contains` | 9 | String-Präfix, -Suffix und Enthält-Prüfungen inkl. Edge Cases (leerer String, falsy) |
| `unquote` | 3 | Entfernt doppelte Anführungszeichen; lässt Strings ohne bzw. mit nur einem Quote unverändert |
| `isUrl` | 3 | Erkennt http/https URLs, lehnt Nicht-URLs ab |
| `trunc` | 3 | Kürzt Strings, hängt `...` an, entfernt Newlines vorher |
| `extractFilename` | 2 | Extrahiert Dateinamen aus URLs, inkl. Query-Parameter-Stripping |
| `toISO8601` / `toMMMYY` | 4 | Datumsformatierung (`2024-01-05`, `JAN24`) mit Zero-Padding |
| `toSimpleIpAddress` | 3 | Konvertiert IPv6-mapped IPv4 (`::ffff:...`) und Loopback (`::1`) |
| `getErrorMessage` | 2 | Gibt `.message` aus Error-Instanzen zurück, stringifiziert sonstige Werte |
| `queryResultToJson` | 2 | Wrapping mit `status: success` (Standard) oder benutzerdefiniertem Status |
| `matchesSystemIniFile` / `matchesEtcPasswdFile` | 4 | Erkennt charakteristische Muster von system.ini bzw. /etc/passwd |

### 3.2 Integration Tests (6)

#### basket-items.spec.ts (3 Tests)

**Datei:** `test/playwright/integration/basket-items.spec.ts`

Die Tests prüfen die `/api/BasketItems`-Endpunkte über echte HTTP-Requests. Dafür wird Playwrights `APIRequestContext` verwendet, der sich zuerst als Testnutzer `jim@juice-sh.op` einloggt und dann CRUD-Operationen auf dem Basket durchführt.

| # | Test | Kurzbeschreibung |
|---|------|-----------------|
| 1 | Artikel hinzufügen | POST erstellt Basket-Item, GET bestätigt den Eintrag |
| 2 | Artikel entfernen | DELETE entfernt Item, GET gibt danach 404 zurück |
| 3 | Menge aktualisieren | PUT ändert Menge auf 5, Response enthält neuen Wert |

#### product-reviews.spec.ts (3 Tests)

**Datei:** `test/playwright/integration/product-reviews.spec.ts`

Getestet wird die Produkt-Review-API (`/rest/products/:id/reviews`). Diese Tests prüfen auch einen Sicherheitsaspekt: das Bearbeiten von Reviews ohne Authentifizierung muss mit 401 abgewiesen werden.

| # | Test | Kurzbeschreibung |
|---|------|-----------------|
| 1 | Review einreichen | PUT erstellt Review, GET bestätigt Eintrag in der Liste |
| 2 | Review bearbeiten (authentifiziert) | PATCH ändert Review-Text, Response enthält aktualisierten Inhalt |
| 3 | Review bearbeiten ohne Auth | PATCH ohne Token → HTTP 401 (Autorisierungsfehler) |

### 3.3 End-to-End Tests (4)

Die E2E-Tests laufen im Firefox-Browser und testen vollständige Nutzerflows über das Angular-Frontend. Cookie-Seeding sorgt dafür, dass Consent-Dialoge den Test nicht unterbrechen.

#### cart.spec.ts (2 Tests)

**Datei:** `test/playwright/e2e/cart.spec.ts`

| # | Test | Kurzbeschreibung |
|---|------|-----------------|
| 1 | Shopping Cart Flow | Produkt suchen → 2× in Basket → Badge zeigt 2 → Basket öffnen → Inhalt & Preis prüfen |
| 2 | Artikel aus Basket entfernen | Produkt hinzufügen → Basket öffnen → Löschen-Button → Tabelle leer, Badge zeigt 0 |

Der zweite Test stellt sicher, dass das Entfernen eines Artikels nicht nur im Backend funktioniert (das deckt bereits der Integration Test ab), sondern auch korrekt im UI reflektiert wird — d.h. die Tabellenzeile verschwindet und der Counter zurückgesetzt wird.

#### login.spec.ts (2 Tests)

**Datei:** `test/playwright/e2e/login.spec.ts`

| # | Test | Kurzbeschreibung |
|---|------|-----------------|
| 3 | Login mit gültigen Credentials | Formular ausfüllen → Login → URL wechselt, Account-Button sichtbar |
| 4 | Login mit falschem Passwort | Falsches Passwort → Fehlermeldung "Invalid email or password" erscheint |

Der zweite Login-Test ist wichtig, weil er sicherstellt, dass die Anwendung bei falschen Credentials eine verständliche Fehlermeldung im UI anzeigt — und nicht etwa abstürzt oder keinen Hinweis gibt.

### 3.4 Load Tests (2)

#### products-search.js

**Datei:** `test/load/k6/products-search.js`

Prüft den Produkt-Such-Endpunkt (`/rest/products/search`) unter gleichzeitiger Last. Die Suche ist der meistgenutzte Endpunkt in einem E-Commerce-Shop, daher ist es wichtig, dass er auch unter Last performant bleibt.

**Konfiguration:**
- 20 virtuelle Nutzer (VUs), 200 Requests gesamt
- Zufällige Keywords: apple, juice, raspberry, banana, organic, chocolate
- Think-Time: 0–2 Sekunden (simuliert echtes Nutzerverhalten)
- Thresholds: p(95) < 1.200 ms, Fehlerrate < 1%

#### place-order.js

**Datei:** `test/load/k6/place-order.js`

Testet den vollständigen Checkout-Flow unter Last: Login → Artikel in Warenkorb legen → Bestellung aufgeben. Damit wird nicht nur ein einzelner Endpunkt getestet, sondern eine zusammenhängende User Journey, die mehrere API-Calls umfasst.

| # | Schritt | API-Call |
|---|---------|----------|
| 1 | Login | POST `/rest/user/login` → Token + Basket-ID |
| 2 | Artikel 1 hinzufügen | POST `/api/BasketItems` (ProductId: 1) |
| 3 | Artikel 2 hinzufügen | POST `/api/BasketItems` (ProductId: 2) |
| 4 | Bestellung aufgeben | POST `/rest/basket/:id/checkout` → OrderConfirmation |

**Konfiguration:**
- 10 virtuelle Nutzer (VUs), 50 Iterationen gesamt
- Jede VU führt den kompletten Flow eigenständig durch (Login, Basket, Checkout)
- Think-Time: 0–2 Sekunden zwischen Iterationen
- Threshold: p(95) < 2.000 ms

---

## 4. Load Test Ergebnisse

### products-search.js

```
THRESHOLDS:
  http_req_duration ✓ p(95)<1200  →  p(95)=351.58ms
  http_req_failed   ✓ rate<0.01   →  rate=0.00%
```

Beide Thresholds wurden deutlich unterschritten. Der p(95)-Wert von 351 ms liegt 71% unter dem Limit von 1.200 ms, und es gab keine einzige fehlgeschlagene Anfrage. Die Anwendung verhält sich unter der getesteten Last (20 VUs) stabil und performant.

### place-order.js

Der Checkout-Flow testet mehrere Endpunkte hintereinander (Login → Basket → Checkout), was naturgemäß höhere Latenzen erzeugt als ein einzelner GET-Request. Das Threshold wurde daher mit p(95) < 2.000 ms großzügiger gewählt, um die Summe aller API-Calls zu berücksichtigen. Der Test läuft mit 10 VUs und 50 Iterationen und prüft über `check()`-Assertions, ob jeder Schritt im Flow erfolgreich war (HTTP 200 + OrderConfirmation in der Response).

---

## 5. CI/CD Pipeline

**Datei:** `.github/workflows/playwright.yml`

Über GitHub Actions werden alle Playwright Tests automatisch bei jedem Push und Pull Request auf `main` ausgeführt. Die Pipeline installiert die Abhängigkeiten, lädt die Playwright-Browser herunter, führt die Tests aus und speichert den HTML-Report als Artifact (30 Tage).

Der k6 Load Test ist nicht Teil der Pipeline, da er eine laufende Anwendungsinstanz und eine separate k6-Installation voraussetzt.
