const KEYS = ['variations','qa','labour','training'];
const store = key => JSON.parse(localStorage.getItem(key) || '[]');
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const byId = id => document.getElementById(id);
const money = n => `£${Number(n || 0).toFixed(2)}`;
const todayISO = () => new Date().toISOString().slice(0,10);

const schemas = {
  variations: { table:'variationTable', title:'Variation Register', headers:['Ref','Date','Location','Description','Cost','Status'], fields:['ref','date','location','description','cost','status'] },
  qa: { table:'qaTable', title:'QA Tracker', headers:['Date','Area','System','Status','Inspector','Comments'], fields:['date','area','system','status','inspector','comments'] },
  labour: { table:'labourTable', title:'Labour Tracker', headers:['Date','Name','Trade','Hours','Area'], fields:['date','name','trade','hours','area'] },
  training: { table:'trainingTable', title:'Training Matrix', headers:['Name','CSCS','Type','Expiry','Status'], fields:['name','cscs','type','expiry','certStatus'] }
};

function project(){
  return JSON.parse(localStorage.getItem('project') || JSON.stringify({
    projectName:'Waddon Phase 2', projectAddress:'Duppas Hill Road, Croydon, CR0 4BG', mainContractor:'Formation Design & Build', clientName:''
  }));
}

function showTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
  byId(id).classList.add('active');
  document.querySelector(`[data-tab="${id}"]`)?.classList.add('active');
  byId('pageTitle').textContent = document.querySelector(`[data-tab="${id}"]`)?.textContent || 'Dashboard';
  renderAll();
}
document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));

function bindForm(formId,key){
  byId(formId).addEventListener('submit',e=>{
    e.preventDefault();
    const row = Object.fromEntries(new FormData(e.target).entries());
    row.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const data = store(key); data.push(row); save(key,data); e.target.reset(); setDefaultDates(); renderAll();
  });
}
bindForm('variationForm','variations'); bindForm('qaForm','qa'); bindForm('labourForm','labour'); bindForm('trainingForm','training');

function certStatus(row){
  if(!row.expiry) return '';
  const today = new Date(todayISO());
  const exp = new Date(row.expiry);
  const days = Math.ceil((exp - today) / 86400000);
  if(days < 0) return 'Expired';
  if(days <= 14) return 'Warning';
  return 'In Date';
}
function statusClass(value){
  const v = String(value || '').toLowerCase().replace(/[^a-z]/g,'');
  if(v === 'na') return 'status status-na';
  if(['pass','approved','closed','indate'].includes(v)) return 'status status-pass';
  if(['fail','rejected','expired'].includes(v)) return 'status status-fail';
  if(['pending','submitted','open','warning'].includes(v)) return 'status status-warning';
  return 'status';
}
function valueFor(row, field){
  if(field === 'certStatus') return certStatus(row);
  if(field === 'cost') return money(row.cost);
  return row[field] ?? '';
}
function table(key){
  const s = schemas[key]; const el = byId(s.table); if(!el) return;
  const rows = store(key);
  el.innerHTML = '<thead><tr>' + s.headers.map(h=>`<th>${h}</th>`).join('') + '<th>Action</th></tr></thead><tbody>' +
    rows.map((r,i)=>'<tr>' + s.fields.map(f=>{
      const val = valueFor(r,f);
      const isStatus = ['status','certStatus'].includes(f);
      return `<td>${isStatus ? `<span class="${statusClass(val)}">${val}</span>` : escapeHtml(val)}</td>`;
    }).join('') + `<td><button class="danger" onclick="removeRow('${key}',${i})">Delete</button></td></tr>`).join('') + '</tbody>';
}
function escapeHtml(text){return String(text ?? '').replace(/[&<>'"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[m]));}
function removeRow(key,i){const data=store(key);data.splice(i,1);save(key,data);renderAll();}

function renderAll(){
  KEYS.forEach(table);
  const variations = store('variations'), qa = store('qa'), labour = store('labour'), training = store('training');
  const totalVariation = variations.reduce((s,r)=>s+Number(r.cost||0),0);
  const openQA = qa.filter(r=>['open','fail'].includes(String(r.status).toLowerCase())).length;
  const hours = labour.reduce((s,r)=>s+Number(r.hours||0),0);
  const expired = training.filter(r=>certStatus(r)==='Expired').length;
  byId('dashVariations').textContent=variations.length; byId('dashVariationValue').textContent=`${money(totalVariation)} total`;
  byId('dashQA').textContent=qa.length; byId('dashOpenQA').textContent=`${openQA} open/fail`;
  byId('dashLabour').textContent=labour.length; byId('dashHours').textContent=`${hours} hours`;
  byId('dashTraining').textContent=training.length; byId('dashExpired').textContent=`${expired} expired`;
  const p = project(); byId('dashProject').textContent = p.projectName; byId('dashAddress').textContent = p.projectAddress;
}

function calculateInvoice(){
  const gross=parseFloat(byId('gross').value||0), cis=gross*0.2, net=gross-cis;
  byId('invoiceResult').innerHTML=`<h4>NCP Mechanical CIS Invoice</h4><p><b>Name:</b> ${escapeHtml(invName.value)}</p><p><b>Invoice:</b> ${escapeHtml(invNo.value)}</p><p><b>Date:</b> ${escapeHtml(invDate.value)}</p><p><b>Description:</b> ${escapeHtml(workDesc.value)}</p><p><b>Gross:</b> ${money(gross)}</p><p><b>CIS 20% deduction:</b> ${money(cis)}</p><h3>Net Payable: ${money(net)}</h3>`;
}
function saveBriefing(){
  const data = {date:briefDate.value, supervisor:briefSupervisor.value, activities:briefActivities.value, risks:briefRisks.value};
  localStorage.setItem('briefing', JSON.stringify(data));
  byId('briefingResult').innerHTML=`<h4>Daily Start Briefing</h4><p><b>Date:</b> ${escapeHtml(data.date)}</p><p><b>Supervisor:</b> ${escapeHtml(data.supervisor)}</p><p><b>Planned activities:</b> ${escapeHtml(data.activities)}</p><p><b>Risks / permits:</b> ${escapeHtml(data.risks)}</p>`;
}
function saveProject(){
  const data = {projectName:projectName.value, projectAddress:projectAddress.value, mainContractor:mainContractor.value, clientName:clientName.value};
  localStorage.setItem('project', JSON.stringify(data)); renderAll(); alert('Project details saved on this device.');
}
function loadProject(){
  const p = project(); projectName.value=p.projectName||''; projectAddress.value=p.projectAddress||''; mainContractor.value=p.mainContractor||''; clientName.value=p.clientName||'';
}

function exportAllData(){
  const data={project:project(), briefing:JSON.parse(localStorage.getItem('briefing')||'{}'), variations:store('variations'), qa:store('qa'), labour:store('labour'), training:store('training')};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`ncp-portal-backup-${todayISO()}.json`; a.click();
}

function jsPDFReady(){ return window.jspdf && window.jspdf.jsPDF; }
function newDoc(title){
  if(!jsPDFReady()){ alert('PDF library is still loading. Try again in 2 seconds.'); return null; }
  const { jsPDF } = window.jspdf; const doc = new jsPDF({orientation:'landscape'}); const p = project();
  doc.setFontSize(16); doc.text('NCP Mechanical LTD', 14, 15); doc.setFontSize(11); doc.text(title, 14, 23);
  doc.setFontSize(9); doc.text(`Project: ${p.projectName || ''}`, 14, 31); doc.text(`Address: ${p.projectAddress || ''}`, 14, 37); doc.text(`Main Contractor: ${p.mainContractor || ''}`, 14, 43);
  return doc;
}
function rowsForPDF(key, filterFn = () => true){
  const s = schemas[key];
  return store(key).filter(filterFn).map(r => s.fields.map(f => valueFor(r,f)));
}
function addSection(doc, key, title, rows, y){
  const s = schemas[key];
  doc.setFontSize(12); doc.text(title, 14, y);
  doc.autoTable({startY:y+4, head:[s.headers], body:rows.length ? rows : [['No records']], theme:'grid', styles:{fontSize:8,cellPadding:2}, headStyles:{fillColor:[6,79,174]}});
  return doc.lastAutoTable.finalY + 10;
}
function savePDF(doc,name){ doc.save(name); }
function exportSectionPDF(key){
  const s = schemas[key]; const doc = newDoc(s.title); if(!doc) return;
  addSection(doc,key,s.title,rowsForPDF(key),52); savePDF(doc,`${s.title.replaceAll(' ','-').toLowerCase()}-${todayISO()}.pdf`);
}
function exportDailyPDF(){
  const date = byId('dailyReportDate').value; if(!date){ alert('Select a date first.'); return; }
  const doc = newDoc(`Daily Site Report - ${date}`); if(!doc) return; let y = 54;
  y = addSection(doc,'variations','Variations',rowsForPDF('variations', r=>r.date===date),y);
  y = addSection(doc,'qa','QA Items',rowsForPDF('qa', r=>r.date===date),y);
  y = addSection(doc,'labour','Labour Records',rowsForPDF('labour', r=>r.date===date),y);
  y = addSection(doc,'training','Training Matrix',rowsForPDF('training'),y);
  savePDF(doc,`ncp-daily-report-${date}.pdf`);
}
function exportMonthlyPDF(){
  const month = byId('monthlyReportDate').value; if(!month){ alert('Select a month first.'); return; }
  const inMonth = r => String(r.date || r.expiry || '').startsWith(month);
  const doc = newDoc(`Monthly Site Report - ${month}`); if(!doc) return; let y = 54;
  y = addSection(doc,'variations','Variations',rowsForPDF('variations', inMonth),y);
  y = addSection(doc,'qa','QA Items',rowsForPDF('qa', inMonth),y);
  y = addSection(doc,'labour','Labour Records',rowsForPDF('labour', inMonth),y);
  y = addSection(doc,'training','Training Expiring This Month',rowsForPDF('training', inMonth),y);
  savePDF(doc,`ncp-monthly-report-${month}.pdf`);
}
function exportInvoicePDF(){
  calculateInvoice(); const doc = newDoc(`CIS Invoice ${invNo.value || ''}`); if(!doc) return;
  const gross=parseFloat(byId('gross').value||0), cis=gross*0.2, net=gross-cis;
  doc.autoTable({startY:55, body:[['Subcontractor',invName.value],['Invoice No',invNo.value],['Date',invDate.value],['Works',workDesc.value],['Gross',money(gross)],['CIS 20% Deduction',money(cis)],['Net Payable',money(net)]], theme:'grid', styles:{fontSize:10}, columnStyles:{0:{fontStyle:'bold'}}});
  savePDF(doc,`cis-invoice-${invNo.value || todayISO()}.pdf`);
}
function exportBriefingPDF(){
  const b = JSON.parse(localStorage.getItem('briefing')||'{}'); const doc = newDoc(`Daily Start Briefing ${b.date || ''}`); if(!doc) return;
  doc.autoTable({startY:55, body:[['Date',b.date||''],['Supervisor / Site Manager',b.supervisor||''],['Planned Activities',b.activities||''],['Key Risks / Permits',b.risks||'']], theme:'grid', styles:{fontSize:10}, columnStyles:{0:{fontStyle:'bold'}}});
  savePDF(doc,`daily-briefing-${b.date || todayISO()}.pdf`);
}
function setDefaultDates(){
  ['invDate','briefDate','dailyReportDate'].forEach(id=>{ if(byId(id) && !byId(id).value) byId(id).value = todayISO(); });
  if(byId('monthlyReportDate') && !byId('monthlyReportDate').value) byId('monthlyReportDate').value = todayISO().slice(0,7);
  byId('todayText').textContent = new Date().toLocaleDateString('en-GB',{weekday:'long', day:'2-digit', month:'short', year:'numeric'});
}
loadProject(); setDefaultDates(); renderAll();
