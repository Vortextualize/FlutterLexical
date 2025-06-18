import { DecoratorNode } from "lexical";

// Whitelist for domains that support embeds
const socialPlatforms = ["Twitter", "Youtube", "Spotify", "Mastodon", "Bluesky", "Instagram", "Tiktok", "Linkedin", "Facebook", "Vimeo", "Soundcloud"];

// Utility function to check if URL matches any whitelisted social platform
function isEmbeddablePlatform(url) {
  const lowerUrl = url.toLowerCase();
  return socialPlatforms.some((platform) => lowerUrl.includes(platform.toLowerCase()));
}

export class PreviewLinkNode extends DecoratorNode {
  static getType() {
    return "preview-link";
  }

  static clone(node) {
    return new PreviewLinkNode(node.__url, node.__image, node.__text, node.__embed, node.__key);
  }

  constructor(url, imageOn, textOn, embedOn, key) {
    super(key);
    this.__url = url;
    this.__imageOn = imageOn;
    this.__textOn = textOn;
    this.__embedOn = embedOn;
  }

  createDOM() {
    const container = document.createElement("div");
    container.className = "preview-link-box";
    return container;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return (
      <div className="preview-card">
        <div className="preview-card-header">
          <span className="preview-card-icon"></span>
          <div className="preview-card-tags">
            <div className="tag">
              <span className="tag">Text</span>
              {this.__textOn ? <span className="tag-on"></span> : <span className="tag-off"></span>}
            </div>
            <div className="tag-divider"></div>
            <div className="tag">
              <span className="tag">Image</span>
              {this.__imageOn ? <span className="tag-on"></span> : <span className="tag-off"></span>}
            </div>

            {isEmbeddablePlatform(this.__url) && (
              <>
                <div className="tag-divider"></div>
                <div className="tag">
                  <span className="tag">Embed</span>
                  {this.__embedOn ? <span className="tag-on"></span> : <span className="tag-off"></span>}
                </div>
              </>
            )}
          </div>
        </div>
        <span href="#" target="_blank" rel="noopener noreferrer" className="preview-card-link">
          {this.__url}
        </span>
      </div>
    );
  }

  static importJSON(serializedNode) {
    const { url, imageOn, textOn, embedOn } = serializedNode;
    return new PreviewLinkNode(url, imageOn, textOn, embedOn);
  }

  exportJSON() {
    return {
      type: "preview-link",
      url: this.__url,
      imageOn: this.__imageOn,
      textOn: this.__textOn,
      embedOn: this.__embedOn,
      version: 1,
    };
  }
}
