// Minimal request/response types for the Vercel Node routes, so the
// api/ folder needs no @vercel/node dependency.
export type VercelRequest = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

export type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};
