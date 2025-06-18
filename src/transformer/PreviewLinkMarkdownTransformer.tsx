import { $createParagraphNode, $createTextNode } from "lexical";
import type { ElementTransformer } from "@lexical/markdown";
import { PreviewLinkNode } from "../nodes/PreviewLinkNode";

export const PreviewLinkMarkdownTransformer: ElementTransformer = {
  dependencies: [PreviewLinkNode],

  type: "element",

  regExp: /\[Preview\]\((.*?)\)/,

  export: (node) => {
    if (node instanceof PreviewLinkNode) {
      return `[Preview](${node.__url})`;
    }
    return null;
  },

  replace: (parentNode, matchedString, match) => {
    const url = match[1];
    const fullText = parentNode.getTextContent();
    const matchStr = typeof matchedString === "string" ? matchedString : String(matchedString);
    const matchStart = fullText.indexOf(matchStr);
    const matchEnd = matchStart + matchedString.length;

    if (matchStart === -1) return;

    const beforeText = fullText.slice(0, matchStart).trimEnd();
    const afterText = fullText.slice(matchEnd).trimStart();

    const grandParent = parentNode.getParent();
    if (!grandParent) return;

    parentNode.remove();

    // 1. Line before preview
    if (beforeText) {
      const beforePara = $createParagraphNode();
      beforePara.append($createTextNode(beforeText));
      grandParent.append(beforePara);
    }

    // 2. The preview box on its own line
    const previewPara = $createParagraphNode();
    previewPara.append(new PreviewLinkNode(url));
    grandParent.append(previewPara);

    // 3. Line after preview
    if (afterText) {
      const afterPara = $createParagraphNode();
      afterPara.append($createTextNode(afterText));
      grandParent.append(afterPara);
    }
  },
};
