import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 20,
  iterations: 200,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200']
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const queries = ['apple', 'juice', 'raspberry', 'banana', 'organic', 'chocolate']

export default function () {
  const q = queries[Math.floor(Math.random() * queries.length)]
  const res = http.get(`${BASE_URL}/rest/products/search?q=${encodeURIComponent(q)}`)

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is json array or object': (r) => {
      try {
        const p = JSON.parse(r.body)
        return Array.isArray(p) || (typeof p === 'object')
      } catch (e) {
        return false
      }
    }
  })

  // small think time to resemble user pacing
  sleep(Math.random() * 2)
}
