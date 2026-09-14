import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AICompanionWindow } from "./components/AICompanionWindow";
import "./index.css";

const isAiWindow = window.location.search.includes('window=ai-copilot');

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isAiWindow ? <AICompanionWindow /> : <App />}
  </React.StrictMode>,
);
