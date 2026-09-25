// @vitest-environment node
import { GET, POST, DELETE } from "../route";
import { NextRequest } from "next/server";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AdmZip from "adm-zip";

// Mock dependencies
vi.mock("@/lib/role-guard", () => ({
  getSessionWithRole: vi.fn().mockResolvedValue({ role: "ADMIN" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ email: "admin@company.com", name: "Admin" }),
      deleteMany: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
      upsert: vi.fn().mockResolvedValue({}),
    },
    asset: { 
      findMany: vi.fn().mockResolvedValue([{ id: "asset-1", isTestDevice: true, testDeviceNote: "Note" }]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    assetPhoto: { 
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    assignment: { 
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    maintenanceRecord: { 
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    booking: { 
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    category: { 
      findMany: vi.fn().mockResolvedValue([{ id: "cat-1", key: "LAPTOP", label: "Laptop" }]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    testDeviceLog: { 
      findMany: vi.fn().mockResolvedValue([{ id: "log-1", assetId: "asset-1", guestName: "Guest" }]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    session: { deleteMany: vi.fn().mockResolvedValue({}) },
    account: { deleteMany: vi.fn().mockResolvedValue({}) },
    verificationToken: { deleteMany: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn().mockImplementation((cb) => Promise.all(cb)),
  },
}));

describe("Backup API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET should include categories, testDeviceLogs and testDevice asset fields in backup", async () => {
    const req = new NextRequest("http://localhost:3000/api/backup?images=false");
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const zip = new AdmZip(buffer);
    const dataEntry = zip.getEntry("data.json");
    expect(dataEntry).toBeDefined();
    
    const dataString = dataEntry!.getData().toString("utf-8");
    const parsed = JSON.parse(dataString);
    
    expect(parsed.tables).toBeDefined();
    expect(parsed.tables.categories).toBeDefined();
    expect(parsed.tables.categories.length).toBe(1);
    expect(parsed.tables.categories[0].key).toBe("LAPTOP");
    
    expect(parsed.tables.testDeviceLogs).toBeDefined();
    expect(parsed.tables.testDeviceLogs.length).toBe(1);
    expect(parsed.tables.testDeviceLogs[0].guestName).toBe("Guest");

    expect(parsed.tables.assets).toBeDefined();
    expect(parsed.tables.assets.length).toBe(1);
    expect(parsed.tables.assets[0].isTestDevice).toBe(true);
    expect(parsed.tables.assets[0].testDeviceNote).toBe("Note");
  });

  it("POST should parse categories and testDeviceLogs from backup and upsert them", async () => {
    // Create a mock zip
    const zip = new AdmZip();
    const mockData = {
      tables: {
        users: [],
        assets: [{ id: "asset-1", isTestDevice: true, testDeviceNote: "Note", createdAt: new Date().toISOString() }],
        assetPhotos: [],
        assignments: [],
        maintenanceRecords: [],
        bookings: [],
        categories: [{ id: "cat-1", key: "LAPTOP", label: "Laptop", order: 1, isDefault: true, createdAt: new Date().toISOString() }],
        testDeviceLogs: [{ id: "log-1", assetId: "asset-1", guestName: "Guest", borrowedAt: new Date().toISOString() }]
      }
    };
    zip.addFile("data.json", Buffer.from(JSON.stringify(mockData), "utf-8"));
    const zipBuffer = zip.toBuffer();

    const formData = new FormData();
    const file = new File([zipBuffer], "backup.zip", { type: "application/zip" });
    formData.append("file", file);
    formData.append("mode", "skip");

    const req = new NextRequest("http://localhost:3000/api/backup", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    
    // Check if the stats tracked the restored records
    expect(json.stats.categories).toBe(1);
    expect(json.stats.testDeviceLogs).toBe(1);
    expect(json.stats.assets).toBe(1);

    const { prisma } = await import("@/lib/prisma");
    expect(prisma.category.upsert).toHaveBeenCalled();
    expect(prisma.testDeviceLog.upsert).toHaveBeenCalled();
    expect(prisma.asset.upsert).toHaveBeenCalled();
  });

  it("DELETE should wipe all data and re-create admin user", async () => {
    const { prisma } = await import("@/lib/prisma");

    const response = await DELETE();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.admin).toBeDefined();
    expect(json.admin.email).toBe("admin@company.com");
    expect(json.admin.name).toBe("Admin");

    // Verify all tables were wiped in the correct order
    expect(prisma.testDeviceLog.deleteMany).toHaveBeenCalled();
    expect(prisma.booking.deleteMany).toHaveBeenCalled();
    expect(prisma.maintenanceRecord.deleteMany).toHaveBeenCalled();
    expect(prisma.assignment.deleteMany).toHaveBeenCalled();
    expect(prisma.assetPhoto.deleteMany).toHaveBeenCalled();
    expect(prisma.asset.deleteMany).toHaveBeenCalled();
    expect(prisma.session.deleteMany).toHaveBeenCalled();
    expect(prisma.account.deleteMany).toHaveBeenCalled();
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalled();
    expect(prisma.user.deleteMany).toHaveBeenCalled();

    // Verify admin was re-created
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "admin@company.com",
        name: "Admin",
        role: "ADMIN",
        hashedPassword: expect.any(String),
      }),
    });
  });

  it("DELETE should return 403 for non-admin users", async () => {
    const { getSessionWithRole } = await import("@/lib/role-guard");
    (getSessionWithRole as any).mockResolvedValueOnce({ role: "USER" });

    const response = await DELETE();
    expect(response.status).toBe(403);

    const json = await response.json();
    expect(json.error).toBe("Forbidden");
  });
});
