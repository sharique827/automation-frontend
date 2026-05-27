import { FC, ReactNode } from "react";
import { FiKey } from "react-icons/fi";

interface HeaderProps {
    tabs?: ReactNode;
}

const Header: FC<HeaderProps> = ({ tabs }) => (
    <header className="border-b border-sky-100 bg-gradient-to-br from-sky-50 via-white to-slate-50">
        <div className="px-6 md:px-10 py-10 md:py-12 mt-[18px]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-10">
                <div className="max-w-3xl flex-1 min-w-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold uppercase tracking-widest mb-5 border border-sky-200">
                        <FiKey size={11} aria-hidden />
                        Auth tools
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
                        Authorization Header{" "}
                        <span className="text-sky-500">signing &amp; verification</span>
                    </h1>
                    <p className="text-base text-slate-600 leading-relaxed max-w-2xl p-0 mb-0">
                        ONDC uses a cryptographic signature scheme to authenticate API requests
                        between network participants. The authorization header contains a digital
                        signature created using BLAKE-512 hashing and Ed25519 elliptic curve
                        signatures.
                    </p>
                </div>
                {tabs ? <div className="shrink-0 w-full lg:w-auto">{tabs}</div> : null}
            </div>
        </div>
    </header>
);

export default Header;
