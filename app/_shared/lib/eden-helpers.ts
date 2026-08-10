import type { ApiError, ApiResponse, PaginatedResponse } from "@libsys/shared";

export type EdenEnvelope = ApiResponse<unknown> | PaginatedResponse<unknown> | ApiError;

export interface EdenRequestErrorPayload {
  status: number;
  value: unknown;
}

export interface EdenResolvedResponse<TData> {
  data: TData | null;
  error: EdenRequestErrorPayload | null;
  status: number;
  headers: Record<string, string>;
}

export type EdenPayload<TEnvelope> = TEnvelope extends {
  success: true;
  data: unknown;
  total: number;
}
  ? TEnvelope
  : TEnvelope extends { success: true; data: infer TData }
    ? TData
    : never;

export class EdenRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EdenRequestError";
    this.status = status;
  }
}

const MALFORMED_RESPONSE_MESSAGE = "รูปแบบการตอบกลับจากระบบไม่ถูกต้อง";
const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";

function extractErrorMessage(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.error === "string") {
      return record.error;
    }
    if (typeof record.message === "string") {
      return record.message;
    }
  }
  return FALLBACK_ERROR_MESSAGE;
}

function isApiError(envelope: EdenEnvelope): envelope is ApiError {
  return envelope.success === false;
}

export async function edenRequest<TEnvelope extends EdenEnvelope>(
  response: EdenResolvedResponse<TEnvelope>,
): Promise<EdenPayload<TEnvelope>> {
  if (response.error) {
    throw new EdenRequestError(extractErrorMessage(response.error.value), response.error.status);
  }
  const envelope = response.data;
  if (envelope === null || typeof envelope !== "object") {
    throw new EdenRequestError(MALFORMED_RESPONSE_MESSAGE, response.status);
  }
  if (isApiError(envelope)) {
    throw new EdenRequestError(envelope.error, response.status);
  }
  if ("total" in envelope) {
    return envelope as EdenPayload<TEnvelope>;
  }
  return envelope.data as EdenPayload<TEnvelope>;
}
