# คำนวณค่าน้ำมันแบบรวยไม่ไหว ⛽

แอปคำนวณค่าน้ำมันพร้อมเปรียบเทียบราคาสถานีบริการ และฟีเจอร์ย้อนเวลาดูว่าเติมถังแพงขึ้นแค่ไหนเมื่อเทียบกับอดีต

## Features

- **คำนวณค่าน้ำมัน** — เติมเต็มถัง หรือระบุงบประมาณ
- **เปรียบเทียบราคา** — PTT และ Bangchak แบบ real-time
- **ราคาพรุ่งนี้** — แจ้งเตือนเมื่อราคาจะขึ้น (Golden Hour)
- **เครื่องจับเท็จราคาน้ำมัน** — ย้อนเวลาเปรียบเทียบราคาวันนี้กับช่วงเวลาสำคัญในอดีต
- **จำลองราคา (What-If)** — คำนวณถ้าราคาน้ำมันเปลี่ยนแปลง

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React, Vite, Tailwind CSS         |
| Backend  | .NET 9, ASP.NET Core Minimal API  |
| Database | PostgreSQL + Entity Framework Core |
| Deploy   | Render.com (backend), Vercel (frontend) |

## Local Development

```bash
# Backend
cd backend/FuelCalc.Api
dotnet run

# Frontend
cd frontend
npm install
npm run dev
```
