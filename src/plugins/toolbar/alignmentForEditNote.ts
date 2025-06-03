import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { $createTextNode, $isElementNode, $isParagraphNode, $isTextNode } from "lexical";
import { $isListNode } from "@lexical/list";

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

export { cleanAndApplyAlignment, cleanArrows, handleAlignment };
