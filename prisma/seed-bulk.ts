// ============================================================
// File: seed-bulk.ts
// Path: equip-track/prisma/seed-bulk.ts
// Desc: Bulk seed script — generate large volume of realistic
//       Thai-context data for dev/demo/load testing.
//
// Usage:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-bulk.ts
//   OR add to package.json:
//   "db:seed-bulk": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-bulk.ts"
//
// Options (env vars):
//   SEED_ASSETS=200       number of extra assets (default 200)
//   SEED_USERS=30         number of extra users  (default 30)
//   SEED_MAINT=400        maintenance records    (default 400)
//   SEED_BOOKINGS=300     booking records        (default 300)
//   SEED_ASSIGNMENTS=250  assignment records     (default 250)
//   SEED_RESET=true       delete all data first  (default false)
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Config ───────────────────────────────────────────────────
// รับค่าจาก CLI args หรือ env vars
// CLI args: --reset --assets=500 --users=50 --maint=1000 --bookings=300 --assignments=250
function getArg(name: string, fallbackEnv: string, defaultVal: string): string {
  const cliArg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (cliArg) return cliArg.split("=")[1];
  return process.env[fallbackEnv] ?? defaultVal;
}

const CFG = {
  assets:      parseInt(getArg("assets",      "SEED_ASSETS",      "200")),
  users:       parseInt(getArg("users",       "SEED_USERS",       "30")),
  maint:       parseInt(getArg("maint",       "SEED_MAINT",       "400")),
  bookings:    parseInt(getArg("bookings",    "SEED_BOOKINGS",    "300")),
  assignments: parseInt(getArg("assignments", "SEED_ASSIGNMENTS", "250")),
  reset:       process.argv.includes("--reset") || process.env.SEED_RESET === "true",
};

// ── Helpers ──────────────────────────────────────────────────
function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function randomPastDate(maxDaysAgo = 1825) {
  return daysAgo(randInt(1, maxDaysAgo));
}
function randomFutureDate(maxDays = 365) {
  return daysFromNow(randInt(1, maxDays));
}
/** pad number to fixed width, e.g. 7 → "007" */
function pad(n: number, len = 3) {
  return String(n).padStart(len, "0");
}

// ── Reference data ───────────────────────────────────────────

const THAI_FIRST = [
  "สมชาย","สมหญิง","วิชัย","สุชาติ","นภาพร","กิตติพงษ์","รัตนา","ชาญชัย",
  "ปราณี","ธนาคาร","วรรณา","ศิริพร","ประเสริฐ","มณีรัตน์","อนุชา","สุภาพ",
  "เกียรติศักดิ์","ลัดดา","ธีรพงษ์","จิตรา","บุญมี","อรทัย","สันติ","วิภา",
  "ณัฐพล","ภัทรา","ชยพล","สุนันทา","ครรชิต","พัชรี","อภิชาต","นงนุช",
  "วัชรพล","กมลา","เศรษฐ์","ดวงใจ","พิทยา","รุ่งนภา","ทวีศักดิ์","สาวิตรี",
];
const THAI_LAST = [
  "ใจดี","มีสุข","รักชาติ","สง่างาม","ดีมาก","สุขสม","เจริญสุข","ศรีสวัสดิ์",
  "บุญรอด","แสงทอง","ทองดี","ศรีทอง","พงษ์ศรี","เพชรแก้ว","ชัยมงคล",
  "วงษ์สวัสดิ์","บุญธรรม","รุ่งเรือง","สมบูรณ์","จันทร์ทอง",
];
const DEPARTMENTS = [
  "แผนกบัญชี","แผนกขาย","แผนก IT","แผนก HR","แผนกการตลาด",
  "แผนกจัดซื้อ","แผนกปฏิบัติการ","ฝ่ายบริหาร","แผนกคลังสินค้า",
  "แผนกวิศวกรรม","แผนกประชาสัมพันธ์","แผนกกฎหมาย",
];
const LOCATIONS = [
  "สำนักงานใหญ่ ชั้น 1","สำนักงานใหญ่ ชั้น 2","สำนักงานใหญ่ ชั้น 3",
  "ห้องประชุม A","ห้องประชุม B","ห้องเซิร์ฟเวอร์","คลังสินค้า",
  "สาขาเชียงใหม่","สาขาขอนแก่น","สาขาภูเก็ต","โกดัง","ห้องฝึกอบรม",
];
const VENDORS = [
  "บริษัท ไอทีโซลูชั่น จำกัด","Apple iCare Center","Dell Service TH",
  "Canon Thailand","Epson Service Center","ศูนย์ซ่อม Toyota",
  "B-Quik ลาดพร้าว","ช่างโปรกรุ๊ป","Lenovo Thailand",
  "บริษัท ซ่อมทั่วไป จำกัด","Fujitsu Service","HP Thailand",
];
const MAINTENANCE_TYPES = ["REPAIR","PREVENTIVE","INSPECTION"] as const;
const BOOKING_STATUSES  = ["PENDING","APPROVED","ACTIVE","RETURNED","CANCELLED"] as const;
const ASSET_STATUSES    = ["ACTIVE","AVAILABLE","MAINTENANCE","RETIRED"] as const;

const CATEGORIES = [
  "LAPTOP","MONITOR","VEHICLE","FURNITURE","CAMERA","PROJECTOR","PRINTER","PHONE","OTHER",
] as const;
type Category = typeof CATEGORIES[number];

interface AssetTemplate {
  category: Category;
  names: string[];
  brands: string[];
  models: string[];
  priceRange: [number, number];
  life: number;
}

const ASSET_TEMPLATES: AssetTemplate[] = [
  {
    category: "LAPTOP",
    names: ["MacBook Pro","ThinkPad X1","Dell XPS","HP EliteBook","ASUS ProArt","Surface Pro"],
    brands: ["Apple","Lenovo","Dell","HP","ASUS","Microsoft"],
    models: ['14" M3','Gen 11','13 Plus','840 G9','16 OLED','9 Business'],
    priceRange: [25000, 120000], life: 4,
  },
  {
    category: "MONITOR",
    names: ['Dell UltraSharp 27"','LG 4K IPS','BenQ PD','ASUS ProArt 32"','Samsung Odyssey'],
    brands: ["Dell","LG","BenQ","ASUS","Samsung"],
    models: ["U2723QE","27UK850","PD3220U","PA329CV","G27QN"],
    priceRange: [8000, 45000], life: 6,
  },
  {
    category: "VEHICLE",
    names: ["Toyota Vios","Honda City","Isuzu D-Max","Toyota Fortuner","Ford Ranger"],
    brands: ["Toyota","Honda","Isuzu","Ford","Mitsubishi"],
    models: ["Vios 1.5 G","City 1.0 Turbo","Hi-Lander","2.8 Legender","Raptor V6"],
    priceRange: [500000, 1500000], life: 8,
  },
  {
    category: "CAMERA",
    names: ["Canon EOS R6","Sony A7 IV","Nikon Z6","Fujifilm X-T5","GoPro Hero"],
    brands: ["Canon","Sony","Nikon","Fujifilm","GoPro"],
    models: ["Mark II","Alpha A7 IV","Z6 III","X-T5","Hero 12"],
    priceRange: [15000, 150000], life: 5,
  },
  {
    category: "PROJECTOR",
    names: ["Epson EB","BenQ MW","Optoma HD","ViewSonic PA","Sony VPL"],
    brands: ["Epson","BenQ","Optoma","ViewSonic","Sony"],
    models: ["EB-FH52","MW612","HD146X","PA503S","VPL-EX455"],
    priceRange: [12000, 80000], life: 5,
  },
  {
    category: "PRINTER",
    names: ["HP LaserJet","Brother HL","Canon imageRUNNER","Epson EcoTank","Fujifilm Apeos"],
    brands: ["HP","Brother","Canon","Epson","Fujifilm"],
    models: ["Pro 4003dn","L6400DW","C5840F","L15160","C2410SD"],
    priceRange: [5000, 60000], life: 5,
  },
  {
    category: "PHONE",
    names: ["iPhone 15 Pro","Samsung Galaxy S24","Google Pixel 8","OnePlus 12"],
    brands: ["Apple","Samsung","Google","OnePlus"],
    models: ["Pro Max","Ultra","Pro","12 Pro"],
    priceRange: [15000, 55000], life: 3,
  },
  {
    category: "FURNITURE",
    names: ["Herman Miller Aeron","IKEA MARKUS","Steelcase Leap","Standing Desk","Conference Table"],
    brands: ["Herman Miller","IKEA","Steelcase","Flexispot","King Power"],
    models: ["Aeron B","MARKUS","V2 Plus","E7 Pro","KP-180"],
    priceRange: [3000, 80000], life: 10,
  },
  {
    category: "OTHER",
    names: ["UPS CyberPower","Whiteboard","Scanner Fujitsu","Smart TV Samsung","NAS Synology"],
    brands: ["CyberPower","3M","Fujitsu","Samsung","Synology"],
    models: ["CP1500","WB-180","ScanSnap iX1600","QN85QN85C","DS923+"],
    priceRange: [2000, 50000], life: 5,
  },
];

function randomSerial(prefix: string, n: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let s = prefix.toUpperCase().slice(0, 2);
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${s}-${pad(n, 5)}`;
}

function makeAssetCode(n: number) {
  return `EQ-BULK-${pad(n, 5)}`;
}

function makeAssetData(n: number) {
  const tmpl = rand(ASSET_TEMPLATES);
  const name  = rand(tmpl.names);
  const brand = rand(tmpl.brands);
  const model = rand(tmpl.models);
  const purchaseDate = randomPastDate(1825);
  const expectedLife = tmpl.life;
  const warrantyMonths = randInt(12, 36);
  const warrantyEnd = new Date(purchaseDate);
  warrantyEnd.setMonth(warrantyEnd.getMonth() + warrantyMonths);
  const nextMaint = Math.random() > 0.5 ? daysFromNow(randInt(7, 180)) : undefined;

  return {
    code:          makeAssetCode(n),
    name:          `${name} #${pad(n, 3)}`,
    brand,
    model,
    serialNumber:  randomSerial(brand, n),
    category:      tmpl.category,
    status:        rand(ASSET_STATUSES),
    purchaseDate,
    purchasePrice: randFloat(tmpl.priceRange[0], tmpl.priceRange[1], 0),
    expectedLife,
    warrantyEnd,
    nextMaintenance: nextMaint,
    location:      rand(LOCATIONS),
    notes:         Math.random() > 0.7 ? `บันทึก: ซื้อปี ${purchaseDate.getFullYear() + 543}` : undefined,
  };
}

function makeMaintData(assetId: string) {
  const descriptions = [
    "เปลี่ยนแบตเตอรี่","ทำความสะอาดระบบ","อัปเดต firmware","เปลี่ยนอะไหล่","ตรวจสภาพประจำปี",
    "ซ่อมหน้าจอแตก","เปลี่ยนฮาร์ดดิสก์","ล้างฝุ่นภายใน","ตรวจสอบระบบไฟฟ้า","เปลี่ยนล้อยาง",
    "ถ่ายน้ำมันเครื่อง","เช็คระบบเบรก","เปลี่ยนหมึก","ซ่อมพอร์ต USB","ตรวจสอบหน่วยความจำ",
  ];
  return {
    assetId,
    date:        randomPastDate(730),
    description: rand(descriptions),
    cost:        randFloat(500, 25000, 0),
    vendor:      rand(VENDORS),
    type:        rand(MAINTENANCE_TYPES),
    notes:       Math.random() > 0.6 ? "ดำเนินการเรียบร้อยแล้ว" : undefined,
  };
}

function makeBookingData(assetId: string, userId: string | undefined, personName: string) {
  const dateStart = Math.random() > 0.4 ? randomPastDate(365) : randomFutureDate(60);
  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + randInt(1, 7));
  const purposes = [
    "ประชุมลูกค้า","ถ่ายภาพสินค้า","นำเสนองาน","อบรมพนักงาน","งาน Event",
    "ตรวจสอบสาขา","เดินทางต่างจังหวัด","ถ่ายทำวิดีโอ","สัมมนา","ซ้อมกีฬาบริษัท",
  ];
  return {
    assetId,
    userId,
    personName,
    dateStart,
    dateEnd,
    purpose:         rand(purposes),
    conditionBefore: rand(["ดีมาก","ดี","พอใช้","ชำรุดเล็กน้อย"]),
    conditionAfter:  Math.random() > 0.5 ? rand(["ดีมาก","ดี","พอใช้"]) : undefined,
    status:          rand(BOOKING_STATUSES),
  };
}

function makeAssignmentData(assetId: string, userId: string | undefined, personName: string) {
  const dateOut = randomPastDate(900);
  const dateIn  = Math.random() > 0.5 ? (new Date(dateOut.getTime() + randInt(30, 700) * 86400000)) : undefined;
  const notes_list = [
    "ใช้ประจำ","ยืมระยะสั้น","ประจำแผนก","สำรอง","ใช้งานโปรเจกต์พิเศษ",
  ];
  return {
    assetId,
    userId,
    personName,
    department: rand(DEPARTMENTS),
    dateOut,
    dateIn,
    notes: Math.random() > 0.5 ? rand(notes_list) : undefined,
  };
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Bulk seed starting...");
  console.log(`   Assets: ${CFG.assets} | Users: ${CFG.users} | Maintenance: ${CFG.maint}`);
  console.log(`   Bookings: ${CFG.bookings} | Assignments: ${CFG.assignments} | Reset: ${CFG.reset}`);

  // Optional: wipe existing data
  if (CFG.reset) {
    console.log("🗑️  Resetting database...");
    await prisma.booking.deleteMany();
    await prisma.maintenanceRecord.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.assetPhoto.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.user.deleteMany({ where: { email: { not: { in: ["admin@company.com"] } } } });
    console.log("   Done.");
  }

  // ── 1. Ensure base admin user ─────────────────────────────
  const hashedPw = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where:  { email: "admin@company.com" },
    update: { hashedPassword: hashedPw },
    create: { email: "admin@company.com", name: "Admin", role: "ADMIN", hashedPassword: hashedPw },
  });

  // ── 2. Bulk users ────────────────────────────────────────────
  console.log(`👥 Creating ${CFG.users} users...`);
  const userPw = await bcrypt.hash("user123", 10);
  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email)
  );

  const newUsers: { email: string; name: string; role: string; hashedPassword: string }[] = [];
  for (let i = 1; i <= CFG.users; i++) {
    const firstName = rand(THAI_FIRST);
    const lastName  = rand(THAI_LAST);
    const email     = `user${pad(i, 4)}@company.com`;
    if (!existingEmails.has(email)) {
      newUsers.push({ email, name: `${firstName} ${lastName}`, role: rand(["USER","USER","USER","VIEWER"]), hashedPassword: userPw });
    }
  }
  if (newUsers.length > 0) {
    await prisma.user.createMany({ data: newUsers });
  }
  console.log(`   ✓ ${newUsers.length} users added`);

  // Fetch all user IDs for relations
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });

  // ── 3. Bulk assets ────────────────────────────────────────────
  console.log(`📦 Creating ${CFG.assets} assets...`);
  const existingCodes = new Set(
    (await prisma.asset.findMany({ select: { code: true } })).map((a) => a.code)
  );

  // Find starting index
  let assetIdx = 1;
  while (existingCodes.has(makeAssetCode(assetIdx))) assetIdx++;

  const assetBatch: ReturnType<typeof makeAssetData>[] = [];
  let created = 0;
  for (let i = 0; i < CFG.assets; i++) {
    while (existingCodes.has(makeAssetCode(assetIdx))) assetIdx++;
    assetBatch.push(makeAssetData(assetIdx));
    existingCodes.add(makeAssetCode(assetIdx));
    assetIdx++;
    created++;

    // Write in chunks of 50
    if (assetBatch.length >= 50) {
      await prisma.asset.createMany({ data: assetBatch });
      process.stdout.write(`\r   ✓ ${created}/${CFG.assets} assets...`);
      assetBatch.length = 0;
    }
  }
  if (assetBatch.length > 0) {
    await prisma.asset.createMany({ data: assetBatch });
  }
  console.log(`\r   ✓ ${created} assets added    `);

  // Fetch all asset IDs
  const allAssets = await prisma.asset.findMany({ select: { id: true, status: true } });
  const activeAssets = allAssets.filter((a) => a.status !== "RETIRED");

  // ── 4. Bulk maintenance records ───────────────────────────────
  console.log(`🔧 Creating ${CFG.maint} maintenance records...`);
  const maintBatch = [];
  for (let i = 0; i < CFG.maint; i++) {
    const asset = rand(allAssets);
    maintBatch.push(makeMaintData(asset.id));
    if (maintBatch.length >= 100) {
      await prisma.maintenanceRecord.createMany({ data: maintBatch });
      maintBatch.length = 0;
      process.stdout.write(`\r   ✓ ${i + 1}/${CFG.maint} maintenance...`);
    }
  }
  if (maintBatch.length > 0) {
    await prisma.maintenanceRecord.createMany({ data: maintBatch });
  }
  console.log(`\r   ✓ ${CFG.maint} maintenance records added    `);

  // ── 5. Bulk bookings ──────────────────────────────────────────
  console.log(`📅 Creating ${CFG.bookings} bookings...`);
  const bookingBatch = [];
  for (let i = 0; i < CFG.bookings; i++) {
    const asset = rand(activeAssets);
    const user  = Math.random() > 0.2 ? rand(allUsers) : null;
    const name  = user?.name ?? `${rand(THAI_FIRST)} ${rand(THAI_LAST)}`;
    bookingBatch.push(makeBookingData(asset.id, user?.id, name));
    if (bookingBatch.length >= 100) {
      await prisma.booking.createMany({ data: bookingBatch });
      bookingBatch.length = 0;
      process.stdout.write(`\r   ✓ ${i + 1}/${CFG.bookings} bookings...`);
    }
  }
  if (bookingBatch.length > 0) {
    await prisma.booking.createMany({ data: bookingBatch });
  }
  console.log(`\r   ✓ ${CFG.bookings} bookings added    `);

  // ── 6. Bulk assignments ───────────────────────────────────────
  console.log(`📋 Creating ${CFG.assignments} assignments...`);
  const assignBatch = [];
  for (let i = 0; i < CFG.assignments; i++) {
    const asset = rand(allAssets);
    const user  = Math.random() > 0.3 ? rand(allUsers) : null;
    const name  = user?.name ?? `${rand(THAI_FIRST)} ${rand(THAI_LAST)}`;
    assignBatch.push(makeAssignmentData(asset.id, user?.id, name));
    if (assignBatch.length >= 100) {
      await prisma.assignment.createMany({ data: assignBatch });
      assignBatch.length = 0;
      process.stdout.write(`\r   ✓ ${i + 1}/${CFG.assignments} assignments...`);
    }
  }
  if (assignBatch.length > 0) {
    await prisma.assignment.createMany({ data: assignBatch });
  }
  console.log(`\r   ✓ ${CFG.assignments} assignments added    `);

  // ── Summary ───────────────────────────────────────────────────
  const [uC, aC, mC, bC, asnC] = await Promise.all([
    prisma.user.count(),
    prisma.asset.count(),
    prisma.maintenanceRecord.count(),
    prisma.booking.count(),
    prisma.assignment.count(),
  ]);

  console.log("\n✅ Bulk seed complete!");
  console.log("─".repeat(40));
  console.log(`   Users:        ${uC}`);
  console.log(`   Assets:       ${aC}`);
  console.log(`   Maintenance:  ${mC}`);
  console.log(`   Bookings:     ${bC}`);
  console.log(`   Assignments:  ${asnC}`);
  console.log("─".repeat(40));
  console.log("   Login: admin@company.com / admin123");
  console.log("   Extra users: user0001@company.com ... / user123");
}

main()
  .catch((e) => {
    console.error("❌ Bulk seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
