# Report

## Application Overview

OWASP Juice Shop is a deliberately vulnerable web application for security training. It exposes a realistic e-commerce interface with authentication, API, and browser flows that are suitable for functional testing, security exercises, and load testing.

## Tests

We use Playwright for Unit/Integration/E2E tests and k6 for load testing.

### Unit Tests

- coupon generation and decoding
- expired coupon rejection
- JWT signing and verification
- tampered JWT rejection
- secure sanitization of script input

### Integration Tests

- adding a product to the basket via API creates a basket item
- removing a basket item via API deletes it from the basket
- quntity change of item in the basket

### End-to-End Tests

- fill the shopping cart from the UI and verify its contents

### Load Test

The load test tests the search functionality with multiple requests and provides a summary.

Summary:

THRESHOLDS:

http_req_duration
✓ 'p(95)<1200' p(95)=351.58ms

http_req_failed
✓ 'rate<0.01' rate=0.00%


## Execution

### Playwright Tests

```bash
npx playwright test
```

### k6 Load Test

A k6 script is provided at `test/load/k6/product-search.js`.

Run locally (requires `k6` installed):

```bash
npm run test:product-search:k6
```

The application needs to be already running for this.

## Pipeline

Github Actions is utilized for automated test execution on push and pull requests.

## AI-Tools
Github Copilot was used to gather ideas on what to test and to help with playwright configuration.