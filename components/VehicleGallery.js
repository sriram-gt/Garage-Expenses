// components/VehicleGallery.js
import { useRef, useState } from 'react'
import {
  uploadVehicleImage, setVehicleProfileImage,
  addVehicleGalleryImage, removeVehicleGalleryImage,
} from '../lib/db'

export default function VehicleGallery({ uid, vehicle, onUpdate }) {
  const profileRef = useRef(null)
  const galleryRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting]  = useState(null)

  async function handleProfileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const slot = `profile_${Date.now()}`
      const { url, path } = await uploadVehicleImage(uid, vehicle.id, file, slot)
      await setVehicleProfileImage(uid, vehicle.id, url, path)
      onUpdate && onUpdate()
    } finally { setUploading(false) }
  }

  async function handleGalleryUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const slot = `gallery_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
        const { url, path } = await uploadVehicleImage(uid, vehicle.id, file, slot)
        await addVehicleGalleryImage(uid, vehicle.id, url, path)
      }
      onUpdate && onUpdate()
    } finally { setUploading(false) }
  }

  async function handleRemoveGallery(path) {
    setDeleting(path)
    await removeVehicleGalleryImage(uid, vehicle.id, path)
    onUpdate && onUpdate()
    setDeleting(null)
  }

  const gallery = vehicle.gallery || []
  const fuelColor = { Petrol:'#e8ff47', Diesel:'#ff6b35', Electric:'#4ecdc4', CNG:'#a78bfa' }[vehicle.fuelType] || '#888'

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)' }}>
          📸 Vehicle Photos
        </h3>
        {uploading && <span style={{ fontSize:'12px', color:'var(--accent)', animation:'pulse 1s infinite' }}>Uploading…</span>}
      </div>

      <div style={{ padding:'20px' }}>
        {/* Profile image */}
        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px', fontWeight:600 }}>Profile Photo</div>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            {/* Preview */}
            <div style={{
              width:'96px', height:'72px', borderRadius:'var(--radius-md)', overflow:'hidden', flexShrink:0,
              background:`linear-gradient(135deg, ${fuelColor}20, var(--bg3))`,
              border:`2px solid ${vehicle.profileImage ? 'var(--accent)' : 'var(--border)'}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px',
            }}>
              {vehicle.profileImage
                ? <img src={vehicle.profileImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : (vehicle.fuelType==='Electric' ? '⚡' : '🚗')
              }
            </div>
            <div>
              <button onClick={()=>profileRef.current?.click()} disabled={uploading} style={{
                padding:'8px 16px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)',
                background:'var(--bg3)', color:'var(--text)', fontSize:'13px', cursor:'pointer',
                display:'block', marginBottom:'6px', transition:'border-color 0.15s',
              }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
              >
                {vehicle.profileImage ? '🔄 Change photo' : '📸 Upload photo'}
              </button>
              <p style={{ fontSize:'11px', color:'var(--muted)' }}>Shown in sidebar and vehicle card</p>
              <input ref={profileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleProfileUpload} />
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div>
          <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px', fontWeight:600 }}>
            Image Gallery <span style={{ color:'var(--text2)', textTransform:'none', letterSpacing:0, fontWeight:400 }}>({gallery.length} photo{gallery.length!==1?'s':''})</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:'10px', marginBottom:'12px' }}>
            {gallery.map((img, i) => (
              <div key={img.path} style={{ position:'relative', aspectRatio:'4/3', borderRadius:'var(--radius-md)', overflow:'hidden', border:'1px solid var(--border)' }}>
                <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <button
                  onClick={()=>handleRemoveGallery(img.path)}
                  disabled={deleting===img.path}
                  style={{
                    position:'absolute', top:'4px', right:'4px',
                    width:'22px', height:'22px', borderRadius:'50%',
                    background:'rgba(0,0,0,0.7)', border:'none',
                    color:'#fff', fontSize:'11px', cursor:'pointer', lineHeight:1,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}
                >✕</button>
                {deleting===img.path && (
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'11px' }}>Deleting…</div>
                )}
              </div>
            ))}

            {/* Add more tile */}
            <button onClick={()=>galleryRef.current?.click()} disabled={uploading} style={{
              aspectRatio:'4/3', borderRadius:'var(--radius-md)',
              border:'2px dashed var(--border2)', background:'transparent',
              cursor:'pointer', color:'var(--muted)', fontSize:'24px',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px',
              transition:'all 0.15s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='var(--accent)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--muted)'}}
            >
              <span>＋</span>
              <span style={{ fontSize:'10px' }}>Add</span>
            </button>
          </div>

          <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleGalleryUpload} />
          <p style={{ fontSize:'11px', color:'var(--muted)' }}>Select multiple images to add to gallery</p>
        </div>
      </div>
    </div>
  )
}
