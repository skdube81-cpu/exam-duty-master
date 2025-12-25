# Exam Duty Master — GitHub Pages (No Backend)

This is a **complete package** that runs online using **GitHub Pages** only (static site).
No Flask, no Python server, no database server.

## How to use
1) Open the website (GitHub Pages URL).
2) Add **Faculty** (Active/Inactive).
3) Add **Schedule** (Date + Shift M/E + Rooms 1..15).
4) Go to **Assign**:
   - Choose date + shift
   - Enter rooms (or leave blank if schedule has it)
   - Select restricted faculty (checkboxes)
   - Click **Run Assignment**
5) Go to **Reports**:
   - Load date + shift
   - Export CSV files (RoomWise / Duty01 / Totals)

## Deployment on GitHub Pages
- Upload these files to repo root:
  - index.html
  - style.css
  - app.js
- GitHub → Settings → Pages:
  - Source: Deploy from branch
  - Branch: main
  - Folder: /(root)

## Data storage
Data saves in your browser localStorage (per PC/browser).
Use **Backup(JSON)** and **Restore(JSON)** to move/share data.

## Exports
Exports are **CSV** (zero dependencies). Excel opens CSV directly.
