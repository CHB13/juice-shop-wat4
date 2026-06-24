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
│   ├── unit/           → security.spec.ts
│   ├── integration/    → basket-items.spec.ts
│   └── e2e/            → cart.spec.ts
└── load/
    └── k6/             → products-search.js
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
- **Load Tests** sind zustandslos — jede VU sendet unabhängige GET-Requests.

---

## 3. Tests

### 3.1 Unit Tests (5)

**Datei:** `test/playwright/unit/security.spec.ts`

Getestet wird das Modul `lib/insecurity.ts`, das zentrale Sicherheitsfunktionen enthält (Coupons, JWT, Sanitization). Diese Funktionen sind kritisch für die Authentifizierung und Datensicherheit der Anwendung.

| # | Test | Kurzbeschreibung |
|---|------|-----------------|
| 1 | Coupon Round-Trip | Generierter Coupon kann wieder korrekt dekodiert werden |
| 2 | Abgelaufener Coupon | Coupon von 2001 wird als ungültig abgewiesen |
| 3 | JWT Signierung | Frisch signiertes Token besteht die Verifikation |
| 4 | Manipuliertes JWT | Token mit geändertem letzten Zeichen wird abgelehnt |
| 5 | XSS Sanitization | Script-Tags werden entfernt, sicherer HTML-Content bleibt |

### 3.2 Integration Tests (3)

**Datei:** `test/playwright/integration/basket-items.spec.ts`

Die Tests prüfen die `/api/BasketItems`-Endpunkte über echte HTTP-Requests. Dafür wird Playwrights `APIRequestContext` verwendet, der sich zuerst als Testnutzer `jim@juice-sh.op` einloggt und dann CRUD-Operationen auf dem Basket durchführt.

| # | Test | Kurzbeschreibung |
|---|------|-----------------|
| 1 | Artikel hinzufügen | POST erstellt Basket-Item, GET bestätigt den Eintrag |
| 2 | Artikel entfernen | DELETE entfernt Item, GET gibt danach 404 zurück |
| 3 | Menge aktualisieren | PUT ändert Menge auf 5, Response enthält neuen Wert |

### 3.3 End-to-End Tests (2)

**Datei:** `test/playwright/e2e/cart.spec.ts`

Die E2E-Tests laufen im Firefox-Browser und testen vollständige Nutzerflows über das Angular-Frontend. Cookie-Seeding sorgt dafür, dass Consent-Dialoge den Test nicht unterbrechen.

| # | Test | Kurzbeschreibung |
|---|------|-----------------|
| 1 | Shopping Cart Flow | Produkt suchen → 2× in Basket → Badge zeigt 2 → Basket öffnen → Inhalt & Preis prüfen |
| 2 | Artikel aus Basket entfernen | Produkt hinzufügen → Basket öffnen → Löschen-Button → Tabelle leer, Badge zeigt 0 |

Der zweite Test stellt sicher, dass das Entfernen eines Artikels nicht nur im Backend funktioniert (das deckt bereits der Integration Test ab), sondern auch korrekt im UI reflektiert wird — d.h. die Tabellenzeile verschwindet und der Counter zurückgesetzt wird.

### 3.4 Load Test (1)

**Datei:** `test/load/k6/products-search.js`

Der Load Test prüft den Produkt-Such-Endpunkt (`/rest/products/search`) unter gleichzeitiger Last. Die Suche ist der meistgenutzte Endpunkt in einem E-Commerce-Shop, daher ist es wichtig, dass er auch unter Last performant bleibt.

**Konfiguration:**
- 20 virtuelle Nutzer (VUs), 200 Requests gesamt
- Zufällige Keywords: apple, juice, raspberry, banana, organic, chocolate
- Think-Time: 0–2 Sekunden (simuliert echtes Nutzerverhalten)
- Thresholds: p(95) < 1.200 ms, Fehlerrate < 1%

---

## 4. Load Test Ergebnisse

```
THRESHOLDS:
  http_req_duration ✓ p(95)<1200  →  p(95)=351.58ms
  http_req_failed   ✓ rate<0.01   →  rate=0.00%
```

Beide Thresholds wurden deutlich unterschritten. Der p(95)-Wert von 351 ms liegt 71% unter dem Limit von 1.200 ms, und es gab keine einzige fehlgeschlagene Anfrage. Die Anwendung verhält sich unter der getesteten Last (20 VUs) stabil und performant.

---

## 5. CI/CD Pipeline

**Datei:** `.github/workflows/playwright.yml`

Über GitHub Actions werden alle Playwright Tests automatisch bei jedem Push und Pull Request auf `main` ausgeführt. Die Pipeline installiert die Abhängigkeiten, lädt die Playwright-Browser herunter, führt die Tests aus und speichert den HTML-Report als Artifact (30 Tage).

Der k6 Load Test ist nicht Teil der Pipeline, da er eine laufende Anwendungsinstanz und eine separate k6-Installation voraussetzt.
