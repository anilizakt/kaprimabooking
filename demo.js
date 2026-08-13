
const $ = (s) => document.querySelector(s);
const money = n => "RM" + Number(n).toLocaleString("ms-MY", {maximumFractionDigits:0});

$("#year").textContent = new Date().getFullYear();

const pax = $("#pax"), date = $("#visitDate"), session = $("#session");
const total = $("#totalDisplay"), deposit = $("#depositDisplay"), balance = $("#balanceDisplay");
const msg = $("#formMessage"), availability = $("#availabilityBox");

let demoBookings = JSON.parse(localStorage.getItem("kaprima_demo_bookings") || "[]");

function calc(p) {
  return p >= 30 ? 600 + ((p - 30) * 20) : 0;
}
function quote() {
  const p = Number(pax.value || 0);
  const t = calc(p);
  const d = t * .3;
  total.textContent = money(t);
  deposit.textContent = money(d);
  balance.textContent = money(t-d);
}
function reserved(d,s) {
  return demoBookings
    .filter(x => x.date === d && x.session === s)
    .reduce((sum,x) => sum + Number(x.pax),0);
}
function refreshAvailability() {
  if (!date.value || !session.value) {
    if (availability) availability.textContent = "Pilih tarikh & sesi untuk simulasi kapasiti.";
    return;
  }
  const used = reserved(date.value,session.value);
  const left = Math.max(0,120-used);
  if (availability) {
    availability.textContent = `Demo: ${left} / 120 pax masih tersedia`;
    availability.style.color = left < 30 ? "#9b2525" : "#236c50";
  }
}
function show(text,error=false) {
  msg.textContent=text;
  msg.className="form-message show " + (error ? "error" : "success");
}

pax.addEventListener("input",quote);
date.addEventListener("change",refreshAvailability);
session.addEventListener("change",refreshAvailability);
quote();

const menuBtn=$("#menuBtn"), nav=$("#navLinks");
if(menuBtn) menuBtn.onclick=()=>nav.classList.toggle("open");
document.querySelectorAll("#navLinks a").forEach(a=>a.onclick=()=>nav.classList.remove("open"));

$("#bookingForm").addEventListener("submit", e => {
  e.preventDefault();
  const p=Number(pax.value||0);
  if(p<30||p>120) return show("Demo: jumlah peserta mesti antara 30 hingga 120 pax.",true);
  if(!date.value||!session.value) return show("Sila pilih tarikh dan sesi.",true);
  const day=new Date(date.value+"T00:00:00").getDay();
  if(day===5) return show("Lawatan KAPRIMA dibuka Sabtu hingga Khamis. Jumaat ditutup.",true);
  const left=120-reserved(date.value,session.value);
  if(p>left) return show(`Slot demo tidak mencukupi. Tinggal ${left} pax untuk sesi ini.`,true);

  const t=calc(p);
  const booking={
    id:"DEMO-"+Date.now().toString().slice(-6),
    name:$("#name").value,
    phone:$("#phone").value,
    email:$("#email").value,
    group:$("#groupType").value,
    date:date.value,
    session:session.value,
    pax:p,total:t,deposit:t*.3
  };
  demoBookings.push(booking);
  localStorage.setItem("kaprima_demo_bookings",JSON.stringify(demoBookings));
  show(`Demo booking berjaya! Booking ID: ${booking.id}. Deposit simulasi: ${money(booking.deposit)}. Tiada bayaran sebenar dibuat.`);
  refreshAvailability();
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
chatForm.addEventListener("submit",e=>{
  e.preventDefault(); const q=chatInput.value.trim(); if(!q)return;
  user(q); chatInput.value="";
  setTimeout(()=>bot(answer(q)),250);
});
