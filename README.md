# 🚗 GarageLog v2 — Multi-User Car Expense Tracker

Full-stack Next.js app with Firebase Auth + Firestore. Multi-user, multi-vehicle, Google Sign-In.

---

## ✨ Features

- 🔐 Email/Password Sign-Up + Google OAuth  
- 🚗 Multiple vehicles per user  
- ⛽ Fuel logs — mileage auto-calc, provider comparison  
- 💸 Expense tracker — 8 categories, filterable  
- 🔧 Service history + next-service km alerts  
- 🛞 Odometer timeline with jump detection  
- 📊 Dashboard with charts + smart insights  
- 📈 Analytics with date-range filters  

---

## 🔥 Step 1 — Create Firebase Project

1. Go to https://console.firebase.google.com  
2. **Add project** → name it (e.g. `garagelog`) → Create  

---

## 🔑 Step 2 — Enable Authentication

1. Firebase Console → **Build → Authentication → Get started**  
2. Enable **Email/Password** → Save  
3. Enable **Google** → add support email → Save  

---

## 🗄️ Step 3 — Create Firestore Database

1. Firebase Console → **Build → Firestore Database → Create database**  
2. Choose **Production mode** → pick a region → Enable  
3. Go to **Rules** tab → paste contents of `firestore.rules` → **Publish**  

---

## ⚙️ Step 4 — Get Firebase Config

1. Firebase Console → ⚙️ **Project Settings → Your Apps → Web (</>)**  
2. Register app → copy the `firebaseConfig` values  

---

## 🔧 Step 5 — Set Up Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Firebase config values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

---

## 💻 Step 6 — Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## 🚀 Step 7 — Deploy to Vercel

**Option A — CLI:**
```bash
npx vercel
```
Add all 6 env vars when prompted.

**Option B — GitHub + Vercel Dashboard:**
1. Push to GitHub  
2. vercel.com → New Project → Import repo  
3. Add all 6 `NEXT_PUBLIC_FIREBASE_*` environment variables  
4. Deploy  

> Never commit `.env.local` — it is already in `.gitignore`

---

## 🔒 Firestore Data Structure

```
users/
  {uid}/
    vehicles/     {vehicleId}
    fuelLogs/     {logId}
    expenses/     {expenseId}
    services/     {serviceId}
    odometerLogs/ {logId}
```

Each user can only access their own data (enforced by `firestore.rules`).

---

## 📁 Project Structure

```
pages/
  index.js               Auth page (Sign In / Sign Up / Google)
  dashboard.js           Main dashboard
  analytics/index.js     Full analytics + date filter
  vehicles/              List, new, [id], [id]/edit
  fuel/                  List, new
  expenses/index.js      Expense tracker
  services/index.js      Service history + alerts
  odometer/index.js      Odometer timeline

lib/
  firebase.js            Firebase app init
  db.js                  All Firestore ops (uid-scoped)

context/
  AuthContext.js         Firebase Auth React context

hooks/
  useRequireAuth.js      Auth guard hook
```
