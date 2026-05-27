import { TabConfig, TabType } from "@pages/auth-header/types";

interface TabsProps {
    tabs: TabConfig[];
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    layout?: "default" | "hero";
}

const Tabs = ({ tabs, activeTab, setActiveTab, layout = "default" }: TabsProps) => {
    const isHero = layout === "hero";

    return (
        <div
            className={
                isHero
                    ? "flex flex-row flex-nowrap gap-2"
                    : "flex gap-2 mb-6 border-b border-gray-200 pb-4"
            }
            role="tablist"
            aria-label="Auth header documentation tabs"
        >
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`tabpanel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 font-medium transition-all ${
                        isHero
                            ? "px-5 py-3 rounded-xl text-sm whitespace-nowrap shrink-0"
                            : "px-5 py-3 rounded-lg"
                    } ${
                        activeTab === tab.id
                            ? "bg-sky-600 text-white shadow-lg shadow-sky-200/80"
                            : isHero
                              ? "bg-white text-slate-700 hover:bg-sky-50 border border-slate-200 hover:border-sky-200"
                              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default Tabs;
