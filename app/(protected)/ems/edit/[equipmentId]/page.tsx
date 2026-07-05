"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { EquipmentForm } from "@/app/(protected)/ems/_components/EquipmentForm";
import { useEquipmentDetails } from "./hooks/use-equipment-details";
import { useTagsList } from "../../_hooks/use-tags-list";
import { useEquipmentUpdate } from "./hooks/use-equipment-update";

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const equipmentId = params.equipmentId;

  const {
    equipmentName,
    setEquipmentName,
    equipmentDetail,
    setEquipmentDetail,
    equipmentImg,
    equipmentTag,
  } = useEquipmentDetails({ equipmentId });

  const { tags } = useTagsList();
  const [selectedTag, setSelectedTag] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = useEquipmentUpdate({
    equipmentId,
    equipmentName,
    equipmentDetail,
    currentImageUrl: equipmentImg,
    selectedTagName: selectedTag,
    tags,
    onSuccess: () => router.push("/ems/manager"),
  });

  // tags ロード後に機材の tag_id から tag 名を選択状態へ同期
  useEffect(() => {
    if (tags.length > 0 && equipmentTag) {
      const tag = tags.find((t) => t.id === equipmentTag);
      if (tag) setSelectedTag(tag.name);
    }
  }, [tags, equipmentTag]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const ok = await update.submit();
    setSubmitting(false);
    if (ok) router.push("/ems/manager");
  };

  const previewUrl = update.imageFile ? update.imageUrl : undefined;
  const canSubmit = equipmentName.trim() !== "" && selectedTag !== "";

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-24 pt-3 md:px-5 md:pt-5">
      <div className="mb-3 flex items-center gap-2">
        <Link
          href="/ems/manager"
          aria-label="機材管理へ戻る"
          className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-line bg-white text-ink-sub hover:border-brand"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="m-0 text-lg font-black text-ink">機材情報の編集</h1>
      </div>

      <EquipmentForm
        categories={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
        name={equipmentName}
        onName={setEquipmentName}
        detail={equipmentDetail}
        onDetail={setEquipmentDetail}
        selectedTagName={selectedTag}
        onSelectTag={setSelectedTag}
        previewUrl={previewUrl}
        existingImageUrl={equipmentImg}
        inputFileRef={update.inputFileRef}
        onFileChange={update.onFileChange}
        submitLabel="更新する"
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        isSubmitting={submitting}
      />
    </div>
  );
}
