import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  RootNode,
  $getRoot,
  $isTextNode,
  $insertNodes,
} from "lexical";
import { $wrapNodes, $trimTextContentFromAnchor } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND, $isListNode, ListNode } from "@lexical/list";
import { $createHeadingNode, $createQuoteNode, $isHeadingNode } from "@lexical/rich-text";
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { PLAYGROUND_TRANSFORMERS } from "../transformer/MarkdownTransformers.tsx";
import { useWebSocket } from "../context/WebSocketContext.tsx";
import { handleAlignment } from "./toolbar/alignmentForEditNote.ts";
import { LowPriority } from "./toolbar/editorPriorities.ts";
import { addAlignmentMarkersToMarkdown, exportMarkdownWithAlignment } from "./toolbar/markdownAlignmentHelpers.ts";
import { useFlutterLinkHandler } from "./toolbar/flutterLinkHandler.ts";
import { PreviewLinkNode } from "../nodes/PreviewLinkNode.js";

declare global {
  interface Window {
    MarkdownChannel?: {
      postMessage: (message: string) => void;
    };
    unfocusEditor?: () => void;
    focusEditor?: () => void;
  }
}

export default function ToolbarPlugin() {
  //   for socket connection
  const { setAppToken } = useWebSocket();

  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  // const [isCode, setIsCode] = useState(false);

  const [isFocused, setIsFocused] = useState<boolean>(false);

  const canUndoRef = useRef<boolean>(false);
  const canRedoRef = useRef<boolean>(false);
  const isBoldRef = useRef<boolean>(false);
  const isItalicRef = useRef<boolean>(false);
  const blockTypeRef = useRef<string>("paragraph");
  const isLinkClickedRef = useRef<boolean>(false);
  const clickedLinkTypeRef = useRef<string>("");
  const alignmentRef = useRef<string>("left");
  const toggleMarkdownRef = useRef<boolean>(false);

  const [markdownForEdit, setMarkdownForEdit] = useState<string>("");

  const { insertLink, updateLink, onUnlink, onCloseLink, startLinkFlow, addPreview } = useFlutterLinkHandler(editor, isLinkClickedRef, clickedLinkTypeRef);

  // to restrict the length of the text in the input field
  const maxLength = Number(process.env.MAX_CHARACTERS_COUNT || 440);
  const markdownLength = Number(process.env.MARKDOWN_MAX_CHARACTERS_COUNT || 2500);

  useEffect(() => {
    return editor.registerNodeTransform(RootNode, (rootNode) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return;
      }

      const markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
      const prevEditorState = editor.getEditorState();
      const prevTextContentSize = prevEditorState.read(() => rootNode.getTextContentSize());
      const textContentSize = rootNode.getTextContentSize();

      console.log(markdown.length, "Markdown length", textContentSize);

      if (prevTextContentSize !== textContentSize) {
        const delCount = textContentSize - maxLength;
        const anchor = selection.anchor;

        if (delCount > 0) {
          $trimTextContentFromAnchor(editor, anchor, delCount);

          // Optionally show a warning only once
          console.warn(`Character limit of ${maxLength} reached`);
        } else if (markdown.length > markdownLength) {
          // If markdown limit is exceeded, prevent more input
          $trimTextContentFromAnchor(editor, anchor, markdown.length - markdownLength);
          console.warn(`Markdown limit of ${markdownLength} reached`);
        }
      }
    });
  }, [editor, markdownLength, maxLength]);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      const parentList = $getNearestNodeOfType(anchorNode, ListNode);
      const listType = parentList?.getListType();
      const element = anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);
      if (elementDOM !== null) {
        if ($isListNode(element)) {
          blockTypeRef.current = listType || "paragraph";
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          blockTypeRef.current = type;
        }
        const align = elementDOM.style.textAlign || "left";
        alignmentRef.current = align;
      }
      // Update text format
      const boldFormat = selection.hasFormat("bold");
      isBoldRef.current = boldFormat;

      const italicFormat = selection.hasFormat("italic");
      isItalicRef.current = italicFormat;

      // setIsCode(selection.hasFormat("code"));
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, newEditor) => {
          updateToolbar();
          return false;
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          canUndoRef.current = payload;
          return false;
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          canRedoRef.current = payload;
          return false;
        },
        LowPriority
      )
    );
  }, [editor, updateToolbar]);

  // toggle for markdown
  const [isGray, setIsGray] = useState(false);

  const handleMarkdownToggle = useCallback(() => {
    setIsGray((prevIsGray) => {
      const newColor = prevIsGray ? "#ffffff" : "#f9f9f9";

      // Update body color
      document.body.style.backgroundColor = newColor;

      // Update all .editor-inner elements
      const editors = document.querySelectorAll(".editor-inner");
      editors.forEach((el) => {
        (el as HTMLElement).style.backgroundColor = newColor;
      });

      editor.update(() => {
        const root = $getRoot();
        const firstChild = root.getFirstChild();
        if ($isCodeNode(firstChild) && firstChild.getLanguage() === "markdown") {
          toggleMarkdownRef.current = false;
          // Use your custom import logic here if needed
          $convertFromMarkdownString(firstChild.getTextContent(), PLAYGROUND_TRANSFORMERS);
        } else {
          toggleMarkdownRef.current = true;
          // Use your custom export function here!
          const markdown = exportMarkdownWithAlignment(editor);
          root.clear().append($createCodeNode("markdown").append($createTextNode(markdown)));
        }
        root.selectEnd();
      });
      return !prevIsGray;
    });
  }, [editor]);

  // to send changes to Flutter
  useEffect(() => {
    const editorElement = document.querySelector('[contenteditable="true"]') as HTMLElement | null;

    // Function to update markdown content, empty status, and focus status
    const updateMarkdownContent = () => {
      editor.update(() => {
        let markdown = "";

        // This must capture everything before applying alignment
        // markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
        // console.log("markdown", markdown, canUndoRef.current, canRedoRef.current, isBoldRef.current, isItalicRef.current, blockTypeRef.current, isLinkClickedRef.current, alignmentRef.current);
        // console.log("Raw markdown lines", markdown.split("\n"));

        // markdown = addAlignmentMarkersToMarkdown(editor);
        markdown = exportMarkdownWithAlignment(editor);
        console.log("Final markdown with alignments", markdown);

        // Check if content is empty
        const isEmpty = markdown.replace(/(->|<-)|\s+/g, "").length === 0;

        // Get height
        const height = editorElement?.scrollHeight || 300;

        // console.log("Sent Content Status Height:", isEmpty, height);

        // Send both markdown and empty status to Flutter
        if (window.MarkdownChannel) {
          // Send markdown
          window.MarkdownChannel.postMessage(
            JSON.stringify({
              type: "markdown",
              markdown: markdown,
              canUndo: canUndoRef.current,
              canRedo: canRedoRef.current,
              isBold: isBoldRef.current,
              isItalic: isItalicRef.current,
              blockType: blockTypeRef.current,
              isLinkClicked: isLinkClickedRef.current,
              alignment: alignmentRef.current,
              toggleMarkdown: toggleMarkdownRef.current,
              height: height,
            })
          );
          // Send empty status
          window.MarkdownChannel.postMessage(
            JSON.stringify({
              type: "content_status",
              empty: isEmpty,
            })
          );
          // Send focus status
          window.MarkdownChannel.postMessage(
            JSON.stringify({
              type: "focus_event",
              focused: document.activeElement === editorElement,
            })
          );

          console.log("Sent markdown:", markdown);
          console.log("Sent content status:", isEmpty);
          console.log("Sent focus status:", isFocused);
        }
      });
    };

    // grandparent class
    let linkClass = "";

    // Set up focus and blur listeners
    const handleFocus = () => {
      setIsFocused(true);
      updateMarkdownContent();
      // console.log("Editor focused");
    };

    const handleBlur = (e: FocusEvent) => {
      // If blur target is a link editor popup, ignore
      const relatedTarget = e.relatedTarget as HTMLElement;
      const isInsidePopup = relatedTarget?.closest(".link-editor");
      if (relatedTarget) {
        const parent = relatedTarget.parentElement;
        const grandparent = parent?.parentElement || null;
        if (grandparent) {
          const style = window.getComputedStyle(grandparent);
          linkClass = style.display;
          // console.log("Grandparent:", grandparent, linkClass);
        }
        updateMarkdownContent();
      }

      if (!isInsidePopup) {
        setIsFocused(false);
        isLinkClickedRef.current = false;
        // console.log("Editor blurred");
      }
    };

    if (editorElement) {
      editorElement.addEventListener("focus", handleFocus);
      editorElement.addEventListener("blur", handleBlur);
    }

    // Check initial focus on mount
    setTimeout(() => {
      if (document.activeElement === editorElement) {
        setIsFocused(true);
        // console.log("Editor was already focused on mount");
      }
      updateMarkdownContent(); // send initial state to Flutter
    }, 0);

    // Register listener for editor state changes
    const unsubscribe = editor.registerUpdateListener(() => {
      updateMarkdownContent();
    });

    // Add Flutter-accessible window methods
    window.focusEditor = function () {
      editorElement?.focus();
      console.log("Focus triggered by Flutter");
      setTimeout(updateMarkdownContent, 0);
    };

    window.unfocusEditor = function () {
      editorElement?.blur();
      console.log("Blur triggered by Flutter");
      setTimeout(updateMarkdownContent, 0);
    };

    // Global body click handler to re-focus editor
    const handleBodyClick = (event: MouseEvent) => {
      if (linkClass !== "block") {
        setIsFocused(true);
        editorElement?.focus();
      } else {
        linkClass = "";
      }
      // console.log("Click was inside doc");
    };

    document.addEventListener("click", handleBodyClick, true);

    return () => {
      if (editorElement) {
        editorElement.removeEventListener("focus", handleFocus);
        editorElement.removeEventListener("blur", handleBlur);
      }
      document.removeEventListener("click", handleBodyClick, true);
      delete window.focusEditor;
      delete window.unfocusEditor;
      unsubscribe();
    };
  }, [editor]);

  //  to listen event from Flutter
  useEffect(() => {
    if (!editor) {
      console.log("Editor not ready yet.");
      return;
    }

    const listener = (event: MessageEvent) => {
      const data = event?.data;
      console.log("Received message from Flutter:", typeof data);

      if (typeof data === "string") {
        try {
          const command = JSON.parse(data);

          console.log("Parsed command from Flutter:", command);

          // Handle any command type here
          switch (command.type) {
            case "undo":
              editor.dispatchCommand(UNDO_COMMAND, undefined);
              break;
            case "redo":
              editor.dispatchCommand(REDO_COMMAND, undefined);
              break;
            case "bold":
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
              break;
            case "italic":
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
              break;
            case "paragraph":
              // Apply a paragraph
              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  $wrapNodes(selection, () => $createParagraphNode());
                }
              });
              break;
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
              // Apply a heading
              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  $wrapNodes(selection, () => $createHeadingNode(command.type));
                }
              });
              break;
            case "addPreview":
              console.log("0000000", command.url, command.text, command.image, command.embed);
              addPreview(command.url, command.text, command.image, command.embed);
              break;
            case "insertLink":
              insertLink();
              break;
            case "updateLink":
              updateLink(command.url, command.text);
              break;
            case "onUnlink":
              onUnlink();
              break;
            case "onCloseLink":
              onCloseLink();
              break;
            case "bullet":
              editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
              break;
            case "number":
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
              break;
            case "quote":
              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  $wrapNodes(selection, () => $createQuoteNode());
                }
              });
              break;
            case "check":
              editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
              break;
            case "left":
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left");
              break;
            case "center":
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center");
              break;
            case "right":
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right");
              break;
            case "justify":
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify");
              break;
            case "showMarkDown":
              handleMarkdownToggle();
              console.log("tttttttttttttttttt", toggleMarkdownRef.current, "tttttttttttttttttt");
              // console.log("showMarkDown", toggleMarkdownRef.current, "ye s ye s ye s ye s ye s ye s ye s ye s ye s ye s ye s ye s ye s ye s ye s ye s ye s");
              break;

            case "flutter_token":
              console.log("Received token from Flutter:", command.token);
              setAppToken(command.token);
              break;
            // Add more command cases here as needed
            default:
              console.warn("Unknown command type:", command.type);
          }
        } catch (e) {
          console.error("Invalid JSON from Flutter:", e, data);
        }
      } else if (typeof event?.data === "object") {
        console.log("Received editNote from Flutter:", event.data.editNoteMarkdown);
        setMarkdownForEdit(event.data.editNoteMarkdown);
      } else {
        console.warn("Unsupported message format from Flutter:", event.data);
        return;
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [editor, handleMarkdownToggle, setAppToken]);

  // #########################################

  // start to show markdown to text for edit note

  useEffect(() => {
    //     const markdownForEdit = `<- [https://www.youtube.com](https://www.youtube.com){link_type:'preview',text:'off',image:'off',embed:'on'}<-
    // <- [https://www.youtube.com](https://www.google.com){link_type:'preview',text:'on',image:'on',embed:'off'}<-`;
    // Text [https://www.youtube.com](https://www.youtube.com){link_type:'preview',text:'off',image:'off',embed:'on'}<-\n\n`;

    // const markdownForEdit = `# ->Center *italic* Heading 1<-\n\n## ->Right **Bold** Heading 2->\n\n### <-Left ***bold italic*** Heading 3<-\n\n->Right **bold** Text->\n\n<-Left *italic* Text<-\n\n->Center [Google](<ln>1<\/ln>) Link ***bold italic***<-\n\n- <-Left List *italic*<-\n- ->Right List **bold**->\n- ->Center [***bold italic Link***](<ln>2<\/ln>)<-\n\n1. <-Left List *italic*<-\n2. ->Center List **bold**<-\n3. ->Right [***bold italic Link***](<ln>3<\/ln>)->\n\n> ->Center Quote *italic*<-\n\n> ->Right Quote ***bold***->\n\n> <-Left [***Bold Italic***](<ln>4<\/ln>) Link<-\n\n->Right **bold** Text->\n\n->Center *italic* Text<-\n\n<-Left ***bold italic*** Text<-\n\n->Center [Google](<ln>5<\/ln>) Link<-\n\n<- <-`;
    //     const markdownForEdit = `# ->Center *italic* Heading 1<-\n
    // ## ->Right **Bold** Heading 2->\n
    // ### <-Left ***bold italic*** Heading 3<-\n

    // ->Right **bold** Text->\n
    // <-Left *italic* Text<-\n
    // ->Center [Google](https://google.com) Link ***bold italic***<-\n

    // - <-Left List *italic*<-
    // - ->Right List **bold**->
    // - ->Center ***[bold italic Link](https://google.com)***<-\n

    // 1. <-Left List *italic*<-
    // 2. ->Center List **bold**<-
    // 3. ->Right ***[bold italic Link](https://google.com)***->\n

    // > ->Center Quote *italic*<-\n
    // > ->Right Quote ***bold***->\n
    // > <-Left ***[Bold Italic](https://google.com)*** Link<-\n

    // ->Right **bold** Text->\n
    // ->Center *italic* Text<-\n
    // <-Left ***bold italic*** Text<-\n
    // ->Center [Google](https://google.com) Link<-\n`;

    if (typeof markdownForEdit === "string" && markdownForEdit.trim() !== "") {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        $convertFromMarkdownString(markdownForEdit, PLAYGROUND_TRANSFORMERS);

        // ✅ Append a paragraph with a space at the end
        const trailingParagraph = $createParagraphNode();
        trailingParagraph.append($createTextNode(" "));
        root.append(trailingParagraph);

        // ✅ Apply alignment
        const children = root.getChildren();
        handleAlignment(children);

        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const lastNode = root.getLastDescendant();
          if (lastNode && $isTextNode(lastNode)) {
            const textLength = lastNode.getTextContentSize();
            selection.setTextNodeRange(lastNode, textLength, lastNode, textLength);
          }
        }
      });
    }
  }, [editor, markdownForEdit]);

  // end to show markdown to text for edit note

  // ##############################################################

  useEffect(() => {
    const editorElement = document.querySelector('[contenteditable="true"]') as HTMLElement | null;

    function handleLinkClick(event: MouseEvent) {
      let target = event.target as HTMLElement | null;
      while (target && target !== editorElement) {
        clickedLinkTypeRef.current = target.classList.contains("preview-card-link") ? "preview" : "link";
        if (target.tagName === "A") {
          setTimeout(() => {
            startLinkFlow();
            console.log("link is being handleLinkClick", clickedLinkTypeRef.current, isLinkClickedRef.current);
          }, 0);
          break;
        }
        // Handle preview links (adjust selector/class as needed)
        if (target.classList.contains("preview-card-link")) {
          setTimeout(() => {
            startLinkFlow();
            console.log("preview is being handleLinkClick", clickedLinkTypeRef.current, isLinkClickedRef.current);
          }, 0);
          break;
        }
        target = target.parentElement;
      }
    }

    if (editorElement) {
      editorElement.addEventListener("click", handleLinkClick);
    }

    return () => {
      if (editorElement) {
        editorElement.removeEventListener("click", handleLinkClick);
      }
    };
  }, [editor]);

  // ##############################################################

  return (
    <div className="toolbar" ref={toolbarRef}>
      <>
        <button onClick={handleMarkdownToggle}>Markdown</button>
        <button onClick={insertLink}>Insert/Remove Link</button>
        <button
          onClick={() => {
            updateLink("https://updated.com", "Updated Text");
          }}
        >
          Update Link
        </button>
        <button onClick={() => addPreview("https://youtu.be/dgZqg2uH6V8?si=NxDplSJEXTwpExN7", false, false, true)}>Youtube Preview</button>
        <button onClick={() => addPreview("https://www.google.com", true, true, false)}>Google Preview</button>
        {/* <button onClick={onCloseLink}>onCloseLink</button> */}
        <button onClick={onUnlink}>onUnlink</button>
      </>
    </div>
  );
}
