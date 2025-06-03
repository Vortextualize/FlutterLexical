import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createTextNode, $getRoot } from "lexical";
import * as React from "react";
import { useCallback } from "react";

import { PLAYGROUND_TRANSFORMERS } from "./MarkdownTransformers.tsx";

export default function ActionsPlugin() {
  const [editor] = useLexicalComposerContext();

  // const handleMarkdownToggle = useCallback(() => {
  //   editor.update(() => {
  //     const root = $getRoot();
  //     const firstChild = root.getFirstChild();
  //     if ($isCodeNode(firstChild) && firstChild.getLanguage() === "markdown") {
  //       $convertFromMarkdownString(firstChild.getTextContent(), PLAYGROUND_TRANSFORMERS);
  //     } else {
  //       const markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
  //       root.clear().append($createCodeNode("markdown").append($createTextNode(markdown)));
  //     }
  //     root.selectEnd();
  //   });
  // }, [editor]);

  const handleMarkdownToggle = useCallback(() => {
    editor.update(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChild();

      if ($isCodeNode(firstChild) && firstChild.getLanguage() === "markdown") {
        // Convert from markdown to rich text
        const markdown = firstChild.getTextContent();
        $convertFromMarkdownString(markdown, PLAYGROUND_TRANSFORMERS);
      } else {
        // Convert rich text to markdown
        const markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);

        // Debug output
        console.log("Generated Markdown:", markdown);

        root.clear().append($createCodeNode("markdown").append($createTextNode(markdown)));
      }
      root.selectEnd();
    });
  }, [editor]);

  return (
    <div className="actions">
      <button className="action-button" onClick={handleMarkdownToggle} title="Convert From Markdown" aria-label="Convert from markdown">
        <i className="markdown" />
      </button>
    </div>
  );
}
