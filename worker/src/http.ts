import { jsonResponse } from './cors';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function makeRequestId(): string {
  return crypto.randomUUID();
}

export function errorResponse(
  origin: string | null,
  requestId: string,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Response {
  const error: ApiErrorShape = {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId,
  };
  return jsonResponse({ success: false, error }, status, origin);
}
