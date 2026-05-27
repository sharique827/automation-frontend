import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LuPlus, LuX, LuTriangleAlert, LuPencil, LuTrash2, LuRocket } from "react-icons/lu";
import { Modal } from "antd";

import { ROUTES } from "@constants/routes";

import { FormInput } from "@components/ui/forms/form-input";
import FormSelect from "@components/ui/forms/form-select";
import LoadingButton from "@components/ui/forms/loading-button";
import { apiClient } from "@services/apiClient";
import { API_ROUTES } from "@services/apiRoutes";
import { Domain, DomainVersion } from "@/pages/schema-validation/types";

type DomainVersionWithUsecase = DomainVersion & {
    usecase: string[];
};

type ScenarioPreferences = {
    configName: string;
    subscriberUrl: string;
    domain: string;
    version: string;
    usecaseId: string;
    npType: string;
    env: string;
};

type ScenarioPreferencesAPI = {
    subscriber_url: string;
    domain: string;
    version: string;
    usecase_id: string;
    np_type: string;
    env: string;
};

const toAPI = (p: ScenarioPreferences): ScenarioPreferencesAPI => ({
    subscriber_url: p.subscriberUrl,
    domain: p.domain,
    version: p.version,
    usecase_id: p.usecaseId,
    np_type: p.npType,
    env: p.env,
});

const fromAPI = (p: ScenarioPreferencesAPI, configName: string): ScenarioPreferences => ({
    configName,
    subscriberUrl: p.subscriber_url,
    domain: p.domain,
    version: p.version,
    usecaseId: p.usecase_id ?? "",
    npType: p.np_type,
    env: p.env,
});

const EMPTY_PREFERENCES: ScenarioPreferences = {
    configName: "",
    subscriberUrl: "",
    domain: "",
    version: "",
    usecaseId: "",
    npType: "BAP",
    env: "PRE-PRODUCTION",
};

type Props = {
    externalOpenTrigger?: number;
};

export default function ScenarioPreferencesForm({ externalOpenTrigger = 0 }: Props) {
    const navigate = useNavigate();

    const {
        register: registerField,
        handleSubmit,
        formState: { errors },
        setValue: setFieldValue,
        reset,
    } = useForm<ScenarioPreferences>({ defaultValues: EMPTY_PREFERENCES });

    const register = registerField as unknown as (
        name: string,
        rules?: Record<string, unknown>
    ) => Record<string, unknown>;
    const setValue = setFieldValue as unknown as (name: string, value: unknown) => void;

    const [dynamicList, setDynamicList] = useState<{
        domain: Domain[];
        version: DomainVersionWithUsecase[];
        usecase: string[];
    }>({ domain: [], version: [], usecase: [] });

    const [dynamicValue, setDynamicValue] = useState<ScenarioPreferences>(EMPTY_PREFERENCES);
    const [savedPrefs, setSavedPrefs] = useState<Record<string, ScenarioPreferences>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const allDomainsRef = useRef<Domain[]>([]);

    useEffect(() => {
        Promise.all([fetchDomainData(), fetchSavedPreferences()]).finally(() =>
            setIsFetching(false)
        );
    }, []);

    useEffect(() => {
        if (externalOpenTrigger > 0) setIsFormOpen(true);
    }, [externalOpenTrigger]);

    const fetchDomainData = async () => {
        try {
            const response = await apiClient.get<{ domain: Domain[] }>(
                API_ROUTES.CONFIG.SCENARIO_FORM_DATA
            );
            const domains: Domain[] = response.data.domain || [];
            allDomainsRef.current = domains;
            setDynamicList((prev) => ({ ...prev, domain: domains }));
        } catch (e) {
            console.error("Error fetching scenario form data", e);
        }
    };

    const fetchSavedPreferences = async () => {
        try {
            const response = await apiClient.get<Record<string, ScenarioPreferencesAPI>>(
                API_ROUTES.USER.SCENARIO_PREFERENCES
            );
            const raw = response.data;
            if (!raw) return;
            const mapped: Record<string, ScenarioPreferences> = {};
            Object.entries(raw).forEach(([key, val]) => {
                mapped[key] = fromAPI(val as ScenarioPreferencesAPI, key);
            });
            setSavedPrefs(mapped);
        } catch {
            // No saved preferences yet
        }
    };

    const handleEdit = (key: string) => {
        const config = savedPrefs[key];
        setEditingKey(key);
        setIsFormOpen(true);
        reset({
            configName: key,
            subscriberUrl: config.subscriberUrl,
            domain: config.domain,
            version: config.version,
            usecaseId: config.usecaseId,
            npType: config.npType,
            env: config.env,
        });
        const match = allDomainsRef.current.find((d) => d.key === config.domain);
        const versions = (match?.version as DomainVersionWithUsecase[]) || [];
        const versionMatch = versions.find((v) => v.key === config.version);
        setDynamicList((prev) => ({
            ...prev,
            version: versions,
            usecase: versionMatch?.usecase || [],
        }));
        setDynamicValue(config);
    };

    const handleCancelEdit = () => {
        setEditingKey(null);
        setIsFormOpen(false);
        reset(EMPTY_PREFERENCES);
        setDynamicValue(EMPTY_PREFERENCES);
        setDynamicList((prev) => ({ ...prev, version: [], usecase: [] }));
    };

    const onSubmit = async (data: ScenarioPreferences) => {
        const { domain, version, usecaseId, npType, env } = dynamicValue;
        if (!domain || !version || !usecaseId || !npType) {
            toast.error("Please select domain, version, use case and app type");
            return;
        }
        const configKey = editingKey ?? data.configName.trim();
        const payload = toAPI({
            configName: configKey,
            subscriberUrl: data.subscriberUrl,
            domain,
            version,
            usecaseId,
            npType,
            env,
        });

        setIsSaving(true);
        try {
            await apiClient.put(API_ROUTES.USER.SCENARIO_PREFERENCE_BY_KEY(configKey), payload);
            setSavedPrefs((prev) => ({
                ...prev,
                [configKey]: {
                    configName: configKey,
                    subscriberUrl: data.subscriberUrl,
                    domain,
                    version,
                    usecaseId,
                    npType,
                    env,
                },
            }));
            toast.success(editingKey ? "Configuration updated" : "Configuration saved");
            setEditingKey(null);
            setIsFormOpen(false);
            reset(EMPTY_PREFERENCES);
            setDynamicValue(EMPTY_PREFERENCES);
            setDynamicList((prev) => ({ ...prev, version: [], usecase: [] }));
        } catch (e) {
            console.error("Error saving preferences", e);
            toast.error("Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (configKey: string) => {
        try {
            await apiClient.delete(API_ROUTES.USER.SCENARIO_PREFERENCE_BY_KEY(configKey));
            setSavedPrefs((prev) => {
                const next = { ...prev };
                delete next[configKey];
                return next;
            });
            if (editingKey === configKey) handleCancelEdit();
            toast.success("Configuration deleted");
        } catch (e) {
            console.error("Error deleting preference", e);
            toast.error("Failed to delete configuration");
        }
    };

    const handleLaunch = (configKey: string) => {
        navigate(`${ROUTES.SCENARIO}?config=${encodeURIComponent(configKey)}`);
    };

    const confirmDelete = (configKey: string) => {
        Modal.confirm({
            title: "Delete configuration",
            icon: <LuTriangleAlert className="text-xl mr-2" style={{ color: "#ef4444" }} />,
            content: (
                <span>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-gray-900">{configKey}</span>? This action
                    cannot be undone.
                </span>
            ),
            okText: "Delete",
            cancelText: "Cancel",
            centered: true,
            okButtonProps: {
                style: {
                    backgroundColor: "#ef4444",
                    borderColor: "#ef4444",
                    color: "#fff",
                },
            },
            onOk: () => handleDelete(configKey),
        });
    };

    return (
        <div className="bg-gray-100 p-2 rounded-md shadow-sm mt-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1 mt-2">
                Scenario Testing Preferences
            </h2>
            <p className="text-sm text-gray-500 mb-4">
                Save configurations to quickly start scenario testing sessions.
            </p>

            {isFetching ? (
                <div className="flex items-center justify-center py-8">
                    <span className="text-gray-400 text-sm">Loading...</span>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Add / Edit form */}
                    <div id="add-scenario-config-form" className="scroll-mt-24">
                        {!isFormOpen ? (
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 hover:border-sky-300 rounded-xl transition-all"
                                >
                                    <LuPlus className="text-base" />
                                    Add a preference for scenario testing
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm font-semibold text-gray-700">
                                        {editingKey ? (
                                            <>
                                                Editing:{" "}
                                                <span className="text-sky-600">{editingKey}</span>
                                            </>
                                        ) : (
                                            "New Configuration"
                                        )}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        aria-label="Close form"
                                    >
                                        <LuX className="text-lg" />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">
                                    <FormInput
                                        register={register}
                                        errors={errors}
                                        label="Config Name"
                                        name="configName"
                                        required={editingKey ? undefined : "Required"}
                                        labelInfo=""
                                        disabled={!!editingKey}
                                        validations={
                                            editingKey
                                                ? {}
                                                : {
                                                      validate: (value: string) =>
                                                          !savedPrefs[value.trim()] ||
                                                          "A configuration with this name already exists, choose a different name",
                                                  }
                                        }
                                    />
                                    <FormInput
                                        register={register}
                                        errors={errors}
                                        label="Subscriber URL"
                                        name="subscriberUrl"
                                        required="Required"
                                        labelInfo=""
                                        validations={{
                                            pattern: {
                                                value: /^https?:\/\/.*/i,
                                                message: "URL must start with http:// or https://",
                                            },
                                        }}
                                    />
                                    <FormSelect
                                        register={register}
                                        errors={errors}
                                        setValue={setValue}
                                        name="domain"
                                        label="Domain"
                                        options={dynamicList.domain.map((d) => d.key)}
                                        currentValue={dynamicValue.domain}
                                        setSelectedValue={(val) => {
                                            setDynamicValue((prev) => ({
                                                ...prev,
                                                domain: val,
                                                version: "",
                                                usecaseId: "",
                                            }));
                                            setValue("version", "");
                                            setValue("usecaseId", "");
                                            const match = allDomainsRef.current.find(
                                                (d) => d.key === val
                                            );
                                            setDynamicList((prev) => ({
                                                ...prev,
                                                version:
                                                    (match?.version as DomainVersionWithUsecase[]) ||
                                                    [],
                                                usecase: [],
                                            }));
                                        }}
                                        nonSelectedValue
                                        required
                                    />
                                    <FormSelect
                                        register={register}
                                        errors={errors}
                                        setValue={setValue}
                                        name="version"
                                        label="Version"
                                        options={dynamicList.version.map((v) => v.key)}
                                        currentValue={dynamicValue.version}
                                        setSelectedValue={(val) => {
                                            setDynamicValue((prev) => ({
                                                ...prev,
                                                version: val,
                                                usecaseId: "",
                                            }));
                                            setValue("usecaseId", "");
                                            const versionMatch = dynamicList.version.find(
                                                (v) => v.key === val
                                            );
                                            setDynamicList((prev) => ({
                                                ...prev,
                                                usecase: versionMatch?.usecase || [],
                                            }));
                                        }}
                                        nonSelectedValue
                                        required
                                    />
                                    <FormSelect
                                        register={register}
                                        errors={errors}
                                        setValue={setValue}
                                        name="usecaseId"
                                        label="Use Case"
                                        options={dynamicList.usecase}
                                        currentValue={dynamicValue.usecaseId}
                                        setSelectedValue={(val) =>
                                            setDynamicValue((prev) => ({ ...prev, usecaseId: val }))
                                        }
                                        nonSelectedValue
                                        required
                                    />
                                    <FormSelect
                                        register={register}
                                        errors={errors}
                                        setValue={setValue}
                                        name="npType"
                                        label="App Type"
                                        options={["BAP", "BPP"]}
                                        currentValue={dynamicValue.npType}
                                        setSelectedValue={(val) =>
                                            setDynamicValue((prev) => ({ ...prev, npType: val }))
                                        }
                                        required
                                    />
                                    <div className="pt-3 flex items-center gap-3">
                                        <LoadingButton
                                            type="submit"
                                            buttonText={
                                                editingKey
                                                    ? "Update Configuration"
                                                    : "Save Configuration"
                                            }
                                            loadingText={editingKey ? "Updating..." : "Saving..."}
                                            isLoading={isSaving}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="text-sm text-gray-500 hover:text-gray-700"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Saved configs list */}
                    <div id="saved-configs" className="scroll-mt-24">
                        {Object.keys(savedPrefs).length > 0 && (
                            <div>
                                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                                    Saved Configurations
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(savedPrefs).map(([key, config]) => (
                                        <div
                                            key={key}
                                            className={`group flex flex-col bg-white rounded-lg border transition-all hover:shadow-md hover:border-gray-300 ${
                                                editingKey === key
                                                    ? "border-sky-300 ring-1 ring-sky-100"
                                                    : "border-gray-200"
                                            }`}
                                        >
                                            <div className="px-5 py-4 flex-1">
                                                {/* Name row + action icons */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <p
                                                        className="text-base font-semibold text-gray-900 leading-snug break-all"
                                                        title={key}
                                                    >
                                                        {key}
                                                    </p>
                                                    <div className="flex items-center gap-1 shrink-0 -mt-0.5 -mr-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(key)}
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded text-sky-600 hover:text-sky-700 hover:bg-sky-50 transition-colors"
                                                            aria-label="Edit configuration"
                                                        >
                                                            <LuPencil className="text-sm" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => confirmDelete(key)}
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                            aria-label="Delete configuration"
                                                        >
                                                            <LuTrash2 className="text-sm" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Subscriber URL */}
                                                <p
                                                    className="text-xs text-gray-400 font-mono mt-1.5 truncate"
                                                    title={config.subscriberUrl}
                                                >
                                                    {config.subscriberUrl}
                                                </p>

                                                {/* Badge pills */}
                                                <div className="flex flex-wrap gap-1.5 mt-3.5">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700">
                                                        {config.domain}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
                                                        {config.version}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700">
                                                        {config.npType}
                                                    </span>
                                                    {config.usecaseId && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-fuchsia-50 text-fuchsia-700">
                                                            {config.usecaseId}
                                                        </span>
                                                    )}
                                                    {config.env && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700">
                                                            {config.env}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Launch button footer */}
                                            <div className="px-5 pb-4 pt-1 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleLaunch(key)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors"
                                                    aria-label="Launch scenario testing"
                                                >
                                                    <LuRocket className="text-xs" />
                                                    Launch
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
