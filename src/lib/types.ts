export type ZipEntryItem = {
  path: string;
  name: string;
  isDir: boolean;
  ext: string;
  raw: unknown;
  uncompressedSize: number;
  compressedSize: number;
};

export type TreeNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children: TreeNode[];
  entry?: ZipEntryItem;
};

export type PreviewTab = {
  key: string;
  label: string;
};

export type MessageLike = {
  author: string;
  content: string;
  timestamp?: string;
  id?: string;
  type?: string;
  extra?: Record<string, unknown>;
};
