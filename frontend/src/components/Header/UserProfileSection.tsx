import { useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogIn } from "react-icons/fi";
import { LuUser, LuLogOut } from "react-icons/lu";
import { Dropdown, type MenuProps } from "antd";

import { GuideStepsEnums } from "@context/guideContext";
import GuideOverlay from "@components/ui/GuideOverlay";
import { UserContext } from "@context/userContext";
import { AuthService } from "@services/authService";
import { ROUTES } from "@constants/routes";
import { UserDetails } from "./types";
import { UserIcon } from "./UserIcon";

interface UserProfileSectionProps {
    userDetails: UserDetails | undefined;
    onLoginClick: () => void;
}

export const UserProfileSection = ({ userDetails, onLoginClick }: UserProfileSectionProps) => {
    const navigate = useNavigate();
    const { refreshUser } = useContext(UserContext);

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

    const menuItems: MenuProps["items"] = [
        {
            key: "profile",
            label: "Profile",
            icon: <LuUser className="text-base" />,
            onClick: onLoginClick,
        },
        { type: "divider" },
        {
            key: "logout",
            label: "Logout",
            icon: <LuLogOut className="text-base" />,
            danger: true,
            onClick: handleLogout,
        },
    ];

    return (
        <div className="relative flex items-center">
            {userDetails ? (
                <span className="mr-3 text-sm font-semibold text-gray-700 hidden md:inline">
                    {userDetails.username}
                </span>
            ) : null}

            <GuideOverlay
                currentStep={GuideStepsEnums.Reg1}
                right={0}
                top={55}
                instruction="Step 1: Go to your Profile"
                handleGoClick={onLoginClick}
            >
                {userDetails ? (
                    <Dropdown
                        menu={{ items: menuItems }}
                        trigger={["click"]}
                        placement="bottomRight"
                    >
                        <button
                            type="button"
                            className="flex items-center focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1 rounded-full transition-all duration-200"
                            title="Account menu"
                        >
                            <UserIcon user={userDetails} />
                        </button>
                    </Dropdown>
                ) : (
                    <button
                        type="button"
                        onClick={onLoginClick}
                        className="flex items-center focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1 rounded-full transition-all duration-200"
                        title="Login"
                    >
                        <div className="h-9 flex items-center gap-1.5 border border-sky-300 text-sky-600 bg-sky-50 rounded-full px-4 text-sm font-medium hover:bg-sky-100 hover:border-sky-500 transition-all duration-200">
                            <FiLogIn className="text-base" />
                            <span>Login</span>
                        </div>
                    </button>
                )}
            </GuideOverlay>
        </div>
    );
};
