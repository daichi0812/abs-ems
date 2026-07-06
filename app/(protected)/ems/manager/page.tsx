"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EquipmentForm } from "@/app/(protected)/ems/_components/EquipmentForm";
import { EquipmentListPanel } from "./_components/EquipmentListPanel";
import { useEquipments } from "../_hooks/use-equipments";
import { useTags } from "./hooks/use-tags";
import { useImageUpload } from "./hooks/use-image-upload";
import { useEquipmentRegistration } from "./hooks/use-equipment-registration";
import { useEquipmentActions } from "./hooks/use-equipment-actions";

type MobileTab = "register" | "list";

export default function ManagerPage() {
  const { equipments, isLoading, refetch: refetchEquipments } = useEquipments();
  const { tags } = useTags();
  const imageUpload = useImageUpload();
  const registration = useEquipmentRegistration({
    tags,
    inputFileRef: imageUpload.inputFileRef,
    resetImage: imageUpload.reset,
    refetchEquipments,
  });
  const actions = useEquipmentActions({ refetchEquipments });

  const [tab, setTab] = useState<MobileTab>("register");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    setSubmitting(true);
    const ok = await registration.submit();
    setSubmitting(false);
    if (ok) setTab("list");
  };

  const previewUrl = imageUpload.imageFile ? imageUpload.imageUrl : undefined;
  const canSubmit = registration.equipmentName.trim() !== "" && registration.selectedTag !== "";

  const form = (
    <EquipmentForm
      categories={tags}
      name={registration.equipmentName}
      onName={registration.setEquipmentName}
      detail={registration.equipmentDetail}
      onDetail={registration.setEquipmentDetail}
      selectedTagName={registration.selectedTag}
      onSelectTag={registration.setSelectedTag}
      previewUrl={previewUrl}
      inputFileRef={imageUpload.inputFileRef}
      onFileChange={imageUpload.onFileChange}
      submitLabel="登録する"
      onSubmit={handleRegister}
      canSubmit={canSubmit}
      isSubmitting={submitting}
    />
  );

  const list = (
    <EquipmentListPanel
      equipments={equipments}
      categories={tags}
      onEdit={actions.editEquipment}
      onDelete={actions.deleteEquipment}
    />
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-24 pt-3 md:px-5 md:pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="m-0 text-lg font-black text-ink">機材管理</h1>
        <Link
          href="/ems/categories"
          className="flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white px-3.5 text-[12.5px] font-bold text-ink-sub hover:border-brand"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          カテゴリ編集
        </Link>
      </div>

      {/* モバイル: タブ切替 */}
      <div className="md:hidden">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-line-soft p-1">
          {(
            [
              ["register", "機材を登録"],
              ["list", "一覧・編集"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "h-9 rounded-full text-[13px] font-bold transition-colors",
                tab === key ? "bg-white text-ink shadow-sm" : "text-ink-faint"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "register" ? form : isLoading ? <ListSkeleton /> : list}
      </div>

      {/* PC: 2ペイン */}
      <div className="hidden gap-5 md:grid md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div>{form}</div>
        <div>{isLoading ? <ListSkeleton /> : list}</div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/70" />
      ))}
    </div>
  );
}
