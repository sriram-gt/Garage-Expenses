import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { getVehicles, getAnalytics, getSmartInsights, EXPENSE_TYPES } from '../../lib/db'
import Layout from '../../components/Layout'
import { StatCard, InsightCard, SectionTitle, fmtINR, fmtKm, ChartTooltip, C } from '../../components/ui'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts'

export default function AnalyticsPage() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const [vehicles, setVehicles]     = useState([])
  const [selVid, setSelVid]         = useState('')
  const [analytics, setAnalytics]   = useState(null)
  const [insights, setInsights]     = useState([])
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getVehicles(user.uid).then(async vs => {
      setVehicles(vs)
      if (vs.length>0) {
        const vid = vs[0].id
        setSelVid(vid)
        const [a, ins] = await Promise.all([getAnalytics(user.uid, vid), getSmartInsights(user.uid, vid)])
        setAnalytics(a); setInsights(ins)
      }
      setDataLoading(false)
    })
  }, [user])

  async function applyFilters(vid, from, to) {
    setDataLoading(true)
    const [a, ins] = await Promise.all([
      getAnalytics(user.uid, vid||selVid, { from:from||undefined, to:to||undefined }),
      getSmartInsights(user.uid, vid||selVid),
    ])
    setAnalytics(a); setInsights(ins)
    setDataLoading(false)
  }

  function handleVehicleChange(vid) {
    setSelVid(vid)
    applyFilters(vid, dateFrom, dateTo)
  }

  if (loading || !user) return null

  const vehicle = vehicles.find(v=>v.id===selVid)

  return (
    <Layout title="Analytics" subtitle={vehicle?.name||''}
      actions={
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          {vehicles.length>0 && (
            <select value={selVid} onChange={e=>handleVehicleChange(e.target.value)} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-md)', padding:'8px 12px', color:'var(--text)', fontSize:'13px', cursor:'pointer' }}>
              {vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);applyFilters(selVid,e.target.value,dateTo)}} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-md)', padding:'8px 12px', color:'var(--text)', fontSize:'13px' }} />
          <span style={{ color:'var(--muted)', fontSize:'12px' }}>to</span>
          <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);applyFilters(selVid,dateFrom,e.target.value)}} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-md)', padding:'8px 12px', color:'var(--text)', fontSize:'13px' }} />
          {(dateFrom||dateTo) && (
            <button onClick={()=>{setDateFrom('');setDateTo('');applyFilters(selVid,'','')}} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }}>✕ Clear</button>
          )}
        </div>
      }
    >
      {dataLoading || !analytics ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'300px' }}>
          <div className="animate-pulse" style={{ color:'var(--muted)' }}>Loading analytics…</div>
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(155px, 1fr))', gap:'12px', marginBottom:'20px' }}>
            <StatCard label="Total Spend"    value={fmtINR(analytics.totalExpense)}                                     icon="💰" accent="var(--accent)"  delay={0}   />
            <StatCard label="Distance"       value={analytics.totalKm?fmtKm(analytics.totalKm):'—'}                     icon="🗺️" accent="var(--accent3)" delay={60}  />
            <StatCard label="Cost / km"      value={analytics.costPerKm?`${C}${analytics.costPerKm}`:'—'}               icon="📏" accent="var(--accent2)" delay={120} />
            <StatCard label="Avg Mileage"    value={analytics.avgMileage?`${analytics.avgMileage} km/L`:'—'}            icon="⚡" accent="#a78bfa"         delay={180} />
            <StatCard label="Avg Daily km"   value={analytics.avgDailyKm?`${analytics.avgDailyKm} km`:'—'}             icon="📅" accent="var(--success)"  delay={240} />
            <StatCard label="Fuel Entries"   value={analytics.fuelCount}                                                 icon="⛽" accent="var(--warning)"  delay={300} />
          </div>

          {/* Monthly area chart */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'22px', marginBottom:'14px' }}>
            <SectionTitle>Monthly Expense Breakdown</SectionTitle>
            {!analytics.monthly.length ? <NoData /> :
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={analytics.monthly}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#e8ff47" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e8ff47" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill:'var(--muted)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>v.slice(5)} />
                  <YAxis tick={{ fill:'var(--muted)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`${C}${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke:'var(--border2)' }} />
                  <Area type="monotone" dataKey="total" name="Total" stroke="var(--accent)" fill="url(#areaGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            }
          </div>

          {/* By-category + mileage trend side by side */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'22px' }}>
              <SectionTitle>Expense by Category</SectionTitle>
              {!analytics.byCategory.length ? <NoData /> :
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={analytics.byCategory} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={75} innerRadius={38}>
                        {analytics.byCategory.map(e=><Cell key={e.id} fill={e.color} />)}
                      </Pie>
                      <Legend formatter={v=><span style={{ color:'var(--text2)', fontSize:'11px' }}>{v}</span>} />
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Category rows */}
                  <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                    {analytics.byCategory.sort((a,b)=>b.total-a.total).map(cat=>{
                      const pct = analytics.totalExpense>0?(cat.total/analytics.totalExpense*100).toFixed(1):0
                      return (
                        <div key={cat.id}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'12px' }}>
                            <span>{cat.emoji} {cat.label}</span>
                            <span style={{ fontWeight:600 }}>{fmtINR(cat.total)} <span style={{ color:'var(--muted)' }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height:'4px', background:'var(--bg3)', borderRadius:'2px' }}>
                            <div style={{ width:`${pct}%`, height:'100%', background:cat.color, borderRadius:'2px' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              }
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              {/* Mileage trend */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'22px', flex:1 }}>
                <SectionTitle>Mileage Trend (km/L)</SectionTitle>
                {!analytics.mileageTrend?.length ? <NoData text="Log fuel entries first" /> :
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={analytics.mileageTrend}>
                      <XAxis dataKey="date" tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>v.slice(5)} />
                      <YAxis tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                      <Tooltip content={<ChartTooltip format={v=>`${v} km/L`} />} cursor={{ stroke:'var(--border2)' }} />
                      <Line type="monotone" dataKey="mileage" stroke="var(--accent3)" strokeWidth={2} dot={{ r:3, fill:'var(--accent3)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                }
              </div>

              {/* Provider comparison */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'22px', flex:1 }}>
                <SectionTitle>Provider Mileage Comparison</SectionTitle>
                {!analytics.byProvider?.length ? <NoData text="No fuel data yet" /> :
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'4px' }}>
                    {[...analytics.byProvider].sort((a,b)=>b.avgMileage-a.avgMileage).map((p,i)=>(
                      <div key={p.id}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'4px' }}>
                          <span style={{ color:'var(--text)' }}>{p.label}</span>
                          <div style={{ display:'flex', gap:'12px' }}>
                            <span style={{ color:p.color, fontWeight:700 }}>{p.avgMileage} km/L</span>
                            <span style={{ color:'var(--muted)' }}>{fmtINR(p.totalCost)}</span>
                          </div>
                        </div>
                        <div style={{ height:'5px', background:'var(--bg3)', borderRadius:'3px' }}>
                          <div style={{ width:`${Math.min(100,(p.avgMileage/(analytics.byProvider[0]?.avgMileage||1))*100)}%`, height:'100%', background:p.color, borderRadius:'3px' }} />
                        </div>
                        {i===0 && analytics.byProvider.length>1 && (
                          <div style={{ fontSize:'10px', color:'var(--success)', marginTop:'3px' }}>⭐ Best mileage</div>
                        )}
                      </div>
                    ))}
                  </div>
                }
              </div>
            </div>
          </div>

          {/* Smart Insights */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'22px' }}>
            <SectionTitle>Smart Insights</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'10px' }}>
              {insights.map((ins,i) => <InsightCard key={i} icon={ins.icon} text={ins.text} type={ins.type} delay={i*60} />)}
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}

function NoData({ text='No data yet' }) {
  return <div style={{ color:'var(--muted)', textAlign:'center', padding:'40px 0', fontSize:'13px' }}>{text}</div>
}
