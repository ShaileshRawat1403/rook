import { visitParents } from "unist-util-visit-parents";
import type { Plugin } from "unified";
import type { Root, Text, Link, Parent, RootContent } from "mdast";

// Heuristic to match paths like:
// - /absolute/path/to/file.ts
// - ~/home/dir/file.txt
// - ./relative/file.rs
// - src/main.ts
// - src/components/Button.tsx
// It requires at least one slash and an extension at the end of the last segment,
// or starting explicitly with /, ~/, ./, ../
const PATH_REGEX =
  /(?:(?:^|\s)(?:(?:\/|~\/|\.\/|\.\.\/)[a-zA-Z0-9_.-][a-zA-Z0-9_/.-]+)|(?:[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_/.-]+\.[a-zA-Z0-9]{1,12}))(?=\s|$|[.,;:!?"')\]}])/g;

export const remarkFilePaths: Plugin<[], Root> = () => {
  return (tree) => {
    visitParents(tree, "text", (node: Text, ancestors: Parent[]) => {
      // Skip if inside link, html, or code
      const isInsideExcludedNode = ancestors.some(
        (ancestor) =>
          ancestor.type === "link" ||
          ancestor.type === "code" ||
          ancestor.type === "inlineCode" ||
          ancestor.type === "html" ||
          ancestor.type === "image",
      );

      if (isInsideExcludedNode) {
        return;
      }

      const value = node.value;
      const matches = [...value.matchAll(PATH_REGEX)];

      if (matches.length === 0) return;

      const parent = ancestors[ancestors.length - 1];
      const index = parent.children.indexOf(node);
      if (index === -1) return;

      const newChildren: RootContent[] = [];
      let lastIndex = 0;

      for (const match of matches) {
        const matchStart = match.index ?? 0;
        const matchEnd = matchStart + match[0].length;

        let matchedText = match[0];
        // Strip leading whitespace if captured by the regex (?:^|\s)
        let startOffset = 0;
        if (matchedText.startsWith(" ") || matchedText.startsWith("\n")) {
          startOffset = 1;
          matchedText = matchedText.slice(1);
        }

        const actualStart = matchStart + startOffset;

        // Push preceding text
        if (actualStart > lastIndex) {
          newChildren.push({
            type: "text",
            value: value.slice(lastIndex, actualStart),
          } as Text);
        }

        // Create the link node
        newChildren.push({
          type: "link",
          url: `rook-file://${matchedText}`,
          children: [{ type: "text", value: matchedText } as Text],
          data: {
            hProperties: {
              className: "rook-file-link",
            },
          },
        } as Link);

        lastIndex = matchEnd;
      }

      // Push trailing text
      if (lastIndex < value.length) {
        newChildren.push({
          type: "text",
          value: value.slice(lastIndex),
        } as Text);
      }

      // Replace the text node with the new nodes
      parent.children.splice(index, 1, ...newChildren);

      // Tell visitParents to skip over the newly inserted nodes to avoid infinite loops
      return index + newChildren.length;
    });
  };
};
