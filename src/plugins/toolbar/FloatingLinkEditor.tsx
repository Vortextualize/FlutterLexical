import { $getSelection, $isRangeSelection, SELECTION_CHANGE_COMMAND, $isTextNode } from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { mergeRegister } from "@lexical/utils";
import { LowPriority } from "./editorPriorities.ts";

function positionEditorElement(editor, rect) {
  if (rect === null) {
    editor.style.display = "none";
    editor.style.top = "0";
    editor.style.left = "0";
  } else {
    editor.style.display = "block";
    editor.style.top = `${rect.top + rect.height + window.pageYOffset + 10}px`;
    // editor.style.left = `${
    //   rect.left + window.pageXOffset - editor.offsetWidth / 2 + rect.width / 2
    // }px`;

    // editor.style.top = `auto`;
    // editor.style.bottom = `0px`;
    editor.style.left = `0px`;
  }
}

function FloatingLinkEditor({ editor, onClose }) {
  const editorRef = useRef(null);
  const mouseDownRef = useRef(false);
  const [lastSelection, setLastSelection] = useState(null);

  // State to store selected text, link URL, and initial link URL
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const [initialLinkText, setInitialLinkText] = useState("");
  const [initialLinkUrl, setInitialLinkUrl] = useState("");

  const hasSaveLinkClickedRef = useRef(false);

  const linkInputRef = useRef<HTMLInputElement>(null);

  const [linkWarning, setLinkWarning] = useState(false);

  const updateLinkEditor = useCallback(() => {
    // let fullLinkText = "";
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
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

      // Save to state
      setLinkText(selectedText);
      setLinkUrl(linkHref);
      // Set initial values for the link editor
      setInitialLinkText(selectedText);
      setInitialLinkUrl(linkHref);

      // Log for debugging
      // console.log("Selected Text:", selectedText);
      // console.log("Link URL:", linkHref || "No link");
    }
    const editorElem = editorRef.current;
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;
    if (editorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (selection !== null) {
      const domRange = nativeSelection.getRangeAt(0);
      let rect;
      if (nativeSelection.anchorNode === rootElement) {
        let inner = rootElement;
        while (inner.firstElementChild != null) {
          inner = inner.firstElementChild;
        }
        rect = inner.getBoundingClientRect();
      } else {
        rect = domRange.getBoundingClientRect();
      }

      if (!mouseDownRef.current) {
        positionEditorElement(editorElem, rect);
      }
      setLastSelection(selection);
    } else if (!activeElement || activeElement.className !== "editor-input") {
      positionEditorElement(editorElem, null);
      setLastSelection(null);
    }

    return true;
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateLinkEditor();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateLinkEditor();
          return true;
        },
        LowPriority
      )
    );
  }, [editor, updateLinkEditor]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateLinkEditor();
    });
  }, [editor, updateLinkEditor]);

  // Utility function to check if the link is a valid URL
  const isValidURL = (url: string) => {
    const regex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/;

    return regex.test(url); // Check if the URL matches the regex pattern
  };

  const handleSaveLink = () => {
    // Check if the link is valid
    const isLinkValid = linkUrl && isValidURL(linkUrl); // Check for valid URL

    if (lastSelection !== null) {
      editor.update(() => {
        if (linkUrl) {
          // If the link is invalid, show the warning and don't close the popup
          if (!isLinkValid) {
            setLinkWarning(true); // Show the warning message
            return; // Do not proceed further (prevents closing the popup)
          }
        }
        mouseDownRef.current = true;
        hasSaveLinkClickedRef.current = true;
        positionEditorElement(editorRef.current, null);

        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          if (
            hasSaveLinkClickedRef.current &&
            linkUrl !== "https://" // ignore default placeholder
          ) {
            const nodes = selection.getNodes();
            if (linkText === "") {
              // ###############
              // Case 1: Using URL as text - modify existing nodes in place
              nodes.forEach((node) => {
                if ($isLinkNode(node)) {
                  // Update existing link node
                  node.setURL(linkUrl);
                  const firstChild = node.getFirstChild();
                  if ($isTextNode(firstChild)) {
                    firstChild.setTextContent(linkUrl);
                  }
                } else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
                  // Handle text node inside link
                  const linkNode = node.getParent();
                  linkNode.setURL(linkUrl);
                  node.setTextContent(linkUrl);
                }
              });
              // ###############
            } else if (linkText !== initialLinkText) {
              const textToUse = linkText.trim() || initialLinkText.trim();
              console.log("Changing link text", textToUse);

              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  // Store original selection info
                  const originalAnchor = selection.anchor;
                  const originalFocus = selection.focus;

                  // Process each node in selection
                  const nodes = selection.getNodes();
                  nodes.forEach((node) => {
                    if ($isLinkNode(node)) {
                      // Update link URL and text content
                      node.setURL(linkUrl);
                      const firstChild = node.getFirstChild();
                      if ($isTextNode(firstChild)) {
                        // Calculate safe offset for selection
                        const safeOffset = Math.min(originalAnchor.offset, textToUse.length);

                        firstChild.setTextContent(textToUse);

                        // Adjust selection to stay within bounds
                        if (originalAnchor.key === node.getKey()) {
                          selection.anchor.offset = safeOffset;
                        }
                        if (originalFocus.key === node.getKey()) {
                          selection.focus.offset = safeOffset;
                        }
                      }
                    } else if ($isTextNode(node) && $isLinkNode(node.getParent())) {
                      // Handle text node inside link
                      const linkNode = node.getParent();
                      linkNode.setURL(linkUrl);

                      // Calculate safe offset for selection
                      const safeOffset = Math.min(originalAnchor.offset, textToUse.length);

                      node.setTextContent(textToUse);

                      // Adjust selection to stay within bounds
                      if (originalAnchor.key === node.getKey()) {
                        selection.anchor.offset = safeOffset;
                      }
                      if (originalFocus.key === node.getKey()) {
                        selection.focus.offset = safeOffset;
                      }
                    }
                  });

                  // If we shortened the text, ensure selection stays valid
                  if (selection.anchor.offset > textToUse.length) {
                    selection.anchor.offset = textToUse.length;
                  }
                  if (selection.focus.offset > textToUse.length) {
                    selection.focus.offset = textToUse.length;
                  }
                }
              });
            }
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
          } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
          }
        }
      });
    }
    setTimeout(() => {
      mouseDownRef.current = false;
      hasSaveLinkClickedRef.current = false;
    }, 100);
    // Close the editor
    if (onClose && isLinkValid) {
      onClose();
      setLinkWarning(false);
    }
  };

  // Focus the link input when the popup opens
  // useEffect(() => {
  //   if (linkInputRef.current) {
  //     linkInputRef.current.focus();
  //     // Optionally select all text:
  //     linkInputRef.current.select();
  //   }
  // }, []);

  return (
    <div ref={editorRef} className="link-editor">
      <div className="top-bar">
        <p>Standard Link</p>
        <div className="right-heading">
          {linkWarning && <p className="warning-text">Invalid Link</p>}

          <div
            className="close-link-popup-icon"
            onClick={() => {
              setLinkWarning(false);
              mouseDownRef.current = true;
              positionEditorElement(editorRef.current, null);

              // Only remove or keep the link if something is selected
              if (lastSelection !== null) {
                editor.update(() => {
                  const selection = $getSelection();
                  if ($isRangeSelection(selection)) {
                    // If user did NOT click save, and they edited the link but did not confirm/save
                    if (
                      !hasSaveLinkClickedRef.current &&
                      initialLinkUrl !== linkUrl && // user changed the URL
                      initialLinkUrl !== "https://" // ignore default placeholder
                    ) {
                      editor.dispatchCommand(TOGGLE_LINK_COMMAND, initialLinkUrl);
                    } else if (
                      !hasSaveLinkClickedRef.current &&
                      initialLinkUrl === linkUrl && // user changed the URL
                      initialLinkUrl !== "https://" // ignore default placeholder
                    ) {
                      editor.dispatchCommand(TOGGLE_LINK_COMMAND, initialLinkUrl);
                    } else {
                      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                    }
                  }
                });
              }
              // Reset mouse state after closing
              setTimeout(() => {
                mouseDownRef.current = false;
              }, 100);
              // Close the editor
              if (onClose) onClose();
            }}
          ></div>
        </div>
      </div>

      <label htmlFor="link" className={`${linkWarning ? "input-link-warning" : ""}`}>
        <span className="icon link-icon"></span>
        <input ref={linkInputRef} id="link" className="input-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      </label>

      <label htmlFor="text">
        <span className="icon text-icon"></span>
        <input id="text" className="input-link" placeholder="Enter anchor text" value={linkText} onChange={(e) => setLinkText(e.target.value)} />
      </label>

      <div className="preview-wrapper">
        <button>Convert to Preview Link</button>
        <div className="previews">
          <button
            className="unlink"
            onClick={() => {
              setLinkWarning(false);
              if (lastSelection !== null) {
                editor.update(() => {
                  const selection = $getSelection();
                  if ($isRangeSelection(selection)) {
                    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                  }
                });
              }
            }}
          ></button>
          <button className="add-link" onClick={handleSaveLink}></button>
        </div>
      </div>
    </div>
  );
}

export default FloatingLinkEditor;
