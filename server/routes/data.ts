import { Router } from 'express'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'

const router = Router()

let prisma: PrismaClient

function getPrisma() {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter })
  }
  return prisma
}

function toDateString(d: any): string {
  if (!d) return ''
  if (d instanceof Date) {
    return d.toISOString().split('T')[0]
  }
  return String(d).split('T')[0]
}

/**
 * GET /api/data
 * Load all user data from the database.
 * Returns the full AppData shape the frontend expects.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!

    const [items, purchases, periods, settings, customCategories, additionalNotes] =
      await Promise.all([
        getPrisma().expenseItem.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        getPrisma().purchase.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        getPrisma().budgetPeriod.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        getPrisma().appSettings.findUnique({ where: { userId } }),
        getPrisma().customCategory.findMany({ where: { userId } }),
        getPrisma().additionalNote.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      ])

    // Convert DB rows to frontend AppData shape
    const appData = {
      version: 1,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        normalizedName: i.normalizedName,
        category: i.category,
        createdAt: i.createdAt.toISOString(),
      })),
      purchases: purchases.map((p) => ({
        id: p.id,
        itemId: p.itemId,
        amount: Number(p.amount),
        date: toDateString(p.date),
        time: p.time || '',
        notes: p.notes || '',
        quantity: p.quantity !== null ? Number(p.quantity) : null,
        createdAt: p.createdAt.toISOString(),
      })),
      periods: periods.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        amountHistory: Array.isArray(p.amountHistory) ? (p.amountHistory as number[]) : [],
        extraFunds: p.extraFunds,
        carryOverApplied: Number(p.carryOverApplied),
        startDate: toDateString(p.startDate),
        endDate: toDateString(p.endDate),
        createdAt: p.createdAt.toISOString(),
      })),
      currentPeriodId:
        settings?.currentPeriodId ?? (periods.length > 0 ? periods[periods.length - 1].id : ''),
      settings: {
        theme: (settings?.theme as 'light' | 'dark' | 'system') ?? 'system',
        currencyCode: 'INR',
        currencySymbol: '₹',
        carryOverUnused: settings?.carryOverUnused ?? false,
        notifyBudgetWarnings: settings?.notifyBudgetWarnings ?? true,
        notifyDailyReminders: settings?.notifyDailyReminders ?? false,
      },
      customCategories: customCategories.map((c) => ({
        id: c.id,
        name: c.name,
        normalizedName: c.normalizedName,
        color: c.color,
      })),
      hiddenCategoryIds: Array.isArray(settings?.hiddenCategoryIds)
        ? (settings.hiddenCategoryIds as string[])
        : [],
      additionalNotes: additionalNotes.map((n) => ({
        id: n.id,
        personName: n.personName,
        amount: Number(n.amount),
        notes: n.notes || '',
        createdAt: n.createdAt.toISOString(),
      })),
    }

    res.json(appData)
  } catch (err) {
    console.error('Load data error:', err)
    res.status(500).json({ error: 'Could not load data.' })
  }
})

/**
 * PUT /api/data
 * Full-sync: saves the entire AppData snapshot to the database.
 * Uses a transaction to replace all user data atomically.
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!
    const body = req.body

    if (!body || body.version !== 1) {
      res.status(400).json({ error: 'Invalid data format.' })
      return
    }

    const db = getPrisma()

    await db.$transaction(async (tx) => {
      // 1. Delete all existing user data
      await Promise.all([
        tx.purchase.deleteMany({ where: { userId } }),
        tx.additionalNote.deleteMany({ where: { userId } }),
        tx.customCategory.deleteMany({ where: { userId } }),
      ])
      // Delete items and periods
      await tx.expenseItem.deleteMany({ where: { userId } })
      await tx.budgetPeriod.deleteMany({ where: { userId } })

      // 2. Upsert settings
      await tx.appSettings.upsert({
        where: { userId },
        update: {
          theme: body.settings?.theme ?? 'system',
          carryOverUnused: body.settings?.carryOverUnused ?? false,
          notifyBudgetWarnings: body.settings?.notifyBudgetWarnings ?? true,
          notifyDailyReminders: body.settings?.notifyDailyReminders ?? false,
          currentPeriodId: body.currentPeriodId ?? null,
          hiddenCategoryIds: body.hiddenCategoryIds ?? [],
        },
        create: {
          userId,
          theme: body.settings?.theme ?? 'system',
          carryOverUnused: body.settings?.carryOverUnused ?? false,
          notifyBudgetWarnings: body.settings?.notifyBudgetWarnings ?? true,
          notifyDailyReminders: body.settings?.notifyDailyReminders ?? false,
          currentPeriodId: body.currentPeriodId ?? null,
          hiddenCategoryIds: body.hiddenCategoryIds ?? [],
        },
      })

      // 3. Insert budget periods
      if (Array.isArray(body.periods) && body.periods.length > 0) {
        await tx.budgetPeriod.createMany({
          data: body.periods.map((p: any) => ({
            id: p.id,
            userId,
            amount: p.amount,
            amountHistory: p.amountHistory ?? [],
            extraFunds: Boolean(p.extraFunds),
            carryOverApplied: p.carryOverApplied ?? 0,
            startDate: new Date(p.startDate),
            endDate: new Date(p.endDate),
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          })),
        })
      }

      // 4. Insert expense items
      const validItems = Array.isArray(body.items) ? body.items : []
      if (validItems.length > 0) {
        await tx.expenseItem.createMany({
          data: validItems.map((i: any) => ({
            id: i.id,
            userId,
            name: i.name,
            normalizedName: i.normalizedName,
            category: i.category,
            createdAt: i.createdAt ? new Date(i.createdAt) : new Date(),
          })),
        })
      }

      // 5. Insert purchases (only for items that exist)
      const validItemIds = new Set(validItems.map((i: any) => i.id))
      const validPurchases = (Array.isArray(body.purchases) ? body.purchases : []).filter(
        (p: any) => validItemIds.has(p.itemId),
      )

      if (validPurchases.length > 0) {
        await tx.purchase.createMany({
          data: validPurchases.map((p: any) => ({
            id: p.id,
            userId,
            itemId: p.itemId,
            amount: p.amount,
            date: new Date(p.date),
            time: p.time ?? '',
            notes: p.notes ?? '',
            quantity: p.quantity ?? null,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          })),
        })
      }

      // 6. Insert custom categories
      if (Array.isArray(body.customCategories) && body.customCategories.length > 0) {
        await tx.customCategory.createMany({
          data: body.customCategories.map((c: any) => ({
            id: c.id,
            userId,
            name: c.name,
            normalizedName: c.normalizedName,
            color: c.color,
          })),
        })
      }

      // 7. Insert additional notes
      if (Array.isArray(body.additionalNotes) && body.additionalNotes.length > 0) {
        await tx.additionalNote.createMany({
          data: body.additionalNotes.map((n: any) => ({
            id: n.id,
            userId,
            personName: n.personName,
            amount: n.amount,
            notes: n.notes ?? '',
            createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
          })),
        })
      }
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('Save data error:', err)
    res.status(500).json({ error: 'Could not save data.' })
  }
})

export default router
