import { FC } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useDeveloperGuideShell } from "./DeveloperGuideShellContext";

type DeveloperGuideNavBackButtonProps = {
    className?: string;
};

const DeveloperGuideNavBackButton: FC<DeveloperGuideNavBackButtonProps> = ({ className = "" }) => {
    const { navSidebarOpen, openNavSidebar } = useDeveloperGuideShell();

    if (navSidebarOpen) return null;

    return (
        <button
            type="button"
            onClick={openNavSidebar}
            className={`flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-sky-600 hover:bg-sky-50 transition-colors shrink-0 ${className}`}
            aria-label="Open navigation"
            title="Open navigation"
        >
            <FiArrowLeft size={16} aria-hidden />
        </button>
    );
};

export default DeveloperGuideNavBackButton;
