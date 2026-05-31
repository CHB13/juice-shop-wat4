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

// run in serial, since tests depend on each other
test.describe.serial('/api/BasketItems', () => {
  test('adds a product to the authenticated basket via API', async ({ request }) => {
    const { token, bid } = await loginAsJim(request)

    const createResponse = await request.post('/api/BasketItems', {
      headers: authHeaders(token),
      data: {
        BasketId: bid,
        ProductId: 1,
        quantity: 1
      }
    })

    expect(createResponse.status()).toBe(200)

    const createdItem = await createResponse.json() as { data: { id: number, BasketId: number, ProductId: number, quantity: number } }
    expect(createdItem.data.BasketId).toBe(bid)
    expect(createdItem.data.ProductId).toBe(1)
    expect(createdItem.data.quantity).toBe(1)

    const basketResponse = await request.get(`/rest/basket/${bid}`, {
      headers: authHeaders(token)
    })

    expect(basketResponse.status()).toBe(200)
    const basket = await basketResponse.json() as { data: { Products: Array<{ id: number, BasketItem: { id: number, quantity: number } }> } }
    expect(basket.data.Products.some((product) => product.id === 1)).toBe(true)
  })

  test('removes a previously added product from the basket via API', async ({ request }) => {
    const { token, bid } = await loginAsJim(request)

    const createResponse = await request.post('/api/BasketItems', {
      headers: authHeaders(token),
      data: {
        BasketId: bid,
        ProductId: 2,
        quantity: 1
      }
    })

    expect(createResponse.status()).toBe(200)
    const createdItem = await createResponse.json() as { data: { id: number } }

    const deleteResponse = await request.delete(`/api/BasketItems/${createdItem.data.id}`, {
      headers: authHeaders(token)
    })

    expect(deleteResponse.status()).toBe(200)

    const deletedLookup = await request.get(`/api/BasketItems/${createdItem.data.id}`, {
      headers: authHeaders(token)
    })

    expect(deletedLookup.status()).toBe(404)
  })

  test('updates quantity of an existing basket item via API', async ({ request }) => {
    const { token, bid } = await loginAsJim(request)

    const createResponse = await request.post('/api/BasketItems', {
      headers: authHeaders(token),
      data: {
        BasketId: bid,
        ProductId: 3,
        quantity: 2
      }
    })

    expect(createResponse.status()).toBe(200)
    const createdItem = await createResponse.json() as { data: { id: number, quantity: number } }

    const updateResponse = await request.put(`/api/BasketItems/${createdItem.data.id}`, {
      headers: authHeaders(token),
      data: {
        quantity: 5
      }
    })

    expect(updateResponse.status()).toBe(200)
    const updatedItem = await updateResponse.json() as { data: { id: number, quantity: number } }
    expect(updatedItem.data.quantity).toBe(5)
  })
})