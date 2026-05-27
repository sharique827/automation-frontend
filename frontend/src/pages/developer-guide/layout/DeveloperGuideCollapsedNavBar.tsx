import { FC, ReactNode } from "react";
import DeveloperGuideNavBackButton from "./DeveloperGuideNavBackButton";
import { useDeveloperGuideShell } from "./DeveloperGuideShellContext";

type DeveloperGuideCollapsedNavBarProps = {
    children?: ReactNode;
    /** When set, shown as the primary label beside the back button. */
    title?: string;
    className?: string;
};

const DeveloperGuideCollapsedNavBar: FC<DeveloperGuideCollapsedNavBarProps> = ({
    children,
    title,
    className = "",
}) => {
    const { navSidebarOpen } = useDeveloperGuideShell();

    if (navSidebarOpen) return null;

    return (
        <div
            className={`sticky top-0 z-30 flex items-center gap-3 h-14 min-h-14 px-4 md:px-6 border-b border-slate-200 bg-white shadow-sm ${className} mt-4`}
        >
            <DeveloperGuideNavBackButton />
            {children ??
                (title ? (
                    <span className="text-base font-semibold text-slate-900 truncate min-w-0 leading-normal">
                        {title}
                    </span>
                ) : null)}
        </div>
    );
};

export default DeveloperGuideCollapsedNavBar;
