import { FC, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useDeveloperGuideShell } from "./DeveloperGuideShellContext";
import type { NavNode } from "./navTypes";
import { isNavGroup, isNavLink } from "./navTypes";

function parseNavPath(path: string): { pathname: string; hash: string } {
    const hashIndex = path.indexOf("#");
    if (hashIndex === -1) return { pathname: path, hash: "" };
    return {
        pathname: path.slice(0, hashIndex),
        hash: path.slice(hashIndex),
    };
}

function isNavLinkActive(
    node: Extract<NavNode, { type: "link" }>,
    pathname: string,
    hash: string
): boolean {
    if (node.disabled) return false;

    const { pathname: linkPath, hash: linkHash } = parseNavPath(node.path);

    if (node.id === "overview") {
        return pathname === linkPath || pathname === `${linkPath}/`;
    }

    if (linkHash) {
        return pathname === linkPath && hash === linkHash;
    }

    return pathname === linkPath || pathname.startsWith(`${linkPath}/`);
}

function isNavGroupPathActive(
    node: Extract<NavNode, { type: "group" }>,
    pathname: string,
    hash: string
): boolean {
    if (!node.path) return false;

    const { pathname: linkPath, hash: linkHash } = parseNavPath(node.path);
    if (node.id === "general-docs" || node.id === "domains") {
        return pathname === linkPath || pathname === `${linkPath}/`;
    }

    if (linkHash) {
        return pathname === linkPath && hash === linkHash;
    }

    return pathname === linkPath || pathname.startsWith(`${linkPath}/`);
}

function nodeContainsActivePath(node: NavNode, pathname: string, hash: string): boolean {
    if (isNavLink(node)) {
        return isNavLinkActive(node, pathname, hash);
    }
    if (isNavGroupPathActive(node, pathname, hash)) return true;
    return node.children.some((child) => nodeContainsActivePath(child, pathname, hash));
}

/** True when a descendant link/group matches the current URL (not the node itself). */
function nodeHasActiveDescendant(
    node: Extract<NavNode, { type: "group" }>,
    pathname: string,
    hash: string
): boolean {
    return node.children.some((child) => nodeContainsActivePath(child, pathname, hash));
}

interface DeveloperGuideSidebarProps {
    nodes: NavNode[];
    searchQuery: string;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
        "group relative flex items-center gap-1.5 w-full text-left py-2 pr-2 rounded-lg text-[13px] leading-snug transition-all min-w-0",
        isActive
            ? "text-sky-700 bg-sky-50 font-semibold shadow-[inset_0_0_0_1px_rgba(14,165,233,0.2)]"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/80",
    ].join(" ");

const NavLinkItem: FC<{ node: Extract<NavNode, { type: "link" }>; depth: number }> = ({
    node,
    depth,
}) => {
    const location = useLocation();
    const { collapseNavSidebar } = useDeveloperGuideShell();
    const { pathname: linkPath, hash: linkHash } = parseNavPath(node.path);
    const paddingLeft = 12 + depth * 14;
    const useEnd = node.id === "overview" || Boolean(linkHash);

    const linkTitle = node.suffix ? `${node.label} ${node.suffix}` : node.label;

    if (node.disabled) {
        return (
            <div
                className="flex items-center gap-1.5 py-2 pr-3 text-[13px] text-slate-300 cursor-not-allowed min-w-0"
                style={{ paddingLeft }}
                title={linkTitle}
            >
                <span className="truncate">{node.label}</span>
                {node.suffix && (
                    <span className="font-mono text-[11px] text-slate-300 shrink-0">
                        {node.suffix}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`relative${depth === 0 ? " mb-3" : ""}`}>
            {depth > 0 && (
                <span
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 w-px bg-slate-200/80"
                    style={{ left: paddingLeft - 8 }}
                />
            )}
            <NavLink
                to={node.path}
                end={useEnd}
                onClick={() => {
                    if (node.collapseOnNavigate) collapseNavSidebar();
                }}
                className={({ isActive: routerActive }) =>
                    linkClass({
                        isActive: linkHash
                            ? location.pathname === linkPath && location.hash === linkHash
                            : routerActive,
                    })
                }
                style={{ paddingLeft }}
                title={linkTitle}
            >
                {({ isActive: routerActive }) => {
                    const isActive = linkHash
                        ? location.pathname === linkPath && location.hash === linkHash
                        : routerActive;

                    return (
                        <>
                            <span className="truncate flex-1 min-w-0">{node.label}</span>
                            {node.suffix && (
                                <span
                                    className={`font-mono text-[11px] shrink-0 ${
                                        isActive ? "text-sky-600" : "text-sky-400"
                                    }`}
                                >
                                    {node.suffix}
                                </span>
                            )}
                            {node.showArrow && (
                                <FiChevronRight
                                    size={14}
                                    className={`shrink-0 transition-colors ${
                                        isActive
                                            ? "text-sky-500"
                                            : "text-slate-400 group-hover:text-sky-500"
                                    }`}
                                    aria-hidden
                                />
                            )}
                        </>
                    );
                }}
            </NavLink>
        </div>
    );
};

const NavGroupItem: FC<{
    node: Extract<NavNode, { type: "group" }>;
    depth: number;
    searchQuery: string;
}> = ({ node, depth, searchQuery }) => {
    const location = useLocation();
    const hasActiveChild = useMemo(
        () => nodeHasActiveDescendant(node, location.pathname, location.hash),
        [node, location.pathname, location.hash]
    );
    const [open, setOpen] = useState(node.defaultOpen ?? (depth < 1 || hasActiveChild));

    useEffect(() => {
        if (searchQuery.trim()) setOpen(true);
    }, [searchQuery]);

    const paddingLeft = 8 + depth * 14;
    const { pathname: linkPath, hash: linkHash } = parseNavPath(node.path ?? "");
    const groupPathActive = isNavGroupPathActive(node, location.pathname, location.hash);
    const headerActive = linkHash
        ? location.pathname === linkPath && location.hash === linkHash
        : groupPathActive;

    useEffect(() => {
        if (hasActiveChild || headerActive) setOpen(true);
    }, [hasActiveChild, headerActive]);
    const headerClass =
        depth === 0
            ? "text-[11px] uppercase tracking-[0.1em] font-semibold"
            : "text-[13px] font-semibold";

    return (
        <div className={depth === 0 ? "mb-1 first:mt-0 not-first:mt-4" : ""}>
            {node.path ? (
                <div
                    className="flex items-center gap-1 w-full py-2 pr-3 rounded-lg transition-colors"
                    style={{ paddingLeft }}
                >
                    <button
                        type="button"
                        onClick={() => setOpen((prev) => !prev)}
                        className="p-0.5 rounded hover:bg-white/80 text-slate-400 shrink-0"
                        aria-expanded={open}
                        aria-label={open ? "Collapse section" : "Expand section"}
                    >
                        {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                    </button>
                    <NavLink
                        to={node.path}
                        end
                        className={() =>
                            [
                                "group/header truncate flex-1 min-w-0 text-left transition-colors rounded-md px-1 py-0.5 flex items-center gap-1",
                                headerClass,
                                headerActive && !hasActiveChild
                                    ? "text-sky-700 bg-sky-50 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.2)]"
                                    : depth === 0
                                      ? "text-slate-500 hover:text-slate-700"
                                      : "text-slate-800 hover:bg-white/80",
                            ].join(" ")
                        }
                        title={node.label}
                    >
                        <span className="truncate">{node.label}</span>
                    </NavLink>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    className={`flex items-center gap-2 w-full text-left py-2 pr-3 rounded-lg transition-colors ${
                        depth === 0
                            ? "text-[11px] uppercase tracking-[0.1em] font-semibold text-slate-500 hover:text-slate-700"
                            : "text-[13px] font-semibold text-slate-800 hover:bg-white/80"
                    }`}
                    style={{ paddingLeft }}
                >
                    {open ? (
                        <FiChevronDown size={14} className="text-slate-400 shrink-0" />
                    ) : (
                        <FiChevronRight size={14} className="text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{node.label}</span>
                </button>
            )}
            {open && (
                <div className={depth === 0 ? "mt-1.5 mb-1 space-y-0.5" : "mt-1 space-y-0.5"}>
                    {node.children.map((child) => (
                        <NavTreeItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            searchQuery={searchQuery}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const NavTreeItem: FC<{ node: NavNode; depth: number; searchQuery: string }> = ({
    node,
    depth,
    searchQuery,
}) => {
    if (isNavLink(node)) {
        return <NavLinkItem node={node} depth={depth} />;
    }

    if (isNavGroup(node)) {
        return <NavGroupItem node={node} depth={depth} searchQuery={searchQuery} />;
    }

    return null;
};

const DeveloperGuideSidebar: FC<DeveloperGuideSidebarProps> = ({ nodes, searchQuery }) => {
    if (nodes.length === 0) {
        return <p className="px-2 py-12 text-sm text-slate-500 text-center">No results found</p>;
    }

    return (
        <nav className="py-2 space-y-1" aria-label="Developer guide navigation">
            {nodes.map((node) => (
                <NavTreeItem key={node.id} node={node} depth={0} searchQuery={searchQuery} />
            ))}
        </nav>
    );
};

export default DeveloperGuideSidebar;
