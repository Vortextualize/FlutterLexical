import { $getSelection, $isRangeSelection } from "lexical";
import { $isLinkNode } from "@lexical/link";

// Get the selected node in the current selection
function getSelectedNode(selection: any) {
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();

  if (anchorNode === focusNode) {
    return anchorNode;
  }

  const isBackward = selection.isBackward();
  return isBackward ? (focusNode.isAtNodeEnd() ? anchorNode : focusNode) : anchorNode.isAtNodeEnd() ? focusNode : anchorNode;
}

// Extract info about selected text (works for both link and non-link selections)
export function getSelectedTextInfo(editor: any): {
  url: string;
  text: string;
  isLink: boolean;
} {
  let selectedText = "";
  let linkUrl = "";
  let isLink = false;

  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      selectedText = selection.getTextContent();

      const node = getSelectedNode(selection);
      const linkNode = $isLinkNode(node) ? node : $isLinkNode(node.getParent()) ? node.getParent() : null;

      if (linkNode) {
        isLink = true;
        linkUrl = linkNode.getURL?.() ?? "";
      }
    }
  });

  return { url: linkUrl, text: selectedText, isLink };
}

// Send extracted info to Flutter via MarkdownChannel
export function sendTextInfoToFlutter({ url, text, isLink }: { url: string; text: string; isLink: boolean }) {
  if (!window.MarkdownChannel) return;
  const finalUrl = url && url.trim() !== "" ? url : "https://";
  const finalText = text && text.trim() !== "" ? text : "Link";

  console.log(
    "Sending to Flutter:",
    JSON.stringify(
      {
        type: "link_selected",
        isLinkTrue: true,
        isAlreadyLink: isLink,
        linkUrl: finalUrl,
        linkText: finalText,
      },
      null,
      2
    )
  );

  const message = {
    type: "link_selected",
    isAlreadyLink: isLink,
    isLinkTrue: true,
    linkUrl: finalUrl,
    linkText: finalText,
  };

  console.log("Sending to Flutter:", message.linkText);

  window.MarkdownChannel.postMessage(JSON.stringify(message));
}
