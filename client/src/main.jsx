// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";

// ✅ Add basename for GitHub Pages subpath
createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/MoltenMumWebsiteTest">
    <App />
  </BrowserRouter>
);
