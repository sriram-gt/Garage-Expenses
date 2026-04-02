import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { getVehicles, getExpenses, addExpense, deleteExpense, EXPENSE_TYPES } from '../../lib/db'
import Layout from '../../components/Layout'
import { Btn, Badge, Modal, Field, Input, Select, Textarea, fmtINR } from '../../components/ui'

export default function ExpensesPage() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const { vid } = router.query
  const [vehicles, setVehicles]   = useState([])
  const [selVid, setSelVid]       = useState('')
  const [expenses, setExpenses]   = useState([])
  const [filterType, setFilterType] = useState('all')
  const [showAdd, setShowAdd]     = useState(false)
  const [delId, setDelId]         = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [form, setForm] = useState({ type:'fuel', cost:'', date:new Date().toISOString().split('T')[0], notes:'' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    getVehicles(user.uid).then(async vs => {
      setVehicles(vs)
      const init = vid || vs[0]?.id || ''
      setSelVid(init)
      if (init) setExpenses(await getExpenses(user.uid, init))
      setDataLoading(false)
    })
  }, [user, vid])

  async function changeVehicle(id) {
    setSelVid(id); setDataLoading(true)
    setExpenses(await getExpenses(user.uid, id))
    setDataLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault(); setBusy(true)
    await addExpense(user.uid, selVid, form)
    setExpenses(await getExpenses(user.uid, selVid))
    setShowAdd(false); setBusy(false)
    setForm({ type:'fuel', cost:'', date:new Date().toISOString().split('T')[0], notes:'' })
  }

  async function handleDelete(id) {
    await deleteExpense(user.uid, id)
    setExpenses(ex => ex.filter(e => e.id !== id))
    setDelId(null)
  }

  if (loading || !user) return null

  const filtered = filterType==='all' ? expenses : expenses.filter(e=>e.type===filterType)
  const total    = filtered.reduce((s,e)=>s+e.cost, 0)

  return (
    <Layout title="Expenses" subtitle={vehicles.find(v=>v.id===selVid)?.name||''}
      actions={
        <div style={{ display:'flex', gap:'8px' }}>
          {vehicles.length>0 && (
            <select value={selVid} onChange={e=>changeVehicle(e.target.value)} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-md)', padding:'8px 14px', color:'var(--text)', fontSize:'13px', cursor:'pointer' }}>
              {vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <Btn onClick={()=>setShowAdd(true)}>+ Add Expense</Btn>
        </div>
      }
    >
      {/* Filter chips */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' }}>
        {[{id:'all',label:'All',emoji:'📋',color:'var(--accent)'},...EXPENSE_TYPES].map(t=>(
          <button key={t.id} onClick={()=>setFilterType(t.id)} style={{
            padding:'6px 14px', borderRadius:'100px', fontSize:'12px', fontWeight:600,
            cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
            border:`1px solid ${filterType===t.id?(t.color||'var(--accent)'):'var(--border)'}`,
            background: filterType===t.id?`${t.color||'var(--accent)'}18`:'var(--bg2)',
            color: filterType===t.id?(t.color||'var(--accent)'):'var(--muted)',
          }}>
            {t.emoji||''} {t.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'12px 20px', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'13px' }}>
        <span style={{ color:'var(--muted)' }}>{filtered.length} entries</span>
        <span style={{ fontWeight:700, fontSize:'16px' }}>Total: <span style={{ color:'var(--accent)' }}>{fmtINR(total)}</span></span>
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        {dataLoading
          ? <div style={{ textAlign:'center', padding:'60px', color:'var(--muted)' }}>Loading…</div>
          : filtered.length===0
          ? <div style={{ textAlign:'center', padding:'60px', color:'var(--muted)', fontSize:'14px' }}>No expenses. <button onClick={()=>setShowAdd(true)} style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontFamily:'inherit', fontSize:'14px' }}>Add one →</button></div>
          : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Category','Notes','Date','Amount',''].map(h=>(
                    <th key={h} style={{ padding:'12px 18px', textAlign:'left', color:'var(--muted)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.7px', fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e,i)=>{
                  const cat = EXPENSE_TYPES.find(c=>c.id===e.type)||EXPENSE_TYPES[EXPENSE_TYPES.length-1]
                  return (
                    <tr key={e.id} style={{ borderBottom:i<filtered.length-1?'1px solid var(--border)':'none' }}
                      onMouseEnter={el=>el.currentTarget.style.background='var(--bg3)'}
                      onMouseLeave={el=>el.currentTarget.style.background='transparent'}
                    >
                      <td style={{ padding:'12px 18px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ width:'28px', height:'28px', background:`${cat.color}20`, borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 }}>{cat.emoji}</span>
                          <span style={{ fontSize:'12px' }}>{cat.label}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 18px', color:'var(--text2)', maxWidth:'220px' }}><div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.notes||'—'}</div></td>
                      <td style={{ padding:'12px 18px', color:'var(--muted)', whiteSpace:'nowrap' }}>{e.date}</td>
                      <td style={{ padding:'12px 18px', fontWeight:700, whiteSpace:'nowrap' }}>{fmtINR(e.cost)}</td>
                      <td style={{ padding:'12px 18px' }}>
                        <button onClick={()=>setDelId(e.id)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'14px' }}
                          onMouseEnter={el=>el.currentTarget.style.color='var(--danger)'}
                          onMouseLeave={el=>el.currentTarget.style.color='var(--muted)'}
                        >🗑️</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        }
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add Expense" onClose={()=>setShowAdd(false)}>
          <form onSubmit={handleAdd}>
            <Field label="Category" required>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'8px', marginBottom:'4px' }}>
                {EXPENSE_TYPES.map(t=>(
                  <button key={t.id} type="button" onClick={()=>setForm(f=>({...f,type:t.id}))} style={{
                    padding:'10px 6px', borderRadius:'10px', border:`2px solid ${form.type===t.id?t.color:'var(--border)'}`,
                    background:form.type===t.id?`${t.color}15`:'var(--bg3)', cursor:'pointer', fontSize:'12px',
                    color:form.type===t.id?t.color:'var(--muted)', fontFamily:'inherit', fontWeight:form.type===t.id?600:400, textAlign:'center',
                  }}>
                    <div style={{ fontSize:'18px', marginBottom:'3px' }}>{t.emoji}</div>{t.label}
                  </button>
                ))}
              </div>
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
              <Field label="Amount (₹)" required><Input type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} placeholder="e.g. 2500" required /></Field>
              <Field label="Date" required><Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required /></Field>
            </div>
            <Field label="Notes"><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional description…" rows={2} /></Field>
            <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
              <Btn type="button" variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
              <Btn type="submit" disabled={busy} style={{ flex:1 }}>{busy?'Saving…':'Save Expense →'}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {delId && (
        <Modal title="Delete Expense?" onClose={()=>setDelId(null)} width="360px">
          <p style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'22px' }}>This cannot be undone.</p>
          <div style={{ display:'flex', gap:'10px' }}>
            <Btn variant="ghost" onClick={()=>setDelId(null)} style={{ flex:1 }}>Cancel</Btn>
            <Btn variant="danger" onClick={()=>handleDelete(delId)} style={{ flex:1 }}>Delete</Btn>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
