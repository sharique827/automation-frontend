import { useContext, useEffect, useRef } from "react";
import { PlaygroundContext } from "../../context/playground-context";
import { Editor, Monaco } from "@monaco-editor/react";
import { DarkSkyBlueTheme } from "../editor-themes";
import { decodeBase64 } from "../../utils/base64";

export default function CommonLibView() {
    const playgroundContext = useContext(PlaygroundContext);

    const getEditorContent = () => {
        try {
            const value = playgroundContext.config?.helperLib || "";
            return decodeBase64(value);
        } catch (e) {
            console.error("Error decoding helper library content:", e);
            return "Error decoding helper library content.";
        }
    };

    const pendingRef = useRef<{ timer: number | null; flush: (() => void) | null }>({
        timer: null,
        flush: null,
    });

    const handleEditorChange = (value: string | undefined) => {
        if (value === undefined) return;
        if (pendingRef.current.timer !== null) {
            window.clearTimeout(pendingRef.current.timer);
        }
        pendingRef.current.flush = () => playgroundContext.updateHelperLib(value);
        pendingRef.current.timer = window.setTimeout(() => {
            pendingRef.current.flush?.();
            pendingRef.current.timer = null;
            pendingRef.current.flush = null;
        }, 150);
    };

    useEffect(() => {
        return () => {
            if (pendingRef.current.timer !== null) {
                window.clearTimeout(pendingRef.current.timer);
                pendingRef.current.flush?.();
                pendingRef.current.timer = null;
                pendingRef.current.flush = null;
            }
        };
    }, []);
    const handleEditorWillMount = (monaco: Monaco) => {
        monaco.editor.defineTheme("dark-skyblue", DarkSkyBlueTheme);
    };

    return (
        <>
            <div className="flex-1 p-2 overflow-hidden h-full">
                <Editor
                    key={`common-helper`}
                    theme="dark-skyblue"
                    beforeMount={handleEditorWillMount}
                    height="100%"
                    language={"javascript"}
                    value={getEditorContent()}
                    onChange={handleEditorChange}
                    options={{
                        padding: { top: 16, bottom: 16 },
                        fontSize: 16,
                        lineNumbers: "on",
                        scrollBeyondLastLine: true,
                        automaticLayout: true,
                        formatOnPaste: true,
                        formatOnType: true,
                    }}
                />
            </div>
        </>
    );
}
