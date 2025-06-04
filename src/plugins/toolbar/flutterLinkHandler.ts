import { $getSelection, $isRangeSelection } from "lexical";
import { $isLinkNode } from "@lexical/link";

function handleLinkFlow(editor) {
  editor.update(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      // Get first selected node (or parent if link)
      const node = selection.getNodes()[0];
      const parent = node.getParent();

      let selectedText = selection.getTextContent();
      let linkHref = "";

      // Check if parent is a link
      if (parent && $isLinkNode(parent)) {
        linkHref = parent.getURL();
        selectedText = parent.getTextContent();
      }

      // Or the node itself is a link
      else if ($isLinkNode(node)) {
        linkHref = node.getURL();
        selectedText = node.getTextContent();
      }

      const finalText = selectedText.trim() !== "" ? selectedText : "Link";
      const finalUrl = linkHref;

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

      console.log("Sending message:", JSON.stringify(message));
      window.MarkdownChannel.postMessage(JSON.stringify(message));
    }
  });
}

export { handleLinkFlow };
