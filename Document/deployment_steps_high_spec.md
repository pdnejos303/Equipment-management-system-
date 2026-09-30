# ขั้นตอนการ Deploy EquipTrack ขึ้นเครื่อง EC2 (สเปคสูง)

**สเปคเครื่องที่แนะนำ (เนื่องจากมีเครดิตเหลือ):**
- **Instance Type:** `t3.medium` (RAM 4GB) หรือ `t3.large` (RAM 8GB)
- **OS:** Ubuntu 24.04 LTS
- **Storage (EBS):** 20GB ขึ้นไป (gp3)
- **Security Group:** อย่าลืมเปิดพอร์ต **22 (SSH)**, **80 (HTTP)**, และ **443 (HTTPS)**

---

### ขั้นตอนที่ 1: เตรียมโค้ดและส่งขึ้นเซิร์ฟเวอร์ (ทำบน Windows PowerShell)

1. **สลับกลับไปใช้ Dockerfile ปกติ (ลบของเก่าทิ้งได้เลย)** 
บนเครื่อง Windows เราสามารถแพ็กไฟล์โค้ดทั้งหมด (ยกเว้น `node_modules` และโฟลเดอร์ที่ไม่จำเป็น) เพื่อส่งขึ้นเซิร์ฟเวอร์ได้เลย:

```powershell
# ใช้คำสั่ง tar บน Windows เพื่อบีบอัด Source Code (ข้ามโฟลเดอร์ที่หนักๆ)
tar -cf project.tar --exclude=node_modules --exclude=.next --exclude=.git .
```

2. **ส่งไฟล์ .tar ไปยังเซิร์ฟเวอร์ EC2 เครื่องใหม่:**
*(อย่าลืมเปลี่ยน `IP_เครื่องใหม่` เป็น IP ของ EC2 ที่เพิ่งสร้าง และตรวจสอบ path ของไฟล์ .pem ให้ถูกต้อง)*

```powershell
scp -i "C:\Users\ASUS\Downloads\equiptrack-key.pem" -o StrictHostKeyChecking=no project.tar ubuntu@IP_เครื่องใหม่:~/
```

---

### ขั้นตอนที่ 2: ติดตั้ง Docker และรันระบบ (ทำบน EC2)

1. **SSH เข้าเซิร์ฟเวอร์เครื่องใหม่:**
```powershell
ssh -i "C:\Users\ASUS\Downloads\equiptrack-key.pem" -o StrictHostKeyChecking=no ubuntu@IP_เครื่องใหม่
```

2. **ติดตั้ง Docker และแตกไฟล์โค้ด (พิมพ์ทีละบรรทัดบน EC2):**

```bash
# 1. ติดตั้ง Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker

# 2. สร้างโฟลเดอร์และแตกไฟล์
mkdir -p ~/app
tar -xf ~/project.tar -C ~/app
cd ~/app
```

3. **แก้ไข IP ในไฟล์ .env:**
ใช้คำสั่งนี้เพื่อแก้ `localhost` ให้เป็น IP ของเครื่อง EC2 (เพื่อให้ระบบ QR Code หรือการอ้างอิง URL ทำงานได้ถูกต้อง):
```bash
sed -i 's|http://localhost:3000|http://IP_เครื่องใหม่|g' .env
```

4. **สั่ง Build และ Run (จบในคำสั่งเดียว):**
```bash
# เนื่องจากเรามี RAM เยอะแล้ว ให้ Docker จัดการ Build เองได้เลย
docker compose up -d --build
```

---

### เสร็จสมบูรณ์! 🎉
หลังจากคำสั่งข้อ 4 ทำงานเสร็จ (อาจจะใช้เวลา Build โค้ดประมาณ 2-3 นาที) ระบบจะรันขึ้นมาทันที 
- ฐานข้อมูล PostgreSQL พร้อมใช้งาน
- แอดมินตั้งต้นถูกสร้าง (admin@company.com / admin123)
- สามารถเข้าใช้งานผ่าน Browser โดยพิมพ์ **`http://IP_เครื่องใหม่`** ได้เลย (Nginx จัดการพอร์ต 80 ให้แล้ว)
