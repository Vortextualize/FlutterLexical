import React from "react";

export function CustomLinkDecorator({ url, children }) {
  // Detect if the link text is the same as the URL (bare link)
  const isBareUrl = typeof children === "string" && children === url;

  if (isBareUrl) {
    // Card style for bare URLs
    return (
      <div
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: "10px",
          background: "#f8fafc",
          padding: "12px 16px",
          margin: "8px 0",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ fontSize: 22, color: "#6c63ff" }}>🔗</div>
        <div style={{ flex: 1 }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#1a0dab",
              textDecoration: "none",
              fontWeight: 500,
              wordBreak: "break-all",
              fontSize: 15,
            }}
          >
            {url}
          </a>
          {/* Optionally, add more metadata here (title, description, favicon, etc.) */}
        </div>
        {/* Example action icons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <span title="Text" style={{ fontSize: 16, color: "#888" }}>
            Text
          </span>
          <span title="Image" style={{ fontSize: 16, color: "#888" }}>
            🖼️
          </span>
          <span title="Embed" style={{ fontSize: 16, color: "#888" }}>
            🔗
          </span>
        </div>
      </div>
    );
  }

  // Inline style for normal links
  return (
    <span
      style={{
        background: "#e0f7fa",
        borderRadius: "4px",
        padding: "2px 6px",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span role="img" aria-label="link" style={{ color: "#00796b" }}>
        🔗
      </span>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#00796b", fontWeight: 500, textDecoration: "underline" }}>
        {children}
      </a>
    </span>
  );
}
