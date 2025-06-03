import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { TextNode } from "lexical";
import { useCallback, useMemo, useState } from "react";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { $createMentionNode } from "../nodes/MentionNode.ts";
import MentionList from "../components/MentionList.tsx";

const PUNCTUATION = "\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%'\"~=<>_:;";
const TRIGGERS = "@";
// const VALID_CHARS = "[^" + TRIGGERS + PUNCTUATION + "\\s]";
// const VALID_JOINS = "(?:" + "\\.[ |$]|" + " |" + "[" + PUNCTUATION + "]|" + ")";
// const LENGTH_LIMIT = 75;

const VALID_CHARS = `[^${TRIGGERS}${PUNCTUATION}\\s]`;
const VALID_JOINS = `(?:\\.[ |$]| |[${PUNCTUATION}]|)`;
const LENGTH_LIMIT = 75;

// const AtSignMentionsRegex = new RegExp("(^|\\s|\\()(" + "[" + TRIGGERS + "]" + "((?:" + VALID_CHARS + VALID_JOINS + "){0," + LENGTH_LIMIT + "})" + ")$");
const AtSignMentionsRegex = new RegExp(`(^|\\s|\\()([${TRIGGERS}]((?:${VALID_CHARS}${VALID_JOINS}){0,${LENGTH_LIMIT}}))$`);

const ALIAS_LENGTH_LIMIT = 50;

// const AtSignMentionsRegexAliasRegex = new RegExp("(^|\\s|\\()(" + "[" + TRIGGERS + "]" + "((?:" + VALID_CHARS + "){0," + ALIAS_LENGTH_LIMIT + "})" + ")$");
const AtSignMentionsRegexAliasRegex = new RegExp(`(^|\\s|\\()([${TRIGGERS}]((?:${VALID_CHARS}){0,${ALIAS_LENGTH_LIMIT}}))$`);

interface QueryMatch {
  leadOffset: number;
  matchingString: string;
  replaceableString: string;
}

function checkForAtSignMentions(text: string, minMatchLength: number): QueryMatch | null {
  let match = AtSignMentionsRegex.exec(text);
  if (match === null) {
    match = AtSignMentionsRegexAliasRegex.exec(text);
  }

  if (match !== null) {
    const maybeLeadingWhitespace = match[1];
    const matchingString = match[3];
    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2],
      };
    }
  }
  return null;
}

function getPossibleQueryMatch(text: string): QueryMatch | null {
  return checkForAtSignMentions(text, 1);
}

class MentionTypeaheadOption extends MenuOption {
  id: string;

  constructor(id: string) {
    super(id);
    this.id = id;
  }
}

export default function MentionsPlugin(): React.JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  });

  const options = useMemo(() => [], []);

  const onSelectOption = useCallback(
    (selectedOption: MentionTypeaheadOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        // const mentionNode = $createMentionNode(selectedOption.id);
        const mentionNode = $createMentionNode("@" + selectedOption.id);
        if (nodeToReplace) {
          // console.log("lllllllllllllllllllll", mentionNode.__mention);
          nodeToReplace.replace(mentionNode);
        }
        mentionNode.select();
        closeMenu();
      });
    },
    [editor]
  );

  const checkForMentionMatch = useCallback(
    (text: string) => {
      const mentionMatch = getPossibleQueryMatch(text);
      const slashMatch = checkForSlashTriggerMatch(text, editor);
      return !slashMatch && mentionMatch ? mentionMatch : null;
    },
    [checkForSlashTriggerMatch, editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin<MentionTypeaheadOption>
      onQueryChange={(query) => {
        setQueryString(query);
      }}
      onSelectOption={(option, nodeToReplace, closeMenu) => {
        onSelectOption(option, nodeToReplace, closeMenu);
      }}
      triggerFn={checkForMentionMatch}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchorElementRef && queryString
          ? anchorElementRef.current &&
            ReactDOM.createPortal(
              <div className="typeahead-popover mentions-menu">
                <MentionList
                  options={[]}
                  userHandle={queryString || ""}
                  onClick={(option: { id: string }) => {
                    const typedOption = new MentionTypeaheadOption(option.id);
                    setHighlightedIndex(selectedIndex || 0);
                    selectOptionAndCleanUp(typedOption);
                  }}
                />
              </div>,
              anchorElementRef.current
            )
          : null
      }
    />
  );
}
