// ============================================================
// File: MockJP.ts
// Path: equip-track/prisma/MockJP.ts
// Desc: Bulk seed script (Japanese context) — generate large
//       volume of realistic Japan-context data for dev/demo.
//
// Usage:
//   npm run mock:jp
//   OR:
//   npx tsx prisma/MockJP.ts --reset --assets=200 --users=30
//
// Options (CLI args or env vars):
//   --assets=200       / SEED_ASSETS       number of extra assets    (default 200)
//   --users=30         / SEED_USERS        number of extra users     (default 30)
//   --maint=400        / SEED_MAINT        maintenance records       (default 400)
//   --bookings=300     / SEED_BOOKINGS     booking records           (default 300)
//   --assignments=250  / SEED_ASSIGNMENTS  assignment records        (default 250)
//   --reset            / SEED_RESET=true   delete all data first     (default false)
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Config ───────────────────────────────────────────────────
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
function pad(n: number, len = 3) {
  return String(n).padStart(len, "0");
}

// ── Reference data (Japanese) ────────────────────────────────

const JP_LAST = [
  "佐藤","鈴木","高橋","田中","渡辺","伊藤","山本","中村","小林","加藤",
  "吉田","山田","佐々木","山口","松本","井上","木村","林","斎藤","清水",
  "山崎","森","池田","橋本","阿部","石川","前田","藤田","後藤","岡田",
  "長谷川","村上","近藤","石井","坂本","遠藤","青木","藤井","西村","福田",
];
const JP_FIRST_M = [
  "大輔","翔太","健太","拓也","誠","直樹","和也","祐介","健一","隆",
  "賢治","裕太","俊介","達也","雅彦","光",  "崇","亮","悠斗","蓮",
];
const JP_FIRST_F = [
  "美咲","さくら","結衣","葵","陽菜","真由美","愛","由香","彩","美香",
  "千尋","ひかり","萌","佳奈","優子","恵","沙織","真希","直美","美穂",
];
const JP_FIRST = [...JP_FIRST_M, ...JP_FIRST_F];

const DEPARTMENTS = [
  "経理部","営業部","情報システム部","人事部","マーケティング部",
  "購買部","総務部","経営企画室","物流倉庫部",
  "技術部","広報部","法務部","品質管理部","製造部","研究開発部",
];

const LOCATIONS = [
  "本社 1階","本社 2階","本社 3階","本社 5階",
  "会議室A","会議室B","サーバールーム","資料保管室",
  "東京支店","大阪支店","名古屋支店","福岡支店","横浜支店",
  "札幌オフィス","仙台営業所","研修センター","物流倉庫",
];

const VENDORS = [
  "株式会社ITソリューション","Apple Japan サポート","Dell Japan サービス",
  "キヤノンマーケティングジャパン","エプソンサービスセンター",
  "トヨタモビリティ東京","オートバックス 新宿店","ヨドバシカメラ法人部",
  "Lenovo Japan サポート","富士通サービス","HP Japan サービス",
  "ビックカメラ法人営業","株式会社オフィス修理屋","NTT東日本",
  "リコージャパン","コニカミノルタ ジャパン",
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
  priceRange: [number, number]; // JPY
  life: number;
}

const ASSET_TEMPLATES: AssetTemplate[] = [
  {
    category: "LAPTOP",
    names: ["MacBook Pro","ThinkPad X1","Dell XPS","HP EliteBook","ASUS ProArt","Surface Pro","富士通 LIFEBOOK","NEC LAVIE","Panasonic レッツノート"],
    brands: ["Apple","Lenovo","Dell","HP","ASUS","Microsoft","富士通","NEC","Panasonic"],
    models: ['14" M3','Gen 11','13 Plus','840 G9','16 OLED','9 Business','WU-X/G2','NX850','SV3'],
    priceRange: [80000, 450000], life: 4,
  },
  {
    category: "MONITOR",
    names: ['Dell UltraSharp 27"','LG 4K IPS','BenQ PD','EIZO FlexScan','ASUS ProArt 32"','Samsung Odyssey','iiyama ProLite'],
    brands: ["Dell","LG","BenQ","EIZO","ASUS","Samsung","iiyama"],
    models: ["U2723QE","27UK850","PD3220U","EV2785","PA329CV","G27QN","XUB2792UHSU"],
    priceRange: [25000, 180000], life: 6,
  },
  {
    category: "VEHICLE",
    names: ["トヨタ プリウス","ホンダ フィット","日産 セレナ","トヨタ ハイエース","スズキ エブリイ","三菱 デリカ"],
    brands: ["トヨタ","ホンダ","日産","スズキ","三菱","マツダ"],
    models: ["A プレミアム","e:HEV","ハイウェイスター","スーパーGL","ジョイン","D:5 P"],
    priceRange: [1500000, 5500000], life: 8,
  },
  {
    category: "CAMERA",
    names: ["Canon EOS R6","Sony α7 IV","Nikon Z6","Fujifilm X-T5","GoPro Hero","Panasonic LUMIX"],
    brands: ["Canon","Sony","Nikon","Fujifilm","GoPro","Panasonic"],
    models: ["Mark II","α7 IV","Z6 III","X-T5","Hero 12","GH6"],
    priceRange: [60000, 550000], life: 5,
  },
  {
    category: "PROJECTOR",
    names: ["Epson EB","BenQ MW","Optoma HD","ViewSonic PA","Sony VPL","NEC ViewLight"],
    brands: ["Epson","BenQ","Optoma","ViewSonic","Sony","NEC"],
    models: ["EB-FH52","MW612","HD146X","PA503S","VPL-EX455","NP-M353WSJL"],
    priceRange: [45000, 280000], life: 5,
  },
  {
    category: "PRINTER",
    names: ["HP LaserJet","Brother HL","Canon imageRUNNER","Epson EcoTank","リコー IM C","富士フイルム Apeos"],
    brands: ["HP","Brother","Canon","Epson","リコー","富士フイルム"],
    models: ["Pro 4003dn","L6400DW","C5840F","L15160","C2500","C2410SD"],
    priceRange: [20000, 220000], life: 5,
  },
  {
    category: "PHONE",
    names: ["iPhone 15 Pro","Samsung Galaxy S24","Google Pixel 8","ソニー Xperia","シャープ AQUOS"],
    brands: ["Apple","Samsung","Google","ソニー","シャープ"],
    models: ["Pro Max","Ultra","Pro","1 V","R8 pro"],
    priceRange: [60000, 230000], life: 3,
  },
  {
    category: "FURNITURE",
    names: ["ハーマンミラー アーロン","オカムラ Contessa","イトーキ Spina","コクヨ Bezel","昇降デスク","会議用テーブル"],
    brands: ["Herman Miller","オカムラ","イトーキ","コクヨ","FlexiSpot","ニトリビジネス"],
    models: ["Aeron B","セコンダ","S-200","CR-G","E7 Pro","BIZ-180"],
    priceRange: [15000, 280000], life: 10,
  },
  {
    category: "OTHER",
    names: ["UPS オムロン","ホワイトボード","スキャナー 富士通","Smart TV シャープ","NAS Synology","シュレッダー アイリスオーヤマ"],
    brands: ["オムロン","プラス","富士通","シャープ","Synology","アイリスオーヤマ"],
    models: ["BY50S","WB-180","ScanSnap iX1600","AQUOS 4T-C","DS923+","P5GCi"],
    priceRange: [8000, 180000], life: 5,
  },
];

function randomSerial(prefix: string, n: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  // strip non-ASCII for serial prefix (brand names like トヨタ)
  const ascii = prefix.replace(/[^A-Za-z]/g, "").slice(0, 2) || "JP";
  let s = ascii.toUpperCase();
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${s}-${pad(n, 5)}`;
}

function makeAssetCode(n: number) {
  return `EQ-JP-${pad(n, 5)}`;
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
    notes:         Math.random() > 0.7 ? `備考: ${purchaseDate.getFullYear()}年度購入` : undefined,
  };
}

function makeMaintData(assetId: string) {
  const descriptions = [
    "バッテリー交換","システム清掃","ファームウェアアップデート","部品交換","年次点検",
    "画面割れ修理","ハードディスク交換","内部のほこり清掃","電気系統点検","タイヤ交換",
    "オイル交換","ブレーキ点検","インク補充","USBポート修理","メモリ点検",
    "ファン交換","キーボード修理","電源ユニット交換","定期メンテナンス","エアフィルター清掃",
  ];
  return {
    assetId,
    date:        randomPastDate(730),
    description: rand(descriptions),
    cost:        randFloat(2000, 150000, 0),
    vendor:      rand(VENDORS),
    type:        rand(MAINTENANCE_TYPES),
    notes:       Math.random() > 0.6 ? "対応完了いたしました。" : undefined,
  };
}

function makeBookingData(assetId: string, userId: string | undefined, personName: string) {
  const dateStart = Math.random() > 0.4 ? randomPastDate(365) : randomFutureDate(60);
  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + randInt(1, 7));
  const purposes = [
    "顧客打ち合わせ","商品撮影","プレゼンテーション","社員研修","イベント運営",
    "支店監査","出張","動画撮影","セミナー","社内競技会",
    "展示会出展","新人研修","リモートワーク貸出","現場調査",
  ];
  return {
    assetId,
    userId,
    personName,
    dateStart,
    dateEnd,
    purpose:         rand(purposes),
    conditionBefore: rand(["非常に良い","良い","普通","若干の損傷あり"]),
    conditionAfter:  Math.random() > 0.5 ? rand(["非常に良い","良い","普通"]) : undefined,
    status:          rand(BOOKING_STATUSES),
  };
}

function makeAssignmentData(assetId: string, userId: string | undefined, personName: string) {
  const dateOut = randomPastDate(900);
  const dateIn  = Math.random() > 0.5 ? (new Date(dateOut.getTime() + randInt(30, 700) * 86400000)) : undefined;
  const notes_list = [
    "常時使用","短期貸出","部署専用","予備機","特別プロジェクト用","在宅勤務用","出張持出","新入社員配布",
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
  console.log("🇯🇵 Bulk seed (Japanese) starting...");
  console.log(`   Assets: ${CFG.assets} | Users: ${CFG.users} | Maintenance: ${CFG.maint}`);
  console.log(`   Bookings: ${CFG.bookings} | Assignments: ${CFG.assignments} | Reset: ${CFG.reset}`);

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
    create: { email: "admin@company.com", name: "管理者", role: "ADMIN", hashedPassword: hashedPw },
  });

  // ── 2. Bulk users ────────────────────────────────────────────
  console.log(`👥 Creating ${CFG.users} users...`);
  const userPw = await bcrypt.hash("user123", 10);
  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email)
  );

  const newUsers: { email: string; name: string; role: string; hashedPassword: string }[] = [];
  let userIdx = 1;
  while (newUsers.length < CFG.users) {
    const email = `user_jp${pad(userIdx, 4)}@company.com`;
    userIdx++;
    if (existingEmails.has(email)) continue;
    const lastName  = rand(JP_LAST);
    const firstName = rand(JP_FIRST);
    newUsers.push({
      email,
      name: `${lastName} ${firstName}`,
      role: rand(["USER","USER","USER","VIEWER"]),
      hashedPassword: userPw,
    });
    existingEmails.add(email);
  }
  if (newUsers.length > 0) {
    await prisma.user.createMany({ data: newUsers });
  }
  console.log(`   ✓ ${newUsers.length} users added`);

  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });

  // ── 3. Bulk assets ────────────────────────────────────────────
  console.log(`📦 Creating ${CFG.assets} assets...`);
  const existingCodes = new Set(
    (await prisma.asset.findMany({ select: { code: true } })).map((a) => a.code)
  );

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
    const name  = user?.name ?? `${rand(JP_LAST)} ${rand(JP_FIRST)}`;
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
    const name  = user?.name ?? `${rand(JP_LAST)} ${rand(JP_FIRST)}`;
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

  console.log("\n✅ Bulk seed (JP) complete!");
  console.log("─".repeat(40));
  console.log(`   Users:        ${uC}`);
  console.log(`   Assets:       ${aC}`);
  console.log(`   Maintenance:  ${mC}`);
  console.log(`   Bookings:     ${bC}`);
  console.log(`   Assignments:  ${asnC}`);
  console.log("─".repeat(40));
  console.log("   Login: admin@company.com / admin123");
  console.log("   Extra users: user_jp0001@company.com ... / user123");
}

main()
  .catch((e) => {
    console.error("❌ Bulk seed (JP) failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
