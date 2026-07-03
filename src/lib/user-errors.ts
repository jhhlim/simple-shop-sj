export class UserConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserConflictError";
  }
}

export function isDuplicateUserError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "23505") return true;
  const msg = String(e.message || "").toLowerCase();
  return msg.includes("unique") || msg.includes("duplicate");
}
