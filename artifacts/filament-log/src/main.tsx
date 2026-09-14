import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply theme synchronously before React renders to avoid flash
const _stored = localStorage.getItem("flog-theme");
const _theme = _stored === "light" || _stored === "dark" ? _stored : "dark";
if (_theme === "dark") document.documentElement.classList.add("dark");
else document.documentElement.classList.remove("dark");

createRoot(document.getElementById("root")!).render(<App />);
