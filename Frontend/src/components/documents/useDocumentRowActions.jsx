"use client";

import { Edit2, ExternalLink, FolderOpen, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/auth";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useRemoveDocument, useRestoreDocument } from "@/hooks/documents";
import { Permission, Scope } from "@/lib/permissions";

/**
 * One definition of a document row's menu, for the vault table, its cards
 * and every folder panel alike. Archiving and restoring are offered only
 * where the API allows them: whoever filed the document, or a role that
 * reaches every document.
 */
export function useDocumentRowActions({ onEdit, showOwner = true } = {}) {
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const { canWrite, scopeFor } = usePermissions();
  const { mutate: remove } = useRemoveDocument();
  const { mutate: restore } = useRestoreDocument();

  const mayManage = canWrite(Permission.MANAGE_DOCUMENTS);
  const mayArchive = (row) =>
    mayManage && (scopeFor(Permission.MANAGE_DOCUMENTS) === Scope.ALL || row?.createdById === me?.id);

  const getRowActions = (row) => {
    const open = {
      label: "Open File",
      icon: <ExternalLink />,
      onSelect: () => row?.href && window.open(row.href, "_blank", "noopener"),
    };
    const actions = [open];
    if (showOwner && row?.ownerHref) {
      actions.push({ label: `Open ${row?.ownerTypeLabel}`, icon: <FolderOpen />, onSelect: () => router.push(row.ownerHref) });
    }
    if (row?.isArchived) {
      if (mayArchive(row)) actions.push({ label: "Restore", icon: <RotateCcw />, onSelect: () => restore(row?.id) });
      return actions;
    }
    if (mayManage) actions.push({ label: "Edit", icon: <Edit2 />, onSelect: () => onEdit?.(row) });
    if (mayArchive(row)) {
      actions.push("separator");
      actions.push({ label: "Archive", icon: <Trash2 />, variant: "destructive", onSelect: () => remove(row?.id) });
    }
    return actions;
  };

  return { getRowActions, mayManage, mayArchive };
}
