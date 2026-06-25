import { expect, test, type APIRequestContext } from '@playwright/test'

type LoginResponse = {
  authentication: {
    token: string
    bid: number
  }
}

async function loginAsJim (request: APIRequestContext) {
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

function authHeaders (token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'content-type': 'application/json'
  }
}

// run interdependent tests in serial
test.describe.serial('/rest/products/:id/reviews', () => {
  test('submits a review for a product and verifies it appears in the review list', async ({ request }) => {
    const putResponse = await request.put('/rest/products/1/reviews', {
      data: {
        message: 'Great apple juice!',
        author: 'jim@juice-sh.op'
      }
    })

    expect(putResponse.status()).toBe(201)

    const getResponse = await request.get('/rest/products/1/reviews')

    expect(getResponse.status()).toBe(200)
    const reviews = await getResponse.json() as { data: Array<{ message: string, author: string }> }
    expect(reviews.data.some((r) => r.message === 'Great apple juice!' && r.author === 'jim@juice-sh.op')).toBe(true)
  })

  test('edits a previously submitted review as an authenticated user', async ({ request }) => {
    const { token } = await loginAsJim(request)

    await request.put('/rest/products/1/reviews', {
      data: {
        message: 'Good product.',
        author: 'jim@juice-sh.op'
      }
    })

    const listResponse = await request.get('/rest/products/1/reviews')
    const list = await listResponse.json() as { data: Array<{ _id: string, message: string }> }
    const reviewId = list.data.find((r) => r.message === 'Good product.')?._id
    expect(reviewId).toBeDefined()

    const patchResponse = await request.patch('/rest/products/reviews', {
      headers: authHeaders(token),
      data: {
        id: reviewId,
        message: 'Actually, fantastic apple juice!'
      }
    })

    expect(patchResponse.status()).toBe(200)
    const patched = await patchResponse.json() as { modified: number, updated: Array<{ message: string }> }
    expect(patched.modified).toBeGreaterThanOrEqual(1)
    expect(patched.updated.some((r) => r.message === 'Actually, fantastic apple juice!')).toBe(true)
  })

  test('rejects editing a review without authentication', async ({ request }) => {
    await request.put('/rest/products/1/reviews', {
      data: {
        message: 'Unauthenticated review.',
        author: 'anonymous'
      }
    })

    const listResponse = await request.get('/rest/products/1/reviews')
    const list = await listResponse.json() as { data: Array<{ _id: string, message: string }> }
    const reviewId = list.data.find((r) => r.message === 'Unauthenticated review.')?._id
    expect(reviewId).toBeDefined()

    const patchResponse = await request.patch('/rest/products/reviews', {
      data: {
        id: reviewId,
        message: 'Should not be allowed.'
      }
    })

    expect(patchResponse.status()).toBe(401)
  })
})
