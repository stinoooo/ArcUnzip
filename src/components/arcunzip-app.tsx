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
import { buildTree, collectFolderPaths, filterTree } from "@/lib/tree-utils";
import { detectFileKind, getBaseName, getExtension, getMimeType } from "@/lib/file-utils";
import { formatBytes } from "@/lib/utils";

zip.configure({ useWebWorkers: true });

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

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const tree = useMemo(() => buildTree(entries), [entries]);
  const filteredTree = useMemo(() => {
    const result = filterTree(tree, search.trim().toLowerCase());
    return result;
  }, [tree, search]);

  const jsonCount = useMemo(
    () => entries.filter((entry) => !entry.isDir && entry.ext === "json").length,
    [entries]
  );

  async function handleZipUpload(file: File) {
    resetViewer();
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
      setStatus(`Loaded "${file.name}".`);

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

      if (kind === "image" || kind === "video" || kind === "audio" || kind === "pdf") {
        const blob = await rawEntry.getData(new zip.BlobWriter(getMimeType(entry.ext)));
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
    collectFolderPaths(tree, paths);
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
      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/bluelogo.svg"
                alt="ArcUnzip"
                className="h-14 w-14 rounded-2xl object-contain"
              />

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-white">ArcUnzip</h1>
                  <span className="rounded-full border border-[#6ae4ff]/20 bg-[#6ae4ff]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#6ae4ff]">
                    ArcNode
                  </span>
                </div>

                <p className="mt-1 text-sm text-[#8d9ab5]">
                  Browse ZIP archives beautifully. No, not your pants, you filthy animal.
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
                  placeholder="Search files and folders..."
                  className="h-11 w-full min-w-[280px] rounded-2xl border border-white/10 bg-[#0b1020]/70 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-[#8d9ab5] focus:border-[#6ae4ff]/35 focus:ring-4 focus:ring-[#6ae4ff]/10"
                />
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Archive" value={archiveName} />
          <StatCard label="Entries" value={String(entries.length)} />
          <StatCard label="JSON Files" value={String(jsonCount)} />
          <StatCard label="Selected" value={selectedPath || "None"} />
        </section>

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="arc-panel-strong flex min-h-[320px] flex-col overflow-hidden rounded-[28px]">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-2 text-white">
                <FolderTree size={18} className="text-[#6ae4ff]" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">Explorer</h2>
              </div>

              <div className="flex gap-2">
                <Button className="h-9 rounded-xl px-3 text-xs" onClick={expandAll}>
                  Expand all
                </Button>
                <Button className="h-9 rounded-xl px-3 text-xs" onClick={collapseAll}>
                  Collapse all
                </Button>
              </div>
            </div>

            <div className="scrollbar-thin-dark flex-1 overflow-auto p-3">
              {filteredTree && filteredTree.children.length > 0 ? (
                filteredTree.children.map((node) => (
                  <FileTree
                    key={node.path}
                    node={node}
                    expandedPaths={expandedPaths}
                    forceExpand={search.trim().length > 0}
                    selectedPath={selectedPath}
                    onToggleFolder={toggleFolder}
                    onOpenFile={(entry) => void openFile(entry)}
                  />
                ))
              ) : (
                <EmptyState
                  title={entries.length ? "No matching files or folders found." : "Load a ZIP file to view its contents."}
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
            <span>{status}</span>
            <span className="inline-flex items-center gap-2">
              <Sparkles size={14} className="text-[#6ae4ff]" />
              ArcUnzip by ArcNode
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
