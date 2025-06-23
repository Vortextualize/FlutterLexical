import { $createParagraphNode, $createTextNode } from "lexical";
import type { ElementTransformer } from "@lexical/markdown";
import { PreviewLinkNode } from "../nodes/PreviewLinkNode";

const previewOptionsRegex = /\{link_type:'preview',([^}]*)\}/;

function parsePreviewOptions(markdown: string) {
  const match = previewOptionsRegex.exec(markdown);
  if (!match) return { textOn: true, imageOn: true, embedOn: false };

  const options = match[1];
  return {
    textOn: !/text:'off'/.test(options),
    imageOn: !/image:'off'/.test(options),
    embedOn: /embed:'on'/.test(options),
  };
}

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
    };

    const grandParent = parentNode.getParent();
    if (!grandParent) return;

    parentNode.remove();

    const previewPara = $createParagraphNode();
    previewPara.append(new PreviewLinkNode(url, previewOptions.imageOn, previewOptions.textOn, previewOptions.embedOn));
    grandParent.append(previewPara);
  },
};
