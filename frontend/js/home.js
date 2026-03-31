// ════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════
const SVCS=['Customer Service','Billing','Consultation','Technical Support','Order Pickup','Account Opening'];
const ICOS={'Customer Service':'🎧','Billing':'💳','Consultation':'📋','Technical Support':'🔧','Order Pickup':'📦','Account Opening':'🏦'};
const PFX={'Customer Service':'A','Billing':'B','Consultation':'C','Technical Support':'T','Order Pickup':'P','Account Opening':'N'};
const SEQ={};SVCS.forEach(s=>SEQ[s]=0);
const USERS={
  admin:{pass:'admin123',role:'admin',name:'System Admin',icon:'🛡'},
  staff:{pass:'staff123',role:'staff',name:'Counter Staff',icon:'🖥'},
  guest:{pass:'guest123',role:'customer',name:'Guest Customer',icon:'👤'},
};
const NAV_CFG={
  admin:[
    {sec:'Main'},{id:'dashboard',lbl:'Dashboard',ico:'📊',pg:'dashboard'},
    {id:'issue',lbl:'Issue Card',ico:'🎫',pg:'issue'},
    {sec:'Operations'},{id:'staff',lbl:'Staff Panel',ico:'🖥',pg:'staff'},
    {id:'display',lbl:'Display Screen',ico:'📺',pg:'display'},
    {sec:'Insights'},{id:'analytics',lbl:'Analytics',ico:'📈',pg:'analytics'},
    {id:'services',lbl:'Counters & Services',ico:'⚙️',pg:'services'},
  ],
  staff:[
    {sec:'Operations'},{id:'staff',lbl:'My Counter',ico:'🖥',pg:'staff'},
    {id:'issue',lbl:'Issue Card',ico:'🎫',pg:'issue'},
    {id:'display',lbl:'Display Screen',ico:'📺',pg:'display'},
    {sec:'Queue'},{id:'dashboard',lbl:'Queue Overview',ico:'📊',pg:'dashboard'},
  ],
  customer:[
    {sec:'Queue'},{id:'get-ticket',lbl:'Get Ticket',ico:'🎟',pg:'get-ticket'},
    {id:'track',lbl:'Track My Queue',ico:'📍',pg:'track'},
    {id:'public-display',lbl:'Queue Board',ico:'📺',pg:'public-display'},
  ],
};
const TITLES={dashboard:'Dashboard',issue:'Issue Queue Card',staff:'Staff Panel',display:'Display Screen',analytics:'Analytics',services:'Counters & Services','get-ticket':'Get Queue Ticket',track:'Track My Queue','public-display':'Queue Board'};

// ════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════
let S={
  role:null,username:null,
  queue:[],currentServing:null,servedToday:[],activities:[],
  counters:[
    {id:1,name:'Counter 1',service:'Customer Service',status:'open',operator:'Sarah K.',color:'#3FB950'},
    {id:2,name:'Counter 2',service:'Billing',status:'open',operator:'Mark T.',color:'#388BFD'},
    {id:3,name:'Counter 3',service:'Technical Support',status:'break',operator:'Lisa M.',color:'#E3B341'},
    {id:4,name:'Counter 4',service:'Consultation',status:'closed',operator:'James R.',color:'#A78BFA'},
  ],
  nextCtrId:5,
  myTicket:null,selSvc:null,
  editingCtrId:null,
  selectedColor:'#388BFD',
};

// ════════════════════════════════════════════════
// REAL-TIME CONNECTION (SOCKET.IO)
// ════════════════════════════════════════════════
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('🟢 Connected to PinPoint Live Server!');
});

socket.on('new-ticket', (ticketData) => {
  console.log('📡 Live Update Received:', ticketData);
  
  // 1. Show notification
  showToast('🔔', 'New Ticket Generated', `Ticket ${ticketData.ticketNumber} joined the queue`, 'blue');
  
  // 2. Add to global state
  S.queue.push({
    id: ticketData._id,
    number: ticketData.ticketNumber,
    service: ticketData.serviceType,
    name: ticketData.customerName || 'Guest',
    priority: ticketData.priority,
    phone: '', 
    counter: 'Auto-assigned',
    issuedAt: new Date(ticketData.issuedAt),
    status: 'waiting',
    estimatedWait: estWait(ticketData.serviceType)
  });

  // 3. Re-render the UI with the new data
  renderDash();
  renderStaff();
  updateDisps();
});


// ════════════════════════════════════════════════
// AUDIO (WOOSH SCROLLING)
// ════════════════════════════════════════════════
const wooshSound = new Audio('https://www.soundjay.com/misc/sounds/wind-swoosh-1.mp3');
wooshSound.volume = 0.2;
let scrollTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  const contentArea = document.querySelector('.scroll-sound');
  if (contentArea) {
    contentArea.addEventListener('scroll', () => {
      if (!scrollTimeout) {
        wooshSound.currentTime = 0;
        let playPromise = wooshSound.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => { /* Ignore autoplay restrictions silently */ });
        }
        scrollTimeout = setTimeout(() => { scrollTimeout = null; }, 500); 
      }
    });
  }
});


// ════════════════════════════════════════════════
// SMS NOTIFICATION FUNCTION
// ════════════════════════════════════════════════
async function sendSMSNotification(phone, ticketObj) {
    if (!phone) return;
    console.log(`[Mock Backend Request] Sending SMS to ${phone} for ticket ${ticketObj.number}`);
    setTimeout(() => {
        showToast('📱', 'SMS Alert Sent', `Ticket ${ticketObj.number} details sent to ${phone}`, 'green');
    }, 1200);
}

// ════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════
function doLogin(){
  const u=document.getElementById('lu').value.trim().toLowerCase();
  const p=document.getElementById('lp').value;
  const found=USERS[u];
  if(!found||found.pass!==p){
    const b=document.getElementById('lbtn');
    b.textContent='Invalid credentials ✗';
    b.style.background='var(--red)';
    b.style.color='#fff';
    setTimeout(()=>{
      b.textContent='Sign In';
      b.style.background='';
      b.style.color='';
    },1800);return;
  }
  S.role=found.role;S.username=u;
  seedData();bootApp();
}
function doLogout(){
  document.getElementById('app').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  S.role=null;
}

// ════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════
function bootApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  const u=USERS[S.username];
  document.getElementById('rb-ico').textContent=u.icon;
  document.getElementById('rb-name').textContent=u.name;
  document.getElementById('rb-role').textContent=S.role.toUpperCase();
  const rc=document.getElementById('tb-role');
  rc.textContent=S.role.charAt(0).toUpperCase()+S.role.slice(1);
  rc.className='chip '+(S.role==='customer'?'user-c':'admin-c');
  buildNav();buildSvcBtns();populateStaffCounterSelect();
  const first=NAV_CFG[S.role].find(n=>n.pg);
  if(first)showPage(first.pg,first.id);
  startClock();
}

// ════════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════════
function buildNav(){
  const c=document.getElementById('sb-nav');c.innerHTML='';
  (NAV_CFG[S.role]||[]).forEach(n=>{
    if(n.sec){const d=document.createElement('div');d.className='nsec';d.textContent=n.sec;c.appendChild(d);return;}
    const el=document.createElement('div');el.className='ni';el.id='ni-'+n.id;
    el.innerHTML=`<span class="ni-ico">${n.ico}</span><span>${n.lbl}</span>`;
    el.onclick=()=>showPage(n.pg,n.id);c.appendChild(el);
  });
}
function buildSvcBtns(){
  const g=document.getElementById('svc-btns');if(!g)return;
  g.innerHTML=SVCS.map(s=>`<div onclick="selSvc('${s}')" id="sb-${s.replace(/[\s\/]/g,'-')}"
    style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:13px;cursor:pointer;text-align:center;transition:all 0.18s;">
    <div style="font-size:20px;margin-bottom:5px;">${ICOS[s]}</div>
    <div style="font-size:11px;font-weight:600;">${s}</div>
  </div>`).join('');
}
function selSvc(s){
  S.selSvc=s;
  SVCS.forEach(sv=>{const el=document.getElementById('sb-'+sv.replace(/[\s\/]/g,'-'));if(el){el.style.borderColor='var(--border)';el.style.background='var(--surface2)';}});
  const el=document.getElementById('sb-'+s.replace(/[\s\/]/g,'-'));
  if(el){el.style.borderColor='var(--blue-lt)';el.style.background='var(--blue-dim)';}
}
function populateStaffCounterSelect(){
  const sel=document.getElementById('s-ctr');if(!sel)return;
  sel.innerHTML=S.counters.map(c=>`<option value="${c.id}">${c.name} — ${c.service}</option>`).join('');
}

// ════════════════════════════════════════════════
// PAGE NAV
// ════════════════════════════════════════════════
function showPage(pg,nid){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  const p=document.getElementById('page-'+pg);if(p)p.classList.add('on');
  const n=document.getElementById('ni-'+(nid||pg));if(n)n.classList.add('on');
  document.getElementById('tb-title').textContent=TITLES[pg]||pg;
  if(pg==='dashboard')renderDash();
  if(pg==='analytics')renderAnalytics();
  if(pg==='display'||pg==='public-display')updateDisps();
  if(pg==='staff'){populateStaffCounterSelect();renderStaff();}
  if(pg==='services')renderSvcs();
}

// ════════════════════════════════════════════════
// CLOCK
// ════════════════════════════════════════════════
function startClock(){
  function tick(){
    const n=new Date();
    document.getElementById('ck-time').textContent=n.toLocaleTimeString('en-US',{hour12:false});
    document.getElementById('ck-date').textContent=n.toLocaleDateString('en-US',{day:'2-digit',month:'short',year:'numeric'});
    document.getElementById('ck-day').textContent=n.toLocaleDateString('en-US',{weekday:'long'});
    ['d-clk','pub-clk'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=n.toLocaleTimeString('en-US',{hour12:false});});
  }
  tick();setInterval(tick,1000);
}

// ════════════════════════════════════════════════
// COUNTER MODAL
// ════════════════════════════════════════════════
function openAddCounter(){
  S.editingCtrId=null;S.selectedColor='#388BFD';
  document.getElementById('modal-title').textContent='Add New Counter';
  document.getElementById('modal-save-btn').textContent='＋ Add Counter';
  document.getElementById('m-name').value='Counter '+(S.nextCtrId);
  document.getElementById('m-operator').value='';
  document.getElementById('m-status').value='open';
  document.getElementById('m-service').value='Customer Service';
  setPickedColor('#388BFD');
  document.getElementById('counter-modal').classList.add('open');
}
function openEditCounter(id){
  const c=S.counters.find(x=>x.id===id);if(!c)return;
  S.editingCtrId=id;S.selectedColor=c.color||'#388BFD';
  document.getElementById('modal-title').textContent='Edit Counter';
  document.getElementById('modal-save-btn').textContent='Save Changes';
  document.getElementById('m-name').value=c.name;
  document.getElementById('m-operator').value=c.operator;
  document.getElementById('m-status').value=c.status;
  document.getElementById('m-service').value=c.service;
  setPickedColor(c.color||'#388BFD');
  document.getElementById('counter-modal').classList.add('open');
}
function closeCounterModal(){document.getElementById('counter-modal').classList.remove('open');}

function pickColor(el){
  setPickedColor(el.getAttribute('data-c'));
}
function setPickedColor(col){
  S.selectedColor=col;
  document.querySelectorAll('.color-opt').forEach(el=>{
    el.style.borderColor=el.getAttribute('data-c')===col?'#fff':'transparent';
    el.style.transform=el.getAttribute('data-c')===col?'scale(1.25)':'scale(1)';
  });
}

function saveCounter(){
  const name=document.getElementById('m-name').value.trim();
  const service=document.getElementById('m-service').value;
  const operator=document.getElementById('m-operator').value.trim()||'Unassigned';
  const status=document.getElementById('m-status').value;
  const color=S.selectedColor||'#388BFD';
  if(!name){showToast('⚠️','Missing Name','Enter a counter name','amber');return;}

  if(S.editingCtrId){
    const c=S.counters.find(x=>x.id===S.editingCtrId);
    if(c){c.name=name;c.service=service;c.operator=operator;c.status=status;c.color=color;}
    showToast('✏️','Counter Updated',`${name} saved`,'blue');
  } else {
    S.counters.push({id:S.nextCtrId++,name,service,operator,status,color});
    showToast('✅','Counter Added',`${name} is now active`,'green');
  }
  closeCounterModal();
  populateStaffCounterSelect();
  renderDash();renderSvcs();updateDisps();
}

// CONFIRM DELETE
let _deleteTargetId=null;
function confirmDeleteCounter(id){
  _deleteTargetId=id;
  const c=S.counters.find(x=>x.id===id);
  document.getElementById('confirm-title').textContent='Remove '+( c?c.name:'Counter')+'?';
  document.getElementById('confirm-msg').textContent='This will remove the counter and cannot be undone.';
  document.getElementById('confirm-ok-btn').onclick=()=>doDeleteCounter(_deleteTargetId);
  document.getElementById('confirm-modal').classList.add('open');
}
function closeConfirm(){document.getElementById('confirm-modal').classList.remove('open');}
function doDeleteCounter(id){
  if(S.currentServing&&S.currentServing.counter===S.counters.find(x=>x.id===id)?.name){
    S.currentServing=null;
  }
  S.counters=S.counters.filter(x=>x.id!==id);
  closeConfirm();
  populateStaffCounterSelect();
  renderDash();renderSvcs();updateDisps();
  showToast('🗑','Counter Removed','Counter deleted successfully','red');
}

// ════════════════════════════════════════════════
// QUEUE HELPERS
// ════════════════════════════════════════════════
function genNum(svc){SEQ[svc]=(SEQ[svc]||0)+1;return PFX[svc]+String(SEQ[svc]).padStart(3,'0');}
function openCtrs(){return S.counters.filter(c=>c.status==='open');}
function asgnCtr(svc){const op=openCtrs();if(!op.length)return null;return op.find(c=>c.service===svc)||op[0];}
function estWait(svc){return Math.max(2,S.queue.filter(q=>q.service===svc&&q.status==='waiting').length*4+Math.floor(Math.random()*3)+2);}

// ════════════════════════════════════════════════
// ISSUE CARD (STAFF & PUBLIC)
// ════════════════════════════════════════════════

// Staff facing Generator (API Wired)
async function genCard() {
  const service = document.getElementById('g-svc').value;
  const name = document.getElementById('g-nm').value || 'Guest';
  const priority = document.getElementById('g-pri').value;

  try {
    const response = await fetch('http://localhost:5000/api/tickets/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: service, customerName: name, priority: priority })
    });

    const data = await response.json();
    
    // Update the local preview (WebSocket listener handles adding it to the list)
    document.getElementById('pv-num').innerText = data.ticketNumber;
    document.getElementById('pv-svc').innerText = data.serviceType;
    document.getElementById('pv-pri').innerText = data.priority;
    document.getElementById('pv-pos').innerText = '#' + (S.queue.filter(q=>q.status==='waiting').length + 1);
    document.getElementById('pv-wait').innerText = estWait(data.serviceType) + 'm';
    document.getElementById('pv-time').innerText = 'Issued: ' + new Date(data.issuedAt).toLocaleTimeString();
    document.getElementById('qr-wrap').innerHTML=mkQR(data.ticketNumber);

  } catch (error) {
    console.error('Error generating ticket:', error);
    showToast('❌', 'Error', 'Could not connect to server', 'red');
  }
}

function clrForm(){
  ['g-nm','g-ph'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('pv-num').textContent='—';
  ['pv-svc','pv-ctr','pv-pos','pv-wait'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='—';});
  document.getElementById('pv-time').textContent='Issued: —';
  document.getElementById('pv-pri').innerHTML='—';
  document.getElementById('qr-wrap').innerHTML='';
}

// Public facing Generator (API Wired)
async function custGetTicket(){
  if(!S.selSvc){showToast('ℹ️','Select Service','Please pick a service first','amber');return;}
  const nm=document.getElementById('c-nm').value.trim()||'Guest';
  const ph=document.getElementById('c-ph').value.trim();
  
  try {
    const response = await fetch('http://localhost:5000/api/tickets/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: S.selSvc, customerName: nm, priority: 'Normal' })
    });

    const data = await response.json();
    
    // Mocking an object for local reference for the user tracking their own ticket
    const e = { number: data.ticketNumber, service: data.serviceType, estimatedWait: estWait(data.serviceType), issuedAt: new Date(data.issuedAt) };
    S.myTicket=e;
    
    document.getElementById('ct-num').textContent=e.number;
    document.getElementById('ct-svc').textContent=e.service;
    document.getElementById('ct-pos').textContent='#'+(S.queue.filter(q=>q.status==='waiting').length + 1);
    document.getElementById('ct-wait').textContent=e.estimatedWait+'m';
    document.getElementById('ct-time').textContent='Issued: '+e.issuedAt.toLocaleTimeString();
    document.getElementById('c-qr').innerHTML=mkQR(e.number);
    document.getElementById('c-ticket').style.display='block';
    
    if (ph) { sendSMSNotification(ph, e); }
  } catch (err) {
    console.error('Error generating ticket:', err);
    showToast('❌', 'Error', 'Could not connect to server', 'red');
  }
}

function goTrack(){if(S.myTicket){document.getElementById('t-inp').value=S.myTicket.number;showPage('track','track');trackQ();}}

// ════════════════════════════════════════════════
// OPERATIONS
// ════════════════════════════════════════════════
async function callNext() {
  try {
    // Get the currently selected counter from the dropdown
    const counterSelect = document.getElementById('s-ctr');
    const selectedCounter = counterSelect && counterSelect.options.length > 0 
      ? counterSelect.options[counterSelect.selectedIndex].text.split(' — ')[0] 
      : 'Counter 1';

    const response = await fetch('http://localhost:5000/api/tickets/call-next', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counter: selectedCounter }) // Send counter to DB
    });

    if (response.status === 404) {
      showToast('ℹ️', 'Queue Empty', 'No customers waiting', 'blue');
      return;
    }

    const ticket = await response.json();
    
    // Update local state
    S.currentServing = ticket;
    S.queue = S.queue.filter(q => q.number !== ticket.ticketNumber);

    renderStaff(); 
    renderDash();
    updateDisps();

    showToast('📢', 'Now Calling', `#${ticket.ticketNumber} to ${selectedCounter}`, 'green');
  } catch (err) {
    console.error('Failed to call next:', err);
  }
}
async function completeServing() {
  if (!S.currentServing || !S.currentServing._id) {
    showToast('ℹ️', 'No Active Customer', 'Nothing to complete', 'blue');
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/tickets/complete/${S.currentServing._id}`, {
      method: 'PUT'
    });

    const finishedTicket = await response.json();

    // Move to 'servedToday' for local session tracking
    S.servedToday.push(finishedTicket);
    addAct(finishedTicket, 'Served');
    
    // Clear the current serving slot
    S.currentServing = null;

    renderDash();
    renderStaff();
    updateDisps();
    showToast('✅', 'Service Complete', `Ticket ${finishedTicket.ticketNumber} finished`, 'green');

  } catch (err) {
    console.error('Error completing ticket:', err);
    showToast('❌', 'Error', 'Failed to save completion', 'red');
  }
}
function skipCurrent(){
  if(!S.currentServing){showToast('ℹ️','No Active','—','blue');return;}
  S.currentServing.status='skipped';addAct(S.currentServing,'Skipped');S.currentServing=null;
  renderDash();renderStaff();updateDisps();showToast('⤭','Skipped','Customer skipped','amber');
}
function recallCurrent(){
  if(S.currentServing)showToast('📢','Recalled','Recalling #'+S.currentServing.number,'blue');
  else showToast('ℹ️','Nothing to Recall','—','blue');
}
function resetQueue(){
  if(!confirm('Reset all queues?'))return;
  S.queue.forEach(q=>{if(q.status==='waiting')q.status='cancelled';});S.currentServing=null;
  renderDash();renderStaff();updateDisps();showToast('⊘','Reset','All queues cleared','red');
}
function addAct(e,action){
  const wait=e.issuedAt?Math.round((Date.now()-e.issuedAt)/60000):0;
  S.activities.unshift({number:e.number,service:e.service,counter:e.counter,wait:wait+'m',action,time:new Date().toLocaleTimeString()});
  if(S.activities.length>20)S.activities.pop();
}
function callSpec(id){
  const e=S.queue.find(q=>q.id==id);if(!e)return;
  if(S.currentServing){S.currentServing.status='served';S.servedToday.push({...S.currentServing});addAct(S.currentServing,'Served');}
  e.status='serving';S.currentServing=e;
  renderDash();renderStaff();updateDisps();showToast('📢','Calling','#'+e.number,'green');
}

// ════════════════════════════════════════════════
// RENDER DASHBOARD
// ════════════════════════════════════════════════
function renderDash(){
  const w=S.queue.filter(q=>q.status==='waiting');
  const oc=S.counters.filter(c=>c.status==='open').length;
  const avg=w.length?Math.round(w.reduce((a,b)=>a+b.estimatedWait,0)/w.length):0;
  document.getElementById('d-stats').innerHTML=[
    {ico:'👥',v:w.length,l:'Waiting Now',cl:'sb',col:'var(--blue-lt)'},
    {ico:'✅',v:S.servedToday.length,l:'Served Today',cl:'sg',col:'var(--green)'},
    {ico:'⏱',v:avg?avg+'m':'—',l:'Avg Wait',cl:'sa',col:'var(--amber)'},
    {ico:'🖥',v:oc+'/'+S.counters.length,l:'Active Counters',cl:'sr',col:'var(--purple)'},
  ].map(s=>`<div class="stat ${s.cl}"><div style="font-size:18px;margin-bottom:8px;">${s.ico}</div>
    <div class="sv" style="color:${s.col};">${s.v}</div><div class="sl">${s.l}</div></div>`).join('');

  const cs=S.currentServing;
  document.getElementById('d-cur').textContent=cs?cs.number:'—';
  document.getElementById('d-cur-svc').textContent=cs?cs.service+' — '+cs.counter:'No active session';
  document.getElementById('d-ctr').textContent=cs?cs.counter.substring(0,14):'—';
  document.getElementById('d-nxt').textContent=w[0]?w[0].number:'—';

  const pc={Normal:'bb',VIP:'ba','Elderly / Disability':'bg',Emergency:'br'};
  document.getElementById('d-qlist').innerHTML=!w.length
    ?'<div style="text-align:center;padding:24px;color:var(--text2);font-size:13px;">Queue is empty</div>'
    :w.slice(0,15).map(q=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);">
        <div style="font-family:var(--fm);font-size:15px;font-weight:500;min-width:46px;color:var(--blue-lt);">${q.number}</div>
        <div style="flex:1;"><div style="font-size:12px;">${q.name}</div><div style="font-size:10px;color:var(--text2);">${q.service}</div></div>
        <span class="b ${pc[q.priority]||'bb'}">${q.priority}</span>
        <div style="font-size:10px;font-family:var(--fm);color:var(--amber);">${q.estimatedWait}m</div>
      </div>`).join('');

  renderCounterGrid('d-ctrs', true);

  const ac={Served:'bg',Skipped:'ba',Cancelled:'br'};
  document.getElementById('d-act').innerHTML=!S.activities.length
    ?`<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:18px;">No recent activity</td></tr>`
    :S.activities.slice(0,10).map(a=>`<tr>
        <td style="font-family:var(--fm);font-weight:600;">${a.number}</td>
        <td>${a.service}</td>
        <td style="font-family:var(--fm);font-size:11px;">${a.counter}</td>
        <td style="font-family:var(--fm);">${a.wait}</td>
        <td><span class="b ${ac[a.action]||'bb'}">${a.action}</span></td>
        <td style="font-family:var(--fm);font-size:11px;color:var(--text2);">${a.time}</td>
      </tr>`).join('');
}

function renderCounterGrid(containerId, allowDelete=false){
  const el=document.getElementById(containerId);if(!el)return;
  const sc={open:'copen',break:'cbreak',closed:''};
  const sl={open:'Open',break:'Break',closed:'Closed'};
  const sco={open:'var(--green)',break:'var(--amber)',closed:'var(--text3)'};
  el.innerHTML=S.counters.map(c=>{
    const srv=S.currentServing&&S.currentServing.counter===c.name?S.currentServing.number:'—';
    const accentBorder=c.status==='open'?`border-color:${c.color}40;box-shadow:0 0 14px ${c.color}15;`:'';
    return `<div class="ccrd ${sc[c.status]||''}" onclick="togCtr(${c.id})" style="${accentBorder}">
      ${allowDelete?`<div class="ccrd-del" onclick="event.stopPropagation();confirmDeleteCounter(${c.id})">✕</div>`:''}
      <div style="width:28px;height:4px;border-radius:2px;background:${c.color||'var(--blue)'};margin:0 auto 10px;"></div>
      <div style="font-size:10px;color:var(--text2);font-family:var(--fm);">${c.name}</div>
      <div style="font-family:var(--fm);font-size:20px;margin:7px 0;color:${c.color||'var(--blue-lt)'};">${srv}</div>
      <div style="font-size:11px;font-weight:700;color:${sco[c.status]}">${sl[c.status]}</div>
      <div style="font-size:10px;color:var(--text3);margin-top:3px;">${c.operator}</div>
      <div style="font-size:9px;color:var(--text3);margin-top:2px;font-family:var(--fm);">${c.service.split(' ')[0]}</div>
    </div>`;
  }).join('');
}

function togCtr(id){
  const c=S.counters.find(x=>x.id===id);if(!c)return;
  const cy={open:'break',break:'closed',closed:'open'};c.status=cy[c.status];
  renderDash();showToast('🖥',c.name,'Status: '+c.status,'blue');
}
let allOpen=true;
function toggleAll(){
  allOpen=!allOpen;S.counters.forEach(c=>c.status=allOpen?'open':'closed');
  renderDash();showToast(allOpen?'✅':'⊘',allOpen?'All Open':'All Closed','',allOpen?'green':'amber');
}

// ════════════════════════════════════════════════
// RENDER STAFF
// ════════════════════════════════════════════════
function renderStaff() {
  const w = S.queue.filter(q => q.status === 'Waiting' || q.status === 'waiting');
  document.getElementById('s-cnt').textContent = w.length + ' waiting';

  const curDisplay = document.getElementById('s-cur');
  const svcDisplay = document.getElementById('s-svc');

  if (S.currentServing) {
    curDisplay.textContent = S.currentServing.ticketNumber;
    curDisplay.style.color = "var(--blue-lt)";
    
    // Display the Service, Customer Name, AND Counter
    const custName = S.currentServing.customerName || 'Guest';
    const counterName = S.currentServing.counter || 'Counter';
    svcDisplay.innerHTML = `<span style="color:#fff;">${custName}</span> <br/> ${S.currentServing.serviceType} <br/> <span style="color:var(--amber); font-weight:bold;">Please proceed to ${counterName}</span>`;
  } else {
    curDisplay.textContent = '—';
    svcDisplay.textContent = 'No active customer';
    curDisplay.style.color = "var(--text3)";
  }

  const pc={Normal:'bb',VIP:'ba','Elderly / Disability':'bg',Emergency:'br'};
  document.getElementById('s-tbl').innerHTML=!w.length
    ?`<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:18px;">Queue is empty</td></tr>`
    :w.slice(0,14).map(q=>`<tr>
        <td style="font-family:var(--fm);font-weight:600;color:var(--blue-lt);">${q.number}</td>
        <td>${q.name}</td><td>${q.service}</td>
        <td><span class="b ${pc[q.priority]||'bb'}">${q.priority}</span></td>
        <td style="font-family:var(--fm);color:var(--amber);">${q.estimatedWait}m</td>
        <td><button class="btn bsuc bxs" onclick="callNext()">Call Next</button></td>
      </tr>`).join('');
}
function updStaffStatus(){
  const s=document.getElementById('s-status').value;
  const tp={open:'green',break:'amber',closed:'red'};
  showToast('🖥',{open:'Counter Open ✅',break:'On Break ⏸',closed:'Counter Closed ⊘'}[s],'',tp[s]);
}
function updateStaffCounter(){}

// ════════════════════════════════════════════════
// TRACK QUEUE
// ════════════════════════════════════════════════
// 🟢 UPDATED: Allows the Guest to track their live status
function trackQ() {
  const num = document.getElementById('t-inp').value.trim().toUpperCase();
  const res = document.getElementById('t-res'), nf = document.getElementById('t-nf');
  res.style.display = 'none'; nf.style.display = 'none';
  
  // Check if it's currently being served
  if (S.currentServing && S.currentServing.ticketNumber === num) {
    document.getElementById('t-num').textContent = S.currentServing.ticketNumber;
    document.getElementById('t-svc').textContent = S.currentServing.serviceType;
    document.getElementById('t-wait').textContent = 'NOW!';
    document.getElementById('t-now').textContent = `Go to ${S.currentServing.counter}`;
    document.getElementById('t-pos').textContent = 'NOW';
    document.getElementById('t-pos-lbl').textContent = "You're being served!";
    document.getElementById('t-ring').className = 'tring now';
    document.getElementById('t-prog').style.width = '100%';
    document.getElementById('t-pct').textContent = '100% complete';
    res.style.display = 'block';
    return;
  }

  // Check if it's in the waiting queue
  const w = S.queue.filter(q => q.status === 'Waiting' || q.status === 'waiting');
  const e = w.find(q => q.number === num);
  
  if (!e) {
    nf.style.display = 'block'; // Not found or already completed
    return;
  }

  const pos = w.indexOf(e) + 1;
  document.getElementById('t-num').textContent = e.number;
  document.getElementById('t-svc').textContent = e.service;
  document.getElementById('t-wait').textContent = e.estimatedWait + 'm';
  document.getElementById('t-now').textContent = S.currentServing ? S.currentServing.ticketNumber : '—';
  
  document.getElementById('t-pos').textContent = pos;
  document.getElementById('t-pos-lbl').textContent = 'Position in queue';
  document.getElementById('t-ring').className = 'tring';
  
  const pct = Math.min(100, Math.max(5, Math.round(((w.length - pos + 1) / w.length) * 100)));
  document.getElementById('t-prog').style.width = pct + '%';
  document.getElementById('t-pct').textContent = pct + '% complete';
  
  res.style.display = 'block';
}

// ════════════════════════════════════════════════
// DISPLAYS
// ════════════════════════════════════════════════
function updateDisps(){
  const cs=S.currentServing,w=S.queue.filter(q=>q.status==='waiting'),nxt=w[0];
  const avg=w.length?Math.round(w.reduce((a,b)=>a+b.estimatedWait,0)/w.length):0;
  const sco={open:'var(--green)',break:'var(--amber)',closed:'var(--text3)'};
  const tks=S.counters.map(c=>`<div class="dchip" style="border-color:${sco[c.status]};color:${sco[c.status]};">${c.name} — ${c.status.charAt(0).toUpperCase()+c.status.slice(1)}</div>`).join('');
  const d=id=>document.getElementById(id);
  if(d('d-now'))d('d-now').textContent=cs?cs.number:'—';
  if(d('d-svc2'))d('d-svc2').textContent=cs?cs.service:'No active session';
  if(d('d-ctrlbl'))d('d-ctrlbl').textContent=cs?cs.counter:'';
  if(d('d-nxt2'))d('d-nxt2').textContent=nxt?nxt.number:'—';
  if(d('d-wt'))d('d-wt').textContent=w.length;
  if(d('d-avg'))d('d-avg').textContent=avg?avg+'m':'—';
  if(d('d-tks'))d('d-tks').innerHTML=tks;
  if(d('pub-now'))d('pub-now').textContent=cs?cs.number:'—';
  if(d('pub-svc'))d('pub-svc').textContent=cs?cs.service:'No active session';
  if(d('pub-nxt'))d('pub-nxt').textContent=nxt?nxt.number:'—';
  if(d('pub-wt'))d('pub-wt').textContent=w.length;
  if(d('pub-tks'))d('pub-tks').innerHTML=tks;
}

// ════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════
async function renderAnalytics() {
  try {
    const response = await fetch('http://localhost:5000/api/tickets/stats');
    const stats = await response.json();

    // Update the Stat Cards
    document.getElementById('an-sts').innerHTML = `
      <div class="stat"><div class="sv" style="color:var(--blue-lt);">${stats.waitingNow}</div><div class="sl">Waiting Now</div></div>
      <div class="stat"><div class="sv" style="color:var(--green);">${stats.totalServed}</div><div class="sl">Served Today</div></div>
      <div class="stat"><div class="sv" style="color:var(--amber);">${stats.avgWaitTime}</div><div class="sl">Avg Wait</div></div>
      <div class="stat"><div class="sv" style="color:var(--purple);">${stats.totalServed + stats.waitingNow}</div><div class="sl">Total Tickets</div></div>
    `;

    // Update Service Popularity Bars
    const svcGrid = document.getElementById('an-svcs');
    svcGrid.innerHTML = stats.serviceBreakdown.map(s => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
          <span>${s._id}</span><span style="color:var(--blue-lt);">${s.count}</span>
        </div>
        <div class="pw"><div class="pb" style="width:${Math.min(100, s.count * 10)}%;"></div></div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Analytics Fetch Error:', err);
  }
}

// ════════════════════════════════════════════════
// SERVICES PAGE
// ════════════════════════════════════════════════
function renderSvcs(){
  renderCounterGrid('svc-counter-grid', false);
  const cg=document.getElementById('svc-counter-grid');
  const sco={open:'var(--green)',break:'var(--amber)',closed:'var(--text3)'};
  const sl={open:'Open',break:'Break',closed:'Closed'};
  const sbadge={open:'bg',break:'ba',closed:'br'};
  cg.innerHTML=S.counters.map(c=>`
    <div class="card csm" style="border-left:3px solid ${c.color||'var(--blue)'};transition:all 0.2s;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-weight:700;font-size:14px;">${c.name}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px;">${c.service}</div>
        </div>
        <span class="b ${sbadge[c.status]||'bb'}">${sl[c.status]}</span>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px;">👤 ${c.operator}</div>
      <div style="display:flex;gap:6px;">
        <button class="btn bghost bxs" style="flex:1;" onclick="openEditCounter(${c.id})">✏️ Edit</button>
        <button class="btn bxs" style="background:var(--red-dim);color:var(--red);border:1px solid var(--red-bdr);" onclick="confirmDeleteCounter(${c.id})">🗑</button>
        <button class="btn bxs bghost" onclick="togCtr(${c.id})">⇄</button>
      </div>
    </div>`).join('');

  document.getElementById('svc-grid').innerHTML=SVCS.map(s=>{
    const cnt=S.queue.filter(q=>q.service===s&&q.status==='waiting').length;
    return `<div class="card csm">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px;">
        <span style="font-size:20px;">${ICOS[s]}</span>
        <div><div style="font-weight:600;font-size:13px;">${s}</div><div style="font-size:10px;color:var(--text2);font-family:var(--fm);">Prefix: ${PFX[s]}</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:7px;">
        <span style="color:var(--text2);">In queue</span><span style="font-family:var(--fm);color:var(--blue-lt);font-weight:600;">${cnt}</span>
      </div><div class="pw"><div class="pb" style="width:${Math.min(100,cnt*12)}%;"></div></div>
    </div>`;
  }).join('');

  document.getElementById('ctr-tbl').innerHTML=S.counters.map(c=>`<tr>
    <td style="font-weight:600;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color||'var(--blue)'};margin-right:7px;vertical-align:middle;"></span>${c.name}</td>
    <td>${c.service}</td><td>${c.operator}</td>
    <td><span class="b ${sbadge[c.status]||'bb'}">${sl[c.status]}</span></td>
    <td><button class="btn bghost bxs" onclick="openEditCounter(${c.id})">✏️ Edit</button></td>
    <td><button class="btn bxs" style="background:var(--red-dim);color:var(--red);border:1px solid var(--red-bdr);" onclick="confirmDeleteCounter(${c.id})">🗑 Remove</button></td>
  </tr>`).join('');
}

// ════════════════════════════════════════════════
// QR (visual)
// ════════════════════════════════════════════════
function mkQR(str){
  let h=0;for(let i=0;i<str.length;i++)h=((h<<5)-h)+str.charCodeAt(i);
  let cells='';
  for(let r=0;r<7;r++)for(let c=0;c<7;c++){
    const brd=(r<2&&c<2)||(r<2&&c>4)||(r>4&&c<2);
    const on=brd?true:(((h^(r*7+c)*31)>>>0)%3!==0);
    cells+=`<div class="qrc" style="background:${on?'#0d1117':'#fff'};"></div>`;
  }
  return `<div class="qr">${cells}</div>`;
}

// ════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════
function showToast(ico,title,msg,type='blue'){
  const t=document.getElementById('toast');
  const cm={green:'var(--green-dim)',blue:'var(--blue-dim)',amber:'var(--amber-dim)',red:'var(--red-dim)'};
  document.getElementById('t-ico').style.background=cm[type]||'var(--blue-dim)';
  document.getElementById('t-ico').textContent=ico;
  document.getElementById('t-tt').textContent=title;
  document.getElementById('t-tm').textContent=msg;
  t.classList.add('show');clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('show'),3000);
}

// ════════════════════════════════════════════════
// SEED DATA
// ════════════════════════════════════════════════
function seedData(){
  [
    {s:'Customer Service',n:'Amara O.',p:'Normal'},
    {s:'Billing',n:'David K.',p:'VIP'},
    {s:'Technical Support',n:'Sara M.',p:'Normal'},
    {s:'Consultation',n:'Chen L.',p:'Elderly / Disability'},
    {s:'Customer Service',n:'Fatima A.',p:'Normal'},
    {s:'Billing',n:'James T.',p:'Normal'},
    {s:'Order Pickup',n:'Lena R.',p:'Normal'},
    {s:'Account Opening',n:'Mike W.',p:'Emergency'},
  ].forEach(e=>{
    const num=genNum(e.s),ctr=asgnCtr(e.s),wait=estWait(e.s);
    S.queue.push({id:Date.now()+Math.random(),number:num,service:e.s,name:e.n,priority:e.p,
      phone:'',counter:ctr?ctr.name:'Auto',issuedAt:new Date(Date.now()-Math.random()*900000),status:'waiting',estimatedWait:wait});
  });
  for(let i=0;i<9;i++){
    const sv=SVCS[Math.floor(Math.random()*SVCS.length)];
    S.servedToday.push({number:genNum(sv),service:sv,counter:'Counter '+Math.ceil(Math.random()*4),issuedAt:new Date(),servedAt:new Date()});
  }
}
socket.on('ticket-called', (ticket) => {
  // Remove from waiting list in local state
  S.queue = S.queue.filter(q => q.number !== ticket.ticketNumber);
  
  // Update the currently serving slot
  S.currentServing = ticket;
  
  // Refresh everything
  renderDash();
  renderStaff();
  updateDisps();
  
  // Play a chime if you're on the Public Display page
  if (S.role === 'customer') {
    const chime = new Audio('https://www.soundjay.com/buttons/sounds/beep-07.mp3');
    chime.play().catch(() => {}); // Autoplay might block this
  }
});
socket.on('ticket-completed', (ticket) => {
  // If this ticket was being shown as 'Now Serving', clear it globally
  if (S.currentServing && S.currentServing.number === ticket.ticketNumber) {
    S.currentServing = null;
  }
  
  // Update UI components
  renderDash();
  renderStaff();
  updateDisps();
});