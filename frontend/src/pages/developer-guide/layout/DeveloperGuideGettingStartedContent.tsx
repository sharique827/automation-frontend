import { FC, useEffect } from "react";
import { useLocation } from "react-router-dom";
import gettingStartedContent from "../landing/getting-started.md?raw";
import MdFileRender from "@components/MdFileRender";
import { useDeveloperGuideShell } from "./DeveloperGuideShellContext";

const DeveloperGuideGettingStartedContent: FC = () => {
    const { hash } = useLocation();
    const { navSidebarOpen } = useDeveloperGuideShell();

    useEffect(() => {
        if (!hash) return;
        const id = hash.slice(1);
        requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [hash]);

    return (
        <div className="px-4 md:px-8 py-6 md:py-8">
            <MdFileRender
                title="Getting Started"
                description="This section helps you quickly understand how to explore ONDC protocol flows, starting with the Unified Credit use case."
                mdData={gettingStartedContent}
                showTableOfContents={false}
                hideTitleBlock={!navSidebarOpen}
            />
        </div>
    );
};

export default DeveloperGuideGettingStartedContent;
