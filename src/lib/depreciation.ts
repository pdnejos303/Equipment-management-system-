// Path: src/lib/depreciation.ts
/**
 * คำนวณค่าเสื่อมราคาแบบเส้นตรง (Straight-line depreciation)
 */
export interface DepreciationResult {
  currentValue: number;
  totalDepreciation: number;
  annualDepreciation: number;
  yearsUsed: number;
  percentUsed: number;
}

export function calculateDepreciation(
  purchasePrice: number,
  purchaseDate: Date,
  expectedLife: number
): DepreciationResult {
  const now = new Date(); // วันนี้
  const msUsed = now.getTime() - new Date(purchaseDate).getTime();
  //             ^^^^^^^^^^^^    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//             milliseconds    milliseconds ของวันซื้อ
//     = ระยะเวลาที่ผ่านไป (ms)
  const yearsUsed = msUsed / (365.25 * 24 * 60 * 60 * 1000);
//                          ^^^^^^  ^^  ^^  ^^  ^^^^
//                          วัน    ชม. นาที วิ  ms
//                = แปลง milliseconds → ปี
  const annualDepreciation = purchasePrice / expectedLife;
//                         ^^^^^^^^^^^^^ / ^^^^^^^^^^^^
//                         50,000 บาท   /  5 ปี
//                       = 10,000 บาท/ปี
  const totalDepreciation = Math.min(
    annualDepreciation * yearsUsed,// 10,000 * 2.3 = 23,000
    purchasePrice                  // 50,000 กำหนด เลข สูงสุดไม่เกินราคาซื้อ
  );
// Math.min → เอาค่าน้อยกว่า (ป้องกันเสื่อมเกินราคาซื้อ)
// = 23,000 บาท
  const currentValue = Math.max(purchasePrice - totalDepreciation, 0); // กันไม่ให้เลจติดลบ เพราะ max เอาค่ามากสุด พอใส่ 0 เข้าไป ค่าต่ำสุดอย่างน้อยมันคือ 0 

  const percentUsed = Math.min(
    Math.round((yearsUsed / expectedLife) * 100),
    100
  );

  return {
    currentValue,
    totalDepreciation,
    annualDepreciation,
    yearsUsed,
    percentUsed,
  };
}
