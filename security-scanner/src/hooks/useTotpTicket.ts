import { useEffect, useState } from 'react';
import type { StudentTicket } from '../services/studentTickets';
import { createRotatingTicketCode, createTicketQrPayload, type RotatingTicketCode } from '../services/totp';

type StoredCode = RotatingTicketCode & { ticketId: number; secret: string };
type StoredCodeError = { ticketId: number; secret: string; step: number; message: string };

/** The ticket's current rotating QR payload, regenerated each 30-second step on a 1-second timer. */
export function useTotpTicket(ticket: StudentTicket, enabled: boolean) {
  const [now, setNow] = useState(0);
  const [storedCode, setStoredCode] = useState<StoredCode | null>(null);
  const [storedCodeError, setStoredCodeError] = useState<StoredCodeError | null>(null);

  const timeStep = Math.floor(now / 30_000);
  const secondsRemaining = 30 - Math.floor((now % 30_000) / 1000);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    if (!enabled || !ticket.totp_secret || timeStep === 0) {
      return () => { isCurrent = false; };
    }

    void createRotatingTicketCode(ticket.totp_secret, timeStep * 30_000)
      .then((code) => {
        if (isCurrent) {
          setStoredCode({ ...code, ticketId: ticket.id, secret: ticket.totp_secret! });
        }
      })
      .catch((cause: unknown) => {
        if (isCurrent) {
          setStoredCodeError({
            ticketId: ticket.id,
            secret: ticket.totp_secret!,
            step: timeStep,
            message: cause instanceof Error ? cause.message : 'The rotating ticket code could not be created.',
          });
        }
      });

    return () => { isCurrent = false; };
  }, [enabled, ticket.id, ticket.totp_secret, timeStep]);

  const rotatingCode = storedCode?.ticketId === ticket.id
    && storedCode.secret === ticket.totp_secret
    && storedCode.step === timeStep
    ? storedCode
    : null;
  const codeError = storedCodeError?.ticketId === ticket.id
    && storedCodeError.secret === ticket.totp_secret
    && storedCodeError.step === timeStep
    ? storedCodeError.message
    : '';
  const qrPayload = rotatingCode
    ? createTicketQrPayload(ticket.id, rotatingCode.step, rotatingCode.code)
    : '';

  return { rotatingCode, qrPayload, codeError, secondsRemaining };
}
