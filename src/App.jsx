import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { Home, List, BarChart2, Factory, Bell, Clock, CheckCircle, Folder, Search, MapPin, FileText, Package, Sun, Moon, X, Plus, Camera, Truck, BookOpen, Tag, Settings, Edit, DollarSign } from "lucide-react";

// ── Logo CommaPro (monogramme CP) ────────────────────────────────────────────

function CPLogo({ size = 36, light = false }) {
  const gid = "cpgrad";
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display:"block" }}>
      <rect width="512" height="512" rx="120" fill={light ? "rgba(255,255,255,0.12)" : "#F8F8FF"}/>
      <path d="M215 170 C140 170 105 220 105 256 C105 292 140 342 215 342 H255 V300 H215 C170 300 150 278 150 256 C150 234 170 212 215 212 H255 V170 H215Z" fill={`url(#${gid})`}/>
      <path d="M270 170 H340 C395 170 430 205 430 256 C430 307 395 342 340 342 H315 V300 H340 C370 300 385 282 385 256 C385 230 370 212 340 212 H315 V342 H270 V170Z" fill={`url(#${gid})`}/>
      <defs>
        <linearGradient id={gid} x1="100" y1="100" x2="420" y2="420" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA"/>
          <stop offset="0.5" stopColor="#8B5CF6"/>
          <stop offset="1" stopColor="#6366F1"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRM MODAL — boîte de confirmation stylée (remplace window.confirm)
// Usage : const [confirm, setConfirm] = useState(null);
//   setConfirm({ message, onYes })  →  <ConfirmModal data={confirm} onClose={()=>setConfirm(null)} />
// ═══════════════════════════════════════════════════════════════════════════════
function ConfirmModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"var(--t-card-bg)", backdropFilter:"blur(40px) saturate(180%)", WebkitBackdropFilter:"blur(40px) saturate(180%)", border:"1px solid var(--t-card-border)", borderRadius:24, padding:24, maxWidth:380, width:"100%", boxShadow:"0 30px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize:16, fontWeight:700, color:"var(--t-text-90)", marginBottom:8 }}>{data.title || "Confirmer"}</div>
        <div style={{ fontSize:14, color:"var(--t-text-70)", lineHeight:1.5, marginBottom:22 }}>{data.message}</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ ...S.btnSecondary, flex:1, padding:"12px", fontSize:14 }}>Annuler</button>
          <button onClick={()=>{ data.onYes && data.onYes(); onClose(); }} style={{ flex:1, padding:"12px", fontSize:14, fontWeight:700, borderRadius:22, border:"none", cursor:"pointer", color:"white", background:"linear-gradient(135deg,#ef4444,#dc2626)" }}>
            {data.confirmLabel || "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION SUPABASE
// ═══════════════════════════════════════════════════════════════════════════════
const SUPABASE_URL = "https://gwzjfdxndxkewpvpkeoc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3empmZHhuZHhrZXdwdnBrZW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTQ2MTksImV4cCI6MjA5NjkzMDYxOX0.O_UL6gDAOVuHWhXhDjbRz5L_vGX22_GpqIjtN5KCmy4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// La table "app_data" contient une seule ligne (id=1) avec une colonne JSON "data".
// On lit/écrit tout l'état de l'app dedans. Simple et suffisant pour ce besoin.
const DATA_ROW_ID = 1;

async function loadCloud() {
  const { data, error } = await supabase.from("app_data").select("data").eq("id", DATA_ROW_ID).single();
  if (error) { console.error("Supabase load error:", error); return null; }
  return data?.data || null;
}

async function saveCloud(state) {
  const { error } = await supabase.from("app_data").upsert({ id: DATA_ROW_ID, data: state });
  if (error) console.error("Supabase save error:", error);
}

// ── Historique des versions : stocké dans une 2e ligne (id=2) de la même table ──
// data = { snapshots: [ { at: ISOdate, state: {...} }, ... ] }  (max 10, plus récent en tête)
const HISTORY_ROW_ID = 2;
const MAX_SNAPSHOTS = 10;

async function loadHistory() {
  const { data, error } = await supabase.from("app_data").select("data").eq("id", HISTORY_ROW_ID).single();
  if (error) return [];
  return (data?.data?.snapshots) || [];
}

async function pushSnapshot(state) {
  try {
    const snaps = await loadHistory();
    // Évite les doublons trop rapprochés : 1 snapshot max / 10 min
    const now = Date.now();
    if (snaps[0] && (now - new Date(snaps[0].at).getTime()) < 10*60*1000) return;
    const next = [{ at: new Date().toISOString(), state }, ...snaps].slice(0, MAX_SNAPSHOTS);
    await supabase.from("app_data").upsert({ id: HISTORY_ROW_ID, data: { snapshots: next } });
  } catch (e) { console.error("snapshot error", e); }
}

// ─── INITIAL DATA ──────────────────────────────────────────────────────────────
// Pages configurables (admins ont toujours tout)
const ALL_PAGES = [
  { key: "dashboard",   label: "Accueil",        icon: Home },
  { key: "orders",      label: "Commandes",      icon: List },
  { key: "catalogue",   label: "Référencement",  icon: BookOpen },
  { key: "catalogues",  label: "Catalogues",     icon: Folder },
  { key: "tasks",       label: "Tâches",         icon: CheckCircle },
  { key: "etiquettes",  label: "Étiquettes",     icon: FileText },
  { key: "proposals",   label: "Propositions",   icon: Tag },
  { key: "remplissage", label: "Remplissage",    icon: Package },
  { key: "suppliers",   label: "Fournisseurs",   icon: Factory },
  { key: "stats",       label: "Statistiques",   icon: BarChart2 },
  { key: "apparence",   label: "Apparence",      icon: Settings },
];

const INIT_USERS = [
  { id: "u1", email: "admin@demo.com", password: "admin123", name: "Admin", role: "admin", canSeePrices: true, canUseAI: true, active: true, pages: ALL_PAGES.map(p => p.key) },
  { id: "u2", email: "marie@demo.com", password: "marie123", name: "Marie Dupont", role: "user", canSeePrices: false, active: true, pages: ["dashboard","orders","new"] },
  { id: "u3", email: "paul@demo.com",  password: "paul123",  name: "Paul Martin",  role: "user", canSeePrices: true,  active: true, pages: ["dashboard","orders","new","stats"] },
];

const INIT_SUPPLIERS = [
  {
    id: "s1", name: "Textile Pro", commercial: "Jean Bernard", email: "jean@textilepro.fr",
    products: [
      { ref: "TP-001", label: "T-shirt coton bio 180g", price: 8.50, family: "Vêtements", subFamily: "E12VH", weeklyVolume: 15, stockMin: 45 },
      { ref: "TP-002", label: "Jean slim stretch", price: 22.00, family: "Vêtements", subFamily: "E12PA", weeklyVolume: 8, stockMin: 24 },
      { ref: "TP-003", label: "Polo piqué manches courtes", price: 12.00, family: "Vêtements", subFamily: "E12VH", weeklyVolume: 10, stockMin: 30 },
    ]
  },
  {
    id: "s2", name: "FashionBase", commercial: "Sophie Laurent", email: "sophie@fashionbase.fr",
    products: [
      { ref: "FB-001", label: "Ceinture cuir vachette", price: 14.00, family: "Accessoires", subFamily: "E31AC", weeklyVolume: 6, stockMin: 18 },
      { ref: "FB-002", label: "Sac bandoulière simili", price: 45.00, family: "Maroquinerie", subFamily: "E33MA", weeklyVolume: 4, stockMin: 12 },
      { ref: "FB-003", label: "Foulard soie imprimé", price: 18.50, family: "Accessoires", subFamily: "E31AC", weeklyVolume: 5, stockMin: 15 },
    ]
  },
  {
    id: "s3", name: "EuroTex", commercial: "Marc Petit", email: "marc@eurotex.fr",
    products: [
      { ref: "ET-001", label: "Sneakers canvas unisexe", price: 35.00, family: "Chaussures", subFamily: "E41AS", weeklyVolume: 7, stockMin: 21 },
      { ref: "ET-002", label: "Chaussette coton lot/3", price: 5.90, family: "Chaussures", subFamily: "E41CH", weeklyVolume: 20, stockMin: 60 },
    ]
  },
];

const INIT_ORDERS = [
  {
    id: "BC-2026-001", userId: "u2", supplierName: "Textile Pro", commercial: "Jean Bernard",
    email: "jean@textilepro.fr", date: "2026-05-10", deliveryDate: "2026-05-25",
    deliveryPlace: "Entrepôt principal", notes: "Livraison matin",
    lines: [
      { ref: "TP-001", label: "T-shirt coton bio 180g", qty: 50, price: 8.50, family: "Vêtements", subFamily: "E12VH" },
      { ref: "TP-002", label: "Jean slim stretch", qty: 20, price: 22.00, family: "Vêtements", subFamily: "E12PA" },
    ],
    status: "reception_validee", createdBy: "Marie Dupont",
  },
  {
    id: "BC-2026-002", userId: "u3", supplierName: "FashionBase", commercial: "Sophie Laurent",
    email: "sophie@fashionbase.fr", date: "2026-06-01", deliveryDate: "2026-06-15",
    deliveryPlace: "Magasin centre-ville", notes: "",
    lines: [
      { ref: "FB-001", label: "Ceinture cuir vachette", qty: 30, price: 14.00, family: "Accessoires", subFamily: "E31AC" },
      { ref: "FB-002", label: "Sac bandoulière simili", qty: 10, price: 45.00, family: "Maroquinerie", subFamily: "E33MA" },
    ],
    status: "en_attente", createdBy: "Paul Martin",
  },
  {
    id: "BC-2026-003", userId: "u3", supplierName: "EuroTex", commercial: "Marc Petit",
    email: "marc@eurotex.fr", date: "2026-06-05", deliveryDate: "2026-06-20",
    deliveryPlace: "Entrepôt principal", notes: "",
    lines: [
      { ref: "ET-001", label: "Sneakers canvas unisexe", qty: 25, price: 35.00, family: "Chaussures", subFamily: "E41AS" },
      { ref: "ET-002", label: "Chaussette coton lot/3", qty: 60, price: 5.90, family: "Chaussures", subFamily: "E41CH" },
    ],
    status: "livree", createdBy: "Paul Martin",
  },
];

const INIT_LOCATIONS = [
  { id: "l1", label: "Entrepôt principal" },
  { id: "l2", label: "Magasin centre-ville" },
  { id: "l3", label: "Réserve annexe" },
];


// ─── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const genOrderId = (orders) => {
  const year = new Date().getFullYear();
  const nums = orders.filter(o => o.id.startsWith(`BC-${year}`)).map(o => parseInt(o.id.split("-")[2]) || 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
    const ts = Date.now().toString(36).slice(-3).toUpperCase();
  return `BC-${year}-${String(next).padStart(3, "0")}-${ts}`;
};
const lineTotal = (l) => (l.qty || 0) * (l.price || 0);
const orderTotal = (o) => (o.lines||[]).reduce((s, l) => s + lineTotal(l), 0);
const calcStockMin = (weeklyVolume, weeks = 3) => Math.ceil((weeklyVolume || 0) * weeks);

const COLORS = ["#1D4ED8","#059669","#D97706","#7C3AED","#DC2626","#0891B2","#65A30D","#DB2777"];

const STATUS = {
  brouillon:         { label: "Brouillon",          color: "#6B7280", bg: "#F3F4F6" },
  en_attente:        { label: "En attente",        color: "#D97706", bg: "#FFFBEB" },
  confirmee:         { label: "Confirmée",          color: "#2563EB", bg: "#EFF6FF" },
  en_preparation:    { label: "En préparation",     color: "#7C3AED", bg: "#F5F3FF" },
  en_livraison:      { label: "En livraison",       color: "#0891B2", bg: "#ECFEFF" },
  livree:            { label: "Livrée",             color: "#059669", bg: "#ECFDF5" },
  reception_validee: { label: "Réception validée",  color: "#16A34A", bg: "#F0FDF4" },
};
// Ordre du cycle de vie d'une commande (pour le suivi façon Colissimo + dates réelles)
const STATUS_ORDER = ["en_attente","confirmee","en_preparation","en_livraison","livree","reception_validee"];

// ─── PDF ───────────────────────────────────────────────────────────────────────
// Charge jsPDF + html2canvas à la demande (CDN), comme le scanner
function loadPdfLibs() {
  return new Promise((resolve, reject) => {
    function loadOne(src, check) {
      return new Promise((res, rej) => {
        if (check()) return res();
        const s = document.createElement("script");
        s.src = src; s.onload = res; s.onerror = () => rej(new Error("Échec chargement " + src));
        document.head.appendChild(s);
      });
    }
    loadOne("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", () => window.html2canvas)
      .then(() => loadOne("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => window.jspdf && window.jspdf.jsPDF))
      .then(resolve).catch(reject);
  });
}

// Construit le PDF (Blob) à partir d'un HTML complet, format A4 portrait
async function htmlToPdfBlob(html) {
  await loadPdfLibs();
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-10000px";
  holder.style.top = "0";
  holder.style.width = "794px"; // ~A4 @96dpi
  holder.style.background = "#ffffff";
  holder.innerHTML = html;
  document.body.appendChild(holder);
  try {
    const canvas = await window.html2canvas(holder, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const jsPDF = window.jspdf.jsPDF;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const imgW = pw;
    const imgH = canvas.height * (pw / canvas.width);
    let pos = 0;
    const img = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(img, "JPEG", 0, pos, imgW, imgH);
    let remaining = imgH - ph;
    while (remaining > 0) {
      pos -= ph;
      pdf.addPage();
      pdf.addImage(img, "JPEG", 0, pos, imgW, imgH);
      remaining -= ph;
    }
    return pdf.output("blob");
  } finally {
    document.body.removeChild(holder);
  }
}

// ─── PDF ───────────────────────────────────────────────────────────────────────
// Construit le HTML complet du bon de commande (réutilisable : ouverture ET PDF joint)
function buildOrderHTML(order, showPrices) {
  const total = orderTotal(order);
  const tva = total * 0.085; // TVA 8.5% La Réunion
  const ttc = total + tva;
  const linesHTML = (order.lines||[]).map((l, i) => `
    <tr style="background:${i%2===0?'#ffffff':'#f9fafb'}">
      <td style="padding:10px 14px;font-size:12px;color:#374151;font-family:monospace">${l.ref}</td>
      <td style="padding:10px 14px;font-size:12px;color:#111827;font-weight:500">${l.label}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6b7280">${l.subFamily || "—"}</td>
      <td style="padding:10px 14px;font-size:12px;color:#111827;text-align:center;font-weight:600">${l.qty}</td>
      ${showPrices ? `
      <td style="padding:10px 14px;font-size:12px;color:#374151;text-align:right">${fmt(l.price)}</td>
      <td style="padding:10px 14px;font-size:12px;color:#111827;text-align:right;font-weight:700">${fmt(lineTotal(l))}</td>` : ""}
    </tr>`).join("");

  const statusLabels = { en_attente:"En attente", confirmee:"Confirmée", en_preparation:"En préparation", en_livraison:"En livraison", livree:"Livrée", reception_validee:"Réception validée" };
  const statusColors = { en_attente:"#d97706", confirmee:"#2563eb", en_preparation:"#7c3aed", en_livraison:"#0891b2", livree:"#059669", reception_validee:"#16a34a" };
  const statusCol = statusColors[order.status] || "#6b7280";
  const statusLbl = statusLabels[order.status] || order.status;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bon de commande ${order.id}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; background:#fff; color:#111827; font-size:13px; }
    .page { max-width:780px; margin:0 auto; padding:48px 48px 60px; }

    /* En-tête */
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; padding-bottom:28px; border-bottom:2px solid #111827; }
    .header-left .company { font-size:22px; font-weight:900; letter-spacing:-0.04em; color:#111827; }
    .header-left .tagline { font-size:10px; color:#9ca3af; margin-top:3px; letter-spacing:0.1em; text-transform:uppercase; }
    .header-right { text-align:right; }
    .bc-label { font-size:10px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
    .bc-num { font-size:24px; font-weight:800; color:#4f46e5; letter-spacing:-0.02em; }
    .bc-date { font-size:11px; color:#6b7280; margin-top:4px; }
    .status-badge { display:inline-block; margin-top:8px; padding:4px 12px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:${statusCol}; border:1.5px solid ${statusCol}; }

    /* Infos grid */
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:32px; }
    .info-block { background:#f9fafb; border-radius:10px; padding:16px 18px; border:1px solid #e5e7eb; }
    .info-block h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#9ca3af; margin-bottom:10px; }
    .info-block p { font-size:12px; color:#374151; line-height:1.7; }
    .info-block strong { color:#111827; font-weight:600; }

    /* Tableau */
    .table-wrap { margin-bottom:24px; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#111827; }
    th { padding:11px 14px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#ffffff; }
    th.right { text-align:right; }
    th.center { text-align:center; }
    tbody tr:last-child td { border-bottom:none; }
    td { border-bottom:1px solid #f3f4f6; }

    /* Totaux */
    .totals { display:flex; justify-content:flex-end; margin-bottom:40px; }
    .totals-box { width:260px; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; }
    .totals-row { display:flex; justify-content:space-between; padding:10px 16px; font-size:12px; border-bottom:1px solid #f3f4f6; }
    .totals-row:last-child { border-bottom:none; background:#111827; color:#fff; }
    .totals-row.total { font-weight:800; font-size:14px; }
    .totals-row span:last-child { font-weight:600; }
    .totals-row.total span:last-child { font-weight:900; }

    /* Signature */
    .sig-section { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:40px; }
    .sig-block { border:1px solid #e5e7eb; border-radius:10px; padding:16px 18px; }
    .sig-block h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#9ca3af; margin-bottom:12px; }
    .sig-line { border-bottom:1.5px solid #d1d5db; margin:32px 0 8px; }
    .sig-label { font-size:10px; color:#9ca3af; }

    /* Footer */
    .footer { padding-top:20px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; }
    .footer-left { font-size:10px; color:#9ca3af; line-height:1.8; }
    .footer-right { font-size:10px; color:#9ca3af; text-align:right; }
    .footer-id { font-size:11px; font-weight:700; color:#6b7280; }

    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .page { padding:30px; }
    }
    @page { margin: 0.5cm; size: auto; }
  </style>
</head>
<body>
  <div class="page">

    <!-- En-tête -->
    <div class="header">
      <div class="header-left">
        <div class="company">CommaPro</div>
        <div class="tagline">Bon de commande fournisseur</div>
      </div>
      <div class="header-right">
        <div class="bc-label">Numéro BC</div>
        <div class="bc-num">${order.id}</div>
        <div class="bc-date">Émis le ${fmtDate(order.date)} · Par ${order.createdBy || "—"}</div>
        <span class="status-badge">${statusLbl}</span>
      </div>
    </div>

    <!-- Infos fournisseur + livraison -->
    <div class="info-grid">
      <div class="info-block">
        <h3>Fournisseur</h3>
        <p><strong>${order.supplierName}</strong></p>
        ${order.commercial ? "<p>Commercial : <strong>" + order.commercial + "</strong></p>" : ""}
        ${order.email ? "<p>Email : " + order.email + "</p>" : ""}
      </div>
      <div class="info-block">
        <h3>Livraison</h3>
        <p>Date souhaitée : <strong>${fmtDate(order.deliveryDate) || "Non précisée"}</strong></p>
        <p>Lieu : <strong>${order.deliveryPlace || "Non précisé"}</strong></p>
        ${order.notes ? "<p style=\"margin-top:8px;font-style:italic;color:#6b7280\">" + order.notes + "</p>" : ""}
      </div>
    </div>

    <!-- Tableau produits -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Référence</th>
            <th>Désignation</th>
            <th>Sous-famille</th>
            <th class="center">Qté</th>
            ${showPrices ? "<th class=\"right\">P.U. HT</th><th class=\"right\">Total HT</th>" : ""}
          </tr>
        </thead>
        <tbody>${linesHTML}</tbody>
      </table>
    </div>

    <!-- Totaux -->
    ${showPrices ? `
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row total"><span>Total HT</span><span>${fmt(total)}</span></div>
      </div>
    </div>` : ""}

    <!-- Zone de signature -->
    <div class="sig-section">
      <div class="sig-block">
        <h3>Signature émetteur</h3>
        <div class="sig-line"></div>
        <div class="sig-label">${order.createdBy || "Émetteur"} · ${fmtDate(order.date)}</div>
      </div>
      <div class="sig-block">
        <h3>Signature réception</h3>
        <div class="sig-line"></div>
        <div class="sig-label">Date de réception : ________________</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        Document généré par CommaPro<br>
        Cockpit des achats fournisseurs
      </div>
      <div class="footer-right">
        <div class="footer-id">${order.id}</div>
        <div>${new Date().toLocaleDateString("fr-FR", {day:"2-digit",month:"long",year:"numeric"})}</div>
      </div>
    </div>

  </div>
</body>
</html>`;

    return html;
}

// Ouvre le HTML dans un nouvel onglet (comportement d'origine du bouton PDF)
function generatePDF(order, showPrices) {
  const html = buildOrderHTML(order, showPrices);
  const blob = new Blob([html], { type: "text/html" });
  // iOS Safari bloque window.open() depuis des handlers async
  // On utilise une ancre avec URL.createObjectURL pour forcer le téléchargement/prévisualisation
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
// ─── BOUTON SUPPRIMER AVEC DOUBLE CONFIRMATION VISUELLE ────────────────────────
function ConfirmDeleteButton({ onConfirm, label = "Supprimer", confirmLabel = "Confirmer ?", style, small }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000); // se désarme après 3s si pas confirmé
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (armed) { onConfirm(); setArmed(false); } else { setArmed(true); } }}
      style={{
        ...(small ? { padding:"6px 12px", fontSize:11 } : { padding:"8px 16px", fontSize:13 }),
        borderRadius:22, border:"1px solid", cursor:"pointer", fontWeight:600,
        transition:"all 0.18s",
        background: armed ? "#DC2626" : "rgba(239,68,68,0.12)",
        borderColor: armed ? "#DC2626" : "rgba(239,68,68,0.35)",
        color: armed ? "white" : "#f87171",
        boxShadow: armed ? "0 0 14px rgba(220,38,38,0.5)" : "none",
        ...style,
      }}
    >
      {armed ? `⚠ ${confirmLabel}` : label}
    </button>
  );
}

const S = {
  btnPrimary:   { padding:"9px 20px", borderRadius:22, border:"none", cursor:"pointer", background:"linear-gradient(135deg,rgba(124,58,237,0.92),rgba(139,92,246,0.9))", color:"white", fontWeight:600, fontSize:13, backdropFilter:"blur(8px)", boxShadow:"0 4px 20px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.2)", letterSpacing:"-0.01em", transition:"all 0.18s" },
  btnSecondary: { padding:"8px 16px", borderRadius:22, border:"1px solid rgba(255,255,255,0.14)", cursor:"pointer", background:"var(--t-border-subtle)", color:"var(--t-btn-sec-color)", fontWeight:500, fontSize:13, backdropFilter:"blur(8px)", transition:"all 0.18s" },
  btnDanger:    { padding:"8px 16px", borderRadius:22, border:"1px solid rgba(239,68,68,0.35)", cursor:"pointer", background:"rgba(239,68,68,0.12)", color:"#f87171", fontWeight:500, fontSize:13, backdropFilter:"blur(8px)", transition:"all 0.18s" },
  btnGhost:     { padding:"6px 12px", borderRadius:16, border:"none", cursor:"pointer", background:"transparent", color:"var(--t-btn-ghost)", fontWeight:500, fontSize:13, transition:"all 0.18s" },
  input:        { width:"100%", padding:"10px 14px", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", fontSize:16, outline:"none", boxSizing:"border-box", background:"var(--t-border-subtle)", backdropFilter:"blur(8px)", color:"#f0f0f5" },
  inputNum:     { width:"100%", padding:"7px 12px", borderRadius:18, border:"1.5px solid rgba(129,140,248,0.45)", fontSize:12, outline:"none", boxSizing:"border-box", background:"rgba(124,58,237,0.08)", backdropFilter:"blur(8px)", color:"#f0f0f5", fontWeight:600, textAlign:"center", transition:"border-color 0.15s" },
  label:        { display:"block", fontSize:11, fontWeight:600, color:"var(--t-text-55)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" },
  card:         { background:"var(--t-card-bg)", borderRadius:14, padding:24, border:"1px solid var(--t-card-border)", boxShadow:"var(--t-card-shadow)" },
  td:           { padding:"11px 16px", color:"var(--t-text-90)", fontSize:13, borderBottom:"1px solid rgba(255,255,255,0.05)" },
};

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.en_attente;
  const glows = { brouillon:"rgba(107,114,128,0.2)", en_attente:"rgba(217,119,6,0.3)", confirmee:"rgba(37,99,235,0.3)", en_preparation:"rgba(124,58,237,0.3)", en_livraison:"rgba(8,145,178,0.3)", livree:"rgba(5,150,105,0.3)", reception_validee:"rgba(22,163,74,0.3)" };
  return <span style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:`${s.bg}22`, color:s.color, border:`1px solid ${s.color}44`, backdropFilter:"blur(8px)", boxShadow:`0 0 10px ${glows[status]||"transparent"}` }}>{s.label}</span>;
}
function Field({ label, children }) {
  return <div><label style={S.label}>{label}</label>{children}</div>;
}
function GlassCard({ children, style={}, className="" }) {
  return <div className={`lg-card ${className}`} style={{ ...S.card, ...style }}>{children}</div>;
}
function PieChart({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div style={{ width:size, height:size, borderRadius:"50%", background:"var(--t-surface)", border:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"var(--t-text-40)" }}>Aucune donnée</div>;
  let cumul = 0;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const start = cumul; cumul += pct;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = cumul * 2 * Math.PI - Math.PI / 2;
    const r = size / 2 - 2;
    const cx = size / 2, cy = size / 2;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return <path key={i} d={path} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={1.5} />;
  });
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{slices}</svg>;
}
function BarChart({ data, showValues = true }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 110, fontSize: 11, color:"var(--t-text-85)", textAlign: "right", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</div>
          <div style={{ flex:1, background:"var(--t-surface)", borderRadius:6, height:20, overflow:"hidden", backdropFilter:"blur(4px)" }}>
            <div style={{ width:`${(d.value/max)*100}%`, background:`linear-gradient(90deg,${COLORS[i%COLORS.length]},${COLORS[(i+1)%COLORS.length]})`, height:"100%", borderRadius:6, transition:"width 0.6s cubic-bezier(0.4,0,0.2,1)", minWidth:d.value>0?6:0, boxShadow:`0 0 12px ${COLORS[i%COLORS.length]}55` }} />
          </div>
          {showValues && <div style={{ width:70, fontSize:11, fontWeight:600, color:"var(--t-text-85)", flexShrink:0 }}>{d.formatted||d.value}</div>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// APP HEADER with dropdown menu
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR — Navigation desktop (≥1024px)
// ═══════════════════════════════════════════════════════════════════════════════
function Sidebar({ session, page, setPage, navItems, stockAlerts, onLogout, dark, setDark }) {
  return (
    <aside className="app-sidebar">
      <div style={{ padding:"24px 20px 16px", borderBottom:"1px solid var(--t-sidebar-border)" }}>
        <button onClick={() => setPage("dashboard")} style={{ display:"flex", alignItems:"center", gap:12, background:"none", border:"none", cursor:"pointer", padding:0 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:"rgba(255,255,255,0.95)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 14px rgba(124,58,237,0.3)" }}>
            <CPLogo size={25} />
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:16, letterSpacing:"-0.03em", color:"var(--t-sidebar-text-active)" }}>CommaPro</div>
            <div style={{ fontSize:10, color:"var(--t-sidebar-text)", marginTop:1 }}>Cockpit des achats</div>
          </div>
        </button>
      </div>
      <nav style={{ flex:1, padding:"12px 10px", overflowY:"auto" }}>
        {navItems.map(([v, lbl, Icon]) => {
          const isActive = page === v;
          return (
            <button key={v} onClick={() => setPage(v)} style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", marginBottom:2, background: isActive ? "var(--t-sidebar-active)" : "transparent", color: isActive ? "var(--t-sidebar-text-active)" : "var(--t-sidebar-text)", fontWeight: isActive ? 700 : 500, fontSize:13.5, textAlign:"left", transition:"all 0.15s", position:"relative" }}>
              {isActive && <div style={{ position:"absolute", left:0, top:"20%", bottom:"20%", width:3, borderRadius:"0 3px 3px 0", background:"#7c3aed" }} />}
              <Icon size={17} strokeWidth={isActive?2.2:1.8} />
              {lbl}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"12px 10px", borderTop:"1px solid var(--t-sidebar-border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:"var(--t-sidebar-active)", marginBottom:8 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,rgba(124,58,237,0.85),rgba(139,92,246,0.8))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"white", flexShrink:0 }}>
            {session.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--t-sidebar-text-active)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{session.name}</div>
            <div style={{ fontSize:10, color:"var(--t-sidebar-text)", marginTop:1 }}>{session.role === "admin" ? "Administrateur" : "Utilisateur"}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 12px", borderRadius:12, border:"none", cursor:"pointer", background:"rgba(239,68,68,0.1)", color:"#ef4444", fontSize:13, fontWeight:600, transition:"all 0.15s" }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.2)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.1)"}>
          <X size={15}/> Se déconnecter
        </button>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIROIR MOBILE — Menu latéral glissant (mobile uniquement)
// ═══════════════════════════════════════════════════════════════════════════════
function MobileDrawer({ open, onClose, session, page, setPage, navItems, onLogout, dark, setDark }) {
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:399, background:"rgba(0,0,0,0.50)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition:"opacity 0.28s ease" }} />
      <div style={{ position:"fixed", top:0, left:0, bottom:0, zIndex:400, width:280, background:"var(--t-sidebar-bg)", backdropFilter:"blur(32px)", WebkitBackdropFilter:"blur(32px)", borderRight:"1px solid var(--t-sidebar-border)", boxShadow: open ? "12px 0 40px rgba(0,0,0,0.4)" : "none", transform: open ? "translateX(0)" : "translateX(-100%)", transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)", display:"flex", flexDirection:"column", paddingTop:"env(safe-area-inset-top)", paddingBottom:"env(safe-area-inset-bottom)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px 16px", borderBottom:"1px solid var(--t-sidebar-border)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"rgba(255,255,255,0.95)", display:"flex", alignItems:"center", justifyContent:"center" }}><CPLogo size={24} /></div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:"var(--t-sidebar-text-active)" }}>CommaPro</div>
              <div style={{ fontSize:10, color:"var(--t-sidebar-text)" }}>Cockpit des achats</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:"1px solid var(--t-sidebar-border)", background:"transparent", cursor:"pointer", color:"var(--t-sidebar-text)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16} /></button>
        </div>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--t-sidebar-border)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:"var(--t-sidebar-active)" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"white", flexShrink:0 }}>{session.name.charAt(0).toUpperCase()}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--t-sidebar-text-active)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{session.name}</div>
              <div style={{ fontSize:11, color:"var(--t-sidebar-text)" }}>{session.email}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"12px", overflowY:"auto" }}>
          {navItems.map(([v, lbl, Icon]) => {
            const isActive = page === v;
            return (
              <button key={v} onClick={() => { setPage(v); onClose(); }} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer", marginBottom:4, background: isActive ? "var(--t-sidebar-active)" : "transparent", color: isActive ? "var(--t-sidebar-text-active)" : "var(--t-sidebar-text)", fontWeight: isActive ? 700 : 500, fontSize:15, textAlign:"left", transition:"all 0.15s", position:"relative" }}>
                {isActive && <div style={{ position:"absolute", left:0, top:"20%", bottom:"20%", width:3, borderRadius:"0 3px 3px 0", background:"#7c3aed" }} />}
                {Icon && <Icon size={18} strokeWidth={isActive?2.2:1.8} />}
                {lbl}
              </button>
            );
          })}
        </nav>
        <div style={{ padding:"12px", borderTop:"1px solid var(--t-sidebar-border)" }}>
          <button onClick={() => { onLogout(); onClose(); }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", padding:"12px 14px", borderRadius:14, border:"none", cursor:"pointer", background:"rgba(239,68,68,0.1)", color:"#ef4444", fontSize:14, fontWeight:700 }}>
            <X size={17}/> Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}

function AppHeader({ session, page, setPage, navItems, stockAlerts, onLogout, dark, setDark, T, onMenuOpen }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const pageLabels = { dashboard:"Accueil", orders:"Commandes", new:"Nouvelle commande", stats:"Statistiques", suppliers:"Fournisseurs", admin:"Admin" };
  const dropStyle = { position:"absolute", top:"calc(100% + 10px)", right:0, backdropFilter:"blur(32px) saturate(180%)", WebkitBackdropFilter:"blur(32px) saturate(180%)", background:"var(--t-drop-bg)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:18, padding:"8px", boxShadow:"0 24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)", zIndex:300 };
  function navigate(v) { setPage(v); setNotifOpen(false); }
  function closeAll() { setNotifOpen(false); }

  return (
    <header className="hdr-root" style={{ backdropFilter:"blur(32px) saturate(200%)", WebkitBackdropFilter:"blur(32px) saturate(200%)", background:T.headerBg, borderBottom:"1px solid "+T.headerBorder, padding:"env(safe-area-inset-top) 20px 0", paddingLeft:"max(20px, env(safe-area-inset-left))", paddingRight:"max(20px, env(safe-area-inset-right))", display:"flex", alignItems:"center", justifyContent:"space-between", height:"calc(60px + env(safe-area-inset-top))", position:"sticky", top:0, zIndex:200 }}>
      <button onClick={() => navigate("dashboard")} style={{ display:"flex", alignItems:"center", gap:11, background:"none", border:"none", cursor:"pointer", padding:"6px 8px", borderRadius:12, flexShrink:0 }} className="lg-nav-btn">
        <div className="hdr-logo-badge" style={{ width:42, height:42, borderRadius:11, background:dark?"rgba(255,255,255,0.95)":"linear-gradient(135deg,#eef2ff,#e0e7ff)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.4)", flexShrink:0 }}>
          <CPLogo size={28} light={false} />
        </div>
        <div className="hdr-brand-text" style={{ textAlign:"left" }}>
          <div style={{ fontWeight:800, fontSize:18, letterSpacing:"-0.03em", color:"var(--t-text-90)", lineHeight:1 }}>CommaPro</div>
        </div>
      </button>

      <div className="hdr-title-center" style={{ fontSize:14, fontWeight:700, color:"var(--t-text-90)", letterSpacing:"-0.02em" }}>{pageLabels[page] || "CommaPro"}</div>

      <div className="hdr-actions" style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>

        {/* NOTIFICATION BELL */}
        <div style={{ position:"relative" }}>
          <button className="hdr-btn" onClick={() => { setNotifOpen(o => !o); }} style={{ position:"relative", width:36, height:36, borderRadius:10, border:"1px solid " + (notifOpen ? "rgba(239,68,68,0.5)" : stockAlerts.length > 0 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.12)"), background: notifOpen ? "rgba(239,68,68,0.2)" : stockAlerts.length > 0 ? "rgba(239,68,68,0.1)" : "var(--t-surface)", color:"var(--t-text-90)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)", flexShrink:0, transition:"all 0.18s" }}>
            <Bell size={17} />
            {stockAlerts.length > 0 && (
              <span style={{ position:"absolute", top:-4, right:-4, background:"linear-gradient(135deg,#ef4444,#dc2626)", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:800, color:"white", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid rgba(8,8,18,0.9)", boxShadow:"0 2px 8px rgba(239,68,68,0.6)" }}>
                {stockAlerts.length > 9 ? "9+" : stockAlerts.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div style={{ ...dropStyle, width:"min(360px, 88vw)", maxHeight:420, overflowY:"auto" }}>
              <div style={{ padding:"10px 12px 10px", borderBottom:"1px solid var(--t-separator)", marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--t-text-85)", display:"flex", alignItems:"center", gap:6 }}><Bell size={15} /> Alertes stock</div>
                {stockAlerts.length > 0 && <span style={{ background:"rgba(239,68,68,0.2)", color:"#f87171", border:"1px solid rgba(239,68,68,0.3)", borderRadius:12, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{stockAlerts.length}</span>}
              </div>
              {stockAlerts.length === 0 ? (
                <div style={{ padding:"24px 12px", textAlign:"center", color:"var(--t-text-30)", fontSize:13 }}>
                  <div style={{ marginBottom:8, display:"flex", justifyContent:"center" }}><CheckCircle size={28} color="#34d399" /></div>Aucune alerte — tout est en ordre
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {stockAlerts.map((a, i) => (
                    <div key={i} style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:12, padding:"10px 12px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:8 }}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:12, color:"var(--t-text-85)", lineHeight:1.3 }}>{a.label}</div>
                          <div style={{ display:"flex", gap:5, marginTop:3 }}>
                            <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-text-40)", background:"var(--t-surface)", padding:"1px 6px", borderRadius:5 }}>{a.ref}</span>
                            {a.subFamily && <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-tag-color)", background:"rgba(165,180,252,0.08)", padding:"1px 6px", borderRadius:5, border:"1px solid var(--t-tag-border)" }}>{a.subFamily}</span>}
                          </div>
                          <div style={{ fontSize:10, color:"var(--t-text-40)", marginTop:2 }}>{a.supplier}</div>
                        </div>
                        <button onClick={() => navigate("new")} style={{ ...S.btnPrimary, padding:"4px 10px", fontSize:11, flexShrink:0 }}>Commander</button>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        {[["Commandé", a.ordered, "#34d399"], ["Stock min", a.stockMin, "#fbbf24"], ["Manque", a.missing, "#f87171"]].map(([lbl, val, col]) => (
                          <div key={lbl} style={{ flex:1, textAlign:"center", background:"var(--t-surface)", borderRadius:8, padding:"5px 4px" }}>
                            <div style={{ fontSize:9, color:"var(--t-text-40)", marginBottom:2, textTransform:"uppercase", letterSpacing:"0.05em" }}>{lbl}</div>
                            <div style={{ fontSize:14, fontWeight:700, color:col }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="hdr-avatar" style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,rgba(99,102,241,0.7),rgba(168,85,247,0.7))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"white", border:"1.5px solid rgba(255,255,255,0.12)", flexShrink:0 }}>
          {session.name.charAt(0).toUpperCase()}
        </div>

        {/* Hamburger */}
        <div style={{ position:"relative" }}>
          <button className="hdr-btn" onClick={() => { onMenuOpen(); setNotifOpen(false); }} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"var(--t-surface)", color:"var(--t-text-85)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, backdropFilter:"blur(8px)", flexShrink:0 }}>
            <div style={{ width:14, height:1.5, background:"currentColor", borderRadius:2, transition:"all 0.2s", transform:"none" }} />
            <div style={{ width:14, height:1.5, background:"currentColor", borderRadius:2, transition:"all 0.2s", opacity:1 }} />
            <div style={{ width:14, height:1.5, background:"currentColor", borderRadius:2, transition:"all 0.2s", transform:"none" }} />
          </button>
        </div>
      </div>


      {notifOpen && <div onClick={closeAll} style={{ position:"fixed", inset:0, zIndex:199 }} />}
    </header>
  );
}


export default function App() {
  const [users,     setUsers]     = useState(INIT_USERS);
  const [suppliers, setSuppliers] = useState(INIT_SUPPLIERS);
  const [orders,    setOrders]    = useState(INIT_ORDERS);
  const [locations, setLocations] = useState(INIT_LOCATIONS);
  const [stockImports, setStockImports] = useState([]);  // historique des imports d'état de stock
  const [unknownRefs, setUnknownRefs] = useState([]);    // réfs vues en import mais absentes du référencement
  const [proposals, setProposals] = useState([]);  // propositions commerciales fournisseurs
  const [replenishments, setReplenishments] = useState([]);  // archive des remplissages rayon
  const [promoCatalogues, setPromoCatalogues] = useState([]);  // catalogues promo mensuels
  const [tasks, setTasks] = useState([]);  // tâches collaboratives
  const [session,   setSession]   = useState(null);
  const [page,      setPage]      = useState("dashboard");
  const getAutoDark = () => { const h = new Date().getHours(); return h >= 20 || h < 7; };
  const [dark, setDark] = useState(getAutoDark());
  const [darkOverride, setDarkOverride] = useState(null); // null = auto
  const effectiveDark = darkOverride !== null ? darkOverride : dark;

  // Recalcule toutes les minutes si pas d'override manuel
  useEffect(() => {
    const t = setInterval(() => {
      if (darkOverride === null) setDark(getAutoDark());
    }, 60000);
    return () => clearInterval(t);
  }, [darkOverride]);

  const toggleDark = () => setDarkOverride(v => v === null ? !effectiveDark : v === effectiveDark ? !v : null);

  // ── Apparence personnalisable (couleur d'accent, taille texte, arrondi) ──────
  const [appearance, setAppearance] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem("cp_appearance")||"null"); if (v) return v; } catch(e){}
    return { accent:"#7c3aed", fontScale:100, radius:100 };
  });
  useEffect(() => {
    try { localStorage.setItem("cp_appearance", JSON.stringify(appearance)); } catch(e){}
    const root = document.documentElement;
    root.style.setProperty("--cp-accent", appearance.accent);
    root.style.setProperty("--cp-font-scale", (appearance.fontScale/100));
    root.style.setProperty("--cp-radius-scale", (appearance.radius/100));
  }, [appearance]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [loaded,    setLoaded]    = useState(false);  // true une fois les données cloud chargées

  // ── Chargement initial depuis Supabase ──────────────────────────────────────
    const lastGoodRef = useRef(null);
  const saveTimerRef = useRef(null);
  useEffect(() => {
    (async () => {
      let cloud = await loadCloud();
      // Si la 1re réponse est nulle, on retente 2 fois (réseau instable) avant de conclure
      for (let i = 0; i < 2 && !cloud; i++) {
        await new Promise(r => setTimeout(r, 800));
        cloud = await loadCloud();
      }
      if (cloud) {
        // setIf : ne pose la valeur que si elle existe (les tableaux vides sont acceptés
        // au chargement initial car c'est la vérité de départ, mais jamais null/undefined)
        const setIf = (val, setter) => { if (val != null) setter(val); };
        setIf(cloud.users, setUsers);
        setIf(cloud.suppliers, setSuppliers);
        setIf(cloud.orders, setOrders);
        setIf(cloud.locations, setLocations);
        setIf(cloud.stockImports, setStockImports);
        setIf(cloud.unknownRefs, setUnknownRefs);
        setIf(cloud.proposals, setProposals);
        setIf(cloud.replenishments, setReplenishments);
        setIf(cloud.promoCatalogues, setPromoCatalogues);
        setIf(cloud.tasks, setTasks);
        // mémorise le "poids" initial pour le garde-fou anti-effacement
        lastGoodRef.current = (cloud.suppliers?.length||0) + (cloud.promoCatalogues?.length||0) + (cloud.orders?.length||0) + (cloud.tasks?.length||0);
      } else {
        // Première utilisation : on envoie les données de départ vers Supabase
        await saveCloud({ users: INIT_USERS, suppliers: INIT_SUPPLIERS, orders: INIT_ORDERS, locations: INIT_LOCATIONS });
      }
      setLoaded(true);
    })();
  }, []);

  // ── Sauvegarde automatique vers Supabase à chaque changement ────────────────
  useEffect(() => {
    if (!loaded) return;  // on n'écrase pas le cloud tant qu'on n'a pas chargé
    const state = { users, suppliers, orders, locations, stockImports, unknownRefs, proposals, replenishments, promoCatalogues, tasks };
    // Garde-fou anti-effacement massif : si l'état devient quasi-vide alors qu'on
    // avait des données juste avant, on suspecte un bug et on NE sauvegarde PAS.
    const weight = (st) => (st.suppliers?.length||0) + (st.promoCatalogues?.length||0) + (st.orders?.length||0) + (st.tasks?.length||0);
    const now = weight(state);
    const before = lastGoodRef.current;
    if (before != null && before >= 3 && now === 0) {
      console.warn("Sauvegarde ignorée : état quasi-vide suspect (anti-effacement).");
      return;  // on refuse d'écraser le cloud par du vide
    }
    lastGoodRef.current = now;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { saveCloud(state); pushSnapshot(state); }, 500);
  }, [users, suppliers, orders, locations, stockImports, unknownRefs, proposals, replenishments, promoCatalogues, tasks, loaded]);

  // ── Export / Import de TOUTES les données (sauvegarde de sécurité) ──────────
  function exportAllData() {
    const data = {
      _commapro_backup: true,
      _version: 1,
      _exportedAt: new Date().toISOString(),
      users, suppliers, orders, locations, stockImports, unknownRefs, proposals, replenishments, promoCatalogues, tasks,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date().toISOString().slice(0,10);
    a.href = url; a.download = `commapro-sauvegarde-${d}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }
  function importAllData(file, onResult) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data._commapro_backup) { onResult("❌ Ce fichier n'est pas une sauvegarde CommaPro valide."); return; }
        if (data.users) setUsers(data.users);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.orders) setOrders(data.orders);
        if (data.locations) setLocations(data.locations);
        if (data.stockImports) setStockImports(data.stockImports);
        if (data.unknownRefs) setUnknownRefs(data.unknownRefs);
        if (data.proposals) setProposals(data.proposals);
        if (data.replenishments) setReplenishments(data.replenishments);
        if (data.promoCatalogues) setPromoCatalogues(data.promoCatalogues);
        if (data.tasks) setTasks(data.tasks);
        const when = data._exportedAt ? new Date(data._exportedAt).toLocaleString("fr-FR") : "?";
        onResult(`✅ Sauvegarde du ${when} restaurée. (${(data.suppliers||[]).length} fournisseurs, ${(data.promoCatalogues||[]).length} catalogues, ${(data.tasks||[]).length} tâches)`);
      } catch (err) {
        onResult("❌ Fichier illisible ou corrompu.");
      }
    };
    reader.readAsText(file);
  }

  // Applique un état complet (utilisé par la restauration de version)
  function applyState(d) {
    if (d.users) setUsers(d.users);
    if (d.suppliers) setSuppliers(d.suppliers);
    if (d.orders) setOrders(d.orders);
    if (d.locations) setLocations(d.locations);
    if (d.stockImports) setStockImports(d.stockImports);
    if (d.unknownRefs) setUnknownRefs(d.unknownRefs);
    if (d.proposals) setProposals(d.proposals);
    if (d.replenishments) setReplenishments(d.replenishments);
    if (d.promoCatalogues) setPromoCatalogues(d.promoCatalogues);
    if (d.tasks) setTasks(d.tasks);
  }

  // ── Rafraîchissement temps réel (autres utilisateurs) toutes les 5 sec ──────
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(async () => {
      const cloud = await loadCloud();
      if (!cloud) return;  // pas de réponse → on ne touche à rien
      // Garde-fou : ne JAMAIS remplacer une liste locale non vide par une liste cloud vide.
      // (protège contre une réponse partielle/instable qui effacerait les données)
      const safeSet = (cloudVal, setter) => {
        if (cloudVal == null) return;                 // champ absent → on ignore
        setter(prev => {
          const prevArr = Array.isArray(prev) ? prev : [];
          const cloudArr = Array.isArray(cloudVal) ? cloudVal : [];
          if (cloudArr.length === 0 && prevArr.length > 0) return prev;  // refuse l'effacement
          return cloudVal;
        });
      };
      safeSet(cloud.users, setUsers);
      safeSet(cloud.suppliers, setSuppliers);
      safeSet(cloud.orders, setOrders);
      safeSet(cloud.locations, setLocations);
      safeSet(cloud.stockImports, setStockImports);
      safeSet(cloud.unknownRefs, setUnknownRefs);
      safeSet(cloud.proposals, setProposals);
      safeSet(cloud.replenishments, setReplenishments);
      safeSet(cloud.promoCatalogues, setPromoCatalogues);
      safeSet(cloud.tasks, setTasks);
    }, 5000);
    return () => clearInterval(interval);
  }, [loaded]);

  // Stock alerts
  const stockAlerts = useMemo(() => {
    const alerts = [];
    suppliers.forEach(s => {
      s.products.forEach(p => {
        const stockMin = p.stockMin ?? calcStockMin(p.weeklyVolume);
        const ordered = orders
          .filter(o => !["livree","reception_validee"].includes(o.status))
          .flatMap(o => o.lines)
          .filter(l => l.ref === p.ref)
          .reduce((sum, l) => sum + l.qty, 0);
        if (ordered < stockMin && stockMin > 0) {
          alerts.push({ ref: p.ref, label: p.label, supplier: s.name, subFamily: p.subFamily, stockMin, ordered, missing: stockMin - ordered });
        }
      });
    });
    return alerts;
  }, [suppliers, orders]);

  // ── Cloche : 3 catégories supplémentaires ──────────────────────────────────
  const todayISO = new Date().toISOString().slice(0,10);
  const lateOrdersNotif = useMemo(() => {
    return (orders||[]).filter(o => o.deliveryDate && o.deliveryDate < todayISO && !["livree","reception_validee","brouillon"].includes(o.status));
  }, [orders, todayISO]);
  const toReceiveNotif = useMemo(() => {
    return (orders||[]).filter(o => ["en_livraison","livree"].includes(o.status));
  }, [orders]);
  const catalogueSoonNotif = useMemo(() => {
    const in3 = new Date(Date.now() + 3*86400000).toISOString().slice(0,10);
    return (promoCatalogues||[]).filter(c => (c.start && c.start >= todayISO && c.start <= in3) || (c.end && c.end >= todayISO && c.end <= in3));
  }, [promoCatalogues, todayISO]);

  if (!loaded) return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"linear-gradient(165deg,#060914 0%,#080b16 50%,#0a0818 100%)", color:"white", fontFamily:"-apple-system,'SF Pro Display',sans-serif", gap:22, position:"relative", overflow:"hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}} @keyframes glow{0%,100%{opacity:0.4}50%{opacity:0.7}}`}</style>
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.2) 0%,transparent 70%)", animation:"glow 3s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:22 }}>
        <div style={{ width:96, height:96, borderRadius:26, background:"rgba(255,255,255,0.95)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 16px 48px rgba(124,58,237,0.4)", animation:"pulse 2s ease-in-out infinite" }}>
          <CPLogo size={60} />
        </div>
        <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.03em", background:"linear-gradient(135deg,#ede9fe,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>CommaPro</div>
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"rgba(255,255,255,0.5)", fontSize:13 }}>
          <div style={{ width:18, height:18, border:"2px solid rgba(255,255,255,0.15)", borderTopColor:"#7c3aed", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          Chargement…
        </div>
      </div>
    </div>
  );
  if (!session) return <LoginScreen users={users} onLogin={setSession} dark={effectiveDark} setDark={toggleDark} />;
  const isAdmin = session.role === "admin";

  const allowedPages = isAdmin ? ALL_PAGES.map(p => p.key) : (session.pages || ["dashboard","orders"]);
  const navItems = [
    ...ALL_PAGES.filter(p => allowedPages.includes(p.key)).map(p => [p.key, p.label, p.icon]),
    isAdmin ? ["admin", "Admin", Settings] : null,
  ].filter(Boolean);

  // ── Theme tokens ────────────────────────────────────────────────────────────
  // DARK = indigo/violet "Liquid Glass" night.  LIGHT = clean slate/blue daylight.
  const themeCSS = effectiveDark ? `
    :root {
      /* ── ENCRE — gris-encre froid, accent bleu glacier ── */
      --t-text-90: rgba(255,255,255,0.95);
      --t-text-85: rgba(255,255,255,0.86);
      --t-text-70: rgba(255,255,255,0.66);
      --t-text-55: rgba(255,255,255,0.52);
      --t-text-40: rgba(255,255,255,0.40);
      --t-text-30: rgba(255,255,255,0.28);
      --t-input-color: #ffffff;
      --t-input-bg: rgba(255,255,255,0.035);
      --t-input-border: rgba(255,255,255,0.10);
      --t-placeholder: rgba(255,255,255,0.32);
      --t-option-bg: #0e0e12;
      --t-scroll: rgba(255,255,255,0.12);
      --t-row-hover: rgba(125,185,255,0.06);
      --t-drop-bg: rgba(14,14,18,0.98);
      --t-nav-hover: rgba(255,255,255,0.05);
      --t-sidebar-bg: rgba(9,9,12,0.98);
      --t-sidebar-border: rgba(255,255,255,0.06);
      --t-sidebar-active: rgba(125,185,255,0.10);
      --t-sidebar-text: rgba(255,255,255,0.50);
      --t-sidebar-text-active: rgba(255,255,255,0.97);
      --t-card-bg: rgba(255,255,255,0.025);
      --t-card-border: rgba(255,255,255,0.08);
      --t-card-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25);
      --t-td-border: rgba(255,255,255,0.06);
      --t-thead-bg: rgba(255,255,255,0.03);
      --t-thead-color: rgba(255,255,255,0.55);
      --t-border-subtle: rgba(255,255,255,0.07);
      --t-surface: rgba(255,255,255,0.035);
      --t-surface-hover: rgba(255,255,255,0.06);
      --t-notif-bg: rgba(239,68,68,0.1);
      --t-notif-border: rgba(239,68,68,0.28);
      --t-badge-bg: rgba(255,255,255,0.05);
      --t-btn-sec-color: rgba(255,255,255,0.82);
      --t-btn-ghost: #7db9ff;
      --t-mono-bg: rgba(255,255,255,0.05);
      --t-mono-color: rgba(125,185,255,0.9);
      --t-tag-bg: rgba(125,185,255,0.10);
      --t-tag-color: #a9d2ff;
      --t-tag-border: rgba(125,185,255,0.22);
      --t-separator: rgba(255,255,255,0.06);
      --t-infoblock: rgba(255,255,255,0.03);
      --t-infoblock-border: rgba(255,255,255,0.07);
    }
  ` : `
    :root {
      /* ── JOUR — clair, propre ── */
      --t-text-90: #0f172a;
      --t-text-85: #1e293b;
      --t-text-70: #334155;
      --t-text-55: #475569;
      --t-text-40: #64748b;
      --t-text-30: #94a3b8;
      --t-input-color: #0f172a;
      --t-input-bg: #ffffff;
      --t-input-border: #cbd5e1;
      --t-placeholder: #94a3b8;
      --t-option-bg: #ffffff;
      --t-scroll: #cbd5e1;
      --t-row-hover: rgba(124,58,237,0.06);
      --t-drop-bg: rgba(255,255,255,0.99);
      --t-nav-hover: rgba(124,58,237,0.08);
      --t-sidebar-bg: rgba(248,248,252,0.98);
      --t-sidebar-border: rgba(0,0,0,0.07);
      --t-sidebar-active: rgba(124,58,237,0.1);
      --t-sidebar-text: rgba(30,30,60,0.6);
      --t-sidebar-text-active: rgba(20,20,50,0.95);
      --t-card-bg: rgba(255,255,255,0.96);
      --t-card-border: rgba(15,23,42,0.08);
      --t-card-shadow: 0 4px 20px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04);
      --t-td-border: rgba(15,23,42,0.07);
      --t-thead-bg: rgba(124,58,237,0.07);
      --t-thead-color: #6d28d9;
      --t-border-subtle: rgba(15,23,42,0.1);
      --t-surface: rgba(248,250,252,1);
      --t-surface-hover: rgba(241,245,249,1);
      --t-notif-bg: #fef2f2;
      --t-notif-border: rgba(248,113,113,0.5);
      --t-badge-bg: rgba(124,58,237,0.08);
      --t-btn-sec-color: #334155;
      --t-btn-ghost: #7c3aed;
      --t-mono-bg: rgba(124,58,237,0.1);
      --t-mono-color: #6d28d9;
      --t-tag-bg: rgba(124,58,237,0.1);
      --t-tag-color: #6d28d9;
      --t-tag-border: rgba(124,58,237,0.25);
      --t-separator: rgba(15,23,42,0.1);
      --t-infoblock: rgba(248,250,252,1);
      --t-infoblock-border: rgba(15,23,42,0.08);
    }
  `;

  const T = effectiveDark ? {
    bg:       "#0a0a0c",
    color:    "#ffffff",
    headerBg: "rgba(6,9,20,0.82)",
    headerBorder: "rgba(255,255,255,0.08)",
    blob1: "transparent", blob2: "transparent", blob3: "transparent",
    accent: "linear-gradient(135deg,#ede9fe,#a78bfa)",
  } : {
    bg:       "linear-gradient(165deg,#f5f3ff 0%,#faf5ff 50%,#eff6ff 100%)",
    color:    "#0f172a",
    headerBg: "rgba(255,255,255,0.92)",
    headerBorder: "rgba(15,23,42,0.08)",
    blob1: "rgba(124,58,237,0.1)", blob2: "rgba(56,189,248,0.07)", blob3: "rgba(139,92,246,0.08)",
    accent: "linear-gradient(135deg,#6d28d9,#7c3aed)",
  };

  return (
    <div style={{ fontFamily:"'Hanken Grotesk','-apple-system','SF Pro Display',BlinkMacSystemFont,sans-serif", minHeight:"100dvh", background:T.bg, color:T.color, position:"relative", overflowX:"hidden", transition:"background 0.4s, color 0.3s" }}>
      <style>{themeCSS + `
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.97)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,25px) scale(1.03)} 66%{transform:translate(30px,-40px) scale(0.98)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(25px,35px) scale(1.04)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 12px rgba(124,58,237,0.4)} 50%{box-shadow:0 0 24px rgba(124,58,237,0.7)} }
        .lg-btn-primary { transition:all 0.2s cubic-bezier(0.4,0,0.2,1) !important; }
        .lg-btn-primary:hover { opacity:0.88; transform:translateY(-1px) scale(0.99); box-shadow:0 8px 28px rgba(124,58,237,0.45) !important; }
        .lg-btn-primary:active { transform:scale(0.96) !important; }
        .lg-btn-secondary:hover { background:var(--t-nav-hover) !important; transform:translateY(-1px); }
        .lg-nav-btn { transition:all 0.18s cubic-bezier(0.4,0,0.2,1) !important; }
        .lg-nav-btn:hover { background:var(--t-nav-hover) !important; }
        .lg-card { animation:fadeUp 0.35s cubic-bezier(0.4,0,0.2,1) both; transition:box-shadow 0.2s,transform 0.2s !important; }
        .lg-card:hover { box-shadow:0 12px 40px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.2) !important; transform:translateY(-1px); }
        .lg-row { transition:background 0.12s !important; cursor:pointer; }
        .lg-row:hover { background:var(--t-row-hover) !important; }
        .lg-supplier-card { transition:all 0.2s cubic-bezier(0.4,0,0.2,1) !important; }
        .lg-supplier-card:hover { border-color:rgba(124,58,237,0.35) !important; transform:translateY(-2px); box-shadow:0 8px 24px rgba(124,58,237,0.15) !important; }
        .lg-product-row { transition:all 0.15s cubic-bezier(0.4,0,0.2,1) !important; }
        .lg-product-row:hover { background:rgba(124,58,237,0.08) !important; border-color:rgba(124,58,237,0.3) !important; transform:translateX(2px); }
        .nav-active-indicator { animation:pulse-glow 2.5s ease-in-out infinite; }
        .lg-search-bar { transition:all 0.2s !important; }
        .lg-search-bar:focus-within { box-shadow:0 0 0 2px rgba(124,58,237,0.3) !important; border-color:rgba(124,58,237,0.4) !important; }
        .stat-card { transition:all 0.22s cubic-bezier(0.4,0,0.2,1) !important; }
        .stat-card:hover { transform:translateY(-3px) !important; box-shadow:0 16px 40px rgba(124,58,237,0.15) !important; }
        * { box-sizing:border-box; }
        html, body { max-width:100%; overflow-x:hidden; }
        /* Tables : scroll horizontal au lieu de casser la page sur mobile */
        table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; max-width: 100%; }
        @media (max-width: 640px) {
          /* Grille d'édition produit (9 colonnes) : scroll horizontal */
          .product-edit-grid { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
        input, select, textarea { color:var(--t-input-color) !important; background:var(--t-input-bg) !important; transition:all 0.18s !important; font-weight:500; font-size:16px; }
        input:focus, select:focus, textarea:focus { outline:none !important; border-color:rgba(124,58,237,0.5) !important; box-shadow:0 0 0 3px rgba(124,58,237,0.12) !important; }
        input::placeholder, textarea::placeholder { color:var(--t-placeholder) !important; }
        option { background:var(--t-option-bg); color:var(--t-input-color); }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:var(--t-scroll); border-radius:3px; }
        /* ── Responsive header (mobile) ─────────────────────────── */
        .hdr-title-center { font-size:14px; font-weight:700; }
        @media (max-width: 640px) {
          .hdr-brand-text { display: none !important; }
          .hdr-logo-badge { width: 36px !important; height: 36px !important; }
          .hdr-avatar { display: none !important; }
          .hdr-actions { gap: 6px !important; }
          /* Empile les mises en page 2 colonnes sur mobile */
          .order-layout { grid-template-columns: 1fr !important; }
          .order-recap { position: static !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 380px) {
          .hdr-btn { width: 34px !important; height: 34px !important; }
        }
        /* ── Sidebar desktop layout ──────────────────────────────── */
        .app-shell { display:flex; min-height:100dvh; }
        .app-sidebar { display:none; }
        .app-content { flex:1; min-width:0; }
        @media (min-width: 1024px) {
          .app-header { display:none !important; }
          .app-sidebar {
            display:flex; flex-direction:column;
            width:228px; flex-shrink:0;
            position:fixed; top:0; left:0; bottom:0; z-index:100;
            border-right:1px solid var(--t-sidebar-border);
            background:var(--t-sidebar-bg);
            backdrop-filter:blur(24px);
            -webkit-backdrop-filter:blur(24px);
            padding:0;
            overflow:hidden;
          }
          .app-content { margin-left:228px; }
          .fab-label { display:inline !important; }
          .tab-bar { display:none !important; }
          .fab-desktop { display:flex !important; }
        }
        @media (max-width: 1023px) {
          .app-shell { display:block; }
          .fab-label { display:none !important; }
          .fab-new { padding:16px !important; border-radius:50% !important; width:52px; height:52px; justify-content:center; }
          .tab-bar { display:flex !important; }
        }

        /* ── APPARENCE PERSONNALISÉE ── */
        /* Couleur d'accent : remplace le violet sur les éléments clés */
        .lg-btn-primary, .fab-new { background: linear-gradient(135deg, var(--cp-accent,#7c3aed), var(--cp-accent,#7c3aed)) !important; }
        /* Taille de texte globale */
        body { font-size: calc(1rem * var(--cp-font-scale, 1)); }
        /* Arrondi : agit sur les cartes et boutons principaux */
        .lg-card { border-radius: calc(20px * var(--cp-radius-scale, 1)) !important; }

      `}</style>

      {/* Ambient blobs */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-10%", left:"-5%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,"+T.blob1+" 0%,transparent 70%)", animation:"float1 18s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:"30%", right:"-10%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,"+T.blob2+" 0%,transparent 70%)", animation:"float2 22s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"-15%", left:"30%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,"+T.blob3+" 0%,transparent 70%)", animation:"float3 16s ease-in-out infinite" }} />
      </div>

      {/* Liquid Glass Header — mobile only (hidden on desktop via CSS) */}
      <div className="app-header">
        <AppHeader session={session} page={page} setPage={setPage} navItems={navItems} stockAlerts={stockAlerts} onLogout={() => setSession(null)} dark={effectiveDark} setDark={toggleDark} T={T} onMenuOpen={() => setMobileMenuOpen(true)} />
      </div>

      {/* App shell : sidebar (desktop) + contenu */}
      <div className="app-shell">
        <Sidebar session={session} page={page} setPage={setPage} navItems={navItems} stockAlerts={stockAlerts} onLogout={() => setSession(null)} dark={effectiveDark} setDark={toggleDark} />
        <div className="app-content">
          <main style={{ maxWidth:1200, margin:"0 auto", padding:"28px 24px", paddingLeft:"max(24px, env(safe-area-inset-left))", paddingRight:"max(24px, env(safe-area-inset-right))", paddingBottom:"calc(120px + env(safe-area-inset-bottom))", position:"relative", zIndex:1 }}>
            <div key={page} style={{ animation:"fadeUp 0.25s cubic-bezier(0.4,0,0.2,1) both" }}>
            {page === "dashboard" && <DashboardPage orders={orders} suppliers={suppliers} stockAlerts={stockAlerts} session={session} setPage={setPage} setOrderFilter={setOrderFilter} setSelectedProduct={setSelectedProduct} T={T} />}
            {page === "orders"    && <OrdersPage orders={orders} setOrders={setOrders} suppliers={suppliers} session={session} setPage={setPage} setEditingDraft={setEditingDraft} initialFilter={orderFilter} onFilterUsed={() => setOrderFilter("all")} T={T} />}
            {page === "new"       && <NewOrderPage orders={orders} setOrders={setOrders} suppliers={suppliers} setSuppliers={setSuppliers} locations={locations} session={session} setPage={setPage} editingDraft={editingDraft} setEditingDraft={setEditingDraft} T={T} />}
            {page === "stats"     && <StatsPage orders={orders} suppliers={suppliers} session={session} T={T} />}
            {page === "catalogue" && <CataloguePage suppliers={suppliers} setSuppliers={setSuppliers} orders={orders} session={session} setPage={setPage} promoCatalogues={promoCatalogues} setPromoCatalogues={setPromoCatalogues} />}
            {page === "catalogues" && <CataloguesPage promoCatalogues={promoCatalogues} setPromoCatalogues={setPromoCatalogues} suppliers={suppliers} session={session} setPage={setPage} setSelectedProduct={setSelectedProduct} orders={orders} setOrders={setOrders} />}
            {page === "tasks" && <TasksPage tasks={tasks} setTasks={setTasks} users={users} suppliers={suppliers} orders={orders} session={session} setPage={setPage} setOrderFilter={setOrderFilter} />}
            {page === "etiquettes" && <EtiquettesPage suppliers={suppliers} session={session} />}
            {page === "apparence" && <AppearancePage appearance={appearance} setAppearance={setAppearance} dark={effectiveDark} toggleDark={toggleDark} darkOverride={darkOverride} />}
            {page === "proposals" && <ProposalsPage proposals={proposals} setProposals={setProposals} suppliers={suppliers} isAdmin={isAdmin} />}
            {page === "remplissage" && <FillSheetPage suppliers={suppliers} setSuppliers={setSuppliers} session={session} replenishments={replenishments} setReplenishments={setReplenishments} />}
            {page === "suppliers" && <SuppliersPage suppliers={suppliers} setSuppliers={setSuppliers} isAdmin={isAdmin} orders={orders} setPage={setPage} stockImports={stockImports} setStockImports={setStockImports} unknownRefs={unknownRefs} setUnknownRefs={setUnknownRefs} T={T} />}
            {page === "admin" && isAdmin && <AdminPage users={users} setUsers={setUsers} locations={locations} setLocations={setLocations} onExport={exportAllData} onImport={importAllData} loadHistory={loadHistory} onRestoreSnapshot={applyState} T={T} />}
            </div>
          </main>
        </div>
      </div>

      {selectedProduct && <ProductSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} session={session} />}

      {/* Tiroir mobile — rendu au niveau App pour position:fixed correct */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        session={session}
        page={page}
        setPage={(v) => { setPage(v); setMobileMenuOpen(false); }}
        navItems={navItems}
        onLogout={() => { setSession(null); setMobileMenuOpen(false); }}
        dark={dark}
        setDark={setDark}
      />

      {/* ── Tab bar iOS fixe en bas (mobile uniquement) ── */}
      <div className="tab-bar" style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:300,
        paddingBottom:"env(safe-area-inset-bottom)",
        backdropFilter:"blur(24px) saturate(180%)",
        WebkitBackdropFilter:"blur(24px) saturate(180%)",
        background: effectiveDark ? "rgba(10,10,18,0.85)" : "rgba(255,255,255,0.85)",
        borderTop: effectiveDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
        display:"flex", alignItems:"stretch",
      }}>
        {/* Remplissage */}
        <button onClick={() => setPage("remplissage")} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"10px 0 8px", border:"none", background:"transparent", cursor:"pointer", transition:"opacity 0.15s" }}>
          <div style={{ width:28, height:28, borderRadius:8, background: page==="remplissage" ? "#8b5cf6" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }}>
            <Package size={18} color={page==="remplissage" ? "white" : "var(--t-text-40)"} strokeWidth={page==="remplissage"?2.5:1.8}/>
          </div>
          <span style={{ fontSize:10, fontWeight: page==="remplissage"?700:500, color: page==="remplissage"?"#8b5cf6":"var(--t-text-40)", letterSpacing:"-0.01em" }}>Rayon</span>
        </button>

        {/* Commandes */}
        <button onClick={() => setPage("orders")} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"10px 0 8px", border:"none", background:"transparent", cursor:"pointer", transition:"opacity 0.15s" }}>
          <div style={{ position:"relative" }}>
            <div style={{ width:28, height:28, borderRadius:8, background: page==="orders" ? "#0ea5e9" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }}>
              <List size={18} color={page==="orders" ? "white" : "var(--t-text-40)"} strokeWidth={page==="orders"?2.5:1.8}/>
            </div>
            {orders.filter(o=>!["livree","reception_validee","brouillon"].includes(o.status)).length > 0 && (
              <div style={{ position:"absolute", top:-3, right:-3, width:14, height:14, borderRadius:"50%", background:"#ef4444", fontSize:8, fontWeight:800, color:"white", display:"flex", alignItems:"center", justifyContent:"center", border: effectiveDark?"2px solid #0a0a18":"2px solid white" }}>
                {orders.filter(o=>!["livree","reception_validee","brouillon"].includes(o.status)).length}
              </div>
            )}
          </div>
          <span style={{ fontSize:10, fontWeight: page==="orders"?700:500, color: page==="orders"?"#0ea5e9":"var(--t-text-40)", letterSpacing:"-0.01em" }}>Commandes</span>
        </button>

        {/* Bouton + central */}
        <button onClick={() => setPage("new")} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"6px 0 8px", border:"none", background:"transparent", cursor:"pointer" }}>
          <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(124,58,237,0.5)", marginTop:-8, transition:"transform 0.15s" }}
            onTouchStart={e=>e.currentTarget.style.transform="scale(0.9)"}
            onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
            <Plus size={22} color="white" strokeWidth={2.5}/>
          </div>
          <span style={{ fontSize:10, fontWeight:600, color:"#7c3aed", letterSpacing:"-0.01em" }}>Commander</span>
        </button>

        {/* Catalogue */}
        <button onClick={() => setPage("catalogue")} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"10px 0 8px", border:"none", background:"transparent", cursor:"pointer" }}>
          <div style={{ width:28, height:28, borderRadius:8, background: page==="catalogue" ? "#10b981" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }}>
            <BookOpen size={18} color={page==="catalogue" ? "white" : "var(--t-text-40)"} strokeWidth={page==="catalogue"?2.5:1.8}/>
          </div>
          <span style={{ fontSize:10, fontWeight: page==="catalogue"?700:500, color: page==="catalogue"?"#10b981":"var(--t-text-40)", letterSpacing:"-0.01em" }}>Catalogue</span>
        </button>

        {/* Plus (accueil/menu) */}
        <button onClick={() => setPage("dashboard")} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"10px 0 8px", border:"none", background:"transparent", cursor:"pointer" }}>
          <div style={{ width:28, height:28, borderRadius:8, background: page==="dashboard" ? "#f59e0b" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }}>
            <Home size={18} color={page==="dashboard" ? "white" : "var(--t-text-40)"} strokeWidth={page==="dashboard"?2.5:1.8}/>
          </div>
          <span style={{ fontSize:10, fontWeight: page==="dashboard"?700:500, color: page==="dashboard"?"#f59e0b":"var(--t-text-40)", letterSpacing:"-0.01em" }}>Accueil</span>
        </button>
      </div>

      {/* Bouton flottant « Commander » — desktop uniquement (mobile a déjà le + dans la tab bar) */}
      <button
        onClick={() => setPage("new")}
        className="fab-desktop"
        aria-label="Nouvelle commande"
        style={{
          position:"fixed", right:32, bottom:32, zIndex:300,
          display:"none", alignItems:"center", gap:10, padding:"15px 22px",
          borderRadius:30, border:"none", cursor:"pointer", color:"white",
          background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", fontWeight:700, fontSize:15,
          boxShadow:"0 10px 32px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
          letterSpacing:"-0.01em", transition:"transform 0.18s, box-shadow 0.18s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 14px 40px rgba(124,58,237,0.6)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 10px 32px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.25)"; }}
      >
        <Plus size={20} strokeWidth={2.5} />
        Commander
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// FICHE PRODUIT — Panneau bas (position:fixed au niveau App)
// ═══════════════════════════════════════════════════════════════════════════════
function ProductSheet({ product, onClose, session }) {
  if (!product) return null;
  const hasPrice = session.canSeePrices;
  const ecotaxe = product.ecotaxe || 0;
  const prixVente = product.prixVente || null;
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:490, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)" }} />
      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:500, background:"var(--t-card-bg)", borderRadius:"24px 24px 0 0", paddingBottom:"max(24px, env(safe-area-inset-bottom))", boxShadow:"0 -8px 40px rgba(0,0,0,0.4)", maxHeight:"80vh", overflowY:"auto", animation:"psUp 0.3s cubic-bezier(0.4,0,0.2,1) both" }}>
        <style>{`@keyframes psUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:40, height:4, borderRadius:2, background:"var(--t-border-subtle)" }} />
        </div>
        <div style={{ padding:"8px 24px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.02em", color:"var(--t-text-90)", lineHeight:1.2, marginBottom:8 }}>{product.label}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"monospace", fontSize:11, background:"var(--t-surface)", color:"var(--t-text-55)", padding:"2px 8px", borderRadius:6, fontWeight:600 }}>{product.ref}</span>
                {product.ean && <span style={{ fontFamily:"monospace", fontSize:11, background:"rgba(124,58,237,0.1)", color:"#7c3aed", padding:"2px 8px", borderRadius:6 }}>EAN {product.ean}</span>}
                {product.subFamily && <span style={{ fontSize:11, background:"var(--t-tag-bg)", color:"var(--t-tag-color)", padding:"2px 8px", borderRadius:6, border:"1px solid var(--t-tag-border)" }}>{product.subFamily}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:10, border:"1px solid var(--t-border-subtle)", background:"var(--t-surface)", cursor:"pointer", color:"var(--t-text-55)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginLeft:12 }}><X size={16} /></button>
          </div>
          <div style={{ background:"var(--t-surface)", borderRadius:14, padding:"12px 16px", marginBottom:14, border:"1px solid var(--t-border-subtle)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Fournisseur</div>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--t-text-90)" }}>{product.supplierName || "—"}</div>
          </div>
          {hasPrice && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
              <div style={{ background:"var(--t-surface)", borderRadius:14, padding:"14px 16px", border:"1px solid var(--t-border-subtle)" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Prix achat HT</div>
                <div style={{ fontSize:22, fontWeight:800, color:"#34d399" }}>{product.price ? fmt(product.price) : "—"}</div>
              </div>
              <div style={{ background: prixVente ? "rgba(124,58,237,0.08)" : "var(--t-surface)", borderRadius:14, padding:"14px 16px", border: prixVente ? "1px solid rgba(99,102,241,0.25)" : "1px solid var(--t-border-subtle)" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Prix de vente TTC</div>
                {prixVente ? (
                  <>
                    <div style={{ fontSize:22, fontWeight:800, color:"#7c3aed" }}>{fmt(prixVente)}</div>
                    {ecotaxe > 0 && <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:2 }}>dont {fmt(ecotaxe)} d'écotaxe incluse</div>}
                  </>
                ) : <div style={{ fontSize:12, color:"var(--t-text-30)", fontStyle:"italic" }}>Non renseigné</div>}
              </div>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ background:"var(--t-surface)", borderRadius:14, padding:"14px 16px", border:"1px solid var(--t-border-subtle)" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Stock dispo</div>
              {product.dispoParDepot ? (
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {Object.entries(product.dispoParDepot).map(([depot,d]) => (
                    <div key={depot} style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:11, color:"var(--t-text-55)" }}>{depot}</span>
                      <span style={{ fontSize:13, fontWeight:700, color: d.dispo===0?"#ef4444":d.dispo<=(product.stockMin||0)?"#f59e0b":"#34d399" }}>{d.dispo}</span>
                    </div>
                  ))}
                </div>
              ) : product.dispo != null
                ? <div style={{ fontSize:24, fontWeight:800, color: product.dispo===0?"#ef4444":product.dispo<=(product.stockMin||0)?"#f59e0b":"#34d399" }}>{product.dispo}</div>
                : <div style={{ fontSize:12, color:"var(--t-text-30)", fontStyle:"italic" }}>Aucun import</div>}
            </div>
            <div style={{ background:"var(--t-surface)", borderRadius:14, padding:"14px 16px", border:"1px solid var(--t-border-subtle)" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Stock minimum</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#f59e0b" }}>{product.stockMin ?? "—"}</div>
              {product.weeklyVolume > 0 && <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:2 }}>{product.weeklyVolume} ventes/sem</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNER CODE-BARRES (caméra) — charge html5-qrcode depuis un CDN à la demande
// ═══════════════════════════════════════════════════════════════════════════════
function BarcodeScanner({ onDetected, onClose }) {
  const [status, setStatus] = useState("Initialisation de la caméra…");
  const [error, setError] = useState("");

  useEffect(() => {
    let scanner = null;
    let cancelled = false;

    function loadScript() {
      return new Promise((resolve, reject) => {
        if (window.Html5Qrcode) return resolve();
        const s = document.createElement("script");
        s.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
        s.onload = resolve;
        s.onerror = () => reject(new Error("Impossible de charger le scanner."));
        document.head.appendChild(s);
      });
    }

    (async () => {
      try {
        await loadScript();
        if (cancelled) return;
        const Html5Qrcode = window.Html5Qrcode;
        scanner = new Html5Qrcode("scanner-zone");
        setStatus("Visez un code-barres…");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (cancelled) return;
            cancelled = true;
            scanner.stop().then(() => onDetected(decodedText)).catch(() => onDetected(decodedText));
          },
          () => {}
        );
      } catch (e) {
        console.error(e);
        setError(e.message || "Erreur caméra. Autorisez l'accès à la caméra dans votre navigateur.");
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) { try { scanner.stop().catch(()=>{}); } catch {} }
    };
  }, [onDetected]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#111", borderRadius:24, padding:20, maxWidth:420, width:"100%", border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ color:"white", fontSize:15, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}><Camera size={18} /> Scanner un code-barres</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:10, width:34, height:34, cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={18} /></button>
        </div>
        {error ? (
          <div style={{ color:"#f87171", fontSize:13, textAlign:"center", padding:"30px 10px", lineHeight:1.5 }}>
            <Camera size={32} style={{ marginBottom:10 }} /><br/>{error}
          </div>
        ) : (
          <>
            <div id="scanner-zone" style={{ width:"100%", borderRadius:16, overflow:"hidden", background:"#000", minHeight:240 }} />
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12, textAlign:"center", marginTop:12 }}>{status}</div>
          </>
        )}
      </div>
    </div>
  );
}

function DashboardPage({ orders, suppliers, stockAlerts, session, setPage, setOrderFilter, setSelectedProduct }) {
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const isAdmin = session.role === "admin";
  const todayStr = new Date().toISOString().slice(0,10);
  const notReceived = (o) => !["livree","reception_validee"].includes(o.status);

  // ── 3 chiffres clés ──────────────────────────────────────────────────────────
  const pending = orders.filter(o => notReceived(o) && o.status !== "brouillon");
  const lateOrders = orders.filter(o => o.deliveryDate && o.deliveryDate < todayStr && notReceived(o));
  const totalHT = orders.filter(o => o.status !== "brouillon").reduce((s,o) => s + orderTotal(o), 0);

  // ── Alertes urgentes uniquement ──────────────────────────────────────────────
  const urgentAlerts = stockAlerts.filter(a => a.missing > 0).slice(0, 5);
  const deliveriesToday = orders.filter(o => o.deliveryDate === todayStr && notReceived(o));

  // ── Recherche globale ────────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();
  const searchResults = q.length < 2 ? [] : suppliers.flatMap(s =>
    s.products.filter(p =>
      (p.ref||"").toLowerCase().includes(q) ||
      (p.ean||"").toLowerCase().includes(q) ||
      (p.label||"").toLowerCase().includes(q)
    ).map(p => ({ ...p, supplierName: s.name }))
  ).slice(0, 20);

  // ── Tuiles de navigation iOS ─────────────────────────────────────────────────
  const tiles = [
    { page:"new",        label:"Nouvelle commande", color:"#7c3aed", bg:"rgba(124,58,237,0.12)",  Icon:Edit },
    { page:"orders",     label:"Commandes",          color:"#0ea5e9", bg:"rgba(14,165,233,0.12)",  Icon:List },
    { page:"catalogue",  label:"Catalogue",          color:"#10b981", bg:"rgba(16,185,129,0.12)",  Icon:BookOpen },
    { page:"suppliers",  label:"Fournisseurs",       color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  Icon:Factory },
    { page:"remplissage",label:"Remplissage",         color:"#8b5cf6", bg:"rgba(139,92,246,0.12)",  Icon:Package },
    { page:"proposals",  label:"Propositions",       color:"#ec4899", bg:"rgba(236,72,153,0.12)",  Icon:Tag },
    { page:"stats",      label:"Statistiques",       color:"#06b6d4", bg:"rgba(6,182,212,0.12)",   Icon:BarChart2 },
    isAdmin && { page:"admin", label:"Admin",        color:"#ef4444", bg:"rgba(239,68,68,0.12)",   Icon:Settings },
  ].filter(Boolean).filter(t => isAdmin || (session.pages||[]).includes(t.page));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const showPrices = session.canSeePrices;

  // ── Score de fiabilité fournisseur (% livré à temps) ─────────────────────────
  function reliability(supplierName) {
    const delivered = orders.filter(o => o.supplierName === supplierName && ["livree","reception_validee"].includes(o.status) && o.deliveryDate);
    if (delivered.length === 0) return null;
    const onTime = delivered.filter(o => {
      const stamp = (o.statusHistory||{}).livree || (o.statusHistory||{}).reception_validee;
      if (!stamp) return true; // pas d'info = présumé OK
      return stamp.slice(0,10) <= o.deliveryDate;
    }).length;
    const pct = Math.round(onTime / delivered.length * 100);
    let grade = "C", color = "#ef4444";
    if (pct >= 95)      { grade = "A+"; color = "#22c55e"; }
    else if (pct >= 85) { grade = "A";  color = "#22c55e"; }
    else if (pct >= 70) { grade = "B+"; color = "#f59e0b"; }
    else if (pct >= 50) { grade = "B";  color = "#f59e0b"; }
    return { pct, grade, color, count: delivered.length };
  }

  // Fournisseurs principaux (triés par nb de commandes)
  const supplierStats = suppliers.map(s => {
    const ords = orders.filter(o => o.supplierName === s.name);
    const ca = ords.filter(o=>o.status!=="brouillon").reduce((sum,o)=>sum+orderTotal(o),0);
    return { ...s, orderCount: ords.length, ca, rel: reliability(s.name) };
  }).sort((a,b) => b.orderCount - a.orderCount).slice(0, 6);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, color:"var(--t-text-40)", marginBottom: 2 }}>
          {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
        </div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", color:"var(--t-text-90)", lineHeight: 1.1 }}>
          {greeting},<br/>{session.name.split(" ")[0]} 👋
        </h1>
        <div style={{ fontSize:14, color:"var(--t-text-55)", marginTop:8 }}>
          {(lateOrders.length>0 || urgentAlerts.length>0) ? "Voici ce qui se passe aujourd'hui" : "Tout est sous contrôle"}
        </div>
      </div>

      {/* ── Recherche ── */}
      <div style={{ position:"relative", marginBottom: 24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)", borderRadius: 16, padding:"13px 16px" }}>
          <Search size={17} style={{ color:"var(--t-text-40)", flexShrink:0 }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Référence, EAN ou produit…"
            style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:15, color:"var(--t-input-color)" }}
          />
          {query
            ? <button onClick={() => setQuery("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-40)", padding:0 }}><X size={16}/></button>
            : <button onClick={() => setScanning(true)} style={{ background:"var(--t-border-subtle)", border:"none", borderRadius:10, padding:"6px 10px", cursor:"pointer", color:"var(--t-text-55)", display:"flex" }}><Camera size={16}/></button>
          }
        </div>
        {q.length >= 2 && (
          <div style={{ position:"absolute", top:"calc(100% + 8px)", left:0, right:0, background:"var(--t-drop-bg)", border:"1px solid var(--t-border-subtle)", borderRadius:16, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.2)", zIndex:50 }}>
            {searchResults.length === 0
              ? <div style={{ padding:20, textAlign:"center", color:"var(--t-text-40)", fontSize:13 }}>Aucun résultat</div>
              : searchResults.map((p,i) => (
                <div key={i} onClick={() => { setSelectedProduct(p); setQuery(""); }} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderBottom:i<searchResults.length-1?"1px solid var(--t-border-subtle)":"none", cursor:"pointer" }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:"var(--t-text-90)" }}>{p.label}</div>
                    <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:2 }}>{p.ref} · {p.supplierName}</div>
                  </div>
                  {p.price > 0 && <div style={{ fontWeight:700, color:"#10b981", fontSize:13 }}>{fmt(p.price)}</div>}
                </div>
              ))
            }
          </div>
        )}
      </div>

      {scanning && <BarcodeScanner onDetected={code => {
        setQuery(code); setScanning(false);
        const m = suppliers.flatMap(s=>s.products.map(p=>({...p,supplierName:s.name}))).find(p=>(p.ean||"").toLowerCase()===code.toLowerCase()||(p.ref||"").toLowerCase()===code.toLowerCase());
        if (m) setSelectedProduct(m);
      }} onClose={() => setScanning(false)} />}

      {/* ── Carte unifiée "À ne pas manquer" ── */}
      <div style={{
        background:"rgba(255,255,255,0.055)",
        backdropFilter:"blur(24px) saturate(180%)", WebkitBackdropFilter:"blur(24px) saturate(180%)",
        border:"1px solid rgba(255,255,255,0.12)", borderRadius:28, padding:"6px 6px",
        marginBottom:16, boxShadow:"0 8px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
        display:"flex",
      }}>
        {[
          { value: deliveriesToday.length, label:"Livraisons\naujourd'hui", color:"#38bdf8", bg:"rgba(56,189,248,0.14)", Icon:Truck, onClick:()=>setPage("orders") },
          { value: lateOrders.length, label:"Commandes\nen retard", color:"#f59e0b", bg:"rgba(245,158,11,0.14)", Icon:Clock, onClick:()=>setPage("orders") },
          { value: urgentAlerts.length, label:"Produits à\ncommander", color:"#7c3aed", bg:"rgba(124,58,237,0.14)", Icon:Package, onClick:()=>setPage("new") },
        ].map((k,i) => (
          <button key={i} onClick={k.onClick} style={{
            flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8,
            padding:"18px 6px", border:"none", background:"transparent", cursor:"pointer",
            borderLeft: i>0 ? "1px solid rgba(255,255,255,0.08)" : "none",
            transition:"opacity 0.15s",
          }}
            onTouchStart={e=>e.currentTarget.style.opacity="0.6"}
            onTouchEnd={e=>e.currentTarget.style.opacity="1"}>
            <div style={{ width:42, height:42, borderRadius:13, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <k.Icon size={20} color={k.color}/>
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:"var(--t-text-90)", lineHeight:1, letterSpacing:"-0.03em" }}>{k.value}</div>
            <div style={{ fontSize:10.5, color:"var(--t-text-55)", fontWeight:500, lineHeight:1.3, whiteSpace:"pre-line" }}>{k.label}</div>
          </button>
        ))}
      </div>

      {/* ── Total engagé (si droit prix) ── */}
      {showPrices ? (
        <div onClick={()=>{setOrderFilter("commandee");setPage("orders");}} style={{
          background:"rgba(255,255,255,0.055)",
          backdropFilter:"blur(24px) saturate(180%)", WebkitBackdropFilter:"blur(24px) saturate(180%)",
          border:"1px solid rgba(255,255,255,0.12)", borderRadius:24, padding:"20px 22px",
          marginBottom:28, cursor:"pointer", boxShadow:"0 8px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}>
          <div style={{ fontSize:12, color:"var(--t-text-55)", marginBottom:4, fontWeight:500 }}>Total engagé (en cours)</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
            <span style={{ fontSize:30, fontWeight:800, color:"var(--t-text-90)", letterSpacing:"-0.03em" }}>{fmt(pending.reduce((s,o)=>s+orderTotal(o),0))}</span>
            <span style={{ fontSize:13, color:"var(--t-text-40)", fontWeight:600 }}>HT</span>
          </div>
        </div>
      ) : (
        <div style={{
          background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:24, padding:"18px 22px", marginBottom:28,
          display:"flex", alignItems:"center", gap:10,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t-text-40)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{ fontSize:13, color:"var(--t-text-40)" }}>Montants — accès restreint</span>
        </div>
      )}

      {/* ── Alertes urgentes ── */}
      {(urgentAlerts.length > 0 || lateOrders.length > 0) && (
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>⚠ Urgent</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {lateOrders.slice(0,3).map(o => {
              const days = Math.round((new Date(todayStr)-new Date(o.deliveryDate))/86400000);
              return (
                <div key={o.id} onClick={() => setPage("orders")} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:16, padding:"12px 16px", cursor:"pointer" }}>
                  <div style={{ width:36, height:36, borderRadius:12, background:"rgba(239,68,68,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Clock size={18} color="#ef4444"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.supplierName}</div>
                    <div style={{ fontSize:11, color:"#f87171" }}>Retard de {days} jour{days>1?"s":""}</div>
                  </div>
                  <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-text-40)" }}>{o.id}</span>
                </div>
              );
            })}
            {urgentAlerts.slice(0,3).map((a,i) => (
              <div key={i} onClick={() => setPage("new")} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:16, padding:"12px 16px", cursor:"pointer" }}>
                <div style={{ width:36, height:36, borderRadius:12, background:"rgba(245,158,11,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Package size={18} color="#f59e0b"/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.label}</div>
                  <div style={{ fontSize:11, color:"#fbbf24" }}>Stock {a.ordered} / min {a.stockMin}</div>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.15)", padding:"2px 10px", borderRadius:10, flexShrink:0 }}>Commander</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grille navigation iOS — Liquid Glass ── */}
      <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>Navigation</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0, 1fr))", gap:10, marginBottom:32 }}>
        {tiles.map((t,i) => (
          <button key={i} onClick={() => setPage(t.page)} style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 20,
            padding: "16px 4px 12px",
            cursor: "pointer",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
            transition: "transform 0.15s, box-shadow 0.15s",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.25)",
            minWidth: 0,
          }}
            onTouchStart={e=>e.currentTarget.style.transform="scale(0.93)"}
            onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(0.95)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            <div style={{
              width:42, height:42, borderRadius:13,
              background: t.color,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow: "0 4px 14px " + t.color + "55, inset 0 1px 0 rgba(255,255,255,0.3)",
              flexShrink: 0,
            }}>
              <t.Icon size={20} color="white" strokeWidth={2.2}/>
            </div>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-85)", lineHeight:1.3, width:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", padding:"0 2px" }}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* ── Activité récente (compact) ── */}
      {orders.length > 0 && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Récent</div>
            <button onClick={() => setPage("orders")} style={{ ...S.btnGhost, fontSize:12, padding:"2px 8px" }}>Tout voir →</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[...orders].reverse().slice(0,4).map((o,i) => (
              <div key={i} onClick={() => setPage("orders")} style={{ display:"flex", alignItems:"center", gap:12, background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)", borderRadius:16, padding:"12px 16px", cursor:"pointer", transition:"transform 0.12s" }}
                onMouseEnter={e=>e.currentTarget.style.transform="translateX(2px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
                <div style={{ width:36, height:36, borderRadius:12, background:"rgba(124,58,237,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <List size={16} color="#7c3aed"/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-text-40)", fontWeight:600 }}>{o.id}</span>
                    <StatusBadge status={o.status}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.supplierName}</div>
                </div>
                {session.canSeePrices && <div style={{ fontSize:13, fontWeight:700, color:"#10b981", flexShrink:0 }}>{fmt(orderTotal(o))}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Fournisseurs principaux ── */}
      {supplierStats.length > 0 && (
        <div style={{ marginTop:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Fournisseurs</div>
            <button onClick={() => setPage("suppliers")} style={{ ...S.btnGhost, fontSize:12, padding:"2px 8px" }}>Tous →</button>
          </div>
          <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4, WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
            {supplierStats.map(s => {
              const initials = s.name.split(/\s+/).slice(0,3).map(w=>w[0]?.toUpperCase()||"").join("");
              const colors = ["#7c3aed","#8b5cf6","#0891b2","#059669","#d97706","#e11d48"];
              const color = colors[s.name.charCodeAt(0) % colors.length];
              return (
                <div key={s.id} onClick={()=>setPage("suppliers")} style={{
                  flexShrink:0, width:150,
                  background:"rgba(255,255,255,0.05)",
                  backdropFilter:"blur(20px) saturate(180%)", WebkitBackdropFilter:"blur(20px) saturate(180%)",
                  border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:16, cursor:"pointer",
                  boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:`${color}22`, border:`1.5px solid ${color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color }}>{initials}</div>
                    {s.rel && <span style={{ fontSize:16, fontWeight:800, color:s.rel.color }}>{s.rel.grade}</span>}
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:3 }}>{s.name}</div>
                  {s.rel
                    ? <div style={{ fontSize:11, color:"var(--t-text-40)" }}>Fiabilité {s.rel.pct}%</div>
                    : <div style={{ fontSize:11, color:"var(--t-text-30)" }}>Pas d'historique</div>}
                  <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:6 }}>{s.orderCount} commande{s.orderCount>1?"s":""}</div>
                  {showPrices && s.ca>0 && <div style={{ fontSize:12, fontWeight:700, color:"#22c55e", marginTop:4 }}>{fmt(s.ca)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
function StatsPage({ orders, suppliers, session }) {
  const [period, setPeriod] = useState(30);

  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - period); return d.toISOString().split("T")[0];
  }, [period]);

  const filtered = useMemo(() => orders.filter(o => o.date >= cutoff), [orders, cutoff]);

  // Part par fournisseur (volume HT)
  const bySupplier = useMemo(() => {
    const map = {};
    filtered.forEach(o => { map[o.supplierName] = (map[o.supplierName] || 0) + orderTotal(o); });
    return Object.entries(map).map(([label, value]) => ({ label, value, formatted: fmt(value) })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  const supplierTotal = bySupplier.reduce((s, d) => s + d.value, 0);

  // Part par famille (rayon)
  const byFamily = useMemo(() => {
    const map = {};
    filtered.forEach(o => (o.lines||[]).forEach(l => {
      const fam = l.family || "Autre";
      map[fam] = (map[fam] || 0) + lineTotal(l);
    }));
    return Object.entries(map).map(([label, value]) => ({ label, value, formatted: fmt(value) })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  // Part par sous-famille
  const bySubFamily = useMemo(() => {
    const map = {};
    filtered.forEach(o => (o.lines||[]).forEach(l => {
      const sf = l.subFamily || "—";
      if (!map[sf]) map[sf] = { value: 0, family: l.family || "Autre" };
      map[sf].value += lineTotal(l);
    }));
    return Object.entries(map).map(([label, d]) => ({ label, value: d.value, formatted: fmt(d.value), family: d.family })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  // Statuts
  const byStatus = useMemo(() => Object.entries(STATUS).map(([k, s]) => ({
    label: s.label, value: filtered.filter(o => o.status === k).length, color: s.color
  })), [filtered]);

  // Évolution nb commandes (par semaine glissante sur la période)
  const evolution = useMemo(() => {
    const weeks = Math.ceil(period / 7);
    return Array.from({ length: weeks }, (_, i) => {
      const to = new Date(); to.setDate(to.getDate() - i * 7);
      const from = new Date(to); from.setDate(from.getDate() - 7);
      const toStr = to.toISOString().split("T")[0];
      const fromStr = from.toISOString().split("T")[0];
      const count = orders.filter(o => o.date >= fromStr && o.date < toStr).length;
      return { label: `S-${i}`, value: count };
    }).reverse();
  }, [orders, period]);

  const StatSection = ({ title, children }) => (
    <div style={S.card}>
      <h2 style={{ margin: "0 0 18px 0", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{title}</h2>
      {children}
    </div>
  );
  const StatSectionDark = ({ title, children }) => (
    <div style={{ ...S.card }}>
      <h2 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 700, color: "var(--t-text-90)" }}>{title}</h2>
      {children}
    </div>
  );

  // ═══ PILOTAGE DU RAYON (basé sur les sorties calculées via les imports de stock) ═══
  const showPrices = session.canSeePrices;
  // Tous les produits à plat, avec sorties hebdo (weeklyVolume), stock dispo, valeur
  const allProds = useMemo(() => {
    const list = [];
    suppliers.forEach(s => (s.products||[]).forEach(p => {
      const w = p.weeklyVolume || 0;
      const dispo = p.dispo != null ? p.dispo : null;
      list.push({
        ref: p.ref, label: p.label, supplier: s.name,
        family: p.family || "Autre", subFamily: p.subFamily || "—",
        weekly: w, dispo,
        prixVente: p.prixVente || 0, price: p.price || 0,
        caHebdo: w * (p.prixVente || 0),                       // CA hebdo estimé
        rotation: (dispo != null && dispo > 0) ? (w / dispo) : (w > 0 ? Infinity : 0), // sorties/stock
      });
    }));
    return list;
  }, [suppliers]);

  const hasSalesData = useMemo(() => allProds.some(p => p.weekly > 0), [allProds]);

  // Produits dormants : aucune sortie (weekly = 0) mais encore en stock
  const dormants = useMemo(() =>
    allProds.filter(p => p.weekly === 0 && (p.dispo == null || p.dispo > 0))
      .sort((a,b) => (b.dispo||0) - (a.dispo||0)), [allProds]);

  // Tops ventes (par volume) et par CA
  const topVolume = useMemo(() => [...allProds].filter(p=>p.weekly>0).sort((a,b)=>b.weekly-a.weekly).slice(0,10), [allProds]);
  const topCA = useMemo(() => [...allProds].filter(p=>p.caHebdo>0).sort((a,b)=>b.caHebdo-a.caHebdo).slice(0,10), [allProds]);
  // Flops : sortent peu mais sortent quand même (1-2/sem), triés du plus faible
  const flops = useMemo(() => [...allProds].filter(p=>p.weekly>0).sort((a,b)=>a.weekly-b.weekly).slice(0,10), [allProds]);

  // Part des sous-familles (volume + valeur)
  const subFamShare = useMemo(() => {
    const map = {};
    allProds.forEach(p => {
      if (!map[p.subFamily]) map[p.subFamily] = { vol:0, ca:0, family:p.family, nb:0 };
      map[p.subFamily].vol += p.weekly;
      map[p.subFamily].ca += p.caHebdo;
      map[p.subFamily].nb += 1;
    });
    return Object.entries(map).map(([label,d])=>({ label, ...d })).sort((a,b)=> (showPrices ? b.ca-a.ca : b.vol-a.vol));
  }, [allProds, showPrices]);
  const subVolTotal = subFamShare.reduce((s,d)=>s+d.vol,0);
  const subCaTotal = subFamShare.reduce((s,d)=>s+d.ca,0);

  // Rotation : ce qui tourne vite (sorties élevées vs stock) vs ce qui dort
  const rotationFast = useMemo(() => [...allProds].filter(p=>p.dispo!=null && p.weekly>0).sort((a,b)=>b.rotation-a.rotation).slice(0,8), [allProds]);
  const rotationSlow = useMemo(() => [...allProds].filter(p=>p.dispo!=null && p.dispo>0 && p.weekly>0).sort((a,b)=>a.rotation-b.rotation).slice(0,8), [allProds]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em" }}>Statistiques</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {[7,30,90,365].map(d => (
            <button key={d} onClick={() => setPeriod(d)} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid", fontSize: 12, cursor: "pointer", fontWeight: period===d ? 700 : 400, background:period===d?"rgba(99,102,241,0.7)":"var(--t-surface)", color:period===d?"white":"var(--t-text-55)", borderColor:period===d?"rgba(124,58,237,0.5)":"var(--t-border-subtle)", backdropFilter:"blur(8px)", boxShadow:period===d?"0 0 16px rgba(124,58,237,0.35)":"none" }}>
              {d === 365 ? "1 an" : `${d}j`}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ SECTION PILOTAGE DU RAYON ═══ */}
      {hasSalesData ? (
        <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:16 }}>
          <div style={{ fontSize:12, color:"var(--t-text-40)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em" }}>📊 Pilotage du rayon — basé sur les sorties (rythme hebdomadaire)</div>

          {/* Part des sous-familles */}
          <StatSectionDark title="Part des sous-familles">
            {subFamShare.slice(0,12).map((d,i) => {
              const pct = showPrices ? (subCaTotal? Math.round(d.ca/subCaTotal*100):0) : (subVolTotal? Math.round(d.vol/subVolTotal*100):0);
              return (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                    <span style={{ fontWeight:600 }}>{d.label} <span style={{ fontSize:11, color:"var(--t-text-40)" }}>({d.nb})</span></span>
                    <span style={{ fontWeight:700 }}>{pct}% · {showPrices ? fmt(d.ca)+"/sem" : d.vol+" u/sem"}</span>
                  </div>
                  <div style={{ height:8, background:"var(--t-surface)", borderRadius:8, overflow:"hidden" }}>
                    <div style={{ width:pct+"%", height:"100%", background:"linear-gradient(90deg,#7c3aed,#a78bfa)", borderRadius:8 }} />
                  </div>
                </div>
              );
            })}
          </StatSectionDark>

          {/* Tops ventes */}
          <StatSectionDark title={showPrices ? "🏆 Top ventes (par CA hebdo)" : "🏆 Top ventes (par volume hebdo)"}>
            {(showPrices ? topCA : topVolume).map((p,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i<9?"1px solid var(--t-border-subtle)":"none" }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{i+1}. {p.label}</div>
                  <div style={{ fontSize:11, color:"var(--t-text-40)" }}>{p.ref} · {p.subFamily}</div>
                </div>
                <div style={{ textAlign:"right", fontWeight:700, fontSize:13 }}>
                  {p.weekly} u/sem{showPrices && p.caHebdo>0 && <div style={{ fontSize:11, color:"#22c55e" }}>{fmt(p.caHebdo)}/sem</div>}
                </div>
              </div>
            ))}
          </StatSectionDark>

          {/* Produits dormants */}
          <StatSectionDark title={"🐌 Produits dormants (" + dormants.length + ") — aucune sortie"}>
            {dormants.length === 0
              ? <div style={{ fontSize:13, color:"var(--t-text-40)" }}>Aucun produit dormant 👍</div>
              : <>
                  <div style={{ fontSize:12, color:"var(--t-text-55)", marginBottom:10 }}>À animer (mise en avant, promo) ou à déréférencer si ça ne décolle pas.</div>
                  {dormants.slice(0,15).map((p,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom: i<Math.min(14,dormants.length-1)?"1px solid var(--t-border-subtle)":"none" }}>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}</div>
                        <div style={{ fontSize:11, color:"var(--t-text-40)" }}>{p.ref} · {p.supplier}</div>
                      </div>
                      {p.dispo != null && <div style={{ fontSize:12, color:"#f59e0b", fontWeight:700 }}>{p.dispo} en stock</div>}
                    </div>
                  ))}
                  {dormants.length > 15 && <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:8 }}>+ {dormants.length-15} autres…</div>}
                </>}
          </StatSectionDark>

          {/* Rotation */}
          <StatSectionDark title="🔄 Rotation du stock">
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#22c55e", marginBottom:8 }}>⚡ Tourne vite</div>
                {rotationFast.map((p,i)=>(
                  <div key={i} style={{ fontSize:12, padding:"5px 0", display:"flex", justifyContent:"space-between", gap:8 }}>
                    <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}</span>
                    <span style={{ color:"var(--t-text-40)", whiteSpace:"nowrap" }}>{p.weekly}/sem · {p.dispo} stk</span>
                  </div>
                ))}
              </div>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b", marginBottom:8 }}>🐢 Dort en stock</div>
                {rotationSlow.map((p,i)=>(
                  <div key={i} style={{ fontSize:12, padding:"5px 0", display:"flex", justifyContent:"space-between", gap:8 }}>
                    <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}</span>
                    <span style={{ color:"var(--t-text-40)", whiteSpace:"nowrap" }}>{p.weekly}/sem · {p.dispo} stk</span>
                  </div>
                ))}
              </div>
            </div>
          </StatSectionDark>
        </div>
      ) : (
        <div style={{ ...S.card, padding:20, marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:13, color:"var(--t-text-55)" }}>📊 Le pilotage du rayon (dormants, tops, rotation, sous-familles) s'affichera dès que tu auras importé ton état de stock <b>au moins deux fois</b> (pour calculer les sorties).</div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48, color:"var(--t-text-40)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div>Aucune commande sur cette période.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* KPIs période */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
            {[
              { Icon: List, label: "Commandes", value: filtered.length },
              { Icon: DollarSign, label: "Volume HT", value: fmt(supplierTotal), color: "#059669" },
              { Icon: Factory, label: "Fournisseurs actifs", value: bySupplier.length, color: "#1D4ED8" },
              { Icon: Folder, label: "Familles", value: byFamily.length, color: "#7C3AED" },
            ].map((k, i) => (
              <div key={i} style={{ ...S.card, padding: 16 }}>
                <div style={{ fontSize: 11, color:"var(--t-text-40)", marginBottom: 4 }}>{k.icon} {k.label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:k.color||"rgba(255,255,255,0.9)", letterSpacing:"-0.02em" }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Fournisseurs + pie */}
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <StatSection title="Part par fournisseur (volume HT)">
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <PieChart data={bySupplier.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] }))} size={120} />
                <div style={{ flex: 1 }}>
                  {bySupplier.map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{d.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color:"var(--t-text-40)" }}>{supplierTotal ? Math.round(d.value / supplierTotal * 100) : 0}%</span>
                        {session.canSeePrices && <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(d.value)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </StatSection>

            <StatSection title="Répartition par rayon (famille)">
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <PieChart data={byFamily.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] }))} size={120} />
                <div style={{ flex: 1 }}>
                  {byFamily.map((d, i) => {
                    const total = byFamily.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{d.label}</span>
                        </div>
                        <span style={{ fontSize: 11, color:"var(--t-text-40)" }}>{total ? Math.round(d.value / total * 100) : 0}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </StatSection>
          </div>

          {/* Sous-familles */}
          <StatSection title="Volume par sous-famille">
            <BarChart data={bySubFamily.map(d => ({ ...d, formatted: session.canSeePrices ? fmt(d.value) : `${d.value} u.` }))} showValues={true} />
          </StatSection>

          {/* Statuts */}
          <StatSection title="Répartition par statut">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(STATUS).map(([key, s]) => (
                <div key={key} style={{ flex: "1 1 120px", background: s.bg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize:28, fontWeight:700, color:s.color }}>{filtered.filter(o => o.status === key).length}</div>
                  <div style={{ fontSize: 11, color:"var(--t-text-40)", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </StatSection>

          {/* Évolution */}
          <StatSection title="Évolution du nombre de commandes (par semaine)">
            <BarChart data={evolution} showValues={true} />
          </StatSection>

        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ users, onLogin, dark, setDark }) {
  const [email, setEmail]       = useState(() => { try { return localStorage.getItem("cp_email")||""; } catch{return "";} });
  const [pw, setPw]             = useState("");
  const [err, setErr]           = useState("");
  const [focus, setFocus]       = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(() => { try { return !!localStorage.getItem("cp_email"); } catch{return false;} });

  function submit() {
    const u = users.find(u => u.email === email.trim() && u.password === pw && u.active);
    if (u) {
      try {
        if (remember) localStorage.setItem("cp_email", email.trim());
        else localStorage.removeItem("cp_email");
      } catch {}
      onLogin(u);
    } else {
      setErr("Email ou mot de passe incorrect.");
    }
  }

  const isDark = true; // login toujours dark

  return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", background:"linear-gradient(165deg,#060914 0%,#0d0a1f 40%,#0a0818 100%)", position:"relative", overflow:"hidden", fontFamily:"'Sora','-apple-system','SF Pro Display',sans-serif" }}>

      {/* Import Sora */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        @keyframes lb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(50px,-40px) scale(1.12)}}
        @keyframes lb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-40px,50px) scale(1.08)}}
        @keyframes lb3{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,30px) scale(1.05)}}
        @keyframes loginFadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .login-card { animation: loginFadeUp 0.6s cubic-bezier(0.4,0,0.2,1) both; }
        .login-input::placeholder { color: rgba(255,255,255,0.3) !important; }
        .login-btn:active { transform: scale(0.97) !important; }
      `}</style>

      {/* Halos ambiance */}
      <div style={{ position:"absolute", top:"-8%",  right:"-5%",  width:520, height:520, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.32) 0%,transparent 62%)", animation:"lb1 18s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-8%", left:"-8%", width:480, height:480, borderRadius:"50%", background:"radial-gradient(circle,rgba(56,189,248,0.18) 0%,transparent 62%)", animation:"lb2 22s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:"40%",  right:"25%",  width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(139,92,246,0.16) 0%,transparent 65%)", animation:"lb3 16s ease-in-out infinite", pointerEvents:"none" }} />

      {/* Logo + titre AU-DESSUS de la carte */}
      <div className="login-card" style={{ textAlign:"center", marginBottom:28, position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
          <CPLogo size={72} />
        </div>
        <div style={{ fontSize:32, fontWeight:800, letterSpacing:"-0.04em", color:"#ffffff", lineHeight:1, fontFamily:"'Sora',sans-serif" }}>
          CommaPro
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.42)", marginTop:10, fontWeight:500, letterSpacing:"0.22em", textTransform:"uppercase" }}>
          Cockpit des achats
        </div>
      </div>

      {/* Carte Liquid Glass */}
      <div className="login-card" style={{
        backdropFilter:"blur(48px) saturate(200%)",
        WebkitBackdropFilter:"blur(48px) saturate(200%)",
        background:"rgba(255,255,255,0.06)",
        borderRadius:34,
        padding:"36px 32px 32px",
        width:"100%", maxWidth:420,
        border:"1px solid rgba(255,255,255,0.14)",
        boxShadow:"0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, inset 0 1px 0 rgba(255,255,255,0.18)",
        position:"relative", zIndex:1,
      }}>

        {/* Bienvenue */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.03em", color:"#ffffff", fontFamily:"'Sora',sans-serif" }}>
            Bienvenue 👋
          </div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)", marginTop:6, fontWeight:400 }}>
            Connectez-vous à votre espace
          </div>
        </div>

        {/* Champ Email */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Email</label>
          <div style={{ position:"relative" }}>
            <input
              className="login-input"
              value={email}
              onChange={e => { setEmail(e.target.value); setErr(""); }}
              onFocus={()=>setFocus("email")} onBlur={()=>setFocus("")}
              type="email"
              placeholder="votre@email.com"
              onKeyDown={e => e.key==="Enter" && submit()}
              style={{
                width:"100%", padding:"14px 18px", borderRadius:16,
                border: `1.5px solid ${focus==="email" ? "rgba(167,139,250,0.8)" : "rgba(255,255,255,0.1)"}`,
                background:"rgba(255,255,255,0.07)",
                backdropFilter:"blur(8px)",
                color:"#ffffff", fontSize:15,
                outline:"none", boxSizing:"border-box",
                fontFamily:"'Sora',sans-serif", fontWeight:400,
                transition:"border-color 0.2s, box-shadow 0.2s",
                boxShadow: focus==="email" ? "0 0 0 3px rgba(124,58,237,0.2)" : "none",
              }}
            />
          </div>
        </div>

        {/* Champ Mot de passe */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Mot de passe</label>
          <div style={{ position:"relative" }}>
            <input
              className="login-input"
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(""); }}
              onFocus={()=>setFocus("pw")} onBlur={()=>setFocus("")}
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              onKeyDown={e => e.key==="Enter" && submit()}
              style={{
                width:"100%", padding:"14px 50px 14px 18px", borderRadius:16,
                border: `1.5px solid ${focus==="pw" ? "rgba(167,139,250,0.8)" : "rgba(255,255,255,0.1)"}`,
                background:"rgba(255,255,255,0.07)",
                backdropFilter:"blur(8px)",
                color:"#ffffff", fontSize:15,
                outline:"none", boxSizing:"border-box",
                fontFamily:"'Sora',sans-serif", fontWeight:400,
                transition:"border-color 0.2s, box-shadow 0.2s",
                boxShadow: focus==="pw" ? "0 0 0 3px rgba(124,58,237,0.2)" : "none",
              }}
            />
            {/* Toggle afficher mot de passe */}
            <button
              onClick={() => setShowPw(v => !v)}
              type="button"
              style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", padding:4, display:"flex", alignItems:"center", transition:"color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.8)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.4)"}>
              {showPw
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </div>

        {/* Se souvenir de moi */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24, cursor:"pointer" }} onClick={() => setRemember(v => !v)}>
          <div style={{
            width:20, height:20, borderRadius:6, flexShrink:0,
            border: `1.5px solid ${remember ? "#7c3aed" : "rgba(255,255,255,0.2)"}`,
            background: remember ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.05)",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all 0.18s",
          }}>
            {remember && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 4.5,9 10.5,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{ fontSize:13, color:"rgba(255,255,255,0.55)", fontWeight:400, userSelect:"none" }}>Se souvenir de moi</span>
        </div>

        {/* Erreur */}
        {err && (
          <div style={{ marginBottom:16, fontSize:12, color:"#fca5a5", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", padding:"10px 16px", borderRadius:14, textAlign:"center", fontWeight:500 }}>
            {err}
          </div>
        )}

        {/* Bouton connexion */}
        <button
          onClick={submit}
          className="login-btn"
          style={{
            width:"100%", padding:"16px",
            fontSize:15, fontWeight:700,
            borderRadius:18, border:"none", cursor:"pointer",
            color:"white",
            background:"linear-gradient(135deg,#7c3aed,#8b5cf6)",
            boxShadow:"0 8px 32px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
            letterSpacing:"-0.01em",
            fontFamily:"'Sora',sans-serif",
            transition:"all 0.18s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(124,58,237,0.55)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 8px 32px rgba(124,58,237,0.5)";}}
        >
          <span style={{ display:"inline-flex", alignItems:"center", gap:8, justifyContent:"center" }}>
            Se connecter
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </button>

      </div>

      {/* Footer sécurité */}
      <div className="login-card" style={{ marginTop:24, textAlign:"center", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:500 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Sécurisé et chiffré
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.32)", marginTop:4 }}>Vos données sont protégées</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS LIST
// ═══════════════════════════════════════════════════════════════════════════════
function OrderTable({ orders, session, onSelect, compact }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background:"var(--t-thead-bg)" }}>
            {["N° BC","Fournisseur","Date",!compact && "Livraison","Statut",session.canSeePrices && "Montant HT","Créé par",""].filter(Boolean).map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color:"var(--t-text-40)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1.5px solid var(--t-border-subtle)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => onSelect(o.id)} onMouseEnter={e => e.currentTarget.style.background="var(--t-row-hover)"} onMouseLeave={e => e.currentTarget.style.background=""}>
              <td style={S.td}><span style={{ fontFamily:"monospace", fontWeight:700, fontSize:12, background:"linear-gradient(135deg,#a5b4fc,#818cf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{o.id}</span></td>
              <td style={{ ...S.td, fontWeight: 500 }}>{o.supplierName}</td>
              <td style={S.td}>{fmtDate(o.date)}</td>
              {!compact && <td style={S.td}>{fmtDate(o.deliveryDate)}</td>}
              <td style={S.td}><StatusBadge status={o.status} /></td>
              {session.canSeePrices && <td style={{ ...S.td, fontWeight: 600 }}>{fmt(orderTotal(o))}</td>}
              <td style={{ ...S.td, fontSize: 12, color:"var(--t-text-40)" }}>{o.createdBy}</td>
              <td style={S.td}><span style={{ color: "#2563EB", fontSize: 12 }}>Voir →</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersPage({ orders, setOrders, suppliers, session, setPage, setEditingDraft, initialFilter, onFilterUsed }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState(initialFilter || "all");
  const isAdmin = session.role === "admin";
  const visible = orders;
  const filtered = (() => {
    if (filter === "all") return visible;
    if (filter === "commandee") return visible.filter(o => ["en_attente","confirmee","en_preparation"].includes(o.status));
    return visible.filter(o => o.status === filter);
  })();

  // Applique le filtre initial venant du dashboard, puis le réinitialise
  useEffect(() => {
    if (initialFilter && initialFilter !== "all") {
      setFilter(initialFilter);
      if (onFilterUsed) onFilterUsed();
    }
  }, [initialFilter]);

  if (selected) {
    const order = orders.find(o => o.id === selected);
    if (!order) { setSelected(null); return null; }
    return <OrderDetail order={order} orders={orders} setOrders={setOrders} session={session} onBack={() => setSelected(null)} setPage={setPage} setEditingDraft={setEditingDraft} suppliers={suppliers} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em" }}>Commandes</h1>
        <button onClick={() => setPage("new")} style={S.btnPrimary}>+ Nouvelle commande</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          ["all","Toutes"],
          ["brouillon","Brouillon"],
          ["commandee","Commandée"],
          ["en_livraison","En livraison"],
          ["reception_validee","Réception validée"],
        ].map(([k, lbl]) => {
          const count = k === "all" ? visible.length
            : k === "commandee" ? visible.filter(o=>["en_attente","confirmee","en_preparation"].includes(o.status)).length
            : visible.filter(o=>o.status===k).length;
          return (
            <button key={k} onClick={() => setFilter(k)} style={{ padding:"6px 14px", borderRadius:20, border:"1.5px solid", cursor:"pointer", fontSize:12, fontWeight:filter===k?700:400, background:filter===k?"rgba(99,102,241,0.7)":"var(--t-surface)", color:filter===k?"white":"var(--t-text-55)", borderColor:filter===k?"rgba(124,58,237,0.5)":"var(--t-border-subtle)", backdropFilter:"blur(8px)", boxShadow:filter===k?"0 0 16px rgba(124,58,237,0.35)":"none", display:"flex", alignItems:"center", gap:6 }}>
              {lbl}
              {count > 0 && <span style={{ fontSize:10, fontWeight:700, background:filter===k?"rgba(255,255,255,0.25)":"rgba(124,58,237,0.15)", color:filter===k?"white":"#7c3aed", padding:"1px 6px", borderRadius:10 }}>{count}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"var(--t-text-30)" }}><div style={{ fontSize: 28, marginBottom: 8 }}>📭</div><div>Aucune commande trouvée.</div></div>
        ) : (
          <OrderTable orders={[...filtered].reverse()} session={session} onSelect={setSelected} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER DETAIL
// ═══════════════════════════════════════════════════════════════════════════════
function OrderDetail({ order, orders, setOrders, session, onBack, setPage, setEditingDraft, suppliers }) {
  const isAdmin = session.role === "admin";
  const showPrices = session.canSeePrices;
  const [numAchat, setNumAchat] = useState(order.numAchat || "");
  const [numBL, setNumBL] = useState(order.numBL || "");

  function saveNums() {
    setOrders(prev => prev.map(o => o.id===order.id ? {...o, numAchat: numAchat.trim(), numBL: numBL.trim()} : o));
  }

  function validerReception() {
    const now = new Date().toISOString();
    setOrders(prev => prev.map(o => {
      if (o.id !== order.id) return o;
      const history = { ...(o.statusHistory||{}), reception_validee: o.statusHistory?.reception_validee || now };
            return { ...o, status: "reception_validee", statusHistory: history, updatedAt: now, updatedBy: session.name };
    }));
  }

  function setStatus(s) {
    const now = new Date().toISOString();
    setOrders(prev => prev.map(o => {
      if (o.id !== order.id) return o;
      const history = { ...(o.statusHistory || {}) };
      if (!history[s]) history[s] = now;  // mémorise la 1ère date d'entrée dans ce statut
            return { ...o, status: s, statusHistory: history, updatedAt: now, updatedBy: session.name };
    }));
  }
  function deleteOrder() {
    setOrders(prev => prev.filter(o => o.id !== order.id));
    onBack();
  }
  return (
    <div>
      <button onClick={onBack} style={{ ...S.btnGhost, marginBottom: 16 }}>← Retour</button>
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color:"var(--t-text-40)", marginBottom: 4 }}>Bon de commande</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{order.id}</div>
            <div style={{ fontSize: 12, color:"var(--t-text-40)", marginTop: 4 }}>Créé par {order.createdBy} le {fmtDate(order.date)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <StatusBadge status={order.status} />
            {isAdmin && <select value={order.status} onChange={e => setStatus(e.target.value)} style={{ ...S.input, width: "auto", fontSize: 12 }}>
              {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>}
            <button onClick={() => generatePDF(order, showPrices)} style={{...S.btnSecondary, display:"inline-flex", alignItems:"center", gap:6}}><FileText size={15} /> PDF</button>
            <button onClick={async () => {
              // Trouver le fournisseur pour récupérer tous ses emails
              const supp = (suppliers||[]).find(s => s.name === order.supplierName);
              const allEmails = [supp?.email, ...((supp?.emails)||[])].filter(Boolean);
              const to = allEmails.join(",");
              const subject = encodeURIComponent(`Bon de commande ${order.id} — ${order.supplierName}`);
              const bodyText = "Bonjour " + (order.commercial || order.supplierName) + ",\n\n"
                + "Veuillez trouver ci-joint notre bon de commande " + order.id + ".\n\n"
                + "Date de commande : " + fmtDate(order.date) + "\n"
                + "Livraison souhaitée : " + fmtDate(order.deliveryDate) + "\n"
                + "Lieu : " + order.deliveryPlace
                + (order.notes ? "\nNotes : " + order.notes : "")
                + "\n\nCordialement,\nRIDIS";
              const body = encodeURIComponent(bodyText);
              // Utilise navigator.share si disponible (iOS natif), sinon mailto
              const bodyMail = "Bonjour " + (order.commercial || order.supplierName) + ",\n\n"
                + "Veuillez trouver ci-joint notre bon de commande " + order.id + " au format PDF.\n\n"
                + "Date de commande : " + fmtDate(order.date) + "\n"
                + "Livraison souhaitée : " + fmtDate(order.deliveryDate) + "\n"
                + "Lieu de livraison : " + (order.deliveryPlace || "—") + "\n\n"
                + "Je reste disponible pour toute question.\n\n"
                + "Cordialement,\nQuentin";
              const bodyMailEnc = encodeURIComponent(bodyMail);
              try {
                const htmlPdf = buildOrderHTML(order, showPrices);
                const pdfBlob = await htmlToPdfBlob(htmlPdf);
                const file = new File([pdfBlob], `BC-${order.id}.pdf`, { type: "application/pdf" });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({ files: [file], title: `Bon de commande ${order.id} — ${order.supplierName}`, text: bodyMail });
                } else {
                  const url = URL.createObjectURL(pdfBlob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `BC-${order.id}.pdf`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 5000);
                  window.location.href = `mailto:${to}?subject=${subject}&body=${bodyMailEnc}`;
                }
              } catch(e) {
                if (e && e.name === "AbortError") { /* annulé */ }
                else { window.location.href = `mailto:${to}?subject=${subject}&body=${bodyMailEnc}`; }
              }
            }} style={{...S.btnPrimary, display:"inline-flex", alignItems:"center", gap:6, background:"rgba(99,102,241,0.7)"}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Envoyer
            </button>
            {isAdmin && <ConfirmDeleteButton onConfirm={deleteOrder} />}
          </div>
        </div>

        {/* Suivi de la commande (façon Colissimo) — masqué pour les brouillons */}
        {order.status !== "brouillon" && <div style={{ marginBottom:24, padding:"18px 16px", background:"var(--t-surface)", borderRadius:16, border:"1px solid var(--t-border-subtle)", overflowX:"auto" }}>
          <div style={{ display:"flex", alignItems:"flex-start", minWidth:520 }}>
            {STATUS_ORDER.map((k, i) => {
              const currentIdx = STATUS_ORDER.indexOf(order.status);
              const done = i <= currentIdx;
              const isCurrent = i === currentIdx;
              const stamp = (order.statusHistory || {})[k];
              const col = STATUS[k].color;
              return (
                <div key={k} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
                  {i < STATUS_ORDER.length - 1 && (
                    <div style={{ position:"absolute", top:13, left:"50%", width:"100%", height:2, background: i < currentIdx ? col : "var(--t-border-subtle)" }} />
                  )}
                  <div style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1,
                    background: done ? col : "var(--t-surface)", border: done ? "none" : "2px solid var(--t-border-subtle)",
                    boxShadow: isCurrent ? `0 0 0 4px ${col}33` : "none" }}>
                    {done && <CheckCircle size={15} style={{ color:"#fff" }} />}
                  </div>
                  <div style={{ fontSize:10, fontWeight: isCurrent?700:500, color: done ? "var(--t-text-90)" : "var(--t-text-40)", marginTop:7, textAlign:"center", lineHeight:1.2, padding:"0 2px" }}>{STATUS[k].label}</div>
                  {stamp && <div style={{ fontSize:9, color:"var(--t-text-40)", marginTop:2 }}>{new Date(stamp).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</div>}
                </div>
              );
            })}
          </div>
        </div>}

        {/* N° Achat + N° BL + Bouton Valider réception */}
        {order.status !== "brouillon" && order.status !== "reception_validee" && (
          <div style={{ marginBottom:20, padding:"16px 18px", background:"var(--t-surface)", borderRadius:14, border:"1px solid var(--t-border-subtle)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>Réception</div>
            <div className="grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={S.label}>N° Achat interne</label>
                <input value={numAchat} onChange={e=>{setNumAchat(e.target.value);}} onBlur={saveNums} style={S.input} placeholder="Ex: ACH-2026-0042" />
              </div>
              <div>
                <label style={S.label}>N° BL fournisseur</label>
                <input value={numBL} onChange={e=>{setNumBL(e.target.value);}} onBlur={saveNums} style={S.input} placeholder="Ex: BL-789456" />
              </div>
            </div>
            {isAdmin && (
              <button onClick={validerReception} style={{ width:"100%", padding:"12px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#059669,#34d399)", color:"white", fontWeight:700, fontSize:14, letterSpacing:"-0.01em", boxShadow:"0 4px 16px rgba(5,150,105,0.4)", transition:"all 0.18s" }}>
                ✅ Valider la réception
              </button>
            )}
          </div>
        )}

        {/* Récap N° si déjà réceptionné */}
        {order.status === "reception_validee" && (order.numAchat || order.numBL) && (
          <div style={{ marginBottom:20, padding:"14px 18px", background:"rgba(5,150,105,0.08)", borderRadius:14, border:"1px solid rgba(5,150,105,0.25)", display:"flex", gap:20, flexWrap:"wrap" }}>
            {order.numAchat && <div><div style={{ fontSize:10, color:"#34d399", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>N° Achat</div><div style={{ fontFamily:"monospace", fontWeight:700, color:"var(--t-text-90)", marginTop:2 }}>{order.numAchat}</div></div>}
            {order.numBL && <div><div style={{ fontSize:10, color:"#34d399", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>N° BL fournisseur</div><div style={{ fontFamily:"monospace", fontWeight:700, color:"var(--t-text-90)", marginTop:2 }}>{order.numBL}</div></div>}
          </div>
        )}

        {/* Bannière brouillon */}
        {order.status === "brouillon" && (
          <div style={{ marginBottom:20, padding:"14px 18px", background:"rgba(107,114,128,0.12)", border:"1px solid rgba(107,114,128,0.3)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"var(--t-text-85)" }}>📝 Brouillon — commande non envoyée</div>
              <div style={{ fontSize:12, color:"var(--t-text-40)", marginTop:2 }}>Cette commande n'a pas encore été transmise au fournisseur.</div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {isAdmin && (
                <button onClick={() => { setEditingDraft(order); setPage("new"); }} style={{ ...S.btnSecondary, display:"inline-flex", alignItems:"center", gap:6 }}>✏️ Modifier ce brouillon</button>
              )}
              {isAdmin && <ConfirmDeleteButton onConfirm={deleteOrder} label="🗑 Supprimer ce brouillon" />}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
          {[["Fournisseur",order.supplierName],["Commercial",order.commercial],["Email",order.email],["Livraison souhaitée",fmtDate(order.deliveryDate)],["Lieu",order.deliveryPlace]].map(([l,v]) => (
            <div key={l} style={{ background:"var(--t-surface)", borderRadius:14, padding:14, border:"1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize:10, color:"var(--t-text-55)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{l}</div>
              <div style={{ fontWeight:500, fontSize:13, color:"var(--t-text-85)" }}>{v || "—"}</div>
            </div>
          ))}
        </div>
        {order.notes && <div style={{ background:"rgba(245,158,11,0.08)", borderRadius:14, padding:12, marginBottom:20, fontSize:13, color:"#fcd34d", border:"1px solid rgba(245,158,11,0.2)", backdropFilter:"blur(8px)" }}><strong>Notes :</strong> {order.notes}</div>}
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Lignes de commande</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background:"var(--t-thead-bg)", backdropFilter:"blur(8px)" }}>
              {["Réf.","Désignation","Famille","Sous-famille","Qté", showPrices && "P.U. HT", showPrices && "Total HT"].filter(Boolean).map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: h.includes("HT") ? "right" : "left", fontSize: 11, fontWeight: 600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(order.lines||[]).map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12, color:"var(--t-text-40)" }}>{l.ref}</td>
                  <td style={{ ...S.td, fontWeight: 500 }}>{l.label}</td>
                  <td style={{ ...S.td, fontSize: 12 }}>{l.family || "—"}</td>
                  <td style={S.td}><span style={{ fontFamily:"monospace", fontSize:11, background:"var(--t-tag-bg)", padding:"2px 8px", borderRadius:8, color:"var(--t-tag-color)", border:"1px solid var(--t-tag-border)" }}>{l.subFamily || "—"}</span></td>
                  <td style={{ ...S.td, textAlign: "center" }}>{l.qty}</td>
                  {showPrices && <><td style={{ ...S.td, textAlign: "right" }}>{fmt(l.price)}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(lineTotal(l))}</td></>}
                </tr>
              ))}
            </tbody>
            {showPrices && <tfoot><tr>
              <td colSpan={5} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, borderTop: "2px solid #0F172A" }}>TOTAL HT</td>
              <td style={{ padding: "10px 12px", fontWeight: 800, fontSize: 16, borderTop: "2px solid #0F172A", textAlign: "right" }}>{fmt(orderTotal(order))}</td>
            </tr></tfoot>}
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW ORDER
// ═══════════════════════════════════════════════════════════════════════════════
function NewOrderPage({ orders, setOrders, suppliers, setSuppliers, locations, session, setPage, editingDraft, setEditingDraft }) {
  const [suppId, setSuppId]               = useState(editingDraft ? (suppliers.find(s=>s.name===editingDraft.supplierName)?.id || "") : "");
  const [deliveryDate, setDeliveryDate]   = useState(editingDraft?.deliveryDate || "");
  const [deliveryPlace, setDeliveryPlace] = useState(editingDraft?.deliveryPlace || "");
  const [notes, setNotes]                 = useState(editingDraft?.notes || "");
  const [lines, setLines]                 = useState(editingDraft?.lines || []);
  const [saved, setSaved]                 = useState(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  // Ajout produit rapide
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProd, setNewProd] = useState({ ref:"", ean:"", label:"", family:"", subFamily:"", price:"" });
  const [expandedRef, setExpandedRef] = useState(null);
  const [inputQty, setInputQty] = useState("");
  const supp = suppliers.find(s => s.id === suppId);

  // Familles & sous-familles existantes (toutes les fiches), pour les listes déroulantes
  const familyMap = useMemo(() => {
    const m = {};
    suppliers.forEach(s => (s.products||[]).forEach(p => {
      const f = (p.family||"").trim(); if (!f) return;
      if (!m[f]) m[f] = new Set();
      const sf = (p.subFamily||"").trim(); if (sf) m[f].add(sf);
    }));
    const out = {}; Object.keys(m).sort().forEach(f => out[f] = Array.from(m[f]).sort());
    return out;
  }, [suppliers]);
  const familyList = Object.keys(familyMap);

  // Quitter le mode édition si on change de page sans sauvegarder
  useEffect(() => {
    return () => { if (editingDraft) setEditingDraft(null); };
  }, []);

  function addProduct(p) {
    setLines(prev => {
      const ex = prev.find(l => l.ref === p.ref);
      if (ex) return prev.map(l => l.ref===p.ref ? {...l, qty: l.qty+1} : l);
      return [...prev, { ref: p.ref, label: p.label, qty: 1, price: p.price, family: p.family || "", subFamily: p.subFamily || "" }];
    });
  }
  function updateQty(ref, qty) { setLines(prev => prev.map(l => l.ref===ref ? {...l, qty: Math.max(1,parseInt(qty)||1)} : l)); }
  function removeLine(ref) { setLines(prev => prev.filter(l => l.ref!==ref)); }

  // Ajouter un nouveau produit au catalogue ET à la commande
  function saveNewProduct() {
    if (!newProd.ref || !newProd.label) return;
    const ref = newProd.ref.trim();
    // Vérifier si la référence existe déjà dans ce catalogue
    const existing = supp?.products.find(p => p.ref.toLowerCase() === ref.toLowerCase());
    if (existing) {
      // Référence déjà présente → on l'ajoute juste à la commande
      addProduct(existing);
      setNewProd({ ref:"", ean:"", label:"", family:"", subFamily:"", price:"" });
      setShowAddProduct(false);
      return;
    }
    const p = { ref, ean: newProd.ean.trim(), label: newProd.label.trim(), family: newProd.family.trim(), subFamily: newProd.subFamily.trim(), price: parseFloat(newProd.price)||0, weeklyVolume:0 };
    setSuppliers(prev => prev.map(s => s.id===suppId ? { ...s, products: [...s.products, p] } : s));
    addProduct(p);
    setNewProd({ ref:"", ean:"", label:"", family:"", subFamily:"", price:"" });
    setShowAddProduct(false);
  }

  // Enregistrer en brouillon (création ou mise à jour si édition)
  function saveDraft() {
    if (!supp) return;
    if (editingDraft) {
      setOrders(prev => prev.map(o => o.id !== editingDraft.id ? o : {
        ...o, supplierName: supp.name, commercial: supp.commercial, email: supp.email,
        deliveryDate: deliveryDate||"", deliveryPlace: deliveryPlace||"", notes, lines,
      }));
      setEditingDraft(null);
    } else {
      const draft = { id: genOrderId(orders), userId: session.id, supplierName: supp.name, commercial: supp.commercial, email: supp.email, date: new Date().toISOString().split("T")[0], deliveryDate: deliveryDate||"", deliveryPlace: deliveryPlace||"", notes, lines, status: "brouillon", statusHistory: { brouillon: new Date().toISOString() }, createdBy: session.name };
      setOrders(prev => [...prev, draft]);
    }
    setPage("orders");
  }

  // Valider et envoyer la commande (transforme un brouillon en commande envoyée, ou en crée une nouvelle)
  function submit() {
    if (!supp || lines.length===0 || !deliveryDate || !deliveryPlace) return;
    if (editingDraft) {
      setOrders(prev => prev.map(o => o.id !== editingDraft.id ? o : {
        ...o, supplierName: supp.name, commercial: supp.commercial, email: supp.email,
        deliveryDate, deliveryPlace, notes, lines, status: "en_attente",
        statusHistory: { ...(o.statusHistory||{}), en_attente: new Date().toISOString() },
      }));
      setEditingDraft(null);
      setPage("orders");
      return;
    }
    const newOrder = { id: genOrderId(orders), userId: session.id, supplierName: supp.name, commercial: supp.commercial, email: supp.email, date: new Date().toISOString().split("T")[0], deliveryDate, deliveryPlace, notes, lines, status: "en_attente", statusHistory: { en_attente: new Date().toISOString() }, createdBy: session.name };
    setOrders(prev => [...prev, newOrder]);
    // Générer le PDF immédiatement (avant d'afficher l'écran de succès, la commande est déjà sauvegardée)
    generatePDF(newOrder, session.canSeePrices);
    setSaved(newOrder);
  }

  if (saved) return (
    <div style={{ ...S.card, maxWidth:500, margin:"0 auto", textAlign:"center", padding:44 }}>
      <div style={{ marginBottom:12, display:"flex", justifyContent:"center" }}><CheckCircle size={48} color="#34d399" /></div>
      <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-0.02em", marginBottom:8, color:"var(--t-text-90)" }}>Commande enregistrée</div>
      <div style={{ fontSize:24, fontWeight:700, color:"var(--t-btn-ghost)", marginBottom:20 }}>{saved.id}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => generatePDF(saved, session.canSeePrices)} style={{...S.btnPrimary, display:"inline-flex", alignItems:"center", gap:6}}><FileText size={15} /> PDF</button>
        <button onClick={() => setPage("orders")} style={S.btnSecondary}>Voir l'historique</button>
        <button onClick={() => { setSaved(null); setSuppId(""); setLines([]); setDeliveryDate(""); setDeliveryPlace(""); setNotes(""); }} style={S.btnSecondary}>Nouvelle commande</button>
      </div>
    </div>
  );

  const total = lines.reduce((s,l) => s+lineTotal(l), 0);
  const canSubmit = supp && lines.length>0 && deliveryDate && deliveryPlace;

  function handleAddOrExpand(p) {
    if (expandedRef === p.ref) { setExpandedRef(null); return; }
    setExpandedRef(p.ref);
    const ex = lines.find(l => l.ref === p.ref);
    setInputQty(ex ? String(ex.qty) : "");
  }
  function confirmQty(p) {
    const qty = parseInt(inputQty) || 0;
    if (qty <= 0) { setLines(prev => prev.filter(l => l.ref !== p.ref)); }
    else {
      setLines(prev => {
        const ex = prev.find(l => l.ref === p.ref);
        if (ex) return prev.map(l => l.ref===p.ref ? {...l, qty} : l);
        return [...prev, { ref:p.ref, label:p.label, qty, price:p.price||0, family:p.family||"", subFamily:p.subFamily||"" }];
      });
    }
    setExpandedRef(null);
    setInputQty("");
  }

  return (
    <div>
      <h1 style={{ margin:"0 0 20px 0", fontSize:24, fontWeight:800, letterSpacing:"-0.03em", color:"var(--t-text-90)" }}>{editingDraft ? "✏️ Modifier le brouillon" : "Nouvelle commande"}</h1>

      {/* ① Fournisseur */}
      <div style={{ ...S.card, marginBottom:16 }}>
        <h2 style={{ margin:"0 0 14px 0", fontSize:12, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.08em" }}>① Fournisseur</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
          {suppliers.map(s => (
            <div key={s.id} onClick={() => { setSuppId(s.id); setLines([]); setCatalogSearch(''); setExpandedRef(null); }} style={{ padding:14, borderRadius:14, border:`2px solid ${suppId===s.id?'rgba(99,102,241,0.8)':'rgba(255,255,255,0.08)'}`, cursor:'pointer', background:suppId===s.id?'rgba(124,58,237,0.2)':'rgba(255,255,255,0.04)', backdropFilter:'blur(8px)', boxShadow:suppId===s.id?'0 0 20px rgba(124,58,237,0.35)':'none', transition:"all 0.15s" }}>
              <div style={{ fontWeight:700, fontSize:13, color:"var(--t-text-90)" }}>{s.name}</div>
              <div style={{ fontSize:11, color:"var(--t-text-55)", marginTop:3 }}>{s.commercial}</div>
            </div>
          ))}
        </div>
      </div>

      {supp && (
        <>
          {/* ② Catalogue + Panier côte à côte sur desktop, empilés sur mobile */}
          <div className="order-layout" style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16, alignItems:"start", marginBottom:16 }}>

            {/* Colonne gauche : catalogue défilant */}
            <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
              {/* Header catalogue */}
              <div style={{ padding:"14px 16px 10px", borderBottom:"1px solid var(--t-border-subtle)", position:"sticky", top:0, background:"var(--t-card-bg)", zIndex:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <h2 style={{ margin:0, fontSize:13, fontWeight:700, color:"var(--t-text-90)" }}>② Catalogue — <span style={{ color:"#a78bfa" }}>{supp.name}</span></h2>
                  <button onClick={() => setShowAddProduct(v=>!v)} style={{ ...S.btnGhost, fontSize:11, padding:"4px 8px", color:"#7c3aed" }}>+ Nouveau produit</button>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--t-surface)", borderRadius:20, padding:"7px 12px" }}>
                  <Search size={14} style={{ color:"var(--t-text-40)", flexShrink:0 }} />
                  <input value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)} placeholder="Rechercher…" style={{ background:"transparent", border:"none", outline:"none", fontSize:13, color:"var(--t-input-color)", width:"100%" }} />
                  {catalogSearch && <button onClick={()=>setCatalogSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-40)", padding:0 }}><X size={14} /></button>}
                </div>
              </div>

              {/* Formulaire nouveau produit */}
              {showAddProduct && (
                <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--t-border-subtle)", background:"rgba(124,58,237,0.05)" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-55)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>Nouveau produit</div>
                  <div className="grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <div>
                      <label style={S.label}>Référence *</label>
                      <input value={newProd.ref} onChange={e=>setNewProd(p=>({...p,ref:e.target.value}))} style={S.input} placeholder="Ex: TAB906" />
                      {newProd.ref && supp?.products.find(p=>p.ref.toLowerCase()===newProd.ref.trim().toLowerCase()) && (
                        <div style={{ fontSize:10, color:"#f59e0b", marginTop:3 }}>⚠️ Référence existante — sera ajoutée directement</div>
                      )}
                    </div>
                    <div><label style={S.label}>Code EAN</label><input value={newProd.ean} onChange={e=>setNewProd(p=>({...p,ean:e.target.value}))} style={S.input} placeholder="Code-barres" /></div>
                  </div>
                  <div style={{ marginBottom:8 }}><label style={S.label}>Désignation *</label><input value={newProd.label} onChange={e=>setNewProd(p=>({...p,label:e.target.value}))} style={S.input} placeholder="Nom du produit" /></div>
                  <div className="grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <div>
                      <label style={S.label}>Famille</label>
                      <select
                        value={familyList.includes(newProd.family) ? newProd.family : (newProd.family==="" ? "" : "__autre__")}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === "__autre__") setNewProd(p=>({...p, family:" ", subFamily:""}));   // espace = mode saisie libre
                          else setNewProd(p=>({...p, family:v, subFamily:""}));
                        }}
                        style={{ ...S.input, cursor:"pointer" }}>
                        <option value="">— Choisir —</option>
                        {familyList.map(f => <option key={f} value={f}>{f}</option>)}
                        <option value="__autre__">+ Autre (saisir)</option>
                      </select>
                      {(newProd.family!=="" && !familyList.includes(newProd.family)) && (
                        <input value={newProd.family.trim()===""?"":newProd.family} onChange={e=>setNewProd(p=>({...p,family:e.target.value}))} style={{ ...S.input, marginTop:6 }} placeholder="Nouvelle famille" autoFocus />
                      )}
                    </div>
                    <div>
                      <label style={S.label}>Sous-famille</label>
                      {(() => {
                        const subs = familyMap[newProd.family] || [];
                        const knownFam = familyList.includes(newProd.family);
                        if (knownFam && subs.length > 0) {
                          return (<>
                            <select
                              value={subs.includes(newProd.subFamily) ? newProd.subFamily : (newProd.subFamily==="" ? "" : "__autre__")}
                              onChange={e => { const v=e.target.value; setNewProd(p=>({...p, subFamily: v==="__autre__" ? " " : v })); }}
                              style={{ ...S.input, cursor:"pointer" }}>
                              <option value="">— Choisir —</option>
                              {subs.map(sf => <option key={sf} value={sf}>{sf}</option>)}
                              <option value="__autre__">+ Autre (saisir)</option>
                            </select>
                            {(newProd.subFamily!=="" && !subs.includes(newProd.subFamily)) && (
                              <input value={newProd.subFamily.trim()===""?"":newProd.subFamily} onChange={e=>setNewProd(p=>({...p,subFamily:e.target.value}))} style={{ ...S.input, marginTop:6 }} placeholder="Nouvelle sous-famille" autoFocus />
                            )}
                          </>);
                        }
                        // famille libre/nouvelle → saisie libre directe
                        return <input value={newProd.subFamily.trim()===""?"":newProd.subFamily} onChange={e=>setNewProd(p=>({...p,subFamily:e.target.value}))} style={S.input} placeholder="Ex: E31MO" />;
                      })()}
                    </div>
                  </div>
                  <div style={{ marginBottom:10 }}><label style={S.label}>Prix HT</label><input type="number" value={newProd.price} onChange={e=>setNewProd(p=>({...p,price:e.target.value}))} style={S.input} placeholder="0.00" /></div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={saveNewProduct} disabled={!newProd.ref||(!newProd.label&&!supp?.products.find(p=>p.ref.toLowerCase()===newProd.ref.trim().toLowerCase()))} style={{ ...S.btnPrimary, flex:1, fontSize:12, opacity:(newProd.ref&&(newProd.label||supp?.products.find(p=>p.ref.toLowerCase()===newProd.ref.trim().toLowerCase())))?1:0.45 }}>
                      {supp?.products.find(p=>p.ref.toLowerCase()===newProd.ref.trim().toLowerCase()) ? "✓ Ajouter à la commande" : "✓ Ajouter au catalogue"}
                    </button>
                    <button onClick={()=>{setShowAddProduct(false);setNewProd({ref:"",ean:"",label:"",family:"",subFamily:"",price:""}); }} style={S.btnGhost}>Annuler</button>
                  </div>
                </div>
              )}

              {/* Liste produits défilante */}
              <div style={{ maxHeight:"60vh", overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
                {(() => {
                  const q = catalogSearch.toLowerCase().trim();
                  const groups = {};
                  supp.products.filter(p => !q || p.ref.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || (p.subFamily||"").toLowerCase().includes(q)).forEach(p => {
                    const g = p.subFamily || p.family || "Autres";
                    if (!groups[g]) groups[g] = [];
                    groups[g].push(p);
                  });
                  const entries = Object.entries(groups);
                  if (!entries.length) return <div style={{ padding:"24px 16px", textAlign:"center", color:"var(--t-text-40)", fontSize:13 }}>Aucun produit trouvé</div>;
                  return entries.map(([grp, prods]) => (
                    <div key={grp}>
                      <div style={{ padding:"8px 16px 4px", fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", background:"var(--t-surface)", borderBottom:"1px solid var(--t-border-subtle)" }}>{grp} — {prods.length} produit(s)</div>
                      {prods.map(p => {
                        const inCart = lines.find(l=>l.ref===p.ref);
                        const isExpanded = expandedRef === p.ref;
                        const isRupture = !!p.rupture;
                        return (
                          <div key={p.ref} style={{ borderBottom:"1px solid var(--t-border-subtle)", opacity:isRupture?0.45:1 }}>
                            {/* Ligne produit */}
                            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background: inCart?"rgba(124,58,237,0.06)":"transparent", transition:"background 0.15s" }}>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:inCart?700:500, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}</div>
                                <div style={{ display:"flex", gap:6, marginTop:3, flexWrap:"wrap", alignItems:"center" }}>
                                  <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-text-40)", background:"var(--t-surface)", padding:"1px 5px", borderRadius:5 }}>{p.ref}</span>
                                  {session.canSeePrices && p.price>0 && <span style={{ fontSize:11, color:"#34d399", fontWeight:600 }}>{fmt(p.price)}</span>}
                                  {p.dispo!=null && <span style={{ fontSize:10, fontWeight:600, color:p.dispo===0?"#ef4444":p.dispo<=(p.stockMin||0)?"#f59e0b":"#34d399", background:"rgba(0,0,0,0.15)", padding:"1px 5px", borderRadius:4 }}>Dispo:{p.dispo}</span>}
                                  {isRupture && <span style={{ fontSize:10, fontWeight:700, color:"#ef4444", background:"rgba(239,68,68,0.15)", padding:"1px 6px", borderRadius:4 }}>🔴 Rupture</span>}
                                </div>
                              </div>
                              {inCart && !isExpanded && <span style={{ fontSize:12, fontWeight:700, color:"#7c3aed", background:"rgba(124,58,237,0.15)", padding:"2px 8px", borderRadius:10, flexShrink:0 }}>×{inCart.qty}</span>}
                              <button onClick={() => !isRupture && handleAddOrExpand(p)} disabled={isRupture} style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:"none", cursor:isRupture?"not-allowed":"pointer", fontSize:12, fontWeight:600, background:isRupture?"rgba(120,120,120,0.2)":inCart?"rgba(124,58,237,0.2)":"rgba(99,102,241,0.7)", color:isRupture?"var(--t-text-30)":"white", transition:"all 0.15s" }}>
                                {isRupture ? "Indisponible" : isExpanded ? "✕" : inCart ? "Modifier" : "+ Ajouter"}
                              </button>
                            </div>
                            {/* Zone de saisie inline */}
                            {isExpanded && (
                              <div style={{ padding:"10px 16px 14px", background:"rgba(124,58,237,0.06)", borderTop:"1px solid rgba(124,58,237,0.15)", display:"flex", alignItems:"center", gap:10 }}>
                                {/* Stepper compact iOS */}
                                <button onClick={() => setInputQty(q => String(Math.max(0, (parseInt(q)||0)-1)))} style={{ width:38, height:38, borderRadius:12, border:"1.5px solid rgba(124,58,237,0.3)", background:"var(--t-surface)", cursor:"pointer", fontSize:22, fontWeight:300, color:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>−</button>
                                <input type="number" inputMode="numeric" pattern="[0-9]*" value={inputQty} onChange={e=>setInputQty(e.target.value)} style={{ flex:1, textAlign:"center", fontSize:26, fontWeight:800, color:"#7c3aed", letterSpacing:"-0.02em", border:"none", borderBottom:"2px solid rgba(124,58,237,0.4)", background:"transparent", outline:"none", width:0, minWidth:0, padding:"2px 4px" }} />
                                <button onClick={() => setInputQty(q => String((parseInt(q)||0)+1))} style={{ width:38, height:38, borderRadius:12, border:"1.5px solid rgba(124,58,237,0.3)", background:"rgba(124,58,237,0.1)", cursor:"pointer", fontSize:22, fontWeight:300, color:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>+</button>
                                <button onClick={() => confirmQty(p)} style={{ ...S.btnPrimary, padding:"9px 16px", fontSize:13, flexShrink:0 }}>
                                  {(parseInt(inputQty)||0) === 0 ? "Retirer" : "OK"}
                                </button>
                                <button onClick={() => { setExpandedRef(null); setInputQty(""); }} style={{ ...S.btnGhost, padding:"9px 10px", fontSize:13, flexShrink:0 }}>✕</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Colonne droite : panier STICKY */}
            <div className="order-recap" style={{ position:"sticky", top:80 }}>
              <div style={{ ...S.card }}>
                <h2 style={{ margin:"0 0 14px 0", fontSize:12, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.08em" }}>③ Panier</h2>
                {lines.length === 0 ? (
                  <div style={{ textAlign:"center", color:"var(--t-text-30)", fontSize:13, padding:"20px 0" }}>Aucun produit ajouté</div>
                ) : (
                  <>
                    {lines.map(l => (
                      <div key={l.ref} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid var(--t-border-subtle)", gap:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"var(--t-text-85)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.label}</div>
                          <div style={{ fontSize:11, fontFamily:"monospace", color:"var(--t-text-40)" }}>{l.ref}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                          <button onClick={()=>{setExpandedRef(l.ref);setInputQty(String(l.qty));}} style={{ fontSize:13, fontWeight:700, color:"#7c3aed", background:"rgba(124,58,237,0.12)", border:"none", borderRadius:8, padding:"2px 8px", cursor:"pointer" }}>×{l.qty}</button>
                          <button onClick={()=>removeLine(l.ref)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", fontSize:16, padding:0, lineHeight:1 }}>×</button>
                        </div>
                      </div>
                    ))}
                    {session.canSeePrices && (
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:12, paddingTop:10, borderTop:"2px solid var(--t-border-subtle)", fontWeight:800, fontSize:15 }}>
                        <span style={{ color:"var(--t-text-55)" }}>Total HT</span>
                        <span style={{ color:"#34d399" }}>{fmt(total)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ④ Livraison + Notes + Actions — sous le panier */}
          <div style={{ ...S.card, marginBottom:16 }}>
            <h2 style={{ margin:"0 0 16px 0", fontSize:12, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.08em" }}>④ Livraison & Notes</h2>
            <div className="grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <Field label="Date souhaitée *">
                <input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} style={{ ...S.input, textAlign:"center", WebkitAppearance:"none" }} />
              </Field>
              <Field label="Lieu de livraison *">
                <select value={deliveryPlace} onChange={e=>setDeliveryPlace(e.target.value)} style={{ ...S.input, background:"var(--t-surface)" }}>
                  <option value="">— Choisir un lieu —</option>
                  {locations.map(l => <option key={l.id} value={l.label}>{l.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Instructions particulières..." style={{ ...S.input, resize:"vertical", fontFamily:"inherit", minHeight:60 }} />
            </Field>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={submit} disabled={!canSubmit} style={{ ...S.btnPrimary, padding:14, fontSize:15, fontWeight:700, opacity:canSubmit?1:0.45 }}>
              Générer le bon de commande
            </button>
            {supp && lines.length>0 && (
              <button onClick={saveDraft} style={{ ...S.btnSecondary, padding:12 }}>{editingDraft ? "💾 Mettre à jour le brouillon" : "💾 Enregistrer en brouillon"}</button>
            )}
            {!canSubmit && <div style={{ fontSize:11, color:"var(--t-text-30)", textAlign:"center" }}>Fournisseur, produit(s), date et lieu requis</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF — Fiche produit porte-étiquette Conforama (généré en HTML pur, sans SVG)
// Format A4 paysage, 3 fiches par page
// ═══════════════════════════════════════════════════════════════════════════════
async function generateProductSheetPDF(products, templateType = "conforama", perPage = 3) {
  const isTopConfo = templateType === "topconfo";

  function makeSheet(p) {
    const qrUrl = p.ficheUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(p.ficheUrl)}&color=000000&bgcolor=ffffff&margin=2`
      : null;

    if (isTopConfo) {
      // Format Top Confo : logo TOP CONFO! en haut, caractéristiques en bas
      return `
      <div class="sheet topconfo">
        <div class="tc-header">
          <div class="tc-logo-box">
            <div class="tc-top">TOP!</div>
            <div class="tc-confo">CONFO</div>
          </div>
          <div class="tc-tagline"><span class="tc-mq">MEILLEUR RAPPORT,</span><span class="tc-qp">QUALITÉ<br>PRIX</span></div>
        </div>
        <div class="tc-body">
          <div class="tc-img-zone"></div>
          <div class="tc-info">
            <div class="tc-caract-title">CARACTÉRISTIQUES</div>
            <div class="tc-caract-box">${p.caracteristiques||""}</div>
            <div class="tc-dims-row">
              <div class="tc-dims-col">
                <div class="tc-dims-title">DIMENSIONS</div>
                <div class="tc-dim-line">Hauteur : <b>${p.hauteur||""}</b></div>
                <div class="tc-dim-line">Largeur : <b>${p.largeur||""}</b></div>
                <div class="tc-dim-line">Profondeur : <b>${p.profondeur||""}</b></div>
                <div class="tc-dims-title" style="margin-top:6px">COLORIS</div>
                <div class="tc-dim-line"><b>${p.coloris||""}</b></div>
              </div>
              <div class="tc-qr-col">
                ${qrUrl ? `<img src="${qrUrl}" class="tc-qr" alt="QR"/>` : '<div class="tc-qr-empty"></div>'}
              </div>
            </div>
          </div>
        </div>
        <div class="tc-footer">Conforama</div>
      </div>`;
    }

    // Format Conforama standard
    return `
    <div class="sheet conforama">
      <div class="cf-left">
        <div class="cf-brand">Conforama</div>
        <div class="cf-content">
          <div class="cf-specs">
            <div class="cf-caract-title">CARACTÉRISTIQUES</div>
            <div class="cf-caract">${p.caracteristiques||""}</div>
            <div class="cf-dim-block">
              <div class="cf-dims-title">DIMENSIONS</div>
              <div class="cf-dim">Hauteur : <b>${p.hauteur||""}</b></div>
              <div class="cf-dim">Largeur : <b>${p.largeur||""}</b></div>
              <div class="cf-dim">Profondeur : <b>${p.profondeur||""}</b></div>
            </div>
            <div class="cf-coloris-block">
              <div class="cf-dims-title">COLORIS</div>
              <div class="cf-dim"><b>${p.coloris||""}</b></div>
            </div>
          </div>
          <div class="cf-qr-block">
            ${qrUrl ? `<img src="${qrUrl}" class="cf-qr" alt="QR"/><div class="cf-qr-label">Fiche technique</div>` : ""}
          </div>
        </div>
      </div>
      <div class="cf-right">
        <div class="cf-ref">${p.ref}</div>
        <div class="cf-price-zone">ÉTIQUETTE<br>PRIX</div>
      </div>
    </div>`;
  }

  // Découpe en pages de `perPage` étiquettes
  const pages = [];
  for (let i = 0; i < products.length; i += perPage) {
    pages.push(products.slice(i, i + perPage));
  }
  const pagesHTML = pages.map(pageProducts =>
    `<div class="page">${pageProducts.map(p => makeSheet(p)).join("\n")}</div>`
  ).join("\n");
  // hauteur d'une étiquette selon le nombre par page (A4 portrait ≈ 277mm utile)
  const sheetHeight = Math.floor((277 - (perPage-1)*3) / perPage);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fiches produit</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  html,body { width:210mm; background:#fff; font-family:Arial,Helvetica,sans-serif; }
  @page { size:A4 portrait; margin:8mm; }
  @media print { -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  /* ── ${perPage} étiquette(s) par page A4 ── */
  .page { width:194mm; display:flex; flex-direction:column; gap:3mm; page-break-after:always; }
  .page:last-child { page-break-after:auto; }
  .sheet { height:${sheetHeight}mm !important; width:194mm !important; }

  /* ════ FORMAT CONFORAMA STANDARD ════ */
  .sheet.conforama {
    width:285mm; height:90mm;
    display:flex; border:2.5pt solid #E30613; border-radius:5mm;
    overflow:hidden; page-break-inside:avoid;
  }
  .cf-left {
    width:130mm; background:#E30613;
    display:flex; flex-direction:column; flex-shrink:0;
  }
  .cf-brand {
    padding:5mm 6mm 3mm;
    font-size:26pt; font-weight:900; font-style:italic;
    color:white; letter-spacing:-0.5pt; line-height:1;
    border-bottom:1pt solid rgba(255,255,255,0.2);
    font-family:'Arial Black',Arial,sans-serif;
  }
  .cf-content { flex:1; display:flex; align-items:center; padding:3mm 4mm; gap:3mm; }
  .cf-specs { flex:1; display:flex; flex-direction:column; gap:2mm; }
  .cf-caract-title { font-size:7pt; font-weight:800; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:1mm; }
  .cf-caract { font-size:9pt; font-weight:600; color:white; background:rgba(255,255,255,0.15); border-radius:2mm; padding:2mm 3mm; min-height:8mm; }
  .cf-dim-block,.cf-coloris-block { margin-top:2mm; }
  .cf-dims-title { font-size:6.5pt; font-weight:800; color:rgba(255,255,255,0.65); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:1mm; }
  .cf-dim { font-size:8pt; color:white; line-height:1.5; }
  .cf-qr-block { display:flex; flex-direction:column; align-items:center; gap:2mm; flex-shrink:0; width:28mm; }
  .cf-qr { width:24mm; height:24mm; border:2pt solid white; border-radius:1.5mm; }
  .cf-qr-label { font-size:6.5pt; font-weight:700; color:white; text-align:center; }
  .cf-right {
    flex:1; border-left:2.5pt solid #E30613;
    padding:5mm 6mm; display:flex; flex-direction:column;
  }
  .cf-ref { font-size:14pt; font-weight:700; color:#1a1a2e; letter-spacing:0.3pt; margin-bottom:4mm; }
  .cf-price-zone {
    flex:1; border:2pt dashed #E30613; border-radius:3mm;
    display:flex; align-items:center; justify-content:center;
    font-size:10pt; font-weight:700; color:#E30613;
    text-align:center; letter-spacing:1pt; line-height:1.8;
  }

  /* ════ FORMAT TOP CONFO ════ */
  .sheet.topconfo {
    width:285mm; height:90mm;
    display:flex; flex-direction:column;
    border:2.5pt solid #E30613; border-radius:5mm;
    overflow:hidden; page-break-inside:avoid; background:#fff;
    position:relative;
  }
  .tc-header {
    background:#E30613; padding:4mm 6mm; display:flex; align-items:center; gap:4mm;
    border-bottom:2pt solid rgba(255,255,255,0.3);
  }
  .tc-logo-box { background:white; border:2pt solid white; padding:2mm 3mm; border-radius:1.5mm; display:flex; flex-direction:column; align-items:center; }
  .tc-top { font-size:16pt; font-weight:900; color:#E30613; font-family:'Arial Black',Arial; letter-spacing:-1pt; line-height:1; }
  .tc-confo { font-size:11pt; font-weight:900; color:#E30613; font-family:'Arial Black',Arial; letter-spacing:1pt; }
  .tc-tagline { display:flex; flex-direction:column; }
  .tc-mq { font-size:7pt; font-weight:700; color:white; letter-spacing:0.1em; }
  .tc-qp { font-size:18pt; font-weight:900; color:#1a2f5e; font-family:'Arial Black',Arial; line-height:1; letter-spacing:-0.5pt; }
  .tc-body { flex:1; display:flex; padding:3mm 4mm; gap:3mm; }
  .tc-img-zone { width:45mm; border:1.5pt solid #e5e7eb; border-radius:2mm; flex-shrink:0; }
  .tc-info { flex:1; display:flex; flex-direction:column; gap:2mm; }
  .tc-caract-title { font-size:7pt; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#333; background:#e5e7eb; padding:1.5mm 3mm; border-radius:1mm; }
  .tc-caract-box { font-size:8.5pt; color:#1a1a2e; padding:1.5mm 2mm; border:1pt solid #e5e7eb; border-radius:1mm; min-height:8mm; }
  .tc-dims-row { display:flex; gap:3mm; flex:1; }
  .tc-dims-col { flex:1; display:flex; flex-direction:column; gap:1mm; }
  .tc-dims-title { font-size:7pt; font-weight:700; color:#555; background:#e5e7eb; padding:1mm 2mm; border-radius:1mm; text-transform:uppercase; letter-spacing:0.06em; }
  .tc-dim-line { font-size:8pt; color:#1a1a2e; padding:0.5mm 1mm; }
  .tc-qr-col { width:26mm; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1mm; border:1.5pt solid #e5e7eb; border-radius:2mm; padding:2mm; }
  .tc-qr { width:22mm; height:22mm; border:1pt solid #ccc; }
  .tc-qr-empty { width:22mm; height:22mm; border:1pt dashed #ccc; border-radius:1mm; }
  .tc-footer { background:#E30613; padding:2.5mm 6mm; font-size:16pt; font-weight:900; font-style:italic; color:white; text-align:right; font-family:'Arial Black',Arial; }
</style>
</head>
<body>
${pagesHTML}
<script>
  const imgs = document.querySelectorAll('img[src*="qrserver"]');
  if (!imgs.length) { setTimeout(() => window.print(), 400); }
  else {
    let n=0;
    imgs.forEach(img => {
      if(img.complete){n++;if(n===imgs.length)setTimeout(()=>window.print(),300);}
      else{img.onload=img.onerror=()=>{n++;if(n===imgs.length)setTimeout(()=>window.print(),300);};}
    });
  }
</script>
</body>
</html>`;

  const blob = new Blob([html], { type:"text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.target = "_blank"; a.rel = "noopener";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÉTIQUETTES MAGASIN — sélection produits + génération PDF
// ───────────────────────────────────────────────────────────────────────────────
// REGISTRE DES FORMATS — c'est ICI qu'on ajoute/modifie un format d'étiquette.
// Chaque format : id, label affiché, couleur du bouton, nb d'étiquettes/page A4
// possibles, et le type de gabarit passé au générateur. Quand tu m'enverras tes
// visuels officiels, je brancherai chaque gabarit ici sans toucher au reste.
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// APPARENCE — réglages visuels personnalisables par l'utilisateur
// ═══════════════════════════════════════════════════════════════════════════════
function AppearancePage({ appearance, setAppearance, dark, toggleDark, darkOverride }) {
  const ACCENTS = [
    { name:"Violet (défaut)", color:"#7c3aed" },
    { name:"Indigo", color:"#6366f1" },
    { name:"Bleu", color:"#3b82f6" },
    { name:"Cyan", color:"#0891b2" },
    { name:"Émeraude", color:"#10b981" },
    { name:"Ambre", color:"#f59e0b" },
    { name:"Rose", color:"#ec4899" },
    { name:"Rouge", color:"#ef4444" },
  ];
  const set = (patch) => setAppearance(a => ({ ...a, ...patch }));
  const Card = ({ title, desc, children }) => (
    <div style={{ ...S.card, marginBottom:16 }}>
      <div style={{ fontSize:15, fontWeight:700, marginBottom: desc?4:14 }}>{title}</div>
      {desc && <div style={{ fontSize:12, color:"var(--t-text-55)", marginBottom:14 }}>{desc}</div>}
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em" }}>Apparence</h1>
        <div style={{ fontSize:13, color:"var(--t-text-55)", marginTop:4 }}>Personnalise le look de l'app. Les réglages sont gardés sur cet appareil.</div>
      </div>

      <Card title="Couleur d'accent" desc="La couleur des boutons principaux et des éléments mis en avant.">
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {ACCENTS.map(a => (
            <button key={a.color} onClick={()=>set({accent:a.color})} title={a.name} style={{
              width:44, height:44, borderRadius:12, cursor:"pointer", background:a.color,
              border: appearance.accent===a.color ? "3px solid var(--t-text-90)" : "3px solid transparent",
              boxShadow: appearance.accent===a.color ? "0 0 0 2px "+a.color : "none",
            }} />
          ))}
        </div>
        <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, color:"var(--t-text-55)" }}>Ou choisis librement :</span>
          <input type="color" value={appearance.accent} onChange={e=>set({accent:e.target.value})} style={{ width:48, height:32, borderRadius:8, border:"none", cursor:"pointer", background:"none" }} />
          <span style={{ fontSize:13, fontWeight:600, fontFamily:"monospace" }}>{appearance.accent}</span>
        </div>
      </Card>

      <Card title="Taille du texte" desc={`Actuellement ${appearance.fontScale}%. Agrandis si tu trouves le texte petit.`}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12, color:"var(--t-text-40)" }}>A</span>
          <input type="range" min="85" max="130" step="5" value={appearance.fontScale} onChange={e=>set({fontScale:parseInt(e.target.value)})} style={{ flex:1 }} />
          <span style={{ fontSize:20, color:"var(--t-text-40)" }}>A</span>
          <span style={{ fontSize:13, fontWeight:700, width:48, textAlign:"right" }}>{appearance.fontScale}%</span>
        </div>
      </Card>

      <Card title="Arrondi des cartes" desc={`Actuellement ${appearance.radius}%. Des coins plus ou moins ronds.`}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12, color:"var(--t-text-40)" }}>▢</span>
          <input type="range" min="40" max="160" step="10" value={appearance.radius} onChange={e=>set({radius:parseInt(e.target.value)})} style={{ flex:1 }} />
          <span style={{ fontSize:13, fontWeight:700, width:48, textAlign:"right" }}>{appearance.radius}%</span>
        </div>
      </Card>

      <Card title="Thème" desc="Par défaut, le thème s'adapte automatiquement à l'heure (clair le jour, sombre le soir).">
        <button onClick={toggleDark} style={{ ...S.btnSecondary }}>
          {darkOverride === null ? "🌗 Automatique (selon l'heure)" : dark ? "🌙 Sombre (forcé)" : "☀️ Clair (forcé)"}
        </button>
        <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:8 }}>Touche pour basculer : Auto → Clair/Sombre.</div>
      </Card>

      <button onClick={()=>set({ accent:"#7c3aed", fontScale:100, radius:100 })} style={{ ...S.btnGhost, width:"100%", marginTop:4 }}>↺ Réinitialiser l'apparence par défaut</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÉTIQUETTES MAGASIN
// ═══════════════════════════════════════════════════════════════════════════════
const ETIQUETTE_FORMATS = [
  { id:"conforama", label:"Conforama",  color:"#E30613", perPageOptions:[3,4,6], template:"conforama" },
  { id:"topconfo",  label:"Top Confo",  color:"#1a3a6b", perPageOptions:[3,4,6], template:"topconfo" },
  // ➕ Futurs formats à ajouter ici (A4, A5, porte-étiquette, par type produit…)
  // Exemple : { id:"porte_etiquette", label:"Porte-étiquette", color:"#7c3aed", perPageOptions:[8,12], template:"porte_etiquette" },
];

function EtiquettesPage({ suppliers, session }) {
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [selected, setSelected] = useState([]);
  const [formatId, setFormatId] = useState(ETIQUETTE_FORMATS[0].id);
  const fmt0 = ETIQUETTE_FORMATS.find(f => f.id===formatId) || ETIQUETTE_FORMATS[0];
  const [perPage, setPerPage] = useState(fmt0.perPageOptions[0]);

  const currentFormat = ETIQUETTE_FORMATS.find(f => f.id===formatId) || ETIQUETTE_FORMATS[0];
  // si on change de format, on recale le nb/page sur une valeur valide
  useEffect(() => {
    if (!currentFormat.perPageOptions.includes(perPage)) setPerPage(currentFormat.perPageOptions[0]);
  }, [formatId]);

  const allProducts = useMemo(() => {
    const list = [];
    suppliers.forEach(s => (s.products||[]).forEach(p => list.push({ ...p, supplierName: s.name, supplierId: s.id })));
    return list;
  }, [suppliers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter(p => {
      if (filterSupplier !== "all" && p.supplierId !== filterSupplier) return false;
      if (!q) return true;
      return (p.label||"").toLowerCase().includes(q) || (p.ref||"").toLowerCase().includes(q) || (p.ean||"").includes(q);
    });
  }, [allProducts, search, filterSupplier]);

  const isSel = (p) => selected.some(s => s.ref===p.ref && s.supplierId===p.supplierId);
  function toggle(p) {
    setSelected(prev => isSel(p) ? prev.filter(s=>!(s.ref===p.ref&&s.supplierId===p.supplierId)) : [...prev, p]);
  }
  function generate() {
    if (selected.length === 0) return;
    generateProductSheetPDF(selected, currentFormat.template, perPage);
  }

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em" }}>Étiquettes magasin</h1>
        <div style={{ fontSize:13, color:"var(--t-text-55)", marginTop:4 }}>Choisis un format, sélectionne tes produits, génère le PDF à imprimer sur A4</div>
      </div>

      {/* Choix du format */}
      <div style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:18, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Format d'étiquette</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
          {ETIQUETTE_FORMATS.map(f => (
            <button key={f.id} onClick={()=>setFormatId(f.id)} style={{
              padding:"9px 16px", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700,
              border: formatId===f.id ? `2px solid ${f.color}` : "1px solid var(--t-border-subtle)",
              background: formatId===f.id ? f.color : "var(--t-surface)",
              color: formatId===f.id ? "white" : "var(--t-text-70)",
            }}>{f.label}</button>
          ))}
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Étiquettes par page A4</div>
        <div style={{ display:"flex", gap:8 }}>
          {currentFormat.perPageOptions.map(n => (
            <button key={n} onClick={()=>setPerPage(n)} style={{
              padding:"8px 18px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:700,
              border:"none", background: perPage===n ? "#7c3aed" : "var(--t-surface)",
              color: perPage===n ? "white" : "var(--t-text-55)",
            }}>{n}</button>
          ))}
        </div>
      </div>

      {/* Barre d'action sélection */}
      {selected.length > 0 && (
        <div style={{ position:"sticky", top:8, zIndex:20, background:"var(--t-card-bg)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid var(--t-card-border)", borderRadius:18, padding:"12px 16px", marginBottom:16, boxShadow:"var(--t-card-shadow)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontWeight:700 }}>🖨️ {selected.length} produit{selected.length>1?"s":""} · {currentFormat.label} · {perPage}/page</span>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={generate} style={{ ...S.btnPrimary, display:"inline-flex", alignItems:"center", gap:6, background:`linear-gradient(135deg,${currentFormat.color},${currentFormat.color})` }}>🖨️ Générer le PDF</button>
              <button onClick={() => setSelected([])} style={S.btnGhost}>Tout désélectionner</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Chercher par réf, EAN ou nom…" style={{ ...S.input, flex:1, minWidth:200 }} />
        <select value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)} style={{ ...S.input, cursor:"pointer" }}>
          <option value="all">Tous fournisseurs</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--t-text-40)" }}>
          {search.trim() || filterSupplier!=="all" ? "Aucun produit trouvé." : "Cherche un produit ou filtre par fournisseur pour commencer."}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {filtered.slice(0, 80).map(p => {
            const sel = isSel(p);
            return (
              <div key={p.supplierId+p.ref} onClick={()=>toggle(p)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background: sel?"rgba(124,58,237,0.1)":"var(--t-card-bg)", border:`1px solid ${sel?"rgba(124,58,237,0.4)":"var(--t-card-border)"}`, borderRadius:12, cursor:"pointer" }}>
                <div style={{ flexShrink:0, width:22, height:22, borderRadius:6, border:`2px solid ${sel?"#7c3aed":"var(--t-text-30)"}`, background: sel?"#7c3aed":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {sel && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}</div>
                  <div style={{ fontSize:11, color:"var(--t-text-40)" }}>{p.ref} · {p.supplierName}</div>
                </div>
              </div>
            );
          })}
          {filtered.length > 80 && <div style={{ textAlign:"center", fontSize:12, color:"var(--t-text-40)", padding:8 }}>Affine ta recherche — {filtered.length} résultats au total</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF — Document de remplissage de rayon (dépôt → magasin)
// ═══════════════════════════════════════════════════════════════════════════════
function generateFillSheetPDF(lines, dateStr, createdBy) {
  // Groupement par type de produit pour faciliter la préparation
  const groups = {};
  lines.forEach(l => {
    const g = l.productType || "Autres";
    if (!groups[g]) groups[g] = [];
    groups[g].push(l);
  });
  const groupEntries = Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));

  const dateFr = new Date(dateStr).toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });

  const sectionsHTML = groupEntries.map(([type, items]) => `
    <div class="type-section">
      <div class="type-title">${type}</div>
      <table>
        <thead><tr>
          <th style="width:140px">Référence</th>
          <th>Désignation</th>
          <th class="center" style="width:90px">Quantité</th>
          <th class="center" style="width:70px">✓ Fait</th>
        </tr></thead>
        <tbody>
          ${items.map((l,i) => `
            <tr style="background:${i%2===0?'#ffffff':'#f9fafb'}">
              <td style="padding:10px 14px;font-size:12px;color:#374151;font-family:monospace">${l.ref}</td>
              <td style="padding:10px 14px;font-size:13px;color:#111827;font-weight:500">${l.label}</td>
              <td style="padding:10px 14px;font-size:15px;color:#111827;text-align:center;font-weight:800">${l.qty}</td>
              <td style="padding:10px 14px;text-align:center"><div class="checkbox"></div></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Remplissage rayon ${dateStr}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; background:#fff; color:#111827; font-size:13px; }
    .page { max-width:780px; margin:0 auto; padding:40px 44px 50px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:22px; border-bottom:2px solid #111827; }
    .header-left .company { font-size:20px; font-weight:900; letter-spacing:-0.04em; color:#111827; }
    .header-left .tagline { font-size:10px; color:#9ca3af; margin-top:3px; letter-spacing:0.1em; text-transform:uppercase; }
    .header-right { text-align:right; }
    .doc-label { font-size:10px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
    .doc-date { font-size:18px; font-weight:800; color:#4f46e5; letter-spacing:-0.01em; text-transform:capitalize; }
    .doc-meta { font-size:11px; color:#6b7280; margin-top:4px; }
    .type-section { margin-bottom:22px; }
    .type-title { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; color:#ffffff; background:#4f46e5; padding:9px 14px; border-radius:8px 8px 0 0; }
    .table-wrap { border-radius:0 0 10px 10px; overflow:hidden; }
    table { width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-top:none; }
    thead tr { background:#f3f4f6; }
    th { padding:8px 14px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#6b7280; }
    th.center { text-align:center; }
    td { border-bottom:1px solid #f3f4f6; }
    .checkbox { width:18px; height:18px; border:2px solid #9ca3af; border-radius:5px; margin:0 auto; }
    .footer { padding-top:18px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; margin-top:20px; }
    .footer-left { font-size:10px; color:#9ca3af; line-height:1.8; }
    .footer-right { font-size:10px; color:#9ca3af; text-align:right; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .page { padding:24px; }
      .type-section { page-break-inside: avoid; }
    }
    @page { margin: 0.5cm; size: auto; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="company">CommaPro</div>
        <div class="tagline">Remplissage rayon</div>
      </div>
      <div class="header-right">
        <div class="doc-label">À préparer pour le</div>
        <div class="doc-date">${dateFr}</div>
        <div class="doc-meta">Préparé par ${createdBy || "—"}</div>
      </div>
    </div>
    ${sectionsHTML}
    <div class="footer">
      <div class="footer-left">Document généré par CommaPro<br>Cockpit des achats fournisseurs</div>
      <div class="footer-right">${lines.length} référence(s) · ${lines.reduce((s,l)=>s+l.qty,0)} article(s) au total</div>
    </div>
  </div>
</body>
</html>`;

  const blob5 = new Blob([html], { type: "text/html" });
  const url5 = URL.createObjectURL(blob5);
  const a5 = document.createElement("a");
  a5.href = url5; a5.target = "_blank"; a5.rel = "noopener";
  document.body.appendChild(a5); a5.click(); document.body.removeChild(a5);
  setTimeout(() => URL.revokeObjectURL(url5), 5000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REMPLISSAGE — Document de réappro rayon (dépôt → magasin) pour le manutentionnaire
// ═══════════════════════════════════════════════════════════════════════════════
function FillSheetPage({ suppliers, setSuppliers, session, replenishments, setReplenishments }) {
  const [fillDate, setFillDate]   = useState(new Date(Date.now() + 86400000).toISOString().slice(0,10)); // demain par défaut
  const [lines, setLines]         = useState([]);
  const [search, setSearch]       = useState("");
  const [filterType, setFilterType] = useState("all");
  const [expandedRef, setExpandedRef] = useState(null);
  const [inputQty, setInputQty]   = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProd, setNewProd] = useState({ supplierId:"", ref:"", label:"", productType:"" });
  const [showArchive, setShowArchive] = useState(false);

  // Catalogue global tous fournisseurs confondus
  const allProducts = suppliers.flatMap(s => s.products.filter(p=>!p.rupture).map(p => ({ ...p, supplierName: s.name })));
  const typeList = [...new Set(allProducts.filter(p=>p.productType).map(p=>p.productType))].sort();

  const q = search.toLowerCase().trim();
  const filtered = allProducts.filter(p =>
    (filterType==="all" || p.productType===filterType) &&
    (!q || p.ref.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || (p.productType||"").toLowerCase().includes(q))
  );

  // Regroupement par type pour affichage clair dans le catalogue de sélection
  const groups = {};
  filtered.forEach(p => {
    const g = p.productType || "Sans type défini";
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });
  const groupEntries = Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0]));

  // Ajout rapide d'un produit absent du catalogue → enregistré chez le fournisseur choisi
  function saveNewProduct() {
    if (!newProd.supplierId || !newProd.ref || !newProd.label) return;
    const ref = newProd.ref.trim();
    const targetSupplier = suppliers.find(s => s.id === newProd.supplierId);
    const existing = targetSupplier?.products.find(p => p.ref.toLowerCase() === ref.toLowerCase());
    if (existing) {
      setLines(prev => {
        const ex = prev.find(l => l.ref === existing.ref);
        if (ex) return prev;
        return [...prev, { ref: existing.ref, label: existing.label, qty: 1, productType: existing.productType || "Autres" }];
      });
    } else {
      const p = { ref, label: newProd.label.trim(), productType: newProd.productType.trim(), price: 0, weeklyVolume: 0 };
      setSuppliers(prev => prev.map(s => s.id===newProd.supplierId ? { ...s, products: [...s.products, p] } : s));
      setLines(prev => [...prev, { ref: p.ref, label: p.label, qty: 1, productType: p.productType || "Autres" }]);
    }
    setNewProd({ supplierId:"", ref:"", label:"", productType:"" });
    setShowAddProduct(false);
  }

  function handleAddOrExpand(p) {
    if (expandedRef === p.ref) { setExpandedRef(null); return; }
    setExpandedRef(p.ref);
    const ex = lines.find(l => l.ref === p.ref);
    setInputQty(ex ? String(ex.qty) : "");
  }
  function confirmQty(p) {
    const qty = parseInt(inputQty) || 0;
    if (qty <= 0) { setLines(prev => prev.filter(l => l.ref !== p.ref)); }
    else {
      setLines(prev => {
        const ex = prev.find(l => l.ref === p.ref);
        if (ex) return prev.map(l => l.ref===p.ref ? {...l, qty} : l);
        return [...prev, { ref:p.ref, label:p.label, qty, productType: p.productType || "Autres" }];
      });
    }
    setExpandedRef(null);
    setInputQty("");
  }
  function removeLine(ref) {
    setLines(prev => prev.filter(l => l.ref !== ref));
  }

  function generate() {
    if (lines.length === 0) return;
    generateFillSheetPDF(lines, fillDate, session.name);
    setReplenishments(prev => [...prev, { id:"fill_"+Date.now(), date: fillDate, lines, createdBy: session.name, createdAt: new Date().toISOString() }]);
  }

  function reprint(r) {
    generateFillSheetPDF(r.lines, r.date, r.createdBy);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6, flexWrap:"wrap", gap:10 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em", color:"var(--t-text-90)" }}>Remplissage rayon</h1>
        <button onClick={()=>setShowArchive(v=>!v)} style={{ ...S.btnGhost, fontSize:12, display:"inline-flex", alignItems:"center", gap:6 }}>
          {showArchive ? "✕ Fermer l'archive" : `🗄️ Archive (${replenishments.length})`}
        </button>
      </div>
      <div style={{ fontSize:13, color:"var(--t-text-40)", marginBottom:20 }}>Prépare la liste de réapprovisionnement pour ton manutentionnaire</div>

      {/* Archive des remplissages précédents */}
      {showArchive && (
        <div style={{ ...S.card, marginBottom:16 }}>
          <h2 style={{ margin:"0 0 14px 0", fontSize:12, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Historique des remplissages</h2>
          {replenishments.length === 0 ? (
            <div style={{ textAlign:"center", color:"var(--t-text-30)", fontSize:13, padding:"16px 0" }}>Aucun remplissage archivé pour l'instant</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {replenishments.slice().sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).map(r => (
                <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"var(--t-surface)", borderRadius:12, border:"1px solid var(--t-border-subtle)", flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--t-text-90)" }}>{fmtDate(r.date)}</div>
                    <div style={{ fontSize:11, color:"var(--t-text-40)" }}>{(r.lines||[]).length} référence(s) · {(r.lines||[]).reduce((s,l)=>s+l.qty,0)} article(s) · par {r.createdBy}</div>
                  </div>
                  <button onClick={()=>reprint(r)} style={{ ...S.btnSecondary, fontSize:12, padding:"6px 14px" }}>🖨️ Réimprimer</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Date de remplissage */}
      <div style={{ ...S.card, marginBottom:16 }}>
        <Field label="Date de remplissage *">
          <input type="date" value={fillDate} onChange={e=>setFillDate(e.target.value)} style={{ ...S.input, maxWidth:240, textAlign:"center" }} />
        </Field>
      </div>

      <div className="order-layout" style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16, alignItems:"start" }}>
        {/* Colonne gauche : catalogue défilant avec filtres */}
        <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 10px", borderBottom:"1px solid var(--t-border-subtle)", position:"sticky", top:0, background:"var(--t-card-bg)", zIndex:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <h2 style={{ margin:0, fontSize:13, fontWeight:700, color:"var(--t-text-90)" }}>Catalogue — tous fournisseurs</h2>
              <button onClick={()=>setShowAddProduct(v=>!v)} style={{ ...S.btnGhost, fontSize:11, padding:"4px 8px", color:"#7c3aed" }}>+ Nouveau produit</button>
            </div>

            {/* Formulaire ajout rapide d'un produit absent du catalogue */}
            {showAddProduct && (
              <div style={{ padding:"12px", borderRadius:12, background:"rgba(124,58,237,0.06)", border:"1px solid rgba(124,58,237,0.2)", marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-55)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>Nouveau produit (absent du catalogue)</div>
                <div style={{ marginBottom:8 }}>
                  <label style={S.label}>Fournisseur *</label>
                  <select value={newProd.supplierId} onChange={e=>setNewProd(p=>({...p,supplierId:e.target.value}))} style={{ ...S.input, background:"var(--t-surface)" }}>
                    <option value="">— Choisir —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <div><label style={S.label}>Référence *</label><input value={newProd.ref} onChange={e=>setNewProd(p=>({...p,ref:e.target.value}))} style={S.input} placeholder="Ex: TAB906" /></div>
                  <div><label style={S.label}>Type de produit</label><input value={newProd.productType} onChange={e=>setNewProd(p=>({...p,productType:e.target.value}))} style={S.input} placeholder="Ex: Aspirateur" /></div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={S.label}>Désignation *</label>
                  <input value={newProd.label} onChange={e=>setNewProd(p=>({...p,label:e.target.value}))} style={S.input} placeholder="Nom du produit" />
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={saveNewProduct} disabled={!newProd.supplierId||!newProd.ref||!newProd.label} style={{ ...S.btnPrimary, flex:1, fontSize:12, opacity:(newProd.supplierId&&newProd.ref&&newProd.label)?1:0.45 }}>✓ Ajouter à la liste</button>
                  <button onClick={()=>{setShowAddProduct(false);setNewProd({supplierId:"",ref:"",label:"",productType:""});}} style={S.btnGhost}>Annuler</button>
                </div>
              </div>
            )}

            <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--t-surface)", borderRadius:20, padding:"7px 12px", marginBottom:10 }}>
              <Search size={14} style={{ color:"var(--t-text-40)", flexShrink:0 }} />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit…" style={{ background:"transparent", border:"none", outline:"none", fontSize:13, color:"var(--t-input-color)", width:"100%" }} />
              {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-40)", padding:0 }}><X size={14} /></button>}
            </div>
            {typeList.length > 0 && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button onClick={()=>setFilterType("all")} style={{ padding:"4px 11px", borderRadius:16, border:"1.5px solid", cursor:"pointer", fontSize:11, fontWeight:filterType==="all"?700:400, background:filterType==="all"?"rgba(99,102,241,0.7)":"var(--t-surface)", color:filterType==="all"?"white":"var(--t-text-55)", borderColor:filterType==="all"?"rgba(124,58,237,0.5)":"var(--t-border-subtle)" }}>Tous types</button>
                {typeList.map(t => (
                  <button key={t} onClick={()=>setFilterType(t)} style={{ padding:"4px 11px", borderRadius:16, border:"1.5px solid", cursor:"pointer", fontSize:11, fontWeight:filterType===t?700:400, background:filterType===t?"rgba(99,102,241,0.7)":"var(--t-surface)", color:filterType===t?"white":"var(--t-text-55)", borderColor:filterType===t?"rgba(124,58,237,0.5)":"var(--t-border-subtle)" }}>{t}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ maxHeight:"60vh", overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
            {groupEntries.length === 0 ? (
              <div style={{ padding:"24px 16px", textAlign:"center", color:"var(--t-text-40)", fontSize:13 }}>Aucun produit trouvé</div>
            ) : groupEntries.map(([grp, prods]) => (
              <div key={grp}>
                <div style={{ padding:"8px 16px 4px", fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", background:"var(--t-surface)", borderBottom:"1px solid var(--t-border-subtle)" }}>{grp} — {prods.length} produit(s)</div>
                {prods.map(p => {
                  const inCart = lines.find(l=>l.ref===p.ref);
                  const isExpanded = expandedRef === p.ref;
                  return (
                    <div key={p.ref} style={{ borderBottom:"1px solid var(--t-border-subtle)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background: inCart?"rgba(124,58,237,0.06)":"transparent" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:inCart?700:500, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}</div>
                          <div style={{ display:"flex", gap:6, marginTop:3, flexWrap:"wrap", alignItems:"center" }}>
                            <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-text-40)", background:"var(--t-surface)", padding:"1px 5px", borderRadius:5 }}>{p.ref}</span>
                            <span style={{ fontSize:11, color:"var(--t-text-40)" }}>· {p.supplierName}</span>
                          </div>
                        </div>
                        {inCart && !isExpanded && <span style={{ fontSize:12, fontWeight:700, color:"#7c3aed", background:"rgba(124,58,237,0.15)", padding:"2px 8px", borderRadius:10, flexShrink:0 }}>×{inCart.qty}</span>}
                        <button onClick={() => handleAddOrExpand(p)} style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, background:inCart?"rgba(124,58,237,0.2)":"rgba(99,102,241,0.7)", color:"white" }}>
                          {isExpanded ? "✕" : inCart ? "Modifier" : "+ Ajouter"}
                        </button>
                      </div>
                      {isExpanded && (
                        <div style={{ padding:"8px 14px 10px", background:"rgba(124,58,237,0.06)", borderTop:"1px solid rgba(124,58,237,0.15)", display:"flex", alignItems:"center", gap:10 }}>
                          <button onClick={() => setInputQty(q => String(Math.max(0, (parseInt(q)||0)-1)))} style={{ width:38, height:38, borderRadius:12, border:"1.5px solid rgba(124,58,237,0.3)", background:"var(--t-surface)", cursor:"pointer", fontSize:22, fontWeight:300, color:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>−</button>
                          <input type="number" inputMode="numeric" pattern="[0-9]*" value={inputQty} onChange={e=>setInputQty(e.target.value)} style={{ flex:1, textAlign:"center", fontSize:26, fontWeight:800, color:"#7c3aed", letterSpacing:"-0.02em", border:"none", borderBottom:"2px solid rgba(124,58,237,0.4)", background:"transparent", outline:"none", width:0, minWidth:0, padding:"2px 4px" }} />
                          <button onClick={() => setInputQty(q => String((parseInt(q)||0)+1))} style={{ width:38, height:38, borderRadius:12, border:"1.5px solid rgba(124,58,237,0.3)", background:"rgba(124,58,237,0.1)", cursor:"pointer", fontSize:22, fontWeight:300, color:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>+</button>
                          <button onClick={() => confirmQty(p)} style={{ ...S.btnPrimary, padding:"9px 16px", fontSize:13, flexShrink:0 }}>{(parseInt(inputQty)||0)===0 ? "Retirer" : "OK"}</button>
                          <button onClick={() => { setExpandedRef(null); setInputQty(""); }} style={{ ...S.btnGhost, padding:"9px 10px", flexShrink:0 }}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Colonne droite : liste à remplir, sticky */}
        <div style={{ position:"sticky", top:80 }}>
          <div style={S.card}>
            <h2 style={{ margin:"0 0 14px 0", fontSize:12, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Liste de remplissage</h2>
            {lines.length === 0 ? (
              <div style={{ textAlign:"center", color:"var(--t-text-30)", fontSize:13, padding:"20px 0" }}>Aucun produit ajouté</div>
            ) : (
              <>
                {lines.map(l => (
                  <div key={l.ref} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid var(--t-border-subtle)", gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"var(--t-text-85)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.label}</div>
                      <div style={{ fontSize:11, fontFamily:"monospace", color:"var(--t-text-40)" }}>{l.ref}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                      <button onClick={()=>{setExpandedRef(l.ref);setInputQty(String(l.qty));}} style={{ fontSize:13, fontWeight:700, color:"#7c3aed", background:"rgba(124,58,237,0.12)", border:"none", borderRadius:8, padding:"2px 8px", cursor:"pointer" }}>×{l.qty}</button>
                      <button onClick={()=>removeLine(l.ref)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", fontSize:16, padding:0, lineHeight:1 }}>×</button>
                    </div>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:12, paddingTop:10, borderTop:"2px solid var(--t-border-subtle)", fontWeight:700, fontSize:13 }}>
                  <span style={{ color:"var(--t-text-55)" }}>Total articles</span>
                  <span style={{ color:"#7c3aed" }}>{lines.reduce((s,l)=>s+l.qty,0)}</span>
                </div>
              </>
            )}
          </div>
          <button onClick={generate} disabled={lines.length===0} style={{ ...S.btnPrimary, width:"100%", marginTop:12, padding:14, fontSize:15, fontWeight:700, opacity:lines.length===0?0.45:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            🖨️ Générer le document
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSITIONS — Offres commerciales fournisseurs (promos, nouveaux produits, tarifs)
// ═══════════════════════════════════════════════════════════════════════════════
function ProposalsPage({ proposals, setProposals, suppliers, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ supplierName:"", description:"", price:"", validUntil:"" });
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [importMsg, setImportMsg] = useState("");

  const supplierList = [...new Set(suppliers.map(s=>s.name))].sort();
  const today = new Date().toISOString().slice(0,10);

  function openNew() {
    setForm({ supplierName: suppliers[0]?.name || "", description:"", price:"", validUntil:"" });
    setEditing("new");
    setShowForm(true);
  }
  function openEdit(p) {
    setForm({ supplierName:p.supplierName, description:p.description, price:p.price||"", validUntil:p.validUntil||"" });
    setEditing(p.id);
    setShowForm(true);
  }
  function save() {
    if (!form.supplierName || !form.description) return;
    if (editing === "new") {
      setProposals(prev => [...prev, { id:"prop_"+Date.now(), ...form, price: parseFloat(form.price)||0, createdAt: new Date().toISOString() }]);
    } else {
      setProposals(prev => prev.map(p => p.id===editing ? { ...p, ...form, price: parseFloat(form.price)||0 } : p));
    }
    setShowForm(false);
    setEditing(null);
  }
  function remove(id) {
    setProposals(prev => prev.filter(p => p.id !== id));
  }

  // Import Excel — même méthode souple que pour le catalogue produits
  function handleExcelImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("Lecture du fichier…");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const norm = (s) => String(s).toLowerCase().replace(/[éè]/g,"e").trim();
        const pick = (row, names) => {
          for (const key of Object.keys(row)) {
            if (names.includes(norm(key))) return row[key];
          }
          return "";
        };
        const toIsoDate = (v) => {
          if (!v) return "";
          if (v instanceof Date) return v.toISOString().slice(0,10);
          // Excel peut donner un numéro de série de date
          if (typeof v === "number") {
            const d = new Date(Math.round((v - 25569) * 86400 * 1000));
            return isNaN(d) ? "" : d.toISOString().slice(0,10);
          }
          const s = String(v).trim();
          // Format jj/mm/aaaa
          const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
          if (m) { const yyyy = m[3].length===2 ? "20"+m[3] : m[3]; return `${yyyy}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`; }
          return s; // déjà au format aaaa-mm-jj
        };
        const imported = rows.map(r => ({
          id: "prop_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),
          supplierName: String(pick(r, ["fournisseur","fournisseur*","societe","société"]) || "").trim(),
          description:  String(pick(r, ["description","produit","designation","désignation","offre","proposition"]) || "").trim(),
          price:        parseFloat(String(pick(r, ["prix","prix propose","prix proposé","prix ht","tarif"])).replace(",",".")) || 0,
          validUntil:   toIsoDate(pick(r, ["validite","validité","date de validite","date de validité","valable jusqu'au","echeance","échéance"])),
          createdAt: new Date().toISOString(),
        })).filter(p => p.supplierName || p.description);

        if (imported.length === 0) {
          setImportMsg("⚠️ Aucune proposition trouvée. Vérifie les noms de colonnes.");
          return;
        }
        setProposals(prev => [...prev, ...imported]);
        setImportMsg(`✅ ${imported.length} proposition(s) importée(s) !`);
      } catch (err) {
        console.error(err);
        setImportMsg("❌ Erreur de lecture du fichier. Vérifie que c'est bien un .xlsx.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  function downloadTemplate() {
    const data = [
      ["Fournisseur","Description","Prix proposé HT","Date de validité"],
      ["Réunion Technologie distribution","Lave-linge 8kg A+++ -20% jusqu'au stock épuisé","249.00","31/12/2026"],
      ["Sogerep","Lot de 10 micro-ondes solo - tarif dégressif dès 5 unités","79.90","15/08/2026"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{wch:30},{wch:50},{wch:16},{wch:16}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Propositions");
    XLSX.writeFile(wb, "modele-propositions-commapro.xlsx");
  }

  const filtered = (filterSupplier==="all" ? proposals : proposals.filter(p=>p.supplierName===filterSupplier))
    .slice().sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||""));

  const isExpired = (p) => p.validUntil && p.validUntil < today;
  const isExpiringSoon = (p) => p.validUntil && !isExpired(p) && (new Date(p.validUntil) - new Date(today)) / 86400000 <= 7;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em", color:"var(--t-text-90)" }}>Propositions</h1>
          <div style={{ fontSize:13, color:"var(--t-text-40)", marginTop:2 }}>{proposals.length} offre{proposals.length>1?"s":""} fournisseur{proposals.length>1?"s":""}</div>
        </div>
        {isAdmin && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={downloadTemplate} style={{ ...S.btnGhost, display:"inline-flex", alignItems:"center", gap:6, fontSize:12 }}>
              ⬇ Modèle Excel
            </button>
            <label style={{ ...S.btnSecondary, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6, fontSize:12 }}>
              <FileText size={15} /> Importer Excel
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} style={{ display:"none" }} />
            </label>
            <button onClick={openNew} style={{ ...S.btnPrimary, display:"inline-flex", alignItems:"center", gap:6 }}><Plus size={16}/> Nouvelle proposition</button>
          </div>
        )}
      </div>

      {importMsg && <div style={{ fontSize:12, marginBottom:16, padding:"8px 12px", borderRadius:10, background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)", color:"var(--t-text-85)" }}>{importMsg}</div>}

      {/* Filtre fournisseur */}
      {supplierList.length > 0 && (
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          <button onClick={()=>setFilterSupplier("all")} style={{ padding:"6px 14px", borderRadius:20, border:"1.5px solid", cursor:"pointer", fontSize:12, fontWeight:filterSupplier==="all"?700:400, background:filterSupplier==="all"?"rgba(99,102,241,0.7)":"var(--t-surface)", color:filterSupplier==="all"?"white":"var(--t-text-55)", borderColor:filterSupplier==="all"?"rgba(124,58,237,0.5)":"var(--t-border-subtle)" }}>Tous</button>
          {supplierList.map(s => (
            <button key={s} onClick={()=>setFilterSupplier(s)} style={{ padding:"6px 14px", borderRadius:20, border:"1.5px solid", cursor:"pointer", fontSize:12, fontWeight:filterSupplier===s?700:400, background:filterSupplier===s?"rgba(99,102,241,0.7)":"var(--t-surface)", color:filterSupplier===s?"white":"var(--t-text-55)", borderColor:filterSupplier===s?"rgba(124,58,237,0.5)":"var(--t-border-subtle)" }}>{s}</button>
          ))}
        </div>
      )}

      {/* Formulaire ajout/édition */}
      {showForm && (
        <div style={{ ...S.card, marginBottom:16, border:"1px solid rgba(124,58,237,0.3)" }}>
          <h2 style={{ margin:"0 0 14px 0", fontSize:13, fontWeight:700, color:"var(--t-text-70)", textTransform:"uppercase", letterSpacing:"0.07em" }}>{editing==="new" ? "Nouvelle proposition" : "Modifier la proposition"}</h2>
          <div className="grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Field label="Fournisseur *">
              <select value={form.supplierName} onChange={e=>setForm(f=>({...f,supplierName:e.target.value}))} style={{ ...S.input, background:"var(--t-surface)" }}>
                <option value="">— Choisir —</option>
                {supplierList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Prix proposé HT">
              <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} style={S.input} placeholder="0.00" />
            </Field>
          </div>
          <div style={{ marginBottom:14 }}>
            <Field label="Produit / Description *">
              <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3} placeholder="Ex: Lave-linge 8kg A+++ -20% jusqu'au stock épuisé, livraison offerte..." style={{ ...S.input, resize:"vertical", fontFamily:"inherit", minHeight:70 }} />
            </Field>
          </div>
          <div style={{ marginBottom:16 }}>
            <Field label="Date de validité">
              <input type="date" value={form.validUntil} onChange={e=>setForm(f=>({...f,validUntil:e.target.value}))} style={{ ...S.input, textAlign:"center" }} />
            </Field>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={save} disabled={!form.supplierName||!form.description} style={{ ...S.btnPrimary, flex:1, opacity:(form.supplierName&&form.description)?1:0.45 }}>✓ Enregistrer</button>
            <button onClick={()=>{setShowForm(false);setEditing(null);}} style={S.btnGhost}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste des propositions */}
      {filtered.length === 0 ? (
        <div style={{ ...S.card, padding:40, textAlign:"center", color:"var(--t-text-30)" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🏷️</div>
          <div>Aucune proposition pour l'instant</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(p => {
            const expired = isExpired(p);
            const soon = isExpiringSoon(p);
            return (
              <div key={p.id} style={{ ...S.card, padding:"16px 18px", opacity:expired?0.55:1, border: soon ? "1px solid rgba(245,158,11,0.35)" : undefined }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"var(--t-text-90)" }}>{p.supplierName}</span>
                      {expired && <span style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", background:"var(--t-surface)", padding:"1px 8px", borderRadius:10 }}>Expirée</span>}
                      {!expired && soon && <span style={{ fontSize:10, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.12)", padding:"1px 8px", borderRadius:10 }}>⏰ Expire bientôt</span>}
                    </div>
                    <div style={{ fontSize:13, color:"var(--t-text-85)", lineHeight:1.5, whiteSpace:"pre-wrap" }}>{p.description}</div>
                    <div style={{ display:"flex", gap:16, marginTop:10, flexWrap:"wrap" }}>
                      {p.price > 0 && <div style={{ fontSize:13, fontWeight:700, color:"#34d399" }}>{fmt(p.price)} HT</div>}
                      {p.validUntil && <div style={{ fontSize:12, color:"var(--t-text-40)" }}>Valable jusqu'au {fmtDate(p.validUntil)}</div>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                      <button onClick={()=>openEdit(p)} style={{ ...S.btnSecondary, fontSize:12, padding:"6px 12px" }}>Modifier</button>
                      <ConfirmDeleteButton onConfirm={()=>remove(p.id)} small />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE PAGE — Vue globale de tous les produits, filtrable et analysable
// ═══════════════════════════════════════════════════════════════════════════════
function CataloguePage({ suppliers, setSuppliers, orders, session, setPage, promoCatalogues, setPromoCatalogues }) {
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterFamily,   setFilterFamily]   = useState("all");
  const [filterSubFam,   setFilterSubFam]   = useState("all");
  const [search,         setSearch]         = useState("");
  const [expandedGroup,  setExpandedGroup]  = useState(null);
  const [groupBy,        setGroupBy]        = useState("subfamily");
  const [editingRef,     setEditingRef]     = useState(null);
  const [selectedForSheet, setSelectedForSheet] = useState([]); // produits sélectionnés pour impression fiches
  const showPrices = session.canSeePrices;
  const isAdmin = session.role === "admin";

  function toggleRupture(supplierId, ref) {
    setSuppliers(prev => prev.map(s => s.id!==supplierId ? s : {
      ...s, products: s.products.map(p => p.ref===ref ? {...p, rupture: !p.rupture} : p)
    }));
  }

  function updateProductField(supplierId, ref, field, value) {
    setSuppliers(prev => prev.map(s => s.id!==supplierId ? s : {
      ...s, products: s.products.map(p => p.ref===ref ? {...p, [field]: value} : p)
    }));
  }

  // Aplatir tous les produits avec leur fournisseur
  const allProducts = suppliers.flatMap(s =>
    s.products.map(p => ({ ...p, supplierName: s.name, supplierId: s.id }))
  );

  // Listes de filtres disponibles
  const supplierList = [...new Set(allProducts.map(p => p.supplierName))].sort();
  const familyList   = [...new Set(allProducts.filter(p => p.family).map(p => p.family))].sort();
  const subFamList   = [...new Set(allProducts.filter(p => p.subFamily && (filterFamily==="all" || p.family===filterFamily)).map(p => p.subFamily))].sort();

  // Produits filtrés
  const q = search.toLowerCase().trim();
  const filtered = allProducts.filter(p =>
    (filterSupplier==="all" || p.supplierName===filterSupplier) &&
    (filterFamily==="all"   || p.family===filterFamily) &&
    (filterSubFam==="all"   || p.subFamily===filterSubFam) &&
    (!q || p.ref.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || (p.ean||"").includes(q))
  );

  // Regroupement
  const getGroupKey = (p) => {
    if (groupBy==="supplier")  return p.supplierName || "Sans fournisseur";
    if (groupBy==="family")    return p.family || "Sans famille";
    return p.subFamily || p.family || "Sans catégorie";
  };
  const groups = {};
  filtered.forEach(p => {
    const k = getGroupKey(p);
    if (!groups[k]) groups[k] = [];
    groups[k].push(p);
  });
  const groupEntries = Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));

  // KPIs
  const totalRefs    = filtered.length;
  const withPrice    = filtered.filter(p => p.price > 0).length;
  const withDispo    = filtered.filter(p => p.dispo != null).length;
  const alertCount   = filtered.filter(p => p.dispo != null && p.dispo <= (p.stockMin ?? calcStockMin(p.weeklyVolume)) && (p.stockMin ?? calcStockMin(p.weeklyVolume)) > 0).length;

  const btnFilter = (active) => ({
    padding:"5px 12px", borderRadius:20, border:"1.5px solid", cursor:"pointer", fontSize:12,
    fontWeight: active ? 700 : 400,
    background: active ? "rgba(99,102,241,0.7)" : "var(--t-surface)",
    color: active ? "white" : "var(--t-text-55)",
    borderColor: active ? "rgba(124,58,237,0.5)" : "var(--t-border-subtle)",
  });

  return (
    <div>
      {/* Titre + recherche */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:selectedForSheet.length>0?8:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em", color:"var(--t-text-90)" }}>Référencement</h1>
          <div style={{ fontSize:13, color:"var(--t-text-40)", marginTop:2 }}>{totalRefs} référence{totalRefs>1?"s":""} · {supplierList.length} fournisseur{supplierList.length>1?"s":""}</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)", borderRadius:16, padding:"8px 14px", minWidth:220 }}>
            <Search size={15} style={{ color:"var(--t-text-40)", flexShrink:0 }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Réf, EAN, désignation…" style={{ background:"transparent", border:"none", outline:"none", fontSize:13, color:"var(--t-input-color)", width:"100%" }} />
            {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-40)", padding:0 }}><X size={14} /></button>}
          </div>
        </div>
      </div>
      {/* KPIs rapides */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:20 }}>
        {[
          { label:"Références", value:totalRefs, color:"#7c3aed" },
          { label:"Avec prix", value:withPrice, color:"#34d399" },
          { label:"Avec stock", value:withDispo, color:"#0ea5e9" },
          { label:"Alertes stock", value:alertCount, color:alertCount>0?"#ef4444":"var(--t-text-40)" },
        ].map(k => (
          <div key={k.label} style={{ ...S.card, padding:"14px 16px", textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:800, color:k.color, letterSpacing:"-0.02em" }}>{k.value}</div>
            <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ ...S.card, padding:"14px 16px", marginBottom:16 }}>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-start" }}>
          {/* Regrouper par */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Regrouper par</div>
            <div style={{ display:"flex", gap:6 }}>
              {[["subfamily","Sous-famille"],["family","Famille"],["supplier","Fournisseur"]].map(([k,lbl]) => (
                <button key={k} onClick={()=>{setGroupBy(k);setExpandedGroup(null);}} style={btnFilter(groupBy===k)}>{lbl}</button>
              ))}
            </div>
          </div>
          {/* Filtrer fournisseur */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Fournisseur</div>
            <select value={filterSupplier} onChange={e=>{setFilterSupplier(e.target.value);setFilterFamily("all");setFilterSubFam("all");}} style={{ ...S.input, padding:"5px 10px", fontSize:12, width:"auto" }}>
              <option value="all">Tous</option>
              {supplierList.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Filtrer famille */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Famille</div>
            <select value={filterFamily} onChange={e=>{setFilterFamily(e.target.value);setFilterSubFam("all");}} style={{ ...S.input, padding:"5px 10px", fontSize:12, width:"auto" }}>
              <option value="all">Toutes</option>
              {familyList.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          {/* Filtrer sous-famille */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Sous-famille</div>
            <select value={filterSubFam} onChange={e=>setFilterSubFam(e.target.value)} style={{ ...S.input, padding:"5px 10px", fontSize:12, width:"auto" }}>
              <option value="all">Toutes</option>
              {subFamList.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Reset */}
          {(filterSupplier!=="all"||filterFamily!=="all"||filterSubFam!=="all"||search) && (
            <div style={{ alignSelf:"flex-end" }}>
              <button onClick={()=>{setFilterSupplier("all");setFilterFamily("all");setFilterSubFam("all");setSearch("");}} style={{ ...S.btnGhost, fontSize:12 }}>✕ Réinitialiser</button>
            </div>
          )}
        </div>
      </div>

      {/* Groupes de produits */}
      {groupEntries.length === 0 ? (
        <div style={{ ...S.card, padding:40, textAlign:"center", color:"var(--t-text-30)" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
          <div>Aucun produit trouvé</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {groupEntries.map(([grp, prods]) => {
            const isOpen = expandedGroup === grp;
            const alertsInGroup = prods.filter(p => p.dispo!=null && p.dispo<=(p.stockMin??calcStockMin(p.weeklyVolume)) && (p.stockMin??calcStockMin(p.weeklyVolume))>0).length;
            const totalHT = prods.reduce((s,p)=>s+(p.price||0),0);
            return (
              <div key={grp} style={{ ...S.card, padding:0, overflow:"hidden" }}>
                {/* En-tête du groupe — cliquable */}
                <div onClick={()=>setExpandedGroup(isOpen?null:grp)} style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", transition:"background 0.15s" }} className="lg-row">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"var(--t-text-90)" }}>{grp}</span>
                      <span style={{ fontSize:11, color:"var(--t-text-40)", background:"var(--t-surface)", padding:"1px 8px", borderRadius:10 }}>{prods.length} réf.</span>
                      {alertsInGroup > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#ef4444", background:"rgba(239,68,68,0.1)", padding:"1px 7px", borderRadius:10, border:"1px solid rgba(239,68,68,0.2)" }}>⚠ {alertsInGroup}</span>}
                      {showPrices && <span style={{ fontSize:11, color:"#34d399", fontWeight:600 }}>Valeur : {fmt(totalHT)}</span>}
                    </div>
                    {/* Aperçu des fournisseurs dans ce groupe */}
                    {groupBy!=="supplier" && <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:3 }}>{[...new Set(prods.map(p=>p.supplierName))].join(" · ")}</div>}
                  </div>
                  <div style={{ color:"var(--t-text-40)", fontSize:14, fontWeight:700 }}>{isOpen?"▲":"▼"}</div>
                </div>

                {/* Tableau détaillé */}
                {isOpen && (
                  <div style={{ borderTop:"1px solid var(--t-border-subtle)", overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead>
                        <tr style={{ background:"var(--t-thead-bg)" }}>
                          {["🖨️","Référence","EAN","Désignation","Fournisseur","Famille","Sous-famille",showPrices?"Prix HT":null,showPrices?"Prix vente":null,"Dispo.","Stock min","Réservé",isAdmin?"Statut":null,isAdmin?"":null].filter(x=>x!==null).map((h,i) => (
                            <th key={h+i} style={{ padding:"8px 12px", textAlign:"left", fontSize:10, color:"var(--t-text-55)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prods.map((p,i) => {
                          const stockMin = p.stockMin ?? calcStockMin(p.weeklyVolume);
                          const isAlert = p.dispo!=null && p.dispo<=stockMin && stockMin>0;
                          const isEditing = editingRef === p.ref+p.supplierId;
                          return (
                            <tr key={p.ref+i} style={{ borderBottom:"1px solid var(--t-border-subtle)", background:isEditing?"rgba(124,58,237,0.06)":p.rupture?"rgba(120,120,120,0.06)":isAlert?"rgba(239,68,68,0.04)":"transparent", opacity:p.rupture&&!isEditing?0.5:1 }}>
                              <td style={{ ...S.td, padding:"8px 10px" }}>
                                <input type="checkbox"
                                  checked={selectedForSheet.some(s=>s.ref===p.ref&&s.supplierId===p.supplierId)}
                                  onChange={e => {
                                    const key = p.ref+p.supplierId;
                                    if (e.target.checked) setSelectedForSheet(prev=>[...prev, p]);
                                    else setSelectedForSheet(prev=>prev.filter(s=>!(s.ref===p.ref&&s.supplierId===p.supplierId)));
                                  }}
                                  style={{ width:15, height:15, cursor:"pointer", accentColor:"#E30613" }}
                                />
                              </td>
                              <td style={{ ...S.td, fontFamily:"monospace", fontWeight:600, color:"var(--t-text-85)", fontSize:11 }}>{p.ref}</td>
                              <td style={{ ...S.td, fontFamily:"monospace", fontSize:10, color:"var(--t-text-40)" }}>{p.ean||"—"}</td>
                              <td style={{ ...S.td, maxWidth:200 }}>
                                {isEditing ? (
                                  <input value={p.label} onChange={e=>updateProductField(p.supplierId,p.ref,"label",e.target.value)} style={{ ...S.input, fontSize:11, padding:"4px 8px" }} />
                                ) : (
                                  <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block" }}>{p.label}</span>
                                )}
                              </td>
                              <td style={{ ...S.td, fontSize:11 }}><span style={{ background:"var(--t-surface)", padding:"2px 7px", borderRadius:8, border:"1px solid var(--t-border-subtle)", fontSize:10, color:"var(--t-text-55)", whiteSpace:"nowrap" }}>{p.supplierName}</span></td>
                              <td style={{ ...S.td, fontSize:11, color:"var(--t-text-55)" }}>{p.family||"—"}</td>
                              <td style={{ ...S.td, fontSize:11 }}>{p.subFamily ? <span style={{ background:"var(--t-tag-bg)", color:"var(--t-tag-color)", padding:"1px 7px", borderRadius:8, border:"1px solid var(--t-tag-border)", fontSize:10 }}>{p.subFamily}</span> : "—"}</td>
                              {showPrices && (
                                <td style={{ ...S.td, fontWeight:600, color:"#34d399", whiteSpace:"nowrap" }}>
                                  {isEditing ? (
                                    <input type="number" value={p.price||""} onChange={e=>updateProductField(p.supplierId,p.ref,"price",parseFloat(e.target.value)||0)} style={{ ...S.input, fontSize:11, padding:"4px 8px", width:80 }} placeholder="0.00" />
                                  ) : (p.price>0?fmt(p.price):"—")}
                                </td>
                              )}
                              {showPrices && (
                                <td style={{ ...S.td, fontWeight:600, color:"#7c3aed", whiteSpace:"nowrap" }}>
                                  {isEditing ? (
                                    <input type="number" value={p.prixVente||""} onChange={e=>updateProductField(p.supplierId,p.ref,"prixVente",parseFloat(e.target.value)||0)} style={{ ...S.input, fontSize:11, padding:"4px 8px", width:80 }} />
                                  ) : (p.prixVente?fmt(p.prixVente):"—")}
                                </td>
                              )}
                              <td style={{ ...S.td, fontWeight:700, color:p.dispo==null?"var(--t-text-30)":isAlert?"#ef4444":p.dispo===0?"#ef4444":"#34d399", whiteSpace:"nowrap" }}>{p.dispo!=null?p.dispo:"—"}</td>
                              <td style={{ ...S.td, fontWeight:600, color:"#f59e0b", whiteSpace:"nowrap" }}>
                                {isEditing ? (
                                  <input type="number" value={p.stockMin??""} onChange={e=>updateProductField(p.supplierId,p.ref,"stockMin",parseFloat(e.target.value)||0)} style={{ ...S.input, fontSize:11, padding:"4px 8px", width:70 }} placeholder="Auto" />
                                ) : (stockMin>0?stockMin:"—")}
                              </td>
                              <td style={{ ...S.td, fontWeight:700, color:p.reserved>0?"#f59e0b":"var(--t-text-30)", whiteSpace:"nowrap" }}>
                                {isEditing ? (
                                  <input type="number" value={p.reserved||""} onChange={e=>updateProductField(p.supplierId,p.ref,"reserved",parseFloat(e.target.value)||0)} style={{ ...S.input, fontSize:11, padding:"4px 8px", width:70, color:"#f59e0b" }} placeholder="0" />
                                ) : (p.reserved>0 ? `🔒 ${p.reserved}` : "—")}
                              </td>
                              {isAdmin && (
                                <td style={S.td}>
                                  <button onClick={() => toggleRupture(p.supplierId, p.ref)} style={{
                                    padding:"4px 9px", borderRadius:12, border:"1.5px solid", cursor:"pointer", fontSize:10, fontWeight:700, whiteSpace:"nowrap",
                                    background: p.rupture ? "rgba(239,68,68,0.15)" : "rgba(52,211,153,0.12)",
                                    borderColor: p.rupture ? "rgba(239,68,68,0.4)" : "rgba(52,211,153,0.35)",
                                    color: p.rupture ? "#ef4444" : "#34d399",
                                  }}>
                                    {p.rupture ? "🔴 Rupture" : "🟢 Actif"}
                                  </button>
                                </td>
                              )}
                              {isAdmin && (
                                <td style={S.td}>
                                  <button onClick={() => setEditingRef(isEditing ? null : p.ref+p.supplierId)} style={{
                                    padding:"4px 10px", borderRadius:12, border:"1px solid var(--t-border-subtle)", cursor:"pointer", fontSize:10, fontWeight:600, whiteSpace:"nowrap",
                                    background: isEditing ? "rgba(99,102,241,0.7)" : "var(--t-surface)",
                                    color: isEditing ? "white" : "#7c3aed",
                                  }}>
                                    {isEditing ? "✓ Terminer" : "✏️ Modifier"}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAN EDITOR — éditeur visuel de zones (TG, promo, allée) glisser/redimensionner
// Coordonnées en % du canvas (0–100) pour rester responsive.
// ═══════════════════════════════════════════════════════════════════════════════
const ZONE_TYPES = {
  tg:    { label:"Tête de gondole", color:"#7c3aed" },
  promo: { label:"Zone promo",      color:"#ef4444" },
  allee: { label:"Allée",           color:"#0ea5e9" },
  autre: { label:"Autre",           color:"#64748b" },
};
function PlanEditor({ magasin, zones, catItems, allProducts, isAdmin, onAdd, onUpdate, onRemove, onAddToCatalogue, onAddManual }) {
  const canvasRef = useRef(null);
  const [editing, setEditing] = useState(null);     // zone en cours d'édition (panneau)
  const [zoneSearch, setZoneSearch] = useState(""); // recherche pour ajouter un produit depuis la zone
  const [zoneManual, setZoneManual] = useState(null); // formulaire réf libre depuis la zone
  const [confirmDel, setConfirmDel] = useState(null);
  const drag = useRef(null);                          // { id, mode, ... }

  function pointerPct(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: (cx / r.width) * 100, y: (cy / r.height) * 100, px:cx, py:cy, rect:r };
  }
  function startMove(e, z) {
    if (!isAdmin) return;
    e.stopPropagation();
    const p = pointerPct(e);
    drag.current = { id:z.id, mode:"move", sx:p.x, sy:p.y, ox:z.x, oy:z.y };
  }
  function startResize(e, z) {
    if (!isAdmin) return;
    e.stopPropagation(); e.preventDefault();
    const p = pointerPct(e);
    drag.current = { id:z.id, mode:"resize", sx:p.x, sy:p.y, ow:z.w, oh:z.h };
  }
  function startRotate(e, z) {
    if (!isAdmin) return;
    e.stopPropagation(); e.preventDefault();
    const p = pointerPct(e);
    // centre de la zone en pixels
    const cx = (z.x + z.w/2)/100 * p.rect.width;
    const cy = (z.y + z.h/2)/100 * p.rect.height;
    drag.current = { id:z.id, mode:"rotate", cx, cy, startAngle:z.rot||0, startPointer:Math.atan2(p.py-cy, p.px-cx)*180/Math.PI };
  }
  function onMove(e) {
    if (!drag.current) return;
    const p = pointerPct(e);
    const d = drag.current;
    if (d.mode === "move") {
      const z = zones.find(z=>z.id===d.id);
      let nx = d.ox + (p.x - d.sx), ny = d.oy + (p.y - d.sy);
      nx = Math.max(0, Math.min(100 - z.w, nx));
      ny = Math.max(0, Math.min(100 - z.h, ny));
      onUpdate(d.id, { x: Math.round(nx), y: Math.round(ny) });
    } else if (d.mode === "resize") {
      let nw = d.ow + (p.x - d.sx), nh = d.oh + (p.y - d.sy);
      nw = Math.max(10, Math.min(100, nw)); nh = Math.max(8, Math.min(100, nh));
      onUpdate(d.id, { w: Math.round(nw), h: Math.round(nh) });
    } else if (d.mode === "rotate") {
      const ang = Math.atan2(p.py-d.cy, p.px-d.cx)*180/Math.PI;
      let rot = Math.round(d.startAngle + (ang - d.startPointer));
      // accroche tous les 15° si proche
      const snap = Math.round(rot/15)*15;
      if (Math.abs(rot - snap) <= 4) rot = snap;
      onUpdate(d.id, { rot: ((rot % 360) + 360) % 360 });
    }
  }
  function endMove() { drag.current = null; }

  const editZone = zones.find(z => z.id === editing);

  function exportPDF() {
    const t = (k) => ZONE_TYPES[k] || ZONE_TYPES.autre;
    const zonesHTML = zones.map(z => {
      const c = t(z.type);
      const prods = (z.refs||[]);
      return `<div style="position:absolute;left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%;
        background:${c.color}22;border:2px solid ${c.color};border-radius:6px;box-sizing:border-box;
        padding:5px;overflow:hidden;transform:rotate(${z.rot||0}deg);transform-origin:center;">
        <div style="font-size:10pt;font-weight:800;color:${c.color}">${(z.name||"").replace(/</g,"&lt;")}</div>
        <div style="font-size:7pt;color:#666;font-weight:600">${c.label}</div>
        ${prods.length?`<div style="font-size:7pt;color:#444;margin-top:3px">${prods.map(p=>"• "+p.replace(/</g,"&lt;")).join("<br>")}</div>`:""}
      </div>`;
    }).join("");
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Plan ${magasin}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}@page{size:A4 landscape;margin:8mm}
      @media print{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      html,body{width:281mm;height:194mm;overflow:hidden}
      body{font-family:Arial,sans-serif;padding:0}
      h1{font-size:15pt;margin-bottom:2mm}.sub{font-size:9pt;color:#666;margin-bottom:3mm}
      .canvas{position:relative;width:281mm;height:165mm;border:1.5pt solid #ccc;border-radius:8px;
      page-break-inside:avoid;break-inside:avoid;
      background-image:linear-gradient(#eee 1px,transparent 1px),linear-gradient(90deg,#eee 1px,transparent 1px);background-size:5% 8.33%}</style>
      </head><body>
      <h1>Plan de rayon — ${magasin}</h1>
      <div class="sub">${zones.length} zone(s) · imprimé le ${new Date().toLocaleDateString("fr-FR")}</div>
      <div class="canvas">${zonesHTML}</div>
      <script>setTimeout(()=>window.print(),300)<\/script>
      </body></html>`;
    const blob = new Blob([html], { type:"text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:13, color:"var(--t-text-55)" }}>Plan <b>{magasin}</b> — {zones.length} zone{zones.length>1?"s":""}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {zones.length > 0 && <button onClick={exportPDF} style={S.btnSecondary}>🖨️ Exporter en PDF</button>}
          {isAdmin && <button onClick={onAdd} style={S.btnPrimary}>+ Ajouter une zone</button>}
        </div>
      </div>

      {/* Canvas du plan — plus grand sur desktop via maxWidth */}
      <div
        ref={canvasRef}
        onMouseMove={onMove} onMouseUp={endMove} onMouseLeave={endMove}
        onTouchMove={onMove} onTouchEnd={endMove}
        style={{
          position:"relative", width:"100%", maxWidth:900, margin:"0 auto", aspectRatio:"16/10",
          background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)",
          borderRadius:16, overflow:"hidden", touchAction:"none",
          backgroundImage:"linear-gradient(var(--t-border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--t-border-subtle) 1px, transparent 1px)",
          backgroundSize:"5% 8.33%",
        }}>
        {zones.length === 0 && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--t-text-30)", fontSize:13, textAlign:"center", padding:20 }}>
            {isAdmin ? "Ajoute une zone, puis glisse-la, redimensionne-la et pivote-la sur le plan." : "Aucune zone définie."}
          </div>
        )}
        {zones.map(z => {
          const t = ZONE_TYPES[z.type] || ZONE_TYPES.autre;
          const isEd = editing === z.id;
          return (
            <div key={z.id}
              onMouseDown={(e)=>startMove(e,z)} onTouchStart={(e)=>startMove(e,z)}
              onClick={(e)=>{e.stopPropagation();setEditing(z.id);}}
              style={{
                position:"absolute", left:z.x+"%", top:z.y+"%", width:z.w+"%", height:z.h+"%",
                transform:`rotate(${z.rot||0}deg)`, transformOrigin:"center",
                background:`${t.color}22`, border:`2px solid ${t.color}`, borderRadius:8,
                cursor:isAdmin?"move":"pointer", boxSizing:"border-box",
                padding:6, display:"flex", flexDirection:"column", gap:2,
                boxShadow: isEd ? `0 0 0 3px ${t.color}55` : "none",
              }}>
              <div style={{ fontSize:11, fontWeight:800, color:t.color, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{z.name}</div>
              <div style={{ fontSize:9, color:"var(--t-text-55)", fontWeight:600 }}>{t.label}</div>
              {(z.refs||[]).length > 0 && <div style={{ fontSize:9, color:"var(--t-text-40)" }}>{z.refs.length} produit{z.refs.length>1?"s":""}</div>}
              {isAdmin && (<>
                {/* poignée rotation (haut centre) */}
                <div onMouseDown={(e)=>startRotate(e,z)} onTouchStart={(e)=>startRotate(e,z)}
                  title="Pivoter"
                  style={{ position:"absolute", top:-26, left:"50%", transform:"translateX(-50%)", width:22, height:22, borderRadius:"50%", background:"var(--t-card-bg)", border:`2px solid ${t.color}`, cursor:"grab", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"none" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </div>
                {/* poignée resize (bas droite) — plus grande pour desktop+tactile */}
                <div onMouseDown={(e)=>startResize(e,z)} onTouchStart={(e)=>startResize(e,z)}
                  title="Redimensionner"
                  style={{ position:"absolute", right:-2, bottom:-2, width:22, height:22, cursor:"nwse-resize", background:t.color, borderRadius:"8px 0 8px 0", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"none" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.6"><path d="M9 3v6H3"/></svg>
                </div>
              </>)}
            </div>
          );
        })}
      </div>

      {/* Panneau d'édition de la zone sélectionnée */}
      {editZone && (
        <div style={{ marginTop:14, background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:18, padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Zone : {editZone.name}</div>
            <button onClick={()=>setEditing(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-40)" }}><X size={18}/></button>
          </div>
          {isAdmin ? (<>
            <input value={editZone.name} onChange={e=>onUpdate(editZone.id,{name:e.target.value})} placeholder="Nom de la zone" style={{ ...S.input, width:"100%", boxSizing:"border-box", marginBottom:10 }} />
            <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:6, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Type</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {Object.entries(ZONE_TYPES).map(([k,t]) => (
                <button key={k} onClick={()=>onUpdate(editZone.id,{type:k})} style={{ padding:"6px 12px", borderRadius:10, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background: editZone.type===k?t.color:"var(--t-surface)", color: editZone.type===k?"white":"var(--t-text-55)" }}>{t.label}</button>
              ))}
            </div>
            <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:6, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Rotation</div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <button onClick={()=>onUpdate(editZone.id,{rot:(((editZone.rot||0)-15)%360+360)%360})} style={{ ...S.btnSecondary, padding:"6px 12px" }}>↺ −15°</button>
              <input type="range" min="0" max="345" step="15" value={editZone.rot||0} onChange={e=>onUpdate(editZone.id,{rot:parseInt(e.target.value)})} style={{ flex:1 }} />
              <button onClick={()=>onUpdate(editZone.id,{rot:(((editZone.rot||0)+15)%360)})} style={{ ...S.btnSecondary, padding:"6px 12px" }}>↻ +15°</button>
              <span style={{ fontSize:12, fontWeight:700, color:"var(--t-text-70)", width:42, textAlign:"right" }}>{editZone.rot||0}°</span>
            </div>
            <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:6, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Produits dans cette zone</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
              {(editZone.refs||[]).length === 0 && <div style={{ fontSize:12, color:"var(--t-text-40)" }}>Aucun produit. Cherche ci-dessous pour en ajouter.</div>}
              {(editZone.refs||[]).map(ref => {
                const it = catItems.find(i=>i.ref===ref);
                return (
                  <div key={ref} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.4)", borderRadius:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{it ? it.label : ref}</div>
                      <div style={{ fontSize:10, color:"var(--t-text-40)" }}>{ref}</div>
                    </div>
                    <button onClick={()=>onUpdate(editZone.id, { refs:(editZone.refs||[]).filter(r=>r!==ref) })} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", padding:2 }}><X size={15}/></button>
                  </div>
                );
              })}
            </div>

            {/* Recherche directe : Référencement + réfs libres du catalogue */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, gap:8, flexWrap:"wrap" }}>
              <div style={{ fontSize:11, color:"var(--t-text-40)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Ajouter un produit</div>
              <button onClick={()=>setZoneManual(zoneManual ? null : { ref:"", label:"", prixVente:"" })} style={{ ...S.btnGhost, fontSize:11, padding:"3px 8px" }}>
                {zoneManual ? "Annuler" : "✏️ Réf libre"}
              </button>
            </div>

            {zoneManual ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                <input value={zoneManual.label} onChange={e=>setZoneManual(f=>({...f,label:e.target.value}))} placeholder="Désignation *" style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <input value={zoneManual.ref} onChange={e=>setZoneManual(f=>({...f,ref:e.target.value}))} placeholder="Réf (optionnel)" style={{ ...S.input, flex:1, minWidth:120, boxSizing:"border-box" }} />
                  <input type="number" inputMode="decimal" value={zoneManual.prixVente} onChange={e=>setZoneManual(f=>({...f,prixVente:e.target.value}))} placeholder="Prix vente €" style={{ ...S.input, width:120, boxSizing:"border-box" }} />
                </div>
                <button onClick={()=>{
                  if (!zoneManual.label.trim()) return;
                  const ref = zoneManual.ref.trim() || "LIBRE-"+Date.now();
                  onAddManual(ref, zoneManual.label.trim(), zoneManual.prixVente);  // crée la ligne libre dans le catalogue
                  onUpdate(editZone.id, { refs:[...(editZone.refs||[]), ref] });      // place dans la zone
                  setZoneManual(null);
                }} style={{ ...S.btnPrimary, width:"100%" }}>Créer et placer dans la zone</button>
              </div>
            ) : (<>
            <input value={zoneSearch} onChange={e=>setZoneSearch(e.target.value)} placeholder="Chercher par réf, EAN ou nom…" style={{ ...S.input, width:"100%", boxSizing:"border-box", marginBottom:8 }} />
            {zoneSearch.trim() && (
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
                {(() => {
                  const q = zoneSearch.toLowerCase();
                  // Réfs du Référencement + réfs libres déjà dans le catalogue (catItems)
                  const libres = (catItems||[]).filter(it => it.manual).map(it => ({ ...it, supplierId:"libre", supplierName: it.supplierName||"Réf libre" }));
                  const refMap = {};
                  [...libres, ...(allProducts||[])].forEach(p => { if(!refMap[p.ref]) refMap[p.ref]=p; });
                  return Object.values(refMap).filter(p =>
                    (p.label||"").toLowerCase().includes(q) || (p.ref||"").toLowerCase().includes(q) || (p.ean||"").includes(q)
                  ).slice(0,8).map(p => {
                    const inZone = (editZone.refs||[]).includes(p.ref);
                    return (
                      <div key={(p.supplierId||"")+p.ref} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"8px 12px", background:"var(--t-surface)", borderRadius:10 }}>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}{p.manual && <span style={{ fontSize:10, color:"#7c3aed", marginLeft:6 }}>libre</span>}</div>
                          <div style={{ fontSize:11, color:"var(--t-text-40)" }}>{p.ref} · {p.supplierName}</div>
                        </div>
                        <button disabled={inZone} onClick={()=>{
                          if (!p.manual) onAddToCatalogue(p);   // produit du Référencement → ajoute au catalogue
                          if (!inZone) onUpdate(editZone.id, { refs:[...(editZone.refs||[]), p.ref] });
                        }} style={{ ...(inZone?S.btnSecondary:S.btnPrimary), padding:"6px 14px", fontSize:12, opacity:inZone?0.5:1 }}>
                          {inZone ? "✓ Ici" : "+ Ajouter"}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            </>)}
            <button onClick={()=>setConfirmDel(editZone.id)} style={{ ...S.btnGhost, color:"#ef4444", width:"100%" }}>Supprimer la zone</button>
          </>) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {(editZone.refs||[]).length === 0 ? <div style={{ fontSize:12, color:"var(--t-text-40)" }}>Aucun produit dans cette zone.</div>
                : (editZone.refs||[]).map(ref => {
                    const it = catItems.find(i=>i.ref===ref);
                    return <div key={ref} style={{ fontSize:13, padding:"6px 10px", background:"var(--t-surface)", borderRadius:8 }}>{it ? it.label : ref}</div>;
                  })}
            </div>
          )}
        </div>
      )}
      <ConfirmModal data={confirmDel ? { title:"Supprimer la zone", message:"Cette zone et son affectation de produits seront supprimées du plan.", onYes:()=>{ onRemove(confirmDel); setEditing(null); } } : null} onClose={()=>setConfirmDel(null)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUES PROMO — sélections promotionnelles mensuelles
// ═══════════════════════════════════════════════════════════════════════════════
function CataloguesPage({ promoCatalogues, setPromoCatalogues, suppliers, session, setPage, setSelectedProduct, orders, setOrders }) {
  const showPrices = session.canSeePrices;
  const isAdmin = session.role === "admin";
  const [openId, setOpenId] = useState(null);       // catalogue ouvert
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name:"", start:"", end:"" });
  const [addingTo, setAddingTo] = useState(null);   // catalogue où on ajoute des produits
  const [search, setSearch] = useState("");
  const [catTab, setCatTab] = useState("produits");  // produits | plan-nord | plan-sud
  const [manualForm, setManualForm] = useState(null);  // {ref,label,prixVente} ou null
  const [confirmDelCat, setConfirmDelCat] = useState(null);
  const [editingDates, setEditingDates] = useState(false);
  const DEPOTS_GEN = ["Magasin Nord", "Magasin Sud", "Dépôt Nord", "Dépôt Sud", "Dépôt Port"];
  const [genOpen, setGenOpen] = useState(false);          // panneau de génération de brouillon
  const [genQty, setGenQty] = useState({});                // { ref: { "Magasin Nord": 5, ... } }
  const [hiddenDepots, setHiddenDepots] = useState([]);    // dépôts masqués
  const [genMsg, setGenMsg] = useState("");

  const allProducts = useMemo(() => {
    const list = [];
    suppliers.forEach(s => (s.products||[]).forEach(p => list.push({ ...p, supplierName: s.name, supplierId: s.id })));
    return list;
  }, [suppliers]);

  const cats = promoCatalogues || [];

  function statusOf(c) {
    const today = new Date().toISOString().slice(0,10);
    if (c.status === "brouillon") return { key:"brouillon", label:"Brouillon", color:"#94a3b8", bg:"rgba(148,163,184,0.15)" };
    if (c.end && c.end < today)    return { key:"termine",   label:"Terminé",   color:"#94a3b8", bg:"rgba(148,163,184,0.15)" };
    if (c.start && c.start > today) return { key:"avenir",   label:"À venir",   color:"#0ea5e9", bg:"rgba(14,165,233,0.15)" };
    return { key:"actif", label:"Actif", color:"#22c55e", bg:"rgba(34,197,94,0.15)" };
  }

  function createCatalogue() {
    if (!form.name.trim()) return;
    const c = { id:"cat_"+Date.now(), name:form.name.trim(), start:form.start, end:form.end, status:"brouillon", items:[], createdAt:new Date().toISOString() };
    setPromoCatalogues(prev => [...(prev||[]), c]);
    setForm({ name:"", start:"", end:"" }); setCreating(false); setOpenId(c.id);
  }

  function deleteCatalogue(id) {
    setConfirmDelCat(id);
  }
  function doDeleteCatalogue(id) {
    setPromoCatalogues(prev => prev.filter(c => c.id !== id));
    if (openId === id) setOpenId(null);
  }

  function setStatus(id, status) {
    setPromoCatalogues(prev => prev.map(c => c.id===id ? { ...c, status } : c));
  }

  function updateDates(id, start, end) {
    setPromoCatalogues(prev => prev.map(c => c.id===id ? { ...c, start, end } : c));
  }

  function exportCatalogue(cat) {
    const data = { _commapro_catalogue: true, _version:1, _exportedAt:new Date().toISOString(), catalogue: cat };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (cat.name||"catalogue").replace(/[^a-z0-9]/gi,"-").toLowerCase();
    a.href = url; a.download = `commapro-catalogue-${safe}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }

  // Génère des brouillons de commande (1 par fournisseur) à partir des qtés saisies par dépôt
  function generateDraftsFromCatalogue(cat) {
    const items = cat.items || [];
    const bySupplier = {};
    items.forEach(it => {
      const qByDepot = genQty[it.ref] || {};
      const visibleDepots = DEPOTS_GEN.filter(d=>!hiddenDepots.includes(d));
      const totalQty = visibleDepots.reduce((s,d)=> s + (parseInt(qByDepot[d])||0), 0);
      if (totalQty <= 0) return;
      const suppName = it.manual ? "Réfs libres" : (it.supplierName || "Réfs libres");
      if (!bySupplier[suppName]) bySupplier[suppName] = [];
      const depotDetail = {};
      visibleDepots.forEach(d => { const q=parseInt(qByDepot[d])||0; if(q>0) depotDetail[d]=q; });
      bySupplier[suppName].push({ ref: it.ref, label: it.label, qty: totalQty, price: 0, family: "", subFamily: "", depotQty: depotDetail });
    });

    const suppNames = Object.keys(bySupplier);
    if (suppNames.length === 0) { setGenMsg("⚠️ Saisis au moins une quantité avant de générer."); return; }

    let workingOrders = [...orders];
    const created = [];
    suppNames.forEach(name => {
      const supplier = suppliers.find(s => s.name === name);
      const id = genOrderId(workingOrders);
      const draft = {
        id, userId: session.id, supplierName: name,
        commercial: supplier?.commercial || "", email: supplier?.email || "",
        date: new Date().toISOString().split("T")[0], deliveryDate: "", deliveryPlace: "",
        notes: `Généré depuis le catalogue « ${cat.name} »`,
        lines: bySupplier[name],
        status: "brouillon", statusHistory: { brouillon: new Date().toISOString() },
        createdBy: session.name,
      };
      workingOrders = [draft, ...workingOrders];
      created.push(draft);
    });
    setOrders(workingOrders);
    setGenMsg(`✅ ${created.length} brouillon(s) créé(s) : ${suppNames.join(", ")}. Retrouve-les dans Commandes.`);
    setGenOpen(false); setGenQty({});
  }

  function addProduct(catId, prod) {
    setPromoCatalogues(prev => prev.map(c => {
      if (c.id !== catId) return c;
      if ((c.items||[]).some(it => it.ref === prod.ref)) return c; // déjà dedans
      const item = {
        ref: prod.ref, label: prod.label, supplierName: prod.supplierName,
        prixVente: prod.prixVente || null,       // prix normal (référence)
        promoType: "euro",                        // "euro" ou "pct"
        promoValue: prod.prixVente || 0,          // valeur saisie
      };
      return { ...c, items:[...(c.items||[]), item] };
    }));
  }

  // Ajout d'une ligne LIBRE (réf créée à la main, hors Référencement)
  function addManualItem(catId, ref, label, prixVente) {
    setPromoCatalogues(prev => prev.map(c => {
      if (c.id !== catId) return c;
      if (ref && (c.items||[]).some(it => it.ref === ref)) return c;
      const pv = parseFloat(prixVente) || null;
      const item = {
        ref: ref || "LIBRE-"+Date.now(), label: label || "Produit", supplierName: "—",
        prixVente: pv, promoType: "euro", promoValue: pv || 0, manual: true,
      };
      return { ...c, items:[...(c.items||[]), item] };
    }));
  }

  function removeItem(catId, ref) {
    setPromoCatalogues(prev => prev.map(c => c.id!==catId ? c : { ...c, items:(c.items||[]).filter(it=>it.ref!==ref) }));
  }

  function updateItem(catId, ref, patch) {
    setPromoCatalogues(prev => prev.map(c => c.id!==catId ? c : {
      ...c, items:(c.items||[]).map(it => it.ref===ref ? { ...it, ...patch } : it)
    }));
  }

  // ── Plans de rayon (zones) par magasin ──────────────────────────────────────
  // Stockés dans c.plans = { "Magasin Nord": [zones], "Magasin Sud": [zones] }
  // Une zone : { id, name, type, x, y, w, h, refs:[] }
  function getZones(cat, magasin) { return ((cat.plans||{})[magasin]) || []; }
  function setZones(catId, magasin, zones) {
    setPromoCatalogues(prev => prev.map(c => c.id!==catId ? c : {
      ...c, plans: { ...(c.plans||{}), [magasin]: zones }
    }));
  }
  function addZone(catId, magasin) {
    const zones = getZones(cats.find(c=>c.id===catId)||{}, magasin);
    const z = { id:"z_"+Date.now(), name:"Nouvelle zone", type:"tg", x:8, y:8, w:42, h:24, rot:0, refs:[] };
    setZones(catId, magasin, [...zones, z]);
  }
  function updateZone(catId, magasin, zid, patch) {
    const zones = getZones(cats.find(c=>c.id===catId)||{}, magasin);
    setZones(catId, magasin, zones.map(z => z.id===zid ? { ...z, ...patch } : z));
  }
  function removeZone(catId, magasin, zid) {
    const zones = getZones(cats.find(c=>c.id===catId)||{}, magasin);
    setZones(catId, magasin, zones.filter(z => z.id!==zid));
  }

  // Calcule le prix promo final et la remise % à partir du type/valeur saisis
  function promoPrice(it) {
    const base = it.prixVente || 0;
    if (it.promoType === "pct") {
      const p = base * (1 - (it.promoValue||0)/100);
      return Math.max(0, Math.round(p*100)/100);
    }
    return it.promoValue || 0;
  }
  function promoPct(it) {
    const base = it.prixVente || 0;
    if (!base) return null;
    if (it.promoType === "pct") return it.promoValue || 0;
    return Math.round((1 - (it.promoValue||0)/base) * 100);
  }

  const openCat = cats.find(c => c.id === openId);

  // ───────── Vue : un catalogue ouvert ─────────
  if (openCat) {
    const st = statusOf(openCat);
    const filtered = allProducts.filter(p => {
      if (!search.trim()) return false;
      const q = search.toLowerCase();
      return (p.label||"").toLowerCase().includes(q) || (p.ref||"").toLowerCase().includes(q) || (p.ean||"").includes(q);
    }).slice(0, 12);

    return (
      <div>
        <button onClick={()=>{setOpenId(null);setAddingTo(null);}} style={{ ...S.btnGhost, marginBottom:14 }}>← Tous les catalogues</button>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:18 }}>
          <div>
            <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em" }}>{openCat.name}</h1>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, fontWeight:700, color:st.color, background:st.bg, padding:"3px 10px", borderRadius:20 }}>{st.label}</span>
              {openCat.start && openCat.end && (
                <span style={{ fontSize:12, color:"var(--t-text-55)" }}>
                  {openCat.start.split("-").reverse().join("/")} → {openCat.end.split("-").reverse().join("/")}
                </span>
              )}
              <span style={{ fontSize:12, color:"var(--t-text-40)" }}>{(openCat.items||[]).length} produit{(openCat.items||[]).length>1?"s":""}</span>
              {isAdmin && openCat.status==="brouillon" && (
                <button onClick={()=>setEditingDates(v=>!v)} style={{ ...S.btnGhost, fontSize:11, padding:"3px 8px" }}>{editingDates ? "Fermer" : "📅 Modifier les dates"}</button>
              )}
            </div>
            {/* Édition des dates (uniquement en brouillon) */}
            {isAdmin && editingDates && openCat.status==="brouillon" && (
              <div style={{ display:"flex", gap:10, marginTop:12, flexWrap:"wrap", alignItems:"flex-end" }}>
                <label>
                  <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:4 }}>Début</div>
                  <input type="date" value={openCat.start||""} onChange={e=>updateDates(openCat.id, e.target.value, openCat.end)} style={{ ...S.input, boxSizing:"border-box" }} />
                </label>
                <label>
                  <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:4 }}>Fin</div>
                  <input type="date" value={openCat.end||""} onChange={e=>updateDates(openCat.id, openCat.start, e.target.value)} style={{ ...S.input, boxSizing:"border-box" }} />
                </label>
              </div>
            )}
          </div>
          {isAdmin && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>exportCatalogue(openCat)} style={S.btnSecondary}>⬇️ Exporter</button>
              {(openCat.items||[]).length > 0 && <button onClick={()=>{ setGenOpen(true); setGenMsg(""); }} style={S.btnSecondary}>🧾 Générer un brouillon</button>}
              {openCat.status==="brouillon"
                ? <button onClick={()=>setStatus(openCat.id,"actif")} style={S.btnPrimary}>Activer</button>
                : <button onClick={()=>setStatus(openCat.id,"brouillon")} style={S.btnSecondary}>Repasser en brouillon</button>}
            </div>
          )}
        </div>

        {genMsg && <div style={{ fontSize:13, fontWeight:600, marginBottom:14, color: genMsg.startsWith("✅")?"#22c55e":"#f59e0b" }}>{genMsg}</div>}

        {/* Panneau de génération de brouillon : quantités par dépôt */}
        {genOpen && (
          <div style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:18, padding:16, marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, flexWrap:"wrap", gap:8 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>🧾 Générer un brouillon — quantités par dépôt</div>
              <button onClick={()=>setGenOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-40)" }}><X size={18}/></button>
            </div>
            <div style={{ fontSize:12, color:"var(--t-text-55)", marginBottom:12 }}>Saisis les quantités à commander pour chaque dépôt. Un brouillon par fournisseur sera créé (produits sans quantité ignorés).</div>

            {/* Masquer des dépôts */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {DEPOTS_GEN.map(d => {
                const hidden = hiddenDepots.includes(d);
                return <button key={d} onClick={()=>setHiddenDepots(prev => hidden ? prev.filter(x=>x!==d) : [...prev, d])} style={{ padding:"5px 10px", borderRadius:16, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background: hidden?"var(--t-surface)":"#7c3aed", color: hidden?"var(--t-text-40)":"white", textDecoration: hidden?"line-through":"none" }}>{d}</button>;
              })}
            </div>

            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid var(--t-border-subtle)" }}>
                    <th style={{ textAlign:"left", padding:"6px 8px", fontWeight:700, position:"sticky", left:0, background:"var(--t-card-bg)" }}>Produit</th>
                    {DEPOTS_GEN.filter(d=>!hiddenDepots.includes(d)).map(d => <th key={d} style={{ padding:"6px 8px", fontWeight:700, minWidth:80 }}>{d}</th>)}
                    <th style={{ padding:"6px 8px", fontWeight:700 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(openCat.items||[]).map(it => {
                    const visible = DEPOTS_GEN.filter(d=>!hiddenDepots.includes(d));
                    const total = visible.reduce((s,d)=> s + (parseInt((genQty[it.ref]||{})[d])||0), 0);
                    return (
                      <tr key={it.ref} style={{ borderBottom:"1px solid var(--t-border-subtle)" }}>
                        <td style={{ padding:"6px 8px", position:"sticky", left:0, background:"var(--t-card-bg)" }}>
                          <div style={{ fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:160 }}>{it.label}{it.manual && <span style={{ fontSize:9, color:"#7c3aed", marginLeft:4 }}>libre</span>}</div>
                          <div style={{ fontSize:10, color:"var(--t-text-40)" }}>{it.ref} · {it.supplierName||"—"}</div>
                        </td>
                        {visible.map(d => (
                          <td key={d} style={{ padding:"4px 6px", textAlign:"center" }}>
                            <input type="number" inputMode="numeric" min="0"
                              value={(genQty[it.ref]||{})[d] || ""}
                              onChange={e=>setGenQty(prev => ({ ...prev, [it.ref]: { ...(prev[it.ref]||{}), [d]: e.target.value } }))}
                              style={{ ...S.input, width:56, padding:"5px 6px", textAlign:"center" }} placeholder="0" />
                          </td>
                        ))}
                        <td style={{ padding:"6px 8px", textAlign:"center", fontWeight:700, color: total>0?"#7c3aed":"var(--t-text-30)" }}>{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button onClick={()=>generateDraftsFromCatalogue(openCat)} style={{ ...S.btnPrimary, width:"100%", marginTop:14 }}>✓ Créer les brouillons</button>
          </div>
        )}

        {/* Onglets : Produits / Plan Nord / Plan Sud */}
        <div style={{ display:"flex", gap:6, marginBottom:18, borderBottom:"1px solid var(--t-border-subtle)", overflowX:"auto" }}>
          {[["produits","Produits"],["plan-Magasin Nord","Plan Nord"],["plan-Magasin Sud","Plan Sud"]].map(([k,lbl]) => (
            <button key={k} onClick={()=>setCatTab(k)} style={{
              padding:"10px 16px", border:"none", background:"transparent", cursor:"pointer",
              fontSize:14, fontWeight:700, whiteSpace:"nowrap",
              color: catTab===k ? "#7c3aed" : "var(--t-text-40)",
              borderBottom: catTab===k ? "2px solid #7c3aed" : "2px solid transparent",
              marginBottom:-1,
            }}>{lbl}</button>
          ))}
        </div>

        {catTab === "produits" && (<>
        {/* Ajout de produits */}
        {isAdmin && (
          <div style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:18, padding:16, marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, gap:10, flexWrap:"wrap" }}>
              <div style={{ fontSize:13, fontWeight:700 }}>Ajouter un produit</div>
              <button onClick={()=>setManualForm(manualForm ? null : { ref:"", label:"", prixVente:"" })} style={{ ...S.btnGhost, fontSize:12 }}>
                {manualForm ? "Annuler" : "✏️ Créer une réf libre"}
              </button>
            </div>

            {manualForm ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ fontSize:11, color:"var(--t-text-40)" }}>Produit hors référencement (n'affecte pas ta base produits)</div>
                <input value={manualForm.label} onChange={e=>setManualForm(f=>({...f,label:e.target.value}))} placeholder="Désignation *" style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <input value={manualForm.ref} onChange={e=>setManualForm(f=>({...f,ref:e.target.value}))} placeholder="Référence (optionnel)" style={{ ...S.input, flex:1, minWidth:130, boxSizing:"border-box" }} />
                  <input type="number" inputMode="decimal" value={manualForm.prixVente} onChange={e=>setManualForm(f=>({...f,prixVente:e.target.value}))} placeholder="Prix vente €" style={{ ...S.input, width:120, boxSizing:"border-box" }} />
                </div>
                <button onClick={()=>{
                  if (!manualForm.label.trim()) return;
                  addManualItem(openCat.id, manualForm.ref.trim(), manualForm.label.trim(), manualForm.prixVente);
                  setManualForm(null);
                }} style={{ ...S.btnPrimary, width:"100%" }}>Ajouter au catalogue</button>
              </div>
            ) : (<>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Chercher par réf, EAN ou nom…" style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
            {filtered.length > 0 && (
              <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
                {filtered.map(p => {
                  const already = (openCat.items||[]).some(it=>it.ref===p.ref);
                  return (
                    <div key={p.supplierId+p.ref} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"8px 12px", background:"var(--t-surface)", borderRadius:10 }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}</div>
                        <div style={{ fontSize:11, color:"var(--t-text-40)" }}>{p.ref} · {p.supplierName}{showPrices && p.prixVente ? " · "+fmt(p.prixVente) : ""}</div>
                      </div>
                      <button disabled={already} onClick={()=>addProduct(openCat.id, p)} style={{ ...(already?S.btnSecondary:S.btnPrimary), padding:"6px 14px", fontSize:12, opacity:already?0.5:1 }}>
                        {already ? "✓ Ajouté" : "+ Ajouter"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            </>)}
          </div>
        )}

        {/* Liste des produits du catalogue */}
        {(openCat.items||[]).length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--t-text-40)" }}>Aucun produit dans ce catalogue. {isAdmin && "Ajoute-en avec la recherche ci-dessus."}</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(openCat.items||[]).map(it => {
              const pct = promoPct(it);
              const finalPrice = promoPrice(it);
              return (
                <div key={it.ref} style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:16, padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700 }}>{it.label}</div>
                      <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:2 }}>{it.ref} · {it.supplierName}</div>
                    </div>
                    {isAdmin && <button onClick={()=>removeItem(openCat.id, it.ref)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", padding:4 }}><X size={16}/></button>}
                  </div>
                  {showPrices && (
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:12, flexWrap:"wrap" }}>
                      {it.prixVente != null && <div style={{ fontSize:12, color:"var(--t-text-40)", textDecoration:"line-through" }}>{fmt(it.prixVente)}</div>}
                      <div style={{ fontSize:18, fontWeight:800, color:"#7c3aed" }}>{fmt(finalPrice)}</div>
                      {pct != null && pct !== 0 && <span style={{ fontSize:12, fontWeight:700, color:"#22c55e", background:"rgba(34,197,94,0.12)", padding:"2px 8px", borderRadius:6 }}>−{pct}%</span>}
                      {isAdmin && (
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:"auto" }}>
                          <input type="number" inputMode="decimal" value={it.promoValue} onChange={e=>updateItem(openCat.id, it.ref, { promoValue: parseFloat(e.target.value)||0 })} style={{ ...S.input, width:80, padding:"6px 8px", textAlign:"right" }} />
                          <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:"1px solid var(--t-input-border)" }}>
                            <button onClick={()=>updateItem(openCat.id, it.ref, { promoType:"euro" })} style={{ padding:"6px 10px", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background: it.promoType==="euro"?"#7c3aed":"transparent", color: it.promoType==="euro"?"white":"var(--t-text-55)" }}>€</button>
                            <button onClick={()=>updateItem(openCat.id, it.ref, { promoType:"pct" })} style={{ padding:"6px 10px", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background: it.promoType==="pct"?"#7c3aed":"transparent", color: it.promoType==="pct"?"white":"var(--t-text-55)" }}>%</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>)}

        {catTab.startsWith("plan-") && (
          <PlanEditor
            magasin={catTab.slice(5)}
            zones={getZones(openCat, catTab.slice(5))}
            catItems={openCat.items||[]}
            allProducts={allProducts}
            isAdmin={isAdmin}
            onAdd={()=>addZone(openCat.id, catTab.slice(5))}
            onUpdate={(zid,patch)=>updateZone(openCat.id, catTab.slice(5), zid, patch)}
            onRemove={(zid)=>removeZone(openCat.id, catTab.slice(5), zid)}
            onAddToCatalogue={(p)=>addProduct(openCat.id, p)}
            onAddManual={(ref,label,pv)=>addManualItem(openCat.id, ref, label, pv)}
          />
        )}
      </div>
    );
  }
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:18 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em" }}>Catalogues</h1>
          <div style={{ fontSize:13, color:"var(--t-text-55)", marginTop:4 }}>Tes sélections promotionnelles</div>
        </div>
        {isAdmin && <button onClick={()=>setCreating(true)} style={S.btnPrimary}>+ Nouveau catalogue</button>}
      </div>

      {creating && (
        <div style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:18, padding:18, marginBottom:18 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Nouveau catalogue</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nom (ex: Promo Juin, Black Friday…)" style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <label style={{ flex:1, minWidth:130 }}>
                <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:4 }}>Début</div>
                <input type="date" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))} style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
              </label>
              <label style={{ flex:1, minWidth:130 }}>
                <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:4 }}>Fin</div>
                <input type="date" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))} style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
              </label>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={createCatalogue} style={{ ...S.btnPrimary, flex:1 }}>Créer</button>
              <button onClick={()=>{setCreating(false);setForm({name:"",start:"",end:""});}} style={S.btnGhost}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {cats.length === 0 && !creating ? (
        <div style={{ textAlign:"center", padding:"50px 20px", color:"var(--t-text-40)" }}>
          <Folder size={40} color="var(--t-text-30)" style={{ marginBottom:12 }}/>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Aucun catalogue pour l'instant</div>
          <div style={{ fontSize:13 }}>{isAdmin ? "Crée ton premier catalogue promo." : "Aucun catalogue disponible."}</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {cats.map(c => {
            const st = statusOf(c);
            const nbItems = (c.items||[]).length;
            return (
              <div key={c.id} onClick={()=>setOpenId(c.id)} style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:18, padding:"16px 18px", cursor:"pointer", boxShadow:"var(--t-card-shadow)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <span style={{ fontSize:16, fontWeight:700 }}>{c.name}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:st.color, background:st.bg, padding:"2px 9px", borderRadius:20 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize:12, color:"var(--t-text-55)", marginTop:6 }}>
                      {nbItems} produit{nbItems>1?"s":""}
                      {c.start && c.end && " · " + c.start.split("-").reverse().join("/") + " → " + c.end.split("-").reverse().join("/")}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {isAdmin && <button onClick={(e)=>{e.stopPropagation();deleteCatalogue(c.id);}} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-30)", padding:4 }}><X size={16}/></button>}
                    <span style={{ fontSize:18, color:"var(--t-text-30)" }}>›</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmModal data={confirmDelCat ? { title:"Supprimer le catalogue", message:"Le catalogue et son plan seront supprimés. Les produits de ton référencement ne sont pas touchés.", onYes:()=>doDeleteCatalogue(confirmDelCat) } : null} onClose={()=>setConfirmDelCat(null)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TÂCHES — liste collaborative avec assignation, priorité, commentaires
// ═══════════════════════════════════════════════════════════════════════════════
function TasksPage({ tasks, setTasks, users, suppliers, orders, session, setPage, setOrderFilter }) {
  const [view, setView] = useState("mine");     // mine | assigned | all
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [comment, setComment] = useState("");
  const [confirmDelTask, setConfirmDelTask] = useState(null);
  const blankForm = { title:"", due:"", assignee:"", priority:"normale", notes:"", linkType:"none", linkId:"" };
  const [form, setForm] = useState(blankForm);

  const PRIORITIES = {
    basse:   { label:"Basse",   color:"#94a3b8", bg:"rgba(148,163,184,0.15)" },
    normale: { label:"Normale", color:"#0ea5e9", bg:"rgba(14,165,233,0.15)" },
    haute:   { label:"Haute",   color:"#f59e0b", bg:"rgba(245,158,11,0.15)" },
    urgente: { label:"Urgente", color:"#ef4444", bg:"rgba(239,68,68,0.15)" },
  };
  const STATUSES = {
    todo:  { label:"À faire",  color:"#94a3b8" },
    doing: { label:"En cours", color:"#0ea5e9" },
    done:  { label:"Terminé",  color:"#22c55e" },
  };

  const activeUsers = (users||[]).filter(u => u.active);
  const userName = (id) => (users.find(u=>u.id===id)||{}).name || "—";
  const list = tasks || [];

  function createTask() {
    if (!form.title.trim()) return;
    const t = {
      id:"task_"+Date.now(), title:form.title.trim(), due:form.due,
      assignee:form.assignee || session.id, createdBy:session.id,
      priority:form.priority, notes:form.notes, status:"todo",
      linkType:form.linkType, linkId:form.linkId,
      comments:[], createdAt:new Date().toISOString(),
    };
    setTasks(prev => [...(prev||[]), t]);
    setForm(blankForm); setCreating(false);
  }
  function patchTask(id, patch) {
    setTasks(prev => prev.map(t => t.id===id ? { ...t, ...patch } : t));
  }
  function deleteTask(id) {
    setConfirmDelTask(id);
  }
  function doDeleteTask(id) {
    setTasks(prev => prev.filter(t => t.id!==id));
    if (openId===id) setOpenId(null);
  }
  function addComment(id) {
    if (!comment.trim()) return;
    setTasks(prev => prev.map(t => t.id!==id ? t : {
      ...t, comments:[...(t.comments||[]), { by:session.id, text:comment.trim(), at:new Date().toISOString() }]
    }));
    setComment("");
  }
  function cycleStatus(t) {
    const next = t.status==="todo" ? "doing" : t.status==="doing" ? "done" : "todo";
    patchTask(t.id, { status:next });
  }

  const filtered = list.filter(t => {
    if (view==="mine")     return t.assignee === session.id;
    if (view==="assigned") return t.createdBy === session.id && t.assignee !== session.id;
    return true;
  }).sort((a,b) => {
    const ord = { urgente:0, haute:1, normale:2, basse:3 };
    if (a.status==="done" && b.status!=="done") return 1;
    if (b.status==="done" && a.status!=="done") return -1;
    return (ord[a.priority]??2) - (ord[b.priority]??2);
  });

  const openTask = list.find(t => t.id===openId);

  // ───────── Détail d'une tâche ─────────
  if (openTask) {
    const pr = PRIORITIES[openTask.priority] || PRIORITIES.normale;
    const linkedOrder = openTask.linkType==="order" ? orders.find(o=>o.id===openTask.linkId) : null;
    const linkedSupp  = openTask.linkType==="supplier" ? suppliers.find(s=>s.id===openTask.linkId) : null;
    return (
      <div>
        <button onClick={()=>setOpenId(null)} style={{ ...S.btnGhost, marginBottom:14 }}>← Toutes les tâches</button>
        <div style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:18, padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
            <h1 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:"-0.02em", flex:1 }}>{openTask.title}</h1>
            <button onClick={()=>deleteTask(openTask.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", padding:4 }}><X size={18}/></button>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
            <button onClick={()=>cycleStatus(openTask)} style={{ fontSize:12, fontWeight:700, color:STATUSES[openTask.status].color, background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)", padding:"5px 12px", borderRadius:20, cursor:"pointer" }}>● {STATUSES[openTask.status].label}</button>
            <span style={{ fontSize:12, fontWeight:700, color:pr.color, background:pr.bg, padding:"5px 12px", borderRadius:20 }}>{pr.label}</span>
            {openTask.due && <span style={{ fontSize:12, color:"var(--t-text-55)", padding:"5px 0" }}>📅 {openTask.due.split("-").reverse().join("/")}</span>}
          </div>
          <div style={{ marginTop:16, fontSize:13, color:"var(--t-text-70)" }}>
            <div style={{ marginBottom:4 }}>Assignée à <b>{userName(openTask.assignee)}</b></div>
            <div style={{ color:"var(--t-text-40)", fontSize:12 }}>Créée par {userName(openTask.createdBy)}</div>
          </div>
          {openTask.notes && <div style={{ marginTop:14, fontSize:13, color:"var(--t-text-70)", background:"var(--t-surface)", borderRadius:12, padding:"12px 14px", whiteSpace:"pre-line" }}>{openTask.notes}</div>}
          {(linkedOrder || linkedSupp) && (
            <button onClick={()=>{ if(linkedOrder){setOrderFilter("all");setPage("orders");} else setPage("suppliers"); }} style={{ ...S.btnSecondary, marginTop:14, fontSize:12 }}>
              🔗 {linkedOrder ? "Commande "+(linkedOrder.ref||linkedOrder.id) : "Fournisseur "+linkedSupp.name}
            </button>
          )}

          {/* Commentaires */}
          <div style={{ marginTop:20, borderTop:"1px solid var(--t-border-subtle)", paddingTop:16 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Commentaires ({(openTask.comments||[]).length})</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
              {(openTask.comments||[]).map((c,i) => (
                <div key={i} style={{ background:"var(--t-surface)", borderRadius:10, padding:"8px 12px" }}>
                  <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:2 }}>{userName(c.by)} · {new Date(c.at).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>
                  <div style={{ fontSize:13, color:"var(--t-text-85)" }}>{c.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addComment(openTask.id)} placeholder="Ajouter un commentaire…" style={{ ...S.input, flex:1 }} />
              <button onClick={()=>addComment(openTask.id)} style={S.btnPrimary}>Envoyer</button>
            </div>
          </div>
        </div>
        <ConfirmModal data={confirmDelTask ? { title:"Supprimer la tâche", message:"Cette tâche et ses commentaires seront supprimés.", onYes:()=>doDeleteTask(confirmDelTask) } : null} onClose={()=>setConfirmDelTask(null)} />
      </div>
    );
  }

  // ───────── Liste ─────────
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:16 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em" }}>Tâches</h1>
        <button onClick={()=>setCreating(true)} style={S.btnPrimary}>+ Nouvelle tâche</button>
      </div>

      {/* Filtres */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {[["mine","Mes tâches"],["assigned","Assignées par moi"],["all","Toutes"]].map(([k,lbl]) => (
          <button key={k} onClick={()=>setView(k)} style={{ padding:"7px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background: view===k?"#7c3aed":"var(--t-surface)", color: view===k?"white":"var(--t-text-55)" }}>{lbl}</button>
        ))}
      </div>

      {creating && (
        <div style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:18, padding:18, marginBottom:18 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Nouvelle tâche</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Que faut-il faire ?" style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <label style={{ flex:1, minWidth:130 }}>
                <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:4 }}>Échéance</div>
                <input type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))} style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
              </label>
              <label style={{ flex:1, minWidth:130 }}>
                <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:4 }}>Assigner à</div>
                <select value={form.assignee} onChange={e=>setForm(f=>({...f,assignee:e.target.value}))} style={{ ...S.input, width:"100%", boxSizing:"border-box", cursor:"pointer" }}>
                  <option value="">Moi-même</option>
                  {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </label>
            </div>
            <label>
              <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:4 }}>Priorité</div>
              <div style={{ display:"flex", gap:6 }}>
                {Object.entries(PRIORITIES).map(([k,p]) => (
                  <button key={k} onClick={()=>setForm(f=>({...f,priority:k}))} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background: form.priority===k?p.color:"var(--t-surface)", color: form.priority===k?"white":"var(--t-text-55)" }}>{p.label}</button>
                ))}
              </div>
            </label>
            <label>
              <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:4 }}>Lier à (optionnel)</div>
              <div style={{ display:"flex", gap:8 }}>
                <select value={form.linkType} onChange={e=>setForm(f=>({...f,linkType:e.target.value,linkId:""}))} style={{ ...S.input, cursor:"pointer" }}>
                  <option value="none">Rien</option>
                  <option value="order">Une commande</option>
                  <option value="supplier">Un fournisseur</option>
                </select>
                {form.linkType==="order" && (
                  <select value={form.linkId} onChange={e=>setForm(f=>({...f,linkId:e.target.value}))} style={{ ...S.input, flex:1, cursor:"pointer" }}>
                    <option value="">Choisir…</option>
                    {orders.slice().reverse().map(o => <option key={o.id} value={o.id}>{o.ref||o.id} — {o.supplierName}</option>)}
                  </select>
                )}
                {form.linkType==="supplier" && (
                  <select value={form.linkId} onChange={e=>setForm(f=>({...f,linkId:e.target.value}))} style={{ ...S.input, flex:1, cursor:"pointer" }}>
                    <option value="">Choisir…</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>
            </label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes (optionnel)" rows={2} style={{ ...S.input, width:"100%", boxSizing:"border-box", resize:"vertical", fontFamily:"inherit" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={createTask} style={{ ...S.btnPrimary, flex:1 }}>Créer la tâche</button>
              <button onClick={()=>{setCreating(false);setForm(blankForm);}} style={S.btnGhost}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && !creating ? (
        <div style={{ textAlign:"center", padding:"50px 20px", color:"var(--t-text-40)" }}>
          <CheckCircle size={40} color="var(--t-text-30)" style={{ marginBottom:12 }}/>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Aucune tâche</div>
          <div style={{ fontSize:13 }}>{view==="mine" ? "Rien ne t'est assigné pour l'instant." : "Crée ta première tâche."}</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(t => {
            const pr = PRIORITIES[t.priority] || PRIORITIES.normale;
            const overdue = t.due && t.status!=="done" && t.due < new Date().toISOString().slice(0,10);
            return (
              <div key={t.id} style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:12, boxShadow:"var(--t-card-shadow)" }}>
                <button onClick={()=>cycleStatus(t)} title="Changer le statut" style={{ flexShrink:0, marginTop:2, width:22, height:22, borderRadius:"50%", border:`2px solid ${STATUSES[t.status].color}`, background: t.status==="done"?STATUSES.done.color:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>
                  {t.status==="done" && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  {t.status==="doing" && <div style={{ width:8, height:8, borderRadius:"50%", background:STATUSES.doing.color }}/>}
                </button>
                <div onClick={()=>setOpenId(t.id)} style={{ flex:1, minWidth:0, cursor:"pointer" }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"var(--t-text-90)", textDecoration: t.status==="done"?"line-through":"none", opacity: t.status==="done"?0.6:1 }}>{t.title}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:5, flexWrap:"wrap" }}>
                    <span style={{ fontSize:10.5, fontWeight:700, color:pr.color, background:pr.bg, padding:"2px 8px", borderRadius:12 }}>{pr.label}</span>
                    <span style={{ fontSize:11, color:"var(--t-text-40)" }}>{userName(t.assignee)}</span>
                    {t.due && <span style={{ fontSize:11, color: overdue?"#ef4444":"var(--t-text-40)", fontWeight: overdue?700:400 }}>📅 {t.due.split("-").reverse().join("/")}{overdue?" (en retard)":""}</span>}
                    {(t.comments||[]).length>0 && <span style={{ fontSize:11, color:"var(--t-text-40)" }}>💬 {t.comments.length}</span>}
                  </div>
                </div>
                <span onClick={()=>setOpenId(t.id)} style={{ fontSize:18, color:"var(--t-text-30)", cursor:"pointer", alignSelf:"center" }}>›</span>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmModal data={confirmDelTask ? { title:"Supprimer la tâche", message:"Cette tâche et ses commentaires seront supprimés.", onYes:()=>doDeleteTask(confirmDelTask) } : null} onClose={()=>setConfirmDelTask(null)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════════════════════════════════
function SuppliersPage({ suppliers, setSuppliers, isAdmin, orders, setPage, stockImports, setStockImports, unknownRefs, setUnknownRefs }) {
  const DEPOTS = ["Magasin Nord", "Magasin Sud", "Dépôt Nord", "Dépôt Sud", "Dépôt Port"];
  const [importDepot, setImportDepot] = useState(DEPOTS[0]);
  const [expanded, setExpanded] = useState(null);
  const [importMsg, setImportMsg] = useState("");
  const [stockMsg, setStockMsg]   = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  // Exporte les références inconnues (vues en import mais absentes du référencement)
  function exportUnknownRefs() {
    const list = unknownRefs || [];
    const header = ["Référence", "Désignation", "Fournisseur", "EAN", "Prix achat HT", "Prix vente TTC", "Famille", "Sous-famille", "Vu le", "Emplacement"];
    const rows = list.map(u => [u.ref || "", u.label || "", "", "", "", "", "", "", u.date || "", u.depot || ""]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = [{wch:16},{wch:40},{wch:22},{wch:16},{wch:13},{wch:14},{wch:18},{wch:18},{wch:12},{wch:16}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Réfs à intégrer");
    const d = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `commapro-refs-a-integrer-${d}.xlsx`);
  }

  const [integrateMsg, setIntegrateMsg] = useState("");
  // ── Ré-import du tableau rempli : crée les fournisseurs manquants et range les produits ──
  function handleIntegrateRefs(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type:"binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval:"" });
        if (rows.length === 0) { setIntegrateMsg("⚠️ Le fichier est vide."); return; }

        const norm = (s) => String(s||"").trim();
        const num  = (v) => { const n = parseFloat(String(v).replace(",",".")); return isNaN(n) ? 0 : n; };
        // tolère plusieurs noms de colonnes
        const pick = (row, keys) => { for (const k of keys) { for (const rk of Object.keys(row)) { if (rk.toLowerCase().trim() === k) return row[rk]; } } return ""; };

        let created = 0, added = 0, skipped = 0, newSuppliers = 0, noSupplier = 0;
        const integratedRefs = [];

        setSuppliers(prev => {
          const next = prev.map(s => ({ ...s, products: [...s.products] }));
          const findSupp = (name) => next.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim());

          rows.forEach(row => {
            const ref   = norm(pick(row, ["référence","reference","ref"]));
            const label = norm(pick(row, ["désignation","designation","libellé","libelle"]));
            const supp  = norm(pick(row, ["fournisseur"]));
            if (!ref) { skipped++; return; }              // sans référence → ignoré
            if (!supp) { noSupplier++; return; }          // sans fournisseur → on n'ajoute pas la réf

            let s = findSupp(supp);
            if (!s) {
              s = { id:"s"+Date.now()+"_"+Math.random().toString(36).slice(2,6), name:supp, commercial:"", email:"", emails:[], products:[] };
              next.push(s); newSuppliers++;
            }
            // déjà présent ? on ne duplique pas
            if (s.products.some(p => String(p.ref).toLowerCase().trim() === ref.toLowerCase().trim())) { skipped++; return; }

            const ean   = norm(pick(row, ["ean","code ean","gencode"]));
            const achat = num(pick(row, ["prix achat ht","prix achat","prix d'achat"]));
            const vente = num(pick(row, ["prix vente ttc","prix vente","prix de vente"]));
            const fam   = norm(pick(row, ["famille"]));
            const sfam  = norm(pick(row, ["sous-famille","sous famille","subfamily"]));

            s.products.push({
              ref, label, ean,
              price: achat || 0,
              prixVente: vente || null,
              family: fam, subFamily: sfam,
              weeklyVolume: 0, stockMin: 0,
            });
            added++;
            integratedRefs.push(ref.toLowerCase().trim());
            if (s.products.length === 1 && newSuppliers) created++;
          });
          return next;
        });

        // Retire de la liste "à intégrer" les réfs qu'on vient d'ajouter
        if (integratedRefs.length > 0) {
          const done = new Set(integratedRefs);
          setUnknownRefs(prev => (prev||[]).filter(u => !done.has(String(u.ref).toLowerCase().trim())));
        }

        const parts = [`✅ ${added} produit(s) intégré(s)`];
        if (newSuppliers > 0) parts.push(`${newSuppliers} fournisseur(s) créé(s)`);
        if (noSupplier > 0) parts.push(`⚠️ ${noSupplier} ligne(s) sans fournisseur non ajoutée(s)`);
        if (skipped > 0) parts.push(`${skipped} ligne(s) ignorée(s) (déjà présent ou sans réf)`);
        setIntegrateMsg(parts.join(" · "));
      } catch (err) {
        setIntegrateMsg("❌ Erreur de lecture. Vérifie que c'est bien le fichier Excel exporté, rempli.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  // ── EXPORT du référencement complet (avec ID caché pour le recroisement) ─────
  const [refSyncMsg, setRefSyncMsg] = useState("");
  const [pendingRefImport, setPendingRefImport] = useState(null);  // {toUpdate, toCreate, toDelete, apply}
  const [exportOpen, setExportOpen] = useState(false);
  const [expFilters, setExpFilters] = useState({ suppliers:[], families:[], subFamilies:[], onlyNoPrice:false, onlyNoEan:false });

  function ensurePid(p, supId) { return p.pid || ("p_"+supId+"_"+String(p.ref||"").replace(/[^a-z0-9]/gi,"").toLowerCase()+"_"+Math.random().toString(36).slice(2,5)); }

  function exportReferencement(filters) {
    const f = filters || {};
    // Attribue un pid stable aux produits qui n'en ont pas (et sauvegarde)
    setSuppliers(prev => prev.map(s => ({ ...s, products: s.products.map(p => p.pid ? p : { ...p, pid: ensurePid(p, s.id) }) })));
    const header = ["ID","Référence","Désignation","Fournisseur","EAN","Prix achat HT","Prix vente TTC","Famille","Sous-famille","Conso hebdo","Stock mini"];
    const okSet = (set, val) => !set || set.length === 0 || set.includes(val);
    const rows = [];
    let count = 0;
    suppliers.forEach(s => {
      if (!okSet(f.suppliers, s.name)) return;
      (s.products||[]).forEach(p => {
        if (!okSet(f.families, p.family||"")) return;
        if (!okSet(f.subFamilies, p.subFamily||"")) return;
        if (f.onlyNoPrice && p.prixVente != null && p.prixVente !== "") return;
        if (f.onlyNoEan && p.ean) return;
        rows.push([
          p.pid || ensurePid(p, s.id), p.ref||"", p.label||"", s.name||"", p.ean||"",
          p.price ?? "", p.prixVente ?? "", p.family||"", p.subFamily||"",
          p.weeklyVolume ?? "", p.stockMin ?? "",
        ]);
        count++;
      });
    });
    if (count === 0) { setRefSyncMsg("⚠️ Aucun produit ne correspond à ces filtres."); return; }
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = [{wch:22},{wch:16},{wch:40},{wch:22},{wch:16},{wch:13},{wch:14},{wch:16},{wch:16},{wch:11},{wch:10}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Référencement");
    const d = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `commapro-referencement-${d}.xlsx`);
    setRefSyncMsg(`📤 ${count} produit(s) exporté(s). Modifie le fichier (ne touche PAS à la colonne ID), puis réimporte-le.`);
  }

  // ── ANALYSE du fichier réimporté → prépare un récapitulatif avant d'appliquer ─
  function analyzeRefImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type:"binary" });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:"" });
        if (rows.length === 0) { setRefSyncMsg("⚠️ Fichier vide."); return; }
        const norm = (s)=>String(s||"").trim();
        const pick = (row, keys) => { for (const k of keys) for (const rk of Object.keys(row)) if (rk.toLowerCase().trim()===k) return row[rk]; return ""; };
        const hasCol = (row, k) => Object.keys(row).some(rk => rk.toLowerCase().trim()===k);

        // IDs présents dans le fichier
        const fileIds = new Set();
        rows.forEach(r => { const id = norm(pick(r,["id"])); if (id) fileIds.add(id); });

        // IDs existants dans l'app
        let existingCount = 0;
        suppliers.forEach(s => (s.products||[]).forEach(p => { if (p.pid) existingCount++; }));

        let toUpdate=0, toCreate=0, toSkipNoSupplier=0;
        rows.forEach(r => {
          const id = norm(pick(r,["id"]));
          if (id) { toUpdate++; return; }
          const ref = norm(pick(r,["référence","reference","ref"]));
          const supp = norm(pick(r,["fournisseur"]));
          if (ref && supp) toCreate++;
          else if (ref && !supp) toSkipNoSupplier++;   // nouvelle ligne sans fournisseur → ignorée
        });

        // À supprimer = produits avec pid absent du fichier
        let toDelete = 0;
        suppliers.forEach(s => (s.products||[]).forEach(p => { if (p.pid && !fileIds.has(p.pid)) toDelete++; }));

        setPendingRefImport({ rows, fileIds, toUpdate, toCreate, toDelete, toSkipNoSupplier, norm, pick, hasCol });
        setRefSyncMsg("");
      } catch (err) {
        setRefSyncMsg("❌ Erreur de lecture. Vérifie que c'est bien le fichier de référencement exporté.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  // ── APPLIQUE la synchronisation après confirmation ───────────────────────────
  function applyRefImport() {
    const job = pendingRefImport;
    if (!job) return;
    const { rows, fileIds, norm, pick } = job;
    const numOrKeep = (v, old) => { const s=String(v).trim(); if (s==="") return old; const n=parseFloat(s.replace(",",".")); return isNaN(n)?old:n; };
    const strOrKeep = (v, old) => { const s=String(v||"").trim(); return s===""?old:s; };

    setSuppliers(prev => {
      let next = prev.map(s => ({ ...s, products: [...s.products] }));
      const findSupp = (name) => next.find(s => s.name.toLowerCase().trim()===name.toLowerCase().trim());

      // 1) MISE À JOUR + CRÉATION
      rows.forEach(r => {
        const id    = norm(pick(r,["id"]));
        const ref   = norm(pick(r,["référence","reference","ref"]));
        const label = pick(r,["désignation","designation","libellé","libelle"]);
        const supp  = norm(pick(r,["fournisseur"]));
        const ean   = pick(r,["ean","code ean","gencode"]);
        const achat = pick(r,["prix achat ht","prix achat"]);
        const vente = pick(r,["prix vente ttc","prix vente"]);
        const fam   = pick(r,["famille"]);
        const sfam  = pick(r,["sous-famille","sous famille"]);
        const conso = pick(r,["conso hebdo","conso","volume hebdo"]);
        const smin  = pick(r,["stock mini","stock min"]);

        if (id) {
          // mise à jour du produit ayant ce pid (peut changer de fournisseur)
          for (const s of next) {
            const idx = s.products.findIndex(p => p.pid === id);
            if (idx >= 0) {
              const p = s.products[idx];
              const updated = {
                ...p,
                ref: strOrKeep(ref, p.ref),
                label: strOrKeep(label, p.label),
                ean: strOrKeep(ean, p.ean),
                price: numOrKeep(achat, p.price),
                prixVente: numOrKeep(vente, p.prixVente),
                family: strOrKeep(fam, p.family),
                subFamily: strOrKeep(sfam, p.subFamily),
                weeklyVolume: numOrKeep(conso, p.weeklyVolume),
                stockMin: numOrKeep(smin, p.stockMin),
              };
              // changement de fournisseur ?
              if (supp && s.name.toLowerCase().trim() !== supp.toLowerCase().trim()) {
                s.products.splice(idx,1);
                let dest = findSupp(supp);
                if (!dest) { dest = { id:"s"+Date.now()+"_"+Math.random().toString(36).slice(2,6), name:supp, commercial:"", email:"", emails:[], products:[] }; next.push(dest); }
                dest.products.push(updated);
              } else {
                s.products[idx] = updated;
              }
              break;
            }
          }
        } else if (ref && supp) {
          // création : nouvelle ligne sans ID
          let dest = findSupp(supp);
          if (!dest) { dest = { id:"s"+Date.now()+"_"+Math.random().toString(36).slice(2,6), name:supp, commercial:"", email:"", emails:[], products:[] }; next.push(dest); }
          if (!dest.products.some(p => String(p.ref).toLowerCase().trim()===ref.toLowerCase().trim())) {
            dest.products.push({
              pid:"p_new_"+Date.now()+"_"+Math.random().toString(36).slice(2,5),
              ref, label:String(label||"").trim(), ean:String(ean||"").trim(),
              price: parseFloat(String(achat).replace(",","."))||0,
              prixVente: parseFloat(String(vente).replace(",","."))||null,
              family:String(fam||"").trim(), subFamily:String(sfam||"").trim(),
              weeklyVolume: parseFloat(String(conso).replace(",","."))||0,
              stockMin: parseFloat(String(smin).replace(",","."))||0,
            });
          }
        }
      });

      // 2) SUPPRESSION : produits avec pid absent du fichier
      next = next.map(s => ({ ...s, products: s.products.filter(p => !p.pid || fileIds.has(p.pid)) }));
      return next;
    });

    setPendingRefImport(null);
    setRefSyncMsg(`✅ Référencement synchronisé : ${job.toUpdate} mis à jour, ${job.toCreate} créé(s), ${job.toDelete} supprimé(s).`);
  }


  // ── Import ÉTAT DE STOCK (format revendeur, ex: Conforama) ──────────────────
  // Met à jour le stock réel des produits déjà présents (par référence/Code),
  // mémorise la date d'export et calcule les sorties vs l'import précédent.
  function handleStockImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStockMsg("Lecture de l'état de stock…");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        // 1) Date d'export
        let exportDate = null;
        for (let r = 0; r < Math.min(4, grid.length); r++) {
          for (const cell of grid[r]) {
            if (typeof cell === "number" && cell > 40000 && cell < 60000) {
              const d = new Date(Math.round((cell - 25569) * 86400 * 1000));
              if (!isNaN(d)) { exportDate = d.toISOString().slice(0,10); break; }
            }
          }
          if (exportDate) break;
        }
        if (!exportDate) exportDate = new Date().toISOString().slice(0,10);

        // 2) Mapping noms de dépôts → labels courts (utilisé seulement si format multi-dépôts)
        function depotLabel(raw) {
          const u = raw.toUpperCase();
          if (u.includes("EXPO") && u.includes("SUD"))  return "Expo Sud";
          if (u.includes("EXPO") && u.includes("NORD")) return "Expo Nord";
          if (u.includes("CENTRAL")) return "Dépôt Central";
          if (u.includes("DEPOT") || u.includes("DÉPÔT")) {
            if (u.includes("SUD"))  return "Dépôt Sud";
            if (u.includes("NORD")) return "Dépôt Nord";
            return "Dépôt";
          }
          const parts = raw.split("-").map(s=>s.trim()).filter(Boolean);
          return parts[parts.length-1] || raw;
        }

        // 3) Parser : on repère la ligne d'en-tête (Code + Dispo/Stock) une fois,
        //    puis on lit toutes les lignes de données. Gère aussi le multi-dépôts
        //    (lignes "section" intercalées) si jamais le format en contient.
        const norm = (s) => String(s).toLowerCase().replace(/\s+/g," ").trim();

        // Une ligne est une SECTION dépôt si sa 1re cellule est un intitulé de dépôt
        // ET que le reste de la ligne est vide (pas de chiffres de stock).
        const isDepotHeader = (row) => {
          const v = String(row[0]||"").trim().toUpperCase();
          if (v.length <= 5) return false;
          const looksDepot = (v.includes("CONFORAMA") || v.includes("MAGASIN") ||
            (v.includes("EXPO") && (v.includes("NORD")||v.includes("SUD"))) ||
            (v.includes("DEPOT")||v.includes("DÉPÔT")));
          if (!looksDepot) return false;
          // le reste de la ligne doit être vide (sinon c'est un produit nommé "...PORT...")
          const rest = row.slice(1).map(x=>String(x||"").trim()).filter(Boolean);
          return rest.length === 0;
        };

        const isHeaderRow = (row) => {
          const cells = row.map(norm);
          return cells.some(x => x === "code") &&
                 cells.some(x => x.startsWith("dispo") || x === "stock");
        };
        const mapHeader = (row) => {
          const h = {};
          row.forEach((cell, i) => {
            const n = norm(cell);
            if (n === "code") h.code = i;
            else if (n === "libellé" || n === "libelle") h.label = i;
            else if (n.startsWith("achat")) h.achat = i;
            else if (n === "facture") h.facture = i;
            else if (n === "stock") h.stock = i;
            else if (n === "reserve" || n === "réserve") h.reserve = i;
            else if (n === "emporte" || n === "emporté") h.emporte = i;
            else if (n === "livraison") h.livraison = i;
            else if (n.startsWith("dispo")) h.dispo = i;
            else if (n === "attendu") h.attendu = i;
          });
          return h;
        };

        // L'emplacement est choisi par l'utilisateur (pas d'auto-détection)
        const selectedDepot = importDepot;
        let currentDepot = selectedDepot;
        let headerCols = null;
        const stockByRef = {};
        const depotsFound = new Set([selectedDepot]);

        // Lecture : en-tête une fois, puis toutes les lignes de données
        for (const row of grid) {
          if (isHeaderRow(row)) {
            headerCols = mapHeader(row);
            continue;
          }
          // Ligne de données
          if (headerCols && headerCols.code != null) {
            const code = String(row[headerCols.code] || "").trim();
            if (code && code.toLowerCase() !== "code" && code.length >= 2) {
              const num = (i) => { if (i == null) return 0; const v = parseFloat(row[i]); return isNaN(v) ? 0 : v; };
              if (!stockByRef[code]) stockByRef[code] = {};
              if (headerCols.label != null && !stockByRef[code]._label) {
                stockByRef[code]._label = String(row[headerCols.label] || "").trim();
              }
              // Si plusieurs lignes même code (multi-dépôts), on additionne sous le dépôt courant
              const prev = stockByRef[code][currentDepot] || {};
              stockByRef[code][currentDepot] = {
                stock:     (prev.stock||0)     + num(headerCols.stock),
                dispo:     (prev.dispo||0)     + num(headerCols.dispo),
                reserve:   (prev.reserve||0)   + num(headerCols.reserve),
                emporte:   (prev.emporte||0)   + num(headerCols.emporte),
                livraison: (prev.livraison||0) + num(headerCols.livraison),
                attendu:   (prev.attendu||0)   + num(headerCols.attendu),
                achat:     (prev.achat||0)     + num(headerCols.achat),
                facture:   (prev.facture||0)   + num(headerCols.facture),
              };
            }
          }
        }

        const refsInFile = Object.keys(stockByRef);
        const fileLabel = (ref) => (stockByRef[ref] && stockByRef[ref]._label) || "";
        if (refsInFile.length === 0) {
          setStockMsg("⚠️ Aucune donnée de stock reconnue. Vérifie le format du fichier.");
          return;
        }

        // 3bis) Normalisation des références — matching par TRONC commun
        //   Catalogue app : "THA150TECH"  (suffixe fournisseur = TECH)
        //   État magasin   : "THA150/L", "THA806/RT", "TBL784/RTD"  (suffixe après /)
        //   => on compare le tronc, en retirant le suffixe de chaque côté.
        const normRef = (r) => String(r||"").toUpperCase().replace(/[\s\-_./\\]/g,"").trim();
        const stripLeadingZeros = (r) => r.replace(/^0+/, "");

        // Tronc d'une référence : on coupe au "/" (magasin) et on retire un suffixe
        // fournisseur connu en fin (TECH, RTD, RT, L, VAX) puis on normalise.
        const SUFFIXES = ["TECH","RTD","VAX"];  // suffixes lettres en fin de réf
        function coreRef(raw) {
          let s = String(raw||"").toUpperCase().trim();
          s = s.split("/")[0];                       // enlève "/L", "/RT", "/RTD", "/VAX"…
          let n = s.replace(/[\s\-_.\\]/g,"");        // enlève séparateurs (garde lettres+chiffres)
          for (const suf of SUFFIXES) {
            if (n.length > suf.length + 2 && n.endsWith(suf)) { n = n.slice(0, -suf.length); break; }
          }
          return stripLeadingZeros(n);
        }

        // Index du fichier magasin : tronc -> ref originale
        const normIndex = {};       // ref normalisée complète -> ref fichier
        const coreIndex = {};       // tronc -> [refs fichier]
        for (const fileRef of refsInFile) {
          normIndex[normRef(fileRef)] = fileRef;
          const c = coreRef(fileRef);
          if (c) (coreIndex[c] = coreIndex[c] || []).push(fileRef);
        }

        function findStockRef(catalogRef, catalogEan) {
          // 1. Correspondance exacte
          if (stockByRef[catalogRef]) return catalogRef;
          // 2. Normalisée complète
          const n = normRef(catalogRef);
          if (n && normIndex[n]) return normIndex[n];
          // 3. Par TRONC (cœur de la logique : THA150TECH <-> THA150/L)
          const core = coreRef(catalogRef);
          if (core && coreIndex[core]) {
            const list = coreIndex[core];
            if (list.length === 1) return list[0];
            // plusieurs candidats même tronc : préférer celui dont le suffixe contient RT/RTD
            const pref = list.find(r => /\/RTD?$/i.test(r)) || list.find(r => /RTD?$/i.test(normRef(r)));
            return pref || list[0];
          }
          // 4. Par EAN si présent des deux côtés
          if (catalogEan) {
            const ne = normRef(catalogEan);
            if (ne && normIndex[ne]) return normIndex[ne];
          }
          return null;
        }

        // 4) Mettre à jour les produits : FUSIONNER le dépôt importé avec les dépôts existants
        let updated = 0, matched = [], unmatchedCount = 0, fuzzyCount = 0;
        setSuppliers(prev => prev.map(s => ({
          ...s,
          products: s.products.map(p => {
            const foundRef = findStockRef(p.ref, p.ean);
            if (!foundRef) { unmatchedCount++; return p; }
            const newDepotData = stockByRef[foundRef][selectedDepot];
            updated++; matched.push(foundRef);
            if (normRef(foundRef) !== normRef(p.ref)) fuzzyCount++;
            // On garde les autres dépôts déjà importés, on remplace seulement celui choisi
            const mergedDepots = { ...(p.dispoParDepot || {}), [selectedDepot]: newDepotData };
            // Totaux tous emplacements confondus
            const allDepots = Object.values(mergedDepots);
            const totalDispo = allDepots.reduce((s,d)=>s+(d.dispo||0),0);
            const totalStock = allDepots.reduce((s,d)=>s+(d.stock||0),0);
            // Date d'import par emplacement
            const mergedDates = { ...(p.stockDateParDepot || {}), [selectedDepot]: exportDate };
            return {
              ...p,
              stock: totalStock,
              dispo: totalDispo,
              dispoParDepot: mergedDepots,
              stockDate: exportDate,
              stockDateParDepot: mergedDates,
              stockRefFichier: foundRef !== p.ref ? foundRef : undefined,
            };
          })
        })));

        // 5) Mémoriser snapshot (dispo de CE dépôt par ref pour calcul des sorties)
        const snapshot = {};
        matched.forEach(ref => {
          snapshot[ref] = (stockByRef[ref][selectedDepot]||{}).dispo || 0;
        });

        // 4ter) Références du fichier NON rapprochées au référencement → liste à compléter
        const matchedSet = new Set(matched.map(r => normRef(r)));
        const newUnknowns = refsInFile
          .filter(ref => !matchedSet.has(normRef(ref)))
          .map(ref => ({ ref, label: fileLabel(ref), depot: selectedDepot, date: exportDate }));
        if (newUnknowns.length > 0 && typeof setUnknownRefs === "function") {
          setUnknownRefs(prev => {
            const byRef = {};
            [...(prev||[]), ...newUnknowns].forEach(u => { byRef[normRef(u.ref)] = u; }); // dédoublonne, garde le plus récent
            return Object.values(byRef);
          });
        }

        // 5) ÉTAPE B — Calcul des sorties depuis le dernier import DU MÊME EMPLACEMENT
        //    Sorties = Dispo_précédent − Dispo_actuel + Achats reçus sur la période
        const prevImports = stockImports || [];
        const prev = [...prevImports].reverse().find(im => im.depot === selectedDepot && im.date && im.date !== exportDate);
        let computed = 0;
        const weeklySalesByRef = {};
        if (prev) {
          const d1 = new Date(prev.date), d2 = new Date(exportDate);
          const days = Math.max(1, Math.round((d2 - d1) / 86400000));
          for (const ref of matched) {
            const prevDispo = prev.dispo?.[ref];
            if (prevDispo == null) continue;
            const cur = stockByRef[ref][selectedDepot] || {};
            const curDispo = cur.dispo || 0;
            const achat = cur.achat || 0;  // entrées sur la période
            const sorties = Math.max(0, prevDispo - curDispo + achat);
            const perWeek = sorties / days * 7;
            weeklySalesByRef[ref] = Math.ceil(perWeek);
            computed++;
          }
          if (computed > 0) {
            setSuppliers(prev2 => prev2.map(s => ({
              ...s,
              products: s.products.map(p => {
                const w = weeklySalesByRef[p.ref];
                if (w == null) return p;
                return { ...p, weeklyVolume: w, stockMin: w, stockMinAuto: true };
              })
            })));
          }
        }

        setStockImports(prevList => {
          const next = [...(prevList||[]), { depot: selectedDepot, date: exportDate, dispo: snapshot, importedAt: new Date().toISOString() }];
          return next.slice(-40);  // 5 emplacements × plusieurs imports
        });

        const ignored = refsInFile.length - updated;
        const dateFr = exportDate.split("-").reverse().join("/");
        let msg = "✅ " + selectedDepot + " — état du " + dateFr + " importé. " + updated + " produit(s) mis à jour" + (ignored>0 ? ", " + ignored + " référence(s) non rapprochée(s)" : "") + ".";
        if (fuzzyCount > 0) {
          msg += ` 🔍 ${fuzzyCount} produit(s) rapproché(s) par correspondance approximative (réf légèrement différente entre catalogue et état de stock).`;
        }
        if (prev && computed > 0) {
          const prevFr = prev.date.split("-").reverse().join("/");
          msg += ` 📊 Sorties calculées entre le ${prevFr} et le ${dateFr} : stock min ajusté pour couvrir 1 semaine sur ${computed} produit(s).`;
        } else if (!prev) {
          msg += ` ℹ️ Premier import enregistré — les sorties seront calculées au prochain import.`;
        }
        setStockMsg(msg);
      } catch (err) {
        console.error(err);
        setStockMsg("❌ Erreur de lecture. Vérifie que c'est bien l'export .xlsx de l'état de stock.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  // ── Import Excel : lit un .xlsx et ajoute les produits au formulaire ────────
  function handleExcelImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("Lecture du fichier…");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        // On accepte plusieurs noms de colonnes possibles (souples)
        const norm = (s) => String(s).toLowerCase().replace(/[éè]/g,"e").trim();
        const pick = (row, names) => {
          for (const key of Object.keys(row)) {
            if (names.includes(norm(key))) return row[key];
          }
          return "";
        };
        const imported = rows.map(r => {
          const weeklyVolume = parseFloat(pick(r, ["ventes/sem","ventes","ventes semaine","ventes/semaine","volume"])) || 0;
          return {
            ref:        String(pick(r, ["ref","reference","référence","réf.","ref."]) || "").trim(),
            ean:        String(pick(r, ["ean","code ean","code-barres","code barres","gencod","gencode","ean13"]) || "").trim(),
            label:      String(pick(r, ["designation","désignation","libelle","libellé","nom","produit"]) || "").trim(),
            family:     String(pick(r, ["famille","rayon","categorie","catégorie"]) || "").trim(),
            subFamily:  String(pick(r, ["sous-famille","sous famille","sousfamille"]) || "").trim(),
            price:      parseFloat(String(pick(r, ["prix","prix ht","p.u. ht","pu","prix unitaire"])).replace(",",".")) || 0,
            weeklyVolume,
            stockMin:   calcStockMin(weeklyVolume),
          };
        }).filter(p => p.ref || p.label);  // on ignore les lignes vides

        if (imported.length === 0) {
          setImportMsg("⚠️ Aucun produit trouvé. Vérifie les noms de colonnes.");
          return;
        }
        setForm(f => ({ ...f, products: [...f.products, ...imported] }));
        setImportMsg(`✅ ${imported.length} produit(s) importé(s) ! Vérifie puis enregistre.`);
      } catch (err) {
        console.error(err);
        setImportMsg("❌ Erreur de lecture du fichier. Vérifie que c'est bien un .xlsx.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";  // permet de réimporter le même fichier
  }

  function openNew() {
    setForm({ id: "s"+Date.now(), name: "", commercial: "", email: "", emails: [], products: [] });
    setEditing("new");
  }
  function openEdit(s) { setForm(JSON.parse(JSON.stringify(s))); setEditing(s.id); setSelectedRefs([]); }
  function save() {
    setSuppliers(prev => { const idx = prev.findIndex(s => s.id===form.id); if (idx>=0){const n=[...prev];n[idx]=form;return n;} return [...prev,form]; });
    setEditing(null); setForm(null); setSelectedRefs([]);
  }
  function del(id) { setSuppliers(prev => prev.filter(s => s.id!==id)); }
  function addProduct() { setForm(f => ({...f, products: [...f.products, { ref:"", ean:"", label:"", price:0, family:"", subFamily:"", weeklyVolume:0, stockMin:0 }]})); }
  function updateProduct(i, field, val) {
    setForm(f => { const p=[...f.products]; p[i]={...p[i],[field]:["price","weeklyVolume","stockMin"].includes(field) ? parseFloat(val)||0 : val};
      // Auto-calc stockMin when weeklyVolume changes
      if (field==="weeklyVolume") p[i].stockMin = calcStockMin(parseFloat(val)||0);
      return {...f,products:p};
    });
  }
  function removeProduct(i) { setForm(f => ({...f, products: f.products.filter((_,j)=>j!==i)})); }

  // Sélection multiple pour suppression groupée
  const [selectedRefs, setSelectedRefs] = useState([]);
  function toggleSelect(ref) {
    setSelectedRefs(prev => prev.includes(ref) ? prev.filter(r=>r!==ref) : [...prev, ref]);
  }
  function toggleSelectAll() {
    setSelectedRefs(prev => prev.length === form.products.length ? [] : form.products.map(p=>p.ref));
  }
  function removeSelected() {
    setForm(f => ({ ...f, products: f.products.filter(p => !selectedRefs.includes(p.ref)) }));
    setSelectedRefs([]);
  }

  if (editing) return (
    <div>
      <button onClick={() => { setEditing(null); setForm(null); }} style={{ ...S.btnGhost, marginBottom: 16 }}>← Annuler</button>
      <div style={S.card}>
        <h2 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>{editing==="new" ? "Nouveau fournisseur" : "Modifier"}</h2>
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Field label="Nom société *"><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} style={S.input} /></Field>
          <Field label="Commercial"><input value={form.commercial} onChange={e => setForm(f=>({...f,commercial:e.target.value}))} style={S.input} /></Field>
          <Field label="Email principal"><input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} style={S.input} type="email" placeholder="commercial@fournisseur.com" /></Field>
        </div>
        {/* Emails supplémentaires */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <label style={{ ...S.label, margin:0 }}>Emails supplémentaires (CC)</label>
            <button onClick={() => setForm(f=>({...f, emails: [...(f.emails||[]), ""]}))} style={{ ...S.btnGhost, fontSize:11, padding:"3px 10px" }}>+ Ajouter</button>
          </div>
          {(form.emails||[]).length === 0 && <div style={{ fontSize:12, color:"var(--t-text-30)", fontStyle:"italic" }}>Aucun email supplémentaire — le bon de commande sera envoyé uniquement à l'email principal</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(form.emails||[]).map((email, i) => (
              <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input value={email} onChange={e => setForm(f=>({...f, emails: (f.emails||[]).map((em,j)=>j===i?e.target.value:em)}))} style={{ ...S.input, flex:1 }} type="email" placeholder={`email${i+2}@fournisseur.com`} />
                <button onClick={() => setForm(f=>({...f, emails: (f.emails||[]).filter((_,j)=>j!==i)}))} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", fontSize:18, padding:"0 4px", lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap:"wrap", gap:8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Catalogue produits</h3>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <button onClick={() => {
              // Génère et télécharge un modèle Excel avec exemples
              const data = [
                ["Référence","Code EAN","Désignation","Famille","Sous-famille","Prix HT","Prix vente TTC","Écotaxe","Ventes/sem"],
                ["TAB906","3700123456789","ASPIRATEUR LAVEUR 1400W","Electroménager","E41AS","149.90","199.00","1.50","2"],
                ["REF002","3700987654321","LAVE-LINGE 7KG A+++","Electroménager","E21LL","299.00","399.00","3.00","1"],
                ["REF003","","MICRO-ONDES 20L SOLO","Electroménager","E31MO","89.50","119.00","1.00","3"],
              ];
              const ws = XLSX.utils.aoa_to_sheet(data);
              // Largeurs de colonnes
              ws['!cols'] = [{wch:14},{wch:16},{wch:32},{wch:18},{wch:14},{wch:10},{wch:14},{wch:10},{wch:12}];
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Catalogue");
              XLSX.writeFile(wb, "modele-catalogue-commapro.xlsx");
            }} style={{ ...S.btnGhost, display:"inline-flex", alignItems:"center", gap:6, fontSize:12 }}>
              ⬇ Modèle Excel
            </button>
            <label style={{ ...S.btnSecondary, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
              <FileText size={15} style={{ marginRight:6, verticalAlign:"middle" }} /> Importer Excel
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} style={{ display:"none" }} />
            </label>
            <button onClick={addProduct} style={S.btnSecondary}>+ Produit</button>
          </div>
        </div>
        {importMsg && <div style={{ fontSize:12, marginBottom:10, padding:"8px 12px", borderRadius:10, background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)", color:"var(--t-text-85)" }}>{importMsg}</div>}
        <div style={{ fontSize:11, color:"var(--t-text-40)", marginBottom:12 }}>
          💡 Colonnes attendues : <b>Référence, EAN, Désignation, Famille, Sous-famille, Prix HT, Ventes/sem</b> — télécharge le modèle pour être sûr du format.
        </div>
        {selectedRefs.length > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", marginBottom:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:12 }}>
            <span style={{ fontSize:12, fontWeight:600, color:"var(--t-text-85)" }}>{selectedRefs.length} produit(s) sélectionné(s)</span>
            <ConfirmDeleteButton onConfirm={removeSelected} label={`🗑 Supprimer la sélection (${selectedRefs.length})`} small />
          </div>
        )}
        <div className="product-edit-grid" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", marginBottom:16 }}>
        <div style={{ minWidth: 2000 }}>
        {form.products.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "30px 90px 120px 200px 100px 100px 100px 80px 80px 70px 60px 60px 140px 90px 90px 90px 80px 90px 80px auto", gap: 6, marginBottom: 6 }}>
            <input type="checkbox" checked={selectedRefs.length===form.products.length && form.products.length>0} onChange={toggleSelectAll} style={{ width:16, height:16, cursor:"pointer" }} />
            {["Réf.","Code EAN","Désignation","Type","Famille","S-famille","P.U. HT","Prix vente","Écotaxe","Ventes","Stk min","Caractéristiques","Hauteur","Largeur","Profondeur","Coloris","URL fiche tech.","Statut",""].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color:"var(--t-text-40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
        )}
        {form.products.map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "30px 90px 120px 200px 100px 100px 100px 80px 80px 70px 60px 60px 140px 90px 90px 90px 80px 90px 80px auto", gap: 6, marginBottom: 8, alignItems: "center", opacity: p.rupture ? 0.45 : 1, transition:"opacity 0.2s" }}>
            <input type="checkbox" checked={selectedRefs.includes(p.ref)} onChange={()=>toggleSelect(p.ref)} style={{ width:16, height:16, cursor:"pointer" }} />
            <input value={p.ref} onChange={e => updateProduct(i,"ref",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Réf." disabled={p.rupture} />
            <input value={p.ean||""} onChange={e => updateProduct(i,"ean",e.target.value)} style={{...S.input,fontSize:11,fontFamily:"monospace"}} placeholder="EAN" disabled={p.rupture} />
            <input value={p.label} onChange={e => updateProduct(i,"label",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Désignation" disabled={p.rupture} />
            <input value={p.productType||""} onChange={e => updateProduct(i,"productType",e.target.value)} style={{...S.input,fontSize:11,color:"#f59e0b"}} placeholder="Aspirateur…" disabled={p.rupture} />
            <input value={p.family||""} onChange={e => updateProduct(i,"family",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Famille" disabled={p.rupture} />
            <input value={p.subFamily||""} onChange={e => updateProduct(i,"subFamily",e.target.value)} style={{...S.input,fontSize:11,fontFamily:"monospace"}} placeholder="S-famille" disabled={p.rupture} />
            <input type="number" value={p.price||""} onChange={e => updateProduct(i,"price",e.target.value)} style={{...S.input,fontSize:11}} placeholder="0.00" disabled={p.rupture} />
            <input type="number" value={p.prixVente||""} onChange={e => updateProduct(i,"prixVente",e.target.value)} style={{...S.input,fontSize:11,color:"#7c3aed"}} placeholder="0.00" disabled={p.rupture} />
            <input type="number" value={p.ecotaxe||""} onChange={e => updateProduct(i,"ecotaxe",e.target.value)} style={{...S.input,fontSize:11}} placeholder="0.00" disabled={p.rupture} />
            <input type="number" value={p.weeklyVolume||""} onChange={e => updateProduct(i,"weeklyVolume",e.target.value)} style={{...S.input,fontSize:11}} placeholder="0" disabled={p.rupture} />
            <input type="number" value={p.stockMin??""} onChange={e => updateProduct(i,"stockMin",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Auto" disabled={p.rupture} />
            <input value={p.caracteristiques||""} onChange={e => updateProduct(i,"caracteristiques",e.target.value)} style={{...S.input,fontSize:10}} placeholder="Description libre…" disabled={p.rupture} />
            <input value={p.hauteur||""} onChange={e => updateProduct(i,"hauteur",e.target.value)} style={{...S.input,fontSize:10}} placeholder="Ex: 45 cm" disabled={p.rupture} />
            <input value={p.largeur||""} onChange={e => updateProduct(i,"largeur",e.target.value)} style={{...S.input,fontSize:10}} placeholder="Ex: 35 cm" disabled={p.rupture} />
            <input value={p.profondeur||""} onChange={e => updateProduct(i,"profondeur",e.target.value)} style={{...S.input,fontSize:10}} placeholder="Ex: 30 cm" disabled={p.rupture} />
            <input value={p.coloris||""} onChange={e => updateProduct(i,"coloris",e.target.value)} style={{...S.input,fontSize:10}} placeholder="Ex: Blanc" disabled={p.rupture} />
            <input value={p.ficheUrl||""} onChange={e => updateProduct(i,"ficheUrl",e.target.value)} style={{...S.input,fontSize:10}} placeholder="https://…" disabled={p.rupture} />
            <button onClick={() => updateProduct(i,"rupture", !p.rupture)} style={{
              padding:"5px 8px", borderRadius:14, border:"1.5px solid", cursor:"pointer", fontSize:10, fontWeight:700,
              background: p.rupture ? "rgba(239,68,68,0.15)" : "rgba(52,211,153,0.12)",
              borderColor: p.rupture ? "rgba(239,68,68,0.4)" : "rgba(52,211,153,0.35)",
              color: p.rupture ? "#ef4444" : "#34d399",
              transition:"all 0.18s", whiteSpace:"nowrap",
            }}>
              {p.rupture ? "🔴 Rupture" : "🟢 Actif"}
            </button>
            <button onClick={(e) => {
              e.stopPropagation();
              if (e.currentTarget.dataset.armed === "1") { removeProduct(i); }
              else { e.currentTarget.dataset.armed = "1"; e.currentTarget.textContent = "⚠"; e.currentTarget.style.color = "#DC2626"; e.currentTarget.style.fontWeight = "800"; setTimeout(() => { if (e.currentTarget) { e.currentTarget.dataset.armed = "0"; e.currentTarget.textContent = "×"; e.currentTarget.style.fontWeight = "400"; } }, 3000); }
            }} style={{ background:"none",border:"none",cursor:"pointer",color:"#DC2626",fontSize:18,padding:0 }}>×</button>
          </div>
        ))}
        </div>
        </div>
        <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:4, marginBottom:16 }}>💡 Caract. 1/2/3 = les 3 lignes de la fiche porte-étiquette (ex: 2800 W, 48×75 cm, 100 LITRES). URL fiche tech. = lien PDF pour le QR code.</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => { setEditing(null); setForm(null); }} style={S.btnSecondary}>Annuler</button>
          <button onClick={save} disabled={!form.name} style={{ ...S.btnPrimary, opacity: form.name?1:0.5 }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap:"wrap", gap:10 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em" }}>Fournisseurs</h1>
        {isAdmin && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <select value={importDepot} onChange={e=>setImportDepot(e.target.value)} style={{ ...S.input, width:"auto", padding:"8px 12px", cursor:"pointer" }}>
              {DEPOTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <label style={{ ...S.btnSecondary, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
              <Package size={15} /> Importer ici
              <input type="file" accept=".xlsx,.xls" onChange={handleStockImport} style={{ display:"none" }} />
            </label>
            <button onClick={openNew} style={S.btnPrimary}>+ Ajouter</button>
          </div>
        )}
      </div>
      {stockMsg && (
        <div style={{ fontSize:13, marginBottom:16, padding:"10px 14px", borderRadius:12, background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)", color:"var(--t-text-85)" }}>
          {stockMsg}
          {stockImports && stockImports.length >= 2 && (
            <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:4 }}>{stockImports.length} imports mémorisés — les sorties sont calculées entre deux dates.</div>
          )}
        </div>
      )}

      {/* Références à intégrer (vues en import, absentes du référencement) */}
      {isAdmin && (unknownRefs||[]).length > 0 && (
        <div style={{ marginBottom:16, padding:16, borderRadius:18, background:"var(--t-card-bg)", border:"1px solid rgba(245,158,11,0.35)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>📋 {(unknownRefs||[]).length} référence{(unknownRefs||[]).length>1?"s":""} à intégrer</div>
              <div style={{ fontSize:12, color:"var(--t-text-55)", marginTop:2 }}>Vues dans tes imports mais absentes du référencement. Exporte la liste, complète le fournisseur et les infos, puis intègre-les.</div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={exportUnknownRefs} style={S.btnPrimary}>⬇️ Exporter en Excel</button>
              <label style={{ ...S.btnSecondary, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
                ⬆️ Importer le tableau rempli
                <input type="file" accept=".xlsx,.xls" onChange={handleIntegrateRefs} style={{ display:"none" }} />
              </label>
              <button onClick={()=>setUnknownRefs([])} style={S.btnGhost}>Vider la liste</button>
            </div>
          </div>
          {integrateMsg && <div style={{ marginTop:12, fontSize:13, fontWeight:600, color: integrateMsg.startsWith("✅")?"#22c55e":"#ef4444" }}>{integrateMsg}</div>}
        </div>
      )}

      {/* Modifier le référencement en masse via Excel */}
      {isAdmin && (
        <div style={{ marginBottom:16, padding:16, borderRadius:18, background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)" }}>
          <div style={{ fontSize:14, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>📝 Modifier le référencement (Excel)</div>
          <div style={{ fontSize:12, color:"var(--t-text-55)", marginTop:2, marginBottom:14, lineHeight:1.5 }}>
            Exporte tout ton référencement, modifie/complète dans Excel, puis réimporte. L'app recroise par l'ID caché : elle met à jour, crée les nouvelles lignes et supprime celles que tu retires. <b>Ne touche jamais à la colonne ID.</b> Une case laissée vide ne modifie pas l'info existante.
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={()=>setExportOpen(true)} style={S.btnPrimary}>⬇️ Exporter le référencement</button>
            <label style={{ ...S.btnSecondary, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
              ⬆️ Réimporter le fichier modifié
              <input type="file" accept=".xlsx,.xls" onChange={analyzeRefImport} style={{ display:"none" }} />
            </label>
          </div>
          {refSyncMsg && <div style={{ marginTop:12, fontSize:13, fontWeight:600, color: refSyncMsg.startsWith("✅")||refSyncMsg.startsWith("📤")?"#22c55e":"#ef4444" }}>{refSyncMsg}</div>}
        </div>
      )}

      {/* Fenêtre d'export avec filtres combinables */}
      {exportOpen && (() => {
        const allFamilies = Array.from(new Set(suppliers.flatMap(s => (s.products||[]).map(p => p.family||"").filter(Boolean)))).sort();
        const allSubFamilies = Array.from(new Set(suppliers.flatMap(s => (s.products||[]).map(p => p.subFamily||"").filter(Boolean)))).sort();
        const toggle = (key, val) => setExpFilters(f => ({ ...f, [key]: f[key].includes(val) ? f[key].filter(x=>x!==val) : [...f[key], val] }));
        const okSet = (set, val) => !set || set.length === 0 || set.includes(val);
        const preview = suppliers.reduce((n,s) => {
          if (!okSet(expFilters.suppliers, s.name)) return n;
          return n + (s.products||[]).filter(p =>
            okSet(expFilters.families, p.family||"") && okSet(expFilters.subFamilies, p.subFamily||"") &&
            !(expFilters.onlyNoPrice && p.prixVente != null && p.prixVente !== "") &&
            !(expFilters.onlyNoEan && p.ean)
          ).length;
        }, 0);
        const Chip = ({ active, onClick, children }) => (
          <button onClick={onClick} style={{ padding:"6px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, background: active?"#7c3aed":"var(--t-surface)", color: active?"white":"var(--t-text-55)" }}>{children}</button>
        );
        return (
          <div onClick={()=>setExportOpen(false)} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
            <div onClick={e=>e.stopPropagation()} style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:24, padding:22, maxWidth:480, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 30px 80px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>Exporter le référencement</div>
                <button onClick={()=>setExportOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-40)" }}><X size={18}/></button>
              </div>
              <div style={{ fontSize:12, color:"var(--t-text-55)", marginBottom:16 }}>Combine les filtres. Aucun filtre = tout le référencement.</div>

              <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Fournisseurs</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                {suppliers.map(s => <Chip key={s.id} active={expFilters.suppliers.includes(s.name)} onClick={()=>toggle("suppliers", s.name)}>{s.name}</Chip>)}
              </div>

              {allFamilies.length > 0 && (<>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Familles</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                  {allFamilies.map(fam => <Chip key={fam} active={expFilters.families.includes(fam)} onClick={()=>toggle("families", fam)}>{fam}</Chip>)}
                </div>
              </>)}

              {allSubFamilies.length > 0 && (<>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Sous-familles</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                  {allSubFamilies.map(sf => <Chip key={sf} active={expFilters.subFamilies.includes(sf)} onClick={()=>toggle("subFamilies", sf)}>{sf}</Chip>)}
                </div>
              </>)}

              <div style={{ fontSize:11, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>À compléter</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:18 }}>
                <Chip active={expFilters.onlyNoPrice} onClick={()=>setExpFilters(f=>({...f,onlyNoPrice:!f.onlyNoPrice}))}>Sans prix de vente</Chip>
                <Chip active={expFilters.onlyNoEan} onClick={()=>setExpFilters(f=>({...f,onlyNoEan:!f.onlyNoEan}))}>Sans EAN</Chip>
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <button onClick={()=>setExpFilters({ suppliers:[], families:[], subFamilies:[], onlyNoPrice:false, onlyNoEan:false })} style={{ ...S.btnGhost, fontSize:12 }}>Réinitialiser</button>
                <div style={{ fontSize:13, color:"var(--t-text-55)" }}>{preview} produit(s)</div>
              </div>
              <button onClick={()=>{ exportReferencement(expFilters); setExportOpen(false); }} disabled={preview===0} style={{ ...S.btnPrimary, width:"100%", marginTop:12, opacity:preview===0?0.5:1 }}>⬇️ Exporter {preview} produit(s)</button>
            </div>
          </div>
        );
      })()}

      {/* Confirmation avant d'appliquer la synchro du référencement */}
      {pendingRefImport && (
        <div onClick={()=>setPendingRefImport(null)} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:24, padding:24, maxWidth:420, width:"100%", boxShadow:"0 30px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>Confirmer la synchronisation</div>
            <div style={{ fontSize:14, color:"var(--t-text-70)", lineHeight:1.6, marginBottom:8 }}>Voici ce qui va être appliqué à ton référencement :</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18, fontSize:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span>✏️ Produits mis à jour</span><b>{pendingRefImport.toUpdate}</b></div>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span>➕ Produits créés</span><b style={{ color:"#22c55e" }}>{pendingRefImport.toCreate}</b></div>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span>🗑️ Produits supprimés</span><b style={{ color: pendingRefImport.toDelete>0?"#ef4444":"inherit" }}>{pendingRefImport.toDelete}</b></div>
              {pendingRefImport.toSkipNoSupplier > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span>⚠️ Nouvelles lignes sans fournisseur (ignorées)</span><b style={{ color:"#f59e0b" }}>{pendingRefImport.toSkipNoSupplier}</b></div>}
            </div>
            {pendingRefImport.toDelete > 0 && (
              <div style={{ fontSize:12, color:"#ef4444", background:"rgba(239,68,68,0.1)", padding:"8px 12px", borderRadius:10, marginBottom:16 }}>
                ⚠️ {pendingRefImport.toDelete} produit(s) seront définitivement retirés du référencement (absents du fichier). Pense à avoir une sauvegarde.
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setPendingRefImport(null)} style={{ ...S.btnSecondary, flex:1, padding:"12px" }}>Annuler</button>
              <button onClick={applyRefImport} style={{ ...S.btnPrimary, flex:1, padding:"12px" }}>Appliquer</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {suppliers.map(s => {
          // Stats du fournisseur
          const supplierOrders = (orders||[]).filter(o => o.supplierName === s.name);
          const lastOrder = supplierOrders.length > 0 ? [...supplierOrders].sort((a,b)=>b.date?.localeCompare(a.date||"")||0)[0] : null;
          const alertCount = s.products.filter(p => p.dispo != null && p.dispo <= (p.stockMin ?? calcStockMin(p.weeklyVolume)) && p.stockMin > 0).length;
          const initials = s.name.split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("");
          const colors = ["#7c3aed","#8b5cf6","#0891b2","#059669","#d97706","#e11d48"];
          const color = colors[s.name.charCodeAt(0) % colors.length];

          return (
            <div key={s.id} style={{ ...S.card, padding:0, overflow:"hidden" }}>
              {/* Corps de la carte */}
              <div style={{ padding:"18px 20px", display:"flex", alignItems:"center", gap:16 }}>
                {/* Avatar initiales */}
                <div style={{ width:48, height:48, borderRadius:14, background:`${color}22`, border:`1.5px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color, flexShrink:0, letterSpacing:"-0.02em" }}>
                  {initials}
                </div>
                {/* Infos */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <div style={{ fontWeight:700, fontSize:15, color:"var(--t-text-90)" }}>{s.name}</div>
                    {alertCount > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#ef4444", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", padding:"1px 7px", borderRadius:10 }}>⚠ {alertCount} alerte{alertCount>1?"s":""}</span>}
                  </div>
                  <div style={{ fontSize:12, color:"var(--t-text-40)", marginTop:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.commercial}{s.email ? ` · ${s.email}` : ""}</div>
                  {/* Stats rapides */}
                  <div style={{ display:"flex", gap:14, marginTop:8, flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color }}>{s.products.length}</span>
                      <span style={{ fontSize:11, color:"var(--t-text-40)" }}>produit{s.products.length>1?"s":""}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"var(--t-text-70)" }}>{supplierOrders.length}</span>
                      <span style={{ fontSize:11, color:"var(--t-text-40)" }}>commande{supplierOrders.length>1?"s":""}</span>
                    </div>
                    {lastOrder && <div style={{ fontSize:11, color:"var(--t-text-40)" }}>Dernière : {fmtDate(lastOrder.date)}</div>}
                  </div>
                </div>
              </div>

              {/* Barre d'actions */}
              <div style={{ borderTop:"1px solid var(--t-border-subtle)", padding:"10px 16px", display:"flex", gap:8, background:"var(--t-surface)", flexWrap:"wrap" }}>
                <button onClick={() => setExpanded(expanded===s.id ? null : s.id)} style={{ ...S.btnGhost, flex:1, minWidth:80, fontSize:12 }}>
                  {expanded===s.id ? "▲ Masquer" : "▼ Catalogue"}
                </button>
                {isAdmin && <>
                  <button onClick={() => openEdit(s)} style={{ ...S.btnSecondary, flex:1, minWidth:80, fontSize:12 }}>Modifier</button>
                  <ConfirmDeleteButton onConfirm={() => del(s.id)} small style={{ flex:1, minWidth:80 }} />
                </>}
                <button onClick={() => setPage && setPage("new")} style={{ flex:2, minWidth:120, padding:"8px 14px", borderRadius:22, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${color},${color}bb)`, color:"white", fontWeight:700, fontSize:12, boxShadow:`0 4px 12px ${color}44` }}>
                  + Commander
                </button>
              </div>

              {/* Catalogue déroulant */}
              {expanded===s.id && (
                <div style={{ borderTop:"1px solid var(--t-border-subtle)", overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead><tr style={{ background:"var(--t-thead-bg)" }}>
                      {["Réf.","Code EAN","Désignation","Sous-famille","Prix HT","Stock","Dispo.","Stock min"].map(h => (
                        <th key={h} style={{ padding:"7px 10px", textAlign:"left", fontSize:11, color:"var(--t-text-55)", fontWeight:600, whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{s.products.map(p => (
                      <tr key={p.ref} style={{ borderBottom:"1px solid var(--t-border-subtle)" }}>
                        <td style={{ ...S.td, fontFamily:"monospace", fontSize:11 }}>{p.ref}</td>
                        <td style={{ ...S.td, fontFamily:"monospace", fontSize:11, color:"var(--t-text-55)" }}>{p.ean || "—"}</td>
                        <td style={S.td}>{p.label}</td>
                        <td style={S.td}><span style={{ fontFamily:"monospace", fontSize:11, background:"var(--t-tag-bg)", padding:"2px 8px", borderRadius:8, color:"var(--t-tag-color)", border:"1px solid var(--t-tag-border)" }}>{p.subFamily || "—"}</span></td>
                        <td style={{ ...S.td, fontWeight:600, color:"#059669" }}>{fmt(p.price)}</td>
                        <td style={{ ...S.td, color:"var(--t-text-85)" }}>{p.stock != null ? p.stock : "—"}</td>
                        <td style={{ ...S.td, fontWeight:600, color:(p.dispo!=null&&p.dispo<=(p.stockMin??calcStockMin(p.weeklyVolume)))?"#DC2626":"var(--t-text-90)" }}>
                          {p.dispo!=null?p.dispo:"—"}
                          {p.stockRefFichier && <span title={`Rapproché depuis la référence "${p.stockRefFichier}" du fichier de stock`} style={{ marginLeft:5, fontSize:9, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.12)", padding:"1px 5px", borderRadius:5, cursor:"help" }}>≈</span>}
                        </td>
                        <td style={{ ...S.td, fontWeight:600, color:"#D97706" }}>{p.stockMin??calcStockMin(p.weeklyVolume)}{p.stockMinAuto&&<span style={{ marginLeft:5, fontSize:9, fontWeight:700, color:"#7c3aed", background:"rgba(124,58,237,0.12)", padding:"1px 5px", borderRadius:5 }}>auto</span>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPage({ users, setUsers, locations, setLocations, onExport, onImport, loadHistory, onRestoreSnapshot }) {
  const [form, setForm]     = useState(null);
  const [editing, setEditing] = useState(null);
  const [importMsg, setImportMsg] = useState("");
  const [history, setHistory] = useState(null);
  const [restoreMsg, setRestoreMsg] = useState("");
  function openNew() { setForm({ id:"u"+Date.now(), email:"", password:"", name:"", role:"user", canSeePrices:false, canUseAI:false, active:true, pages:["dashboard","orders","new"] }); setEditing("new"); }
  function openEdit(u) { setForm({...u}); setEditing(u.id); }
  function save() {
    if (!form.email||!form.password||!form.name) return;
    setUsers(prev => { const idx=prev.findIndex(u=>u.id===form.id); if(idx>=0){const n=[...prev];n[idx]=form;return n;} return [...prev,form]; });
    setEditing(null); setForm(null);
  }
  function toggle(id, field) { setUsers(prev => prev.map(u => u.id===id ? {...u,[field]:!u[field]} : u)); }

  if (editing) return (
    <div>
      <button onClick={() => { setEditing(null); setForm(null); }} style={{ ...S.btnGhost, marginBottom: 16 }}>← Annuler</button>
      <div style={{ ...S.card, maxWidth: 480 }}>
        <h2 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>{editing==="new" ? "Nouvel utilisateur" : "Modifier"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nom complet *"><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} style={S.input} /></Field>
          <Field label="Email *"><input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} style={S.input} type="email" /></Field>
          <Field label="Mot de passe *"><input value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} style={S.input} /></Field>
          <Field label="Rôle">
            <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))} style={{...S.input,background:"white"}}>
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </Field>
          <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13 }}>
            <input type="checkbox" checked={form.canSeePrices} onChange={e => setForm(f=>({...f,canSeePrices:e.target.checked}))} />
            Accès aux prix (P.U. et montants)
          </label>
          <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13 }}>
            <input type="checkbox" checked={form.canUseAI||false} onChange={e => setForm(f=>({...f,canUseAI:e.target.checked}))} />
            ✨ Accès aux fonctions IA (recherche intelligente, suggestions...)
          </label>
          <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13 }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(f=>({...f,active:e.target.checked}))} />
            Compte actif
          </label>
          {form.role !== "admin" && (
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:"var(--t-text-85)",marginBottom:8 }}>Onglets accessibles</div>
              <div style={{ display:"flex",flexDirection:"column",gap:6,background:"var(--t-surface)",borderRadius:8,padding:12,border:"1px solid var(--t-border-subtle)" }}>
                {ALL_PAGES.map(p => (
                  <label key={p.key} style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13,color:"var(--t-text-85)" }}>
                    <input type="checkbox"
                      checked={(form.pages||[]).includes(p.key)}
                      onChange={e => {
                        const pages = form.pages||[];
                        setForm(f=>({...f, pages: e.target.checked ? [...pages,p.key] : pages.filter(k=>k!==p.key)}));
                      }}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:20 }}>
          <button onClick={() => { setEditing(null); setForm(null); }} style={S.btnSecondary}>Annuler</button>
          <button onClick={save} disabled={!form.email||!form.password||!form.name} style={{...S.btnPrimary,opacity:(form.email&&form.password&&form.name)?1:0.5}}>Enregistrer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.03em" }}>Gestion des utilisateurs</h1>
        <button onClick={openNew} style={S.btnPrimary}>+ Créer un compte</button>
      </div>

      {/* Sauvegarde des données */}
      <div style={{ ...S.card, marginBottom:20, border:"1px solid rgba(124,58,237,0.3)" }}>
        <h2 style={{ margin:"0 0 6px 0", fontSize:15, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>🛟 Sauvegarde des données</h2>
        <div style={{ fontSize:13, color:"var(--t-text-55)", marginBottom:16, lineHeight:1.5 }}>
          Télécharge un fichier de sauvegarde avec toutes tes données (fournisseurs, catalogues, tâches, commandes…). Garde-le sur ton ordinateur ou un cloud. En cas de problème, tu pourras tout restaurer.
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={onExport} style={{ ...S.btnPrimary, display:"inline-flex", alignItems:"center", gap:6 }}>⬇️ Exporter ma sauvegarde</button>
          <label style={{ ...S.btnSecondary, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
            ⬆️ Restaurer une sauvegarde
            <input type="file" accept="application/json,.json" style={{ display:"none" }} onChange={e => {
              const f = e.target.files && e.target.files[0];
              if (f) onImport(f, setImportMsg);
              e.target.value = "";
            }} />
          </label>
        </div>
        {importMsg && <div style={{ marginTop:12, fontSize:13, fontWeight:600, color: importMsg.startsWith("✅")?"#22c55e":"#ef4444" }}>{importMsg}</div>}

        {/* Historique des versions automatiques */}
        <div style={{ marginTop:18, borderTop:"1px solid var(--t-border-subtle)", paddingTop:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>🕐 Historique des versions</div>
              <div style={{ fontSize:12, color:"var(--t-text-55)", marginTop:2 }}>Sauvegardes automatiques (10 dernières). Restaure si quelque chose a disparu.</div>
            </div>
            <button onClick={async ()=>{ setHistory("loading"); const h = await loadHistory(); setHistory(h); }} style={S.btnSecondary}>
              {history==="loading" ? "Chargement…" : "Afficher l'historique"}
            </button>
          </div>
          {Array.isArray(history) && (
            history.length === 0
              ? <div style={{ fontSize:13, color:"var(--t-text-40)", marginTop:12 }}>Aucune version enregistrée pour l'instant. Les sauvegardes se créent automatiquement au fil de ton utilisation.</div>
              : <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:12 }}>
                  {history.map((snap,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"10px 14px", background:"var(--t-surface)", borderRadius:10 }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{new Date(snap.at).toLocaleString("fr-FR",{ weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</div>
                        <div style={{ fontSize:11, color:"var(--t-text-40)" }}>
                          {(snap.state?.suppliers||[]).length} fourn. · {(snap.state?.promoCatalogues||[]).length} catalogues · {(snap.state?.tasks||[]).length} tâches
                        </div>
                      </div>
                      <button onClick={()=>{ onRestoreSnapshot(snap.state); setRestoreMsg("✅ Version du "+new Date(snap.at).toLocaleString("fr-FR")+" restaurée."); }} style={{ ...S.btnPrimary, padding:"6px 14px", fontSize:12 }}>Restaurer</button>
                    </div>
                  ))}
                </div>
          )}
          {restoreMsg && <div style={{ marginTop:12, fontSize:13, fontWeight:600, color:"#22c55e" }}>{restoreMsg}</div>}
        </div>
      </div>
      {/* Lieux de livraison */}
      <div style={{ ...S.card, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h2 style={{ margin:0, fontSize:15, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}><MapPin size={17} /> Lieux de livraison</h2>
          <button onClick={() => setLocations(prev => [...prev, { id:"l"+Date.now(), label:"" }])} style={S.btnSecondary}>+ Ajouter</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {locations.map((loc, i) => (
            <div key={loc.id} style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input
                value={loc.label}
                onChange={e => setLocations(prev => prev.map(l => l.id===loc.id ? {...l, label:e.target.value} : l))}
                style={{ ...S.input, flex:1 }}
                placeholder="Nom du lieu de livraison…"
              />
              <ConfirmDeleteButton onConfirm={() => { if(locations.length > 1) setLocations(prev => prev.filter(l => l.id!==loc.id)); }} small label="✕" confirmLabel="⚠" style={{ padding:"8px 12px", flexShrink:0, opacity: locations.length===1?0.4:1, pointerEvents: locations.length===1?"none":"auto" }} />
            </div>
          ))}
        </div>
      </div>


      <div style={S.card}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
          <thead><tr style={{ background:"var(--t-thead-bg)" }}>
            {["Nom","Email","Rôle","Accès prix","IA","Onglets","Actif","Actions"].map(h => (
              <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:"var(--t-text-40)",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1.5px solid var(--t-border-subtle)" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id} style={{ borderBottom:"1px solid var(--t-border-subtle)" }}>
              <td style={S.td}><span style={{ fontWeight:600 }}>{u.name}</span></td>
              <td style={{ ...S.td,color:"var(--t-text-40)" }}>{u.email}</td>
              <td style={S.td}><span style={{ padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:600,background:u.role==="admin"?"rgba(124,58,237,0.3)":"var(--t-border-subtle)",color:u.role==="admin"?"#a5b4fc":"var(--t-text-55)",border:`1px solid ${u.role==="admin"?"rgba(124,58,237,0.4)":"var(--t-border-subtle)"}` }}>{u.role==="admin"?"Admin":"Utilisateur"}</span></td>
              <td style={S.td}><button onClick={() => toggle(u.id,"canSeePrices")} style={{ padding:"3px 10px",borderRadius:12,cursor:"pointer",fontSize:11,fontWeight:600,background:u.canSeePrices?"rgba(5,150,105,0.2)":"var(--t-surface)",color:u.canSeePrices?"#34d399":"var(--t-text-55)",border:`1px solid ${u.canSeePrices?"rgba(52,211,153,0.3)":"var(--t-border-subtle)"}` }}>{u.canSeePrices?"✓ Oui":"✕ Non"}</button></td>
              <td style={S.td}><button onClick={() => toggle(u.id,"canUseAI")} style={{ padding:"3px 10px",borderRadius:12,cursor:"pointer",fontSize:11,fontWeight:600,background:u.canUseAI?"rgba(139,92,246,0.2)":"var(--t-surface)",color:u.canUseAI?"#a78bfa":"var(--t-text-55)",border:`1px solid ${u.canUseAI?"rgba(139,92,246,0.35)":"var(--t-border-subtle)"}` }}>{u.canUseAI?"✨ Oui":"✕ Non"}</button></td>
              <td style={S.td}>
                {u.role==="admin" ? <span style={{fontSize:11,color:"var(--t-text-40)"}}>Tout</span> :
                  <span style={{fontSize:11,color:"var(--t-text-85)"}}>{(u.pages||[]).length}/{ALL_PAGES.length} onglets</span>}
              </td>
              <td style={S.td}><button onClick={() => toggle(u.id,"active")} style={{ padding:"3px 10px",borderRadius:12,cursor:"pointer",fontSize:11,fontWeight:600,background:u.active?"rgba(5,150,105,0.2)":"rgba(239,68,68,0.15)",color:u.active?"#34d399":"#f87171",border:`1px solid ${u.active?"rgba(52,211,153,0.3)":"rgba(239,68,68,0.3)"}` }}>{u.active?"Actif":"Inactif"}</button></td>
              <td style={S.td}><button onClick={() => openEdit(u)} style={S.btnGhost}>Modifier</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
