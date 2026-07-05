-- CreateEnum
CREATE TYPE "CalendarView" AS ENUM ('MONTH', 'GANTT');

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notify_return_reminder" BOOLEAN NOT NULL DEFAULT true,
    "notify_reservation_events" BOOLEAN NOT NULL DEFAULT true,
    "notify_new_equipment" BOOLEAN NOT NULL DEFAULT false,
    "line_notify_enabled" BOOLEAN NOT NULL DEFAULT false,
    "line_user_id" TEXT,
    "calendar_default_view" "CalendarView" NOT NULL DEFAULT 'MONTH',

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_line_user_id_key" ON "user_settings"("line_user_id");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
