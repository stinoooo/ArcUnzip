"use client";

import {
  AudioLines,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileImage,
  FileJson2,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  Package,
  ReceiptText,
} from "lucide-react";
import { TreeNode, ZipEntryItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  PDF_EXTENSIONS,
  TEXT_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from "@/lib/file-utils";

type Props = {
  node: TreeNode;
  depth?: number;
  expandedPaths: Set<string>;
  forceExpand?: boolean;
  selectedPath: string | null;
  onToggleFolder: (path: string) => void;
  onOpenFile: (entry: ZipEntryItem) => void;
};

function FileKindIcon({ ext, folderOpen = false }: { ext?: string; folderOpen?: boolean }) {
  if (ext === "__folder") {
    return folderOpen ? <FolderOpen size={16} /> : <Folder size={16} />;
  }
  if (!ext) return <Package size={16} />;
  if (ext === "json") return <FileJson2 size={16} />;
  if (IMAGE_EXTENSIONS.has(ext)) return <FileImage size={16} />;
  if (VIDEO_EXTENSIONS.has(ext)) return <FileVideo size={16} />;
  if (AUDIO_EXTENSIONS.has(ext)) return <AudioLines size={16} />;
  if (PDF_EXTENSIONS.has(ext)) return <ReceiptText size={16} />;
  if (TEXT_EXTENSIONS.has(ext)) return <FileCode2 size={16} />;
  return <FileText size={16} />;
}

export function FileTree({
  node,
  depth = 0,
  expandedPaths,
  forceExpand = false,
  selectedPath,
  onToggleFolder,
  onOpenFile,
}: Props) {
  const isFolder = node.type === "folder";
  const isExpanded = forceExpand || expandedPaths.has(node.path);

  if (isFolder) {
    return (
      <div className="block">
        {node.path !== "" ? (
          <button
            type="button"
            onClick={() => onToggleFolder(node.path)}
            className="flex min-h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-[#e8ecf5] transition hover:bg-[#6ae4ff]/8"
            style={{ paddingLeft: `${depth * 18 + 10}px` }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <FileKindIcon ext="__folder" folderOpen={isExpanded} />
            <span className="truncate">{node.name}</span>
          </button>
        ) : null}

        {isExpanded || node.path === "" ? (
          <div>
            {node.children.map((child) => (
              <FileTree
                key={child.path}
                node={child}
                depth={node.path === "" ? depth : depth + 1}
                expandedPaths={expandedPaths}
                forceExpand={forceExpand}
                selectedPath={selectedPath}
                onToggleFolder={onToggleFolder}
                onOpenFile={onOpenFile}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => node.entry && onOpenFile(node.entry)}
      className={cn(
        "flex min-h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm transition",
        selectedPath === node.path
          ? "border border-[#6ae4ff]/20 bg-[#6ae4ff]/14 text-white"
          : "text-[#e8ecf5] hover:bg-[#6ae4ff]/8"
      )}
      style={{ paddingLeft: `${depth * 18 + 28}px` }}
    >
      <span className="w-4 shrink-0" />
      <FileKindIcon ext={node.entry?.ext} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
