import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { $createTextNode, $isElementNode, $isParagraphNode, $isTextNode } from "lexical";
import { $isListNode } from "@lexical/list";
import { PreviewLinkNode } from "../../nodes/PreviewLinkNode";

function cleanAndApplyAlignment(node) {
  const children = node.getChildren();

  // Get combined text from all children
  let combinedText = "";
  children.forEach((child) => {
    combinedText += child.getTextContent().trim();
  });

  // Detect alignment and figure out the cleaned version
  let alignment: "center" | "left" | "right" | null = null;

  if (combinedText.startsWith("->") && combinedText.endsWith("<-")) {
    alignment = "center";
  } else if (combinedText.startsWith("->") && combinedText.endsWith("->")) {
    alignment = "right";
  } else if (combinedText.startsWith("<-") && combinedText.endsWith("<-")) {
    alignment = "left";
  }

  if (alignment) {
    node.setFormat(alignment);

    // Now update each child to remove arrows **from its own text** but keep formatting.
    children.forEach((child) => {
      if ($isTextNode(child)) {
        const oldText = child.getTextContent();
        const newText = cleanArrows(oldText);
        if (oldText !== newText) {
          const newTextNode = $createTextNode(newText);
          child.replace(newTextNode);
        }
      } else if ($isElementNode(child)) {
        // ✅ SAFELY handle elements like <strong>, <em>, <a>, etc.
        const grandChildren = child.getChildren();
        grandChildren.forEach((grandChild) => {
          if ($isTextNode(grandChild)) {
            const oldText = grandChild.getTextContent();
            const newText = cleanArrows(oldText);
            if (oldText !== newText) {
              const newTextNode = $createTextNode(newText);
              grandChild.replace(newTextNode);
            }
          }
        });
      }
    });
  }
}

// Utility to clean the arrows from text
function cleanArrows(text) {
  return text
    .replace(/^\s*->\s*/, "")
    .replace(/\s*<-\s*$/, "")
    .replace(/^\s*<-\s*/, "")
    .replace(/\s*->\s*$/, "");
}

// start to show markdown to text for edit note
function handleAlignment(nodes) {
  nodes.forEach((node) => {
    const isHeading = $isHeadingNode(node);
    const isParagraph = $isParagraphNode(node);
    const isQuote = $isQuoteNode(node);
    const isList = $isListNode(node);

    if (isHeading || isParagraph || isQuote) {
      cleanAndApplyAlignment(node);
    }

    if (isList) {
      // Loop through each <li> item in the list
      const listItems = node.getChildren(); // these are <li> nodes
      listItems.forEach((listItem) => {
        // We need to clean alignment inside each list item
        cleanAndApplyAlignment(listItem);
      });
    }
  });
}

function parsePreviewOptions(previewTag: string) {
  // Example: {link_type:'preview',text:'on',image:'on',embed:'off'}
  return {
    textOn: /text:'on'/.test(previewTag),
    imageOn: /image:'on'/.test(previewTag),
    embedOn: /embed:'on'/.test(previewTag),
    warningOn: /warning:'on'/.test(previewTag),
  };
}

function replacePreviewLinksWithPlaceholder(nodes) {
  nodes.forEach((node) => {
    if (!$isParagraphNode(node)) return;

    const text = node.getTextContent();
    // Find the preview link pattern
    const regex = /(https?:\/\/[^\s{}]+)\{link_type:'preview'[^}]*\}/g;
    let match;
    let lastIndex = 0;
    const newNodes: (ReturnType<typeof $createTextNode> | PreviewLinkNode)[] = [];

    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, url] = match;
      const start = match.index;
      const end = regex.lastIndex;

      // Text before the preview link
      if (start > lastIndex) {
        newNodes.push($createTextNode(text.slice(lastIndex, start)));
      }

      // Parse preview options
      const options = parsePreviewOptions(fullMatch.slice(url.length));
      // Insert PreviewLinkNode
      newNodes.push(new PreviewLinkNode(url, options.imageOn, options.textOn, options.embedOn, options.warningOn));

      lastIndex = end;
    }

    // Text after the last preview link
    if (lastIndex < text.length) {
      newNodes.push($createTextNode(text.slice(lastIndex)));
    }

    // Replace all children with new nodes
    if (newNodes.length > 0) {
      node.clear();
      newNodes.forEach((n) => node.append(n));
    }
  });
}

export { cleanAndApplyAlignment, cleanArrows, handleAlignment, replacePreviewLinksWithPlaceholder };
