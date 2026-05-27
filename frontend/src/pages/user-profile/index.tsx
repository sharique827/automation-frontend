import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuExternalLink, LuUser, LuSettings, LuBookmark, LuFileText } from "react-icons/lu";

import { UserContext } from "@context/userContext";
import JsonDataForm from "@components/registry-components/subscriber-form";
import { authTokenManager } from "@utils/localStorageManager";
import ScenarioPreferencesForm from "./scenario-preferences-form";
import PastReportsSection from "./past-reports-section";
import { ROUTES } from "@constants/routes";

const REGISTRY_URL = import.meta.env.VITE_REGISTRY_URL as string;

const UserProfile = () => {
    const { refreshUser, userDetails } = useContext(UserContext);
    const navigate = useNavigate();
    const [scenarioFormTrigger, setScenarioFormTrigger] = useState(0);

    const token = authTokenManager.get();
    const registryUrl = token ? `${REGISTRY_URL}?token=${token}` : REGISTRY_URL;

    const navItems = [
        {
            label: "Redirect to Registry",
            id: null as string | null,
            href: registryUrl,
            icon: LuExternalLink,
        },
        { label: "Profile Section", id: "profile-section", href: null, icon: LuUser },
        {
            label: "Add Scenario Testing Config",
            id: "add-scenario-config",
            href: null,
            icon: LuSettings,
        },
        { label: "Saved Configs", id: "saved-configs", href: null, icon: LuBookmark },
        { label: "Past Reports", id: "past-reports", href: null, icon: LuFileText },
    ];

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    useEffect(() => {
        if (!userDetails) {
            navigate(ROUTES.HOME);
        }
    }, [navigate, userDetails]);

    const scrollTo = (id: string) => {
        if (id === "add-scenario-config") {
            setScenarioFormTrigger((t) => t + 1);
        }
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="font-sans flex min-h-screen px-2 pt-4 pb-2 gap-3 max-w-screen-2xl mx-auto w-full">
            {/* Left sidebar nav */}
            <aside className="w-80 shrink-0">
                <div className="sticky top-4 h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden border border-gray-100">
                    {/* Sidebar header */}
                    <div className="px-6 py-8 bg-gradient-to-br from-sky-400 to-sky-600 text-center">
                        <div className="mb-4 flex justify-center">
                            {userDetails?.avatarUrl ? (
                                <img
                                    src={userDetails.avatarUrl}
                                    alt={`${userDetails.githubId}'s avatar`}
                                    className="w-16 h-16 rounded-full border-2 border-white/60 object-cover shadow-md"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-md">
                                    <LuUser className="text-2xl text-white" />
                                </div>
                            )}
                        </div>
                        <p className="text-sm font-bold text-white truncate">
                            {userDetails?.username || "Guest"}
                        </p>
                        {userDetails?.participantId && (
                            <p className="text-xs text-sky-100 mt-0.5 truncate">
                                {userDetails.participantId}
                            </p>
                        )}
                        <p className="text-xs font-semibold text-sky-200 uppercase tracking-widest mt-3">
                            Account
                        </p>
                    </div>

                    {/* Nav items */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) =>
                            item.href ? (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 transition-all group"
                                >
                                    <span className="flex items-center gap-3">
                                        <item.icon className="text-lg shrink-0 text-emerald-600" />
                                        {item.label}
                                    </span>
                                    <LuExternalLink className="text-sm text-emerald-500 group-hover:text-emerald-700 transition-colors" />
                                </a>
                            ) : (
                                <button
                                    key={item.label}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-slate-50 hover:border-slate-200 border border-transparent transition-all group text-left"
                                    onClick={() => item.id && scrollTo(item.id)}
                                >
                                    <item.icon className="text-lg text-gray-400 group-hover:text-slate-600 shrink-0 transition-colors" />
                                    {item.label}
                                </button>
                            )
                        )}
                    </nav>

                    {/* Sidebar footer */}
                    <div className="px-5 py-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">ONDC Automation</p>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 flex-1 text-center min-w-0">
                <div
                    id="profile-section"
                    className="bg-gray-100 p-2 rounded-md shadow-sm mb-2 items-start scroll-mt-24"
                >
                    <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-4">User Profile</h1>
                    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl">
                        <div className="text-left text-gray-700 space-y-1">
                            <p>
                                <strong>Login:</strong> {userDetails?.username || "N/A"}
                            </p>
                            <p>
                                <strong>Participant ID:</strong>{" "}
                                {userDetails?.participantId || "N/A"}
                            </p>
                        </div>
                    </div>
                </div>

                <JsonDataForm />

                <div id="add-scenario-config" className="scroll-mt-24">
                    <ScenarioPreferencesForm externalOpenTrigger={scenarioFormTrigger} />
                </div>

                <div id="past-reports" className="scroll-mt-24">
                    <PastReportsSection />
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
