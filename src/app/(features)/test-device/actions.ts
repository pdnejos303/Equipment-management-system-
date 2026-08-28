"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { eventEmitter } from "@/lib/eventEmitter";

const AssetIdSchema = z.string().min(1, "Asset ID is required");
const NoteSchema = z.string().max(1000, "Note is too long").nullable().optional();
const AssetIdsArraySchema = z.array(z.string().min(1)).min(1, "At least one device is required");
const YearMonthSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});
const GetAvailableAssetsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().max(100).default(""),
  category: z.string().max(50).default("ALL"),
});

export async function getTestDevices() {
  return await prisma.asset.findMany({
    where: {
      isTestDevice: true,
    },
    include: {
      photos: true,
      testDeviceLogs: {
        where: { returnedAt: null },
        include: { user: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCategories() {
  return await prisma.category.findMany({
    orderBy: { order: "asc" },
  });
}

export async function getAvailableAssets(
  rawPage: number = 1,
  rawPageSize: number = 20,
  rawSearch: string = "",
  rawCategory: string = "ALL"
) {
  const { page, pageSize, search, category } = GetAvailableAssetsSchema.parse({
    page: rawPage,
    pageSize: rawPageSize,
    search: rawSearch,
    category: rawCategory,
  });
  const where: any = {
    isTestDevice: false,
  };

  if (category !== "ALL") {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { code: { contains: search } },
      { name: { contains: search } },
      { brand: { contains: search } },
      { model: { contains: search } },
      { serialNumber: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { photos: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);

  return { items, total, totalPages: Math.ceil(total / pageSize), page };
}

export async function addTestDevice(rawAssetId: string) {
  const assetId = AssetIdSchema.parse(rawAssetId);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("testDeviceFeat.errUnauthorized");

  await prisma.asset.update({
    where: { id: assetId },
    data: { isTestDevice: true },
  });
  eventEmitter.emit("update");
}

export async function removeTestDevice(rawAssetId: string) {
  const assetId = AssetIdSchema.parse(rawAssetId);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("testDeviceFeat.errUnauthorized");

  // Check if currently borrowed, if so, we shouldn't allow removing maybe? Or just force it.
  const existingLog = await prisma.testDeviceLog.findFirst({
    where: { assetId, returnedAt: null },
  });
  if (existingLog) throw new Error("testDeviceFeat.errCannotRemoveBorrowed");

  await prisma.asset.update({
    where: { id: assetId },
    data: { isTestDevice: false },
  });
  eventEmitter.emit("update");
}

export async function updateTestDeviceNote(rawAssetId: string, rawNote: string) {
  const assetId = AssetIdSchema.parse(rawAssetId);
  const note = NoteSchema.parse(rawNote) || "";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("testDeviceFeat.errUnauthorized");

  await prisma.asset.update({
    where: { id: assetId },
    data: { testDeviceNote: note },
  });
  eventEmitter.emit("update");
}

export async function borrowDevice(rawAssetId: string, guestName?: string) {
  const assetId = AssetIdSchema.parse(rawAssetId);
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id && !guestName) {
    throw new Error("testDeviceFeat.errUnauthorized");
  }

  // Check if it's already borrowed
  const existingLog = await prisma.testDeviceLog.findFirst({
    where: { assetId, returnedAt: null },
  });

  if (existingLog) throw new Error("testDeviceFeat.errAlreadyBorrowed");

  await prisma.$transaction([
    prisma.testDeviceLog.create({
      data: {
        assetId,
        userId: session?.user?.id || null,
        guestName: guestName || null,
      },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: { status: "ACTIVE" },
    })
  ]);
  eventEmitter.emit("update");
  eventEmitter.emit("update");
}

export async function returnDevice(rawAssetId: string) {
  const assetId = AssetIdSchema.parse(rawAssetId);
  const session = await getServerSession(authOptions);
  
  const log = await prisma.testDeviceLog.findFirst({
    where: { assetId, returnedAt: null },
  });

  if (!log) throw new Error("testDeviceFeat.errNotBorrowed");
  
  // If borrowed by a logged-in user, only that user or an admin can return it
  if (log.userId) {
    if (!session?.user?.id) throw new Error("testDeviceFeat.errUnauthorized");
    const isAdmin = (session.user as any).role === "ADMIN";
    if (!isAdmin && log.userId !== session.user.id) {
      throw new Error("testDeviceFeat.errReturnOnlyYours");
    }
  }

  await prisma.$transaction([
    prisma.testDeviceLog.update({
      where: { id: log.id },
      data: { returnedAt: new Date() },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: { status: "AVAILABLE" },
    })
  ]);
  eventEmitter.emit("update");
  eventEmitter.emit("update");
}

export async function getMonthlyLogs(rawYear: number, rawMonth: number) {
  const { year, month } = YearMonthSchema.parse({ year: rawYear, month: rawMonth });
  // month is 1-12
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return await prisma.testDeviceLog.findMany({
    where: {
      OR: [
        { borrowedAt: { gte: startDate, lte: endDate } },
        { returnedAt: { gte: startDate, lte: endDate } },
        { borrowedAt: { lt: startDate }, returnedAt: null }
      ]
    },
    include: {
      user: true,
      asset: true,
    },
    orderBy: { borrowedAt: "desc" },
  });
}

export async function borrowMultipleDevices(rawAssetIds: string[]) {
  const assetIds = AssetIdsArraySchema.parse(rawAssetIds);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("testDeviceFeat.errUnauthorized");

  // Check if any are already borrowed
  const existingLogs = await prisma.testDeviceLog.findMany({
    where: { assetId: { in: assetIds }, returnedAt: null },
  });

  if (existingLogs.length > 0) throw new Error("testDeviceFeat.errSomeAlreadyBorrowed");

  await prisma.$transaction([
    prisma.testDeviceLog.createMany({
      data: assetIds.map(id => ({
        assetId: id,
        userId: session.user.id,
      })),
    }),
    prisma.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { status: "ACTIVE" },
    })
  ]);
  eventEmitter.emit("update");
  eventEmitter.emit("update");
}

export async function returnMultipleDevices(rawAssetIds: string[]) {
  const assetIds = AssetIdsArraySchema.parse(rawAssetIds);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("testDeviceFeat.errUnauthorized");

  const logs = await prisma.testDeviceLog.findMany({
    where: { assetId: { in: assetIds }, returnedAt: null },
  });

  if (logs.length === 0) return;

  const isAdmin = (session.user as any).role === "ADMIN";
  const userLogs = isAdmin ? logs : logs.filter(l => l.userId === session.user.id || !l.userId);
  if (userLogs.length === 0) throw new Error("testDeviceFeat.errReturnOnlyYours");

  const logIds = userLogs.map(l => l.id);
  const validAssetIds = userLogs.map(l => l.assetId);

  await prisma.$transaction([
    prisma.testDeviceLog.updateMany({
      where: { id: { in: logIds } },
      data: { returnedAt: new Date() },
    }),
    prisma.asset.updateMany({
      where: { id: { in: validAssetIds } },
      data: { status: "AVAILABLE" },
    })
  ]);
  eventEmitter.emit("update");
  eventEmitter.emit("update");
}
