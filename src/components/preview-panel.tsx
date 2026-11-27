"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Hash,
  MessageSquareText,
  Search,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PreviewTab } from "@/lib/types";
import { extractMessagesFromJson, getJsonType } from "@/lib/json-utils";
import { escapeHtml, syntaxHighlightJson } from "@/lib/utils";

type Props = {
  entryName: string;
  fileKind: string | null;
  textContent: string;
  jsonContent: unknown | null;
  blobUrl: string | null;
  activeTab: string | null;
  setActiveTab: (tab: string) => void;
  globalSearchQuery?: string;
};

export function PreviewPanel({
  entryName,
  fileKind,
  textContent,
  jsonContent,
  blobUrl,
  activeTab,
  setActiveTab,
  globalSearchQuery = "",
}: Props) {
  const [localSearch, setLocalSearch] = useState("");
  const localSearchInputRef = useRef<HTMLInputElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Jump back to the first match whenever the search or the open file changes.
  // Resetting during render avoids the extra render pass of a setState-in-effect.
  const matchResetKey = [localSearch, globalSearchQuery, activeTab, entryName].join("\u0000");
  const [prevMatchResetKey, setPrevMatchResetKey] = useState(matchResetKey);
  if (prevMatchResetKey !== matchResetKey) {
    setPrevMatchResetKey(matchResetKey);
    setActiveMatchIndex(0);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        localSearchInputRef.current?.focus();
      }

      if ((event.key === "Enter" && (event.ctrlKey || event.metaKey)) || false) {
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const tabs = useMemo<PreviewTab[]>(() => {
    if (fileKind === "json" && jsonContent !== null) {
      const messages = extractMessagesFromJson(jsonContent);
      const result: PreviewTab[] = [];
      if (messages.length > 0) result.push({ key: "messages", label: "Messages" });
      result.push({ key: "tree", label: "JSON Tree" });
      result.push({ key: "raw", label: "Raw JSON" });
      return result;
    }

    if (fileKind === "image" || fileKind === "video" || fileKind === "audio" || fileKind === "pdf") {
      return [{ key: "preview", label: "Preview" }];
    }

    if (fileKind === "text") {
      return [{ key: "text", label: "Text Preview" }];
    }

    if (fileKind === "unknown") {
      return [{ key: "fallback", label: "Raw Text" }];
    }

    return [];
  }, [fileKind, jsonContent]);

  const resolvedTab = tabs.find((tab) => tab.key === activeTab)?.key ?? tabs[0]?.key ?? null;
  const messages = fileKind === "json" && jsonContent !== null ? extractMessagesFromJson(jsonContent) : [];
  const effectiveHighlight = localSearch.trim() || globalSearchQuery.trim();

  const navigableTabs = new Set(["text", "fallback", "raw", "messages", "tree"]);
  const canUseFinder = resolvedTab ? navigableTabs.has(resolvedTab) : false;

  useEffect(() => {
    if (!canUseFinder || !effectiveHighlight.trim()) return;

    const root = contentAreaRef.current;
    if (!root) return;

    const marks = Array.from(root.querySelectorAll("mark[data-arc-match='true']"));
    if (marks.length === 0) return;

    const safeIndex = Math.min(activeMatchIndex, marks.length - 1);
    const activeEl = marks[safeIndex] as HTMLElement;

    marks.forEach((mark, index) => {
      if (index === safeIndex) {
        mark.setAttribute("data-arc-active-match", "true");
        mark.classList.add("ring-2", "ring-white/70", "bg-[#4da3ff]/35");
      } else {
        mark.removeAttribute("data-arc-active-match");
        mark.classList.remove("ring-2", "ring-white/70", "bg-[#4da3ff]/35");
      }
    });

    activeEl.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [activeMatchIndex, effectiveHighlight, resolvedTab, canUseFinder, textContent, jsonContent, entryName]);

  const totalMatchCount = useMemo(() => {
    if (!canUseFinder || !effectiveHighlight.trim()) return 0;

    if (resolvedTab === "text" || resolvedTab === "fallback") {
      return countOccurrencesInText(textContent, effectiveHighlight);
    }

    if (resolvedTab === "raw" && jsonContent !== null) {
      return countOccurrencesInText(JSON.stringify(jsonContent, null, 2), effectiveHighlight);
    }

    if (resolvedTab === "messages" && messages.length > 0) {
      return messages.reduce((sum, message) => {
        const extra = message.extra ? JSON.stringify(message.extra, null, 2) : "";
        return (
          sum +
          countOccurrencesInText(message.author || "", effectiveHighlight) +
          countOccurrencesInText(message.timestamp || "", effectiveHighlight) +
          countOccurrencesInText(message.type || "", effectiveHighlight) +
          countOccurrencesInText(message.id || "", effectiveHighlight) +
          countOccurrencesInText(message.content || "", effectiveHighlight) +
          countOccurrencesInText(extra, effectiveHighlight)
        );
      }, 0);
    }

    if (resolvedTab === "tree" && jsonContent !== null) {
      return countOccurrencesInText(JSON.stringify(jsonContent, null, 2), effectiveHighlight);
    }

    return 0;
  }, [canUseFinder, effectiveHighlight, resolvedTab, textContent, jsonContent, messages]);

  function goToNextMatch() {
    if (!totalMatchCount) return;
    setActiveMatchIndex((prev) => (prev + 1) % totalMatchCount);
  }

  function goToPreviousMatch() {
    if (!totalMatchCount) return;
    setActiveMatchIndex((prev) => (prev - 1 + totalMatchCount) % totalMatchCount);
  }

  function onFinderKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) goToPreviousMatch();
      else goToNextMatch();
    }

    if (event.key === "Escape") {
      setLocalSearch("");
    }
  }

  if (!fileKind) {
    return <EmptyState title="Select a file to start previewing." />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex h-9 items-center rounded-full border px-4 text-sm transition ${
                resolvedTab === tab.key
                  ? "border-[#6ae4ff]/30 bg-[#6ae4ff]/14 text-white"
                  : "border-white/10 bg-white/4 text-[#8d9ab5] hover:bg-white/7 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {canUseFinder ? (
          <div className="flex w-full max-w-2xl flex-col gap-2 lg:items-end">
            <div className="relative w-full max-w-md">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8d9ab5]"
              />
              <input
                ref={localSearchInputRef}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={onFinderKeyDown}
                placeholder="Search within file (Ctrl/Cmd + K)"
                className="h-10 w-full rounded-2xl border border-white/10 bg-[#0b1020]/70 pl-9 pr-24 text-sm text-white outline-none transition placeholder:text-[#8d9ab5] focus:border-[#6ae4ff]/35 focus:ring-4 focus:ring-[#6ae4ff]/10"
              />

              {localSearch ? (
                <button
                  type="button"
                  onClick={() => setLocalSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d9ab5] transition hover:text-white"
                  aria-label="Clear in-file search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#8d9ab5]">
              <span>
                {totalMatchCount > 0
                  ? `${activeMatchIndex + 1} / ${totalMatchCount} matches`
                  : effectiveHighlight
                  ? "0 matches"
                  : "Use Enter and Shift+Enter to jump between matches"}
              </span>

              <button
                type="button"
                onClick={goToPreviousMatch}
                disabled={!totalMatchCount}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous match"
              >
                <ChevronUp size={14} />
              </button>

              <button
                type="button"
                onClick={goToNextMatch}
                disabled={!totalMatchCount}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next match"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div ref={contentAreaRef} className="min-h-0 flex-1 overflow-auto scrollbar-thin-dark">
        {resolvedTab === "preview" && blobUrl ? (
          <BinaryPreview kind={fileKind} blobUrl={blobUrl} entryName={entryName} />
        ) : null}

        {(resolvedTab === "text" || resolvedTab === "fallback") && (
          <pre
            className="arc-code overflow-auto rounded-3xl p-5 text-sm leading-7 text-[#e8ecf5]"
            dangerouslySetInnerHTML={{
              __html: `<code>${highlightPlainText(textContent, effectiveHighlight)}</code>`,
            }}
          />
        )}

        {resolvedTab === "raw" && jsonContent !== null && (
          <pre
            className="arc-code overflow-auto rounded-3xl p-5 text-sm leading-7 text-[#e8ecf5]"
            dangerouslySetInnerHTML={{
              __html: `<code>${highlightHtmlPreservingTags(
                syntaxHighlightJson(JSON.stringify(jsonContent, null, 2)),
                effectiveHighlight
              )}</code>`,
            }}
          />
        )}

        {resolvedTab === "tree" && jsonContent !== null && (
          <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-4">
            <JsonTreeNode value={jsonContent} nodeKey="root" depth={0} highlight={effectiveHighlight} />
          </div>
        )}

        {resolvedTab === "messages" && messages.length > 0 && (
          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3 text-white">
                <MessageSquareText size={18} className="text-[#6ae4ff]" />
                <div className="text-sm font-semibold">Message View</div>
              </div>
              <div className="mt-2 text-sm text-[#8d9ab5]">
                Detected {messages.length} message-like entries in this JSON file.
              </div>
            </div>

            {messages.map((message, index) => (
              <article
                key={`${message.id || "msg"}-${index}`}
                className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6ae4ff] to-[#4da3ff] text-sm font-bold text-[#0b1020]">
                      {(message.author || "?").slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div
                        className="truncate text-sm font-semibold text-white"
                        dangerouslySetInnerHTML={{
                          __html: highlightPlainText(
                            message.author || `Message ${index + 1}`,
                            effectiveHighlight
                          ),
                        }}
                      />

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#8d9ab5]">
                        {message.timestamp ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock size={12} />
                            <span
                              dangerouslySetInnerHTML={{
                                __html: highlightPlainText(message.timestamp, effectiveHighlight),
                              }}
                            />
                          </span>
                        ) : null}

                        {message.type ? (
                          <span
                            className="inline-flex items-center gap-1"
                            dangerouslySetInnerHTML={{
                              __html: highlightPlainText(message.type, effectiveHighlight),
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {message.id ? (
                    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#8d9ab5]">
                      <Hash size={12} />
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightPlainText(message.id, effectiveHighlight),
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <div
                  className="whitespace-pre-wrap text-sm leading-7 text-[#e8ecf5]"
                  dangerouslySetInnerHTML={{
                    __html: highlightPlainText(message.content || "(empty message)", effectiveHighlight),
                  }}
                />

                {message.extra && Object.keys(message.extra).length > 0 ? (
                  <details className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-3">
                    <summary className="cursor-pointer text-sm text-[#6ae4ff]">
                      Additional fields
                    </summary>
                    <pre
                      className="mt-3 overflow-auto text-xs leading-6 text-[#e8ecf5]"
                      dangerouslySetInnerHTML={{
                        __html: `<code>${highlightHtmlPreservingTags(
                          syntaxHighlightJson(JSON.stringify(message.extra, null, 2)),
                          effectiveHighlight
                        )}</code>`,
                      }}
                    />
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BinaryPreview({
  kind,
  blobUrl,
  entryName,
}: {
  kind: string;
  blobUrl: string;
  entryName: string;
}) {
  if (kind === "image") {
    return (
      <div className="grid gap-4">
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-black/20 p-3">
          <img
            src={blobUrl}
            alt={entryName}
            className="max-h-[75vh] w-full rounded-2xl object-contain"
          />
        </div>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/8 bg-black/20 p-3">
        <video src={blobUrl} controls className="w-full rounded-2xl" />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-4 text-sm font-semibold text-white">{entryName}</div>
          <audio src={blobUrl} controls className="w-full" />
        </div>
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/8 bg-white p-2">
        <iframe src={blobUrl} title={entryName} className="min-h-[75vh] w-full rounded-2xl" />
      </div>
    );
  }

  return <EmptyState title="No preview available." />;
}

function JsonTreeNode({
  value,
  nodeKey,
  depth,
  highlight,
}: {
  value: unknown;
  nodeKey: string;
  depth: number;
  highlight: string;
}) {
  const type = getJsonType(value);

  if (type === "object" || type === "array") {
    const entries = type === "array" ? (value as unknown[]) : Object.entries(value as Record<string, unknown>);
    const count = type === "array" ? (value as unknown[]).length : Object.keys(value as Record<string, unknown>).length;

    return (
      <details open={depth < 2} className="ml-0 my-1 border-l border-white/8 pl-3">
        <summary className="cursor-pointer py-1 text-sm">
          <span
            className="font-mono text-[#6ae4ff]"
            dangerouslySetInnerHTML={{ __html: highlightPlainText(nodeKey, highlight) }}
          />
          <span className="mx-2 text-[#8d9ab5]">:</span>
          <span className="font-mono text-[#8d9ab5]">
            {type} ({count})
          </span>
        </summary>

        <div className="mt-1 grid gap-1">
          {type === "array"
            ? (entries as unknown[]).map((item, index) => (
                <JsonTreeNode
                  key={`${nodeKey}-${index}`}
                  value={item}
                  nodeKey={`[${index}]`}
                  depth={depth + 1}
                  highlight={highlight}
                />
              ))
            : (entries as [string, unknown][]).map(([key, val]) => (
                <JsonTreeNode
                  key={`${nodeKey}-${key}`}
                  value={val}
                  nodeKey={key}
                  depth={depth + 1}
                  highlight={highlight}
                />
              ))}
        </div>
      </details>
    );
  }

  return (
    <div className="border-l border-white/6 py-1 pl-3 text-sm font-mono">
      <span
        className="text-[#6ae4ff]"
        dangerouslySetInnerHTML={{ __html: highlightPlainText(nodeKey, highlight) }}
      />
      <span className="mx-2 text-[#8d9ab5]">:</span>
      <span
        className={
          type === "string"
            ? "text-[#8fe8bf]"
            : type === "number"
            ? "text-[#ffd86a]"
            : type === "boolean"
            ? "text-[#ff9fe0]"
            : "text-[#ff9b9b]"
        }
        dangerouslySetInnerHTML={{
          __html:
            type === "string"
              ? highlightPlainText(`"${String(value)}"`, highlight)
              : highlightPlainText(String(value), highlight),
        }}
      />
    </div>
  );
}

function highlightPlainText(text: string, query: string) {
  const safe = escapeHtml(text);
  if (!query.trim()) return safe;

  const escapedQuery = escapeRegExp(query);
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  return safe.replace(
    regex,
    '<mark data-arc-match="true" class="rounded bg-[#6ae4ff]/25 px-1 text-white">$1</mark>'
  );
}

function highlightHtmlPreservingTags(html: string, query: string) {
  if (!query.trim()) return html;

  const escapedQuery = escapeRegExp(query);
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  return html.replace(/(>[^<]+<)/g, (segment) => {
    return segment.replace(
      regex,
      '<mark data-arc-match="true" class="rounded bg-[#6ae4ff]/25 px-1 text-white">$1</mark>'
    );
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrencesInText(text: string, query: string) {
  if (!query.trim()) return 0;

  const escaped = escapeRegExp(query);
  const regex = new RegExp(escaped, "gi");
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}
