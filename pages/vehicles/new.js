import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { addVehicle, uploadVehicleImage, FUEL_TYPES } from '../../lib/db'
import Layout from '../../components/Layout'
import { Btn, Field, Input, Select, Textarea } from '../../components/ui'

const STEPS = ['Vehicle Info', 'Insurance & Docs', 'Photos']

export default function NewVehicle() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const fileRef = useRef(null)

  const [step, setStep]   = useState(0)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupDone, setLookupDone]       = useState(false)
  const [dragOver, setDragOver]           = useState(false)

  const [form, setForm] = useState({
    name:'', regNumber:'', fuelType:'Petrol', purchaseDate:'', odometer:'', notes:'',
    // insurance / docs
    insuranceExpiry:'', insurerName:'', pucExpiry:'', fitnessExpiry:'',
    // challans
    challans:[],
    // image
    profileImageFile: null, profileImagePreview: null,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-lookup when reg number blurs (and has a value)
  async function handleRegLookup() {
    const reg = form.regNumber.trim()
    if (!reg || reg.length < 6 || lookupDone) return
    setLookupLoading(true)
    try {
      const res  = await fetch('/api/vehicle-lookup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ regNumber: reg }) })
      const data = await res.json()
      if (data.success) {
        setForm(f => ({
          ...f,
          name:            f.name || [data.maker, data.model].filter(Boolean).join(' '),
          fuelType:        mapFuelType(data.fuelType) || f.fuelType,
          insuranceExpiry: data.insuranceExpiry || f.insuranceExpiry,
          insurerName:     data.insurerName     || f.insurerName,
          pucExpiry:       data.pucExpiry       || f.pucExpiry,
          fitnessExpiry:   data.fitnessExpiry   || f.fitnessExpiry,
          challans:        data.challans?.length ? data.challans : f.challans,
        }))
        setLookupDone(true)
      }
    } catch {}
    setLookupLoading(false)
  }

  function mapFuelType(ft) {
    if (!ft) return ''
    const s = ft.toLowerCase()
    if (s.includes('petrol') || s.includes('electric')) return s.charAt(0).toUpperCase()+s.slice(1)
    if (s.includes('diesel')) return 'Diesel'
    if (s.includes('cng'))    return 'CNG'
    return ''
  }

  function handleImageDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    set('profileImageFile', file)
    set('profileImagePreview', URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!form.name.trim())      return setError('Vehicle name is required.')
    if (!form.regNumber.trim()) return setError('Registration number is required.')
    setBusy(true); setError('')
    try {
      const vid = await addVehicle(user.uid, {
        name:form.name, regNumber:form.regNumber, fuelType:form.fuelType,
        purchaseDate:form.purchaseDate, odometer:form.odometer, notes:form.notes,
        insuranceExpiry:form.insuranceExpiry, insurerName:form.insurerName,
        pucExpiry:form.pucExpiry, fitnessExpiry:form.fitnessExpiry,
        challans:form.challans,
      })
      // Upload profile image if picked
      if (form.profileImageFile) {
        const { url, path } = await uploadVehicleImage(user.uid, vid, form.profileImageFile, 'profile')
        const { updateVehicle } = await import('../../lib/db')
        await updateVehicle(user.uid, vid, { profileImage:url, profileImagePath:path })
      }
      router.push(`/vehicles/${vid}`)
    } catch (err) {
      setError('Failed to save. Please try again.')
      setBusy(false)
    }
  }

  if (loading || !user) return null

  const inputStyle = { width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'10px 14px', color:'var(--text)', fontSize:'14px', outline:'none', transition:'border-color 0.2s', fontFamily:'inherit' }
  const fo = e => e.target.style.borderColor='var(--accent)'
  const fb = e => e.target.style.borderColor='var(--border)'

  return (
    <Layout title="Add Vehicle" subtitle="Register a new vehicle">
      <div style={{ maxWidth:'600px' }}>

        {/* Step indicator */}
        <div style={{ display:'flex', gap:'0', marginBottom:'28px' }}>
          {STEPS.map((s,i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
              <div style={{ display:'flex', alignItems:'center', width:'100%' }}>
                {i>0 && <div style={{ flex:1, height:'2px', background:i<=step?'var(--accent)':'var(--border)' }} />}
                <div style={{
                  width:'28px', height:'28px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'12px', fontWeight:700, flexShrink:0,
                  background:i<step?'var(--accent)':i===step?'var(--accent)':'var(--bg3)',
                  color:i<=step?'#0a0a0c':'var(--muted)',
                  border:i===step?'none':`1px solid ${i<step?'var(--accent)':'var(--border)'}`,
                }}>
                  {i<step ? '✓' : i+1}
                </div>
                {i<STEPS.length-1 && <div style={{ flex:1, height:'2px', background:i<step?'var(--accent)':'var(--border)' }} />}
              </div>
              <span style={{ fontSize:'11px', color:i===step?'var(--accent)':'var(--muted)', fontWeight:i===step?600:400 }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'28px' }}>
          {error && <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'var(--radius-md)', padding:'12px 16px', color:'var(--danger)', fontSize:'13px', marginBottom:'20px' }}>{error}</div>}

          {/* ── STEP 0: Basic Info ───────────────────────────── */}
          {step===0 && (
            <div>
              <Field label="Registration Number" required hint="We'll auto-fetch insurance & PUC details">
                <div style={{ display:'flex', gap:'8px' }}>
                  <input style={{ ...inputStyle, flex:1, textTransform:'uppercase' }}
                    value={form.regNumber}
                    onChange={e=>set('regNumber', e.target.value.toUpperCase())}
                    onBlur={handleRegLookup}
                    onFocus={fo} placeholder="TN09AB1234" />
                  <button onClick={handleRegLookup} disabled={lookupLoading} style={{
                    padding:'10px 14px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)',
                    background:lookupLoading?'var(--bg3)':'var(--accent)', color:lookupLoading?'var(--muted)':'#0a0a0c',
                    cursor:lookupLoading?'wait':'pointer', fontSize:'12px', fontWeight:700, whiteSpace:'nowrap',
                  }}>
                    {lookupLoading ? '🔍 Fetching…' : lookupDone ? '✓ Fetched' : '🔍 Lookup'}
                  </button>
                </div>
                {lookupDone && <p style={{ fontSize:'11px', color:'var(--success)', marginTop:'5px' }}>✓ Vehicle details fetched from Carinfo</p>}
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <div style={{ gridColumn:'1 / -1' }}>
                  <Field label="Vehicle Name" required>
                    <input style={inputStyle} onFocus={fo} onBlur={fb} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Honda City 2020" />
                  </Field>
                </div>
                <Field label="Fuel Type">
                  <select style={{ ...inputStyle, cursor:'pointer' }} onFocus={fo} onBlur={fb} value={form.fuelType} onChange={e=>set('fuelType',e.target.value)}>
                    {FUEL_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Purchase Date">
                  <input type="date" style={inputStyle} onFocus={fo} onBlur={fb} value={form.purchaseDate} onChange={e=>set('purchaseDate',e.target.value)} />
                </Field>
                <Field label="Current Odometer (km)" hint="Starting reading">
                  <input type="number" min="0" style={inputStyle} onFocus={fo} onBlur={fb} value={form.odometer} onChange={e=>set('odometer',e.target.value)} placeholder="e.g. 15000" />
                </Field>
                <Field label="Notes">
                  <textarea style={{ ...inputStyle, resize:'vertical', minHeight:'60px' }} onFocus={fo} onBlur={fb} value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} />
                </Field>
              </div>

              <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
                <Btn variant="ghost" onClick={()=>router.back()} type="button">Cancel</Btn>
                <Btn style={{ flex:1 }} onClick={()=>{ if(!form.name.trim()||!form.regNumber.trim()) return setError('Name and registration number are required.'); setError(''); setStep(1) }}>Next: Insurance →</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 1: Insurance & Docs ─────────────────────── */}
          {step===1 && (
            <div>
              <p style={{ fontSize:'13px', color:'var(--text2)', marginBottom:'20px', lineHeight:1.6 }}>
                {lookupDone ? '✅ Details pre-filled from Carinfo. Review and correct if needed.' : 'Enter your insurance and document details for expiry alerts.'}
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <Field label="Insurance Expiry Date">
                  <input type="date" style={inputStyle} onFocus={fo} onBlur={fb} value={form.insuranceExpiry} onChange={e=>set('insuranceExpiry',e.target.value)} />
                </Field>
                <Field label="Insurer Name">
                  <input style={inputStyle} onFocus={fo} onBlur={fb} value={form.insurerName} onChange={e=>set('insurerName',e.target.value)} placeholder="e.g. New India Assurance" />
                </Field>
                <Field label="PUC Expiry Date">
                  <input type="date" style={inputStyle} onFocus={fo} onBlur={fb} value={form.pucExpiry} onChange={e=>set('pucExpiry',e.target.value)} />
                </Field>
                <Field label="Fitness Certificate Expiry">
                  <input type="date" style={inputStyle} onFocus={fo} onBlur={fb} value={form.fitnessExpiry} onChange={e=>set('fitnessExpiry',e.target.value)} />
                </Field>
              </div>

              {/* Challans section */}
              <div style={{ marginTop:'8px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'10px' }}>
                  Challans {form.challans.length>0 && <span style={{ color:'var(--danger)' }}>({form.challans.length} found)</span>}
                </div>
                {form.challans.length===0 ? (
                  <div style={{ fontSize:'13px', color:'var(--muted)', padding:'12px', background:'var(--bg3)', borderRadius:'var(--radius-md)', textAlign:'center' }}>
                    No challans found {lookupDone ? 'in Carinfo' : '— lookup your vehicle to check automatically'}
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {form.challans.map((c,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'var(--radius-md)', fontSize:'13px' }}>
                        <div>
                          <div style={{ fontWeight:600 }}>📋 {c.violation||c.offence||'Challan'}</div>
                          <div style={{ fontSize:'11px', color:'var(--text2)', marginTop:'2px' }}>{c.date||''} · {c.location||''}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontWeight:700, color:'var(--danger)' }}>₹{(c.amount||0).toLocaleString('en-IN')}</div>
                          <div style={{ fontSize:'10px', color:c.paid?'var(--success)':'var(--warning)' }}>{c.paid?'Paid':'Unpaid'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
                <Btn variant="ghost" onClick={()=>setStep(0)}>← Back</Btn>
                <Btn style={{ flex:1 }} onClick={()=>setStep(2)}>Next: Photos →</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 2: Photos ───────────────────────────────── */}
          {step===2 && (
            <div>
              <p style={{ fontSize:'13px', color:'var(--text2)', marginBottom:'20px' }}>Upload a profile photo for your vehicle (optional).</p>

              {/* Profile image upload zone */}
              <div
                className={`upload-zone${dragOver?' drag-over':''}`}
                onClick={()=>fileRef.current?.click()}
                onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={handleImageDrop}
                style={{ marginBottom:'20px' }}
              >
                {form.profileImagePreview ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
                    <img src={form.profileImagePreview} alt="Preview" style={{ width:'140px', height:'100px', objectFit:'cover', borderRadius:'var(--radius-md)', border:'2px solid var(--accent)' }} />
                    <p style={{ fontSize:'12px', color:'var(--success)' }}>✓ Profile photo selected — tap to change</p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:'36px', marginBottom:'10px' }}>📸</div>
                    <p style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'4px' }}>Drag & drop or tap to choose</p>
                    <p style={{ color:'var(--muted)', fontSize:'12px' }}>JPG, PNG, WEBP · Profile picture for your vehicle</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageDrop} />
              </div>

              {form.profileImagePreview && (
                <button onClick={()=>{set('profileImageFile',null);set('profileImagePreview',null)}} style={{
                  display:'block', margin:'0 auto 20px', background:'none', border:'none',
                  color:'var(--muted)', fontSize:'12px', cursor:'pointer',
                }}>✕ Remove photo</button>
              )}

              <div style={{ display:'flex', gap:'10px' }}>
                <Btn variant="ghost" onClick={()=>setStep(1)}>← Back</Btn>
                <Btn style={{ flex:1 }} onClick={handleSubmit} disabled={busy}>
                  {busy ? 'Saving…' : '✓ Save Vehicle'}
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
