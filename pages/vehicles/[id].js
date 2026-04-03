import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { getVehicle, getAnalytics, getSmartInsights, getFuelLogs, getServices, getExpenses, FUEL_PROVIDERS, EXPENSE_TYPES } from '../../lib/db'
import Layout from '../../components/Layout'
import VehicleGallery from '../../components/VehicleGallery'
import { Btn, Badge, StatCard, InsightCard, fmtINR, ChartTooltip, C } from '../../components/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function VehicleDetail() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const { id } = router.query
  const [vehicle, setVehicle]   = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [insights, setInsights]   = useState([])
  const [fuelLogs, setFuelLogs]   = useState([])
  const [services, setServices]   = useState([])
  const [expenses, setExpenses]   = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !id) return
    const [v, a, ins, fl, sv, ex] = await Promise.all([
      getVehicle(user.uid, id),
      getAnalytics(user.uid, id),
      getSmartInsights(user.uid, id),
      getFuelLogs(user.uid, id),
      getServices(user.uid, id),
      getExpenses(user.uid, id),
    ])
    if (!v) { router.replace('/vehicles'); return }
    setVehicle(v); setAnalytics(a); setInsights(ins)
    setFuelLogs([...fl].reverse().slice(0,6))
    setServices(sv.slice(0,5)); setExpenses(ex.slice(0,6))
    setDataLoading(false)
  }, [user, id, router])

  useEffect(() => { load() }, [load])

  if (loading || !user || dataLoading || !vehicle) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg)' }}>
      <div className="animate-pulse" style={{ color:'var(--muted)' }}>Loading…</div>
    </div>
  )

  const fuelColor = { Petrol:'#e8ff47', Diesel:'#ff6b35', Electric:'#4ecdc4', CNG:'#a78bfa' }[vehicle.fuelType]||'var(--accent)'
  const latestService = services[0]
  const nextServiceKm = latestService?.intervalKm ? (latestService.odometer + latestService.intervalKm) - parseFloat(vehicle.odometer||0) : null

  // Days until insurance expires
  const insuranceDays = vehicle.insuranceExpiry
    ? Math.round((new Date(vehicle.insuranceExpiry) - new Date()) / 86400000)
    : null

  return (
    <Layout title={vehicle.name} subtitle={`${vehicle.regNumber} · ${vehicle.fuelType}`}
      actions={
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <Btn size="sm" variant="secondary" onClick={()=>router.push(`/vehicles/${id}/edit`)}>✏️ Edit</Btn>
          <Btn size="sm" onClick={()=>router.push(`/fuel/new?vid=${id}`)}>⛽ Fuel</Btn>
          <Btn size="sm" variant="secondary" onClick={()=>router.push(`/odometer/new?vid=${id}`)}>🛞 Odo</Btn>
          <Btn size="sm" variant="secondary" onClick={()=>router.push(`/services/new?vid=${id}`)}>🔧 Service</Btn>
        </div>
      }
    >
      {/* Hero banner with profile image */}
      {vehicle.profileImage && (
        <div style={{ position:'relative', height:'180px', borderRadius:'var(--radius-xl)', overflow:'hidden', marginBottom:'20px', border:'1px solid var(--border)' }}>
          <img src={vehicle.profileImage} alt={vehicle.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(10,10,12,0.85) 0%, transparent 60%)' }} />
          <div style={{ position:'absolute', bottom:'16px', left:'20px' }}>
            <h2 style={{ fontSize:'22px', fontWeight:800, fontFamily:'var(--font-display)' }}>{vehicle.name}</h2>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)' }}>{vehicle.regNumber} · {vehicle.fuelType}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'20px' }}>
        <StatCard label="Odometer"    value={`${parseFloat(vehicle.odometer||0).toLocaleString('en-IN')} km`} icon="🛞" accent={fuelColor}            delay={0}   />
        <StatCard label="Total Spend" value={fmtINR(analytics.totalExpense)}                                   icon="💰" accent="var(--accent)"         delay={60}  />
        <StatCard label="Avg Mileage" value={analytics.avgMileage?`${analytics.avgMileage} km/L`:'—'}          icon="⚡" accent="#a78bfa"               delay={120} />
        <StatCard label="Cost / km"   value={analytics.costPerKm?`${C}${analytics.costPerKm}`:'—'}             icon="📏" accent="var(--accent2)"        delay={180} />
        <StatCard label="Insurance"
          value={insuranceDays===null?'—':insuranceDays<=0?'Expired':`${insuranceDays}d left`}
          icon="🛡️"
          accent={insuranceDays===null?'var(--muted)':insuranceDays<=0?'var(--danger)':insuranceDays<=30?'var(--warning)':'var(--success)'}
          delay={240}
        />
        <StatCard label="Next Service"
          value={nextServiceKm!==null?(nextServiceKm>0?`${nextServiceKm.toLocaleString('en-IN')} km`:'Overdue'):'—'}
          icon="🔧"
          accent={nextServiceKm!==null&&nextServiceKm<=0?'var(--danger)':nextServiceKm!==null&&nextServiceKm<500?'var(--warning)':'var(--success)'}
          delay={300}
        />
      </div>

      {/* Insurance / Docs card */}
      {(vehicle.insuranceExpiry || vehicle.pucExpiry || vehicle.fitnessExpiry || (vehicle.challans&&vehicle.challans.length>0)) && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px', marginBottom:'14px' }}>
          <h3 style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)', marginBottom:'14px' }}>Documents & Compliance</h3>
          <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px' }}>
            {vehicle.insuranceExpiry && <DocCard label="Insurance" value={vehicle.insuranceExpiry} insurer={vehicle.insurerName} />}
            {vehicle.pucExpiry       && <DocCard label="PUC"       value={vehicle.pucExpiry} />}
            {vehicle.fitnessExpiry   && <DocCard label="Fitness"   value={vehicle.fitnessExpiry} />}
          </div>
          {vehicle.challans?.length>0 && (
            <div style={{ marginTop:'14px' }}>
              <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'8px', fontWeight:600 }}>Challans</div>
              {vehicle.challans.map((c,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:c.paid?'rgba(74,222,128,0.06)':'rgba(248,113,113,0.08)', border:`1px solid ${c.paid?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'}`, borderRadius:'var(--radius-md)', marginBottom:'6px', fontSize:'13px' }}>
                  <div><div style={{ fontWeight:500 }}>📋 {c.violation||c.offence||'Challan'}</div><div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'2px' }}>{c.date||''}</div></div>
                  <div style={{ textAlign:'right' }}><div style={{ fontWeight:700, color:c.paid?'var(--success)':'var(--danger)' }}>₹{(c.amount||0).toLocaleString('en-IN')}</div><div style={{ fontSize:'10px', color:c.paid?'var(--success)':'var(--warning)' }}>{c.paid?'Paid':'Unpaid'}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
        <Card title="Monthly Expenses">
          {!analytics.monthly.length ? <NoDat /> :
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={analytics.monthly} barCategoryGap="40%">
                <XAxis dataKey="month" tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>v.slice(5)} />
                <YAxis tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${C}${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="total" name="Total" fill={fuelColor} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        </Card>
        <Card title="Mileage Trend">
          {!analytics.mileageTrend?.length ? <NoDat text="Log fuel to see trend" /> :
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={analytics.mileageTrend}>
                <XAxis dataKey="date" tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>v.slice(5)} />
                <YAxis tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                <Tooltip content={<ChartTooltip format={v=>`${v} km/L`} />} cursor={{ stroke:'var(--border2)' }} />
                <Line type="monotone" dataKey="mileage" stroke="var(--accent3)" strokeWidth={2} dot={{ r:3, fill:'var(--accent3)' }} />
              </LineChart>
            </ResponsiveContainer>
          }
        </Card>
      </div>

      {/* Insights + Expenses */}
      <div className="two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
        <Card title="Smart Insights">
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {insights.map((ins,i) => <InsightCard key={i} icon={ins.icon} text={ins.text} type={ins.type} delay={i*60} />)}
          </div>
        </Card>
        <Card title="Recent Expenses" action={<Btn size="sm" variant="ghost" onClick={()=>router.push(`/expenses?vid=${id}`)}>All</Btn>}>
          {!expenses.length ? <NoDat /> : expenses.map(e=>{
            const cat=EXPENSE_TYPES.find(c=>c.id===e.type)||EXPENSE_TYPES[EXPENSE_TYPES.length-1]
            return (
              <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                  <span style={{ fontSize:'16px' }}>{cat.emoji}</span>
                  <div><div style={{ fontSize:'13px', fontWeight:500 }}>{cat.label}</div><div style={{ fontSize:'11px', color:'var(--muted)' }}>{e.date}</div></div>
                </div>
                <span style={{ fontSize:'13px', fontWeight:700 }}>{fmtINR(e.cost)}</span>
              </div>
            )
          })}
        </Card>
      </div>

      {/* Fuel + Services */}
      <div className="two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
        <Card title="Recent Fuel Logs" action={<Btn size="sm" variant="ghost" onClick={()=>router.push(`/fuel?vid=${id}`)}>All</Btn>}>
          {!fuelLogs.length ? <NoDat /> : fuelLogs.map(f=>{
            const prov=FUEL_PROVIDERS.find(p=>p.id===f.provider)||FUEL_PROVIDERS[FUEL_PROVIDERS.length-1]
            return (
              <div key={f.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                <div><div style={{ fontSize:'13px', fontWeight:500 }}>{prov.logo} {prov.label}</div><div style={{ fontSize:'11px', color:'var(--muted)' }}>{f.date} · {f.litres}L</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:'13px', fontWeight:700 }}>{fmtINR(f.cost)}</div>{f.mileage&&<div style={{ fontSize:'11px', color:'var(--accent3)' }}>{f.mileage} km/L</div>}</div>
              </div>
            )
          })}
          <Btn size="sm" style={{ marginTop:'12px', width:'100%' }} onClick={()=>router.push(`/fuel/new?vid=${id}`)}>⛽ Log Fuel</Btn>
        </Card>
        <Card title="Service History" action={<Btn size="sm" variant="ghost" onClick={()=>router.push(`/services?vid=${id}`)}>All</Btn>}>
          {!services.length ? <NoDat /> : services.map(s=>(
            <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
              <div><div style={{ fontSize:'13px', fontWeight:500 }}>🔧 {s.serviceType}</div><div style={{ fontSize:'11px', color:'var(--muted)' }}>{s.date} · {parseFloat(s.odometer||0).toLocaleString('en-IN')} km</div></div>
              <span style={{ fontSize:'13px', fontWeight:700 }}>{fmtINR(s.cost)}</span>
            </div>
          ))}
          <Btn size="sm" variant="secondary" style={{ marginTop:'12px', width:'100%' }} onClick={()=>router.push(`/services/new?vid=${id}`)}>+ Log Service</Btn>
        </Card>
      </div>

      {/* Image Gallery */}
      <VehicleGallery uid={user.uid} vehicle={vehicle} onUpdate={load} />
    </Layout>
  )
}

function DocCard({ label, value, insurer }) {
  const days = Math.round((new Date(value) - new Date()) / 86400000)
  const color = days<=0?'var(--danger)':days<=30?'var(--warning)':'var(--success)'
  return (
    <div style={{ background:'var(--bg3)', border:`1px solid ${color}30`, borderRadius:'var(--radius-md)', padding:'12px 14px' }}>
      <div style={{ fontSize:'10px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'6px' }}>{label}</div>
      <div style={{ fontSize:'14px', fontWeight:700, color }}>{value}</div>
      <div style={{ fontSize:'11px', color, marginTop:'3px' }}>{days<=0?`Expired ${Math.abs(days)}d ago`:`${days} days left`}</div>
      {insurer && <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'4px' }}>{insurer}</div>}
    </div>
  )
}
function Card({ title, children, action }) {
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
        <h3 style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}
function NoDat({ text='No entries yet' }) {
  return <div style={{ color:'var(--muted)', fontSize:'13px', textAlign:'center', padding:'24px 0' }}>{text}</div>
}
