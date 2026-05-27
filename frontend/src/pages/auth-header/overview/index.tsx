import { FC } from "react";
// import OverviewSection from "@pages/auth-header/overview/Section";
import ProcessFlowSection from "@pages/auth-header/overview/ProcessFlowSection";
import CryptoAlgorithmCard from "@pages/auth-header/overview/CryptoAlgorithmCard";
import HeaderFormatSection from "@pages/auth-header/overview/HeaderFormatSection";
import AIPromptGenerator from "@pages/auth-header/overview/AIPromptGenerator";
import TestScenariosSection from "@pages/auth-header/overview/TestScenariosSection";
import {
    signingFlowSteps,
    verificationFlowSteps,
    algorithmCards,
} from "@pages/auth-header/overview/data";

const Overview: FC = () => (
    <div className="space-y-8">
        {/* <OverviewSection /> */}

        <div className="grid md:grid-cols-2 gap-6">
            <ProcessFlowSection title="Signing Process Flow" steps={signingFlowSteps} />
            <ProcessFlowSection title="Verification Process Flow" steps={verificationFlowSteps} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            {algorithmCards.map((algorithm, index) => (
                <CryptoAlgorithmCard key={index} algorithm={algorithm} />
            ))}
        </div>

        <HeaderFormatSection />

        <AIPromptGenerator />

        <TestScenariosSection />
    </div>
);

export default Overview;
