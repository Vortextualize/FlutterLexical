import { $createParagraphNode, $createTextNode } from "lexical";
import type { ElementTransformer } from "@lexical/markdown";
import { PreviewLinkNode } from "../nodes/PreviewLinkNode";

const previewOptionsRegex = /\{link_type:'preview',([^}]*)\}/;

export const PreviewLinkMarkdownTransformer: ElementTransformer = {
  dependencies: [PreviewLinkNode],

  type: "element",

  regExp: /\[([^\]]+)\]\(([^)]+)\)\{link_type:'preview',([^}]*)\}/,

  export: (node) => {
    if (node instanceof PreviewLinkNode) {
      return `[Preview](${node.__url})`;
    }
    return null;
  },

  replace: (parentNode, matchedString, match) => {
    // match[1] = text, match[2] = url, match[3] = preview options
    const url = match[2];
    const optionsString = match[3] || "";
    const previewOptions = {
      textOn: !/text:'off'/.test(optionsString),
      imageOn: !/image:'off'/.test(optionsString),
      embedOn: /embed:'on'/.test(optionsString),
      warningOn: /warning:'on'/.test(optionsString),
    };

    const grandParent = parentNode.getParent();
    if (!grandParent) return;

    parentNode.remove();

    // Append PreviewLinkNode directly as a top-level node
    grandParent.append(new PreviewLinkNode(url, previewOptions.imageOn, previewOptions.textOn, previewOptions.embedOn, previewOptions.warningOn));
  },
};
