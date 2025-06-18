// ########## start add alignments to markdown ##########

import { $getRoot, $isDecoratorNode, $isParagraphNode, $isTextNode } from "lexical";
import { $isLinkNode } from "@lexical/link";
import { $isHeadingNode } from "@lexical/rich-text";
import { $isListNode } from "@lexical/list";
import { PreviewLinkNode } from "../../nodes/PreviewLinkNode";

type Alignment = "left" | "center" | "right";

export function applyAlignmentMarkers(content: string, align: Alignment): string {
  if (!content) return content;

  // Detect if it's a full Markdown link (leave as is)
  const markdownLinkRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
  if (markdownLinkRegex.test(content)) {
    // It's a full markdown link, just wrap it as is
    switch (align) {
      case "center":
        return `->${content}<-`;
      case "right":
        return `->${content}->`;
      case "left":
      default:
        return `<-${content}<-`;
    }
  }

  // Detect if it's a bare URL (convert to markdown link first)
  const bareUrlRegex = /^(https?:\/\/[^\s]+)$/;
  if (bareUrlRegex.test(content)) {
    const url = content.trim();
    const mdLink = `[${url}](${url})`;
    switch (align) {
      case "center":
        return `->${mdLink}<-`;
      case "right":
        return `->${mdLink}->`;
      case "left":
      default:
        return `<-${mdLink}<-`;
    }
  }

  // Default case: wrap the content
  switch (align) {
    case "center":
      return `->${content}<-`;
    case "right":
      return `->${content}->`;
    case "left":
    default:
      return `<-${content}<-`;
  }
}

export function getNodeAlignment(editor: any, node: any): Alignment {
  try {
    const dom = editor.getElementByKey(node.getKey());
    const align = dom?.style?.textAlign?.toLowerCase();
    return align === "center" || align === "right" ? align : "left";
  } catch (e) {
    console.warn("Failed to get alignment for node", e);
    return "left";
  }
}

export function serializeNodeToMarkdown(node: any): string {
  if (node instanceof PreviewLinkNode) {
    // Match your transformer export
    // return `[Preview](${node.__url})`;
    return `[${node.__url}](${node.__url}){link_type:'preview',text:'${node.__textOn ? "on" : "off"}',image:'${node.__imageOn ? "on" : "off"}',embed:'${node.__embedOn ? "on" : "off"}'}`;
  }
  if ($isTextNode(node)) {
    let text = node.getTextContent();
    if (node.hasFormat && node.hasFormat("bold")) {
      text = `**${text}**`;
    }
    if (node.hasFormat && node.hasFormat("italic")) {
      text = `*${text}*`;
    }
    // Handle bold+italic
    if (node.hasFormat && node.hasFormat("bold") && node.hasFormat("italic")) {
      text = `***${node.getTextContent()}***`;
    }
    return text;
  }
  // For link nodes
  if ($isLinkNode(node)) {
    const children = node.getChildren().map(serializeNodeToMarkdown).join("");
    const url = node.getURL();

    // return `[${children}](${url})`;

    // If the link text is the same as the URL, treat as "simple"
    if (children === url) {
      return `[${url}](${url}){link_type:'simple'}`;
    }
    // Otherwise, normal markdown link
    return `[${children}](${url}){link_type:'simple'}`;
  }
  // For other nodes, recursively serialize children
  if (node.getChildren) {
    return node.getChildren().map(serializeNodeToMarkdown).join("");
  }
  return "";
}

export function nodeToMarkdownWithAlignment(editor: any, node: any): string {
  // Heading node
  if ($isHeadingNode(node)) {
    const align = getNodeAlignment(editor, node);
    const content = serializeNodeToMarkdown(node);
    const tag = node.getTag && node.getTag();
    let hashes = "#";
    if (tag && /^h[1-6]$/.test(tag)) {
      hashes = "#".repeat(Number(tag[1]));
    }
    return `${hashes} ${applyAlignmentMarkers(content, align)}`;
  }

  // Paragraph node
  if ($isParagraphNode(node)) {
    const align = getNodeAlignment(editor, node);
    const content = serializeNodeToMarkdown(node);
    return applyAlignmentMarkers(content, align);
  }

  // List node
  if ($isListNode(node)) {
    return node
      .getChildren()
      .map((item: any, idx: number) => {
        const align = getNodeAlignment(editor, item);
        const content = serializeNodeToMarkdown(item);
        const marker = node.getListType() === "number" ? `${idx + 1}. ` : "- ";
        return marker + applyAlignmentMarkers(content, align);
      })
      .join("\n");
  }

  // Quote node
  if (node.getType() === "quote") {
    const align = getNodeAlignment(editor, node);
    const content = serializeNodeToMarkdown(node);
    return `> ${applyAlignmentMarkers(content, align)}`;
  }

  // Fallback: just text
  return serializeNodeToMarkdown(node);
}

export function addAlignmentMarkersToMarkdown(editor: any): string {
  let result: string[] = [];
  editor.getEditorState().read(() => {
    const root = $getRoot();
    for (const node of root.getChildren()) {
      if ($isDecoratorNode(node)) continue;
      result.push(nodeToMarkdownWithAlignment(editor, node));
    }
  });
  return result.join("\n\n"); // double newlines between blocks
}

export function exportMarkdownWithAlignment(editor: any): string {
  let result: string[] = [];
  editor.getEditorState().read(() => {
    const root = $getRoot();
    for (const node of root.getChildren()) {
      result.push(nodeToMarkdownWithAlignment(editor, node));
    }
  });
  return result.join("\n\n"); // double newlines between blocks
}

// ########## end add alignments to markdown ##########
