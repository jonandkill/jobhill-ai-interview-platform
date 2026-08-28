import { compactKnowledgeContext } from "@shared/interviewKnowledge";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

type ApiConfig = {
  url: string;
  apiKey: string;
  model: string;
  provider: "openai" | "forge";
};

const hasFileContent = (messages: Message[]) =>
  messages.some(message =>
    ensureArray(message.content).some(part => typeof part !== "string" && part.type === "file_url"),
  );

const resolveApiConfig = (messages: Message[]): ApiConfig => {
  if (ENV.openaiApiKey && !hasFileContent(messages)) {
    if (!ENV.openaiModel) {
      throw new Error("OPENAI_MODEL is not configured");
    }
    return {
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: ENV.openaiApiKey,
      model: ENV.openaiModel,
      provider: "openai",
    };
  }

  if (!ENV.forgeApiKey) {
    if (hasFileContent(messages) && ENV.openaiApiKey) {
      throw new Error("file_url content requires the managed AI provider");
    }
    throw new Error("AI API key is not configured");
  }
  return {
    url: ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
      ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
      : "https://forge.manus.im/v1/chat/completions",
    apiKey: ENV.forgeApiKey,
    model: "gemini-2.5-flash",
    provider: "forge",
  };
};

const messageText = (message: Message) =>
  ensureArray(message.content)
    .map(part => typeof part === "string" ? part : part.type === "text" ? part.text : "")
    .filter(Boolean)
    .join("\n");

const enrichInterviewMessages = (messages: Message[]) => {
  const prompt = messages.map(messageText).join("\n");
  const question = prompt.match(/면접 질문:\s*([^\n]+)/)?.[1]?.trim();
  if (!question) return messages;

  const knowledgeMessage: Message = {
    role: "system",
    content: compactKnowledgeContext(question),
  };
  const firstUserIndex = messages.findIndex(message => message.role === "user");
  if (firstUserIndex < 0) return [...messages, knowledgeMessage];
  return [
    ...messages.slice(0, firstUserIndex),
    knowledgeMessage,
    ...messages.slice(firstUserIndex),
  ];
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const apiConfig = resolveApiConfig(messages);
  const payload: Record<string, unknown> = {
    model: apiConfig.model,
    messages: enrichInterviewMessages(messages).map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const requestedMaxTokens = params.maxTokens ?? params.max_tokens ?? 2_400;
  const maxTokens = Math.max(256, Math.min(2_400, Math.floor(requestedMaxTokens)));
  if (apiConfig.provider === "openai") {
    payload.max_completion_tokens = maxTokens;
    payload.store = false;
  } else {
    payload.max_tokens = maxTokens;
    payload.thinking = { budget_tokens: Math.min(128, maxTokens) };
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(apiConfig.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify(payload),
      redirect: "error",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.body) await response.body.cancel().catch(() => undefined);
    throw new Error(`LLM invoke failed with status ${response.status}`);
  }

  return (await response.json()) as InvokeResult;
}
