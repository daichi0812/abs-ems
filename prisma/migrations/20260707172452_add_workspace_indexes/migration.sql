-- CreateIndex
CREATE INDEX "List_workspace_id_idx" ON "List"("workspace_id");

-- CreateIndex
CREATE INDEX "Reserve_workspace_id_start_idx" ON "Reserve"("workspace_id", "start");

-- CreateIndex
CREATE INDEX "Tag_workspace_id_idx" ON "Tag"("workspace_id");
