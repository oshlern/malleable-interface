import type {
  GenerateRequest,
  GenerateResponse,
  UpdateRequest,
  UpdateResponse,
  AutocompleteRequest,
  AutocompleteResponse,
} from "@jelly/shared";

const BASE = "/api";

async function post<TReq, TRes>(
  path: string,
  body: TReq,
): Promise<TRes> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

export const api = {
  generate(req: GenerateRequest): Promise<GenerateResponse> {
    return post("/generate", req);
  },

  update(req: UpdateRequest): Promise<UpdateResponse> {
    return post("/update", req);
  },

  autocomplete(req: AutocompleteRequest): Promise<AutocompleteResponse> {
    return post("/autocomplete", req);
  },
};
