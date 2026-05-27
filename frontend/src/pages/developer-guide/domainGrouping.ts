import type { BuildEntry } from "./types";
import { isDomainEnabled } from "./utils";

export function getDomainShortLabel(domainKey: string): string {
    return domainKey.replace(/^ONDC:/i, "");
}

/** Merge derived family keys into a shared group (e.g. NIC → LOG for logistics). */
const DOMAIN_FAMILY_GROUP_ALIASES: Record<string, string> = {
    NIC: "LOG",
    OG: "LOG",
    RETEB: "RET",
    RETINVL: "RET",
};

/** Family key for grouping, e.g. ONDC:FIS12 and ONDC:FIS13 → FIS */
export function getDomainFamilyKey(domainKey: string): string {
    const short = getDomainShortLabel(domainKey);
    const match = short.match(/^([A-Za-z]+)/);
    const raw = match ? match[1].toUpperCase() : short.toUpperCase();
    return DOMAIN_FAMILY_GROUP_ALIASES[raw] ?? raw;
}

/** Display titles keyed by derived family prefix (LOG10 → LOG, ONDC:RET11 → RET). */
const DOMAIN_FAMILY_TITLES: Record<string, string> = {
    FIS: "Financial Services",
    LOG: "Logistics",
    TRV: "Mobility Transit and Travel",
    RET: "Retail",
};

/** Display title for a domain family (e.g. FIS → "FIS - Financial Services"). */
export function getDomainFamilyLabel(familyKey: string): string {
    const key = familyKey.toUpperCase();
    return DOMAIN_FAMILY_TITLES[key] ?? familyKey;
}

export interface DomainFamilyGroup {
    familyKey: string;
    label: string;
    domains: BuildEntry[];
}

export function groupBuildsByFamily(builds: BuildEntry[]): DomainFamilyGroup[] {
    const map = new Map<string, DomainFamilyGroup>();

    for (const dom of builds) {
        const familyKey = getDomainFamilyKey(dom.key);
        const existing = map.get(familyKey);
        if (existing) {
            existing.domains.push(dom);
        } else {
            map.set(familyKey, {
                familyKey,
                label: getDomainFamilyLabel(familyKey),
                domains: [dom],
            });
        }
    }

    return [...map.values()]
        .map((family) => ({
            ...family,
            label: getDomainFamilyLabel(family.familyKey),
            domains: [...family.domains].sort((a, b) => a.key.localeCompare(b.key)),
        }))
        .sort((a, b) => {
            const aEn = a.domains.some(isDomainEnabled);
            const bEn = b.domains.some(isDomainEnabled);
            if (aEn !== bEn) return aEn ? -1 : 1;
            return a.label.localeCompare(b.label);
        });
}
