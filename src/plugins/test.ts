import { $createTextNode, $getNodeByKey, $getRoot, $getSelection, $isRangeSelection, $isTextNode, TextNode } from "lexical";
import { $createLinkNode, $isLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useCallback, useRef } from "react";
import { PreviewLinkNode } from "../../nodes/PreviewLinkNode";

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

export function useFlutterLinkHandler(editor, isLinkClickedRef) {
  const lastLinkNodeKeyRef = useRef<string | null>(null);

  // to detect if the last link node was a default link (with "Link" text)
  // this is used to avoid unnecessary updates when clicking the link button again
  const lastDefaultLinkNodeKeyRef = useRef<string | null>(null);

  const startLinkFlow = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const selectedText = selection.getTextContent();
        console.log("startLinkFlow - currently selected text:", selectedText);

        const node = selection.anchor.getNode();

        let linkNode: LinkNode | null = null;

        if ($isLinkNode(node)) {
          linkNode = node;
        } else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
          linkNode = node.getParent();
        }

        // ✅ Print link text and URL if linkNode exists
        if (linkNode) {
          console.log("startLinkFlow - full link text:", linkNode.getTextContent());
          console.log("startLinkFlow - link:", linkNode.getURL());
        }

        if ($isLinkNode(node) || ($isTextNode(node) && $isLinkNode(node.getParent()))) {
          handleLinkFlow(editor);
        }
        console.log("Cursor offset in node:", selection.anchor.offset, "of text node:", selection.anchor.getNode().getTextContent());
      }
    });
  }, [editor]);

  const insertLink = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (selection.isCollapsed()) {
        // No text selected: insert a link node with default text "Link" at the cursor
        const linkNode = $createLinkNode("https://");
        linkNode.append($createTextNode("Link"));
        selection.insertNodes([linkNode]);
        lastDefaultLinkNodeKeyRef.current = linkNode.getKey(); // Track this node

        // Optionally, select the text inside the new link for editing
        const firstChild = linkNode.getFirstChild();
        if ($isTextNode(firstChild)) {
          selection.setTextNodeRange(firstChild, 0, firstChild, firstChild.getTextContentSize());
        }
        startLinkFlow();
        return;
      }

      // Text is selected: use TOGGLE_LINK_COMMAND to wrap selection
      if (!isLinkClickedRef.current) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
        startLinkFlow();
        console.log("link is being insertLink", isLinkClickedRef.current);
      } else {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        isLinkClickedRef.current = false;
      }
    });
  }, [editor]);

  // const updateLink = useCallback(
  //   (url: string, text: string, isNew: boolean = false) => {
  //     editor.update(() => {
  //       const selection = $getSelection();
  //       if (!$isRangeSelection(selection)) return;

  //       let linkNode: LinkNode | null = null;
  //       const nodes = selection.getNodes();

  //       // Try to find link node in selection
  //       nodes.forEach((node) => {
  //         if ($isLinkNode(node)) {
  //           linkNode = node;
  //         } else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
  //           linkNode = node.getParent();
  //         }
  //       });

  //       // If not found, use lastLinkNodeKeyRef
  //       if (!linkNode && lastLinkNodeKeyRef.current) {
  //         const maybeNode = editor.getEditorState().read(() => {
  //           const node = $getRoot().getDescendantByKey(lastLinkNodeKeyRef.current!);
  //           return $isLinkNode(node) ? node : null;
  //         });
  //         linkNode = maybeNode;
  //       }

  //       if (!linkNode) return;

  //       // Update link text & URL
  //       linkNode.setURL(url);
  //       const firstChild = linkNode.getFirstChild();
  //       if ($isTextNode(firstChild)) {
  //         firstChild.setTextContent(text);
  //       }

  //       // Ensure cursor stays inside updated link
  //       if ($isTextNode(firstChild)) {
  //         selection.setTextNodeRange(firstChild, 0, firstChild, text.length);
  //       }
  //     });
  //   },
  //   [editor]
  // );

  const updateLink = useCallback(
    (url: string, text: string, isNew: boolean = false) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        let linkNode: LinkNode | null = null;
        const nodes = selection.getNodes();

        // Try to find link node in selection
        nodes.forEach((node) => {
          if ($isLinkNode(node)) {
            linkNode = node;
          } else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
            linkNode = node.getParent();
          }
        });

        // If not found, use lastLinkNodeKeyRef
        if (!linkNode && lastLinkNodeKeyRef.current) {
          const maybeNode = editor.getEditorState().read(() => {
            const node = $getRoot().getDescendantByKey(lastLinkNodeKeyRef.current!);
            return $isLinkNode(node) ? node : null;
          });
          linkNode = maybeNode;
        }

        if (!linkNode) return;

        // Update link text & URL
        linkNode.setURL(url);
        const firstChild = linkNode.getFirstChild();
        if ($isTextNode(firstChild)) {
          firstChild.setTextContent(text);
        }

        // Ensure cursor stays inside updated link
        if ($isTextNode(firstChild)) {
          selection.setTextNodeRange(firstChild, 0, firstChild, text.length);
        }

        lastDefaultLinkNodeKeyRef.current = null;
      });
    },
    [editor]
  );

  const onUnlink = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();
        nodes.forEach((node) => {
          if ($isLinkNode(node)) {
            const textContent = node.getTextContent();
            if (lastDefaultLinkNodeKeyRef.current === node.getKey() && textContent === "Link") {
              node.remove();
              lastDefaultLinkNodeKeyRef.current = null;
            } else {
              node.replace($createTextNode(textContent));
            }
          } else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
            const parent = node.getParent();
            if (parent) {
              const textContent = parent.getTextContent();
              if (lastDefaultLinkNodeKeyRef.current === parent.getKey() && textContent === "Link") {
                parent.remove();
                lastDefaultLinkNodeKeyRef.current = null;
              } else {
                parent.replace(node);
              }
            }
          }
        });
      }
      console.log("Unlink command executed ReactJs:");
    });
    isLinkClickedRef.current = false;
  }, [editor]);

  const onCloseLink = useCallback(() => {
    isLinkClickedRef.current = false;
    console.log("link is being onCloseLink called, isLinkClickedRef:", isLinkClickedRef.current);
    if (!window.MarkdownChannel) {
      console.warn("MarkdownChannel not available on window");
      return;
    }

    const message = {
      type: "link_selected",
      isLinkTrue: isLinkClickedRef.current,
    };

    console.log("Sending message:", JSON.stringify(message));
    window.MarkdownChannel.postMessage(JSON.stringify(message));

    // Optionally, blur the editor or close any link popups
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const node = getSelectedNode(selection);
        // Try parent first, then node itself
        const linkNode = $isLinkNode(node.getParent()) ? node.getParent() : $isLinkNode(node) ? node : null;
        if (linkNode) {
          // Select the end of the link node
          linkNode.selectEnd();
        }
      }
    });

    // Helper function to get the selected node from a selection
    function getSelectedNode(selection) {
      const anchor = selection.anchor;
      const focus = selection.focus;
      const anchorNode = anchor.getNode();
      const focusNode = focus.getNode();
      return anchorNode === focusNode ? anchorNode : selection.isBackward() ? focusNode : anchorNode;
    }
  }, [editor]);

  const addPreview = useCallback(
    (url: string, imageOn: boolean = true, textOn: boolean = true, embedOn: boolean = false) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!selection) return;

        // Try to find a link node in the selection (like updateLink does)
        let linkNode: LinkNode | null = null;
        const nodes = selection.getNodes();

        for (const node of nodes) {
          if ($isLinkNode(node)) linkNode = node;
          else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
            linkNode = node.getParent();
          }
        }

        if (linkNode) {
          // Replace the link node with the preview node
          const parent = linkNode.getParent();
          const nextSibling = linkNode.getNextSibling();
          linkNode.remove();

          const previewNode = new PreviewLinkNode(url, imageOn, textOn, embedOn);

          if (parent) {
            if (nextSibling) {
              nextSibling.insertBefore(previewNode);
            } else {
              parent.append(previewNode);
            }
          } else {
            $getRoot().append(previewNode);
          }
        }
        // If not on a link, do nothing
      });
    },
    [editor]
  );

  return {
    startLinkFlow,
    insertLink,
    updateLink,
    onUnlink,
    onCloseLink,
    addPreview,
    lastLinkNodeKeyRef,
  };
}

export { handleLinkFlow };
