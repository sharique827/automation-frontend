import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { GuideProvider } from "./context/guideContext";
import { initGA } from "@utils/analytics";

import "./index.css";
import "antd/dist/reset.css";
import "@styles/bubble.css";

initGA();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <GuideProvider>
                <App />
            </GuideProvider>
        </BrowserRouter>
    </StrictMode>
);
