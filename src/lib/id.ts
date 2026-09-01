const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** 짧은 임의 ID. URL과 localStorage 키에 쓴다 */
export function createId(length = 10): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length]
  return out
}
