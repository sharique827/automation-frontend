import { useCallback, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuLogOut } from "react-icons/lu";

import { UserContext } from "@context/userContext";
import JsonDataForm from "@components/registry-components/subscriber-form";
import { AuthService } from "@services/authService";
import ScenarioPreferencesForm from "./scenario-preferences-form";

import { ROUTES } from "@constants/routes";

const UserProfile = () => {
    const { refreshUser, userDetails } = useContext(UserContext);
    const navigate = useNavigate();

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    useEffect(() => {
        if (!userDetails) {
            navigate(ROUTES.HOME);
        }
    }, [navigate, userDetails]);

    const handleLogout = useCallback(async () => {
        try {
            await AuthService.logout();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            try {
                await refreshUser();
            } catch (refreshError) {
                console.error("Failed to refresh user after logout:", refreshError);
            }
            navigate(ROUTES.HOME);
        }
    }, [navigate, refreshUser]);

    return (
        <div className="font-sans flex justify-center min-h-screen p-4">
            <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 max-w-screen-2xl w-full text-center">
                <div className="bg-gray-100 p-2 rounded-md shadow-sm mb-2 items-start">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-4">User Profile</h1>
                    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl">
                        <div className="flex justify-between items-start flex-col sm:flex-row sm:items-center">
                            <div className="text-gray-700 space-y-1 items-start justify-items-start">
                                <p>
                                    <strong>Login:</strong> {userDetails?.username || "N/A"}
                                </p>
                                <p>
                                    <strong>Participant ID:</strong>{" "}
                                    {userDetails?.participantId || "N/A"}
                                </p>
                            </div>

                            <div className="mt-4 sm:mt-0 sm:ml-6">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-800 flex items-center"
                                    onClick={handleLogout}
                                >
                                    <LuLogOut className="inline-block text-lg" />
                                    <span className="ml-2">
                                        <strong>Logout</strong>
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <JsonDataForm />
                <ScenarioPreferencesForm />
            </div>
        </div>
    );
};

export default UserProfile;
