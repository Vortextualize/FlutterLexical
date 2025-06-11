import { DecoratorNode } from "lexical";
import React from "react";

class PreviewNode extends DecoratorNode {
  constructor(url, text = "", image = "", embed = "", key) {
    super(key);
    this.url = url;
    this.text = text;
    this.image = image;
    this.embed = embed;
  }

  static getType() {
    return "preview";
  }

  static clone(node) {
    return new PreviewNode(node.url, node.text, node.image, node.embed, node.__key);
  }

  // ✅ Must return a React component for Lexical
  decorate() {
    return <PreviewComponent url={this.url} text={this.text} image={this.image} />;
  }

  updateDOM() {
    return false;
  }
}

// ✅ Define the React component separately
const PreviewComponent = ({ url, text, image }) => {
  return (
    <div className="preview-container">
      <a href={url} target="_blank" rel="noopener noreferrer">
        {image && <img src={image} alt="Preview" style={{ width: "100px" }} />}
        <p>{text}</p>
      </a>
    </div>
  );
};

export default PreviewNode;
