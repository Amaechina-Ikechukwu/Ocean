export const API_ORIGIN = "https://ocean-api-269299350620.europe-west1.run.app";

export function joinApiUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function readApiError(res: Response) {
  const json = await res.json().catch(() => null);
  return json?.error?.message ?? `Request failed with ${res.status}`;
}

export type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AiChatRequest = {
  workspaceId: string;
  pageId?: string;
  messages: AiMessage[];
  selectedText?: string;
  mode?: "ask" | "explain" | "brainstorm" | "draft";
};

export type AiChatResponse = {
  data: {
    message: {
      role: "assistant";
      content: string;
    };
    usage?: AiUsage;
  };
};

export type AiStreamEvent =
  | { type: "delta"; text: string }
  | { type: "usage"; usage: AiUsage }
  | { type: "done" }
  | { type: "error"; message: string };

type ApiClientOptions = {
  baseUrl: string;
  getIdToken: () => Promise<string>;
};

export function createOceanApiClient({ baseUrl, getIdToken }: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getIdToken();
    const res = await fetch(joinApiUrl(baseUrl, path), {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers
      }
    });

    if (!res.ok) throw new Error(await readApiError(res));
    return await res.json() as T;
  }

  return { request };
}

export async function streamAiChat(
  baseUrl: string,
  token: string,
  body: AiChatRequest,
  onEvent: (event: AiStreamEvent) => void,
  signal?: AbortSignal
) {
  const res = await fetch(joinApiUrl(baseUrl, "/api/ai/chat/stream"), {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(await readApiError(res));
  if (!res.body) throw new Error("Streaming is not supported in this browser");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const dataLine = chunk.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      onEvent(JSON.parse(dataLine.slice(5).trim()) as AiStreamEvent);
    }
  }
}
