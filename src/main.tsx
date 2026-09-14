import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MiniOverlay, useOverlayDismiss } from "./components/MiniOverlay";
import "./index.css";

/** Routes the webview to the right root: main app or the mini overlay window. */
function Root() {
  const isOverlay = window.location.search.includes('window=mini-overlay');
  useOverlayDismiss();
  return isOverlay ? <MiniOverlay /> : <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
