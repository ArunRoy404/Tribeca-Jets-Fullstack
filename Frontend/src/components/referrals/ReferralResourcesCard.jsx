"use client";

import { useState } from "react";
import { FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import CommonInput from "@/components/common/CommonInput";
import SectionHeader from "@/components/common/SectionHeader";
import FileUpload from "@/components/common/FileUpload";
import FilterTabs from "@/components/table/common/FilterTabs";
import TableStatus from "@/components/table/common/TableStatus";
import FormField from "@/components/trips/FormField";
import { Button } from "@/components/ui/button";
import {
  useArchiveReferralResource,
  useReferralResources,
  useSaveReferralResource,
} from "@/hooks/referrals";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission, Scope } from "@/lib/permissions";
import { formatTimestamp } from "@/lib/archive";
import { uploadUrl } from "@/services/uploads.service";

const TABS = ["On the portal", "Archived"];

/**
 * The portal's Resources library (#11) — the brochure, the aircraft category
 * guide, the programme terms, marketing material, contact details. The file
 * is uploaded PUBLIC so every referral agent can open it; the row is what
 * lists it on the portal. Curating is for administrators and senior brokers.
 */
export default function ReferralResourcesCard() {
  const { scopeFor } = usePermissions();
  const curator = scopeFor(Permission.MANAGE_REFERRALS) === Scope.ALL;
  const [tab, setTab] = useState(TABS[0]);
  const archived = tab === TABS[1];

  const { data, isPending, error, refetch } = useReferralResources({ limit: 50, archived });
  const resources = data?.data ?? [];
  const { mutate: archive } = useArchiveReferralResource();

  return (
    <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
      <SectionHeader title="Portal Resources" />
      <div className="flex flex-col gap-4 p-4 w-full">
        {curator && <FilterTabs options={TABS} value={tab} onValueChange={setTab} />}
        {curator && !archived && <NewResourceForm />}

        {isPending || error || resources.length === 0 ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={!isPending && !error}
            emptyMessage={archived ? "Nothing archived" : "No resources on the portal yet"}
            emptyHint={archived ? undefined : "Publish the brochure, the category guide or the programme terms for your agents."}
            onRetry={refetch}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {resources.map((resource) => (
              <li key={resource.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="flex items-start gap-2 min-w-0">
                  <FileText className="size-4 text-purple mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <a
                      href={uploadUrl(resource.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-montserrat font-semibold text-[13px] text-foreground hover:underline truncate"
                    >
                      {resource.title}
                    </a>
                    {resource.description && (
                      <p className="font-montserrat text-[12px] text-muted-foreground">{resource.description}</p>
                    )}
                    <p className="font-montserrat text-[11px] text-muted-foreground">
                      {archived ? `Archived ${formatTimestamp(resource.deletedAt)}` : `Published ${formatTimestamp(resource.createdAt)}`}
                    </p>
                  </div>
                </div>
                {curator && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => archive({ id: resource.id, restore: archived })}
                  >
                    {archived ? <RotateCcw className="size-3.5" /> : <Trash2 className="size-3.5" />}
                    {archived ? "Restore" : "Take off portal"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </CommonCard>
  );
}

function NewResourceForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const { mutate: save, isPending } = useSaveReferralResource();

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim() || !fileUrl) return;
    save(
      { title: title.trim(), description: description.trim() || undefined, fileUrl },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setFileUrl("");
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-md border border-dashed border-border p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Title">
          <CommonInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tribeca Jets brochure" />
        </FormField>
        <FormField label="Description (Optional)">
          <CommonInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it is for" />
        </FormField>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <FileUpload
          kind="document"
          visibility="PUBLIC"
          label={title || undefined}
          buttonLabel={fileUrl ? "Replace file" : "Upload file"}
          onUploaded={(file) => setFileUrl(file?.url ?? "")}
        />
        {fileUrl && <span className="font-montserrat text-[12px] text-success">File ready</span>}
        <Button type="submit" size="sm" disabled={isPending || !title.trim() || !fileUrl} className="gap-1.5 ml-auto">
          <Plus className="size-3.5" />
          Publish to portal
        </Button>
      </div>
    </form>
  );
}
