import { TreeNode, ZipEntryItem } from "./types";

type MutableTreeNode = TreeNode & {
  childrenMap?: Map<string, MutableTreeNode>;
};

export function buildTree(entries: ZipEntryItem[]): TreeNode {
  const root: MutableTreeNode = {
    name: "",
    path: "",
    type: "folder",
    children: [],
    childrenMap: new Map(),
  };

  for (const entry of entries) {
    const cleanPath = entry.path.replace(/\/$/, "");
    if (!cleanPath) continue;

    const parts = cleanPath.split("/");
    let current = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = index === parts.length - 1;
      const shouldBeFile = isLast && !entry.isDir;

      if (!current.childrenMap?.has(part)) {
        const node: MutableTreeNode = {
          name: part,
          path: currentPath,
          type: shouldBeFile ? "file" : "folder",
          children: [],
          childrenMap: new Map(),
          entry: shouldBeFile ? entry : undefined,
        };

        current.childrenMap?.set(part, node);
        current.children.push(node);
      }

      const nextNode = current.childrenMap?.get(part);
      if (!nextNode) return;

      if (shouldBeFile) {
        nextNode.type = "file";
        nextNode.entry = entry;
      }

      current = nextNode;
    });
  }

  sortTree(root);
  cleanupTree(root);
  return root;
}

function sortTree(node: MutableTreeNode) {
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  node.children.forEach((child) => sortTree(child as MutableTreeNode));
}

function cleanupTree(node: MutableTreeNode) {
  delete node.childrenMap;
  node.children.forEach((child) => cleanupTree(child as MutableTreeNode));
}

export function filterTree(node: TreeNode, query: string): TreeNode | null {
  if (!query) return node;

  if (node.type === "file") {
    return node.path.toLowerCase().includes(query) ? node : null;
  }

  const filteredChildren = node.children
    .map((child) => filterTree(child, query))
    .filter(Boolean) as TreeNode[];

  const folderMatches = node.path.toLowerCase().includes(query);

  if (folderMatches || filteredChildren.length > 0 || node.path === "") {
    return {
      ...node,
      children: folderMatches ? node.children : filteredChildren,
    };
  }

  return null;
}

export function collectFolderPaths(node: TreeNode, result: string[]) {
  if (node.type === "folder") result.push(node.path);
  node.children.forEach((child) => collectFolderPaths(child, result));
}
