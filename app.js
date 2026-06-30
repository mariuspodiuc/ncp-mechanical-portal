const KEYS = ['variations','qa','labour','training'];
const store = key => JSON.parse(localStorage.getItem(key) || '[]');
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const byId = id => document.getElementById(id);
const money = n => `£${Number(n || 0).toFixed(2)}`;
const todayISO = () => new Date().toISOString().slice(0,10);
const sigPads = {};
const OPERATIVE_ROWS = 12;

const schemas = {
  variations: { table:'variationTable', title:'Variation Register', headers:['Ref','Date','Location','Description','Cost','Status'], fields:['ref','date','location','description','cost','status'] },
  qa: { table:'qaTable', title:'QA Tracker', headers:['Date','Area','System','Status','Inspector','Comments'], fields:['date','area','system','status','inspector','comments'] },
  labour: { table:'labourTable', title:'Labour Tracker', headers:['Date','Name','Trade','Hours','Area'], fields:['date','name','trade','hours','area'] },
  training: { table:'trainingTable', title:'Training Matrix', headers:['Name','CSCS','Type','Expiry','Status'], fields:['name','cscs','type','expiry','certStatus'] }
};

function project(){return JSON.parse(localStorage.getItem('project') || JSON.stringify({projectName:'Waddon Phase 2', projectAddress:'Duppas Hill Road, Croydon, CR0 4BG', mainContractor:'Formation Design & Build', clientName:''}));}
function operativeNames(){return JSON.parse(localStorage.getItem('operativeNames') || '["Marius Podiuc","Jamie Dickson"]');}
function saveOperativeNames(names){localStorage.setItem('operativeNames', JSON.stringify([...new Set(names.filter(Boolean))]));}
function escapeHtml(text){return String(text ?? '').replace(/[&<>'"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[m]));}

document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));
function showTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
  byId(id).classList.add('active');
  document.querySelector(`[data-tab="${id}"]`)?.classList.add('active');
  byId('pageTitle').textContent = document.querySelector(`[data-tab="${id}"]`)?.textContent || 'Dashboard';
  renderAll();
  if(id === 'briefing') setTimeout(initSignaturePads, 50);
}

function bindForm(formId,key){
  byId(formId).addEventListener('submit',e=>{e.preventDefault();const row=Object.fromEntries(new FormData(e.target).entries());row.id=crypto.randomUUID?crypto.randomUUID():String(Date.now());const data=store(key);data.push(row);save(key,data);e.target.reset();setDefaultDates();renderAll();});
}
bindForm('variationForm','variations'); bindForm('qaForm','qa'); bindForm('labourForm','labour'); bindForm('trainingForm','training');

function certStatus(row){if(!row.expiry) return '';const today=new Date(todayISO());const exp=new Date(row.expiry);const days=Math.ceil((exp-today)/86400000);if(days<0)return'Expired';if(days<=14)return'Warning';return'In Date';}
function statusClass(value){const v=String(value||'').toLowerCase().replace(/[^a-z]/g,'');if(v==='na')return'status status-na';if(['pass','approved','closed','indate'].includes(v))return'status status-pass';if(['fail','rejected','expired'].includes(v))return'status status-fail';if(['pending','submitted','open','warning'].includes(v))return'status status-warning';return'status';}
function valueFor(row, field){if(field==='certStatus')return certStatus(row);if(field==='cost')return money(row.cost);return row[field]??'';}
function table(key){const s=schemas[key], el=byId(s.table); if(!el)return;const rows=store(key);el.innerHTML='<thead><tr>'+s.headers.map(h=>`<th>${h}</th>`).join('')+'<th>Action</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr>'+s.fields.map(f=>{const val=valueFor(r,f);const isStatus=['status','certStatus'].includes(f);return `<td>${isStatus?`<span class="${statusClass(val)}">${val}</span>`:escapeHtml(val)}</td>`;}).join('')+`<td><button class="danger" onclick="removeRow('${key}',${i})">Delete</button></td></tr>`).join('')+'</tbody>';}
function removeRow(key,i){const data=store(key);data.splice(i,1);save(key,data);renderAll();}
function renderAll(){KEYS.forEach(table);const variations=store('variations'),qa=store('qa'),labour=store('labour'),training=store('training');byId('dashVariations').textContent=variations.length;byId('dashVariationValue').textContent=`${money(variations.reduce((s,r)=>s+Number(r.cost||0),0))} total`;byId('dashQA').textContent=qa.length;byId('dashOpenQA').textContent=`${qa.filter(r=>['open','fail'].includes(String(r.status).toLowerCase())).length} open/fail`;byId('dashLabour').textContent=labour.length;byId('dashHours').textContent=`${labour.reduce((s,r)=>s+Number(r.hours||0),0)} hours`;byId('dashTraining').textContent=training.length;byId('dashExpired').textContent=`${training.filter(r=>certStatus(r)==='Expired').length} expired`;const p=project();byId('dashProject').textContent=p.projectName;byId('dashAddress').textContent=p.projectAddress;}

function addOperativeName(){const input=byId('newOperativeName');const name=input.value.trim();if(!name)return;const names=operativeNames();names.push(name);saveOperativeNames(names);input.value='';renderAttendanceRows(getBriefing());}
function renderAttendanceRows(saved={}){
  const names=operativeNames();const rows=saved.attendance||[];const tbody=byId('attendanceRows');if(!tbody)return;
  tbody.innerHTML='';
  for(let i=0;i<OPERATIVE_ROWS;i++){
    const row=rows[i]||{};
    const opts=['',...names].map(n=>`<option ${n===row.name?'selected':''}>${escapeHtml(n)}</option>`).join('');
    tbody.insertAdjacentHTML('beforeend',`<tr><td>${i+1}</td><td><select id="opName${i}">${opts}</select></td><td><input id="opTrade${i}" value="${escapeHtml(row.trade||'')}" placeholder="Company / Trade"></td><td><canvas id="sig${i}" class="signature-pad"></canvas><span id="sigStatus${i}" class="${row.signature?'signed-badge':'unsigned-badge'}">${row.signature?'Signed':'Not signed'}</span></td><td><button class="small-btn ghost" onclick="clearSignature(${i})">Clear</button></td></tr>`);
  }
  setTimeout(()=>{initSignaturePads(); rows.forEach((r,i)=>{ if(r.signature) loadSignature(i,r.signature); });},60);
}
function initSignaturePads(){
  for(let i=0;i<OPERATIVE_ROWS;i++){const canvas=byId('sig'+i);if(!canvas || sigPads[i]) continue;setupCanvas(canvas,i);}
}
function setupCanvas(canvas,i){
  const ctx=canvas.getContext('2d');let drawing=false;let hasInk=false;
  function resize(){const ratio=Math.max(window.devicePixelRatio||1,1);const rect=canvas.getBoundingClientRect();const data=hasInk?canvas.toDataURL():null;canvas.width=rect.width*ratio;canvas.height=rect.height*ratio;ctx.scale(ratio,ratio);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.strokeStyle='#111827';ctx.fillStyle='#fff';ctx.fillRect(0,0,rect.width,rect.height);if(data) loadSignature(i,data);}
  function pos(e){const r=canvas.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
  function start(e){e.preventDefault();drawing=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);}function move(e){if(!drawing)return;e.preventDefault();const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();hasInk=true;byId('sigStatus'+i).className='signed-badge';byId('sigStatus'+i).textContent='Signed';}
  function end(){drawing=false;saveBriefing(false);}canvas.addEventListener('mousedown',start);canvas.addEventListener('mousemove',move);window.addEventListener('mouseup',end);canvas.addEventListener('touchstart',start,{passive:false});canvas.addEventListener('touchmove',move,{passive:false});canvas.addEventListener('touchend',end);sigPads[i]={canvas,ctx,resize};resize();}
function clearSignature(i){const c=byId('sig'+i);if(!c)return;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);byId('sigStatus'+i).className='unsigned-badge';byId('sigStatus'+i).textContent='Not signed';saveBriefing(false);}
function clearAllSignatures(){for(let i=0;i<OPERATIVE_ROWS;i++)clearSignature(i);}
function loadSignature(i,data){const c=byId('sig'+i);if(!c||!data)return;const img=new Image();img.onload=()=>{const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);byId('sigStatus'+i).className='signed-badge';byId('sigStatus'+i).textContent='Signed';};img.src=data;}
function getSignatureData(i){const c=byId('sig'+i);if(!c)return'';const blank=document.createElement('canvas');blank.width=c.width;blank.height=c.height;const b=blank.getContext('2d');b.fillStyle='#fff';b.fillRect(0,0,blank.width,blank.height);return c.toDataURL()===blank.toDataURL()?'':c.toDataURL('image/png');}
function briefingFields(){return ['bProject','bAddress','bMainContractor','briefDate','bWeather','bStartTime','bSiteManager','bSupervisor','bFirstAider','bFireMarshal','bEmergency','bActivities','bKeyMessage','bPermits','bManagerSignName','bManagerSignTime'];}
function getBriefing(){return JSON.parse(localStorage.getItem('briefing')||'{}');}
function saveBriefing(showAlert=true){
  const attendance=[];for(let i=0;i<OPERATIVE_ROWS;i++){attendance.push({name:byId('opName'+i)?.value||'',trade:byId('opTrade'+i)?.value||'',signature:getSignatureData(i)});}const checks={ppe:cPpe.checked,rams:cRams.checked,manual:cManual.checked,height:cHeight.checked,housekeeping:cHousekeeping.checked,permit:cPermit.checked};
  const data={};briefingFields().forEach(id=>data[id]=byId(id)?.value||'');data.checks=checks;data.attendance=attendance;localStorage.setItem('briefing',JSON.stringify(data));if(showAlert)alert('Daily briefing saved.');return data;
}
function loadBriefing(){const p=project(), b=getBriefing();bProject.value=b.bProject||p.projectName;bAddress.value=b.bAddress||p.projectAddress;bMainContractor.value=b.bMainContractor||p.mainContractor;briefDate.value=b.briefDate||todayISO();bSupervisor.value=b.bSupervisor||'Marius Podiuc';briefingFields().forEach(id=>{if(byId(id)&&b[id])byId(id).value=b[id];});if(b.checks){cPpe.checked=!!b.checks.ppe;cRams.checked=!!b.checks.rams;cManual.checked=!!b.checks.manual;cHeight.checked=!!b.checks.height;cHousekeeping.checked=!!b.checks.housekeeping;cPermit.checked=!!b.checks.permit;}renderAttendanceRows(b);}

function calculateInvoice(){const gross=parseFloat(byId('gross').value||0),cis=gross*0.2,net=gross-cis;byId('invoiceResult').innerHTML=`<h4>NCP Mechanical CIS Invoice</h4><p><b>Name:</b> ${escapeHtml(invName.value)}</p><p><b>Invoice:</b> ${escapeHtml(invNo.value)}</p><p><b>Date:</b> ${escapeHtml(invDate.value)}</p><p><b>Description:</b> ${escapeHtml(workDesc.value)}</p><p><b>Gross:</b> ${money(gross)}</p><p><b>CIS 20% deduction:</b> ${money(cis)}</p><h3>Net Payable: ${money(net)}</h3>`;}
function saveProject(){const data={projectName:projectName.value,projectAddress:projectAddress.value,mainContractor:mainContractor.value,clientName:clientName.value};localStorage.setItem('project',JSON.stringify(data));bProject.value=data.projectName;bAddress.value=data.projectAddress;bMainContractor.value=data.mainContractor;renderAll();alert('Project details saved on this device.');}
function loadProject(){const p=project();projectName.value=p.projectName||'';projectAddress.value=p.projectAddress||'';mainContractor.value=p.mainContractor||'';clientName.value=p.clientName||'';}
function exportAllData(){const data={project:project(),briefing:getBriefing(),variations:store('variations'),qa:store('qa'),labour:store('labour'),training:store('training'),operativeNames:operativeNames()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ncp-portal-backup-${todayISO()}.json`;a.click();}

function jsPDFReady(){return window.jspdf && window.jspdf.jsPDF;}function newDoc(title,portrait=false){if(!jsPDFReady()){alert('PDF library is still loading. Try again in 2 seconds.');return null;}const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:portrait?'portrait':'landscape'});const p=project();doc.setFontSize(16);doc.text('NCP Mechanical LTD',14,15);doc.setFontSize(11);doc.text(title,14,23);doc.setFontSize(9);doc.text(`Project: ${p.projectName||''}`,14,31);doc.text(`Address: ${p.projectAddress||''}`,14,37);doc.text(`Main Contractor: ${p.mainContractor||''}`,14,43);return doc;}
function rowsForPDF(key,filterFn=()=>true){const s=schemas[key];return store(key).filter(filterFn).map(r=>s.fields.map(f=>valueFor(r,f)));}
function addSection(doc,key,title,rows,y){const s=schemas[key];doc.setFontSize(12);doc.text(title,14,y);doc.autoTable({startY:y+4,head:[s.headers],body:rows.length?rows:[['No records']],theme:'grid',styles:{fontSize:8,cellPadding:2},headStyles:{fillColor:[6,79,174]}});return doc.lastAutoTable.finalY+10;}
function savePDF(doc,name){doc.save(name);}function exportSectionPDF(key){const s=schemas[key];const doc=newDoc(s.title);if(!doc)return;addSection(doc,key,s.title,rowsForPDF(key),52);savePDF(doc,`${s.title.replaceAll(' ','-').toLowerCase()}-${todayISO()}.pdf`);}
function exportDailyPDF(){const date=byId('dailyReportDate').value;if(!date){alert('Select a date first.');return;}const doc=newDoc(`Daily Site Report - ${date}`);if(!doc)return;let y=54;y=addSection(doc,'variations','Variations',rowsForPDF('variations',r=>r.date===date),y);y=addSection(doc,'qa','QA Items',rowsForPDF('qa',r=>r.date===date),y);y=addSection(doc,'labour','Labour Records',rowsForPDF('labour',r=>r.date===date),y);y=addSection(doc,'training','Training Matrix',rowsForPDF('training'),y);savePDF(doc,`ncp-daily-report-${date}.pdf`);}
function exportMonthlyPDF(){const month=byId('monthlyReportDate').value;if(!month){alert('Select a month first.');return;}const inMonth=r=>String(r.date||r.expiry||'').startsWith(month);const doc=newDoc(`Monthly Site Report - ${month}`);if(!doc)return;let y=54;y=addSection(doc,'variations','Variations',rowsForPDF('variations',inMonth),y);y=addSection(doc,'qa','QA Items',rowsForPDF('qa',inMonth),y);y=addSection(doc,'labour','Labour Records',rowsForPDF('labour',inMonth),y);y=addSection(doc,'training','Training Expiring This Month',rowsForPDF('training',inMonth),y);savePDF(doc,`ncp-monthly-report-${month}.pdf`);}
function exportInvoicePDF(){calculateInvoice();const doc=newDoc(`CIS Invoice ${invNo.value||''}`);if(!doc)return;const gross=parseFloat(byId('gross').value||0),cis=gross*0.2,net=gross-cis;doc.autoTable({startY:55,body:[['Subcontractor',invName.value],['Invoice No',invNo.value],['Date',invDate.value],['Works',workDesc.value],['Gross',money(gross)],['CIS 20% Deduction',money(cis)],['Net Payable',money(net)]],theme:'grid',styles:{fontSize:10},columnStyles:{0:{fontStyle:'bold'}}});savePDF(doc,`cis-invoice-${invNo.value||todayISO()}.pdf`);}
function exportBriefingPDF(){
  const b=saveBriefing(false);
  const doc=newDoc(`Daily Start Briefing ${b.briefDate||todayISO()}`,true);
  if(!doc)return;

  doc.setFontSize(15);
  doc.text('DAILY START BRIEFING SHEET',105,54,{align:'center'});

  doc.autoTable({
    startY:60,
    theme:'grid',
    styles:{fontSize:8,cellPadding:2},
    columnStyles:{0:{fontStyle:'bold',fillColor:[234,242,255]},2:{fontStyle:'bold',fillColor:[234,242,255]}},
    body:[
      ['Project',b.bProject||'','Date',b.briefDate||''],
      ['Site Address',b.bAddress||'','Weather',b.bWeather||''],
      ['Main Contractor',b.bMainContractor||'','Start Time',b.bStartTime||''],
      ['Site Manager',b.bSiteManager||'','Supervisor',b.bSupervisor||''],
      ['First Aider',b.bFirstAider||'','Fire Marshal',b.bFireMarshal||''],
      ['Emergency Point',b.bEmergency||'','','']
    ]
  });

  let y=doc.lastAutoTable.finalY+6;
  doc.autoTable({
    startY:y,
    theme:'grid',
    styles:{fontSize:8,cellPadding:2},
    columnStyles:{0:{fontStyle:'bold',fillColor:[234,242,255]},1:{cellWidth:135}},
    body:[
      ['Planned Activities',b.bActivities||''],
      ['Health & Safety Briefing',checksText(b.checks)+'\n'+(b.bKeyMessage||'')],
      ['Deliveries / Plant / Permits',b.bPermits||'']
    ]
  });

  y=doc.lastAutoTable.finalY+7;
  doc.setFontSize(10);
  doc.text('Operative Attendance Register',14,y);
  y+=4;

  const attendanceRows=(b.attendance||[])
    .filter(r=>r.name||r.trade||r.signature)
    .map((r,i)=>({
      no:String(i+1),
      name:r.name||'',
      trade:r.trade||'',
      signature:r.signature||'',
      status:r.signature?'Signed':'Not signed'
    }));

  const tableBody = attendanceRows.length
    ? attendanceRows.map(r=>[r.no,r.name,r.trade,r.status])
    : [['','No operatives entered','','']];

  doc.autoTable({
    startY:y,
    head:[['No.','Operative Name','Company / Trade','Signature']],
    body:tableBody,
    theme:'grid',
    styles:{fontSize:8,cellPadding:2,minCellHeight:18,valign:'middle'},
    headStyles:{fillColor:[6,79,174],textColor:[255,255,255]},
    columnStyles:{0:{cellWidth:12,halign:'center'},1:{cellWidth:55},2:{cellWidth:45},3:{cellWidth:70,halign:'center'}},
    didDrawCell:function(data){
      if(data.section !== 'body' || data.column.index !== 3) return;
      const row=attendanceRows[data.row.index];
      if(!row || !row.signature) return;
      const imgW=Math.min(58,data.cell.width-6);
      const imgH=14;
      const x=data.cell.x+(data.cell.width-imgW)/2;
      const yImg=data.cell.y+(data.cell.height-imgH)/2;
      doc.addImage(row.signature,'PNG',x,yImg,imgW,imgH);
    }
  });

  y=doc.lastAutoTable.finalY+6;
  if(y>276){doc.addPage();y=20;}
  doc.setFontSize(9);
  doc.text(`Site Manager Sign Off: ${b.bManagerSignName||''}`,14,y);
  doc.text(`Time: ${b.bManagerSignTime||''}`,150,y);

  savePDF(doc,`daily-start-briefing-${b.briefDate||todayISO()}.pdf`);
}
function checksText(c={}){const a=[];if(c.ppe)a.push('PPE');if(c.rams)a.push('RAMS Reviewed');if(c.manual)a.push('Manual Handling');if(c.height)a.push('Working at Height');if(c.housekeeping)a.push('Housekeeping');if(c.permit)a.push('Permit to Work');return a.join(' | ');}
function setDefaultDates(){['invDate','briefDate','dailyReportDate'].forEach(id=>{if(byId(id)&&!byId(id).value)byId(id).value=todayISO();});if(byId('monthlyReportDate')&&!byId('monthlyReportDate').value)byId('monthlyReportDate').value=todayISO().slice(0,7);byId('todayText').textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'short',year:'numeric'});}
window.addEventListener('resize',()=>Object.values(sigPads).forEach(p=>p.resize && p.resize()));
loadProject();setDefaultDates();loadBriefing();renderAll();
