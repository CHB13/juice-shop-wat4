import { expect, test } from '@playwright/test'

import * as security from '../../../lib/insecurity'

test.describe('security helpers', () => {
  test('creates a coupon that can be decoded back into the same discount', () => {
    const coupon = security.generateCoupon(15)

    expect(security.discountFromCoupon(coupon)).toBe(15)
  })

  test('rejects an outdated coupon even if the format is valid', () => {
    const expiredCoupon = security.generateCoupon(20, new Date(2001, 0, 1))

    expect(security.discountFromCoupon(expiredCoupon)).toBeUndefined()
  })

  test('verifies a freshly signed token', () => {
    const token = security.authorize({ email: 'jim@juice-sh.op' })

    expect(security.verify(token)).toBe(true)
  })

  test('rejects a tampered token', () => {
    const token = security.authorize({ email: 'jim@juice-sh.op' })
    // replace one letter with a different one
    const parts = token.split('.')
    const sig = parts[2]
    const mid = Math.floor(sig.length / 2)
    const tamperedSig = sig.slice(0, mid) + (sig[mid] === 'a' ? 'b' : 'a') + sig.slice(mid + 1)
    const tamperedToken = [parts[0], parts[1], tamperedSig].join('.')

    expect(security.verify(tamperedToken)).toBe(false)
  })

  test('removes script tags but preserves safe content', () => {
    const sanitized = security.sanitizeSecure('<script>alert(1)</script><p>safe</p>')

    expect(sanitized).toContain('safe')
    expect(sanitized).not.toContain('<script>')
  })
})