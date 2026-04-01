import { MessageLike } from "./types";

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null);
}

function stringifyMaybe(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function deleteKnownFields(obj: Record<string, unknown>, fields: string[]) {
  for (const field of fields) delete obj[field];
}

export function getJsonType(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function extractMessagesFromJson(data: unknown): MessageLike[] {
  let source: unknown[] | null = null;

  if (Array.isArray(data)) {
    source = data;
  } else if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.messages)) source = record.messages;
    else if (Array.isArray(record.chat)) source = record.chat;
    else if (Array.isArray(record.conversation)) source = record.conversation;
    else if (Array.isArray(record.items)) source = record.items;
    else if (Array.isArray(record.data)) source = record.data;
  }

  if (!Array.isArray(source)) return [];

  const mapped = source
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const record = item as Record<string, unknown>;

      const author = firstDefined(
        record.author,
        record.user,
        record.username,
        record.sender,
        record.name,
        record.role
      );

      const content = firstDefined(
        record.content,
        record.text,
        record.message,
        record.body,
        record.value,
        record.prompt
      );

      const timestamp = firstDefined(
        record.timestamp,
        record.time,
        record.date,
        record.createdAt,
        record.created_at,
        record.datetime
      );

      const id = firstDefined(record.id, record.messageId, record.message_id, record.uuid);
      const type = firstDefined(record.type, record.role, record.kind, record.event);

      const extra = { ...record };
      deleteKnownFields(extra, [
        "author",
        "user",
        "username",
        "sender",
        "name",
        "role",
        "content",
        "text",
        "message",
        "body",
        "value",
        "prompt",
        "timestamp",
        "time",
        "date",
        "createdAt",
        "created_at",
        "datetime",
        "id",
        "messageId",
        "message_id",
        "uuid",
        "type",
        "kind",
        "event",
      ]);

      return {
        author: stringifyMaybe(author) || `Message ${index + 1}`,
        content: stringifyMaybe(content) || "",
        timestamp: stringifyMaybe(timestamp) || "",
        id: stringifyMaybe(id) || "",
        type: stringifyMaybe(type) || "",
        extra,
      };
    })
    .filter((item) => item.content || item.author);

  const goodMatches = mapped.filter((item) => item.content).length;
  if (mapped.length === 0 || goodMatches < Math.ceil(mapped.length * 0.35)) return [];

  return mapped;
}
