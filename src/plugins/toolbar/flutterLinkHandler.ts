import { $getSelection, $isRangeSelection } from "lexical";
import { $isLinkNode } from "@lexical/link";

function handleLinkFlow(editor) {
  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) return;

    const node = selection.getNodes()[0];
    const parent = node.getParent();

    let selectedText = selection.getTextContent();
    let linkHref = "";

    if (parent && $isLinkNode(parent)) {
      linkHref = parent.getURL();
      selectedText = parent.getTextContent();
    } else if ($isLinkNode(node)) {
      linkHref = node.getURL();
      selectedText = node.getTextContent();
    }

    const finalText = selectedText?.trim() || "Link";
    const finalUrl = linkHref?.trim() || "https://";

    if (!window.MarkdownChannel) {
      console.warn("MarkdownChannel not available on window");
      return;
    }

    const message = {
      type: "link_selected",
      isLinkTrue: true,
      linkUrl: finalUrl,
      linkText: finalText,
    };

    console.log("Sending message:", message);
    window.MarkdownChannel.postMessage(JSON.stringify(message));
  });
}

export { handleLinkFlow };
