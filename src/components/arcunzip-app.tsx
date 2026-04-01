"use client";

import { useEffect, useMemo, useState } from "react";
import * as zip from "@zip.js/zip.js";
import {
  Copy,
  Download,
  FolderTree,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { FileTree } from "@/components/file-tree";
import { PreviewPanel } from "@/components/preview-panel";
import { ZipEntryItem } from "@/lib/types";
import { buildTree, collectFolderPaths } from "@/lib/tree-utils";
import {
  detectFileKind,
  getBaseName,
  getExtension,
  getMimeType,
  TEXT_EXTENSIONS,
} from "@/lib/file-utils";
import { formatBytes } from "@/lib/utils";

zip.configure({ useWebWorkers: true });

const MAX_INDEXED_TEXT_BYTES = 2 * 1024 * 1024;

export function ArcUnzipApp() {
  const [archiveName, setArchiveName] = useState("No ZIP loaded");
  const [entries, setEntries] = useState<ZipEntryItem[]>([]);
  const [search, setSearch] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([""]));
  const [status, setStatus] = useState("Ready.");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const [currentEntry, setCurrentEntry] = useState<ZipEntryItem | null>(null);
  const [textContent, setTextContent] = useState("");
  const [jsonContent, setJsonContent] = useState<unknown | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileKind, setFileKind] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const [contentIndex, setContentIndex] = useState<Record<string, string>>({});
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedFiles, setIndexedFiles] = useState(0);
  const [skippedFiles, setSkippedFiles] = useState(0);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const normalizedQuery = search.trim().toLowerCase();

  const searchableEntryCount = useMemo(
    () =>
      entries.filter(
        (entry) =>
          !entry.isDir &&
          (entry.ext === "json" || TEXT_EXTENSIONS.has(entry.ext))
      ).length,
    [entries]
  );

  const contentMatchPaths = useMemo(() => {
    if (!normalizedQuery) return new Set<string>();

    const matches = new Set<string>();
    for (const [path, content] of Object.entries(contentIndex)) {
      if (content.toLowerCase().includes(normalizedQuery)) {
        matches.add(path);
      }
    }
    return matches;
  }, [contentIndex, normalizedQuery]);

  const fileNameMatchPaths = useMemo(() => {
    if (!normalizedQuery) return new Set<string>();

    const matches = new Set<string>();
    for (const entry of entries) {
      if (entry.path.toLowerCase().includes(normalizedQuery)) {
        matches.add(entry.path);
      }
    }
    return matches;
  }, [entries, normalizedQuery]);

  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) return entries;

    return entries.filter((entry) => {
      if (entry.path.toLowerCase().includes(normalizedQuery)) return true;
      if (!entry.isDir && contentMatchPaths.has(entry.path)) return true;
      return false;
    });
  }, [entries, normalizedQuery, contentMatchPaths]);

  const tree = useMemo(() => buildTree(filteredEntries), [filteredEntries]);

  const jsonCount = useMemo(
    () => entries.filter((entry) => !entry.isDir && entry.ext === "json").length,
    [entries]
  );

  const contentResults = useMemo(() => {
    if (!normalizedQuery) return [];

    const results = filteredEntries
      .filter((entry) => !entry.isDir && contentMatchPaths.has(entry.path))
      .map((entry) => ({
        entry,
        snippet: makeSnippet(contentIndex[entry.path] || "", normalizedQuery),
      }));

    return results.slice(0, 50);
  }, [filteredEntries, contentIndex, contentMatchPaths, normalizedQuery]);

  async function handleZipUpload(file: File) {
    resetViewer();
    setSearch("");
    setContentIndex({});
    setIndexedFiles(0);
    setSkippedFiles(0);
    setStatus(`Opening "${file.name}"...`);
    setArchiveName(file.name);

    try {
      const blobReader = new zip.BlobReader(file);
      const zipReader = new zip.ZipReader(blobReader);
      const zipEntries = await zipReader.getEntries();

      const mapped: ZipEntryItem[] = zipEntries
        .map((entry) => ({
          path: entry.filename,
          name: getBaseName(entry.filename),
          isDir: entry.directory,
          ext: getExtension(entry.filename),
          raw: entry,
          uncompressedSize: entry.uncompressedSize || 0,
          compressedSize: entry.compressedSize || 0,
        }))
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.path.localeCompare(b.path);
        });

      setEntries(mapped);
      setExpandedPaths(new Set([""]));
      setStatus(`Loaded "${file.name}". Building search index...`);

      void buildContentIndex(mapped);

      const firstFile = mapped.find((entry) => !entry.isDir);
      if (firstFile) {
        await openFile(firstFile);
      }
    } catch (error) {
      console.error(error);
      setEntries([]);
      setArchiveName("Unreadable ZIP");
      setStatus("Failed to open ZIP archive.");
    }
  }

  async function buildContentIndex(entryList: ZipEntryItem[]) {
    setIsIndexing(true);
    setIndexedFiles(0);
    setSkippedFiles(0);

    const nextIndex: Record<string, string> = {};
    let indexed = 0;
    let skipped = 0;

    const searchableEntries = entryList.filter(
      (entry) =>
        !entry.isDir &&
        (entry.ext === "json" || TEXT_EXTENSIONS.has(entry.ext))
    );

    for (let i = 0; i < searchableEntries.length; i++) {
      const entry = searchableEntries[i];

      if (entry.uncompressedSize > MAX_INDEXED_TEXT_BYTES) {
        skipped++;
        setSkippedFiles(skipped);
        setStatus(
          `Indexing content... ${i + 1}/${searchableEntries.length} (skipping oversized text files)`
        );
        continue;
      }

      try {
        const rawEntry = entry.raw as zip.FileEntry;
        const text = await rawEntry.getData(new zip.TextWriter());

        nextIndex[entry.path] = text;
        indexed++;
        setIndexedFiles(indexed);
      } catch {
        skipped++;
        setSkippedFiles(skipped);
      }

      if ((i + 1) % 5 === 0 || i === searchableEntries.length - 1) {
        setStatus(`Indexing content... ${i + 1}/${searchableEntries.length}`);
      }
    }

    setContentIndex(nextIndex);
    setIsIndexing(false);
    setStatus(
      `Search index ready. Indexed ${indexed} file${indexed === 1 ? "" : "s"}${
        skipped > 0 ? `, skipped ${skipped}` : ""
      }.`
    );
  }

  async function openFile(entry: ZipEntryItem) {
    if (!entry || entry.isDir) return;

    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    setCurrentEntry(entry);
    setSelectedPath(entry.path);
    setTextContent("");
    setJsonContent(null);
    setActiveTab(null);

    const kind = detectFileKind(entry.ext);
    setFileKind(kind);
    setStatus(`Opening "${entry.path}"...`);

    try {
      const rawEntry = entry.raw as zip.FileEntry;

      if (
        kind === "image" ||
        kind === "video" ||
        kind === "audio" ||
        kind === "pdf"
      ) {
        const blob = await rawEntry.getData(
          new zip.BlobWriter(getMimeType(entry.ext))
        );
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setStatus(`Opened "${entry.path}".`);
        return;
      }

      const text = await rawEntry.getData(new zip.TextWriter());
      setTextContent(text);

      if (kind === "json") {
        try {
          setJsonContent(JSON.parse(text));
        } catch {
          setJsonContent(null);
        }
      }

      setStatus(`Opened "${entry.path}".`);
    } catch (error) {
      console.error(error);
      setStatus(`Failed to open "${entry.path}".`);
    }
  }

  function resetViewer() {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    setCurrentEntry(null);
    setSelectedPath(null);
    setTextContent("");
    setJsonContent(null);
    setFileKind(null);
    setActiveTab(null);
  }

  function toggleFolder(path: string) {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function expandAll() {
    const paths: string[] = [];
    collectFolderPaths(buildTree(filteredEntries), paths);
    setExpandedPaths(new Set(paths));
  }

  function collapseAll() {
    setExpandedPaths(new Set([""]));
  }

  async function copyCurrent() {
    if (!currentEntry) return;

    try {
      if (jsonContent !== null) {
        await navigator.clipboard.writeText(JSON.stringify(jsonContent, null, 2));
      } else if (textContent) {
        await navigator.clipboard.writeText(textContent);
      } else {
        await navigator.clipboard.writeText(currentEntry.path);
      }
      setStatus(`Copied "${currentEntry.path}" to clipboard.`);
    } catch {
      setStatus("Clipboard copy failed.");
    }
  }

  function downloadCurrent() {
    if (!currentEntry) return;

    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = currentEntry.name;
      a.click();
      setStatus(`Downloaded "${currentEntry.path}".`);
      return;
    }

    if (textContent) {
      const blob = new Blob([textContent], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentEntry.name;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Downloaded "${currentEntry.path}".`);
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1700px] flex-col gap-4">
        <header className="arc-panel rounded-[28px] p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/bluelogo.svg"
                alt="ArcUnzip"
                className="h-14 w-14 rounded-2xl object-contain"
              />

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    ArcUnzip
                  </h1>
                  <span className="rounded-full border border-[#6ae4ff]/20 bg-[#6ae4ff]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#6ae4ff]">
                    ArcNode
                  </span>
                </div>

                <p className="mt-1 text-sm text-[#8d9ab5]">
                  Browse ZIP archives beautifully. No, not your pants, you filthy
                  animal.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#6ae4ff]/20 bg-[#6ae4ff]/12 px-4 text-sm font-medium text-white transition hover:border-[#6ae4ff]/35 hover:bg-[#6ae4ff]/16">
                <Upload size={16} />
                Open ZIP
                <input
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleZipUpload(file);
                  }}
                />
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8d9ab5]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search files, folders, and text content..."
                  className="h-11 w-full min-w-[320px] rounded-2xl border border-white/10 bg-[#0b1020]/70 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-[#8d9ab5] focus:border-[#6ae4ff]/35 focus:ring-4 focus:ring-[#6ae4ff]/10"
                />
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Archive" value={archiveName} />
          <StatCard label="Entries" value={String(entries.length)} />
          <StatCard label="JSON Files" value={String(jsonCount)} />
          <StatCard
            label="Searchable Text Files"
            value={`${indexedFiles}/${searchableEntryCount}`}
          />
        </section>

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="arc-panel-strong flex min-h-[320px] flex-col overflow-hidden rounded-[28px]">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-2 text-white">
                <FolderTree size={18} className="text-[#6ae4ff]" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
                  Explorer
                </h2>
              </div>

              <div className="flex gap-2">
                <Button className="h-9 rounded-xl px-3 text-xs" onClick={expandAll}>
                  Expand all
                </Button>
                <Button
                  className="h-9 rounded-xl px-3 text-xs"
                  onClick={collapseAll}
                >
                  Collapse all
                </Button>
              </div>
            </div>

            {normalizedQuery && contentResults.length > 0 ? (
              <div className="border-b border-white/8 px-3 py-3">
                <div className="mb-2 px-2 text-[11px] uppercase tracking-[0.18em] text-[#8d9ab5]">
                  Content matches
                </div>

                <div className="max-h-[220px] space-y-2 overflow-auto pr-1 scrollbar-thin-dark">
                  {contentResults.map(({ entry, snippet }) => (
                    <button
                      key={`search-result-${entry.path}`}
                      type="button"
                      onClick={() => void openFile(entry)}
                      className="w-full rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left transition hover:border-[#6ae4ff]/20 hover:bg-[#6ae4ff]/8"
                    >
                      <div className="truncate text-sm font-medium text-white">
                        {entry.path}
                      </div>
                      <div className="mt-1 line-clamp-3 text-xs leading-6 text-[#8d9ab5]">
                        {snippet}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="scrollbar-thin-dark flex-1 overflow-auto p-3">
              {tree.children.length > 0 ? (
                tree.children.map((node) => (
                  <FileTree
                    key={node.path}
                    node={node}
                    expandedPaths={expandedPaths}
                    forceExpand={normalizedQuery.length > 0}
                    selectedPath={selectedPath}
                    onToggleFolder={toggleFolder}
                    onOpenFile={(entry) => void openFile(entry)}
                  />
                ))
              ) : (
                <EmptyState
                  title={
                    entries.length
                      ? "No matching files or folders found."
                      : "Load a ZIP file to view its contents."
                  }
                />
              )}
            </div>
          </aside>

          <section className="arc-panel-strong flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-[28px]">
            <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-white">
                  {currentEntry?.path || "No file selected"}
                </h2>
                <p className="mt-1 text-sm text-[#8d9ab5]">
                  {currentEntry
                    ? `${currentEntry.ext ? currentEntry.ext.toUpperCase() : "FILE"} • ${formatBytes(
                        currentEntry.uncompressedSize
                      )}`
                    : "Choose a file from the left panel"}
                </p>
              </div>

              <div className="flex gap-2">
                <Button disabled={!currentEntry} onClick={() => void copyCurrent()}>
                  <Copy size={16} />
                  Copy
                </Button>
                <Button disabled={!currentEntry} onClick={downloadCurrent}>
                  <Download size={16} />
                  Download
                </Button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-5">
              {currentEntry ? (
                <PreviewPanel
                  entryName={currentEntry.path}
                  fileKind={fileKind}
                  textContent={textContent}
                  jsonContent={jsonContent}
                  blobUrl={blobUrl}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              ) : (
                <EmptyState
                  title="Nothing selected yet."
                  subtitle="Open a ZIP and pick a file to preview JSON, media, messages, documents, and more."
                />
              )}
            </div>
          </section>
        </section>

        <footer className="arc-panel rounded-[22px] px-5 py-3 text-sm text-[#8d9ab5]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span>
              {status}
              {isIndexing ? " Search is still building in the background." : ""}
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles size={14} className="text-[#6ae4ff]" />
              ArcUnzip by ArcNode
              {skippedFiles > 0
                ? ` • ${skippedFiles} oversized/unreadable text file${skippedFiles === 1 ? "" : "s"} skipped`
                : ""}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function makeSnippet(content: string, query: string) {
  if (!content) return "No preview available.";

  const normalizedContent = content.toLowerCase();
  const matchIndex = normalizedContent.indexOf(query);

  if (matchIndex === -1) {
    return content.slice(0, 180).replace(/\s+/g, " ").trim();
  }

  const start = Math.max(0, matchIndex - 70);
  const end = Math.min(content.length, matchIndex + query.length + 110);
  const snippet = content.slice(start, end).replace(/\s+/g, " ").trim();

  return `${start > 0 ? "…" : ""}${snippet}${end < content.length ? "…" : ""}`;
}
