import { useState } from "react";
import ExampleTheme from "../themes/ExampleTheme.tsx";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import ToolbarPlugin from "../plugins/ToolbarPlugin.tsx";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { HashtagNode } from "@lexical/hashtag";
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin";

// import ActionsPlugin from "../plugins/ActionsPlugin.tsx";
import CodeHighlightPlugin from "../plugins/CodeHighlightPlugin.tsx";
import DraggableBlockPlugin from "../plugins/DraggableBlockPlugin.tsx";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
// import TreeViewPlugin from "../plugins/TreeViewPlugin.tsx";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import PlaygroundAutoLinkPlugin from "../plugins/AutoLinkPlugin.tsx";
import { MentionNode } from "../nodes/MentionNode.ts";
import MentionsPlugin from "../plugins/MentionsPlugin.tsx";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
// import prepopulatedText from "./SampleText.tsx";

function Placeholder() {
  return <div className="editor-placeholder">Type something...</div>;
}

const editorConfig = {
  // editorState: prepopulatedText,
  theme: ExampleTheme,
  // Handling of errors during update
  onError(error) {
    throw error;
  },
  // Any custom nodes go here
  nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, CodeNode, CodeHighlightNode, AutoLinkNode, LinkNode, HashtagNode, MentionNode],
};

export default function Editor() {
  const [floatingAnchorElem, setFloatingAnchorElem] = useState(null);

  const onRef = (_floatingAnchorElem) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="editor-container">
        <ToolbarPlugin />
        <div className="editor-inner" ref={onRef}>
          <RichTextPlugin contentEditable={<ContentEditable className="editor-input" />} placeholder={<Placeholder />} ErrorBoundary={LexicalErrorBoundary} />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <PlaygroundAutoLinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <CodeHighlightPlugin />
          <CheckListPlugin />
          {/* <ListMaxIndentLevelPlugin maxDepth={7} /> */}
          {floatingAnchorElem && <DraggableBlockPlugin anchorElem={floatingAnchorElem} />}
        </div>

        {/* <TreeViewPlugin /> */}
        <HashtagPlugin />
        <MentionsPlugin />
        {/* <ActionsPlugin /> */}
      </div>
    </LexicalComposer>
  );
}
