import { FC } from "react";
import { useNavigate } from "react-router-dom";
import { FiBookOpen, FiCode, FiFileText } from "react-icons/fi";
import { ROUTES, getDeveloperGuideDocPath } from "@constants/routes";
import DeveloperGuideGuideCard from "./DeveloperGuideGuideCard";
const DeveloperGuideOverview: FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-full">
            <header className="border-b border-sky-100 bg-gradient-to-br from-sky-50 via-white to-slate-50">
                <div className="px-6 md:px-10 py-10 md:py-12 max-w-3xl mt-[18px]">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold uppercase tracking-widest mb-5 border border-sky-200">
                        <FiCode size={11} aria-hidden />
                        Developer documentation
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
                        Build on <span className="text-sky-500">ONDC</span>
                    </h1>
                    <p className="text-base text-slate-600 leading-relaxed max-w-2xl p-0 mb-0">
                        Everything you need to integrate with the Open Network for Digital Commerce.
                        Explore guides, authentication tools, and API references organised by domain
                        and use case.
                    </p>
                </div>
            </header>

            <div className="px-6 md:px-10 py-10 md:py-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center flex-shrink-0">
                        <FiBookOpen size={15} className="text-sky-600" aria-hidden />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-900 leading-none mb-2">
                            Where to start
                        </p>
                        <p className="text-xs text-slate-500 mb-0">
                            Use the sidebar or jump in below
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                    <DeveloperGuideGuideCard
                        title="Getting Started"
                        subtitle="ONDC Guides"
                        description="Walk through exploring protocol flows, starting with a recommended use case and the tools you need to validate requests."
                        icon={<FiBookOpen size={20} className="text-sky-600" />}
                        onClick={() => navigate(ROUTES.DEVELOPER_GUIDE_GETTING_STARTED)}
                    />
                    <DeveloperGuideGuideCard
                        title="About ONDC"
                        subtitle="General documentation"
                        description="Learn what the Open Network for Digital Commerce is, how the network works, and how participants connect and transact."
                        icon={<FiFileText size={20} className="text-sky-600" />}
                        onClick={() => navigate(getDeveloperGuideDocPath("about-ondc"))}
                    />
                </div>

                <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-4 border-l-4 border-l-sky-400">
                    <p className="text-sm text-slate-700 leading-relaxed">
                        <span className="font-semibold text-slate-900">Tip:</span> Use{" "}
                        <strong className="font-medium text-slate-800">Filter navigation</strong> in
                        the sidebar to quickly find a domain, use case, or documentation page.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DeveloperGuideOverview;
