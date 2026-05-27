import { FC } from "react";
import { useNavigate } from "react-router-dom";
import { FiFileText, FiKey, FiLayers } from "react-icons/fi";
import { ROUTES, getDeveloperGuideDocPath } from "@constants/routes";
import { useDeveloperGuideShell } from "./DeveloperGuideShellContext";
import DeveloperGuideGuideCard from "./DeveloperGuideGuideCard";

const DeveloperGuideGeneralContent: FC = () => {
    const navigate = useNavigate();
    const { docs } = useDeveloperGuideShell();

    return (
        <div className="min-h-full">
            <header className="border-b border-sky-100 bg-gradient-to-br from-sky-50 via-white to-slate-50">
                <div className="px-6 md:px-10 py-10 md:py-12 max-w-3xl mt-[18px]">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold uppercase tracking-widest mb-5 border border-sky-200">
                        <FiLayers size={11} aria-hidden />
                        General documentation
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
                        Guides &amp; <span className="text-sky-500">reference</span>
                    </h1>
                    <p className="text-base text-slate-600 leading-relaxed max-w-2xl p-0 mb-0">
                        Core concepts and tools for ONDC integration — authentication helpers,
                        network fundamentals, and shared documentation.
                    </p>
                </div>
            </header>

            <div className="px-6 md:px-10 py-10 md:py-12">
                <div className="grid gap-5 md:gap-6 grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] items-stretch">
                    <DeveloperGuideGuideCard
                        title="Auth Tools"
                        subtitle="Authorization"
                        description="Generate and validate authorization headers using Blake2b and Ed25519 signing."
                        icon={<FiKey size={20} className="text-sky-600" />}
                        onClick={() => navigate(ROUTES.DEVELOPER_GUIDE_AUTH_TOOLS)}
                    />
                    {docs.map((doc) => (
                        <DeveloperGuideGuideCard
                            key={doc.slug}
                            title={doc.label}
                            subtitle="Documentation"
                            description={
                                doc.shortDescription ||
                                "Read the guide for concepts, conventions, and integration details."
                            }
                            icon={<FiFileText size={20} className="text-sky-600" />}
                            onClick={() => navigate(getDeveloperGuideDocPath(doc.slug))}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DeveloperGuideGeneralContent;
