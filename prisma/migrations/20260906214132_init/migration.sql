-- CreateTable
CREATE TABLE "expense_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL DEFAULT '',
    "item_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(65,30),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_periods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount_history" JSONB NOT NULL DEFAULT '[]',
    "extra_funds" BOOLEAN NOT NULL DEFAULT false,
    "carry_over_applied" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "user_id" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "carry_over_unused" BOOLEAN NOT NULL DEFAULT false,
    "notify_budget_warnings" BOOLEAN NOT NULL DEFAULT true,
    "notify_daily_reminders" BOOLEAN NOT NULL DEFAULT false,
    "current_period_id" TEXT,
    "hidden_category_ids" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "custom_categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "custom_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL DEFAULT '',
    "person_name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "additional_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_items_user_id_idx" ON "expense_items"("user_id");

-- CreateIndex
CREATE INDEX "purchases_user_id_idx" ON "purchases"("user_id");

-- CreateIndex
CREATE INDEX "purchases_item_id_idx" ON "purchases"("item_id");

-- CreateIndex
CREATE INDEX "budget_periods_user_id_idx" ON "budget_periods"("user_id");

-- CreateIndex
CREATE INDEX "custom_categories_user_id_idx" ON "custom_categories"("user_id");

-- CreateIndex
CREATE INDEX "additional_notes_user_id_idx" ON "additional_notes"("user_id");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "expense_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
