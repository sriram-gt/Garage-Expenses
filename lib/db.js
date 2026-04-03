// ─────────────────────────────────────────────────────────────────────────────
// GarageLog Firestore DB layer — multi-user, all data scoped to uid
// Path: users/{uid}/{collection}/{docId}
// ─────────────────────────────────────────────────────────────────────────────
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy,
  serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

// ─── Constants ───────────────────────────────────────────────────────────────
export const FUEL_PROVIDERS = [
  { id: 'indian_oil', label: 'Indian Oil',     color: '#e63946', logo: '🔴' },
  { id: 'hp',         label: 'HP',             color: '#2196f3', logo: '🔵' },
  { id: 'shell',      label: 'Shell',          color: '#f9c22e', logo: '🟡' },
  { id: 'nayara',     label: 'Nayara Energy', color: '#ff6b35', logo: '🟠' },
  { id: 'bp',         label: 'BP',             color: '#009900', logo: '🟢' },
  { id: 'other',      label: 'Other',          color: '#888',    logo: '⚪' },
]
export const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG']
export const EXPENSE_TYPES = [
  { id: 'fuel',      label: 'Fuel',         emoji: '⛽', color: '#e8ff47' },
  { id: 'service',   label: 'Service',      emoji: '🔧', color: '#4ecdc4' },
  { id: 'repair',    label: 'Repair',       emoji: '🔩', color: '#ff6b35' },
  { id: 'tyre',      label: 'Tyres',        emoji: '🛞', color: '#a78bfa' },
  { id: 'insurance', label: 'Insurance',    emoji: '🛡️', color: '#f472b6' },
  { id: 'wash',      label: 'Car Wash',     emoji: '🫧', color: '#38bdf8' },
  { id: 'accessory', label: 'Accessories', emoji: '✨', color: '#fb923c' },
  { id: 'other',     label: 'Other',        emoji: '📦', color: '#94a3b8' },
]
export const SERVICE_TYPES = [
  'Oil Change','Tyre Rotation','Air Filter','Brake Pad',
  'Battery','General Service','AC Service','Alignment & Balancing','Other',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const col  = (uid, name)      => collection(db, 'users', uid, name)
const dref = (uid, name, id)  => doc(db, 'users', uid, name, id)
const today = ()              => new Date().toISOString().split('T')[0]

// ─── VEHICLES ────────────────────────────────────────────────────────────────
export async function getVehicles(uid) {
  const snap = await getDocs(query(col(uid,'vehicles'), orderBy('createdAt','asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function getVehicle(uid, vid) {
  const snap = await getDoc(dref(uid,'vehicles',vid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
export async function addVehicle(uid, data) {
  const ref = await addDoc(col(uid,'vehicles'), {
    ...data, odometer: parseFloat(data.odometer||0), createdAt: serverTimestamp(),
  })
  if (data.odometer) {
    await _addOdoLog(uid, ref.id, parseFloat(data.odometer), data.purchaseDate||today(), 'Initial reading')
  }
  return ref.id
}
export async function updateVehicle(uid, vid, data) {
  await updateDoc(dref(uid,'vehicles',vid), data)
}
export async function deleteVehicle(uid, vid) {
  const batch = writeBatch(db)
  for (const c of ['odometerLogs','fuelLogs','expenses','services']) {
    const snap = await getDocs(query(col(uid,c), where('vehicleId','==',vid)))
    snap.docs.forEach(d => batch.delete(d.ref))
  }
  batch.delete(dref(uid,'vehicles',vid))
  await batch.commit()
}

// ─── ODOMETER ────────────────────────────────────────────────────────────────
export async function getOdometerLogs(uid, vid) {
  const snap = await getDocs(query(col(uid,'odometerLogs'), where('vehicleId','==',vid), orderBy('date','asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
async function _addOdoLog(uid, vid, reading, date, note='') {
  await addDoc(col(uid,'odometerLogs'), { vehicleId:vid, reading, date, note, createdAt: serverTimestamp() })
  await updateDoc(dref(uid,'vehicles',vid), { odometer: reading })
}
export async function addOdometerLog(uid, vid, data) {
  await _addOdoLog(uid, vid, parseFloat(data.reading), data.date, data.note||'')
}
export async function getLatestOdometer(uid, vid) {
  const logs = await getOdometerLogs(uid, vid)
  return logs.length ? logs[logs.length-1] : null
}

// ─── FUEL LOGS ───────────────────────────────────────────────────────────────
export async function getFuelLogs(uid, vid) {
  const snap = await getDocs(query(col(uid,'fuelLogs'), where('vehicleId','==',vid), orderBy('date','asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function addFuelLog(uid, vid, data) {
  const prev     = await getLatestOdometer(uid, vid)
  const odometer = parseFloat(data.odometer)
  const litres   = parseFloat(data.litres)
  const cost     = parseFloat(data.cost)
  let distance_travelled = null, mileage = null
  if (prev?.reading && odometer > prev.reading) {
    distance_travelled = parseFloat((odometer - prev.reading).toFixed(1))
    mileage = litres > 0 ? parseFloat((distance_travelled / litres).toFixed(2)) : null
  }
  const ref = await addDoc(col(uid,'fuelLogs'), {
    vehicleId: vid, date: data.date, provider: data.provider,
    litres, cost, odometer, distance_travelled, mileage,
    pricePerLitre: litres>0 ? parseFloat((cost/litres).toFixed(2)) : null,
    notes: data.notes||'', createdAt: serverTimestamp(),
  })
  await _addOdoLog(uid, vid, odometer, data.date, `Fuel at ${data.provider}`)
  await _addExpenseRaw(uid, vid, { type:'fuel', cost, date:data.date, notes:`${litres}L at ${data.provider}`, fuelLogId:ref.id })
  return ref.id
}
export async function deleteFuelLog(uid, id) {
  await deleteDoc(doc(db,'users',uid,'fuelLogs',id))
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────
export async function getExpenses(uid, vid) {
  const q = vid
    ? query(col(uid,'expenses'), where('vehicleId','==',vid), orderBy('date','desc'))
    : query(col(uid,'expenses'), orderBy('date','desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
async function _addExpenseRaw(uid, vid, data) {
  return addDoc(col(uid,'expenses'), { vehicleId:vid, ...data, cost:parseFloat(data.cost), createdAt: serverTimestamp() })
}
export async function addExpense(uid, vid, data) {
  return _addExpenseRaw(uid, vid, data)
}
export async function updateExpense(uid, id, data) {
  await updateDoc(dref(uid,'expenses',id), data)
}
export async function deleteExpense(uid, id) {
  await deleteDoc(dref(uid,'expenses',id))
}

// ─── SERVICES ────────────────────────────────────────────────────────────────
export async function getServices(uid, vid) {
  const snap = await getDocs(query(col(uid,'services'), where('vehicleId','==',vid), orderBy('date','desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function addService(uid, vid, data) {
  const ref = await addDoc(col(uid,'services'), {
    vehicleId:vid, ...data, cost:parseFloat(data.cost),
    odometer:parseFloat(data.odometer||0), createdAt: serverTimestamp(),
  })
  await _addExpenseRaw(uid, vid, { type:'service', cost:data.cost, date:data.date, notes:data.serviceType, serviceId:ref.id })
  return ref.id
}
export async function deleteService(uid, id) {
  await deleteDoc(dref(uid,'services',id))
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
export async function getAnalytics(uid, vid, { from, to } = {}) {
  let expenses = await getExpenses(uid, vid)
  let fuelLogs = vid ? await getFuelLogs(uid, vid) : []
  const odomLogs = vid ? await getOdometerLogs(uid, vid) : []
  if (from) { expenses=expenses.filter(e=>e.date>=from); fuelLogs=fuelLogs.filter(f=>f.date>=from) }
  if (to)   { expenses=expenses.filter(e=>e.date<=to);   fuelLogs=fuelLogs.filter(f=>f.date<=to) }

  const monthlyMap = {}
  expenses.forEach(e => {
    const mo = e.date?.slice(0,7)
    if (!mo) return
    if (!monthlyMap[mo]) monthlyMap[mo] = { month:mo, total:0, fuel:0, service:0, repair:0, other:0 }
    monthlyMap[mo].total += e.cost
    const t = ['service','repair','fuel'].includes(e.type) ? e.type : 'other'
    monthlyMap[mo][t] = (monthlyMap[mo][t]||0) + e.cost
  })
  const monthly = Object.values(monthlyMap).sort((a,b)=>a.month.localeCompare(b.month)).slice(-12)
  const catMap = {}
  expenses.forEach(e => { catMap[e.type] = (catMap[e.type]||0)+e.cost })
  const byCategory = EXPENSE_TYPES.map(t=>({...t,total:catMap[t.id]||0})).filter(t=>t.total>0)
  const mileageTrend = fuelLogs.filter(f=>f.mileage).map(f=>({date:f.date,mileage:f.mileage,provider:f.provider}))
  const pm = {}
  fuelLogs.forEach(f => {
    if (!f.mileage||!f.provider) return
    if (!pm[f.provider]) pm[f.provider]={readings:[],totalCost:0,totalLitres:0}
    pm[f.provider].readings.push(f.mileage); pm[f.provider].totalCost+=f.cost; pm[f.provider].totalLitres+=f.litres
  })
  const byProvider = Object.entries(pm).map(([id,d]) => {
    const p = FUEL_PROVIDERS.find(x=>x.id===id)||{label:id,color:'#888'}
    return { id, label:p.label, color:p.color, avgMileage: d.readings.length ? parseFloat((d.readings.reduce((a,b)=>a+b,0)/d.readings.length).toFixed(2)):0, totalCost:d.totalCost, totalLitres:d.totalLitres }
  })
  const totalKm = odomLogs.length>=2 ? odomLogs[odomLogs.length-1].reading - odomLogs[0].reading : 0
  const totalExpense = expenses.reduce((s,e)=>s+e.cost,0)
  const costPerKm = totalKm>0 ? parseFloat((totalExpense/totalKm).toFixed(2)) : 0
  const mileages = fuelLogs.filter(f=>f.mileage).map(f=>f.mileage)
  const avgMileage = mileages.length ? parseFloat((mileages.reduce((a,b)=>a+b,0)/mileages.length).toFixed(2)) : 0
  const dailyArr = []
  for (let i=1;i<odomLogs.length;i++) {
    const prev=odomLogs[i-1],curr=odomLogs[i]
    const days=Math.max(1,Math.round((new Date(curr.date)-new Date(prev.date))/86400000))
    const km=curr.reading-prev.reading
    if (km>0&&km<2000) dailyArr.push(parseFloat((km/days).toFixed(1)))
  }
  const avgDailyKm = dailyArr.length ? parseFloat((dailyArr.reduce((a,b)=>a+b,0)/dailyArr.length).toFixed(1)) : 0
  return { totalExpense,totalKm,costPerKm,avgMileage,avgDailyKm,monthly,byCategory,mileageTrend,byProvider,fuelCount:fuelLogs.length,expenseCount:expenses.length }
}

export async function getSmartInsights(uid, vid) {
  const insights = []
  const fuelLogs = await getFuelLogs(uid, vid)
  const expenses = await getExpenses(uid, vid)
  const now = new Date()
  const thisMonth = now.toISOString().slice(0,7)
  const lastMonth = new Date(now.getFullYear(),now.getMonth()-1,1).toISOString().slice(0,7)
  const wm = fuelLogs.filter(f=>f.mileage)
  if (wm.length>=6) {
    const r=wm.slice(-3).map(f=>f.mileage), p=wm.slice(-6,-3).map(f=>f.mileage)
    const ar=r.reduce((a,b)=>a+b,0)/r.length, ap=p.reduce((a,b)=>a+b,0)/p.length
    const d=((ap-ar)/ap)*100
    if (d>10)   insights.push({type:'warning',icon:'📉',text:`Mileage dropped ${d.toFixed(0)}% recently. Consider a service.`})
    if (d<-10) insights.push({type:'success',icon:'📈',text:`Mileage improved ${Math.abs(d).toFixed(0)}% — great performance!`})
  }
  const ts=expenses.filter(e=>e.date?.startsWith(thisMonth)).reduce((s,e)=>s+e.cost,0)
  const ls=expenses.filter(e=>e.date?.startsWith(lastMonth)).reduce((s,e)=>s+e.cost,0)
  if (ls>0) {
    const c=((ts-ls)/ls)*100
    if (c>20)   insights.push({type:'warning',icon:'💸',text:`Spending up ${c.toFixed(0)}% this month vs last.`})
    if (c<-15) insights.push({type:'success',icon:'✅',text:`Expenses down ${Math.abs(c).toFixed(0)}% vs last month!`})
  }
  const pm={}
  fuelLogs.filter(f=>f.mileage).forEach(f=>{if(!pm[f.provider])pm[f.provider]=[];pm[f.provider].push(f.mileage)})
  const pa=Object.entries(pm).map(([id,ms])=>({id,avg:ms.reduce((a,b)=>a+b,0)/ms.length,label:FUEL_PROVIDERS.find(p=>p.id===id)?.label||id})).sort((a,b)=>b.avg-a.avg)
  if (pa.length>=2) {
    const d=((pa[0].avg-pa[pa.length-1].avg)/pa[pa.length-1].avg*100).toFixed(0)
    if (d>5) insights.push({type:'info',icon:'⛽',text:`${pa[0].label} gives ${d}% better mileage than ${pa[pa.length-1].label}.`})
  }
  if (!insights.length) insights.push({type:'info',icon:'💡',text:'Add more fuel logs to unlock personalized insights.'})
  return insights
}

// ─── IMAGE UPLOAD (Base64 Mode - No Storage Required) ───────────────────────

export async function uploadVehicleImage(uid, vid, file, slot) {
  // We use FileReader to convert the image to text, bypassing Firebase Storage limits/errors
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      resolve({ 
        url: reader.result, 
        path: `base64_storage/${slot}` 
      });
    };
    reader.onerror = (error) => reject(error);
  });
}

export async function deleteVehicleImage(path) {
  // No-op since we aren't using the Storage bucket
  return Promise.resolve();
}

export async function setVehicleProfileImage(uid, vid, url, path) {
  await updateVehicle(uid, vid, { profileImage: url, profileImagePath: path })
}

export async function addVehicleGalleryImage(uid, vid, url, path) {
  const v = await getVehicle(uid, vid)
  const gallery = v?.gallery || []
  gallery.push({ url, path, uploadedAt: new Date().toISOString() })
  await updateVehicle(uid, vid, { gallery })
}

export async function removeVehicleGalleryImage(uid, vid, path) {
  const v = await getVehicle(uid, vid)
  const gallery = (v?.gallery || []).filter(g => g.path !== path)
  await updateVehicle(uid, vid, { gallery })
}

// ─── VEHICLE ALERTS (insurance, PUC, challans) ───────────────────────────────
export async function getVehicleAlerts(uid) {
  const vehicles = await getVehicles(uid)
  const alerts = []
  const now = new Date()
  const soon = 30 // days warning threshold

  for (const v of vehicles) {
    // Insurance expiry
    if (v.insuranceExpiry) {
      const exp  = new Date(v.insuranceExpiry)
      const days = Math.round((exp - now) / 86400000)
      if (days <= 0) {
        alerts.push({ vehicleId:v.id, icon:'🛡️', title:`${v.name} — Insurance Expired`, message:`Insurance expired ${Math.abs(days)} day${Math.abs(days)===1?'':'s'} ago. Renew immediately!`, urgent:true })
      } else if (days <= soon) {
        alerts.push({ vehicleId:v.id, icon:'🛡️', title:`${v.name} — Insurance Expiring`, message:`Insurance expires in ${days} day${days===1?'':'s'} on ${v.insuranceExpiry}.`, urgent:days<=7 })
      }
    }
    // PUC expiry
    if (v.pucExpiry) {
      const exp  = new Date(v.pucExpiry)
      const days = Math.round((exp - now) / 86400000)
      if (days <= 0) {
        alerts.push({ vehicleId:v.id, icon:'🏭', title:`${v.name} — PUC Expired`, message:`PUC certificate expired ${Math.abs(days)} day${Math.abs(days)===1?'':'s'} ago.`, urgent:true })
      } else if (days <= 15) {
        alerts.push({ vehicleId:v.id, icon:'🏭', title:`${v.name} — PUC Expiring`, message:`PUC expires in ${days} days on ${v.pucExpiry}.`, urgent:days<=3 })
      }
    }
    // Unpaid challans
    if (v.challans && v.challans.length > 0) {
      const unpaid = v.challans.filter(c => !c.paid)
      if (unpaid.length > 0) {
        const total = unpaid.reduce((s,c) => s+(c.amount||0), 0)
        alerts.push({ vehicleId:v.id, icon:'📋', title:`${v.name} — Unpaid Challans`, message:`${unpaid.length} unpaid challan${unpaid.length===1?'':'s'}${total>0?` totalling ₹${total.toLocaleString('en-IN')}`:''}. Tap to review.`, urgent:true })
      }
    }
    // Fitness expiry
    if (v.fitnessExpiry) {
      const exp  = new Date(v.fitnessExpiry)
      const days = Math.round((exp - now) / 86400000)
      if (days <= 0) {
        alerts.push({ vehicleId:v.id, icon:'🔍', title:`${v.name} — Fitness Expired`, message:`Vehicle fitness certificate has expired.`, urgent:true })
      } else if (days <= 30) {
        alerts.push({ vehicleId:v.id, icon:'🔍', title:`${v.name} — Fitness Expiring`, message:`Fitness certificate expires in ${days} days.`, urgent:days<=7 })
      }
    }
  }
  return alerts
}