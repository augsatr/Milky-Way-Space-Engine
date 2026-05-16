import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  Stars,
  Text,
  Sparkles,
} from '@react-three/drei'
import { useRef, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'

/* ─────────────────────────────────────────────
   PLANET DATA
───────────────────────────────────────────── */
const PLANET_DATA = [
  {
    name: 'Mercury', color: '#b5b5b5', emissive: '#3a3a3a', size: 0.38,
    distance: 6, speed: 4.15, tilt: 0.03, moons: [],
    fact: 'Smallest planet • No atmosphere • Extreme temperature swings',
    type: 'Terrestrial',
  },
  {
    name: 'Venus', color: '#e8cda0', emissive: '#7a4a00', size: 0.95,
    distance: 8.5, speed: 1.62, tilt: 177.4, moons: [],
    fact: 'Hottest planet • Spins backward • Dense CO₂ atmosphere',
    type: 'Terrestrial',
  },
  {
    name: 'Earth', color: '#2e7dbb', emissive: '#0a2a40', size: 1.0,
    distance: 11.5, speed: 1.0, tilt: 23.5, moons: [
      { name: 'Moon', color: '#aaaaaa', size: 0.27, distance: 2.0, speed: 13.4 },
    ],
    fact: 'Only known life-bearing world • 71% water surface',
    type: 'Terrestrial',
  },
  {
    name: 'Mars', color: '#c1440e', emissive: '#5a1500', size: 0.53,
    distance: 14.5, speed: 0.53, tilt: 25.2, moons: [
      { name: 'Phobos', color: '#888', size: 0.15, distance: 1.3, speed: 20 },
      { name: 'Deimos', color: '#999', size: 0.10, distance: 1.9, speed: 10 },
    ],
    fact: 'Largest volcano in solar system • Thin CO₂ atmosphere',
    type: 'Terrestrial',
  },
  {
    name: 'Jupiter', color: '#c88b3a', emissive: '#3a2000', size: 2.6,
    distance: 22, speed: 0.084, tilt: 3.1, moons: [
      { name: 'Io',       color: '#e8d44d', size: 0.22, distance: 3.5, speed: 6.0 },
      { name: 'Europa',   color: '#c8d8e8', size: 0.18, distance: 4.5, speed: 3.5 },
      { name: 'Ganymede', color: '#a09080', size: 0.3,  distance: 5.8, speed: 2.0 },
      { name: 'Callisto', color: '#706050', size: 0.25, distance: 7.0, speed: 1.2 },
    ],
    fact: "Largest planet • Great Red Spot storm older than 350 years",
    type: 'Gas Giant',
  },
  {
    name: 'Saturn', color: '#e8d5a3', emissive: '#4a3800', size: 2.2,
    distance: 31, speed: 0.034, tilt: 26.7, moons: [
      { name: 'Titan',     color: '#c8a040', size: 0.28, distance: 4.5, speed: 2.0 },
      { name: 'Enceladus', color: '#eef5ff', size: 0.14, distance: 3.0, speed: 4.5 },
    ],
    fact: 'Iconic ring system • Least dense planet • 146 known moons',
    type: 'Gas Giant',
    rings: { inner: 2.8, outer: 4.8, color: '#c8b090' },
  },
  {
    name: 'Uranus', color: '#7de8e8', emissive: '#004040', size: 1.6,
    distance: 40, speed: 0.012, tilt: 97.8, moons: [
      { name: 'Titania', color: '#aaa8b8', size: 0.2, distance: 3.0, speed: 3.0 },
      { name: 'Oberon',  color: '#9a9890', size: 0.18, distance: 3.8, speed: 2.0 },
    ],
    fact: 'Rotates on its side • Ice giant with methane atmosphere',
    type: 'Ice Giant',
    rings: { inner: 2.0, outer: 2.5, color: '#4ab8b8' },
  },
  {
    name: 'Neptune', color: '#3f54ba', emissive: '#0a1040', size: 1.55,
    distance: 49, speed: 0.006, tilt: 28.3, moons: [
      { name: 'Triton', color: '#b0c8d8', size: 0.2, distance: 3.0, speed: -3.0 },
    ],
    fact: 'Fastest winds in solar system • 2,100 km/h gusts',
    type: 'Ice Giant',
  },
]

/* ─────────────────────────────────────────────
   SUN
───────────────────────────────────────────── */
function Sun({ onClick, setHovered }) {
  const meshRef  = useRef()
  const glowRef  = useRef()
  const coronaRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    meshRef.current.rotation.y += 0.002
    const pulse = 1 + Math.sin(t * 1.5) * 0.02
    glowRef.current.scale.setScalar(pulse * 1.35)
    coronaRef.current.rotation.z += 0.001
    coronaRef.current.material.opacity = 0.12 + Math.sin(t * 0.8) * 0.04
  })

  return (
    <group
      onClick={onClick}
      onPointerEnter={() => setHovered('Sun')}
      onPointerLeave={() => setHovered(null)}
    >
      <mesh ref={coronaRef}>
        <sphereGeometry args={[3.8, 32, 32]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.8, 32, 32]} />
        <meshBasicMaterial color="#ff9900" transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#ff8800"
          emissiveIntensity={2.5}
          roughness={0.6}
        />
      </mesh>
      <Text
        position={[0, 3.2, 0]}
        fontSize={0.45}
        color="#ffcc44"
        anchorX="center"
        anchorY="middle"
      >
        ☀ SUN
      </Text>
    </group>
  )
}

/* ─────────────────────────────────────────────
   ORBIT RING
───────────────────────────────────────────── */
function OrbitRing({ radius, opacity = 0.15 }) {
  const pts = useMemo(() => {
    const arr = []
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2
      arr.push(new THREE.Vector3(Math.sin(a) * radius, 0, Math.cos(a) * radius))
    }
    return arr
  }, [radius])

  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(pts), [pts])

  return (
    <line geometry={geo}>
      <lineBasicMaterial color="#88aaff" transparent opacity={opacity} />
    </line>
  )
}

/* ─────────────────────────────────────────────
   PLANET RINGS (Saturn / Uranus)
───────────────────────────────────────────── */
function PlanetRings({ inner, outer, color, tilt }) {
  return (
    <mesh rotation={[Math.PI / 2 + (tilt * Math.PI / 180) * 0.3, 0, 0]}>
      <ringGeometry args={[inner, outer, 128, 4]} />
      <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.75} />
    </mesh>
  )
}

/* ─────────────────────────────────────────────
   MOON
───────────────────────────────────────────── */
function Moon({ data, paused, speedMult }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (paused) return
    const t = clock.getElapsedTime() * data.speed * speedMult * 0.3
    ref.current.position.x = Math.sin(t) * data.distance
    ref.current.position.z = Math.cos(t) * data.distance
  })
  return (
    <group>
      <OrbitRing radius={data.distance} opacity={0.08} />
      <mesh ref={ref}>
        <sphereGeometry args={[data.size, 16, 16]} />
        <meshStandardMaterial color={data.color} roughness={0.9} />
      </mesh>
    </group>
  )
}

/* ─────────────────────────────────────────────
   ASTEROID BELT
───────────────────────────────────────────── */
function AsteroidBelt() {
  const count = 800
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 17 + (Math.random() - 0.5) * 2.5
      const y = (Math.random() - 0.5) * 0.4
      pos[i * 3]     = Math.sin(angle) * r
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = Math.cos(angle) * r
    }
    return pos
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  return (
    <points geometry={geo}>
      <pointsMaterial color="#aaaaaa" size={0.12} sizeAttenuation transparent opacity={0.7} />
    </points>
  )
}

/* ─────────────────────────────────────────────
   PLANET
───────────────────────────────────────────── */
function Planet({ data, paused, speedMult, selected, onSelect, setHovered }) {
  const groupRef = useRef()
  const meshRef  = useRef()
  const angleRef = useRef(Math.random() * Math.PI * 2)
  const isSelected = selected === data.name

  useFrame(() => {
    if (!paused) {
      angleRef.current += data.speed * speedMult * 0.004
    }
    const a = angleRef.current
    groupRef.current.position.x = Math.sin(a) * data.distance
    groupRef.current.position.z = Math.cos(a) * data.distance
    meshRef.current.rotation.y += 0.008
  })

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(data.name === selected ? null : data.name)
  }, [data.name, selected, onSelect])

  return (
    <>
      <OrbitRing radius={data.distance} opacity={isSelected ? 0.5 : 0.15} />
      <group ref={groupRef}>
        {isSelected && (
          <mesh>
            <sphereGeometry args={[data.size * 1.6, 32, 32]} />
            <meshBasicMaterial color="#44aaff" transparent opacity={0.12} side={THREE.BackSide} />
          </mesh>
        )}
        <mesh
          ref={meshRef}
          rotation={[data.tilt * Math.PI / 180, 0, 0]}
          onClick={handleClick}
          onPointerEnter={() => setHovered(data.name)}
          onPointerLeave={() => setHovered(null)}
        >
          <sphereGeometry args={[data.size, 64, 64]} />
          <meshStandardMaterial
            color={data.color}
            emissive={data.emissive || '#000000'}
            emissiveIntensity={0.3}
            roughness={0.7}
            metalness={0.1}
          />
          {data.rings && <PlanetRings {...data.rings} tilt={data.tilt} />}
        </mesh>
        <Text
          position={[0, data.size + 0.6, 0]}
          fontSize={isSelected ? 0.38 : 0.28}
          color={isSelected ? '#88ddff' : '#cce8ff'}
          anchorX="center"
          anchorY="middle"
        >
          {data.name}
        </Text>
        {data.moons.map(moon => (
          <Moon key={moon.name} data={moon} paused={paused} speedMult={speedMult} />
        ))}
      </group>
    </>
  )
}

/* ─────────────────────────────────────────────
   KUIPER BELT
───────────────────────────────────────────── */
function KuiperBelt() {
  const count = 400
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 55 + Math.random() * 10
      const y = (Math.random() - 0.5) * 2
      pos[i * 3]     = Math.sin(angle) * r
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = Math.cos(angle) * r
    }
    return pos
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  return (
    <points geometry={geo}>
      <pointsMaterial color="#8899aa" size={0.18} sizeAttenuation transparent opacity={0.5} />
    </points>
  )
}

/* ─────────────────────────────────────────────
   HUD — Planet Detail Panel
───────────────────────────────────────────── */
function PlanetHUD({ selected, onClose }) {
  const data = PLANET_DATA.find(p => p.name === selected)
  if (!data) return null

  const typeColors = { 'Terrestrial': '#4fc3f7', 'Gas Giant': '#ffb74d', 'Ice Giant': '#80cbc4' }

  return (
    <div style={{
      position: 'absolute', top: 20, right: 20,
      width: 'min(280px, calc(100vw - 220px))',
      maxHeight: 'calc(100vh - 100px)',
      overflowY: 'auto',
      background: 'rgba(0,8,20,0.92)',
      border: '1px solid rgba(100,180,255,0.3)',
      borderRadius: 12, padding: '20px 22px',
      backdropFilter: 'blur(12px)',
      fontFamily: 'monospace',
      color: '#c8e8ff',
      boxShadow: '0 0 40px rgba(30,100,200,0.2)',
      animation: 'slideIn 0.25s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: typeColors[data.type] || '#aaa', marginBottom: 4 }}>
            {data.type.toUpperCase()}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>
            {data.name}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: '1px solid rgba(100,180,255,0.25)',
          color: '#88aacc', cursor: 'pointer', borderRadius: 6,
          padding: '4px 10px', fontSize: 14, fontFamily: 'inherit',
        }}>✕</button>
      </div>

      <div style={{ margin: '16px 0', height: 1, background: 'linear-gradient(90deg, rgba(100,180,255,0.4) 0%, transparent 100%)' }} />

      {[
        ['Orbit Distance', `${data.distance.toFixed(1)} AU`],
        ['Relative Size',  `${data.size.toFixed(2)}× Earth`],
        ['Axial Tilt',     `${data.tilt}°`],
        ['Orbital Speed',  `${(data.speed * 100).toFixed(1)}%`],
        ['Moons',          data.moons.length || 0],
      ].map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10 }}>
          <span style={{ color: '#5577aa', letterSpacing: 1 }}>{label.toUpperCase()}</span>
          <span style={{ color: '#aaddff', fontWeight: 600 }}>{value}</span>
        </div>
      ))}

      <div style={{ margin: '14px 0', height: 1, background: 'linear-gradient(90deg, rgba(100,180,255,0.2) 0%, transparent 100%)' }} />
      <div style={{ fontSize: 10, color: '#7aaccc', lineHeight: 1.7 }}>{data.fact}</div>

      {data.moons.length > 0 && (
        <>
          <div style={{ margin: '14px 0 8px', fontSize: 9, letterSpacing: 2, color: '#5588aa' }}>KNOWN MOONS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.moons.map(m => (
              <span key={m.name} style={{
                fontSize: 9, padding: '3px 8px',
                border: '1px solid rgba(100,180,255,0.2)',
                borderRadius: 4, color: '#88bbdd', letterSpacing: 1,
              }}>{m.name}</span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   HUD — Controls Bar
───────────────────────────────────────────── */
function ControlsHUD({ paused, setPaused, speedMult, setSpeedMult, hovered }) {
  return (
    <div style={{
      position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 16,
      background: 'rgba(0,8,20,0.85)',
      border: '1px solid rgba(100,180,255,0.2)',
      borderRadius: 50, padding: '12px 28px',
      backdropFilter: 'blur(16px)',
      fontFamily: 'monospace',
    }}>
      <button
        onClick={() => setPaused(p => !p)}
        style={{
          background: paused ? 'rgba(100,200,100,0.15)' : 'rgba(100,160,255,0.15)',
          border: `1px solid ${paused ? 'rgba(100,200,100,0.4)' : 'rgba(100,160,255,0.4)'}`,
          color: paused ? '#88dd88' : '#88aaff',
          cursor: 'pointer', borderRadius: 50, width: 40, height: 40,
          fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {paused ? '▶' : '⏸'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, color: '#446688', letterSpacing: 2 }}>SLOW</span>
        <input
          type="range" min={0.1} max={5} step={0.1}
          value={speedMult}
          onChange={e => setSpeedMult(Number(e.target.value))}
          style={{ width: 120, accentColor: '#4488ff', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 9, color: '#446688', letterSpacing: 2 }}>FAST</span>
      </div>

      <div style={{ fontSize: 11, color: '#4477aa', letterSpacing: 1, minWidth: 70 }}>
        {speedMult.toFixed(1)}× SPEED
      </div>

      <div style={{ fontSize: 10, color: hovered ? '#88ccff' : '#223344', letterSpacing: 2, minWidth: 90, transition: 'color 0.3s' }}>
        {hovered ? `◉ ${hovered.toUpperCase()}` : '◯ HOVER'}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   HUD — Title
───────────────────────────────────────────── */
function TitleHUD() {
  return (
    <div style={{
      position: 'absolute', top: 20, left: 24,
      fontFamily: 'monospace',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 9, letterSpacing: 4, color: '#336688', marginBottom: 4 }}>INTERACTIVE</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: 3, lineHeight: 1.1 }}>
        SOLAR<br />
        <span style={{ color: '#4488ff', fontSize: 14, letterSpacing: 6 }}>SYSTEM</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 9, color: '#334455', letterSpacing: 2, lineHeight: 2 }}>
        🖱 DRAG TO ORBIT<br />
        🔍 SCROLL TO ZOOM<br />
        🪐 CLICK PLANET
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   HUD — Planet List Sidebar
───────────────────────────────────────────── */
function PlanetList({ selected, onSelect }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: 18, transform: 'translateY(-50%)',
      display: 'flex', flexDirection: 'column', gap: 5,
      fontFamily: 'monospace',
    }}>
      {PLANET_DATA.map(p => (
        <button key={p.name}
          onClick={() => onSelect(selected === p.name ? null : p.name)}
          style={{
            background: selected === p.name ? 'rgba(40,100,200,0.35)' : 'rgba(0,8,20,0.6)',
            border: `1px solid ${selected === p.name ? 'rgba(80,160,255,0.6)' : 'rgba(60,90,140,0.25)'}`,
            color: selected === p.name ? '#88ccff' : '#445566',
            cursor: 'pointer', borderRadius: 6, padding: '6px 14px',
            fontSize: 9, letterSpacing: 2, textAlign: 'left',
            transition: 'all 0.2s', backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: p.color, marginRight: 8, verticalAlign: 'middle',
          }} />
          {p.name.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */
export default function App() {
  const [paused,    setPaused]    = useState(false)
  const [speedMult, setSpeedMult] = useState(1)
  const [selected,  setSelected]  = useState(null)
  const [hovered,   setHovered]   = useState(null)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; background: #000; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        button:hover { filter: brightness(1.3); }
      `}</style>

      <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000005' }}>
        <Canvas
          camera={{ position: [0, 22, 55], fov: 55, near: 0.1, far: 2000 }}
          gl={{ antialias: true, alpha: false }}
        >
          {/* Lighting — bumped ambient so planets are visible */}
          <ambientLight intensity={0.35} />
          <pointLight position={[0, 0, 0]} intensity={8}  color="#fff8e0" distance={200} decay={1.2} />
          <pointLight position={[0, 0, 0]} intensity={3}  color="#ff9900" distance={80}  decay={2} />

          <Stars radius={300} depth={120} count={12000} factor={5} saturation={0.1} fade speed={0.3} />
          <Sparkles count={300} scale={[260, 10, 260]} size={1.2} speed={0.05} color="#aabbff" opacity={0.3} />

          <Sun onClick={() => setSelected(null)} setHovered={setHovered} />
          <AsteroidBelt />
          <KuiperBelt />

          {PLANET_DATA.map(p => (
            <Planet
              key={p.name}
              data={p}
              paused={paused}
              speedMult={speedMult}
              selected={selected}
              onSelect={setSelected}
              setHovered={setHovered}
            />
          ))}

          <OrbitControls
            enableZoom zoomSpeed={0.8}
            minDistance={5} maxDistance={160}
            enableDamping dampingFactor={0.06}
            rotateSpeed={0.5}
          />
        </Canvas>

        <TitleHUD />
        <PlanetList selected={selected} onSelect={setSelected} />
        <PlanetHUD selected={selected} onClose={() => setSelected(null)} />
        <ControlsHUD
          paused={paused} setPaused={setPaused}
          speedMult={speedMult} setSpeedMult={setSpeedMult}
          hovered={hovered}
        />
      </div>
    </>
  )
}