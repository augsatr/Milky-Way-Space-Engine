import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Sparkles } from '@react-three/drei'
import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import * as THREE from 'three'

/* ══════════════════════════════════════════════════════
   GALAXY CONFIGURATION
══════════════════════════════════════════════════════ */
const CONFIG = {
  STARS_COUNT:       120000,   // total galaxy star particles
  ARMS:              4,        // spiral arms
  ARM_SPREAD:        0.38,     // arm thickness spread
  GALAXY_RADIUS:     80,       // max galaxy radius
  CORE_RADIUS:       6,        // dense bright core size
  ARM_WIND:          3.2,      // how tightly arms spiral
  DUST_COUNT:        18000,    // dust/nebula particle count
  ROTATION_SPEED:    0.018,    // galaxy base rotation (deg/frame)
  BULGE_COUNT:       22000,    // central bulge stars
}

// Arm color themes — each arm slightly different hue
const ARM_COLORS = [
  new THREE.Color('#a8d4ff'),  // blue-white young stars
  new THREE.Color('#ffd8a8'),  // orange older stars
  new THREE.Color('#c8a8ff'),  // purple stellar nurseries
  new THREE.Color('#a8ffcc'),  // green-teal
]

const NEBULA_COLORS = [
  '#ff6030', '#3060ff', '#ff30a0',
  '#30d0ff', '#a030ff', '#ff9030',
]

/* ══════════════════════════════════════════════════════
   MATH HELPERS
══════════════════════════════════════════════════════ */
function gaussianRandom(mean = 0, std = 1) {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function spiralAngle(radius, windFactor) {
  return windFactor * Math.log(1 + radius * 0.1)
}

/* ══════════════════════════════════════════════════════
   GALAXY PARTICLE SYSTEM
══════════════════════════════════════════════════════ */
function GalaxyParticles() {
  const galaxyRef  = useRef()
  const dustRef    = useRef()
  const bulgeRef   = useRef()

  // ── Build spiral arm stars ──────────────────────────
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(CONFIG.STARS_COUNT * 3)
    const colors    = new Float32Array(CONFIG.STARS_COUNT * 3)
    const sizes     = new Float32Array(CONFIG.STARS_COUNT)

    for (let i = 0; i < CONFIG.STARS_COUNT; i++) {
      const arm       = i % CONFIG.ARMS
      const armAngle  = (arm / CONFIG.ARMS) * Math.PI * 2
      const t         = Math.random()
      const radius    = Math.pow(t, 0.6) * CONFIG.GALAXY_RADIUS
      const angle     = armAngle + spiralAngle(radius, CONFIG.ARM_WIND)
      const spread    = gaussianRandom(0, CONFIG.ARM_SPREAD * (1 + radius * 0.018))
      const x         = Math.cos(angle + spread) * radius
      const z         = Math.sin(angle + spread) * radius
      const y         = gaussianRandom(0, 0.18 + radius * 0.008)

      positions[i * 3]     = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      // color: blend arm color with white towards center
      const baseCol = ARM_COLORS[arm % ARM_COLORS.length]
      const white   = new THREE.Color('#ffffff')
      const blend   = Math.max(0, 1 - radius / CONFIG.GALAXY_RADIUS)
      const col     = baseCol.clone().lerp(white, blend * 0.6)

      // slight brightness variation
      const brightness = 0.6 + Math.random() * 0.4
      colors[i * 3]     = col.r * brightness
      colors[i * 3 + 1] = col.g * brightness
      colors[i * 3 + 2] = col.b * brightness

      sizes[i] = Math.random() < 0.02 ? (0.8 + Math.random() * 1.2) : (0.1 + Math.random() * 0.4)
    }

    return { positions, colors, sizes }
  }, [])

  // ── Build dust / nebula lanes ───────────────────────
  const dustData = useMemo(() => {
    const pos  = new Float32Array(CONFIG.DUST_COUNT * 3)
    const col  = new Float32Array(CONFIG.DUST_COUNT * 3)
    const sz   = new Float32Array(CONFIG.DUST_COUNT)

    for (let i = 0; i < CONFIG.DUST_COUNT; i++) {
      const arm    = i % CONFIG.ARMS
      const angle0 = (arm / CONFIG.ARMS) * Math.PI * 2
      const t      = Math.random()
      const radius = Math.pow(t, 0.5) * CONFIG.GALAXY_RADIUS * 0.85
      const angle  = angle0 + spiralAngle(radius, CONFIG.ARM_WIND) + 0.25
      const spread = gaussianRandom(0, CONFIG.ARM_SPREAD * 1.8 * (1 + radius * 0.012))
      const x      = Math.cos(angle + spread) * radius
      const z      = Math.sin(angle + spread) * radius
      const y      = gaussianRandom(0, 0.3 + radius * 0.005)

      pos[i * 3]     = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      const hexCol = NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)]
      const c      = new THREE.Color(hexCol)
      const fade   = 0.08 + Math.random() * 0.15
      col[i * 3]     = c.r * fade
      col[i * 3 + 1] = c.g * fade
      col[i * 3 + 2] = c.b * fade

      sz[i] = 1.5 + Math.random() * 5.0
    }

    return { pos, col, sz }
  }, [])

  // ── Build central bulge ────────────────────────────
  const bulgeData = useMemo(() => {
    const pos  = new Float32Array(CONFIG.BULGE_COUNT * 3)
    const col  = new Float32Array(CONFIG.BULGE_COUNT * 3)
    const sz   = new Float32Array(CONFIG.BULGE_COUNT)

    for (let i = 0; i < CONFIG.BULGE_COUNT; i++) {
      const r     = Math.abs(gaussianRandom(0, CONFIG.CORE_RADIUS))
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)

      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.45
      pos[i * 3 + 2] = r * Math.cos(phi)

      // warm golden core color
      const warmth = 0.7 + Math.random() * 0.3
      col[i * 3]     = warmth
      col[i * 3 + 1] = warmth * 0.75
      col[i * 3 + 2] = warmth * 0.35

      sz[i] = 0.1 + Math.random() * 0.5
    }

    return { pos, col, sz }
  }, [])

  // ── Build buffer geometries ────────────────────────
  const galaxyGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    g.setAttribute('size',     new THREE.BufferAttribute(sizes, 1))
    return g
  }, [positions, colors, sizes])

  const dustGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(dustData.pos, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(dustData.col, 3))
    g.setAttribute('size',     new THREE.BufferAttribute(dustData.sz,  1))
    return g
  }, [dustData])

  const bulgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(bulgeData.pos, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(bulgeData.col, 3))
    g.setAttribute('size',     new THREE.BufferAttribute(bulgeData.sz,  1))
    return g
  }, [bulgeData])

  // ── Custom shader material for variable star sizes ─
  const starMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (320.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.1, 0.5, d);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  }), [])

  const dustMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (400.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = 0.18 * (1.0 - smoothstep(0.0, 0.5, d));
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  }), [])

  // ── Rotate entire galaxy ────────────────────────────
  useFrame((_, delta) => {
    const speed = CONFIG.ROTATION_SPEED * delta
    if (galaxyRef.current)  galaxyRef.current.rotation.y  += speed
    if (dustRef.current)    dustRef.current.rotation.y    += speed * 0.96
    if (bulgeRef.current)   bulgeRef.current.rotation.y   += speed * 1.1
  })

  return (
    <>
      {/* Dust lanes (rendered first — additive so they layer beautifully) */}
      <points ref={dustRef} geometry={dustGeo} material={dustMaterial} />

      {/* Main spiral arm stars */}
      <points ref={galaxyRef} geometry={galaxyGeo} material={starMaterial} />

      {/* Central bulge */}
      <points ref={bulgeRef} geometry={bulgeGeo} material={starMaterial} />
    </>
  )
}

/* ══════════════════════════════════════════════════════
   GALACTIC CORE GLOW
══════════════════════════════════════════════════════ */
function GalacticCore() {
  const ref      = useRef()
  const haloRef  = useRef()
  const diskRef  = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulse = 1 + Math.sin(t * 0.4) * 0.04
    if (ref.current)     ref.current.scale.setScalar(pulse)
    if (haloRef.current) haloRef.current.material.opacity = 0.22 + Math.sin(t * 0.6) * 0.04
    if (diskRef.current) diskRef.current.rotation.z += 0.0008
  })

  return (
    <group>
      {/* Outer halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[18, 32, 32]} />
        <meshBasicMaterial color="#ffcc66" transparent opacity={0.22} side={THREE.BackSide} />
      </mesh>

      {/* Mid glow */}
      <mesh>
        <sphereGeometry args={[9, 32, 32]} />
        <meshBasicMaterial color="#ffaa33" transparent opacity={0.35} side={THREE.BackSide} />
      </mesh>

      {/* Inner bright core */}
      <mesh ref={ref}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>

      {/* Equatorial disk glow */}
      <mesh ref={diskRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 22, 128]} />
        <meshBasicMaterial color="#ff9922" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>

      {/* Bright point */}
      <pointLight position={[0, 0, 0]} intensity={12} color="#fff5cc" distance={120} decay={1.5} />
      <pointLight position={[0, 0, 0]} intensity={5}  color="#ff9900" distance={50}  decay={2} />
    </group>
  )
}

/* ══════════════════════════════════════════════════════
   DISTANT BACKGROUND GALAXIES
══════════════════════════════════════════════════════ */
function BackgroundGalaxies() {
  const data = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 900,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 900,
      ],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
      scale: 0.3 + Math.random() * 1.2,
      color: ['#aaccff', '#ffccaa', '#ccaaff', '#aaffcc'][i % 4],
    }))
  }, [])

  return (
    <>
      {data.map((g, i) => (
        <mesh key={i} position={g.position} rotation={g.rotation} scale={g.scale}>
          <planeGeometry args={[8, 3]} />
          <meshBasicMaterial color={g.color} transparent opacity={0.07} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  )
}

/* ══════════════════════════════════════════════════════
   SOLAR SYSTEM MARKER (our location in the galaxy)
══════════════════════════════════════════════════════ */
function OurSolarSystem({ onClick }) {
  const ref     = useRef()
  const ringRef = useRef()

  // Approx position: in Orion Arm, ~26k ly from center
  // Scaled: about 26 units from center
  const POS = useMemo(() => new THREE.Vector3(26, 0.5, 8), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ref.current) {
      ref.current.position.copy(POS)
      ref.current.children[0].material.opacity = 0.5 + Math.sin(t * 2) * 0.5
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.012
      ringRef.current.rotation.x += 0.005
    }
  })

  return (
    <group ref={ref} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Pulsing dot */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
      </mesh>
      {/* Orbit ring indicator */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.5, 0.65, 32]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Point light so it shows up */}
      <pointLight color="#00ffff" intensity={1.5} distance={8} decay={2} />
    </group>
  )
}

/* ══════════════════════════════════════════════════════
   CAMERA INTRO ANIMATION
══════════════════════════════════════════════════════ */
function CameraIntro({ done, onDone }) {
  const { camera } = useThree()
  const tRef = useRef(0)
  const startPos = useMemo(() => new THREE.Vector3(0, 200, 300), [])
  const endPos   = useMemo(() => new THREE.Vector3(0, 90, 160),  [])

  useEffect(() => {
    camera.position.copy(startPos)
    camera.lookAt(0, 0, 0)
  }, [])

  useFrame((_, delta) => {
    if (done) return
    tRef.current = Math.min(tRef.current + delta * 0.28, 1)
    const t = tRef.current
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    camera.position.lerpVectors(startPos, endPos, ease)
    camera.lookAt(0, 0, 0)
    if (tRef.current >= 1) onDone()
  })

  return null
}

/* ══════════════════════════════════════════════════════
   HUD — TITLE & INFO
══════════════════════════════════════════════════════ */
function TitleHUD({ introDone }) {
  return (
    <div style={{
      position: 'absolute', top: 28, left: 32,
      fontFamily: "'Courier New', monospace",
      pointerEvents: 'none', zIndex: 10,
      opacity: introDone ? 1 : 0,
      transition: 'opacity 1.2s ease 0.5s',
    }}>
      <div style={{ fontSize: 10, letterSpacing: 5, color: '#336655', marginBottom: 6 }}>
        NASA / COSMOS ENGINE v1.0
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>
        MILKY WAY
      </div>
      <div style={{ fontSize: 13, color: '#44aaff', letterSpacing: 8, marginTop: 4 }}>
        GALAXY SIMULATOR
      </div>
      <div style={{ marginTop: 18, fontSize: 9, color: '#334455', letterSpacing: 2, lineHeight: 2.2 }}>
        DRAG  ·  ROTATE VIEW<br />
        SCROLL  ·  ZOOM IN/OUT<br />
        CLICK MARKER  ·  OUR SOLAR SYSTEM
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   HUD — GALAXY STATS
══════════════════════════════════════════════════════ */
function StatsHUD({ introDone }) {
  const stats = [
    ['DIAMETER',     '105,700 light-years'],
    ['STARS',        '100–400 billion'],
    ['AGE',          '13.6 billion years'],
    ['TYPE',         'Barred Spiral (SBbc)'],
    ['SPIRAL ARMS',  '4 major arms'],
    ['CENTER',       'Sagittarius A* (black hole)'],
    ['OUR LOCATION', 'Orion Arm — 26k ly from core'],
  ]

  return (
    <div style={{
      position: 'absolute', top: 28, right: 24,
      width: 260,
      background: 'rgba(0,4,12,0.88)',
      border: '1px solid rgba(60,140,255,0.2)',
      borderRadius: 10, padding: '16px 20px',
      backdropFilter: 'blur(14px)',
      fontFamily: "'Courier New', monospace",
      zIndex: 10,
      opacity: introDone ? 1 : 0,
      transition: 'opacity 1.2s ease 1s',
      maxWidth: 'calc(100vw - 320px)',
    }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: '#446688', marginBottom: 12 }}>
        GALACTIC DATA
      </div>
      {stats.map(([label, value]) => (
        <div key={label} style={{
          display: 'flex', flexDirection: 'column', marginBottom: 9,
          borderBottom: '1px solid rgba(60,100,160,0.12)', paddingBottom: 8,
        }}>
          <span style={{ fontSize: 8, letterSpacing: 2, color: '#335577' }}>{label}</span>
          <span style={{ fontSize: 10, color: '#88ccff', marginTop: 2, letterSpacing: 0.5 }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   HUD — SOLAR SYSTEM POPUP
══════════════════════════════════════════════════════ */
function SolarSystemPopup({ visible, onClose }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,6,18,0.96)',
      border: '1px solid rgba(0,255,255,0.3)',
      borderRadius: 14, padding: '28px 32px',
      fontFamily: "'Courier New', monospace",
      color: '#c8f0ff', zIndex: 20,
      maxWidth: 360, width: 'calc(100vw - 48px)',
      boxShadow: '0 0 60px rgba(0,200,255,0.15)',
      animation: 'popIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#00ccaa', marginBottom: 4 }}>YOU ARE HERE</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>OUR SOLAR SYSTEM</div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: '1px solid rgba(0,255,255,0.2)',
          color: '#44aacc', cursor: 'pointer', borderRadius: 6,
          padding: '4px 10px', fontSize: 13, fontFamily: 'inherit',
        }}>X</button>
      </div>
      <div style={{ height: 1, background: 'linear-gradient(90deg,rgba(0,200,255,0.4),transparent)', marginBottom: 16 }} />
      {[
        ['Location',   'Orion–Cygnus Arm'],
        ['Distance',   '26,000 light-years from core'],
        ['Orbit speed','220 km/s around galactic center'],
        ['Galactic yr','225–250 million Earth years'],
        ['Star type',  'G-type main sequence (G2V)'],
        ['Planets',    '8 confirmed'],
      ].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10 }}>
          <span style={{ color: '#335577', letterSpacing: 1 }}>{k.toUpperCase()}</span>
          <span style={{ color: '#88ddff', fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{v}</span>
        </div>
      ))}
      <div style={{ marginTop: 14, fontSize: 9, color: '#335566', lineHeight: 1.8 }}>
        Our Sun is one of ~400 billion stars in the Milky Way,
        located in a minor spiral arm between the Perseus
        and Sagittarius arms.
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   HUD — PHASE ROADMAP
══════════════════════════════════════════════════════ */
function RoadmapHUD({ introDone }) {
  const phases = [
    { n: 1, label: 'Galaxy Foundation',   done: true  },
    { n: 2, label: 'Realistic Textures',  done: false },
    { n: 3, label: 'Cinematic Effects',   done: false },
    { n: 4, label: 'Physics Simulation',  done: false },
    { n: 5, label: 'Ultra Realism',       done: false },
    { n: 6, label: 'Full Milky Way',      done: false },
    { n: 7, label: 'Space Exploration',   done: false },
  ]
  return (
    <div style={{
      position: 'absolute', bottom: 28, right: 24,
      background: 'rgba(0,4,12,0.85)',
      border: '1px solid rgba(60,140,255,0.15)',
      borderRadius: 10, padding: '14px 18px',
      fontFamily: "'Courier New', monospace",
      zIndex: 10,
      opacity: introDone ? 1 : 0,
      transition: 'opacity 1.2s ease 1.5s',
      maxWidth: 'calc(100vw - 48px)',
    }}>
      <div style={{ fontSize: 8, letterSpacing: 3, color: '#334466', marginBottom: 10 }}>
        BUILD ROADMAP
      </div>
      {phases.map(p => (
        <div key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            background: p.done ? 'rgba(0,200,120,0.3)' : 'rgba(60,80,120,0.3)',
            border: `1px solid ${p.done ? 'rgba(0,200,120,0.6)' : 'rgba(60,100,180,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7, color: p.done ? '#00dd88' : '#334466', flexShrink: 0,
          }}>
            {p.done ? '✓' : p.n}
          </div>
          <span style={{
            fontSize: 9, letterSpacing: 1,
            color: p.done ? '#44dd88' : '#334466',
          }}>
            PHASE {p.n} — {p.label.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   HUD — CONTROLS
══════════════════════════════════════════════════════ */
function ControlsHUD({ introDone, speed, setSpeed, paused, setPaused }) {
  return (
    <div style={{
      position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 16,
      background: 'rgba(0,4,12,0.88)',
      border: '1px solid rgba(60,140,255,0.2)',
      borderRadius: 50, padding: '10px 26px',
      backdropFilter: 'blur(16px)',
      fontFamily: "'Courier New', monospace",
      zIndex: 10, whiteSpace: 'nowrap',
      opacity: introDone ? 1 : 0,
      transition: 'opacity 1.2s ease 2s',
    }}>
      <button onClick={() => setPaused(p => !p)} style={{
        background: paused ? 'rgba(100,220,120,0.12)' : 'rgba(60,140,255,0.12)',
        border: `1px solid ${paused ? 'rgba(80,200,100,0.4)' : 'rgba(60,140,255,0.4)'}`,
        color: paused ? '#88ee88' : '#66aaff',
        cursor: 'pointer', borderRadius: '50%',
        width: 36, height: 36, fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {paused ? '>' : '||'}
      </button>

      <span style={{ fontSize: 9, color: '#334466', letterSpacing: 2 }}>SLOW</span>
      <input type="range" min={0.1} max={5} step={0.05}
        value={speed}
        onChange={e => setSpeed(Number(e.target.value))}
        style={{ width: 100, accentColor: '#4488ff', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 9, color: '#334466', letterSpacing: 2 }}>FAST</span>
      <span style={{ fontSize: 10, color: '#446688', letterSpacing: 1, minWidth: 64 }}>
        {speed.toFixed(2)}x ROT
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   GALAXY ROTATION CONTROLLER (reads paused + speed)
══════════════════════════════════════════════════════ */
function GalaxyController({ paused, speed, children }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (!paused && ref.current) {
      ref.current.rotation.y += CONFIG.ROTATION_SPEED * speed * delta * 60
    }
  })
  return <group ref={ref}>{children}</group>
}

/* ══════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════ */
export default function App() {
  const [introDone,      setIntroDone]      = useState(false)
  const [paused,         setPaused]         = useState(false)
  const [speed,          setSpeed]          = useState(1)
  const [showSolarPopup, setShowSolarPopup] = useState(false)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; background: #000; }
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%,-50%) scale(0.92); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        button:hover { filter: brightness(1.25); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(60,120,255,0.25); border-radius: 2px; }
      `}</style>

      <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#00000a' }}>

        <Canvas
          camera={{ position: [0, 90, 160], fov: 60, near: 0.1, far: 5000 }}
          gl={{ antialias: true, alpha: false }}
        >
          <ambientLight intensity={0.02} />

          {/* Deep space background stars (not part of galaxy) */}
          <Stars radius={600} depth={200} count={8000} factor={3} saturation={0.3} fade speed={0.1} />

          {/* Camera intro fly-in */}
          {!introDone && <CameraIntro done={introDone} onDone={() => setIntroDone(true)} />}

          {/* Galaxy — everything inside rotates together */}
          <GalaxyController paused={paused} speed={speed}>
            <GalaxyParticles />
          </GalaxyController>

          {/* Core glow (separate from rotation group — always centered) */}
          <GalacticCore />

          {/* Our solar system marker */}
          <OurSolarSystem onClick={() => setShowSolarPopup(true)} />

          {/* Distant background galaxies */}
          <BackgroundGalaxies />

          {/* Extra ambient sparkle */}
          <Sparkles count={200} scale={[300, 60, 300]} size={1.5} speed={0.02} color="#aabbff" opacity={0.15} />

          <OrbitControls
            enableZoom zoomSpeed={0.7}
            minDistance={15} maxDistance={400}
            enableDamping dampingFactor={0.05}
            rotateSpeed={0.4}
            enablePan={false}
          />
        </Canvas>

        {/* HUD Overlays */}
        <TitleHUD introDone={introDone} />
        <StatsHUD introDone={introDone} />
        <RoadmapHUD introDone={introDone} />
        <ControlsHUD
          introDone={introDone}
          paused={paused}  setPaused={setPaused}
          speed={speed}    setSpeed={setSpeed}
        />
        <SolarSystemPopup visible={showSolarPopup} onClose={() => setShowSolarPopup(false)} />
      </div>
    </>
  )
}
