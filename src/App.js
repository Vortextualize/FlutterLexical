"use client";
import "./App.css";
import React, { useEffect } from "react";
import Editor from "./components/Editor";
import { useWebSocket } from "./context/WebSocketContext.tsx";

function App() {
  const { setAppToken, appToken } = useWebSocket();

  useEffect(() => {
    if (appToken) {
      console.log("App token is set");
    } else {
      console.log("App token is not set");
    }
  }, [appToken]);

  return (
    <div className="App">
      <Editor />
    </div>
  );
}

export default App;
