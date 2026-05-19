// Path: prisma/test-mssql.ts
// Quick connection test — ใช้ก่อนรัน extrac-image.ts จริง
//
// Usage:  npx tsx prisma/test-mssql.ts

import sql from "mssql";

const config: sql.config = {
  server: "192.168.1.21",
  port: 1433,
  database: "aspnet-TaeAuthenticationTestDb",
  user: "sa",
  password: "01Password",
  options: {
    instanceName: "INTERNPRJ",
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function main() {
  console.log(`Connecting to ${config.server}\\${config.options?.instanceName}...`);
  await sql.connect(config);
  console.log("✓ Connected");

  const result = await sql.query`
    SELECT
      COUNT(*) AS total,
      COUNT(ImageData) AS withImage,
      SUM(CAST(DATALENGTH(ImageData) AS BIGINT)) AS totalBytes
    FROM Items
  `;
  const row = result.recordset[0];
  console.log(`Total items:     ${row.total}`);
  console.log(`With image:      ${row.withImage}`);
  console.log(`Total bytes:     ${row.totalBytes ?? 0} (~${((row.totalBytes ?? 0) / 1024 / 1024).toFixed(1)} MB)`);

  // peek 3 codes to verify mapping
  const sample = await sql.query`
    SELECT TOP 3 Id, AssetCode, DATALENGTH(ImageData) AS bytes
    FROM Items
    WHERE ImageData IS NOT NULL
    ORDER BY Id
  `;
  console.log(`\nSample rows:`);
  sample.recordset.forEach((r) =>
    console.log(`  Id=${r.Id}  AssetCode=${r.AssetCode}  bytes=${r.bytes}`)
  );

  await (sql as any).close();
}

main().catch((e) => {
  console.error("✗ Failed:", e.message);
  process.exit(1);
});
