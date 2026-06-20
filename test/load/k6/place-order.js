import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,
  iterations: 50,
  thresholds: {
    // http_req_failed: ['rate<0.02'], // http errors should be less than 2%
    http_req_duration: ['p(95)<2000']
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

export default function () {
  // 1. Login to obtain a token and the user's basket id
  const loginRes = http.post(
    `${BASE_URL}/rest/user/login`,
    JSON.stringify({ email: 'jim@juice-sh.op', password: 'ncc-1701' }),
    { headers: JSON_HEADERS }
  )

  check(loginRes, { 'login succeeded': (r) => r.status === 200 })
  if (loginRes.status !== 200) return

  const { token, bid } = JSON.parse(loginRes.body).authentication
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // 2. Add a product to the basket
  const addRes = http.post(
    `${BASE_URL}/api/BasketItems`,
    JSON.stringify({ BasketId: bid, ProductId: 1, quantity: 1 }),
    { headers: authHeaders }
  )

   check(addRes, { 'item added to basket': (r) => r.status === 200 })

  // Add another product to the basket
  const addRes2 = http.post(
    `${BASE_URL}/api/BasketItems`,
    JSON.stringify({ BasketId: bid, ProductId: 2, quantity: 1 }),
    { headers: authHeaders }
  )

  check(addRes2, { 'second item added to basket': (r) => r.status === 200 })

  // 3. Place the order
  const orderRes = http.post(
    `${BASE_URL}/rest/basket/${bid}/checkout`,
    null,
    { headers: authHeaders }
  )

  check(orderRes, {
    'order placed': (r) => r.status === 200,
    'order confirmation returned': (r) => {
      try {
        return JSON.parse(r.body).orderConfirmation !== undefined
      } catch (e) {
        return false
      }
    }
  })

  // small think time to resemble user pacing
  sleep(Math.random() * 2)
}
