
const $ = (s) => document.querySelector(s);
const money = n => "RM" + Number(n).toLocaleString("ms-MY", {maximumFractionDigits:0});

const yearEl=$("#year"); if(yearEl) yearEl.textContent = new Date().getFullYear();

const pax = $("#pax"), date = $("#visitDate"), session = $("#session");
const packageSelect = $("#packageSelect");
const total = $("#totalDisplay"), deposit = $("#depositDisplay"), balance = $("#balanceDisplay");
const msg = $("#formMessage"), availability = $("#availabilityBox");

let demoBookings = JSON.parse(localStorage.getItem("kaprima_demo_bookings") || "[]");
const blockedDatesKey = "kaprima_demo_blocked_dates";
let blockedDates = JSON.parse(localStorage.getItem(blockedDatesKey) || "[]");

function money(n){ return "RM" + Number(n||0).toLocaleString("ms-MY", {maximumFractionDigits:0}); }
function activePackages(){ return cmsPackages.filter(x=>x.active); }
function selectedPackage(){ return cmsPackages.find(x=>x.id===packageSelect?.value) || activePackages()[0] || null; }
function calcForPackage(paxCount, pkg){
  if(!pkg || paxCount < Number(pkg.basePax)) return 0;
  return Number(pkg.price) + Math.max(0,paxCount-Number(pkg.basePax))*Number(pkg.extra);
}
function calc(p){ return calcForPackage(p, selectedPackage()) || 0; }
function isFriday(dateString){ return new Date(dateString+"T00:00:00").getDay()===5; }
function getBlockedDate(dateString){ return blockedDates.find(x=>x.date===dateString); }
function dateClosedReason(dateString){
  if(!dateString) return "";
  if(isFriday(dateString)) return "Jumaat — KAPRIMA tidak menerima lawatan.";
  const b=getBlockedDate(dateString); return b ? (b.reason || "Tarikh ini telah ditutup oleh admin KAPRIMA.") : "";
}
function validateVisitDate(){
  if(!date.value) return true;
  const reason=dateClosedReason(date.value);
  if(reason){ show("Tarikh ini tidak tersedia: "+reason,true); date.value=""; refreshAvailability(); return false; }
  return true;
}
function quote(){
  const p=Number(pax.value||0), pkg=selectedPackage();
  const t=calcForPackage(p,pkg), d=t*.3;
  total.textContent=money(t); deposit.textContent=money(d); balance.textContent=money(t-d);
}
function reserved(d,s){
  return demoBookings.filter(x=>x.date===d && x.session===s).reduce((sum,x)=>sum+Number(x.pax),0);
}
function refreshAvailability(){
  if(!date.value || !session.value){ if(availability) availability.textContent="Pilih tarikh & sesi untuk simulasi kapasiti."; return; }
  const reason=dateClosedReason(date.value);
  if(reason){ if(availability) availability.textContent="Tarikh tidak tersedia — "+reason; return; }
  const used=reserved(date.value,session.value), left=Math.max(0,120-used);
  if(availability){ availability.textContent=`Demo: ${left} / 120 pax masih tersedia`; availability.style.color=left<30?"#9b2525":"#236c50"; }
}
function show(text,error=false){ msg.textContent=text; msg.className="form-message show "+(error?"error":"success"); }
function populatePackageSelect(){
  if(!packageSelect) return;
  const current=packageSelect.value;
  packageSelect.innerHTML='<option value="">Pilih pakej</option>'+activePackages().map(x=>`<option value="${escapeAttr(x.id)}">${escapeHtml(x.name)} — ${money(x.price)} / ${x.basePax} pax</option>`).join("");
  if(activePackages().some(x=>x.id===current)) packageSelect.value=current;
  else if(activePackages()[0]) packageSelect.value=activePackages()[0].id;
  quote();
}

if(date){ date.min=new Date().toISOString().split("T")[0]; date.addEventListener("change",()=>{ if(validateVisitDate()) refreshAvailability(); }); }
if(pax) pax.addEventListener("input",quote);
if(session) session.addEventListener("change",refreshAvailability);
if(packageSelect) packageSelect.addEventListener("change",quote);
/* quote deferred until CMS data is initialized */

const menuBtn=$("#menuBtn"), nav=$("#navLinks");
if(menuBtn) menuBtn.onclick=()=>nav.classList.toggle("open");
document.querySelectorAll("#navLinks a").forEach(a=>a.onclick=()=>nav.classList.remove("open"));

const bookingForm=$("#bookingForm"); if(bookingForm) bookingForm.addEventListener("submit", e => {
  e.preventDefault();
  const p=Number(pax.value||0), pkg=selectedPackage();
  if(!pkg) return show("Sila pilih pakej lawatan.",true);
  if(p<Number(pkg.basePax)||p>Number(pkg.maxPax)) return show(`Jumlah peserta untuk pakej ini mesti antara ${pkg.basePax} hingga ${pkg.maxPax} pax.`,true);
  if(!date.value||!session.value) return show("Sila pilih tarikh dan sesi.",true);
  const reason=dateClosedReason(date.value); if(reason) return show("Tarikh ini tidak tersedia: "+reason,true);
  const left=120-reserved(date.value,session.value); if(p>left) return show(`Slot demo tidak mencukupi. Tinggal ${left} pax untuk sesi ini.`,true);
  const t=calcForPackage(p,pkg);
  const booking={id:"DEMO-"+Date.now().toString().slice(-6),name:$("#name").value,phone:$("#phone").value,email:$("#email").value,group:$("#groupType").value,packageId:pkg.id,packageName:pkg.name,date:date.value,session:session.value,pax:p,total:t,deposit:t*.3};
  demoBookings.push(booking); localStorage.setItem("kaprima_demo_bookings",JSON.stringify(demoBookings));
  show(`Demo booking berjaya! ${pkg.name} • Booking ID: ${booking.id}. Deposit simulasi: ${money(booking.deposit)}. Tiada bayaran sebenar dibuat.`); refreshAvailability();
});

const chatToggle=$("#chatToggle"), chatPanel=$("#chatPanel"), chatClose=$("#chatClose");
if(chatToggle) chatToggle.onclick=()=>chatPanel.classList.toggle("open");
if(chatClose) chatClose.onclick=()=>chatPanel.classList.remove("open");

const chatMessages=$("#chatMessages"), chatForm=$("#chatForm"), chatInput=$("#chatInput");
function bot(text){
  const d=document.createElement("div"); d.className="chat-msg bot"; d.textContent=text;
  chatMessages.appendChild(d); chatMessages.scrollTop=chatMessages.scrollHeight;
}
function user(text){
  const d=document.createElement("div"); d.className="chat-msg user"; d.textContent=text;
  chatMessages.appendChild(d); chatMessages.scrollTop=chatMessages.scrollHeight;
}
function answer(q){
  const x=q.toLowerCase();
  if(x.includes("harga")||x.includes("berapa")||x.includes("rm")){
    const m=x.match(/(\d{2,3})/); const p=m?Number(m[1]):30;
    if(p>=30&&p<=120) return `Untuk ${p} pax, anggaran pakej ialah ${money(calc(p))} 😊 Harga bermula RM600 untuk 30 pax dan tambahan RM20 bagi setiap pax selepas 30. Kalau sudah tahu tarikh, boleh terus isi borang booking.`;
    return "Harga bermula RM600 untuk 30 pax. Setiap pax tambahan ialah RM20 dan maksimum 120 pax setiap sesi 😊";
  }
  if(x.includes("masa")||x.includes("sesi")||x.includes("waktu")) return "KAPRIMA mempunyai 2 sesi: 9:00 pagi–11:30 pagi dan 2:30 petang–5:00 petang, Sabtu hingga Khamis.";
  if(x.includes("deposit")||x.includes("bayar")) return "Booking memerlukan deposit 30%. Baki 70% perlu dibayar penuh sehari sebelum tarikh lawatan.";
  if(x.includes("pax")||x.includes("orang")||x.includes("peserta")) return "Minimum 30 pax dan maksimum 120 pax untuk setiap sesi. Selepas 30 pax, caj tambahan ialah RM20 seorang.";
  if(x.includes("sekolah")||x.includes("tadika")||x.includes("universiti")||x.includes("keluarga")) return "KAPRIMA sesuai untuk tadika, sekolah rendah, sekolah menengah, universiti, keluarga dan kumpulan. Antara pengalaman utama ialah melihat haiwan dengan lebih dekat dan melihat proses penghasilan susu UHT.";
  return "Boleh 😊 KAPRIMA boleh bantu tentang harga, jumlah pax, waktu lawatan, deposit atau booking. Cuba tanya contohnya: “Berapa harga untuk 50 pax?”";
}
if(chatForm) chatForm.addEventListener("submit",e=>{
  e.preventDefault(); const q=chatInput.value.trim(); if(!q)return;
  user(q); chatInput.value="";
  setTimeout(()=>bot(answer(q)),250);
});

// DEMO CMS simulation: package/gallery data are stored in localStorage.
// The real production admin uses MySQL and admin/packages.php + admin/gallery.php.


/* =========================
   KAPRIMA GITHUB DEMO CMS
   ========================= */
const defaultPackages = [
  {id:"p1",name:"Pakej Lawatan",short:"Lawatan KAPRIMA untuk kumpulan",price:600,basePax:30,extra:20,maxPax:120,desc:"Pakej lawatan asas KAPRIMA.",active:true},
  {id:"p2",name:"Pakej Lawatan + Susu",short:"Lawatan bersama pilihan produk susu",price:600,basePax:30,extra:20,maxPax:120,desc:"Harga contoh demo sahaja. Admin boleh ubah apabila harga sebenar ditetapkan.",active:true}
];
const demoPackagesKey="kaprima_demo_packages";
const demoGalleryKey="kaprima_demo_gallery";
let cmsPackages=JSON.parse(localStorage.getItem(demoPackagesKey)||"null")||defaultPackages;
let cmsGallery=JSON.parse(localStorage.getItem(demoGalleryKey)||"[]");

function saveCms(){
  localStorage.setItem(demoPackagesKey,JSON.stringify(cmsPackages));
  localStorage.setItem(demoGalleryKey,JSON.stringify(cmsGallery));
  renderCms();
  renderPublicCms();
  populatePackageSelect();
  renderBlockedDates();
}
function renderPublicCms(){
  const grid=document.getElementById("packagesGrid");
  if(grid){
    const active=cmsPackages.filter(x=>x.active);
    grid.innerHTML=active.map(x=>`<article class="package-card"><h3>${escapeHtml(x.name)}</h3><p>${escapeHtml(x.short)}</p><div class="package-price">RM${Number(x.price).toLocaleString("ms-MY")} / ${x.basePax} pax</div><p>${escapeHtml(x.desc)}</p><small>Tambahan: RM${Number(x.extra).toLocaleString("ms-MY")} / pax • Maksimum ${x.maxPax} pax/sesi</small></article>`).join("") || "<p>Tiada pakej dipaparkan.</p>";
  }
  const gg=document.getElementById("galleryGrid");
  if(gg){
    const active=cmsGallery.filter(x=>x.active);
    gg.innerHTML=active.map(x=>`<article class="gallery-card"><img loading="lazy" src="${escapeAttr(x.url)}" alt="${escapeAttr(x.title)}"><div class="caption"><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.caption||"")}</p></div></article>`).join("") || "<p>Galeri akan dikemaskini oleh admin KAPRIMA.</p>";
  }
}
function renderCms(){
  const list=document.getElementById("packageAdminList");
  if(list) list.innerHTML=cmsPackages.map(x=>`<div class="admin-item"><div><strong>${escapeHtml(x.name)}</strong><br><small>${escapeHtml(x.short)} • RM${Number(x.price).toLocaleString("ms-MY")} / ${x.basePax} pax • ${x.active?"Aktif":"Disorok"}</small></div><div class="admin-item-actions"><button class="edit-btn" onclick="editPackage('${x.id}')">Edit</button><button class="delete-btn" onclick="deletePackage('${x.id}')">Padam</button></div></div>`).join("")||"<p>Belum ada pakej.</p>";
  renderBlockedDates();
  const gl=document.getElementById("galleryAdminList");
  if(gl) gl.innerHTML=cmsGallery.map(x=>`<div class="admin-gallery-item"><img src="${escapeAttr(x.url)}" alt="${escapeAttr(x.title)}"><div class="p"><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.caption||"")}</p><small>${x.active?"Dipaparkan":"Disorok"}</small><br><br><button class="edit-btn" onclick="editGallery('${x.id}')">Edit</button><button class="delete-btn" onclick="deleteGallery('${x.id}')">Padam</button></div></div>`).join("")||"<p>Belum ada gambar.</p>";
}
function resetPackageForm(){
  document.getElementById("pkgId").value="";
  document.getElementById("pkgName").value="";
  document.getElementById("pkgShort").value="";
  document.getElementById("pkgPrice").value="600";
  document.getElementById("pkgBasePax").value="30";
  document.getElementById("pkgExtra").value="20";
  document.getElementById("pkgMax").value="120";
  document.getElementById("pkgDesc").value="";
  document.getElementById("pkgActive").checked=true;
}
function editPackage(id){
  const x=cmsPackages.find(a=>a.id===id); if(!x)return;
  document.getElementById("pkgId").value=x.id;
  document.getElementById("pkgName").value=x.name;
  document.getElementById("pkgShort").value=x.short;
  document.getElementById("pkgPrice").value=x.price;
  document.getElementById("pkgBasePax").value=x.basePax;
  document.getElementById("pkgExtra").value=x.extra;
  document.getElementById("pkgMax").value=x.maxPax;
  document.getElementById("pkgDesc").value=x.desc||"";
  document.getElementById("pkgActive").checked=!!x.active;
  document.getElementById("adminDemo")?.scrollIntoView({behavior:"smooth"});
}
function deletePackage(id){
  if(!confirm("Padam pakej ini?"))return;
  cmsPackages=cmsPackages.filter(x=>x.id!==id);saveCms();
}

function renderBlockedDates(){
  const list=document.getElementById("blockedDateList"); if(!list)return;
  const rows=[...blockedDates].sort((a,b)=>a.date.localeCompare(b.date));
  list.innerHTML=rows.map(x=>`<div class="admin-item"><div><strong>${escapeHtml(x.date)}</strong><br><small>${escapeHtml(x.reason||"Tarikh ditutup")}</small></div><div class="admin-item-actions"><button class="delete-btn" onclick="unblockDate('${escapeAttr(x.date)}')">Buka Semula</button></div></div>`).join("")||"<p>Belum ada tarikh tambahan yang diblock.</p>";
}
function unblockDate(d){ if(!confirm("Buka semula tarikh ini?"))return; blockedDates=blockedDates.filter(x=>x.date!==d); localStorage.setItem(blockedDatesKey,JSON.stringify(blockedDates)); renderBlockedDates(); }
document.getElementById("blockedDateForm")?.addEventListener("submit",e=>{
  e.preventDefault(); const d=document.getElementById("blockedDate").value, reason=document.getElementById("blockedReason").value.trim();
  if(!d)return; if(isFriday(d)){alert("Jumaat memang sudah ditutup secara automatik. Tidak perlu block lagi.");return;}
  const i=blockedDates.findIndex(x=>x.date===d); const item={date:d,reason:reason||"Tarikh ditutup oleh admin KAPRIMA"}; if(i>=0)blockedDates[i]=item; else blockedDates.push(item);
  localStorage.setItem(blockedDatesKey,JSON.stringify(blockedDates)); document.getElementById("blockedDateForm").reset(); renderBlockedDates(); alert("Tarikh berjaya diblock.");
});
document.getElementById("packageForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const id=document.getElementById("pkgId").value||("p"+Date.now());
  const item={id,name:document.getElementById("pkgName").value.trim(),short:document.getElementById("pkgShort").value.trim(),price:Number(document.getElementById("pkgPrice").value),basePax:Number(document.getElementById("pkgBasePax").value),extra:Number(document.getElementById("pkgExtra").value),maxPax:Number(document.getElementById("pkgMax").value),desc:document.getElementById("pkgDesc").value.trim(),active:document.getElementById("pkgActive").checked};
  const i=cmsPackages.findIndex(x=>x.id===id);
  if(i>=0)cmsPackages[i]=item; else cmsPackages.push(item);
  saveCms();resetPackageForm();alert("Pakej disimpan dalam DEMO.");
});
document.getElementById("pkgCancel")?.addEventListener("click",resetPackageForm);

function resetGalleryForm(){
  document.getElementById("galId").value="";
  document.getElementById("galTitle").value="";
  document.getElementById("galCaption").value="";
  document.getElementById("galFile").value="";
  document.getElementById("galUrl").value="";
  document.getElementById("galActive").checked=true;
}
function editGallery(id){
  const x=cmsGallery.find(a=>a.id===id);if(!x)return;
  document.getElementById("galId").value=x.id;
  document.getElementById("galTitle").value=x.title;
  document.getElementById("galCaption").value=x.caption||"";
  document.getElementById("galUrl").value=x.url||"";
  document.getElementById("galActive").checked=!!x.active;
  document.getElementById("adminDemo")?.scrollIntoView({behavior:"smooth"});
}
function deleteGallery(id){
  if(!confirm("Padam gambar ini?"))return;
  cmsGallery=cmsGallery.filter(x=>x.id!==id);saveCms();
}
document.getElementById("galleryForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const file=document.getElementById("galFile").files[0];
  const id=document.getElementById("galId").value||("g"+Date.now());
  const old=cmsGallery.find(x=>x.id===id);
  const finish=(url)=>{
    const item={id,title:document.getElementById("galTitle").value.trim(),caption:document.getElementById("galCaption").value.trim(),url:url||(old?.url||""),active:document.getElementById("galActive").checked};
    if(!item.url){alert("Sila pilih gambar atau masukkan URL gambar.");return;}
    const i=cmsGallery.findIndex(x=>x.id===id); if(i>=0)cmsGallery[i]=item; else cmsGallery.push(item);
    saveCms();resetGalleryForm();alert("Gambar disimpan dalam DEMO.");
  };
  if(file){
    const reader=new FileReader(); reader.onload=()=>finish(reader.result); reader.readAsDataURL(file);
  }else finish(document.getElementById("galUrl").value.trim());
});
document.getElementById("galCancel")?.addEventListener("click",resetGalleryForm);

document.querySelectorAll(".admin-tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".admin-tab").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".admin-pane").forEach(p=>p.classList.remove("active"));
  btn.classList.add("active"); document.getElementById(btn.dataset.tab).classList.add("active");
}));
renderCms();renderPublicCms();populatePackageSelect();renderBlockedDates();
