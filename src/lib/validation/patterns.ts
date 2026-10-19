// Shared by client and server. Token alphabet: no 0/1/l/o/I/O, so links survive being read aloud.
export const TOKEN_ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
export const TOKEN_LENGTH = 10;
export const SECRET_LENGTH = 24;

export const TOKEN_RE = /^[2-9a-km-np-zA-HJ-NP-Z]{10}$/;
export const SECRET_RE = /^[2-9a-km-np-zA-HJ-NP-Z]{24}$/;
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Random key a browser keeps per invitation, so a generic-link RSVP can be edited from the same phone. */
export const CLIENT_KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;
