import type { NavNode } from "./navTypes";
import { isNavGroup } from "./navTypes";

export function filterNavTree(nodes: NavNode[], query: string): NavNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return nodes;

    const filterNode = (node: NavNode): NavNode | null => {
        if (isNavGroup(node)) {
            const filteredChildren = node.children
                .map(filterNode)
                .filter((child): child is NavNode => child !== null);
            const labelMatches = node.label.toLowerCase().includes(q);
            const searchMatches = (node.searchText ?? "").toLowerCase().includes(q);
            if (filteredChildren.length > 0 || labelMatches || searchMatches) {
                return { ...node, children: filteredChildren, defaultOpen: true };
            }
            return null;
        }

        const haystack =
            `${node.label} ${node.suffix ?? ""} ${node.searchText ?? ""}`.toLowerCase();
        return haystack.includes(q) ? node : null;
    };

    return nodes.map(filterNode).filter((node): node is NavNode => node !== null);
}
