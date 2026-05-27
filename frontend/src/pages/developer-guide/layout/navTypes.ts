export type NavNode =
    | {
          id: string;
          label: string;
          type: "group";
          path?: string;
          children: NavNode[];
          defaultOpen?: boolean;
          /** Show trailing chevron on navigable group headers. */
          showArrow?: boolean;
          searchText?: string;
      }
    | {
          id: string;
          label: string;
          type: "link";
          path: string;
          disabled?: boolean;
          /** Secondary label (e.g. version) shown beside the main label. */
          suffix?: string;
          /** Show a trailing chevron to indicate navigation. */
          showArrow?: boolean;
          /** Collapse the shell sidebar when this link is clicked (domain use cases). */
          collapseOnNavigate?: boolean;
          searchText?: string;
      };

export function isNavGroup(node: NavNode): node is Extract<NavNode, { type: "group" }> {
    return node.type === "group";
}

export function isNavLink(node: NavNode): node is Extract<NavNode, { type: "link" }> {
    return node.type === "link";
}
