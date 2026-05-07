import { useCallback, useState, useEffect } from "react";
import { SubmitEventParams } from "../../../../types/flow-types";
import { toast } from "react-toastify";
import { useSession } from "../../../../context/context";
import { getTransactionData, getCompletePayload } from "../../../../utils/request-utils";

export interface DynamicOfferRule {
    id: string;
    itemIds: string[];
    categoryIds: string[];
    locationIds: string[];
    minOrderValue?: number;
    minItemCount?: number;
    maxItemCount?: number;
    isAdditive: boolean;
}

interface ReteB2BItem {
    itemId: string;
    quantity: number;
    location: string;
    fulfillment_id: string;
}

interface RetailerCustomerInput {
    type: "new" | "existing";
    customer_id?: string;
    phone_number?: string;
    email?: string;
    tax_number?: string;
    provider_tax_number?: string;
    shop_name?: string;
    address?: string;
    city_code: string;
    state_code?: string;
    available_offers?: string[];
    items: ReteB2BItem[];
}

type TargetListItem = {
    code: string;
    value: string;
};

type Tag = {
    code: string;
    list?: TargetListItem[];
};

type CatalogItem = {
    id: string;
    descriptor?: { name?: string };
    category_id?: string;
    category_ids?: string[];
    price?: { value?: string };
    tags?: Tag[];
    location_id?: string;
    location_ids?: string[];
};

type CatalogLocation = { id: string };
type CatalogFulfillment = { id: string };

type CatalogCategory = {
    id: string;
    descriptor?: { name?: string };
};

type CatalogOffer = {
    id: string;
    descriptor: {
        code: string;
    };
    item_ids?: string[];
    location_ids?: string[];
    category_ids?: string[];
    tags?: Tag[];
};

type CatalogProvider = {
    id: string;
    items: CatalogItem[];
    locations: CatalogLocation[];
    categories?: CatalogCategory[];
    fulfillments?: CatalogFulfillment[];
    offers?: CatalogOffer[];
};

type OnSearchPayload = {
    message: {
        catalog: {
            "bpp/providers": CatalogProvider[];
        };
    };
};

export default function ReteB2BInitOffers({
    submitEvent,
}: {
    submitEvent: (data: SubmitEventParams) => Promise<void>;
}) {
    const { sessionData, activeFlowId } = useSession();
    const [isLoading, setIsLoading] = useState(false);

    const [catalogPayload, setCatalogPayload] = useState<OnSearchPayload | null>(null);
    const [isDataPasted, setIsDataPasted] = useState(false);
    const [itemOptions, setItemOptions] = useState<string[]>([]);
    const [, setLocationOptions] = useState<string[]>([]);
    const [fulfillmentOptions, setFulfillmentOptions] = useState<string[]>([]);
    const [offers, setOffers] = useState<CatalogOffer[]>([]);
    const [dynamicOfferRules, setDynamicOfferRules] = useState<Record<string, DynamicOfferRule>>(
        {}
    );
    const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
    const [itemCategories, setItemCategories] = useState<Record<string, string>>({});
    const [itemNames, setItemNames] = useState<Record<string, string>>({});
    const [itemLocations, setItemLocations] = useState<Record<string, string[]>>({});
    const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});

    const [form, setForm] = useState<RetailerCustomerInput>({
        type: "new",
        city_code: "",
        available_offers: [],
        items: [
            {
                itemId: "",
                quantity: 1,
                location: "",
                fulfillment_id: "",
            },
        ],
    });

    // --- Dynamic Validation Helper ---
    const isDynamicCategoryMatch = useCallback(
        (itemCatId: string, itemNameStr: string, ruleCategoryIds: string[]) => {
            const catName = (
                itemCatId && categoryNames[itemCatId] ? categoryNames[itemCatId] : itemCatId || ""
            ).toLowerCase();
            const itemName = (itemNameStr || "").toLowerCase();

            return ruleCategoryIds.some((ruleCatId) => {
                if (itemCatId === ruleCatId) return true;
                const rCatName = (categoryNames[ruleCatId] || ruleCatId).toLowerCase();

                if (
                    rCatName &&
                    catName &&
                    (catName === rCatName ||
                        catName.includes(rCatName) ||
                        rCatName.includes(catName))
                )
                    return true;
                if (
                    rCatName &&
                    itemName &&
                    (itemName.includes(rCatName) || rCatName.includes(itemName))
                )
                    return true;

                const ignoreWords = ["and", "the", "for", "with", "all"];
                const words1 = catName
                    .split(/[\s,&]+/)
                    .filter((w) => w.length > 2 && !ignoreWords.includes(w));
                let words2 = rCatName
                    .split(/[\s,&]+/)
                    .filter((w) => w.length > 2 && !ignoreWords.includes(w));
                const itemWords = itemName
                    .split(/[\s,&]+/)
                    .filter((w) => w.length > 2 && !ignoreWords.includes(w));

                // FMCG Aliasing to support specific brand matching via category definitions
                if (
                    words2.some((w) =>
                        ["soft", "drink", "drinks", "beverage", "juice", "juices"].includes(w)
                    )
                ) {
                    words2 = [
                        ...words2,
                        "coca",
                        "cola",
                        "pepsi",
                        "sprite",
                        "fanta",
                        "coke",
                        "limca",
                        "thums",
                        "up",
                        "mazaa",
                        "mirinda",
                        "7up",
                        "mountain",
                        "dew",
                    ];
                }
                if (words2.some((w) => ["atta", "flour", "flours", "sooji"].includes(w))) {
                    words2 = [...words2, "wheat", "chakki", "maida", "besan"];
                }

                if (
                    words1.some((w1) =>
                        words2.some((w2) => w1 === w2 || w1.includes(w2) || w2.includes(w1))
                    )
                )
                    return true;
                if (
                    itemWords.some((w1) =>
                        words2.some((w2) => w1 === w2 || w1.includes(w2) || w2.includes(w1))
                    )
                )
                    return true;

                return false;
            });
        },
        [categoryNames]
    );

    const getOfferValidationMessage = useCallback(
        (offerId: string): string | null => {
            const rule = dynamicOfferRules[offerId];
            if (!rule) return null;

            // 1. Item & Category Compatibility
            const hasItemRules = rule.itemIds && rule.itemIds.length > 0;
            const hasCategoryRules = rule.categoryIds && rule.categoryIds.length > 0;
            const hasLocationRules = rule.locationIds && rule.locationIds.length > 0;

            if (hasItemRules || hasCategoryRules || hasLocationRules) {
                const hasCompatibleItem = form.items.some((item) => {
                    if (!item.itemId || item.quantity <= 0) return false;

                    // Location Check
                    const itemLocation = item.location || itemLocations[item.itemId]?.[0] || "";
                    const locMatch =
                        hasLocationRules && itemLocation && rule.locationIds.includes(itemLocation);

                    // Item Check
                    const itemMatch = hasItemRules && rule.itemIds.includes(item.itemId);

                    // Category Check
                    const catId = itemCategories[item.itemId];
                    const itemName = itemNames[item.itemId] || "";
                    const catMatch =
                        hasCategoryRules &&
                        isDynamicCategoryMatch(catId, itemName, rule.categoryIds);

                    // Valid if ANY of the criteria match (Location OR Item OR Category)
                    return locMatch || itemMatch || catMatch;
                });

                if (!hasCompatibleItem) {
                    const msg: string[] = [];
                    if (hasItemRules) msg.push(`items: ${rule.itemIds.join(", ")}`);
                    if (hasCategoryRules) {
                        const catDisplay = rule.categoryIds
                            .map((id) => categoryNames[id] || id)
                            .join(", ");
                        msg.push(`categories: ${catDisplay}`);
                    }
                    if (hasLocationRules) msg.push(`locations: ${rule.locationIds.join(", ")}`);
                    return `Valid for ${msg.join(" OR ")}`;
                }
            }

            // 2. Additivity
            const selected = form.available_offers || [];
            const otherSelected = selected.filter((id) => id !== offerId);
            if (otherSelected.length > 0) {
                if (!rule.isAdditive) return "Cannot combine with other offers.";
                const hasNonAdditiveSelected = otherSelected.some(
                    (id) => dynamicOfferRules[id] && !dynamicOfferRules[id].isAdditive
                );
                if (hasNonAdditiveSelected) return "A non-combinable offer is already active.";
            }

            // 3. Dynamic Qualifiers Calculation
            // First determine the valid items that qualify for the offer's rules
            const qualifyingItems = form.items.filter((item) => {
                const hasItemRules = rule.itemIds && rule.itemIds.length > 0;
                const hasCategoryRules = rule.categoryIds && rule.categoryIds.length > 0;
                const hasLocationRules = rule.locationIds && rule.locationIds.length > 0;

                if (hasItemRules || hasCategoryRules || hasLocationRules) {
                    // Location Check
                    const itemLocation = item.location || itemLocations[item.itemId]?.[0] || "";
                    const locMatch =
                        hasLocationRules && itemLocation && rule.locationIds.includes(itemLocation);

                    // Item Check
                    const itemMatch = hasItemRules && rule.itemIds.includes(item.itemId);

                    // Category Check
                    const catId = itemCategories[item.itemId];
                    const itemName = itemNames[item.itemId] || "";
                    const catMatch =
                        hasCategoryRules &&
                        isDynamicCategoryMatch(catId, itemName, rule.categoryIds);

                    // Valid if ANY of the criteria match (Location OR Item OR Category)
                    return locMatch || itemMatch || catMatch;
                }
                return true;
            });

            // 3a. Min Order Value
            if (rule.minOrderValue && rule.minOrderValue > 0) {
                const totalValue = qualifyingItems.reduce(
                    (sum, item) => sum + (itemPrices[item.itemId] || 0) * item.quantity,
                    0
                );
                if (totalValue < rule.minOrderValue)
                    return `Min value ₹${rule.minOrderValue} required on valid items (Current: ₹${totalValue})`;
            }

            // 3b. Item Count
            if (rule.minItemCount && rule.minItemCount > 0) {
                const totalCount = qualifyingItems.reduce((sum, item) => sum + item.quantity, 0);
                if (totalCount < rule.minItemCount)
                    return `Min quantity ${rule.minItemCount} required on valid items (Current: ${totalCount})`;
                if (rule.maxItemCount && rule.maxItemCount > 0 && totalCount > rule.maxItemCount)
                    return `Max quantity ${rule.maxItemCount} allowed (Current: ${totalCount})`;
            }

            return null;
        },
        [
            dynamicOfferRules,
            form.items,
            itemLocations,
            itemPrices,
            itemCategories,
            itemNames,
            categoryNames,
            isDynamicCategoryMatch,
        ]
    );

    const processPayload = useCallback((data: unknown) => {
        try {
            const parsed = data as OnSearchPayload;
            setCatalogPayload(parsed);

            const providers = parsed.message.catalog["bpp/providers"];
            const provider = providers[0];

            if (provider) {
                setItemOptions(provider.items?.map((i) => i.id) || []);

                const provLocs = provider.locations?.map((l: CatalogLocation) => l.id) || [];
                const offerLocs = (provider.offers || [])
                    .flatMap((o: CatalogOffer) =>
                        (Array.isArray(o.location_ids) ? o.location_ids : []).flatMap(
                            (v: unknown) =>
                                typeof v === "string"
                                    ? v.split(",").map((s: string) => s.trim())
                                    : (v as string)
                        )
                    )
                    .filter(Boolean);
                setLocationOptions(Array.from(new Set([...provLocs, ...offerLocs])));
                if (provider.fulfillments) {
                    setFulfillmentOptions(provider.fulfillments.map((f) => f.id));
                }

                // Extract Item Prices, Names, and Categories Dynamically
                const parsedPrices: Record<string, number> = {};
                const parsedCategories: Record<string, string> = {};
                const parsedItemNames: Record<string, string> = {};
                const parsedItemLocations: Record<string, string[]> = {};
                provider.items?.forEach((item: CatalogItem) => {
                    parsedPrices[item.id] = parseFloat(item.price?.value || "0");
                    parsedItemNames[item.id] = item.descriptor?.name || "";
                    if (item.category_id) {
                        parsedCategories[item.id] = item.category_id;
                    } else if (item.category_ids && item.category_ids.length > 0) {
                        parsedCategories[item.id] = item.category_ids[0];
                    }

                    let locs: string[] = [];
                    if (item.location_id) locs.push(item.location_id);
                    if (Array.isArray(item.location_ids)) locs = [...locs, ...item.location_ids];
                    parsedItemLocations[item.id] = Array.from(new Set(locs.filter(Boolean)));
                });
                setItemPrices(parsedPrices);
                setItemCategories(parsedCategories);
                setItemNames(parsedItemNames);
                setItemLocations(parsedItemLocations);

                const parsedCategoryNames: Record<string, string> = {};
                provider.categories?.forEach((cat: CatalogCategory) => {
                    parsedCategoryNames[cat.id] = cat.descriptor?.name || "";
                });
                setCategoryNames(parsedCategoryNames);

                // Extract Offers and Build Rules Dynamically
                const rules: Record<string, DynamicOfferRule> = {};
                const collectedOffers: (CatalogOffer & { items?: unknown[] })[] =
                    provider.offers || [];

                // Standardizing rules from payload tags (highly dynamic to adapt to different on_search structures)
                collectedOffers.forEach((off: CatalogOffer & { items?: unknown[] }) => {
                    let minVal = 0;
                    let isAdditive = true;
                    // Provide defaults so even empty structures adapt gracefully
                    const rawItemIds = Array.isArray(off.item_ids)
                        ? off.item_ids
                        : Array.isArray(off.items)
                          ? off.items
                          : [];
                    let itemIds: string[] = rawItemIds
                        .flatMap((v: unknown) =>
                            typeof v === "string"
                                ? v.split(",").map((s: string) => s.trim())
                                : (v as string)
                        )
                        .filter(Boolean);

                    const categoryIds: string[] = (
                        Array.isArray(off.category_ids) ? off.category_ids : []
                    )
                        .flatMap((v: unknown) =>
                            typeof v === "string"
                                ? v.split(",").map((s: string) => s.trim())
                                : (v as string)
                        )
                        .filter(Boolean);

                    const locationIds: string[] = (
                        Array.isArray(off.location_ids) ? off.location_ids : []
                    )
                        .flatMap((v: unknown) =>
                            typeof v === "string"
                                ? v.split(",").map((s: string) => s.trim())
                                : (v as string)
                        )
                        .filter(Boolean);

                    let minItemCount = 0;
                    let maxItemCount = 0;

                    // Dynamically scrape all tags to find offer rules constraints
                    off.tags?.forEach((tag: Tag & { descriptor?: { code: string } }) => {
                        const tCode = tag.code || tag.descriptor?.code;
                        if (tCode === "rules" || tCode === "qualifier" || tCode === "meta") {
                            tag.list?.forEach(
                                (l: TargetListItem & { descriptor?: { code: string } }) => {
                                    const lCode = l.code || l.descriptor?.code;
                                    if (lCode === "min_value") minVal = parseFloat(l.value || "0");
                                    if (lCode === "item_count")
                                        minItemCount = parseFloat(l.value || "0");
                                    if (lCode === "item_count_upper")
                                        maxItemCount = parseFloat(l.value || "0");
                                    if (lCode === "additive") {
                                        isAdditive = l.value === "true" || l.value === "yes";
                                        // Make sure "false" or "no" results in false
                                        if (l.value === "false" || l.value === "no")
                                            isAdditive = false;
                                    }
                                    if (lCode === "item_ids") {
                                        // In case itemIds are provided as a comma separated string within rules
                                        if (l.value) {
                                            itemIds = l.value
                                                .split(",")
                                                .map((s: string) => s.trim());
                                        }
                                    }
                                }
                            );
                        }
                        // Fallback: Check if there's an explicit item_ids tag group with a list of values
                        if (tCode === "item_ids" && itemIds.length === 0) {
                            if (tag.list) {
                                itemIds = tag.list.map((l: TargetListItem) => l.value);
                            }
                        }
                    });

                    rules[off.id] = {
                        id: off.id,
                        itemIds: itemIds,
                        categoryIds: categoryIds,
                        locationIds: locationIds,
                        minOrderValue: minVal,
                        minItemCount,
                        maxItemCount,
                        isAdditive: isAdditive,
                    };
                });
                setDynamicOfferRules(rules);

                const uniqueOffers = Array.from(
                    new Map(collectedOffers.map((o) => [o.id, o])).values()
                );
                setOffers(uniqueOffers);
            }
            setIsDataPasted(true);
        } catch (err) {
            toast.error("Invalid payload structure.");
            console.error("Invalid on_search payload", err);
        }
    }, []);

    const fetchPayloadAndPopulate = useCallback(async () => {
        try {
            if (!sessionData || !activeFlowId) return;
            const transactionId = sessionData.flowMap[activeFlowId];
            if (!transactionId) return;

            setIsLoading(true);
            const transactionData = await getTransactionData(
                transactionId,
                sessionData.subscriberUrl
            );
            if (!transactionData) {
                setIsLoading(false);
                return;
            }

            const onSearchActions = transactionData.apiList.filter(
                (api) => api.action === "on_search"
            );
            if (onSearchActions.length === 0) {
                toast.error("No on_search payload found in transaction history.");
                setIsLoading(false);
                return;
            }

            const latestOnSearch = onSearchActions[onSearchActions.length - 1];
            const payloadId = latestOnSearch.payloadId;

            const completePayloads = await getCompletePayload<unknown, OnSearchPayload>([
                payloadId,
            ]);
            if (!completePayloads || completePayloads.length === 0) {
                setIsLoading(false);
                return;
            }

            const payloadData = completePayloads[0].req;
            processPayload(payloadData);
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching payload:", error);
            toast.error("Failed to fetch payload automatically.");
            setIsLoading(false);
        }
    }, [sessionData, activeFlowId, processPayload]);

    useEffect(() => {
        fetchPayloadAndPopulate();
    }, [fetchPayloadAndPopulate]);

    const handleChange = (key: keyof RetailerCustomerInput, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleItemChange = (index: number, key: keyof ReteB2BItem, value: string | number) => {
        const updatedItems = [...form.items];
        updatedItems[index] = { ...updatedItems[index], [key]: value };

        // Auto-populate location if itemId changes
        if (key === "itemId" && typeof value === "string" && value) {
            const autoLocations = itemLocations[value];
            if (autoLocations && autoLocations.length > 0) {
                updatedItems[index].location = autoLocations[0];
            }
        }

        // Reset offers if items change (to re-validate)
        setForm({ ...form, items: updatedItems, available_offers: [] });
    };

    const addItem = () => {
        if (form.items.length >= 5) return;
        setForm({
            ...form,
            items: [...form.items, { itemId: "", quantity: 1, location: "", fulfillment_id: "" }],
        });
    };

    const removeItem = (index: number) => {
        if (form.items.length === 1) return;
        const updatedItems = form.items.filter((_, i) => i !== index);
        setForm({ ...form, items: updatedItems, available_offers: [] });
    };

    const toggleOffer = (offerId: string) => {
        const selected = form.available_offers || [];
        if (selected.includes(offerId)) {
            setForm({ ...form, available_offers: selected.filter((id) => id !== offerId) });
        } else {
            // --- UPDATED: Add validation check before selecting ---
            const error = getOfferValidationMessage(offerId);
            if (error) {
                alert(error);
                return;
            }
            setForm({ ...form, available_offers: [...selected, offerId] });
        }
    };

    const submit = async () => {
        if (!form.city_code) {
            alert("City code is required");
            return;
        }
        if (form.type === "new") {
            if (
                !form.customer_id ||
                !form.phone_number ||
                !form.email ||
                !form.tax_number ||
                !form.provider_tax_number ||
                !form.shop_name ||
                !form.address
            ) {
                alert("All fields required for new retailer");
                return;
            }
        }
        if (!catalogPayload) {
            alert("Please paste on_search payload first");
            return;
        }
        await submitEvent({
            jsonPath: {},
            formData: {
                ...form,
                live_catalog: catalogPayload,
            } as unknown as Record<string, string>,
            catalog: catalogPayload,
        });
    };

    const inputStyle =
        "w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900";
    const label = (text: string, required: boolean) => (
        <label className="text-sm font-medium">
            {text} {required && <span className="text-red-500">*</span>}
        </label>
    );

    return (
        <div className="flex flex-col gap-4 p-4">
            {!isDataPasted ? (
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500">
                    {isLoading
                        ? "Fetching and mapping on_search payload..."
                        : "Failed to load on_search payload automatically. Please check transaction history."}
                </div>
            ) : (
                <>
                    {/* ... (Customer fields unchanged) ... */}
                    {label("Retailer Type", false)}
                    <select
                        value={form.type}
                        onChange={(e) => handleChange("type", e.target.value)}
                        className={inputStyle}
                    >
                        <option value="new">New Retailer</option>
                        <option value="existing">Existing Retailer</option>
                    </select>
                    {label("Customer ID", form.type === "new")}
                    <input
                        value={form.customer_id}
                        onChange={(e) => handleChange("customer_id", e.target.value)}
                        className={inputStyle}
                    />
                    {label("City Code", true)}
                    <input
                        value={form.city_code}
                        onChange={(e) => handleChange("city_code", e.target.value)}
                        className={inputStyle}
                    />
                    {label("Phone Number", form.type === "new")}
                    <input
                        value={form.phone_number}
                        onChange={(e) => handleChange("phone_number", e.target.value)}
                        className={inputStyle}
                    />
                    {label("Email", form.type === "new")}
                    <input
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className={inputStyle}
                    />
                    {label("GST Number", form.type === "new")}
                    <input
                        value={form.tax_number}
                        onChange={(e) => handleChange("tax_number", e.target.value)}
                        className={inputStyle}
                    />
                    {label("PAN Number", form.type === "new")}
                    <input
                        value={form.provider_tax_number}
                        onChange={(e) => handleChange("provider_tax_number", e.target.value)}
                        className={inputStyle}
                    />
                    {label("Shop Name", form.type === "new")}
                    <input
                        value={form.shop_name}
                        onChange={(e) => handleChange("shop_name", e.target.value)}
                        className={inputStyle}
                    />
                    {label("Address", form.type === "new")}
                    <input
                        value={form.address}
                        onChange={(e) => handleChange("address", e.target.value)}
                        className={inputStyle}
                    />

                    {/* ITEMS SECTION */}
                    <div>
                        <h3 className="font-bold">Items</h3>
                        {form.items.map((item, index) => (
                            <div key={index} className="flex gap-2 mb-2 items-center">
                                <select
                                    value={item.itemId}
                                    onChange={(e) =>
                                        handleItemChange(index, "itemId", e.target.value)
                                    }
                                    className={inputStyle}
                                >
                                    <option value="">Item</option>
                                    {itemOptions.map((id) => (
                                        <option key={id}>{id}</option>
                                    ))}
                                </select>
                                <input
                                    min={1}
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) =>
                                        handleItemChange(index, "quantity", Number(e.target.value))
                                    }
                                    className={inputStyle}
                                />
                                <select
                                    value={item.location}
                                    onChange={(e) =>
                                        handleItemChange(index, "location", e.target.value)
                                    }
                                    className={inputStyle}
                                >
                                    <option value="">Location</option>
                                    {(item.itemId && itemLocations[item.itemId]
                                        ? itemLocations[item.itemId]
                                        : []
                                    ).map((loc) => (
                                        <option key={loc}>{loc}</option>
                                    ))}
                                </select>
                                <select
                                    value={item.fulfillment_id}
                                    onChange={(e) =>
                                        handleItemChange(index, "fulfillment_id", e.target.value)
                                    }
                                    className={inputStyle}
                                >
                                    <option value="">Fulfillment</option>
                                    {fulfillmentOptions.map((f) => (
                                        <option key={f}>{f}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => removeItem(index)}
                                    className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button className="bg-gray-200 p-2 rounded" onClick={addItem}>
                            Add Item
                        </button>
                    </div>

                    {/* OFFERS SECTION - UPDATED WITH TOOLTIP/HINT */}
                    <div>
                        <h3 className="font-bold">Available Offers</h3>
                        <div className="flex flex-col gap-1">
                            {offers.map((offer) => {
                                const validationError = getOfferValidationMessage(offer.id);
                                return (
                                    <label
                                        key={offer.id}
                                        className={`flex items-center gap-2 p-1 rounded ${validationError ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                form.available_offers?.includes(offer.id) || false
                                            }
                                            onChange={() => toggleOffer(offer.id)}
                                            title={validationError || "Apply this offer"}
                                        />
                                        <span className="text-sm">
                                            {offer.id} ({offer.descriptor.code})
                                            {validationError && (
                                                <span className="ml-2 text-[10px] text-red-500 italic uppercase">
                                                    [{validationError}]
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <button className="bg-blue-500 text-white p-2 rounded mt-4" onClick={submit}>
                        Submit
                    </button>
                </>
            )}
        </div>
    );
}
