import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export default function FocusStatusLoggerPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const rootElement = editor.getRootElement();

    if (!rootElement) return;

    const handleFocus = () => {
      console.log("Editor is focused");
    };

    const handleBlur = () => {
      console.log("Editor is not focused");
    };

    rootElement.addEventListener("focus", handleFocus);
    rootElement.addEventListener("blur", handleBlur);

    return () => {
      rootElement.removeEventListener("focus", handleFocus);
      rootElement.removeEventListener("blur", handleBlur);
    };
  }, [editor]);

  return null;
}
