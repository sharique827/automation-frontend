import { createContext, useContext } from "react";

export interface DeveloperGuideShellContextValue {
    inShell: boolean;
    loadError: string | null;
}

export const DeveloperGuideShellContext = createContext<DeveloperGuideShellContextValue>({
    inShell: false,
    loadError: null,
});

export function useDeveloperGuideShell() {
    return useContext(DeveloperGuideShellContext);
}
