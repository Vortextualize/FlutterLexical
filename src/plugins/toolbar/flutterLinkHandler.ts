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

  // To check if user added a link with default text "Link"
  // This is used to avoid unnecessary updates when the user clicks on the link again
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
        const linkNode = $createLinkNode("https://");
        linkNode.append($createTextNode("Link"));
        selection.insertNodes([linkNode]);
        lastDefaultLinkNodeKeyRef.current = linkNode.getKey();
        lastLinkNodeKeyRef.current = linkNode.getKey(); // <-- add this line

        editor.update(() => {
          const node = $getNodeByKey(linkNode.getKey());
          if ($isLinkNode(node)) {
            const firstChild = node.getFirstChild();
            if ($isTextNode(firstChild)) {
              const newSelection = $getSelection();
              if ($isRangeSelection(newSelection)) {
                newSelection.setTextNodeRange(firstChild, 0, firstChild, firstChild.getTextContentSize());
              }
            }
          }
        });

        // Only call startLinkFlow AFTER setting the selection
        startLinkFlow();
        return;
      }

      // Text is selected: use TOGGLE_LINK_COMMAND to wrap selection
      if (!isLinkClickedRef.current) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const node = selection.anchor.getNode();
            let linkNode: LinkNode | null = null;
            if ($isLinkNode(node)) {
              linkNode = node;
            } else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
              linkNode = node.getParent();
            }
            if (linkNode) {
              lastLinkNodeKeyRef.current = linkNode.getKey();
              const firstChild = linkNode.getFirstChild();
              if ($isTextNode(firstChild)) {
                const textLength = firstChild.getTextContentSize();
                const middle = Math.floor(textLength / 2);
                selection.setTextNodeRange(firstChild, middle, firstChild, middle);
              }
            }
          }
        });
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
    (url: string, text: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        let linkNode: LinkNode | null = null;
        const nodes = selection.getNodes();

        for (const node of nodes) {
          if ($isLinkNode(node)) linkNode = node;
          else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
            linkNode = node.getParent();
          }
        }

        if (!linkNode && lastLinkNodeKeyRef.current) {
          const maybeNode = editor.getEditorState().read(() => {
            const node = $getNodeByKey(lastLinkNodeKeyRef.current!);
            return $isLinkNode(node) ? node : null;
          });
          linkNode = maybeNode;
        }

        if (!linkNode) return;

        // Remove old
        const parent = linkNode.getParent();
        const nextSibling = linkNode.getNextSibling();
        linkNode.remove();

        // Create fresh link node
        const newLink = $createLinkNode(url);
        newLink.append($createTextNode(text));
        if (parent) {
          if (nextSibling) {
            nextSibling.insertBefore(newLink);
          } else {
            parent.append(newLink);
          }
        } else {
          $getRoot().append(newLink);
        }
        selection.setTextNodeRange(newLink.getFirstChild() as TextNode, 0, newLink.getFirstChild() as TextNode, text.length);
        lastDefaultLinkNodeKeyRef.current = null;
      });
    },
    [editor]
  );

  const onUnlink = useCallback(() => {
    // Remove the default-inserted link node if it exists and is not updated
    if (lastDefaultLinkNodeKeyRef.current) {
      editor.update(() => {
        const node = $getNodeByKey(lastDefaultLinkNodeKeyRef.current!);
        if ($isLinkNode(node) && node.getTextContent() === "Link") {
          node.remove();
          lastDefaultLinkNodeKeyRef.current = null;
          return;
        }
      });
    }

    // ...existing unlink logic (optional, for other links)...
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();
        nodes.forEach((node) => {
          // If the node itself is a link, unwrap it
          if ($isLinkNode(node)) {
            node.replace($createTextNode(node.getTextContent()));
          } else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
            // If the parent is a link, unwrap the text node
            const parent = node.getParent();
            if (parent) {
              parent.replace(node);
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
