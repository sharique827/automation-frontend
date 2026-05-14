import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

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

// usecase_id excluded — selected fresh per session, not stored in preferences
type ScenarioPreferencesAPI = {
    subscriber_url: string;
    domain: string;
    version: string;
    np_type: string;
    env: string;
};

const toAPI = (p: ScenarioPreferences): ScenarioPreferencesAPI => ({
    subscriber_url: p.subscriberUrl,
    domain: p.domain,
    version: p.version,
    np_type: p.npType,
    env: p.env,
});

const fromAPI = (p: ScenarioPreferencesAPI, configName: string): ScenarioPreferences => ({
    configName,
    subscriberUrl: p.subscriber_url,
    domain: p.domain,
    version: p.version,
    usecaseId: "",
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

export default function ScenarioPreferencesForm() {
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

    const allDomainsRef = useRef<Domain[]>([]);

    useEffect(() => {
        Promise.all([fetchDomainData(), fetchSavedPreferences()]).finally(() =>
            setIsFetching(false)
        );
    }, []);

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
        reset({
            configName: key,
            subscriberUrl: config.subscriberUrl,
            domain: config.domain,
            version: config.version,
            usecaseId: "",
            npType: config.npType,
            env: config.env,
        });
        const match = allDomainsRef.current.find((d) => d.key === config.domain);
        setDynamicList((prev) => ({
            ...prev,
            version: (match?.version as DomainVersionWithUsecase[]) || [],
        }));
        setDynamicValue(config);
    };

    const handleCancelEdit = () => {
        setEditingKey(null);
        reset(EMPTY_PREFERENCES);
        setDynamicValue(EMPTY_PREFERENCES);
        setDynamicList((prev) => ({ ...prev, version: [] }));
    };

    const onSubmit = async (data: ScenarioPreferences) => {
        const { domain, version, npType, env } = dynamicValue;
        if (!domain || !version || !npType) {
            toast.error("Please select domain, version and app type");
            return;
        }
        const configKey = editingKey ?? data.configName.trim();
        const payload = toAPI({
            configName: configKey,
            subscriberUrl: data.subscriberUrl,
            domain,
            version,
            usecaseId: "",
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
                    usecaseId: "",
                    npType,
                    env,
                },
            }));
            toast.success(editingKey ? "Configuration updated" : "Configuration saved");
            setEditingKey(null);
            reset(EMPTY_PREFERENCES);
            setDynamicValue(EMPTY_PREFERENCES);
            setDynamicList((prev) => ({ ...prev, version: [] }));
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
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Add / Edit config form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">
                        {editingKey && (
                            <p className="text-xs font-medium text-sky-600 mb-1">
                                Editing: <span className="font-bold">{editingKey}</span>
                            </p>
                        )}
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
                                setDynamicValue((prev) => ({ ...prev, domain: val, version: "" }));
                                setValue("version", "");
                                const match = allDomainsRef.current.find((d) => d.key === val);
                                setDynamicList((prev) => ({
                                    ...prev,
                                    version: (match?.version as DomainVersionWithUsecase[]) || [],
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
                                setDynamicValue((prev) => ({ ...prev, version: val }));
                            }}
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
                        <FormSelect
                            register={register}
                            errors={errors}
                            setValue={setValue}
                            name="env"
                            label="Environment"
                            options={["PRE-PRODUCTION"]}
                            currentValue={dynamicValue.env}
                            setSelectedValue={(val) =>
                                setDynamicValue((prev) => ({ ...prev, env: val }))
                            }
                            required
                        />
                        <div className="pt-3 flex items-center gap-3">
                            <LoadingButton
                                type="submit"
                                buttonText={
                                    editingKey ? "Update Configuration" : "Save Configuration"
                                }
                                loadingText={editingKey ? "Updating..." : "Saving..."}
                                isLoading={isSaving}
                            />
                            {editingKey && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Saved configs list */}
                    {Object.keys(savedPrefs).length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                Saved Configurations
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(savedPrefs).map(([key, config]) => (
                                    <div
                                        key={key}
                                        className={`flex items-center justify-between px-4 py-3 bg-white rounded-lg border ${editingKey === key ? "border-sky-400" : "border-gray-200"}`}
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {key}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {config.domain} &nbsp;·&nbsp; {config.version}{" "}
                                                &nbsp;·&nbsp; {config.npType}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {config.subscriberUrl}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 ml-6">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(key)}
                                                className="text-sky-500 hover:text-sky-700 text-sm font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(key)}
                                                className="text-red-400 hover:text-red-600 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
