import { DecoratorNode } from "lexical";

// List of embeddable domains (flattened, lowercased, no protocol)
const embeddableDomains = [
  // Facebook
  "facebook.com",
  "facebook.net",
  "fb.com",
  "fbcdn.net",
  "fb.me",
  "fb.gg",
  "facebok.com",
  "facbook.com",
  "faceboook.com",
  "facebokk.com",
  "faceboo.com",
  "faceboik.com",
  "facebooj.com",

  // Instagram
  "instagram.com",
  "ig.me",
  "instagr.am",

  // YouTube
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "youtube.co.uk",
  "youtube.fr",
  "youtube.de",
  "youtube.jp",
  "youtube.com.pk",
  "youtubekids.com",
  "withyoutube.com",
  "youtube.com/gaming",

  // Mastodon
  "mastodon.social",
  "mstdn.jp",
  "fosstodon.org",
  "mastodon.art",
  "joinmastodon.org/servers",
  "mastodonservers.net",

  // LinkedIn
  "linkedin.com",
  "de.linkedin.com",
  "uk.linkedin.com",
  "fr.linkedin.com",
  "in.linkedin.com",
  "business.linkedin.com",
  "ads.linkedin.com",
  "linkedin.com/learning",
  "talent.linkedin.com",
  "developer.linkedin.com",
  "sales.linkedin.com",
  "linkedin.cn",

  // Vimeo
  "vimeo.com",
  "vimeocdn.com",
  "vhx.tv",

  // SoundCloud
  "soundcloud.com",
  "sndcdn.com",

  // Spotify
  "spotify.com",
  "open.spotify.com",
  "developer.spotify.com",
  "community.spotify.com",
  "newsroom.spotify.com",
  "artists.spotify.com",
  "podcasters.spotify.com",
  "charts.spotify.com",
  "lifeatspotify.com",

  // Bluesky
  "bsky.app",
  "bsky.social",
  "news.network",
  "yourdomain.xyz",

  // Twitter
  "twitter.com",
  "x.com",
];

// Utility to extract the domain from a URL
function extractDomain(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

// Utility function to check if URL matches any whitelisted social platform
function isEmbeddablePlatform(url) {
  const domain = extractDomain(url);
  // Check for direct domain match or subdomain match
  return embeddableDomains.some((embeddable) => domain === embeddable || domain.endsWith("." + embeddable));
}

export class PreviewLinkNode extends DecoratorNode {
  static getType() {
    return "preview-link";
  }

  static clone(node) {
    return new PreviewLinkNode(node.__url, node.__imageOn, node.__textOn, node.__embedOn, node.__warningOn, node.__key);
  }

  constructor(url, imageOn, textOn, embedOn, warningOn, key) {
    super(key);
    this.__url = url;
    this.__imageOn = imageOn;
    this.__textOn = textOn;
    this.__embedOn = embedOn;
    this.__warningOn = warningOn;
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
        {this.__warningOn && (
          <div className="amplification-warning">
            <span className="warning-icon"></span>
            {isEmbeddablePlatform(this.__url) ? (
              <span className="warning-text">Embed not available due to your low amplification level</span>
            ) : (
              <span className="warning-text">Preview not available due to your low amplification level</span>
            )}
          </div>
        )}
      </div>
    );
  }

  static importJSON(serializedNode) {
    const { url, imageOn, textOn, embedOn, warningOn } = serializedNode;
    return new PreviewLinkNode(url, imageOn, textOn, embedOn, warningOn);
  }

  exportJSON() {
    return {
      type: "preview-link",
      url: this.__url,
      imageOn: this.__imageOn,
      textOn: this.__textOn,
      embedOn: this.__embedOn,
      warningOn: this.__warningOn,
      version: 1,
    };
  }
}

// Add at the end of your file (after the class)
export function isPreviewLinkNode(node) {
  return node instanceof PreviewLinkNode;
}
