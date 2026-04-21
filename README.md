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
