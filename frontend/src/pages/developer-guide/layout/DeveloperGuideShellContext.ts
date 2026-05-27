import { createContext, useContext } from "react";
import type { BuildEntry, DocMeta } from "../types";

export interface DeveloperGuideShellContextValue {
    inShell: boolean;
    loadError: string | null;
    docs: DocMeta[];
    builds: BuildEntry[];
    navSidebarOpen: boolean;
    toggleNavSidebar: () => void;
    openNavSidebar: () => void;
    collapseNavSidebar: () => void;
}

export const DeveloperGuideShellContext = createContext<DeveloperGuideShellContextValue>({
    inShell: false,
    loadError: null,
    docs: [],
    builds: [],
    navSidebarOpen: true,
    toggleNavSidebar: () => {},
    openNavSidebar: () => {},
    collapseNavSidebar: () => {},
});

export function useDeveloperGuideShell() {
    return useContext(DeveloperGuideShellContext);
}
