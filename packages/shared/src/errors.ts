/**
 * Domain errors whose message is written as user-facing Korean guidance.
 *
 * The split matters at the HTTP boundary: an *expected* domain failure (공고 없음,
 * 금지된 상태 전환, 저장 게이트 차단 …) should reach the dashboard with its real
 * message and an accurate status code, exactly like the MCP layer already relays
 * `e.message` via `fail(...)`. An *unexpected* internal error (a SQLite fault, a
 * bug) must stay an opaque 500 so we never leak internals. Plain `Error` can't be
 * told apart from the latter, so user-facing failures throw `CareerMateError` and
 * the HTTP layer maps only those to `httpStatus` + message.
 */
export class CareerMateError extends Error {
  constructor(
    message: string,
    /** HTTP status the dashboard should return (404 not-found, 409 conflict, 400 validation). */
    readonly httpStatus = 400,
    /** Optional machine-readable code for the client. */
    readonly code?: string,
  ) {
    super(message);
    this.name = 'CareerMateError';
  }
}

/** The requested record does not exist (HTTP 404). */
export function notFound(message: string): CareerMateError {
  return new CareerMateError(message, 404, 'not_found');
}

/** The action conflicts with the record's current lifecycle state (HTTP 409). */
export function conflict(message: string): CareerMateError {
  return new CareerMateError(message, 409, 'conflict');
}
