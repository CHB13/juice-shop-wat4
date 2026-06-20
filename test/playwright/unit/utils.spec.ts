import { expect, test } from '@playwright/test'

import * as utils from '../../../lib/utils'

test.describe('utils helpers', () => {
  test.describe('startsWith', () => {
    test('returns true when string begins with the given prefix', () => {
      expect(utils.startsWith('http://example.com', 'http')).toBe(true)
    })

    test('returns false when string does not begin with the given prefix', () => {
      expect(utils.startsWith('ftp://example.com', 'http')).toBe(false)
    })

    test('returns false for a falsy string', () => {
      expect(utils.startsWith('', 'http')).toBe(false)
    })
  })

  test.describe('endsWith', () => {
    test('returns true when string ends with the given suffix', () => {
      expect(utils.endsWith('image.png', '.png')).toBe(true)
    })

    test('returns false when string does not end with the given suffix', () => {
      expect(utils.endsWith('image.jpg', '.png')).toBe(false)
    })

    test('returns false when string or suffix is undefined', () => {
      expect(utils.endsWith(undefined, '.png')).toBe(false)
    })
  })

  test.describe('isUrl', () => {
    test('recognises an http URL', () => {
      expect(utils.isUrl('http://example.com')).toBe(true)
    })

    test('recognises an https URL', () => {
      expect(utils.isUrl('https://example.com')).toBe(true)
    })

    test('rejects a non-URL string', () => {
      expect(utils.isUrl('not-a-url')).toBe(false)
    })
  })

  test.describe('contains', () => {
    test('returns true when the element is present in the string', () => {
      expect(utils.contains('hello world', 'world')).toBe(true)
    })

    test('returns false when the element is absent', () => {
      expect(utils.contains('hello world', 'foo')).toBe(false)
    })

    test('returns false for a falsy string', () => {
      expect(utils.contains('', 'foo')).toBe(false)
    })
  })

  test.describe('unquote', () => {
    test('removes surrounding double quotes', () => {
      expect(utils.unquote('"hello"')).toBe('hello')
    })

    test('leaves a string without surrounding quotes unchanged', () => {
      expect(utils.unquote('hello')).toBe('hello')
    })

    test('leaves a string with only one quote unchanged', () => {
      expect(utils.unquote('"hello')).toBe('"hello')
    })
  })

  test.describe('trunc', () => {
    test('truncates a string that exceeds the given length and appends ellipsis', () => {
      // trunc cuts at (length - 1) chars then appends '...'
      const result = utils.trunc('abcdefghij', 5)
      expect(result).toBe('abcd...')
      expect(result).toMatch(/\.\.\.$/)
    })

    test('returns the string unchanged when it fits within the length', () => {
      expect(utils.trunc('hi', 10)).toBe('hi')
    })

    test('strips newlines before truncating', () => {
      const result = utils.trunc('line1\nline2', 20)
      expect(result).not.toContain('\n')
    })
  })

  test.describe('extractFilename', () => {
    test('extracts the filename from a URL path', () => {
      expect(utils.extractFilename('http://example.com/files/report.pdf')).toBe('report.pdf')
    })

    test('strips query parameters from the filename', () => {
      expect(utils.extractFilename('http://example.com/files/report.pdf?token=abc')).toBe('report.pdf')
    })
  })

  test.describe('toISO8601', () => {
    test('formats a date as YYYY-MM-DD with zero-padding', () => {
      expect(utils.toISO8601(new Date(2024, 0, 5))).toBe('2024-01-05')
    })

    test('formats the last day of the year correctly', () => {
      expect(utils.toISO8601(new Date(2023, 11, 31))).toBe('2023-12-31')
    })
  })

  test.describe('toMMMYY', () => {
    test('formats a date as MMMYY', () => {
      expect(utils.toMMMYY(new Date(2024, 0, 1))).toBe('JAN24')
    })

    test('uses the correct three-letter month abbreviation', () => {
      expect(utils.toMMMYY(new Date(2023, 11, 1))).toBe('DEC23')
    })
  })

  test.describe('toSimpleIpAddress', () => {
    test('converts an IPv4-mapped IPv6 address to plain IPv4', () => {
      expect(utils.toSimpleIpAddress('::ffff:192.168.1.1')).toBe('192.168.1.1')
    })

    test('converts the loopback address ::1 to 127.0.0.1', () => {
      expect(utils.toSimpleIpAddress('::1')).toBe('127.0.0.1')
    })

    test('returns a plain IPv4 address unchanged', () => {
      expect(utils.toSimpleIpAddress('10.0.0.1')).toBe('10.0.0.1')
    })
  })

  test.describe('getErrorMessage', () => {
    test('returns the message property of an Error instance', () => {
      expect(utils.getErrorMessage(new Error('something went wrong'))).toBe('something went wrong')
    })

    test('converts a non-Error value to its string representation', () => {
      expect(utils.getErrorMessage('plain string')).toBe('plain string')
    })
  })

  test.describe('queryResultToJson', () => {
    test('wraps data with a success status by default', () => {
      const result = utils.queryResultToJson({ id: 1 })
      expect(result.status).toBe('success')
      expect(result.data).toEqual({ id: 1 })
    })

    test('uses a custom status when provided', () => {
      const result = utils.queryResultToJson(null, 'error')
      expect(result.status).toBe('error')
    })
  })

  test.describe('matchesSystemIniFile', () => {
    test('returns true for text that resembles a system.ini file', () => {
      expect(utils.matchesSystemIniFile('; for 16-bit app support')).toBe(true)
    })

    test('returns false for unrelated text', () => {
      expect(utils.matchesSystemIniFile('hello world')).toBe(false)
    })
  })

  test.describe('matchesEtcPasswdFile', () => {
    test('returns true for a typical /etc/passwd entry', () => {
      expect(utils.matchesEtcPasswdFile('root:x:0:0:root:/root:/bin/bash')).toBe(true)
    })

    test('returns false for unrelated text', () => {
      expect(utils.matchesEtcPasswdFile('hello world')).toBe(false)
    })
  })
})
