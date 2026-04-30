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

// Particelle
const pGeo=new THREE.BufferGeometry();
const pCnt=800;
const pArr=new Float32Array(pCnt*3);
for(let i=0;i<pCnt*3;i++)pArr[i]=(Math.random()-0.5)*12;
pGeo.setAttribute('position',new THREE.BufferAttribute(pArr,3));
const pMat=new THREE.PointsMaterial({size:0.03,color:0x00d9ff,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending});
const particles=new THREE.Points(pGeo,pMat); scene.add(particles);

// Glow sprite
const cvs=document.createElement('canvas'); cvs.width=128; cvs.height=128;
const gctx=cvs.getContext('2d');
const grd=gctx.createRadialGradient(64,64,0,64,64,60);
grd.addColorStop(0,'rgba(0,217,255,1)'); grd.addColorStop(1,'rgba(0,217,255,0)');
gctx.fillStyle=grd; gctx.fillRect(0,0,128,128);
const glowTex=new THREE.CanvasTexture(cvs);
const glowMat=new THREE.SpriteMaterial({map:glowTex,color:0x00d9ff,transparent:true,opacity:0.4,blending:THREE.AdditiveBlending});
const glowSprite=new THREE.Sprite(glowMat); glowSprite.scale.set(6,6,1); scene.add(glowSprite);


// Audio
let audioCtx,analyser,micStream,micSource,ttsCtx,audioProcessor;
async function initAudio(){
  audioCtx=new(window.AudioContext||window.webkitAudioContext)({sampleRate:16000});
  analyser=audioCtx.createAnalyser(); analyser.fftSize=CONFIG.FFT_SIZE;
  micStream=await navigator.mediaDevices.getUserMedia({audio:{sampleRate:16000,channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  micSource=audioCtx.createMediaStreamSource(micStream);
  micSource.connect(analyser);
  console.log('Audio input sampleRate',audioCtx.sampleRate);
}

// Waveform
const wCvs=document.getElementById('waveform');
const wCtx=wCvs.getContext('2d'); wCvs.width=400; wCvs.height=60;
function drawWave(){
  wCtx.fillStyle='rgba(0,0,0,0.3)';
  wCtx.fillRect(0,0,wCvs.width,wCvs.height);
  const data=new Uint8Array(analyser.frequencyBinCount);
  if(curState==='SPEAKING'||curState==='BANTER'||curState==='INTRO')analyser.getByteTimeDomainData(data);
  else analyser.getByteFrequencyData(data);
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

function playTTS(pcm,sr=24000){
  if(!ttsCtx)ttsCtx=new AudioContext({sampleRate:sr});
  // Protezione: se arriva un WAV container invece di raw PCM
  if(isWavBuffer(pcm)){
    console.warn('playTTS received WAV container, routing to decodeAudioData');
    ttsCtx.decodeAudioData(pcm.slice(0)).then(buf=>{
      const src=ttsCtx.createBufferSource();
      src.buffer=buf; src.connect(ttsCtx.destination); src.start();
    }).catch(err=>console.error('WAV decode failed',err));
    return;
  }
  const i16=new Int16Array(pcm);
  const f32=new Float32Array(i16.length);
  for(let i=0;i<i16.length;i++)f32[i]=i16[i]/32768.0;
  const buf=ttsCtx.createBuffer(1,f32.length,sr);
  buf.copyToChannel(f32,0);
  const src=ttsCtx.createBufferSource();
  src.buffer=buf; src.connect(ttsCtx.destination); src.start();
}

async function playTTSBase64(payload, format='linear16', sr=24000){
  if(!ttsCtx)ttsCtx=new AudioContext({sampleRate:sr});
  const bin=atob(payload);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  if(format==='wav'||isWavBuffer(bytes.buffer)){
    const audioBuffer=await ttsCtx.decodeAudioData(bytes.buffer.slice(0));
    const src=ttsCtx.createBufferSource();
    src.buffer=audioBuffer; src.connect(ttsCtx.destination); src.start();
    return;
  }
  // Path PCM raw: Uint8Array → Int16Array → Float32Array
  const i16=new Int16Array(bytes.buffer);
  const f32=new Float32Array(i16.length);
  for(let i=0;i<i16.length;i++)f32[i]=i16[i]/32768.0;
  const buf=ttsCtx.createBuffer(1,f32.length,sr);
  buf.copyToChannel(f32,0);
  const src=ttsCtx.createBufferSource();
  src.buffer=buf; src.connect(ttsCtx.destination); src.start();
}

// Music play
function playMusic(file){
  const a=new Audio(file);
  a.volume=0.6; a.play();
}


// WebSocket
let wsCmd,wsAudio;
function connectCmd(){
  wsCmd=new WebSocket(CONFIG.WS_CMD);
  wsCmd.onopen=()=>{updateHUD('Sistemi operativi, Signore.','Connected'); setOrb('IDLE');};
  wsCmd.onmessage=(e)=>{
    const d=JSON.parse(e.data);
    switch(d.type){
      case 'wake': setOrb('LISTENING'); updateHUD('In ascolto...','Listening'); break;
      case 'transcript_interim': updateHUD(d.text+'...','Hearing'); break;
      case 'transcript_final': updateHUD(d.text,'Processing'); setOrb('THINKING'); break;
      case 'listening_timeout': updateHUD('Sistemi operativi, Signore.','Ready'); setOrb('IDLE'); break;
      case 'thinking': showBubble('thinking',d.text||'Analizzo...'); break;
      case 'jarvis_response': setOrb('SPEAKING'); typewriter(d.text); updateSub('Model: '+(d.model_used||'unknown')); break;
      case 'tts_chunk':
        if(d.audio)playTTSBase64(d.audio,d.format,d.sample_rate);
        else if(d.pcm)playTTS(new Uint8Array(d.pcm.split('').map(c=>c.charCodeAt(0))).buffer);
        break;
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
function resampleTo16k(input,sourceRate){
  if(sourceRate===CONFIG.AUDIO_SAMPLE_RATE)return input;
  const ratio=sourceRate/CONFIG.AUDIO_SAMPLE_RATE;
  const outLen=Math.floor(input.length/ratio);
  const out=new Float32Array(outLen);
  for(let i=0;i<outLen;i++){
    const pos=i*ratio;
    const idx=Math.floor(pos);
    const frac=pos-idx;
    const a=input[idx]||0;
    const b=input[idx+1]||a;
    out[i]=a+(b-a)*frac;
  }
  return out;
}
function startAudioStream(){
  if(!audioCtx||!micSource){
    updateSub('Microfono non inizializzato');
    return;
  }
  if(audioProcessor){
    audioProcessor.disconnect();
    audioProcessor=null;
  }
  const proc=audioCtx.createScriptProcessor(4096,1,1);
  proc.onaudioprocess=(e)=>{
    if(wsAudio.readyState===WebSocket.OPEN){
      const input=resampleTo16k(e.inputBuffer.getChannelData(0),audioCtx.sampleRate);
      const i16=new Int16Array(input.length);
      for(let i=0;i<input.length;i++)i16[i]=Math.max(-1,Math.min(1,input[i]))*0x7FFF;
      wsAudio.send(i16.buffer);
    }
  };
  audioProcessor=proc;
  micSource.connect(proc); proc.connect(audioCtx.destination);
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
  particles.rotation.y=et*0.05; particles.rotation.x=Math.sin(et*0.1)*0.1;
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
