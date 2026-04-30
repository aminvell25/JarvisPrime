// J.A.R.V.I.S. Prime — Orb Renderer
const CONFIG = {
  WS_CMD: 'ws://localhost:8000/socket-b',
  WS_AUDIO: 'ws://localhost:8000/socket-a',
  AUDIO_SAMPLE_RATE: 16000,
  FFT_SIZE: 256,
  VAD_TH: 0.012
};

const STATES = {
  IDLE:       {c:0x0044aa,s:0.3,n:0.2,sc:1.0,e:0.1},
  LISTENING:  {c:0x00d9ff,s:2.5,n:0.8,sc:1.15,e:0.4},
  THINKING:   {c:0xffaa00,s:4.0,n:1.2,sc:0.9,e:0.6},
  SPEAKING:   {c:0x00ff9f,s:1.8,n:0.5,sc:1.05,e:0.5},
  BANTER:     {c:0xff44aa,s:3.0,n:0.9,sc:1.1,e:0.5},
  ALERT:      {c:0xff0040,s:5.0,n:1.5,sc:1.2,e:0.8},
  SYSTEM:     {c:0xaa00ff,s:1.0,n:0.4,sc:1.0,e:0.3},
  INTRO:      {c:0xffffff,s:6.0,n:2.0,sc:1.3,e:1.0}
};

let curState='IDLE', tgtState='IDLE', stTrans=0;
let prevState='IDLE';
let spinX=0, spinY=0, spinZ=0, transitionEnergy=0;

import * as THREE from 'three';

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x000000,0.02);
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.1,100);
camera.position.set(0,0,6);
const renderer3d=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer3d.setSize(innerWidth,innerHeight);
renderer3d.setPixelRatio(Math.min(devicePixelRatio,2));
renderer3d.toneMapping=THREE.ACESFilmicToneMapping;
document.getElementById('canvas-container').appendChild(renderer3d.domElement);

scene.add(new THREE.AmbientLight(0x111122,0.5));
const coreLight=new THREE.PointLight(0x00d9ff,2,20);coreLight.position.set(0,0,2);scene.add(coreLight);
const rimLight=new THREE.PointLight(0x0044ff,1,15);rimLight.position.set(-5,3,-3);scene.add(rimLight);
const botLight=new THREE.PointLight(0x00ff9f,0.5,10);botLight.position.set(0,-4,2);scene.add(botLight);


// Shader Orb
const vShader=`
  uniform float uTime,uNoise,uSpeed;
  varying vec2 vUv; varying vec3 vNormal; varying float vDisp;
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  void main(){
    vUv=uv; vNormal=normal;
    float t=uTime*uSpeed;
    float n=snoise(position*1.5+vec3(t*0.3,t*0.2,t*0.4));
    vDisp=n;
    vec3 np=position+normal*n*uNoise*0.4;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(np,1.0);
  }`;

const fShader=`
  uniform vec3 uColor; uniform float uEmissive,uTime;
  varying vec2 vUv; varying vec3 vNormal; varying float vDisp;
  void main(){
    vec3 vd=normalize(cameraPosition-vNormal);
    float fresnel=pow(1.0-dot(vd,vNormal),3.0);
    vec3 bc=uColor; vec3 gc=uColor*2.0;
    float pulse=sin(uTime*3.0)*0.5+0.5;
    float dg=smoothstep(0.0,1.0,vDisp*0.5+0.5);
    vec3 fc=mix(bc,gc,fresnel*0.8+dg*0.3);
    fc+=uColor*pulse*0.2*uEmissive;
    gl_FragColor=vec4(fc,0.85+fresnel*0.15);
  }`;

const orbMat=new THREE.ShaderMaterial({
  vertexShader:vShader, fragmentShader:fShader,
  uniforms:{
    uTime:{value:0}, uColor:{value:new THREE.Color(STATES.IDLE.c)},
    uNoise:{value:STATES.IDLE.n}, uSpeed:{value:STATES.IDLE.s}, uEmissive:{value:STATES.IDLE.e}
  },
  transparent:true, side:THREE.DoubleSide, blending:THREE.AdditiveBlending
});
const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(1.5,4),orbMat);
scene.add(orb);


// Anelli
function ring(radius,tube,color,speed,tx,ty){
  const g=new THREE.TorusGeometry(radius,tube,16,100);
  const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.3,blending:THREE.AdditiveBlending});
  const mesh=new THREE.Mesh(g,m);
  mesh.rotation.x=tx; mesh.rotation.y=ty;
  return {mesh,speed};
}
const rings=[
  ring(2.2,0.02,0x00d9ff,0.5,0.4,0.2),
  ring(2.5,0.015,0x0044ff,-0.3,0.8,0.5),
  ring(1.8,0.01,0x00ff9f,0.8,1.2,0.1),
  ring(3.0,0.008,0xaa00ff,-0.6,0.3,0.9)
];
rings.forEach(r=>scene.add(r.mesh));

// Particelle legacy rimosse — ora usa particle cloud system (1500 particelle)

// Glow sprite
const cvs=document.createElement('canvas'); cvs.width=128; cvs.height=128;
const gctx=cvs.getContext('2d');
const grd=gctx.createRadialGradient(64,64,0,64,64,60);
grd.addColorStop(0,'rgba(0,217,255,1)'); grd.addColorStop(1,'rgba(0,217,255,0)');
gctx.fillStyle=grd; gctx.fillRect(0,0,128,128);
const glowTex=new THREE.CanvasTexture(cvs);
const glowMat=new THREE.SpriteMaterial({map:glowTex,color:0x00d9ff,transparent:true,opacity:0.4,blending:THREE.AdditiveBlending});
const glowSprite=new THREE.Sprite(glowMat); glowSprite.scale.set(6,6,1); scene.add(glowSprite);


// ===================== PARTICLE CLOUD SYSTEM (PROMPT 4) =====================
const PARTICLE_COUNT=1500;
const PARTICLE_RADIUS=3.5;
const PARTICLE_MIN_RADIUS=2.5;
const PARTICLE_MAX_RADIUS=5.0;

const particleGroup=new THREE.Group();
scene.add(particleGroup);

// Particelle
const pcGeo=new THREE.BufferGeometry();
const pcPos=new Float32Array(PARTICLE_COUNT*3);
const pcVel=new Float32Array(PARTICLE_COUNT*3);
const pcPhase=new Float32Array(PARTICLE_COUNT);
const pcBasePos=new Float32Array(PARTICLE_COUNT*3);

for(let i=0;i<PARTICLE_COUNT;i++){
  const phi=Math.acos(2*Math.random()-1);
  const theta=Math.random()*Math.PI*2;
  const r=PARTICLE_MIN_RADIUS+Math.random()*(PARTICLE_MAX_RADIUS-PARTICLE_MIN_RADIUS);
  const x=r*Math.sin(phi)*Math.cos(theta);
  const y=r*Math.sin(phi)*Math.sin(theta);
  const z=r*Math.cos(phi);
  pcPos[i*3]=x; pcPos[i*3+1]=y; pcPos[i*3+2]=z;
  pcBasePos[i*3]=x; pcBasePos[i*3+1]=y; pcBasePos[i*3+2]=z;
  pcVel[i*3]=(Math.random()-0.5)*0.01;
  pcVel[i*3+1]=(Math.random()-0.5)*0.01;
  pcVel[i*3+2]=(Math.random()-0.5)*0.01;
  pcPhase[i]=Math.random()*Math.PI*2;
}
pcGeo.setAttribute('position',new THREE.BufferAttribute(pcPos,3));
const pcMat=new THREE.PointsMaterial({size:0.04,color:0x4ca8e8,transparent:true,opacity:0.7,blending:THREE.AdditiveBlending,depthWrite:false});
const particleCloud=new THREE.Points(pcGeo,pcMat);
particleGroup.add(particleCloud);

// Linee di connessione
const MAX_LINES=4000;
const lineGeo=new THREE.BufferGeometry();
const linePos=new Float32Array(MAX_LINES*6);
lineGeo.setAttribute('position',new THREE.BufferAttribute(linePos,3));
const lineMat=new THREE.LineBasicMaterial({color:0x4ca8e8,transparent:true,opacity:0.12,blending:THREE.AdditiveBlending,depthWrite:false});
const lineMesh=new THREE.LineSegments(lineGeo,lineMat);
particleGroup.add(lineMesh);

// Elettroni
const ELECTRON_COUNT=3;
const electronGeo=new THREE.BufferGeometry();
const electronPos=new Float32Array(ELECTRON_COUNT*3);
electronGeo.setAttribute('position',new THREE.BufferAttribute(electronPos,3));
const electronMat=new THREE.PointsMaterial({size:0.08,color:0xffffff,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false});
const electrons=new THREE.Points(electronGeo,electronMat);
particleGroup.add(electrons);

const electronData=[];
for(let i=0;i<ELECTRON_COUNT;i++){
  electronData.push({active:false,pos:new THREE.Vector3(),targetIdx:0,lineProgress:0,speed:0.003+Math.random()*0.003});
}

// World Group — Depth Breathing + Tumble container
const worldGroup=new THREE.Group();
scene.add(worldGroup);
worldGroup.add(orb);
rings.forEach(r=>worldGroup.add(r.mesh));
worldGroup.add(glowSprite);
worldGroup.add(particleGroup);

let lineAmount=0.15;
let currentRadius=PARTICLE_RADIUS;


// Audio
let audioCtx,analyser,micStream,micSource,ttsCtx,ttsAnalyser,audioProcessor;
const currentTtsSources=new Set();
let workletLoaded=false;
async function initAudio(){
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  analyser=audioCtx.createAnalyser(); analyser.fftSize=CONFIG.FFT_SIZE;
  micStream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  micSource=audioCtx.createMediaStreamSource(micStream);
  micSource.connect(analyser);
  try{
    await audioCtx.audioWorklet.addModule('./audio-worklet.js');
    workletLoaded=true;
    console.log('AudioWorklet loaded');
  }catch(err){
    console.error('AudioWorklet load failed',err);
  }
  console.log('Audio input sampleRate',audioCtx.sampleRate);
}

// Waveform
const wCvs=document.getElementById('waveform');
const wCtx=wCvs.getContext('2d'); wCvs.width=400; wCvs.height=60;
function drawWave(){
  wCtx.fillStyle='rgba(0,0,0,0.3)';
  wCtx.fillRect(0,0,wCvs.width,wCvs.height);
  const activeAnalyser=getActiveAnalyser();
  if(!activeAnalyser){
    requestAnimationFrame(drawWave);
    return;
  }
  const data=new Uint8Array(activeAnalyser.frequencyBinCount);
  if(curState==='SPEAKING'||curState==='BANTER'||curState==='INTRO')activeAnalyser.getByteTimeDomainData(data);
  else activeAnalyser.getByteFrequencyData(data);
  wCtx.beginPath();
  wCtx.strokeStyle=(curState==='SPEAKING'||curState==='BANTER'||curState==='INTRO')?'#00ff9f':'#00d9ff';
  wCtx.lineWidth=2;
  const sw=wCvs.width/data.length; let x=0;
  for(let i=0;i<data.length;i++){
    const v=data[i]/128.0; const y=v*wCvs.height/2;
    if(i===0)wCtx.moveTo(x,y); else wCtx.lineTo(x,y);
    x+=sw;
  }
  wCtx.stroke();
  requestAnimationFrame(drawWave);
}

// TTS helpers
function isWavBuffer(buffer){
  if(buffer.byteLength<4)return false;
  const v=new Uint8Array(buffer,0,4);
  return v[0]===0x52&&v[1]===0x49&&v[2]===0x46&&v[3]===0x46;
}

function ensureTTSContext(sr=24000){
  if(!ttsCtx)ttsCtx=new AudioContext({sampleRate:sr});
  if(!ttsAnalyser){
    ttsAnalyser=ttsCtx.createAnalyser();
    ttsAnalyser.fftSize=CONFIG.FFT_SIZE;
    ttsAnalyser.connect(ttsCtx.destination);
  }
}

function playTTSBuffer(audioBuffer){
  ensureTTSContext(audioBuffer.sampleRate||24000);
  const src=ttsCtx.createBufferSource();
  src.buffer=audioBuffer;
  src.connect(ttsAnalyser);
  currentTtsSources.add(src);
  src.onended=()=>currentTtsSources.delete(src);
  src.start();
}

function stopTTS(){
  for(const src of currentTtsSources){
    try{src.stop();}catch(e){}
  }
  currentTtsSources.clear();
}

function playTTS(pcm,sr=24000){
  ensureTTSContext(sr);
  // Protezione: se arriva un WAV container invece di raw PCM
  if(isWavBuffer(pcm)){
    console.warn('playTTS received WAV container, routing to decodeAudioData');
    ttsCtx.decodeAudioData(pcm.slice(0)).then(buf=>{
      playTTSBuffer(buf);
    }).catch(err=>console.error('WAV decode failed',err));
    return;
  }
  const i16=new Int16Array(pcm);
  const f32=new Float32Array(i16.length);
  for(let i=0;i<i16.length;i++)f32[i]=i16[i]/32768.0;
  const buf=ttsCtx.createBuffer(1,f32.length,sr);
  buf.copyToChannel(f32,0);
  playTTSBuffer(buf);
}

async function playTTSBase64(payload, format='linear16', sr=24000){
  ensureTTSContext(sr);
  const bin=atob(payload);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  if(format==='wav'||isWavBuffer(bytes.buffer)){
    const audioBuffer=await ttsCtx.decodeAudioData(bytes.buffer.slice(0));
    playTTSBuffer(audioBuffer);
    return;
  }
  // Path PCM raw: Uint8Array → Int16Array → Float32Array
  const i16=new Int16Array(bytes.buffer);
  const f32=new Float32Array(i16.length);
  for(let i=0;i<i16.length;i++)f32[i]=i16[i]/32768.0;
  const buf=ttsCtx.createBuffer(1,f32.length,sr);
  buf.copyToChannel(f32,0);
  playTTSBuffer(buf);
}

// Music play
function playMusic(file){
  const a=new Audio(file);
  a.volume=0.6; a.play().catch(err=>console.warn('Music play failed',err));
}


// WebSocket
let wsCmd,wsAudio;
function connectCmd(){
  wsCmd=new WebSocket(CONFIG.WS_CMD);
  wsCmd.onopen=()=>{playMusic('./sounds/boot.wav'); updateHUD('Sistemi operativi, Signore.','Connected'); setOrb('IDLE');};
  wsCmd.onmessage=(e)=>{
    const d=JSON.parse(e.data);
    switch(d.type){
      case 'wake': playMusic('./sounds/wake.wav');  setOrb('LISTENING'); updateHUD('In ascolto...','Listening'); break;
      case 'transcript_interim': updateHUD(d.text+'...','Hearing'); break;
      case 'transcript_final': updateHUD(d.text,'Processing'); setOrb('THINKING'); break;
      case 'listening_timeout': playMusic('./sounds/error.wav'); updateHUD('Sistemi operativi, Signore.','Ready'); setOrb('IDLE'); break;
      case 'thinking': showBubble('thinking',d.text||'Analizzo...'); break;
      case 'jarvis_response': /* playMusic('./sounds/confirm.wav'); */ setOrb('SPEAKING'); typewriter(d.text); updateSub('Model: '+(d.model_used||'unknown')); break;
      case 'tts_chunk':
        if(d.audio)playTTSBase64(d.audio,d.format,d.sample_rate).catch(err=>console.error('TTS playback failed',err));
        else if(d.pcm)playTTS(new Uint8Array(d.pcm.split('').map(c=>c.charCodeAt(0))).buffer);
        break;
      case 'barge_in': stopTTS(); setOrb('LISTENING'); updateHUD('Interrotto. In ascolto...','Barge-in'); break;
      case 'banter_trigger': setOrb('BANTER'); typewriter(d.text); updateSub('Banter'); break;
      case 'system_alert': setOrb('ALERT'); updateHUD(d.text,'Alert'); setTimeout(()=>setOrb('IDLE'),3000); break;
      case 'intro': setOrb('INTRO'); updateHUD('Modalita spettacolo','Intro'); break;
      case 'play_music': if(d.file)playMusic(d.file); break;
      case 'hud_update': document.getElementById('cpu-val').textContent=d.cpu||'--'; document.getElementById('mem-val').textContent=d.mem||'--'; document.getElementById('gpu-val').textContent=d.gpu||'--'; break;
    }
  };
  wsCmd.onerror=()=>{updateHUD('Errore connessione backend','Socket B'); setOrb('ALERT');};
  wsCmd.onclose=()=>{updateHUD('Connessione persa...','Reconnecting'); setOrb('ALERT'); setTimeout(connectCmd,2000);};
}
function connectAudio(){
  wsAudio=new WebSocket(CONFIG.WS_AUDIO); wsAudio.binaryType='arraybuffer';
  wsAudio.onopen=()=>{startAudioStream();};
  wsAudio.onerror=()=>{updateSub('Audio socket error');};
  wsAudio.onclose=()=>{setTimeout(connectAudio,2000);};
}
async function startAudioStream(){
  if(!audioCtx||!micSource){
    updateSub('Microfono non inizializzato');
    return;
  }
  if(audioProcessor){
    try{audioProcessor.disconnect();}catch(e){}
    audioProcessor=null;
  }
  if(!workletLoaded){
    updateSub('AudioWorklet non caricato');
    return;
  }
  const node=new AudioWorkletNode(audioCtx,'resample-processor');
  node.port.onmessage=(ev)=>{
    if(wsAudio.readyState===WebSocket.OPEN){
      wsAudio.send(ev.data);
    }
  };
  micSource.connect(node);
  audioProcessor=node;
}


// Orb State
function setOrb(ns){if(ns===tgtState)return; tgtState=ns; stTrans=0;}
function updateOrb(dt){
  const t=STATES[tgtState];
  if(curState!==tgtState){stTrans+=dt*2.5; if(stTrans>=1){stTrans=1; curState=tgtState;}}
  orbMat.uniforms.uColor.value.lerp(new THREE.Color(t.c),dt*3.0);
  orbMat.uniforms.uNoise.value+=(t.n-orbMat.uniforms.uNoise.value)*dt*2.0;
  orbMat.uniforms.uSpeed.value+=(t.s-orbMat.uniforms.uSpeed.value)*dt*2.0;
  orbMat.uniforms.uEmissive.value+=(t.e-orbMat.uniforms.uEmissive.value)*dt*2.0;
  orb.scale.setScalar(orb.scale.x+(t.sc-orb.scale.x)*dt*3.0);
  coreLight.color.lerp(new THREE.Color(t.c),dt*2.0);
  glowMat.color.lerp(new THREE.Color(t.c),dt*2.0);
  const dot=document.getElementById('status-dot');
  const lab=document.getElementById('status-label');
  const map={IDLE:['#00ff9f','ONLINE'],LISTENING:['#00d9ff','LISTENING'],THINKING:['#ffaa00','PROCESSING'],SPEAKING:['#00ff9f','SPEAKING'],BANTER:['#ff44aa','BANTER'],ALERT:['#ff0040','ALERT'],INTRO:['#ffffff','INTRO']};
  const [c,l]=map[curState]||map.IDLE;
  dot.style.background=c; dot.style.boxShadow='0 0 10px '+c; lab.textContent=l;
}

// HUD
function updateHUD(t,s){document.getElementById('jarvis-text').textContent=t; if(s)document.getElementById('jarvis-sub').textContent=s;}
function updateSub(s){document.getElementById('jarvis-sub').textContent=s;}
function typewriter(txt,sp=22){
  const el=document.getElementById('jarvis-text'); el.textContent='';
  let i=0; const iv=setInterval(()=>{el.textContent+=txt.charAt(i); i++; if(i>=txt.length)clearInterval(iv);},sp);
}

// Thinking bubbles
const bubbleContainer=document.getElementById('thinking-bubbles');
const activeBubbles=new Map();
function showBubble(id,txt){
  if(activeBubbles.has(id))return;
  const el=document.createElement('div'); el.className='thinking-bubble';
  el.innerHTML='<span style="opacity:0.6">⚡</span> '+txt;
  const ang=Math.random()*Math.PI*2; const rad=180+Math.random()*60;
  el.style.left='calc(50% + '+Math.cos(ang)*rad+'px)';
  el.style.top='calc(50% + '+Math.sin(ang)*rad+'px)';
  bubbleContainer.appendChild(el); activeBubbles.set(id,el);
  requestAnimationFrame(()=>el.style.opacity='0.8');
  setTimeout(()=>{el.style.opacity='0'; setTimeout(()=>{el.remove(); activeBubbles.delete(id);},300);},2000);
}

setInterval(()=>document.getElementById('clock').textContent=new Date().toLocaleTimeString('it-IT'),1000);


function getAudioBands(){
  const activeAnalyser=getActiveAnalyser();
  if(!activeAnalyser) return {bass:0,mid:0};
  const data=new Uint8Array(activeAnalyser.frequencyBinCount);
  activeAnalyser.getByteFrequencyData(data);
  const binCount=data.length;
  const bassEnd=Math.floor(binCount*0.1);
  const midEnd=Math.floor(binCount*0.5);
  let bass=0,mid=0;
  for(let i=0;i<bassEnd;i++)bass+=data[i];
  for(let i=bassEnd;i<midEnd;i++)mid+=data[i];
  bass=bassEnd>0?(bass/bassEnd)/255:0;
  mid=(midEnd-bassEnd)>0?(mid/(midEnd-bassEnd))/255:0;
  return {bass,mid};
}

function getActiveAnalyser(){
  if((curState==='SPEAKING'||curState==='BANTER'||curState==='INTRO')&&ttsAnalyser)return ttsAnalyser;
  return analyser;
}

function updateParticleCloud(dt,et){
  const targetLine={IDLE:0.15,LISTENING:0.4,THINKING:1.0,SPEAKING:0.8,BANTER:0.6,ALERT:0.3,SYSTEM:0.5,INTRO:0.9}[curState]||0.15;
  lineAmount+=(targetLine-lineAmount)*dt*2;
  const {bass,mid}=getAudioBands();
  const targetRadius=bass>0.05?PARTICLE_MAX_RADIUS:PARTICLE_RADIUS;
  currentRadius+=(targetRadius-currentRadius)*dt*2;
  const pulse=(curState==='SPEAKING'&&mid>0.1)?Math.sin(et*8)*0.3:0;
  const positions=pcGeo.attributes.position.array;
  for(let i=0;i<PARTICLE_COUNT;i++){
    const idx=i*3;
    const phase=pcPhase[i];
    pcVel[idx]*=0.992; pcVel[idx+1]*=0.992; pcVel[idx+2]*=0.992;
    const nx=pcBasePos[idx]+Math.sin(et*0.3+phase)*0.2;
    const ny=pcBasePos[idx+1]+Math.cos(et*0.2+phase)*0.2;
    const nz=pcBasePos[idx+2]+Math.sin(et*0.25+phase)*0.2;
    const len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    const scale=(currentRadius+pulse)/len;
    positions[idx]=nx*scale+pcVel[idx];
    positions[idx+1]=ny*scale+pcVel[idx+1];
    positions[idx+2]=nz*scale+pcVel[idx+2];
  }
  pcGeo.attributes.position.needsUpdate=true;
  if(lineAmount<0.01){
    lineMesh.visible=false;
  }else{
    lineMesh.visible=true;
    const linePositions=lineGeo.attributes.position.array;
    let lineIdx=0;
    const maxDistSq=6.0*6.0;
    const step=3;
    for(let i=0;i<PARTICLE_COUNT&&lineIdx<MAX_LINES*6;i+=step){
      const ix=positions[i*3],iy=positions[i*3+1],iz=positions[i*3+2];
      for(let j=i+1;j<PARTICLE_COUNT&&lineIdx<MAX_LINES*6;j+=step){
        const dx=ix-positions[j*3];
        const dy=iy-positions[j*3+1];
        const dz=iz-positions[j*3+2];
        const distSq=dx*dx+dy*dy+dz*dz;
        if(distSq<maxDistSq){
          linePositions[lineIdx++]=ix;
          linePositions[lineIdx++]=iy;
          linePositions[lineIdx++]=iz;
          linePositions[lineIdx++]=positions[j*3];
          linePositions[lineIdx++]=positions[j*3+1];
          linePositions[lineIdx++]=positions[j*3+2];
        }
      }
    }
    for(let k=lineIdx;k<MAX_LINES*6;k++)linePositions[k]=0;
    lineGeo.attributes.position.needsUpdate=true;
    lineMat.opacity=0.12*lineAmount;
  }
  const electronPositions=electronGeo.attributes.position.array;
  const isThinking=curState==='THINKING';
  for(let i=0;i<ELECTRON_COUNT;i++){
    const e=electronData[i];
    if(!e.active){
      if(isThinking&&Math.random()<0.02){
        e.active=true;e.lineProgress=0;e.targetIdx=Math.floor(Math.random()*PARTICLE_COUNT);
        e.speed=0.003+Math.random()*0.003;
      }
    }else{
      const tIdx=e.targetIdx;
      const ex=positions[tIdx*3],ey=positions[tIdx*3+1],ez=positions[tIdx*3+2];
      let found=false,nx=ex,ny=ey,nz=ez;
      for(let j=0;j<PARTICLE_COUNT&&!found;j+=5){
        const dx=ex-positions[j*3];
        const dy=ey-positions[j*3+1];
        const dz=ez-positions[j*3+2];
        if(dx*dx+dy*dy+dz*dz<36){nx=positions[j*3];ny=positions[j*3+1];nz=positions[j*3+2];e.targetIdx=j;found=true;}
      }
      e.lineProgress+=e.speed;
      if(e.lineProgress>=1||!isThinking){
        e.active=false;
        electronPositions[i*3]=0;electronPositions[i*3+1]=0;electronPositions[i*3+2]=0;
      }else{
        electronPositions[i*3]=ex+(nx-ex)*e.lineProgress;
        electronPositions[i*3+1]=ey+(ny-ey)*e.lineProgress;
        electronPositions[i*3+2]=ez+(nz-ez)*e.lineProgress;
      }
    }
  }
  electronGeo.attributes.position.needsUpdate=true;
  particleGroup.rotation.y=et*0.03;
  particleGroup.rotation.x=Math.sin(et*0.08)*0.05;
}

// Render Loop
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=clock.getDelta(); const et=clock.getElapsedTime();
  orbMat.uniforms.uTime.value=et;
  updateOrb(dt);
  rings.forEach((r,i)=>{
    r.mesh.rotation.z+=r.speed*dt*(0.5+Math.sin(et*0.5+i)*0.2);
    r.mesh.rotation.x+=Math.sin(et*0.3+i)*0.001;
  });
  updateParticleCloud(dt,et);
  if(prevState!==curState){
    transitionEnergy=1.0;
    prevState=curState;
  }
  let targetZ;
  switch(curState){
    case 'IDLE': targetZ=Math.sin(et*0.12)*8; break;
    case 'THINKING': targetZ=Math.sin(et*0.3)*15+Math.sin(et*0.9)*6; break;
    case 'SPEAKING':{
      const {bass}=getAudioBands();
      targetZ=Math.sin(et*0.15)*6-bass*10;
      break;
    }
    default: targetZ=Math.sin(et*0.12)*8;
  }
  worldGroup.position.z+=(targetZ-worldGroup.position.z)*dt*3;
  if(transitionEnergy>0.01){
    spinX+=0.012*Math.sin(et*1.7)*transitionEnergy;
    spinY+=0.015*transitionEnergy;
    spinZ+=0.008*Math.cos(et*1.3)*transitionEnergy;
    transitionEnergy*=0.985;
  }
  worldGroup.rotation.x=spinX;
  worldGroup.rotation.y=spinY;
  worldGroup.rotation.z=spinZ;
  glowSprite.material.opacity=0.3+Math.sin(et*2)*0.1;
  glowSprite.scale.setScalar(6+Math.sin(et*1.5)*0.5);
  const mx=(window.mouseX||0)*0.001; const my=(window.mouseY||0)*0.001;
  camera.position.x+=(mx-camera.position.x)*dt*2;
  camera.position.y+=(-my-camera.position.y)*dt*2;
  camera.lookAt(0,0,0);
  renderer3d.render(scene,camera);
}
window.mouseX=0; window.mouseY=0;
document.addEventListener('mousemove',e=>{window.mouseX=e.clientX-innerWidth/2; window.mouseY=e.clientY-innerHeight/2;});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer3d.setSize(innerWidth,innerHeight);});

// Init
(async()=>{
  connectCmd();
  animate();
  try{
    await initAudio();
    connectAudio();
    drawWave();
  }catch(err){
    console.error('Audio init failed',err);
    updateHUD('Microfono non disponibile','Controlla permessi Windows');
    setOrb('ALERT');
  }
  console.log('%c J.A.R.V.I.S. Prime Online ','background:#00d9ff;color:#000;font-size:16px;font-weight:bold;padding:8px 16px;');
})();
