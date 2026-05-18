import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Sparkles, Html } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import * as THREE from 'three'

/* ══════════════════════════════════════════════════════
   COSMOS ENGINE v6.0 — PHASE 6
   New in this phase:
   • Spaceship fly mode — WASD + mouse + boost
   • Full cockpit HUD overlay (speed, fuel, coords, radar)
   • Alien civilization markers on habitable planets
   • Planet landing system — zoom into surface
   • Procedural planet surfaces (terrain noise shader)
   • Warp speed jump between star systems
   • Mission log — discoverable objects
   • Space station in orbit
   • Asteroid mining ships (animated)
   • Communication signal visualizer
══════════════════════════════════════════════════════ */

const GC = {
  STARS:180000, ARMS:4, SPREAD:0.32, RADIUS:52,
  CORE_R:5, WIND:3.4, DUST:22000, BULGE:28000, ROT:0.012,
}
function gaussRand(m=0,s=1){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return m+s*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function spiralA(r,w){return w*Math.log(1+r*0.1)}

const SPECTRAL_COLORS={O:'#9bb0ff',B:'#aabfff',A:'#cad7ff',F:'#f8f7ff',G:'#fff4ea',K:'#ffd2a1',M:'#ffcc6f'}

/* ══════════════════════════════════════════════════════
   ALIEN CIVILIZATIONS — on habitable worlds
══════════════════════════════════════════════════════ */
const ALIEN_CIVS = [
  { name:'TRAPPIST Collective', star:'TRAPPIST-1', pos:[26.04,0.001,8.04],
    type:'Type I', population:'~2.4 Trillion', signal:'Radio + Laser',
    color:'#44ffcc', tech:'Fusion Energy', contact:false,
    desc:'Multi-planet civilization. Mastered planetary engineering. Peaceful explorers.' },
  { name:'Proxima Commonwealth', star:'Proxima Centauri', pos:[26.004,0.001,8.004],
    type:'Type I', population:'~800 Billion', signal:'Radio waves',
    color:'#ff8844', tech:'Early Space Age', contact:false,
    desc:'Tidal-locked world civilization. Built cities on the terminator line.' },
  { name:'Tau Ceti Federation', star:'Tau Ceti', pos:[26.06,0,8.06],
    type:'Type II', population:'~40 Trillion', signal:'Gravitational',
    color:'#88aaff', tech:'Dyson Sphere (partial)', contact:false,
    desc:'Advanced federation spanning 4 planets. Partially harvesting their star.' },
  { name:'Kepler Hegemony', star:'Kepler-452', pos:[26.3,0.1,8.3],
    type:'Type II', population:'~12 Trillion', signal:'Neutrino beam',
    color:'#ffee44', tech:'Interstellar travel', contact:false,
    desc:'1.5 billion year old civilization. May have visited our solar system.' },
  { name:'Gliese Hive Mind', star:'55 Cancri', pos:[26.05,0.02,8.05],
    type:'Type I', population:'~6 Trillion', signal:'Quantum entanglement',
    color:'#cc44ff', tech:'Neural networks', contact:false,
    desc:'Collective consciousness across millions of connected beings.' },
]

/* ══════════════════════════════════════════════════════
   REAL STARS (from Phase 5)
══════════════════════════════════════════════════════ */
const REAL_STARS = [
  { name:'Sol (Our Sun)', pos:[26,0,8], type:'G2V', spectral:'G', color:'#ffe87a', size:1.8, distance:0, planets:8, special:true,
    info:'Our home star. 8 planets. Only known life-bearing system.',
    temp:5778, radius:1.0, mass:1.0, luminosity:1.0,
    knownPlanets:['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'] },
  { name:'Proxima Centauri', pos:[26.004,0.001,8.004], type:'M5Ve', spectral:'M', color:'#ff6644', size:1.2, distance:4.24, planets:3,
    info:'Closest star to Sun. Has Proxima b in habitable zone.',
    temp:3042, radius:0.15, mass:0.12, luminosity:0.0017,
    knownPlanets:['Proxima b','Proxima c','Proxima d'] },
  { name:'Sirius A', pos:[26.009,-0.001,8.009], type:'A1V', spectral:'A', color:'#cceeff', size:1.7, distance:8.6, planets:0,
    info:'Brightest star in night sky.',temp:9940,radius:1.71,mass:2.06,luminosity:25.4,knownPlanets:[] },
  { name:'Betelgeuse', pos:[27.5,0.3,8.2], type:'M1-2', spectral:'M', color:'#ff4400', size:2.8, distance:700, planets:0,
    info:'Red supergiant. Will explode as supernova.',
    temp:3500,radius:764,mass:11.6,luminosity:126000,knownPlanets:[] },
  { name:'TRAPPIST-1', pos:[26.04,0.001,8.04], type:'M8V', spectral:'M', color:'#ff4422', size:0.9, distance:39, planets:7,
    info:'7 Earth-sized planets. 3 in habitable zone.',
    temp:2566,radius:0.12,mass:0.09,luminosity:0.000522,
    knownPlanets:['TRAPPIST-1b','TRAPPIST-1c','TRAPPIST-1d','TRAPPIST-1e (HZ)','TRAPPIST-1f (HZ)','TRAPPIST-1g (HZ)','TRAPPIST-1h'] },
  { name:'Tau Ceti', pos:[26.06,0,8.06], type:'G8.5V', spectral:'G', color:'#ffd2a1', size:1.1, distance:11.9, planets:4,
    info:'One of nearest Sun-like stars.',
    temp:5344,radius:0.793,mass:0.783,luminosity:0.488,
    knownPlanets:['Tau Ceti e (HZ)','Tau Ceti f (HZ)','Tau Ceti g','Tau Ceti h'] },
  { name:'Kepler-452', pos:[26.3,0.1,8.3], type:'G2V', spectral:'G', color:'#ffe87a', size:1.3, distance:1400, planets:1,
    info:"Earth's cousin host star.",
    temp:5757,radius:1.11,mass:1.04,luminosity:1.2,knownPlanets:["Kepler-452b (Earth-like)"] },
  { name:'55 Cancri', pos:[26.05,0.02,8.05], type:'G8V', spectral:'G', color:'#ffd2a1', size:1.2, distance:41, planets:5,
    info:'Has a possible diamond planet!',
    temp:5196,radius:0.96,mass:0.91,luminosity:0.582,
    knownPlanets:['55 Cnc b','55 Cnc c','55 Cnc d','55 Cnc e','55 Cnc f'] },
]

/* ══════════════════════════════════════════════════════
   SOLAR SYSTEM
══════════════════════════════════════════════════════ */
const SOLAR_PLANETS = [
  { name:'Mercury', radius:0.04, distance:0.6,  speed:4.7,  color:'#aaaaaa', moons:0,  tilt:0.03,  temp:167,  type:'Terrestrial' },
  { name:'Venus',   radius:0.09, distance:0.9,  speed:3.5,  color:'#e8cc99', moons:0,  tilt:177,   temp:464,  type:'Terrestrial' },
  { name:'Earth',   radius:0.1,  distance:1.3,  speed:2.98, color:'#2266ee', moons:1,  tilt:23.5,  temp:15,   type:'Terrestrial' },
  { name:'Mars',    radius:0.06, distance:1.8,  speed:2.41, color:'#cc4400', moons:2,  tilt:25.2,  temp:-65,  type:'Terrestrial' },
  { name:'Jupiter', radius:0.42, distance:4.2,  speed:1.31, color:'#c8a87a', moons:95, tilt:3.13,  temp:-110, type:'Gas Giant' },
  { name:'Saturn',  radius:0.36, distance:6.5,  speed:0.97, color:'#e8d5a0', moons:146,tilt:26.7,  temp:-140, type:'Gas Giant', rings:true },
  { name:'Uranus',  radius:0.22, distance:9.5,  speed:0.68, color:'#88ddee', moons:28, tilt:97.77, temp:-195, type:'Ice Giant' },
  { name:'Neptune', radius:0.20, distance:12.5, speed:0.54, color:'#3355ff', moons:16, tilt:28.32, temp:-200, type:'Ice Giant' },
]

function SolarSystem({ onPlanetSelect, camDist, speed, paused }) {
  const sunRef = useRef()
  const planetRefs = useRef([])
  const angles = useRef(SOLAR_PLANETS.map(()=>Math.random()*Math.PI*2))
  const CENTER = new THREE.Vector3(26,0,8)

  useFrame((_,dt)=>{
    if(paused)return
    const s=dt*speed*0.3
    if(sunRef.current)sunRef.current.scale.setScalar(1+Math.sin(Date.now()*0.001)*0.03)
    SOLAR_PLANETS.forEach((p,i)=>{
      angles.current[i]+=s*p.speed*0.08
      const a=angles.current[i]
      if(planetRefs.current[i])
        planetRefs.current[i].position.set(CENTER.x+Math.cos(a)*p.distance,CENTER.y,CENTER.z+Math.sin(a)*p.distance)
    })
  })

  if(camDist>35)return null
  return(
    <group>
      <mesh ref={sunRef} position={CENTER}>
        <sphereGeometry args={[0.25,32,32]}/>
        <meshStandardMaterial color="#ffe87a" emissive="#ff9900" emissiveIntensity={4}/>
      </mesh>
      <pointLight position={CENTER} color="#ffe87a" intensity={12} distance={30} decay={1.5}/>
      {SOLAR_PLANETS.map((p,i)=>(
        <mesh key={`orbit-${i}`} position={CENTER} rotation={[Math.PI/2,0,0]}>
          <ringGeometry args={[p.distance-0.01,p.distance+0.01,128]}/>
          <meshBasicMaterial color="#ffffff" transparent opacity={0.06} side={THREE.DoubleSide}/>
        </mesh>
      ))}
      {SOLAR_PLANETS.map((p,i)=>(
        <group key={p.name} ref={el=>planetRefs.current[i]=el} position={[CENTER.x+p.distance,CENTER.y,CENTER.z]}>
          <mesh onClick={e=>{e.stopPropagation();onPlanetSelect(p)}} onPointerEnter={()=>document.body.style.cursor='pointer'} onPointerLeave={()=>document.body.style.cursor='default'}>
            <sphereGeometry args={[p.radius,24,24]}/>
            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.3} roughness={0.8}/>
          </mesh>
          {p.rings&&(<mesh rotation={[Math.PI*0.12,0,0.2]}><ringGeometry args={[p.radius*1.4,p.radius*2.4,64]}/><meshBasicMaterial color="#c8b880" transparent opacity={0.55} side={THREE.DoubleSide}/></mesh>)}
          {camDist<25&&(<Html distanceFactor={12} center style={{pointerEvents:'none'}}><div style={{fontFamily:"'Courier New',monospace",fontSize:7,color:p.color,whiteSpace:'nowrap',textShadow:`0 0 6px ${p.color}`,marginTop:-20,letterSpacing:1}}>{p.name}</div></Html>)}
        </group>
      ))}
    </group>
  )
}

/* ══════════════════════════════════════════════════════
   ALIEN CIVILIZATION MARKERS
══════════════════════════════════════════════════════ */
function AlienMarker({ civ, onSelect, selected, camDist }) {
  const ringRef = useRef()
  const signalRef = useRef()
  const isSelected = selected === civ.name

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.018
      ringRef.current.rotation.x = Math.sin(t * 0.4) * 0.3
      ringRef.current.material.opacity = 0.4 + Math.sin(t * 2.2) * 0.25
    }
    if (signalRef.current) {
      const s = 1 + ((t * 0.8) % 1) * 3
      signalRef.current.scale.setScalar(s)
      signalRef.current.material.opacity = Math.max(0, 0.4 - ((t * 0.8) % 1) * 0.4)
    }
  })

  if (camDist > 80 && !isSelected) return null

  return (
    <group position={civ.pos}>
      {/* Signal ripple */}
      <mesh ref={signalRef} rotation={[Math.PI/2,0,0]}>
        <ringGeometry args={[0.18, 0.22, 32]} />
        <meshBasicMaterial color={civ.color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Civilization icon */}
      <mesh ref={ringRef} rotation={[Math.PI/3,0,0]}
        onClick={e=>{e.stopPropagation();onSelect(civ)}}
        onPointerEnter={()=>document.body.style.cursor='pointer'}
        onPointerLeave={()=>document.body.style.cursor='default'}
      >
        <torusGeometry args={[0.2, 0.04, 8, 32]} />
        <meshStandardMaterial color={civ.color} emissive={civ.color} emissiveIntensity={2} />
      </mesh>

      {/* Core dot */}
      <mesh>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={civ.color} emissive={civ.color} emissiveIntensity={4} />
      </mesh>

      <pointLight color={civ.color} intensity={isSelected?3:1} distance={isSelected?8:3} decay={2} />

      {(camDist < 50 || isSelected) && (
        <Html distanceFactor={20} center style={{ pointerEvents:'none' }}>
          <div style={{
            fontFamily:"'Courier New',monospace", fontSize: isSelected?10:8,
            color: civ.color, whiteSpace:'nowrap',
            textShadow:`0 0 8px ${civ.color}`, marginTop:-24,
            letterSpacing:1, background:'rgba(0,4,12,0.7)',
            padding:'2px 6px', borderRadius:3,
          }}>
            👽 {civ.name}
          </div>
        </Html>
      )}
    </group>
  )
}

/* ══════════════════════════════════════════════════════
   SPACE STATION
══════════════════════════════════════════════════════ */
function SpaceStation({ camDist }) {
  const ref = useRef()
  const ringRef = useRef()
  const antRef = useRef()
  const POS = [26.8, 0.5, 8.5]

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ref.current) ref.current.rotation.y += 0.006
    if (ringRef.current) ringRef.current.rotation.z += 0.012
    if (antRef.current) antRef.current.rotation.y = Math.sin(t * 0.5) * 0.5
  })

  if (camDist > 30) return null

  return (
    <group position={POS} ref={ref}>
      {/* Central hub */}
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.3, 12]} />
        <meshStandardMaterial color="#aabbcc" emissive="#334455" emissiveIntensity={0.5} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Rotating ring */}
      <mesh ref={ringRef} rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[0.28, 0.04, 8, 32]} />
        <meshStandardMaterial color="#88aacc" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Solar panels */}
      {[-1,1].map(side => (
        <mesh key={side} position={[side * 0.4, 0, 0]}>
          <boxGeometry args={[0.3, 0.01, 0.12]} />
          <meshStandardMaterial color="#334488" emissive="#112266" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* Antenna */}
      <mesh ref={antRef} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.2, 4]} />
        <meshStandardMaterial color="#ffffff" emissive="#aaccff" emissiveIntensity={1} />
      </mesh>

      <pointLight color="#aaccff" intensity={1.5} distance={4} decay={2} />

      <Html distanceFactor={14} position={[0, 0.5, 0]} center style={{ pointerEvents:'none' }}>
        <div style={{
          fontFamily:"'Courier New',monospace", fontSize:7, color:'#88bbdd',
          textShadow:'0 0 6px #4488ff', letterSpacing:2, whiteSpace:'nowrap'
        }}>GATEWAY STATION ALPHA</div>
      </Html>
    </group>
  )
}

/* ══════════════════════════════════════════════════════
   MINING SHIPS — animated asteroid miners
══════════════════════════════════════════════════════ */
function MiningShips({ camDist }) {
  const ships = useRef([
    { pos: new THREE.Vector3(17.5, 0.1, 0.2), angle: 0, speed: 0.4, color: '#ffaa44' },
    { pos: new THREE.Vector3(17.2, -0.1, 0.5), angle: 2.1, speed: 0.3, color: '#44ffaa' },
    { pos: new THREE.Vector3(17.8, 0.2, -0.3), angle: 4.2, speed: 0.5, color: '#aaaaff' },
  ])
  const refs = useRef([])

  useFrame((_, dt) => {
    ships.current.forEach((s, i) => {
      s.angle += dt * s.speed
      const r = 0.8 + i * 0.3
      s.pos.x = 17.5 + Math.cos(s.angle) * r
      s.pos.z = 0.0  + Math.sin(s.angle) * r
      if (refs.current[i]) {
        refs.current[i].position.copy(s.pos)
        refs.current[i].rotation.y = s.angle + Math.PI / 2
      }
    })
  })

  if (camDist > 28) return null

  return (
    <>
      {ships.current.map((s, i) => (
        <group key={i} ref={el => refs.current[i] = el}>
          <mesh>
            <coneGeometry args={[0.025, 0.08, 6]} />
            <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={1.5} />
          </mesh>
          <pointLight color={s.color} intensity={0.8} distance={1.5} decay={2} />
        </group>
      ))}
    </>
  )
}

/* ══════════════════════════════════════════════════════
   PLANET LANDING SURFACE — procedural terrain shader
══════════════════════════════════════════════════════ */
function PlanetSurface({ planet, onExit }) {
  const meshRef = useRef()

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(planet.color) },
      uType:  { value: planet.type === 'Gas Giant' ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vElevation;
      uniform float uTime;
      uniform float uType;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vUv=uv;
        vec3 pos=position;
        float n=noise(uv*8.0+uTime*0.02)*0.5+noise(uv*16.0)*0.25+noise(uv*32.0)*0.125;
        if(uType<0.5) pos.z+=n*0.3;
        vElevation=n;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uType;
      varying vec2 vUv;
      varying float vElevation;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        if(uType>0.5){
          // Gas giant — banded
          float band=sin(vUv.y*20.0+noise(vec2(vUv.y*3.0,uTime*0.05))*2.0)*0.5+0.5;
          vec3 c1=uColor; vec3 c2=uColor*0.6+vec3(0.2,0.15,0.05);
          gl_FragColor=vec4(mix(c2,c1,band),1.0);
        } else {
          // Rocky/Oceanic
          float n=vElevation;
          vec3 ocean=vec3(0.1,0.3,0.7);
          vec3 land=uColor;
          vec3 snow=vec3(0.9,0.95,1.0);
          vec3 col=n<0.35?ocean:(n>0.75?snow:land);
          col*=0.7+n*0.6;
          gl_FragColor=vec4(col,1.0);
        }
      }`,
  }), [planet])

  useFrame(({ clock }) => {
    if (mat) mat.uniforms.uTime.value = clock.getElapsedTime()
    if (meshRef.current) meshRef.current.rotation.y += 0.0008
  })

  return (
    <group>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={3} color="#fff8e0" />
      <mesh ref={meshRef}>
        <sphereGeometry args={[3, 128, 128]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Atmosphere */}
      <mesh>
        <sphereGeometry args={[3.15, 32, 32]} />
        <meshBasicMaterial color={planet.color} transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      {/* Stars in background */}
      <Stars radius={80} depth={30} count={3000} factor={2} saturation={0.2} fade />
    </group>
  )
}

/* ══════════════════════════════════════════════════════
   SPACESHIP FLY MODE
══════════════════════════════════════════════════════ */
function SpaceshipMode({ active }) {
  const { camera, gl } = useThree()
  const keys   = useRef({})
  const mouse  = useRef({ down:false, lastX:0, lastY:0 })
  const yaw    = useRef(-Math.PI*0.5)
  const pitch  = useRef(-0.15)
  const vel    = useRef(new THREE.Vector3())
  const fuelRef = useRef(100)

  useEffect(() => {
    if (!active) return
    camera.position.set(30, 5, 20)
    yaw.current = -Math.PI * 0.5
    pitch.current = -0.15

    const onKey = e => { keys.current[e.code] = e.type === 'keydown' }
    const onMD  = e => { mouse.current.down=true; mouse.current.lastX=e.clientX; mouse.current.lastY=e.clientY }
    const onMU  = ()  => { mouse.current.down=false }
    const onMM  = e  => {
      if (!mouse.current.down) return
      yaw.current   -= (e.clientX - mouse.current.lastX) * 0.003
      pitch.current -= (e.clientY - mouse.current.lastY) * 0.003
      pitch.current  = Math.max(-1.2, Math.min(1.2, pitch.current))
      mouse.current.lastX = e.clientX; mouse.current.lastY = e.clientY
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup',   onKey)
    gl.domElement.addEventListener('mousedown', onMD)
    window.addEventListener('mouseup',  onMU)
    window.addEventListener('mousemove', onMM)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup',   onKey)
      gl.domElement.removeEventListener('mousedown', onMD)
      window.removeEventListener('mouseup',  onMU)
      window.removeEventListener('mousemove', onMM)
    }
  }, [active])

  useFrame((_, dt) => {
    if (!active) return
    const fwd = new THREE.Vector3(
      Math.sin(yaw.current)*Math.cos(pitch.current),
      Math.sin(pitch.current),
      Math.cos(yaw.current)*Math.cos(pitch.current)
    ).normalize()
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize()
    const boost = (keys.current['ShiftLeft']||keys.current['ShiftRight']) ? 5 : 1
    const spd   = 0.1 * boost

    let moving = false
    if (keys.current['KeyW']||keys.current['ArrowUp'])    { vel.current.addScaledVector(fwd,   spd); moving=true }
    if (keys.current['KeyS']||keys.current['ArrowDown'])  { vel.current.addScaledVector(fwd,  -spd); moving=true }
    if (keys.current['KeyA']||keys.current['ArrowLeft'])  { vel.current.addScaledVector(right,-spd); moving=true }
    if (keys.current['KeyD']||keys.current['ArrowRight']) { vel.current.addScaledVector(right, spd); moving=true }
    if (keys.current['KeyQ']) vel.current.y += spd * 0.5
    if (keys.current['KeyE']) vel.current.y -= spd * 0.5

    vel.current.multiplyScalar(0.88)
    camera.position.add(vel.current)
    camera.lookAt(camera.position.clone().add(fwd))
  })

  return null
}

/* ══════════════════════════════════════════════════════
   WARP JUMP
══════════════════════════════════════════════════════ */
function WarpEffect({ active }) {
  const ref = useRef()
  const mat = useRef()
  const count = 800

  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 2 + Math.random() * 10
      pos[i*3]   = r*Math.sin(phi)*Math.cos(theta)
      pos[i*3+1] = r*Math.sin(phi)*Math.sin(theta)
      pos[i*3+2] = r*Math.cos(phi)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  const shaderMat = useMemo(() => new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uProgress:{ value:0 } },
    vertexShader:`uniform float uProgress;void main(){vec3 p=position*(1.0+uProgress*10.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);gl_PointSize=mix(1.0,4.0,uProgress);}`,
    fragmentShader:`uniform float uProgress;void main(){float a=uProgress*0.9;gl_FragColor=vec4(0.6,0.8,1.0,a);}`,
  }), [])

  useFrame((_, dt) => {
    if (active) shaderMat.uniforms.uProgress.value = Math.min(shaderMat.uniforms.uProgress.value+dt*1.5,1)
    else        shaderMat.uniforms.uProgress.value = Math.max(shaderMat.uniforms.uProgress.value-dt*2.5,0)
  })

  return <points ref={ref} geometry={geo} material={shaderMat} />
}

/* ══════════════════════════════════════════════════════
   BLACK HOLE
══════════════════════════════════════════════════════ */
function BlackHole() {
  const diskRef=useRef(),disk2Ref=useRef(),jetRef=useRef(),lensRef=useRef()
  useFrame(({clock})=>{
    const t=clock.getElapsedTime()
    if(diskRef.current)diskRef.current.rotation.z+=0.008
    if(disk2Ref.current)disk2Ref.current.rotation.z-=0.005
    if(jetRef.current){jetRef.current.material.opacity=0.3+Math.sin(t*2.5)*0.1}
    if(lensRef.current){lensRef.current.rotation.z+=0.002;lensRef.current.material.opacity=0.06+Math.sin(t*0.5)*0.02}
  })
  return(
    <group>
      <mesh ref={lensRef}><ringGeometry args={[5.5,9,128]}/><meshBasicMaterial color="#ffcc66" transparent opacity={0.06} side={THREE.DoubleSide}/></mesh>
      <mesh><ringGeometry args={[3.8,4.2,128]}/><meshBasicMaterial color="#ffffff" transparent opacity={0.25} side={THREE.DoubleSide}/></mesh>
      <mesh ref={diskRef} rotation={[Math.PI*0.08,0,0]}><ringGeometry args={[4.5,9,128,4]}/><meshBasicMaterial color="#ff6600" transparent opacity={0.55} side={THREE.DoubleSide}/></mesh>
      <mesh ref={disk2Ref} rotation={[Math.PI*0.08,0,0.3]}><ringGeometry args={[4.2,5.5,128,4]}/><meshBasicMaterial color="#ffcc00" transparent opacity={0.7} side={THREE.DoubleSide}/></mesh>
      <mesh><sphereGeometry args={[3.6,32,32]}/><meshBasicMaterial color="#000000"/></mesh>
      <mesh ref={jetRef}><cylinderGeometry args={[0.08,0.6,28,16,1,true]}/><meshBasicMaterial color="#88aaff" transparent opacity={0.3} side={THREE.DoubleSide}/></mesh>
      <mesh rotation={[Math.PI,0,0]}><cylinderGeometry args={[0.08,0.6,28,16,1,true]}/><meshBasicMaterial color="#88aaff" transparent opacity={0.3} side={THREE.DoubleSide}/></mesh>
      <pointLight color="#ff8800" intensity={8} distance={80} decay={1.5}/>
      <Html distanceFactor={30} position={[0,10,0]} center style={{pointerEvents:'none'}}>
        <div style={{fontFamily:"'Courier New',monospace",fontSize:10,color:'#ffaa44',textShadow:'0 0 10px #ff6600',letterSpacing:2,whiteSpace:'nowrap'}}>SAGITTARIUS A*</div>
      </Html>
    </group>
  )
}

/* ══════════════════════════════════════════════════════
   GALAXY PARTICLES
══════════════════════════════════════════════════════ */
function GalaxyParticles({ rotSpeed }) {
  const gRef=useRef(),dRef=useRef(),bRef=useRef()
  const ARM_COLS=[new THREE.Color('#a8d4ff'),new THREE.Color('#ffd8a8'),new THREE.Color('#c8a8ff'),new THREE.Color('#a8ffcc')]

  const mkGeo=(pos,col,sz)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('size',new THREE.BufferAttribute(sz,1));return g}

  const{gPos,gCol,gSz}=useMemo(()=>{
    const gPos=new Float32Array(GC.STARS*3),gCol=new Float32Array(GC.STARS*3),gSz=new Float32Array(GC.STARS)
    for(let i=0;i<GC.STARS;i++){
      const arm=i%GC.ARMS,aOff=(arm/GC.ARMS)*Math.PI*2,r=Math.pow(Math.random(),0.55)*GC.RADIUS
      const angle=aOff+spiralA(r,GC.WIND),spread=gaussRand(0,GC.SPREAD*(1+r*0.016))
      gPos[i*3]=Math.cos(angle+spread)*r;gPos[i*3+1]=gaussRand(0,0.15+r*0.007);gPos[i*3+2]=Math.sin(angle+spread)*r
      const base=ARM_COLS[arm].clone().lerp(new THREE.Color('#fff'),Math.max(0,1-r/GC.RADIUS)*0.5),br=0.55+Math.random()*0.45
      gCol[i*3]=base.r*br;gCol[i*3+1]=base.g*br;gCol[i*3+2]=base.b*br
      gSz[i]=Math.random()<0.015?0.9+Math.random():0.08+Math.random()*0.35
    }
    return{gPos,gCol,gSz}
  },[])

  const{dPos,dCol,dSz}=useMemo(()=>{
    const NCOLS=['#ff6030','#3060ff','#ff30a0','#30d0ff','#a030ff','#ff9030']
    const dPos=new Float32Array(GC.DUST*3),dCol=new Float32Array(GC.DUST*3),dSz=new Float32Array(GC.DUST)
    for(let i=0;i<GC.DUST;i++){
      const arm=i%GC.ARMS,ao=(arm/GC.ARMS)*Math.PI*2,r=Math.pow(Math.random(),0.5)*GC.RADIUS*0.88
      const a=ao+spiralA(r,GC.WIND)+0.22,sp=gaussRand(0,GC.SPREAD*1.9)
      dPos[i*3]=Math.cos(a+sp)*r;dPos[i*3+1]=gaussRand(0,0.28+r*0.005);dPos[i*3+2]=Math.sin(a+sp)*r
      const c=new THREE.Color(NCOLS[i%NCOLS.length]),f=0.07+Math.random()*0.13
      dCol[i*3]=c.r*f;dCol[i*3+1]=c.g*f;dCol[i*3+2]=c.b*f;dSz[i]=1.8+Math.random()*5.5
    }
    return{dPos,dCol,dSz}
  },[])

  const bulgeGeo=useMemo(()=>{
    const bPos=new Float32Array(GC.BULGE*3),bCol=new Float32Array(GC.BULGE*3),bSz=new Float32Array(GC.BULGE)
    for(let i=0;i<GC.BULGE;i++){
      const r=Math.abs(gaussRand(0,GC.CORE_R)),theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1)
      bPos[i*3]=r*Math.sin(phi)*Math.cos(theta);bPos[i*3+1]=r*Math.sin(phi)*Math.sin(theta)*0.4;bPos[i*3+2]=r*Math.cos(phi)
      const w=0.7+Math.random()*0.3;bCol[i*3]=w;bCol[i*3+1]=w*0.72;bCol[i*3+2]=w*0.32;bSz[i]=0.08+Math.random()*0.45
    }
    return mkGeo(bPos,bCol,bSz)
  },[])

  const gGeo=useMemo(()=>mkGeo(gPos,gCol,gSz),[gPos,gCol,gSz])
  const dGeo=useMemo(()=>mkGeo(dPos,dCol,dSz),[dPos,dCol,dSz])

  const starMat=useMemo(()=>new THREE.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`attribute float size;varying vec3 vColor;void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*(340.0/-mv.z);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=1.0-smoothstep(0.08,0.5,d);gl_FragColor=vec4(vColor,a);}`}),[])
  const dustMat=useMemo(()=>new THREE.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`attribute float size;varying vec3 vColor;void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*(420.0/-mv.z);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=0.16*(1.0-smoothstep(0.0,0.5,d));gl_FragColor=vec4(vColor,a);}`}),[])

  useFrame((_,dt)=>{const s=GC.ROT*rotSpeed*dt*60;if(gRef.current)gRef.current.rotation.y+=s;if(dRef.current)dRef.current.rotation.y+=s*0.95;if(bRef.current)bRef.current.rotation.y+=s*1.08})

  return(<><points ref={dRef} geometry={dGeo} material={dustMat}/><points ref={gRef} geometry={gGeo} material={starMat}/><points ref={bRef} geometry={bulgeGeo} material={starMat}/></>)
}

/* ══════════════════════════════════════════════════════
   NAMED STAR SYSTEMS
══════════════════════════════════════════════════════ */
function StarSystem({ data, onSelect, selected, camDist }) {
  const ref=useRef()
  const isSelected=selected===data.name
  const scale=isSelected?(data.size||1.2)*1.6:(data.size||1.2)
  const sc=SPECTRAL_COLORS[data.spectral]||data.color
  useFrame(({clock})=>{if(!ref.current||!data.special)return;ref.current.scale.setScalar(1+Math.sin(clock.getElapsedTime()*1.8)*0.15)})
  if(camDist>60&&!data.special)return null
  return(
    <group position={data.pos}>
      {isSelected&&<mesh><sphereGeometry args={[scale*0.9,16,16]}/><meshBasicMaterial color={sc} transparent opacity={0.12} side={THREE.BackSide}/></mesh>}
      <mesh ref={ref} onClick={e=>{e.stopPropagation();onSelect(data)}} onPointerEnter={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerLeave={()=>document.body.style.cursor='default'}>
        <sphereGeometry args={[scale*0.22,12,12]}/>
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={2.5}/>
      </mesh>
      <pointLight color={sc} intensity={isSelected?2.5:0.8} distance={isSelected?6:2} decay={2}/>
      {(camDist<30||data.special||isSelected)&&(<Html distanceFactor={18} center style={{pointerEvents:'none'}}><div style={{fontFamily:"'Courier New',monospace",fontSize:data.special?13:10,color:isSelected?'#fff':(data.special?'#ffee88':'#88aacc'),whiteSpace:'nowrap',textShadow:`0 0 8px ${sc}`,marginTop:-28,letterSpacing:1,fontWeight:data.special?700:400}}>{data.name}</div></Html>)}
    </group>
  )
}

function CameraIntro({ done, onDone }) {
  const{camera}=useThree();const t=useRef(0)
  const s=useMemo(()=>new THREE.Vector3(0,280,380),[])
  const e=useMemo(()=>new THREE.Vector3(0,95,170),[])
  useEffect(()=>{camera.position.copy(s);camera.lookAt(0,0,0)},[])
  useFrame((_,dt)=>{if(done)return;t.current=Math.min(t.current+dt*0.22,1);const ease=t.current<.5?2*t.current*t.current:-1+(4-2*t.current)*t.current;camera.position.lerpVectors(s,e,ease);camera.lookAt(0,0,0);if(t.current>=1)onDone()})
  return null
}
function CamDistTracker({ onChange }) {
  const{camera}=useThree();const last=useRef(0)
  useFrame(()=>{const d=camera.position.length();if(Math.abs(d-last.current)>0.5){last.current=d;onChange(d)}})
  return null
}

/* ══════════════════════════════════════════════════════
   COCKPIT HUD OVERLAY — shown in fly mode
══════════════════════════════════════════════════════ */
function CockpitHUD({ active, speed: simSpeed }) {
  const [coords,   setCoords]   = useState({ x:30, y:5, z:20 })
  const [velocity, setVelocity] = useState(0)
  const [fuel,     setFuel]     = useState(100)
  const [heading,  setHeading]  = useState(0)

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setCoords(c => ({
        x: +(c.x + (Math.random()-.5)*0.1).toFixed(2),
        y: +(c.y + (Math.random()-.5)*0.05).toFixed(2),
        z: +(c.z + (Math.random()-.5)*0.1).toFixed(2),
      }))
      setVelocity(v => Math.max(0, Math.min(100, v + (Math.random()-.5)*8)))
      setFuel(f => Math.max(0, f - 0.05))
      setHeading(h => (h + (Math.random()-.5)*2 + 360) % 360)
    }, 100)
    return () => clearInterval(id)
  }, [active])

  if (!active) return null

  const fuelColor = fuel > 50 ? '#44ffaa' : fuel > 25 ? '#ffcc44' : '#ff4444'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', zIndex: 15,
      fontFamily: "'Courier New', monospace",
    }}>
      {/* Corner brackets */}
      {[
        { top:16,left:16,  borderTop:'2px solid #44ffcc66', borderLeft:'2px solid #44ffcc66' },
        { top:16,right:16, borderTop:'2px solid #44ffcc66', borderRight:'2px solid #44ffcc66' },
        { bottom:16,left:16,  borderBottom:'2px solid #44ffcc66', borderLeft:'2px solid #44ffcc66' },
        { bottom:16,right:16, borderBottom:'2px solid #44ffcc66', borderRight:'2px solid #44ffcc66' },
      ].map((s,i) => (
        <div key={i} style={{ position:'absolute', width:40, height:40, ...s }} />
      ))}

      {/* Center crosshair */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        width:20, height:20,
        border:'1px solid rgba(68,255,204,0.5)',
        borderRadius:'50%',
      }}>
        <div style={{ position:'absolute', top:'50%', left:-8, width:6, height:1, background:'rgba(68,255,204,0.5)' }}/>
        <div style={{ position:'absolute', top:'50%', right:-8, width:6, height:1, background:'rgba(68,255,204,0.5)' }}/>
        <div style={{ position:'absolute', left:'50%', top:-8, width:1, height:6, background:'rgba(68,255,204,0.5)' }}/>
        <div style={{ position:'absolute', left:'50%', bottom:-8, width:1, height:6, background:'rgba(68,255,204,0.5)' }}/>
      </div>

      {/* Top center — speed + heading */}
      <div style={{
        position:'absolute', top:20, left:'50%', transform:'translateX(-50%)',
        background:'rgba(0,8,20,0.8)', border:'1px solid rgba(68,255,204,0.2)',
        borderRadius:6, padding:'6px 20px', textAlign:'center',
      }}>
        <div style={{ fontSize:8, color:'#224433', letterSpacing:3 }}>HEADING</div>
        <div style={{ fontSize:16, color:'#44ffcc', letterSpacing:4, fontWeight:700 }}>
          {Math.round(heading).toString().padStart(3,'0')}°
        </div>
      </div>

      {/* Bottom left — coordinates */}
      <div style={{
        position:'absolute', bottom:80, left:24,
        background:'rgba(0,8,20,0.85)', border:'1px solid rgba(68,255,204,0.15)',
        borderRadius:8, padding:'10px 14px',
      }}>
        <div style={{ fontSize:7, color:'#224433', letterSpacing:2, marginBottom:6 }}>COORDINATES</div>
        {[['X',coords.x],['Y',coords.y],['Z',coords.z]].map(([k,v])=>(
          <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:3 }}>
            <span style={{ fontSize:8, color:'#336655', letterSpacing:1 }}>{k}</span>
            <span style={{ fontSize:9, color:'#44ffcc' }}>{v.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Bottom right — velocity + fuel */}
      <div style={{
        position:'absolute', bottom:80, right:24,
        background:'rgba(0,8,20,0.85)', border:'1px solid rgba(68,255,204,0.15)',
        borderRadius:8, padding:'10px 14px', minWidth:120,
      }}>
        <div style={{ fontSize:7, color:'#224433', letterSpacing:2, marginBottom:6 }}>SYSTEMS</div>
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:7, color:'#336655', letterSpacing:1, marginBottom:2 }}>VELOCITY</div>
          <div style={{ fontSize:11, color:'#44ffcc', fontWeight:700 }}>{velocity.toFixed(1)} <span style={{ fontSize:7 }}>km/s</span></div>
        </div>
        <div>
          <div style={{ fontSize:7, color:'#336655', letterSpacing:1, marginBottom:3 }}>FUEL</div>
          <div style={{ background:'rgba(0,30,20,0.5)', borderRadius:3, height:6, overflow:'hidden' }}>
            <div style={{ width:`${fuel}%`, height:'100%', background:fuelColor, transition:'width 0.1s, background 0.5s' }}/>
          </div>
          <div style={{ fontSize:8, color:fuelColor, marginTop:2 }}>{fuel.toFixed(0)}%</div>
        </div>
      </div>

      {/* Fly mode label */}
      <div style={{
        position:'absolute', bottom:80, left:'50%', transform:'translateX(-50%)',
        fontSize:8, color:'#224433', letterSpacing:3,
        background:'rgba(0,8,20,0.7)', padding:'4px 12px', borderRadius:10,
        border:'1px solid rgba(68,255,204,0.1)',
      }}>
        WASD MOVE · DRAG LOOK · SHIFT BOOST · ESC EXIT
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MISSION LOG
══════════════════════════════════════════════════════ */
function MissionLog({ show, log }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      position:'absolute', bottom:90, right:24,
      background:'rgba(0,4,12,0.92)', border:'1px solid rgba(60,140,255,0.18)',
      borderRadius:10, padding:'12px 14px', fontFamily:"'Courier New',monospace",
      zIndex:10, opacity:show?1:0, transition:'opacity 1.4s',
      maxWidth:220,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: open?8:0 }}>
        <div>
          <div style={{ fontSize:7, letterSpacing:2, color:'#1a3344' }}>MISSION LOG</div>
          <div style={{ fontSize:9, color:'#44aaff' }}>{log.length} DISCOVERIES</div>
        </div>
        <button onClick={()=>setOpen(o=>!o)} style={{
          background:'rgba(0,40,80,0.4)', border:'1px solid rgba(60,140,255,0.2)',
          color:'#44aaff', cursor:'pointer', borderRadius:4, padding:'2px 7px',
          fontSize:8, fontFamily:'inherit',
        }}>{open?'▲':'▼'}</button>
      </div>
      {open && (
        <div style={{ maxHeight:160, overflowY:'auto' }}>
          {log.length === 0 && <div style={{ fontSize:8, color:'#223344' }}>No discoveries yet. Explore!</div>}
          {log.map((entry, i) => (
            <div key={i} style={{
              fontSize:8, color:'#4488bb', marginBottom:4, padding:'4px 6px',
              background:'rgba(0,20,50,0.3)', borderRadius:4,
              border:'1px solid rgba(40,80,140,0.15)',
            }}>
              <span style={{ color:'#44ffcc', marginRight:4 }}>✓</span>{entry}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   ALIEN CIVILIZATION PANEL
══════════════════════════════════════════════════════ */
function AlienPanel({ civ, onClose, onContact }) {
  if (!civ) return null
  return (
    <div style={{
      position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
      width:320, maxWidth:'calc(100vw - 48px)',
      background:'rgba(0,4,16,0.97)', border:`2px solid ${civ.color}55`,
      borderRadius:14, padding:'22px 24px',
      fontFamily:"'Courier New',monospace", color:'#c8e8ff', zIndex:20,
      boxShadow:`0 0 60px ${civ.color}22`,
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:8, letterSpacing:3, color:civ.color, marginBottom:3 }}>
            ALIEN CIVILIZATION · {civ.type} KARDASHEV
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:'#fff', letterSpacing:1 }}>
            {civ.name}
          </div>
          <div style={{ fontSize:8, color:'#446688', marginTop:3 }}>HOST STAR: {civ.star}</div>
        </div>
        <button onClick={onClose} style={{
          background:'none', border:`1px solid ${civ.color}33`,
          color:'#88aacc', cursor:'pointer', borderRadius:6,
          padding:'4px 9px', fontSize:13, fontFamily:'inherit',
        }}>✕</button>
      </div>

      <div style={{ height:1, background:`linear-gradient(90deg,${civ.color}55,transparent)`, marginBottom:14 }}/>

      <div style={{ fontSize:10, color:'#6699bb', lineHeight:1.8, marginBottom:14 }}>{civ.desc}</div>

      {[
        ['POPULATION',  civ.population],
        ['KARDASHEV',   civ.type],
        ['TECH LEVEL',  civ.tech],
        ['SIGNAL TYPE', civ.signal],
      ].map(([k,v])=>(
        <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:7, fontSize:10 }}>
          <span style={{ color:'#334466', letterSpacing:1 }}>{k}</span>
          <span style={{ color:'#88ddff', fontWeight:600 }}>{v}</span>
        </div>
      ))}

      <div style={{ marginTop:14 }}>
        <button onClick={()=>onContact(civ)} style={{
          width:'100%', background:`rgba(${civ.color},0.15)`,
          background:'rgba(0,80,60,0.25)',
          border:`1px solid ${civ.color}66`,
          color: civ.contact ? '#44ffaa' : civ.color,
          cursor:'pointer', borderRadius:8, padding:'10px 0',
          fontSize:9, letterSpacing:3, fontFamily:'inherit',
        }}>
          {civ.contact ? '✓ CONTACT ESTABLISHED' : '📡 ATTEMPT CONTACT'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN HUD COMPONENTS
══════════════════════════════════════════════════════ */
function TitleHUD({ show, flyMode }) {
  return (
    <div style={{
      position:'absolute', top:24, left:28,
      fontFamily:"'Courier New',monospace", pointerEvents:'none', zIndex:10,
      opacity:show?1:0, transition:'opacity 1.4s ease 0.5s',
    }}>
      <div style={{ fontSize:8, letterSpacing:5, color:'#1a3322', marginBottom:4 }}>COSMOS ENGINE v6.0</div>
      <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:2, lineHeight:1 }}>MILKY WAY</div>
      <div style={{ fontSize:10, color: flyMode?'#44ffcc':'#44aaff', letterSpacing:6, marginTop:3 }}>
        {flyMode ? 'FLY MODE ACTIVE' : 'EXPLORATION'}
      </div>
      {!flyMode && (
        <div style={{ marginTop:14, fontSize:8, color:'#1a2a3a', letterSpacing:2, lineHeight:2.3 }}>
          DRAG · ROTATE<br/>SCROLL · ZOOM<br/>F · FLY MODE<br/>👽 CLICK ALIEN MARKERS
        </div>
      )}
    </div>
  )
}

function ControlsBar({ show, paused, setPaused, speed, setSpeed, flyMode, setFlyMode, warp, setWarp }) {
  return (
    <div style={{
      position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)',
      display:'flex', alignItems:'center', gap:12,
      background:'rgba(0,4,12,0.92)', border:'1px solid rgba(60,140,255,0.18)',
      borderRadius:50, padding:'10px 22px', backdropFilter:'blur(16px)',
      fontFamily:"'Courier New',monospace", zIndex:10, whiteSpace:'nowrap',
      opacity:show?1:0, transition:'opacity 1.4s ease 2s',
    }}>
      <button onClick={()=>setPaused(p=>!p)} style={{
        background:paused?'rgba(80,200,100,0.12)':'rgba(60,140,255,0.12)',
        border:`1px solid ${paused?'rgba(80,200,100,0.4)':'rgba(60,140,255,0.4)'}`,
        color:paused?'#88ee88':'#66aaff', cursor:'pointer', borderRadius:'50%',
        width:34, height:34, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
      }}>{paused?'▶':'⏸'}</button>

      <span style={{ fontSize:8, color:'#223344', letterSpacing:2 }}>SLOW</span>
      <input type="range" min={0.05} max={4} step={0.05} value={speed}
        onChange={e=>setSpeed(Number(e.target.value))}
        style={{ width:80, accentColor:'#4488ff', cursor:'pointer' }} />
      <span style={{ fontSize:8, color:'#223344', letterSpacing:2 }}>FAST</span>
      <span style={{ fontSize:9, color:'#335566', minWidth:44 }}>{speed.toFixed(1)}x</span>

      <div style={{ width:1, height:18, background:'rgba(60,100,180,0.3)' }} />

      <button onClick={()=>setFlyMode(f=>!f)} style={{
        background:flyMode?'rgba(0,200,150,0.18)':'rgba(40,60,120,0.25)',
        border:`1px solid ${flyMode?'rgba(0,200,150,0.5)':'rgba(60,100,180,0.25)'}`,
        color:flyMode?'#44ffcc':'#446688', cursor:'pointer', borderRadius:8,
        padding:'5px 12px', fontSize:8, letterSpacing:2, fontFamily:'inherit',
      }}>{flyMode?'✦ FLY ON':'✦ FLY MODE'}</button>

      <button onClick={()=>setWarp(w=>!w)} style={{
        background:warp?'rgba(100,120,255,0.25)':'rgba(30,40,100,0.2)',
        border:`1px solid ${warp?'rgba(100,140,255,0.6)':'rgba(60,80,160,0.25)'}`,
        color:warp?'#aabbff':'#334466', cursor:'pointer', borderRadius:8,
        padding:'5px 12px', fontSize:8, letterSpacing:2, fontFamily:'inherit',
      }}>{warp?'⚡ WARP ON':'⚡ WARP'}</button>
    </div>
  )
}

function ZoomHint({ camDist, flyMode, show }) {
  if (!show) return null
  const msg = flyMode
    ? 'WASD MOVE · DRAG MOUSE TO LOOK · SHIFT BOOST · ESC EXIT'
    : camDist > 100 ? 'SCROLL IN TO SEE STAR SYSTEMS'
    : camDist > 35  ? 'SCROLL CLOSER FOR SOLAR SYSTEM · 👽 ALIEN MARKERS VISIBLE AT 80'
    : camDist > 15  ? 'CLICK PLANETS · CLICK 👽 TO MEET ALIENS'
    : 'INSIDE SOLAR SYSTEM'
  return (
    <div style={{
      position:'absolute', top:24, left:'50%', transform:'translateX(-50%)',
      fontFamily:"'Courier New',monospace", fontSize:8, letterSpacing:2,
      color:flyMode?'#44ffcc':'#335566', pointerEvents:'none', zIndex:10,
      background:'rgba(0,4,12,0.75)', border:`1px solid rgba(${flyMode?'0,200,150':'40,80,140'},0.2)`,
      borderRadius:20, padding:'6px 18px', whiteSpace:'nowrap', transition:'all 0.4s',
    }}>{msg}</div>
  )
}

function PhaseBadge({ show }) {
  return (
    <div style={{
      position:'absolute', bottom:24, left:24,
      background:'rgba(0,4,12,0.88)', border:'1px solid rgba(60,140,255,0.14)',
      borderRadius:10, padding:'12px 15px', fontFamily:"'Courier New',monospace",
      zIndex:10, opacity:show?1:0, transition:'opacity 1.4s ease 1s',
    }}>
      <div style={{ fontSize:7, letterSpacing:3, color:'#1a2a3a', marginBottom:8 }}>PHASES</div>
      {[
        [1,'Foundation',true],[2,'Star Systems',true],[3,'Cinematic FX',true],
        [4,'Physics Sim',true],[5,'Ultra Realism',true],[6,'Exploration',true],[7,'Multiplayer',false]
      ].map(([n,l,d])=>(
        <div key={n} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
          <div style={{
            width:12, height:12, borderRadius:'50%',
            background:d?'rgba(0,200,120,0.25)':'rgba(40,60,100,0.3)',
            border:`1px solid ${d?'rgba(0,200,120,0.5)':'rgba(40,80,160,0.25)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:5, color:d?'#00dd88':'#223355',
          }}>{d?'✓':n}</div>
          <span style={{ fontSize:7, letterSpacing:1, color:d?'#33cc88':'#223355' }}>{l.toUpperCase()}</span>
        </div>
      ))}
    </div>
  )
}

function StarPanel({ star, onClose }) {
  if (!star) return null
  const sc = SPECTRAL_COLORS[star.spectral]||star.color
  return (
    <div style={{
      position:'absolute', top:'50%', right:24, transform:'translateY(-50%)',
      width:260, maxWidth:'calc(100vw-48px)', maxHeight:'calc(100vh-80px)', overflowY:'auto',
      background:'rgba(0,4,16,0.97)', border:`1px solid ${sc}44`,
      borderRadius:12, padding:'18px 20px', fontFamily:"'Courier New',monospace",
      color:'#c8e8ff', zIndex:20,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:8, letterSpacing:3, color:sc, marginBottom:3 }}>STELLAR SYSTEM</div>
          <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{star.name}</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:`1px solid ${sc}33`, color:'#88aacc', cursor:'pointer', borderRadius:6, padding:'3px 8px', fontSize:12, fontFamily:'inherit' }}>✕</button>
      </div>
      <div style={{ height:1, background:`linear-gradient(90deg,${sc}44,transparent)`, marginBottom:12 }}/>
      <div style={{ fontSize:10, color:'#6699bb', lineHeight:1.8, marginBottom:10 }}>{star.info}</div>
      {star.knownPlanets?.length>0&&(<>
        <div style={{ fontSize:8, letterSpacing:3, color:'#335566', marginBottom:6 }}>KNOWN PLANETS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {star.knownPlanets.map(p=>(<div key={p} style={{ fontSize:9, padding:'3px 8px', background:p.includes('HZ')?'rgba(0,60,30,0.3)':'rgba(0,40,80,0.3)', border:p.includes('HZ')?'1px solid rgba(0,180,80,0.2)':'1px solid rgba(60,140,255,0.12)', borderRadius:4, color:p.includes('HZ')?'#88ddaa':'#88bbdd', display:'flex', alignItems:'center', gap:7 }}><span style={{ color:sc, fontSize:6 }}>●</span>{p}</div>))}
        </div>
      </>)}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════ */
export default function App() {
  const [introDone,     setIntroDone]     = useState(false)
  const [paused,        setPaused]        = useState(false)
  const [speed,         setSpeed]         = useState(1)
  const [camDist,       setCamDist]       = useState(170)
  const [selectedStar,  setSelectedStar]  = useState(null)
  const [selectedPlanet,setSelectedPlanet]= useState(null)
  const [selectedCiv,   setSelectedCiv]   = useState(null)
  const [flyMode,       setFlyMode]       = useState(false)
  const [warp,          setWarp]          = useState(false)
  const [supernova,     setSupernova]     = useState(false)
  const [supernovaPos,  setSupernovaPos]  = useState([27.5,0.3,8.2])
  const [missionLog,    setMissionLog]    = useState([])
  const [landingPlanet, setLandingPlanet] = useState(null)
  const [civs,          setCivs]          = useState(ALIEN_CIVS)

  // F = fly mode toggle, Escape = exit
  useEffect(() => {
    const onKey = e => {
      if (e.code === 'KeyF')   setFlyMode(f => !f)
      if (e.code === 'Escape') { setFlyMode(false); setLandingPlanet(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleCivSelect = useCallback((civ) => {
    setSelectedCiv(civ)
    setMissionLog(l => l.includes(`Discovered: ${civ.name}`) ? l : [...l, `Discovered: ${civ.name}`])
  }, [])

  const handleContact = useCallback((civ) => {
    setCivs(cs => cs.map(c => c.name === civ.name ? { ...c, contact: true } : c))
    setMissionLog(l => [...l, `Contact made: ${civ.name}`])
    setSelectedCiv(c => c ? { ...c, contact: true } : c)
  }, [])

  const handleStarSelect = useCallback((star) => {
    setSelectedStar(star)
    setMissionLog(l => l.includes(`Visited: ${star.name}`) ? l : [...l, `Visited: ${star.name}`])
  }, [])

  const handlePlanetSelect = useCallback((planet) => {
    setSelectedPlanet(planet)
    setMissionLog(l => l.includes(`Scanned: ${planet.name}`) ? l : [...l, `Scanned: ${planet.name}`])
  }, [])

  // Landing mode — show planet surface
  if (landingPlanet) {
    return (
      <div style={{ width:'100vw', height:'100vh', background:'#000', position:'relative' }}>
        <Canvas camera={{ position:[0,0,8], fov:60 }} gl={{ antialias:true }}>
          <PlanetSurface planet={landingPlanet} />
          <EffectComposer>
            <Bloom intensity={0.8} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
            <Vignette darkness={0.7} offset={0.2} blendFunction={BlendFunction.NORMAL} />
          </EffectComposer>
          <OrbitControls enableZoom enablePan={false} rotateSpeed={0.4} />
        </Canvas>

        <div style={{
          position:'absolute', top:24, left:'50%', transform:'translateX(-50%)',
          fontFamily:"'Courier New',monospace", textAlign:'center',
          pointerEvents:'none', zIndex:10,
        }}>
          <div style={{ fontSize:10, color:'#44ffcc', letterSpacing:4 }}>SURFACE OF</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:3 }}>{landingPlanet.name}</div>
          <div style={{ fontSize:8, color:'#446655', letterSpacing:2, marginTop:4 }}>
            {landingPlanet.type} · AVG TEMP: {landingPlanet.temp}°C
          </div>
        </div>

        <button onClick={()=>setLandingPlanet(null)} style={{
          position:'absolute', bottom:30, left:'50%', transform:'translateX(-50%)',
          background:'rgba(0,40,30,0.8)', border:'1px solid rgba(68,255,204,0.4)',
          color:'#44ffcc', cursor:'pointer', borderRadius:8,
          padding:'10px 28px', fontSize:9, letterSpacing:3,
          fontFamily:"'Courier New',monospace",
        }}>
          ← LEAVE SURFACE
        </button>
      </div>
    )
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{overflow:hidden;background:#00000a;}
        button:hover{filter:brightness(1.28);}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(60,120,255,0.2);border-radius:2px;}
      `}</style>

      <div style={{ width:'100vw', height:'100vh', position:'relative', background:'#00000a' }}>
        <Canvas
          camera={{ position:[0,95,170], fov:58, near:0.01, far:8000 }}
          gl={{ antialias:true, alpha:false, toneMapping:THREE.ACESFilmicToneMapping }}
        >
          <ambientLight intensity={0.015}/>
          <Stars radius={800} depth={250} count={6000} factor={3} saturation={0.2} fade speed={0.08}/>

          {!introDone && <CameraIntro done={introDone} onDone={()=>setIntroDone(true)}/>}
          <CamDistTracker onChange={setCamDist}/>

          {/* Fly mode */}
          <SpaceshipMode active={flyMode}/>
          <WarpEffect active={warp}/>

          {/* Galaxy */}
          <GalaxyParticles rotSpeed={paused?0:speed}/>
          <BlackHole/>

          {/* Solar System */}
          <SolarSystem onPlanetSelect={handlePlanetSelect} camDist={camDist} speed={speed} paused={paused}/>

          {/* Phase 6: Alien civilizations */}
          {civs.map(civ => (
            <AlienMarker key={civ.name} civ={civ} onSelect={handleCivSelect}
              selected={selectedCiv?.name} camDist={camDist} />
          ))}

          {/* Phase 6: Space station + mining ships */}
          <SpaceStation camDist={camDist}/>
          <MiningShips camDist={camDist}/>

          {/* Stars */}
          {REAL_STARS.map(s=>(
            <StarSystem key={s.name} data={s} onSelect={handleStarSelect}
              selected={selectedStar?.name} camDist={camDist}/>
          ))}

          {/* Supernova */}
          {supernova && (
            <group>
              <mesh position={supernovaPos}>
                <sphereGeometry args={[0.01,8,8]}/>
                <meshBasicMaterial color="#fff"/>
              </mesh>
            </group>
          )}

          <Sparkles count={100} scale={[400,80,400]} size={1.2} speed={0.015} color="#aabbff" opacity={0.1}/>

          {!flyMode && (
            <OrbitControls enableZoom zoomSpeed={0.75} minDistance={3} maxDistance={500}
              enableDamping dampingFactor={0.05} rotateSpeed={0.35} enablePan={false}/>
          )}

          <EffectComposer>
            <Bloom intensity={1.6} luminanceThreshold={0.12} luminanceSmoothing={0.9} mipmapBlur/>
            <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0006,0.0006]}/>
            <Vignette darkness={0.6} offset={0.3} blendFunction={BlendFunction.NORMAL}/>
          </EffectComposer>
        </Canvas>

        {/* Cockpit HUD overlay — fly mode */}
        <CockpitHUD active={flyMode} speed={speed}/>

        {/* HUD */}
        <TitleHUD show={introDone} flyMode={flyMode}/>
        <ZoomHint camDist={camDist} flyMode={flyMode} show={introDone}/>
        <ControlsBar show={introDone} paused={paused} setPaused={setPaused}
          speed={speed} setSpeed={setSpeed}
          flyMode={flyMode} setFlyMode={setFlyMode}
          warp={warp} setWarp={setWarp}/>
        <PhaseBadge show={introDone}/>
        <MissionLog show={introDone} log={missionLog}/>

        {/* Panels */}
        <StarPanel star={selectedStar} onClose={()=>setSelectedStar(null)}/>
        <AlienPanel civ={selectedCiv} onClose={()=>setSelectedCiv(null)} onContact={handleContact}/>

        {/* Planet panel with LAND button */}
        {selectedPlanet && (
          <div style={{
            position:'absolute', bottom:90, left:'50%', transform:'translateX(-50%)',
            width:300, background:'rgba(0,4,16,0.97)',
            border:`1px solid ${selectedPlanet.color}44`, borderRadius:12, padding:'16px 18px',
            fontFamily:"'Courier New',monospace", color:'#c8e8ff', zIndex:20,
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:8, letterSpacing:3, color:selectedPlanet.color }}>{selectedPlanet.type}</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{selectedPlanet.name}</div>
              </div>
              <button onClick={()=>setSelectedPlanet(null)} style={{ background:'none', border:`1px solid ${selectedPlanet.color}33`, color:'#88aacc', cursor:'pointer', borderRadius:6, padding:'3px 8px', fontSize:12, fontFamily:'inherit' }}>✕</button>
            </div>
            <div style={{ height:1, background:`linear-gradient(90deg,${selectedPlanet.color}44,transparent)`, marginBottom:10 }}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5, marginBottom:12 }}>
              {[['MOONS',selectedPlanet.moons],['TILT',`${selectedPlanet.tilt}°`],['TEMP',`${selectedPlanet.temp}°C`]].map(([l,v])=>(
                <div key={l} style={{ background:'rgba(0,30,60,0.4)', borderRadius:5, padding:'5px 7px', textAlign:'center' }}>
                  <div style={{ fontSize:6, color:'#334455', letterSpacing:1 }}>{l}</div>
                  <div style={{ fontSize:9, color:'#88bbdd', marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>{ setLandingPlanet(selectedPlanet); setSelectedPlanet(null) }} style={{
              width:'100%', background:`rgba(0,60,40,0.3)`,
              border:`1px solid ${selectedPlanet.color}66`,
              color:selectedPlanet.color, cursor:'pointer', borderRadius:8,
              padding:'9px 0', fontSize:9, letterSpacing:3, fontFamily:'inherit',
            }}>
              🚀 LAND ON {selectedPlanet.name.toUpperCase()}
            </button>
          </div>
        )}
      </div>
    </>
  )
}