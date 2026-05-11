import ReactGA from "react-ga4";

export interface GAEvent {
    category: string;
    action: string;
    label?: string;
    value?: number;
}

export const initGA = () => {
    ReactGA.initialize("G-JEZFPTBKF0");
};

export const trackPageView = (path: string) => {
    ReactGA.send({ hitType: "pageview", page: path });
};

export const trackEvent = ({ category, action, label, value }: GAEvent): void => {
    if (!category || !action) return;

    ReactGA.event({
        category,
        action,
        label,
        value,
    });
};
