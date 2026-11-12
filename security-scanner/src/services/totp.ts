import * as Crypto from 'expo-crypto';
import { createRotatingTicketCodeCore, type RotatingTicketCode } from './totpCore';
export { createTicketQrPayload, type RotatingTicketCode } from './totpCore';

export async function createRotatingTicketCode(
  hexSecret: string,
  currentTimeMs: number = Date.now(),
): Promise<RotatingTicketCode> {
  return createRotatingTicketCodeCore(hexSecret, currentTimeMs, async (message) => {
    const input = new ArrayBuffer(message.byteLength);
    new Uint8Array(input).set(message);

    return new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA1, input));
  });
}
