import { useState, useRef, useEffect } from "react";
import IconButton from "../../../../components/ui/mini-components/icon-button";
import {
    FaArrowLeft,
    FaQuestionCircle,
    FaChevronDown,
    FaDownload,
    FaUpload,
    FaPencilAlt,
    FaEdit,
    FaGithub,
} from "react-icons/fa";
import { GrRedo } from "react-icons/gr";
import { IoMdSkipForward, IoMdTrash } from "react-icons/io";
import { TbAutomaticGearboxFilled, TbDatabaseExport } from "react-icons/tb";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";

interface PlaygroundHeaderProps {
    domain?: string;
    version?: string;
    flowId?: string;
    onExport: () => void;
    onExportForDeployment: () => void;
    onImport: () => void;
    onImportFromGitHub: () => void;
    onClear: () => void;
    onRun: () => void;
    onRunCurrent: () => void;
    onCreateFlowSession: () => void;
    onBack: () => void;
    onHelp: () => void;
    onEditMeta: () => void;
    onEditRaw: () => void;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
}

const FileMenu = ({
    onExport,
    onImport,
    onImportFromGitHub,
    onExportForDeployment,
    onEditRaw,
}: {
    onExport: () => void;
    onImport: () => void;
    onImportFromGitHub: () => void;
    onExportForDeployment: () => void;
    onEditRaw: () => void;
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const item =
        "flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-700 transition-colors text-left";

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-sky-700 bg-sky-100 hover:bg-sky-200 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1"
            >
                <FaDownload size={13} />
                File
                <FaChevronDown
                    size={10}
                    className={`transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1">
                    <button
                        className={item}
                        onClick={() => {
                            onExport();
                            setOpen(false);
                        }}
                    >
                        <FaDownload size={13} className="text-sky-500 shrink-0" />
                        Download(NOT for deployment)
                    </button>
                    <button
                        className={item}
                        onClick={() => {
                            onImport();
                            setOpen(false);
                        }}
                    >
                        <FaUpload size={13} className="text-sky-500 shrink-0" />
                        Upload JSON
                    </button>
                    <button
                        className={item}
                        onClick={() => {
                            onImportFromGitHub();
                            setOpen(false);
                        }}
                    >
                        <FaGithub size={13} className="text-gray-700 shrink-0" />
                        Import from GitHub
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                        className={item}
                        onClick={() => {
                            onExportForDeployment();
                            setOpen(false);
                        }}
                    >
                        <TbDatabaseExport size={14} className="text-emerald-500 shrink-0" />
                        Export Deployment YAML
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                        className={item}
                        onClick={() => {
                            onEditRaw();
                            setOpen(false);
                        }}
                    >
                        <FaEdit size={13} className="text-gray-500 shrink-0" />
                        Edit Raw Config
                    </button>
                </div>
            )}
        </div>
    );
};

export const PlaygroundHeader = ({
    domain,
    version,
    flowId,
    onExport,
    onExportForDeployment,
    onImport,
    onImportFromGitHub,
    onClear,
    onRun,
    onRunCurrent,
    onCreateFlowSession,
    onBack,
    onHelp,
    onEditMeta,
    onEditRaw,
    isFullscreen,
    onToggleFullscreen,
}: PlaygroundHeaderProps) => (
    <div className="h-14 flex items-center justify-between px-4 bg-gradient-to-r from-white to-sky-50 border-b border-sky-100 shadow-sm gap-4">
        {/* Left — nav + title + meta */}
        <div className="flex items-center gap-2 min-w-0">
            <IconButton
                icon={<FaArrowLeft size={14} />}
                label="Back to Starter"
                onClick={onBack}
                color="gray"
            />
            <IconButton
                icon={<FaQuestionCircle size={14} />}
                label="How to use the Playground"
                onClick={onHelp}
                color="sky"
            />

            <div className="w-px h-6 bg-gray-200 mx-1" />

            <span className="text-md font-bold bg-gradient-to-r from-sky-600 to-sky-500 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                PLAYGROUND
            </span>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Meta badges + edit */}
            <div className="hidden md:flex items-center gap-2 text-md">
                <span className="px-2.5 py-1 bg-white text-md rounded-lg border border-sky-100 text-gray-700 font-medium truncate">
                    {domain}
                </span>
                <span className="px-2.5 py-1 bg-white text-md rounded-lg border border-sky-100 text-gray-700 font-medium">
                    {version}
                </span>
                <span className="px-2.5 py-1 bg-white text-md rounded-lg border border-sky-100 text-gray-700 font-medium truncate max-w-md">
                    {flowId}
                </span>
                <button
                    onClick={onEditMeta}
                    title="Edit flow info"
                    className="p-2.5 rounded-lg bg-white shadow-sm text-black hover:bg-sky-100 hover:text-sky-600 transition-colors"
                >
                    <FaPencilAlt size={14} />
                </button>
            </div>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-1.5 shrink-0">
            <FileMenu
                onExport={onExport}
                onImport={onImport}
                onImportFromGitHub={onImportFromGitHub}
                onExportForDeployment={onExportForDeployment}
                onEditRaw={onEditRaw}
            />

            <IconButton
                icon={<IoMdTrash size={15} />}
                label="Clear all"
                onClick={onClear}
                color="red"
            />

            <div className="w-px h-6 bg-gray-200 mx-0.5" />

            <IconButton
                icon={<TbAutomaticGearboxFilled size={15} />}
                label="Create live session"
                onClick={onCreateFlowSession}
                color="sky"
            />

            <div className="w-px h-6 bg-gray-200 mx-0.5" />

            <IconButton
                icon={<GrRedo size={15} />}
                label="Run up to current step"
                onClick={onRunCurrent}
                color="green"
            />
            <IconButton
                icon={<IoMdSkipForward size={17} />}
                label="Run next step"
                onClick={onRun}
                color="orange"
            />

            {onToggleFullscreen && (
                <>
                    <div className="w-px h-6 bg-gray-200 mx-0.5" />
                    <IconButton
                        icon={
                            isFullscreen ? (
                                <MdFullscreenExit size={18} />
                            ) : (
                                <MdFullscreen size={18} />
                            )
                        }
                        label={isFullscreen ? "Exit full screen" : "Full screen"}
                        onClick={onToggleFullscreen}
                        color="gray"
                    />
                </>
            )}
        </div>
    </div>
);
