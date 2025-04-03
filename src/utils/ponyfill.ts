class FillErrorEvent extends Event {
  error: any;
  filename: string;
  lineno: number;
  colno: number;
  message: string;
  constructor(type: string, eventInitDict?: ErrorEventInit) {
    super(type, eventInitDict);
    this.error = eventInitDict?.error;
    this.filename = eventInitDict?.filename ?? "";
    this.lineno = eventInitDict?.lineno ?? 0;
    this.colno = eventInitDict?.colno ?? 0;
    this.message = eventInitDict?.message ?? "";
  }
}

class FillCloseEvent extends Event {
  wasClean: boolean;
  code: number;
  reason: string;
  constructor(type: string, eventInitDict?: CloseEventInit) {
    super(type, eventInitDict);
    this.wasClean = eventInitDict?.wasClean ?? false;
    this.code = eventInitDict?.code ?? 0;
    this.reason = eventInitDict?.reason ?? "";
  }
}

export const ErrorEvent: typeof globalThis.ErrorEvent =
  globalThis.ErrorEvent || FillErrorEvent;

export const CloseEvent: typeof globalThis.CloseEvent =
  globalThis.CloseEvent || FillCloseEvent;
