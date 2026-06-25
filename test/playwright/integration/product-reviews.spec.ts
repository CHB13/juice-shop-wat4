import { expect, test, type APIRequestContext } from '@playwright/test'

type LoginResponse = {
  authentication: {
    token: string
    bid: number
  }
}

// returns token + basket id for Jim's session
async function loginAsJim(request: APIRequestContext) {
  const response = await request.post('/rest/user/login', {
    data: {
      email: 'jim@juice-sh.op',
      password: 'ncc-1701'
    }
  })

  expect(response.status()).toBe(200)
  const payload = await response.json() as LoginResponse
  return payload.authentication
}

// bearer token header required by the PATCH endpoint
function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'content-type': 'application/json'
  }
}

// random suffix prevents collisions when tests run in parallel
function uniqueMessage(base: string) {
  return `${base} [${Math.random().toString(36).slice(2, 9)}]`
}

// PUT /rest/products/:id/reviews — no auth required
async function addNewReview(request: APIRequestContext, productId: number, message: string, author: string) {
  return request.put(`/rest/products/${productId}/reviews`, {
    data: { message, author }
  })
}

test.describe('/rest/products/:id/reviews', () => {
  test('submits a review for a product and verifies it appears in the review list', async ({ request }) => {
    const message = uniqueMessage('Great apple juice!')

    const putResponse = await addNewReview(request, 1, message, 'jim@juice-sh.op')

    expect(putResponse.status()).toBe(201)

    const getResponse = await request.get('/rest/products/1/reviews')

    expect(getResponse.status()).toBe(200)
    const reviews = await getResponse.json() as { data: Array<{ message: string, author: string }> }
    expect(reviews.data.some((r) => r.message === message && r.author === 'jim@juice-sh.op')).toBe(true)
  })

  test('edits a previously submitted review as an authenticated user', async ({ request }) => {
    const { token } = await loginAsJim(request)
    const originalMessage = uniqueMessage('Good product.')
    const updatedMessage = uniqueMessage('Actually, fantastic apple juice!')

    await addNewReview(request, 1, originalMessage, 'jim@juice-sh.op')

    // get the id of the created request so that i can be edited
    const listResponse = await request.get('/rest/products/1/reviews')
    const list = await listResponse.json() as { data: Array<{ _id: string, message: string }> }
    const reviewId = list.data.find((r) => r.message === originalMessage)?._id
    expect(reviewId).toBeDefined()

    const patchResponse = await request.patch('/rest/products/reviews', {
      headers: authHeaders(token),
      data: {
        id: reviewId,
        message: updatedMessage
      }
    })

    expect(patchResponse.status()).toBe(200)
    const patched = await patchResponse.json() as { modified: number, updated: Array<{ message: string }> }
    expect(patched.modified).toBeGreaterThanOrEqual(1)
    expect(patched.updated.some((r) => r.message === updatedMessage)).toBe(true)
  })

  test('rejects editing a review without authentication', async ({ request }) => {
    const message = uniqueMessage('Unauthenticated review.')

    await addNewReview(request, 1, message, 'anonymous')

    // resolve the id of the review so that an edit can be tries without the auth headers
    const listResponse = await request.get('/rest/products/1/reviews')
    const list = await listResponse.json() as { data: Array<{ _id: string, message: string }> }
    const reviewId = list.data.find((r) => r.message === message)?._id
    expect(reviewId).toBeDefined()

    // PATCH without Authorization header must be rejected
    const patchResponse = await request.patch('/rest/products/reviews', {
      data: {
        id: reviewId,
        message: 'Should not be allowed.'
      }
    })

    expect(patchResponse.status()).toBe(401)
  })
})
