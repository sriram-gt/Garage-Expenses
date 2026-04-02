import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { getVehicles, getAnalytics, getSmartInsights, EXPENSE_TYPES } from '../lib/db'
import Layout from '../components/Layout'
import { StatCard, InsightCard, SectionTitle, Btn, fmtINR, fmtKm, ChartTooltip, C } from '../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'

export default function Dashboard() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const [vehicles, setVehicles] = useState([])
  const [selVid, setSelVid] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [insights, setInsights] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setDataLoading(true)
    getVehicles(user.uid).then(async vs => {
      setVehicles(vs)
      if (vs.length > 0) {
        const vid = vs[0].id
        setSelVid(vid)
        const [a, ins] = await Promise.all([getAnalytics(user.uid, vid), getSmartInsights(user.uid, vid)])
        setAnalytics(a)
        setInsights(ins)
      } else {
        setAnalytics({ totalExpense:0, totalKm:0, costPerKm:0, avgMileage:0, avgDailyKm:0, monthly:[], byCategory:[], mileageTrend:[], byProvider:[], fuelCount:0 })
        setInsights([{ type:'info', icon:'🚗', text:'Add your first vehicle to start tracking expenses.' }])
      }
      setDataLoading(false)
    }).catch(() => setDataLoading(false))
  }, [user])

  async function handleVehicleChange(vid) {
    setSelVid(vid)
    setDataLoading(true)
    if (vid === 'all') {
      setAnalytics({ totalExpense:0, totalKm:0, costPerKm:0, avgMileage:0, avgDailyKm:0, monthly:[], byCategory:[], mileageTrend:[], byProvider:[], fuelCount:0 })
      setInsights([])
    } else {
      const [a, ins] = await Promise.all([getAnalytics(user.uid, vid), getSmartInsights(user.uid, vid)])
      setAnalytics(a); setInsights(ins)
    }
    setDataLoading(false)
  }

  if (loading || !user) return <LoadingScreen />

  const vehicle = vehicles.find(v => v.id === selVid)
  const firstName = user.displayName?.split(' ')[0] || 'there'

  return (
    <Layout
      title={`Hello, ${firstName} 👋`}
      subtitle={vehicle ? `${vehicle.name} · ${vehicle.regNumber}` : 'All Vehicles'}
      actions={
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          {vehicles.length > 0 && (
            <select value={selVid||''} onChange={e => handleVehicleChange(e.target.value)} style={{
              background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-md)',
              padding:'8px 14px', color:'var(--text)', fontSize:'13px', cursor:'pointer',
            }}>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <Btn onClick={() => router.push('/fuel/new')} size="sm">⛽ Add Fuel</Btn>
          <Btn onClick={() => router.push('/expenses/new')} size="sm" variant="secondary">+ Expense</Btn>
        </div>
      }
    >
      {dataLoading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'300px' }}>
          <div className="animate-pulse" style={{ color:'var(--muted)', fontSize:'14px' }}>Loading data…</div>
        </div>
      ) : !analytics ? null : (
        <>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(155px, 1fr))', gap:'12px', marginBottom:'20px' }}>
            <StatCard label="Total Spend"    value={fmtINR(analytics.totalExpense)}                                      icon="💰" accent="var(--accent)"  delay={0}   />
            <StatCard label="Distance"       value={analytics.totalKm ? fmtKm(analytics.totalKm) : '—'}                 icon="🗺️" accent="var(--accent3)" delay={60}  />
            <StatCard label="Cost / km"      value={analytics.costPerKm ? `${C}${analytics.costPerKm}` : '—'}           icon="📏" accent="var(--accent2)" delay={120} />
            <StatCard label="Avg Mileage"    value={analytics.avgMileage ? `${analytics.avgMileage} km/L` : '—'}        icon="⚡" accent="#a78bfa"         delay={180} />
            <StatCard label="Avg Daily km"   value={analytics.avgDailyKm ? `${analytics.avgDailyKm} km` : '—'}         icon="📅" accent="var(--success)"  delay={240} />
            <StatCard label="Fuel Entries"   value={analytics.fuelCount}                                                 icon="⛽" accent="var(--warning)"  delay={300} />
          </div>

          {/* Charts row 1 */}
          <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:'14px', marginBottom:'14px' }}>
            <ChartCard title="Monthly Expenses">
              {!analytics.monthly.length ? <NoData /> :
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.monthly} barCategoryGap="38%">
                    <XAxis dataKey="month" tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>v.slice(5)} />
                    <YAxis tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${C}${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="total" name="Total" fill="var(--accent)" radius={[5,5,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              }
            </ChartCard>
            <ChartCard title="By Category">
              {!analytics.byCategory.length ? <NoData /> :
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={analytics.byCategory} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                      {analytics.byCategory.map(e => <Cell key={e.id} fill={e.color} />)}
                    </Pie>
                    <Legend formatter={v => <span style={{ color:'var(--text2)', fontSize:'11px' }}>{v}</span>} />
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              }
            </ChartCard>
          </div>

          {/* Charts row 2 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
            <ChartCard title="Mileage Trend (km/L)">
              {!analytics.mileageTrend?.length ? <NoData text="Log fuel entries to see trend" /> :
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={analytics.mileageTrend}>
                    <XAxis dataKey="date" tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>v.slice(5)} />
                    <YAxis tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                    <Tooltip content={<ChartTooltip format={v=>`${v} km/L`} />} cursor={{ stroke:'var(--border2)' }} />
                    <Line type="monotone" dataKey="mileage" name="Mileage" stroke="var(--accent3)" strokeWidth={2} dot={{ r:3, fill:'var(--accent3)' }} />
                  </LineChart>
                </ResponsiveContainer>
              }
            </ChartCard>
            <ChartCard title="Fuel Provider Mileage">
              {!analytics.byProvider?.length ? <NoData text="No fuel log data yet" /> :
                <div style={{ marginTop:'10px', display:'flex', flexDirection:'column', gap:'12px' }}>
                  {[...analytics.byProvider].sort((a,b)=>b.avgMileage-a.avgMileage).map(p => (
                    <div key={p.id}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                        <span style={{ fontSize:'13px' }}>{p.label}</span>
                        <span style={{ fontSize:'13px', fontWeight:600, color:p.color }}>{p.avgMileage} km/L</span>
                      </div>
                      <div style={{ height:'5px', background:'var(--bg3)', borderRadius:'3px' }}>
                        <div style={{ width:`${Math.min(100,(p.avgMileage/(analytics.byProvider[0]?.avgMileage||1))*100)}%`, height:'100%', background:p.color, borderRadius:'3px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              }
            </ChartCard>
          </div>

          {/* Insights */}
          <ChartCard title="Smart Insights" style={{ marginBottom:'14px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'10px' }}>
              {insights.map((ins,i) => <InsightCard key={i} icon={ins.icon} text={ins.text} type={ins.type} delay={i*60} />)}
            </div>
          </ChartCard>

          {/* Vehicles */}
          <ChartCard title="My Vehicles" action={<Btn size="sm" variant="ghost" onClick={()=>router.push('/vehicles')}>Manage →</Btn>}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'12px', marginTop:'4px' }}>
              {vehicles.map(v => {
                return (
                  <button key={v.id} onClick={()=>router.push(`/vehicles/${v.id}`)} style={{
                    display:'flex', gap:'14px', alignItems:'center', padding:'14px',
                    borderRadius:'var(--radius-md)', border:'1px solid var(--border)',
                    background:'var(--bg3)', cursor:'pointer', textAlign:'left', transition:'border-color 0.15s',
                  }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
                  >
                    <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:'var(--bg4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
                      {v.fuelType==='Electric'?'⚡':'🚗'}
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'13px' }}>{v.name}</div>
                      <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'2px' }}>{v.regNumber} · {v.fuelType}</div>
                      <div style={{ fontSize:'12px', color:'var(--text2)', marginTop:'4px' }}>{parseFloat(v.odometer||0).toLocaleString('en-IN')} km</div>
                    </div>
                  </button>
                )
              })}
              <button onClick={()=>router.push('/vehicles/new')} style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                padding:'14px', borderRadius:'var(--radius-md)', border:'1px dashed var(--border2)',
                background:'transparent', cursor:'pointer', color:'var(--muted)', fontSize:'13px', transition:'all 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='var(--accent)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--muted)'}}
              >＋ Add New Vehicle</button>
            </div>
          </ChartCard>
        </>
      )}
    </Layout>
  )
}

function ChartCard({ title, children, action, style: extra={} }) {
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px', ...extra }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
        <h3 style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}
function NoData({ text='No data yet' }) {
  return <div style={{ color:'var(--muted)', textAlign:'center', padding:'40px 0', fontSize:'13px' }}>{text}</div>
}
function LoadingScreen() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg)' }}>
      <div className="animate-pulse" style={{ color:'var(--muted)', fontSize:'14px' }}>Loading…</div>
    </div>
  )
}
