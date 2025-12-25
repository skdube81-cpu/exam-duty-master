/* Exam Duty Master (GitHub Pages) — No backend */
const STORAGE_KEY="exam_duty_master_v1";
const nowISO=()=>new Date().toISOString();
const uuid=()=>Math.random().toString(16).slice(2)+"-"+Date.now().toString(16);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const normShift=s=>{s=(s||"").toUpperCase().trim();return (s==="M"||s==="E")?s:"M";};
const otherShift=s=>s==="M"?"E":"M";
const roomCode=n=>"R"+String(n).padStart(2,"0");
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function toCSV(rows){const e=v=>{const s=(v===null||v===undefined)?"":String(v);return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};return rows.map(r=>r.map(e).join(",")).join("\n");}
function dl(name,text,mime="text/plain;charset=utf-8"){const b=new Blob([text],{type:mime});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);}
function loadState(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return{meta:{createdAt:nowISO(),updatedAt:nowISO()},faculty:[],schedule:[],allocations:[]};try{const o=JSON.parse(raw);o.meta||={createdAt:nowISO(),updatedAt:nowISO()};o.faculty||=[];o.schedule||=[];o.allocations||=[];return o;}catch{ return{meta:{createdAt:nowISO(),updatedAt:nowISO()},faculty:[],schedule:[],allocations:[]};}}
function saveState(){state.meta.updatedAt=nowISO();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
let state=loadState();

// Tabs
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const t=btn.dataset.tab;
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    document.querySelector("#tab-"+t).classList.add("active");
    if(t==="faculty")renderFaculty();
    if(t==="schedule")renderSchedule();
    if(t==="assign"){renderRestrictList();}
    if(t==="reports"){renderTotals();renderDuty01Preview();}
  });
});

// Faculty
const fBody=document.querySelector("#facultyTable tbody");
const fSearch=document.querySelector("#facultySearch");
fSearch.addEventListener("input",renderFaculty);
document.querySelector("#btnFacultyAdd").addEventListener("click",()=>{
  const name=document.querySelector("#facultyName").value.trim();
  const active=document.querySelector("#facultyActive").checked;
  const notes=document.querySelector("#facultyNotes").value.trim();
  if(!name)return alert("Faculty name is required.");
  state.faculty.push({id:uuid(),name,active,notes});
  document.querySelector("#facultyName").value="";
  document.querySelector("#facultyNotes").value="";
  document.querySelector("#facultyActive").checked=true;
  saveState();renderFaculty();renderRestrictList();renderTotals();renderDuty01Preview();
});
document.querySelector("#btnFacultyBulkAdd").addEventListener("click",()=>{
  const txt=document.querySelector("#facultyBulk").value;
  const lines=txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(!lines.length)return alert("Paste one name per line.");
  const existing=new Set(state.faculty.map(f=>f.name.toLowerCase()));
  let added=0;
  for(const nm of lines){const k=nm.toLowerCase();if(existing.has(k))continue;state.faculty.push({id:uuid(),name:nm,active:true,notes:""});existing.add(k);added++;}
  saveState();alert(`Added ${added} faculty.`);renderFaculty();renderRestrictList();renderTotals();renderDuty01Preview();
});
document.querySelector("#btnFacultyBulkClear").addEventListener("click",()=>document.querySelector("#facultyBulk").value="");
document.querySelector("#btnFacultyExportCsv").addEventListener("click",()=>{
  const rows=[["id","name","active","notes"]];
  for(const f of state.faculty)rows.push([f.id,f.name,f.active?1:0,f.notes||""]);
  dl("faculty_master.csv",toCSV(rows),"text/csv;charset=utf-8");
});
function renderFaculty(){
  const q=fSearch.value.trim().toLowerCase();
  const items=[...state.faculty].sort((a,b)=>a.name.localeCompare(b.name));
  fBody.innerHTML="";
  for(const f of items){
    if(q && !f.name.toLowerCase().includes(q))continue;
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${esc(f.name)}</td>
      <td>${f.active?'<span class="pill ok">Active</span>':'<span class="pill bad">Inactive</span>'}</td>
      <td class="right"></td>`;
    const td=tr.querySelector("td.right");
    const tgl=document.createElement("button");tgl.className="btn";tgl.textContent=f.active?"Deactivate":"Activate";
    tgl.onclick=()=>{f.active=!f.active;saveState();renderFaculty();renderRestrictList();renderTotals();renderDuty01Preview();};
    const del=document.createElement("button");del.className="btn danger";del.textContent="Delete";del.style.marginLeft="8px";
    del.onclick=()=>{if(!confirm("Delete faculty? Allocations will be removed."))return;state.faculty=state.faculty.filter(x=>x.id!==f.id);state.allocations=state.allocations.filter(a=>a.facultyId!==f.id);saveState();renderFaculty();renderRestrictList();renderTotals();renderDuty01Preview();};
    td.appendChild(tgl);td.appendChild(del);
    fBody.appendChild(tr);
  }
}
const activeFaculty=()=>state.faculty.filter(f=>f.active);

// Schedule
const sBody=document.querySelector("#scheduleTable tbody");
const skey=(d,sh)=>`${d}__${sh}`;
const sortedSchedule=()=>[...state.schedule].sort((a,b)=>a.date!==b.date?a.date.localeCompare(b.date):a.shift.localeCompare(b.shift));
function upsertSchedule(d,sh,rooms){
  const k=skey(d,sh);
  const i=state.schedule.findIndex(x=>skey(x.date,x.shift)===k);
  if(i>=0)state.schedule[i].rooms=rooms; else state.schedule.push({date:d,shift:sh,rooms});
}
function renderSchedule(){
  const items=sortedSchedule();
  sBody.innerHTML="";
  for(const s of items){
    const tr=document.createElement("tr");
    tr.innerHTML=`<td class="mono">${esc(s.date)}</td><td>${esc(s.shift)}</td><td>${s.rooms}</td><td class="right"></td>`;
    const td=tr.querySelector("td.right");
    const del=document.createElement("button");del.className="btn danger";del.textContent="Remove";
    del.onclick=()=>{if(!confirm("Remove schedule entry?"))return;state.schedule=state.schedule.filter(x=>skey(x.date,x.shift)!==skey(s.date,s.shift));saveState();renderSchedule();renderDuty01Preview();};
    td.appendChild(del);sBody.appendChild(tr);
  }
}
document.querySelector("#btnScheduleUpsert").addEventListener("click",()=>{
  const d=document.querySelector("#schedDate").value;
  const sh=normShift(document.querySelector("#schedShift").value);
  const rooms=clamp(parseInt(document.querySelector("#schedRooms").value||"0",10),1,15);
  if(!d)return alert("Select exam date.");
  upsertSchedule(d,sh,rooms);saveState();renderSchedule();renderDuty01Preview();
});
document.querySelector("#btnScheduleBulkAdd").addEventListener("click",()=>{
  const txt=document.querySelector("#scheduleBulk").value;
  const lines=txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(!lines.length)return alert("Paste lines: YYYY-MM-DD,M,15");
  let ok=0,bad=0;
  for(const line of lines){
    const p=line.split(",").map(s=>s.trim());
    if(p.length<3){bad++;continue;}
    const d=p[0], sh=normShift(p[1]), rooms=parseInt(p[2],10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d) || !(rooms>=1&&rooms<=15)){bad++;continue;}
    upsertSchedule(d,sh,rooms);ok++;
  }
  saveState();alert(`Added/updated ${ok} entries. Skipped ${bad}.`);renderSchedule();renderDuty01Preview();
});
document.querySelector("#btnScheduleBulkClear").addEventListener("click",()=>document.querySelector("#scheduleBulk").value="");
document.querySelector("#btnScheduleExportCsv").addEventListener("click",()=>{
  const rows=[["date","shift","rooms"]];
  for(const s of sortedSchedule())rows.push([s.date,s.shift,s.rooms]);
  dl("schedule_master.csv",toCSV(rows),"text/csv;charset=utf-8");
});

// Assign
const restrictList=document.querySelector("#restrictList");
const restrictSearch=document.querySelector("#restrictSearch");
restrictSearch.addEventListener("input",renderRestrictList);
document.querySelector("#btnRestrictSelectNone").addEventListener("click",()=>restrictList.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.checked=false));
document.querySelector("#btnRestrictSelectAll").addEventListener("click",()=>restrictList.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.checked=true));
function renderRestrictList(){
  const q=restrictSearch.value.trim().toLowerCase();
  const items=activeFaculty().sort((a,b)=>a.name.localeCompare(b.name));
  restrictList.innerHTML="";
  for(const f of items){
    if(q && !f.name.toLowerCase().includes(q))continue;
    const lbl=document.createElement("label");lbl.className="check";
    lbl.innerHTML=`<input type="checkbox" data-fid="${f.id}"><span>${esc(f.name)}</span>`;
    restrictList.appendChild(lbl);
  }
}
function getRestrictedSet(){
  const s=new Set();
  restrictList.querySelectorAll("input[type=checkbox]").forEach(cb=>{if(cb.checked)s.add(cb.dataset.fid);});
  return s;
}
const roomsFor=(d,sh)=>{const x=state.schedule.find(s=>s.date===d && s.shift===sh);return x?x.rooms:null;};

function runAssignment({date,shift,rooms,restricted,overwrite}){
  if(overwrite) state.allocations = state.allocations.filter(a=>!(a.date===date && a.shift===shift));
  else if(state.allocations.some(a=>a.date===date && a.shift===shift)) return alert("Allocations already exist; enable overwrite.");
  const slotsNeeded=rooms*2;
  const candidates=activeFaculty().filter(f=>!restricted.has(f.id));
  if(!candidates.length) return alert("No candidates available (all restricted or none active).");
  const total=new Map(); for(const a of state.allocations) total.set(a.facultyId,(total.get(a.facultyId)||0)+1);
  const assignedOther=new Set(state.allocations.filter(a=>a.date===date && a.shift===otherShift(shift)).map(a=>a.facultyId));
  const ranked=[...candidates].sort((a,b)=>{
    const p1=assignedOther.has(a.id)?1:0, p2=assignedOther.has(b.id)?1:0;
    if(p1!==p2) return p1-p2;
    const t1=total.get(a.id)||0, t2=total.get(b.id)||0;
    if(t1!==t2) return t1-t2;
    return Math.random()-0.5;
  });
  const chosen=[];
  for(const f of ranked){ if(!assignedOther.has(f.id)){chosen.push(f); if(chosen.length>=slotsNeeded)break;} }
  if(chosen.length<slotsNeeded){ for(const f of ranked){ if(!chosen.includes(f)){chosen.push(f); if(chosen.length>=slotsNeeded)break;} } }
  let idx=0;
  for(let room=1; room<=rooms; room++){
    for(let slot=1; slot<=2; slot++){
      if(idx>=chosen.length) break;
      state.allocations.push({date,shift,room,slot,facultyId:chosen[idx].id});
      idx++;
    }
  }
}
document.querySelector("#btnRunAssign").addEventListener("click",()=>{
  const d=document.querySelector("#assignDate").value;
  const sh=normShift(document.querySelector("#assignShift").value);
  const roomsRaw=document.querySelector("#assignRooms").value.trim();
  const overwrite=document.querySelector("#assignOverwrite").checked;
  if(!d) return alert("Select exam date.");
  let rooms=roomsRaw?parseInt(roomsRaw,10):null;
  if(!rooms){ rooms=roomsFor(d,sh); if(!rooms) return alert("Rooms not provided and not found in Schedule."); }
  rooms=clamp(rooms,1,15);
  runAssignment({date:d,shift:sh,rooms,restricted:getRestrictedSet(),overwrite});
  saveState();
  // switch to reports
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active", b.dataset.tab==="reports"));
  document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active", p.id==="tab-reports"));
  document.querySelector("#repDate").value=d;
  document.querySelector("#repShift").value=sh;
  loadReport();
  alert("Assignment complete. Check Reports.");
});

// Reports
const rwBody=document.querySelector("#roomwiseTable tbody");
const tBody=document.querySelector("#totalsTable tbody");
const dHead=document.querySelector("#duty01Table thead");
const dBody=document.querySelector("#duty01Table tbody");
const facultyById=id=>state.faculty.find(f=>f.id===id)||null;
function buildRoomwise(date,shift){
  const assignedOther=new Set(state.allocations.filter(a=>a.date===date && a.shift===otherShift(shift)).map(a=>a.facultyId));
  const allocs=state.allocations.filter(a=>a.date===date && a.shift===shift);
  const rooms=new Map();
  for(const a of allocs){ if(!rooms.has(a.room)) rooms.set(a.room,[]); rooms.get(a.room).push(a); }
  const rows=[["Room","Faculty 1","Faculty 2","Note"]];
  for(const r of [...rooms.keys()].sort((a,b)=>a-b)){
    const slots=rooms.get(r).sort((x,y)=>x.slot-y.slot);
    const f1=slots[0]? (facultyById(slots[0].facultyId)?.name||"") : "";
    const f2=slots[1]? (facultyById(slots[1].facultyId)?.name||"") : "";
    const note=[];
    if(slots[0] && assignedOther.has(slots[0].facultyId)) note.push("DUP(shift)");
    if(slots[1] && assignedOther.has(slots[1].facultyId)) note.push("DUP(shift)");
    rows.push([roomCode(r),f1,f2,note.join(" ")]);
  }
  return rows;
}
function renderRoomwise(date,shift){
  const rows=buildRoomwise(date,shift);
  rwBody.innerHTML="";
  for(let i=1;i<rows.length;i++){
    const [room,f1,f2,n]=rows[i];
    const tr=document.createElement("tr");
    tr.innerHTML=`<td class="mono">${esc(room)}</td><td>${esc(f1)}</td><td>${esc(f2)}</td><td>${esc(n)}</td>`;
    rwBody.appendChild(tr);
  }
}
function buildTotals(){
  const counts=new Map();
  for(const a of state.allocations) counts.set(a.facultyId,(counts.get(a.facultyId)||0)+1);
  const rows=[["Faculty","TotalDuties"]];
  for(const f of activeFaculty().sort((a,b)=>a.name.localeCompare(b.name))) rows.push([f.name,counts.get(f.id)||0]);
  return rows;
}
function renderTotals(){
  const rows=buildTotals();
  tBody.innerHTML="";
  for(let i=1;i<rows.length;i++){
    const [n,t]=rows[i];
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${esc(n)}</td><td class="right">${t}</td>`;
    tBody.appendChild(tr);
  }
}
function buildDuty01(){
  const cols=sortedSchedule();
  const header=["Faculty"].concat(cols.map(c=>`${c.date} ${c.shift}`)).concat(["Total"]);
  const allocSet=new Set(state.allocations.map(a=>`${a.facultyId}__${a.date}__${a.shift}`));
  const rows=[header];
  for(const f of activeFaculty().sort((a,b)=>a.name.localeCompare(b.name))){
    let total=0; const row=[f.name];
    for(const c of cols){
      const v=allocSet.has(`${f.id}__${c.date}__${c.shift}`)?1:"";
      if(v===1) total++;
      row.push(v);
    }
    row.push(total);
    rows.push(row);
  }
  return rows;
}
function renderDuty01Preview(){
  const rows=buildDuty01();
  dHead.innerHTML=""; dBody.innerHTML="";
  const trh=document.createElement("tr");
  for(const h of rows[0]){const th=document.createElement("th");th.textContent=h;trh.appendChild(th);}
  dHead.appendChild(trh);
  const max=25;
  for(let i=1;i<Math.min(rows.length,max+1);i++){
    const tr=document.createElement("tr");
    rows[i].forEach((v,j)=>{const td=document.createElement("td");td.textContent=v;if(j===rows[i].length-1)td.className="right";tr.appendChild(td);});
    dBody.appendChild(tr);
  }
  if(rows.length-1>max){
    const tr=document.createElement("tr"); const td=document.createElement("td"); td.colSpan=rows[0].length; td.className="muted small";
    td.textContent=`Preview limited to ${max} rows (export CSV for full matrix).`; tr.appendChild(td); dBody.appendChild(tr);
  }
}
document.querySelector("#btnLoadReport").addEventListener("click",loadReport);
function loadReport(){
  const d=document.querySelector("#repDate").value;
  const sh=normShift(document.querySelector("#repShift").value);
  if(!d) return alert("Select report date.");
  renderRoomwise(d,sh); renderTotals(); renderDuty01Preview();
}
document.querySelector("#btnExportRoomwiseCsv").addEventListener("click",()=>{
  const d=document.querySelector("#repDate").value; const sh=normShift(document.querySelector("#repShift").value);
  if(!d) return alert("Select report date.");
  dl(`roomwise_${d}_${sh}.csv`,toCSV(buildRoomwise(d,sh)),"text/csv;charset=utf-8");
});
document.querySelector("#btnExportDuty01Csv").addEventListener("click",()=>dl("duty01.csv",toCSV(buildDuty01()),"text/csv;charset=utf-8"));
document.querySelector("#btnExportTotalsCsv").addEventListener("click",()=>dl("totals.csv",toCSV(buildTotals()),"text/csv;charset=utf-8"));
document.querySelector("#btnExportAllCsv").addEventListener("click",()=>{
  const d=document.querySelector("#repDate").value; const sh=normShift(document.querySelector("#repShift").value);
  if(d) dl(`roomwise_${d}_${sh}.csv`,toCSV(buildRoomwise(d,sh)),"text/csv;charset=utf-8");
  dl("duty01.csv",toCSV(buildDuty01()),"text/csv;charset=utf-8");
  dl("totals.csv",toCSV(buildTotals()),"text/csv;charset=utf-8");
  alert("Downloaded CSV files. If blocked, allow multiple downloads for this site.");
});

// Backup/Restore/Reset
document.querySelector("#btnBackupJson").addEventListener("click",()=>dl(`backup_exam_duty_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2),"application/json;charset=utf-8"));
document.querySelector("#fileRestoreJson").addEventListener("change",async ev=>{
  const file=ev.target.files?.[0]; if(!file) return;
  try{const text=await file.text(); const obj=JSON.parse(text);
    if(!obj || typeof obj!=="object" || !("faculty" in obj) || !("schedule" in obj) || !("allocations" in obj)) throw new Error("Not a valid backup.");
    state=obj; saveState(); alert("Restore complete.");
    renderFaculty(); renderSchedule(); renderRestrictList(); renderTotals(); renderDuty01Preview();
  }catch(e){console.error(e); alert("Restore failed: "+e.message);} finally{ev.target.value="";}
});
document.querySelector("#btnResetAll").addEventListener("click",()=>{ if(!confirm("Reset ALL data?")) return; localStorage.removeItem(STORAGE_KEY); state=loadState(); renderFaculty(); renderSchedule(); renderRestrictList(); renderTotals(); renderDuty01Preview(); });

// Initial render
renderFaculty(); renderSchedule(); renderRestrictList(); renderTotals(); renderDuty01Preview();
document.querySelector("#assignDate").value=new Date().toISOString().slice(0,10);
document.querySelector("#repDate").value=new Date().toISOString().slice(0,10);
