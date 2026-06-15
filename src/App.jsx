import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { Home, ClipboardList, BarChart3, Factory, Settings, Bell, PencilLine, Clock, CheckCircle2, FolderTree, Search, MapPin, FileText, Package, Sun, Moon, Wallet, X, Plus, ScanLine, Camera, Truck, ChevronRight } from "lucide-react";

// ── Logo CommaPro (monogramme CP) ────────────────────────────────────────────
function CPLogo({ size = 36, light = false }) {
  const main = light ? "#ffffff" : "#1e1b4b";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 18 C30 18 18 32 18 50 C18 68 30 82 50 82 L50 66 C38 66 32 59 32 50 C32 41 38 34 50 34 Z" fill={main}/>
      <path d="M52 26 L52 74 C52 76 53 78 56 78 C59 78 60 76 60 74 L60 58 L70 58 C82 58 88 50 88 42 C88 34 82 26 70 26 Z M60 38 L68 38 C72 38 74 40 74 42 C74 44 72 46 68 46 L60 46 Z" fill={main}/>
      <rect x="52" y="74" width="8" height="14" rx="4" fill="#7c5cff"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION SUPABASE
// 👉 Remplace les 2 valeurs ci-dessous par les tiennes (voir le guide GUIDE.md).
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

// ─── INITIAL DATA ──────────────────────────────────────────────────────────────
// Pages configurables (admins ont toujours tout)
const ALL_PAGES = [
  { key: "dashboard", label: "Accueil", icon: Home },
  { key: "orders",    label: "Commandes", icon: ClipboardList },
  { key: "stats",     label: "Statistiques", icon: BarChart3 },
  { key: "suppliers", label: "Fournisseurs", icon: Factory },
];

const INIT_USERS = [
  { id: "u1", email: "admin@demo.com", password: "admin123", name: "Admin", role: "admin", canSeePrices: true, active: true, pages: ALL_PAGES.map(p => p.key) },
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
  return `BC-${year}-${String(next).padStart(3, "0")}`;
};
const lineTotal = (l) => (l.qty || 0) * (l.price || 0);
const orderTotal = (o) => o.lines.reduce((s, l) => s + lineTotal(l), 0);
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
function generatePDF(order, showPrices) {
  const total = orderTotal(order);
  const tva = total * 0.085; // TVA 8.5% La Réunion
  const ttc = total + tva;
  const linesHTML = order.lines.map((l, i) => `
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
        ${order.commercial ? `<p>Commercial : <strong>${order.commercial}</strong></p>` : ""}
        ${order.email ? `<p>Email : ${order.email}</p>` : ""}
      </div>
      <div class="info-block">
        <h3>Livraison</h3>
        <p>Date souhaitée : <strong>${fmtDate(order.deliveryDate) || "Non précisée"}</strong></p>
        <p>Lieu : <strong>${order.deliveryPlace || "Non précisé"}</strong></p>
        ${order.notes ? `<p style="margin-top:8px;font-style:italic;color:#6b7280">${order.notes}</p>` : ""}
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
            ${showPrices ? `<th class="right">P.U. HT</th><th class="right">Total HT</th>` : ""}
          </tr>
        </thead>
        <tbody>${linesHTML}</tbody>
      </table>
    </div>

    <!-- Totaux -->
    ${showPrices ? `
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row"><span>Sous-total HT</span><span>${fmt(total)}</span></div>
        <div class="totals-row"><span>TVA (8,5%)</span><span>${fmt(tva)}</span></div>
        <div class="totals-row total"><span>Total TTC</span><span>${fmt(ttc)}</span></div>
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

  const blob = new Blob([html], { type: "text/html" });
  const win = window.open(URL.createObjectURL(blob), "_blank");
  if (win) setTimeout(() => win.print(), 900);
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  btnPrimary:   { padding:"9px 20px", borderRadius:22, border:"none", cursor:"pointer", background:"linear-gradient(135deg,rgba(99,102,241,0.9),rgba(139,92,246,0.9))", color:"white", fontWeight:600, fontSize:13, backdropFilter:"blur(8px)", boxShadow:"0 4px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2)", letterSpacing:"-0.01em", transition:"all 0.18s" },
  btnSecondary: { padding:"8px 16px", borderRadius:22, border:"1px solid rgba(255,255,255,0.14)", cursor:"pointer", background:"var(--t-border-subtle)", color:"var(--t-btn-sec-color)", fontWeight:500, fontSize:13, backdropFilter:"blur(8px)", transition:"all 0.18s" },
  btnDanger:    { padding:"8px 16px", borderRadius:22, border:"1px solid rgba(239,68,68,0.35)", cursor:"pointer", background:"rgba(239,68,68,0.12)", color:"#f87171", fontWeight:500, fontSize:13, backdropFilter:"blur(8px)", transition:"all 0.18s" },
  btnGhost:     { padding:"6px 12px", borderRadius:16, border:"none", cursor:"pointer", background:"transparent", color:"var(--t-btn-ghost)", fontWeight:500, fontSize:13, transition:"all 0.18s" },
  input:        { width:"100%", padding:"10px 14px", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", fontSize:13, outline:"none", boxSizing:"border-box", background:"var(--t-border-subtle)", backdropFilter:"blur(8px)", color:"#f0f0f5" },
  label:        { display:"block", fontSize:11, fontWeight:600, color:"var(--t-text-55)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" },
  card:         { background:"var(--t-surface)", backdropFilter:"blur(24px) saturate(160%)", WebkitBackdropFilter:"blur(24px) saturate(160%)", borderRadius:20, padding:24, border:"1px solid rgba(255,255,255,0.13)", boxShadow:"0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)" },
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
          <div style={{ width:40, height:40, borderRadius:11, background:"rgba(255,255,255,0.95)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 14px rgba(99,102,241,0.3)" }}>
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
              {isActive && <div style={{ position:"absolute", left:0, top:"20%", bottom:"20%", width:3, borderRadius:"0 3px 3px 0", background:"#818cf8" }} />}
              <Icon size={17} strokeWidth={isActive?2.2:1.8} />
              {lbl}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"12px 10px", borderTop:"1px solid var(--t-sidebar-border)" }}>
        <button onClick={() => setDark(d => !d)} style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"9px 12px", borderRadius:10, border:"none", cursor:"pointer", background:"transparent", color:"var(--t-sidebar-text)", fontSize:13, marginBottom:6, transition:"all 0.15s" }}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {dark ? "Mode clair" : "Mode sombre"}
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"var(--t-sidebar-active)" }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,rgba(99,102,241,0.8),rgba(168,85,247,0.8))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"white", flexShrink:0 }}>
            {session.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--t-sidebar-text-active)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{session.name}</div>
            <div style={{ fontSize:10, color:"var(--t-sidebar-text)", marginTop:1 }}>{session.role === "admin" ? "Administrateur" : "Utilisateur"}</div>
          </div>
          <button onClick={onLogout} title="Déconnexion" style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-sidebar-text)", padding:4, borderRadius:6, display:"flex", transition:"color 0.15s" }}>
            <X size={15} />
          </button>
        </div>
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
            <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"white", flexShrink:0 }}>{session.name.charAt(0).toUpperCase()}</div>
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
                {isActive && <div style={{ position:"absolute", left:0, top:"20%", bottom:"20%", width:3, borderRadius:"0 3px 3px 0", background:"#818cf8" }} />}
                {Icon && <Icon size={18} strokeWidth={isActive?2.2:1.8} />}
                {lbl}
              </button>
            );
          })}
        </nav>
        <div style={{ padding:"12px", borderTop:"1px solid var(--t-sidebar-border)" }}>
          <button onClick={() => setDark(d => !d)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"10px 14px", borderRadius:12, border:"none", cursor:"pointer", background:"transparent", color:"var(--t-sidebar-text)", fontSize:13, marginBottom:6 }}>
            <span style={{ display:"flex", alignItems:"center", gap:10 }}>{dark ? <Sun size={16}/> : <Moon size={16}/>}{dark ? "Mode clair" : "Mode sombre"}</span>
            <div style={{ width:36, height:20, borderRadius:10, background:dark?"rgba(99,102,241,0.7)":"rgba(200,200,200,0.5)", position:"relative", transition:"background 0.3s", flexShrink:0 }}>
              <div style={{ position:"absolute", top:2, left:dark?16:2, width:16, height:16, borderRadius:"50%", background:"white", transition:"left 0.3s" }} />
            </div>
          </button>
          <button onClick={() => { onLogout(); onClose(); }} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px", borderRadius:12, border:"none", cursor:"pointer", background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:13, fontWeight:600 }}>
            <X size={16}/> Se déconnecter
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
                  <div style={{ marginBottom:8, display:"flex", justifyContent:"center" }}><CheckCircle2 size={28} color="#34d399" /></div>Aucune alerte — tout est en ordre
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
  const [session,   setSession]   = useState(null);
  const [page,      setPage]      = useState("dashboard");
  const [dark,      setDark]      = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");  // filtre pré-sélectionné depuis dashboard
  const [loaded,    setLoaded]    = useState(false);  // true une fois les données cloud chargées

  // ── Chargement initial depuis Supabase ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const cloud = await loadCloud();
      if (cloud) {
        if (cloud.users)     setUsers(cloud.users);
        if (cloud.suppliers) setSuppliers(cloud.suppliers);
        if (cloud.orders)    setOrders(cloud.orders);
        if (cloud.locations) setLocations(cloud.locations);
        if (cloud.stockImports) setStockImports(cloud.stockImports);
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
    saveCloud({ users, suppliers, orders, locations, stockImports });
  }, [users, suppliers, orders, locations, stockImports, loaded]);

  // ── Rafraîchissement temps réel (autres utilisateurs) toutes les 5 sec ──────
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(async () => {
      const cloud = await loadCloud();
      if (cloud) {
        if (cloud.users)     setUsers(cloud.users);
        if (cloud.suppliers) setSuppliers(cloud.suppliers);
        if (cloud.orders)    setOrders(cloud.orders);
        if (cloud.locations) setLocations(cloud.locations);
        if (cloud.stockImports) setStockImports(cloud.stockImports);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loaded]);

  // Le thème reste local à chaque appareil (préférence personnelle)
  useEffect(() => { try { localStorage.setItem("cv_dark", JSON.stringify(dark)); } catch {} }, [dark]);
  useEffect(() => { try { const d = localStorage.getItem("cv_dark"); if (d !== null) setDark(JSON.parse(d)); } catch {} }, []);

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

  if (!loaded) return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0a0a0f 0%,#0d1117 50%,#0a0f1a 100%)", color:"white", fontFamily:"-apple-system,'SF Pro Display',sans-serif", gap:22, position:"relative", overflow:"hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}} @keyframes glow{0%,100%{opacity:0.4}50%{opacity:0.7}}`}</style>
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)", animation:"glow 3s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:22 }}>
        <div style={{ width:96, height:96, borderRadius:26, background:"rgba(255,255,255,0.95)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 16px 48px rgba(99,102,241,0.4)", animation:"pulse 2s ease-in-out infinite" }}>
          <CPLogo size={60} />
        </div>
        <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.03em", background:"linear-gradient(135deg,#e0e7ff,#a5b4fc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>CommaPro</div>
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"rgba(255,255,255,0.5)", fontSize:13 }}>
          <div style={{ width:18, height:18, border:"2px solid rgba(255,255,255,0.15)", borderTopColor:"#818cf8", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          Chargement…
        </div>
      </div>
    </div>
  );
  if (!session) return <LoginScreen users={users} onLogin={setSession} dark={dark} setDark={setDark} />;
  const isAdmin = session.role === "admin";

  const allowedPages = isAdmin ? ALL_PAGES.map(p => p.key) : (session.pages || ["dashboard","orders"]);
  const navItems = [
    ...ALL_PAGES.filter(p => allowedPages.includes(p.key)).map(p => [p.key, p.label, p.icon]),
    isAdmin ? ["admin", "Admin", Settings] : null,
  ].filter(Boolean);

  // ── Theme tokens ────────────────────────────────────────────────────────────
  // DARK = indigo/violet "Liquid Glass" night.  LIGHT = clean slate/blue daylight.
  const themeCSS = dark ? `
    :root {
      --t-text-90: rgba(255,255,255,0.95);
      --t-text-85: rgba(255,255,255,0.88);
      --t-text-70: rgba(255,255,255,0.74);
      --t-text-55: rgba(255,255,255,0.58);
      --t-text-40: rgba(255,255,255,0.42);
      --t-text-30: rgba(255,255,255,0.32);
      --t-input-color: #ffffff;
      --t-input-bg: rgba(255,255,255,0.07);
      --t-input-border: rgba(255,255,255,0.14);
      --t-placeholder: rgba(255,255,255,0.4);
      --t-option-bg: #1c1c2e;
      --t-scroll: rgba(255,255,255,0.14);
      --t-row-hover: rgba(99,102,241,0.1);
      --t-drop-bg: rgba(14,14,26,0.96);
      --t-nav-hover: rgba(255,255,255,0.1);
      --t-sidebar-bg: rgba(10,10,18,0.96);
      --t-sidebar-border: rgba(255,255,255,0.07);
      --t-sidebar-active: rgba(99,102,241,0.15);
      --t-sidebar-text: rgba(255,255,255,0.55);
      --t-sidebar-text-active: rgba(255,255,255,0.95);
      --t-card-bg: rgba(255,255,255,0.07);
      --t-card-border: rgba(255,255,255,0.13);
      --t-card-shadow: 0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
      --t-td-border: rgba(255,255,255,0.08);
      --t-thead-bg: rgba(255,255,255,0.05);
      --t-thead-color: rgba(255,255,255,0.6);
      --t-border-subtle: rgba(255,255,255,0.08);
      --t-surface: rgba(255,255,255,0.06);
      --t-surface-hover: rgba(255,255,255,0.09);
      --t-notif-bg: rgba(239,68,68,0.1);
      --t-notif-border: rgba(239,68,68,0.28);
      --t-badge-bg: rgba(255,255,255,0.06);
      --t-btn-sec-color: rgba(255,255,255,0.85);
      --t-btn-ghost: #a5b4fc;
      --t-mono-bg: rgba(255,255,255,0.07);
      --t-mono-color: rgba(165,180,252,0.85);
      --t-tag-bg: rgba(129,140,248,0.14);
      --t-tag-color: #c7d2fe;
      --t-tag-border: rgba(129,140,248,0.25);
      --t-separator: rgba(255,255,255,0.08);
      --t-infoblock: rgba(255,255,255,0.05);
      --t-infoblock-border: rgba(255,255,255,0.08);
    }
  ` : `
    :root {
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
      --t-row-hover: rgba(20,184,166,0.08);
      --t-drop-bg: rgba(255,255,255,0.99);
      --t-nav-hover: rgba(20,184,166,0.1);
      --t-sidebar-bg: rgba(248,248,252,0.98);
      --t-sidebar-border: rgba(0,0,0,0.07);
      --t-sidebar-active: rgba(99,102,241,0.10);
      --t-sidebar-text: rgba(30,30,60,0.60);
      --t-sidebar-text-active: rgba(20,20,50,0.95);
      --t-card-bg: rgba(255,255,255,0.96);
      --t-card-border: rgba(15,23,42,0.08);
      --t-card-shadow: 0 4px 20px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04);
      --t-td-border: rgba(15,23,42,0.07);
      --t-thead-bg: rgba(20,184,166,0.08);
      --t-thead-color: #0f766e;
      --t-border-subtle: rgba(15,23,42,0.1);
      --t-surface: rgba(248,250,252,1);
      --t-surface-hover: rgba(241,245,249,1);
      --t-notif-bg: #fef2f2;
      --t-notif-border: rgba(248,113,113,0.5);
      --t-badge-bg: rgba(20,184,166,0.08);
      --t-btn-sec-color: #334155;
      --t-btn-ghost: #0d9488;
      --t-mono-bg: rgba(20,184,166,0.1);
      --t-mono-color: #0f766e;
      --t-tag-bg: rgba(13,148,136,0.1);
      --t-tag-color: #0f766e;
      --t-tag-border: rgba(13,148,136,0.25);
      --t-separator: rgba(15,23,42,0.1);
      --t-infoblock: rgba(248,250,252,1);
      --t-infoblock-border: rgba(15,23,42,0.08);
    }
  `;

  const T = dark ? {
    bg:       "linear-gradient(135deg,#0a0a0f 0%,#0d1117 40%,#0a0f1a 100%)",
    color:    "#ffffff",
    headerBg: "rgba(8,8,18,0.75)",
    headerBorder: "rgba(255,255,255,0.08)",
    blob1: "rgba(99,102,241,0.18)", blob2: "rgba(14,165,233,0.14)", blob3: "rgba(168,85,247,0.12)",
    accent: "linear-gradient(135deg,#e0e7ff,#a5b4fc)",
  } : {
    bg:       "linear-gradient(135deg,#f0fdfa 0%,#f8fafc 45%,#eff6ff 100%)",
    color:    "#0f172a",
    headerBg: "rgba(255,255,255,0.9)",
    headerBorder: "rgba(15,23,42,0.08)",
    blob1: "rgba(20,184,166,0.12)", blob2: "rgba(59,130,246,0.1)", blob3: "rgba(13,148,136,0.08)",
    accent: "linear-gradient(135deg,#0d9488,#0891b2)",
  };

  return (
    <div style={{ fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,sans-serif", minHeight:"100dvh", background:T.bg, color:T.color, position:"relative", overflowX:"hidden", transition:"background 0.4s, color 0.3s" }}>
      <style>{themeCSS + `
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.97)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,25px) scale(1.03)} 66%{transform:translate(30px,-40px) scale(0.98)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(25px,35px) scale(1.04)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 12px rgba(99,102,241,0.4)} 50%{box-shadow:0 0 24px rgba(99,102,241,0.7)} }
        .lg-btn-primary { transition:all 0.2s cubic-bezier(0.4,0,0.2,1) !important; }
        .lg-btn-primary:hover { opacity:0.88; transform:translateY(-1px) scale(0.99); box-shadow:0 8px 28px rgba(99,102,241,0.5) !important; }
        .lg-btn-primary:active { transform:scale(0.96) !important; }
        .lg-btn-secondary:hover { background:var(--t-nav-hover) !important; transform:translateY(-1px); }
        .lg-nav-btn { transition:all 0.18s cubic-bezier(0.4,0,0.2,1) !important; }
        .lg-nav-btn:hover { background:var(--t-nav-hover) !important; }
        .lg-card { animation:fadeUp 0.35s cubic-bezier(0.4,0,0.2,1) both; transition:box-shadow 0.2s,transform 0.2s !important; }
        .lg-card:hover { box-shadow:0 12px 40px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.2) !important; transform:translateY(-1px); }
        .lg-row { transition:background 0.12s !important; cursor:pointer; }
        .lg-row:hover { background:var(--t-row-hover) !important; }
        .lg-supplier-card { transition:all 0.2s cubic-bezier(0.4,0,0.2,1) !important; }
        .lg-supplier-card:hover { border-color:rgba(99,102,241,0.35) !important; transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,0.15) !important; }
        .lg-product-row { transition:all 0.15s cubic-bezier(0.4,0,0.2,1) !important; }
        .lg-product-row:hover { background:rgba(99,102,241,0.08) !important; border-color:rgba(99,102,241,0.3) !important; transform:translateX(2px); }
        .nav-active-indicator { animation:pulse-glow 2.5s ease-in-out infinite; }
        .lg-search-bar { transition:all 0.2s !important; }
        .lg-search-bar:focus-within { box-shadow:0 0 0 2px rgba(99,102,241,0.3) !important; border-color:rgba(99,102,241,0.4) !important; }
        .stat-card { transition:all 0.22s cubic-bezier(0.4,0,0.2,1) !important; }
        .stat-card:hover { transform:translateY(-3px) !important; box-shadow:0 16px 40px rgba(99,102,241,0.15) !important; }
        * { box-sizing:border-box; }
        html, body { max-width:100%; overflow-x:hidden; }
        /* Tables : scroll horizontal au lieu de casser la page sur mobile */
        table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; max-width: 100%; }
        @media (max-width: 640px) {
          /* Grille d'édition produit (9 colonnes) : scroll horizontal */
          .product-edit-grid { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
        input, select, textarea { color:var(--t-input-color) !important; background:var(--t-input-bg) !important; transition:all 0.18s !important; font-weight:500; }
        input:focus, select:focus, textarea:focus { outline:none !important; border-color:rgba(99,102,241,0.5) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.12) !important; }
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
        }
        @media (max-width: 1023px) {
          .app-shell { display:block; }
          .fab-label { display:none !important; }
          .fab-new { padding:16px !important; border-radius:50% !important; width:52px; height:52px; justify-content:center; }
        }

      `}</style>

      {/* Ambient blobs */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-10%", left:"-5%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,"+T.blob1+" 0%,transparent 70%)", animation:"float1 18s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:"30%", right:"-10%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,"+T.blob2+" 0%,transparent 70%)", animation:"float2 22s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"-15%", left:"30%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,"+T.blob3+" 0%,transparent 70%)", animation:"float3 16s ease-in-out infinite" }} />
      </div>

      {/* Liquid Glass Header — mobile only (hidden on desktop via CSS) */}
      <div className="app-header">
        <AppHeader session={session} page={page} setPage={setPage} navItems={navItems} stockAlerts={stockAlerts} onLogout={() => setSession(null)} dark={dark} setDark={setDark} T={T} onMenuOpen={() => setMobileMenuOpen(true)} />
      </div>

      {/* App shell : sidebar (desktop) + contenu */}
      <div className="app-shell">
        <Sidebar session={session} page={page} setPage={setPage} navItems={navItems} stockAlerts={stockAlerts} onLogout={() => setSession(null)} dark={dark} setDark={setDark} />
        <div className="app-content">
          <main style={{ maxWidth:1200, margin:"0 auto", padding:"28px 24px", paddingLeft:"max(24px, env(safe-area-inset-left))", paddingRight:"max(24px, env(safe-area-inset-right))", paddingBottom:"calc(80px + env(safe-area-inset-bottom))", position:"relative", zIndex:1 }}>
            <div key={page} style={{ animation:"fadeUp 0.25s cubic-bezier(0.4,0,0.2,1) both" }}>
            {page === "dashboard" && <DashboardPage orders={orders} suppliers={suppliers} stockAlerts={stockAlerts} session={session} setPage={setPage} setOrderFilter={setOrderFilter} T={T} />}
            {page === "orders"    && <OrdersPage orders={orders} setOrders={setOrders} session={session} setPage={setPage} initialFilter={orderFilter} onFilterUsed={() => setOrderFilter("all")} T={T} />}
            {page === "new"       && <NewOrderPage orders={orders} setOrders={setOrders} suppliers={suppliers} setSuppliers={setSuppliers} locations={locations} session={session} setPage={setPage} T={T} />}
            {page === "stats"     && <StatsPage orders={orders} suppliers={suppliers} session={session} T={T} />}
            {page === "suppliers" && <SuppliersPage suppliers={suppliers} setSuppliers={setSuppliers} isAdmin={isAdmin} stockImports={stockImports} setStockImports={setStockImports} T={T} />}
            {page === "admin" && isAdmin && <AdminPage users={users} setUsers={setUsers} locations={locations} setLocations={setLocations} T={T} />}
            </div>
          </main>
        </div>
      </div>

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

      {/* Bouton flottant « + Nouvelle commande » — visible partout sauf pendant la création */}
      {page !== "new" && (isAdmin || allowedPages.includes("orders")) && (
        <button
          onClick={() => setPage("new")}
          aria-label="Nouvelle commande"
          className="fab-new"
          style={{
            position:"fixed", right:"max(20px, env(safe-area-inset-right))",
            bottom:"calc(24px + env(safe-area-inset-bottom))", zIndex:300,
            display:"flex", alignItems:"center", gap:10, padding:"15px 22px",
            borderRadius:30, border:"none", cursor:"pointer", color:"white",
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)", fontWeight:700, fontSize:15,
            boxShadow:"0 10px 32px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
            letterSpacing:"-0.01em", transition:"transform 0.18s, box-shadow 0.18s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 14px 40px rgba(99,102,241,0.65)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 10px 32px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.25)"; }}
        >
          <Plus size={20} strokeWidth={2.5} />
          <span className="fab-label">Nouvelle commande</span>
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// FICHE PRODUIT — Panneau qui glisse depuis le bas
// ═══════════════════════════════════════════════════════════════════════════════
function ProductSheet({ product, onClose, session }) {
  if (!product) return null;
  const hasPrice = session.canSeePrices;
  const tva = 0.085;
  const prixAchatTTC = product.price ? product.price * (1 + tva) : null;
  const ecotaxe = product.ecotaxe || 0;
  const prixVente = product.prixVente || null;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:490, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)" }} />

      {/* Panneau bas */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:500,
        background:"var(--t-card-bg)",
        borderRadius:"24px 24px 0 0",
        padding:"0 0 env(safe-area-inset-bottom)",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.4)",
        animation:"slideUp 0.3s cubic-bezier(0.4,0,0.2,1) both",
        maxHeight:"85vh", overflowY:"auto",
      }}>
        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:40, height:4, borderRadius:2, background:"var(--t-border-subtle)" }} />
        </div>

        <div style={{ padding:"8px 24px 28px" }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.02em", color:"var(--t-text-90)", lineHeight:1.2, marginBottom:6 }}>{product.label}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"monospace", fontSize:11, background:"var(--t-surface)", color:"var(--t-text-55)", padding:"2px 8px", borderRadius:6, fontWeight:600 }}>{product.ref}</span>
                {product.ean && <span style={{ fontFamily:"monospace", fontSize:11, background:"rgba(99,102,241,0.1)", color:"#818cf8", padding:"2px 8px", borderRadius:6 }}>EAN {product.ean}</span>}
                {product.subFamily && <span style={{ fontSize:11, background:"var(--t-tag-bg)", color:"var(--t-tag-color)", padding:"2px 8px", borderRadius:6, border:"1px solid var(--t-tag-border)" }}>{product.subFamily}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:10, border:"1px solid var(--t-border-subtle)", background:"var(--t-surface)", cursor:"pointer", color:"var(--t-text-55)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginLeft:12 }}>
              <X size={16} />
            </button>
          </div>

          {/* Fournisseur */}
          <div style={{ background:"var(--t-surface)", borderRadius:14, padding:"12px 16px", marginBottom:16, border:"1px solid var(--t-border-subtle)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Fournisseur</div>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--t-text-90)" }}>{product.supplierName || "—"}</div>
          </div>

          {/* Prix */}
          {hasPrice && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div style={{ background:"var(--t-surface)", borderRadius:14, padding:"14px 16px", border:"1px solid var(--t-border-subtle)" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Prix achat HT</div>
                <div style={{ fontSize:20, fontWeight:800, color:"#34d399" }}>{product.price ? fmt(product.price) : "—"}</div>
                {prixAchatTTC && <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:2 }}>soit {fmt(prixAchatTTC)} TTC</div>}
              </div>
              <div style={{ background: prixVente ? "rgba(99,102,241,0.08)" : "var(--t-surface)", borderRadius:14, padding:"14px 16px", border: prixVente ? "1px solid rgba(99,102,241,0.25)" : "1px solid var(--t-border-subtle)" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Prix de vente TTC</div>
                {prixVente ? (
                  <>
                    <div style={{ fontSize:20, fontWeight:800, color:"#818cf8" }}>{fmt(prixVente)}</div>
                    {ecotaxe > 0 && <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:2 }}>dont {fmt(ecotaxe)} d'écotaxe incluse</div>}
                  </>
                ) : (
                  <div style={{ fontSize:13, color:"var(--t-text-30)", fontStyle:"italic" }}>Non renseigné</div>
                )}
              </div>
            </div>
          )}

          {/* Stock */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
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
              ) : product.dispo != null ? (
                <div style={{ fontSize:24, fontWeight:800, color: product.dispo===0?"#ef4444": product.dispo<=(product.stockMin||0)?"#f59e0b":"#34d399" }}>{product.dispo}</div>
              ) : (
                <div style={{ fontSize:13, color:"var(--t-text-30)", fontStyle:"italic" }}>Aucun import</div>
              )}
            </div>
            <div style={{ background:"var(--t-surface)", borderRadius:14, padding:"14px 16px", border:"1px solid var(--t-border-subtle)" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Stock minimum</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#f59e0b" }}>{product.stockMin ?? "—"}</div>
              {product.weeklyVolume > 0 && <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:2 }}>{product.weeklyVolume} ventes/sem</div>}
            </div>
          </div>

          {/* Famille */}
          {(product.family || product.subFamily) && (
            <div style={{ background:"var(--t-surface)", borderRadius:14, padding:"12px 16px", border:"1px solid var(--t-border-subtle)" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Catégorie</div>
              <div style={{ fontSize:13, color:"var(--t-text-85)" }}>{[product.family, product.subFamily].filter(Boolean).join(" › ")}</div>
            </div>
          )}
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
          <div style={{ color:"white", fontSize:15, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}><ScanLine size={18} /> Scanner un code-barres</div>
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

function DashboardPage({ orders, suppliers, stockAlerts, session, setPage, setOrderFilter }) {
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const byStatus = Object.fromEntries(Object.keys(STATUS).map(k => [k, orders.filter(o => o.status === k).length]));
  const totalHT = orders.reduce((s, o) => s + orderTotal(o), 0);
  const pending = orders.filter(o => !["brouillon","livree","reception_validee"].includes(o.status)).reduce((s,o) => s+orderTotal(o), 0);
  const isAdmin = session.role === "admin";

  // ── Dashboard "ce matin" ────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0,10);
  const notReceived = (o) => !["livree","reception_validee"].includes(o.status);

  // 1) Livraisons attendues aujourd'hui (date de livraison souhaitée = aujourd'hui)
  const deliveriesToday = orders.filter(o => o.deliveryDate === todayStr && notReceived(o));

  // 2) Commandes en retard (date souhaitée dépassée ET pas encore reçue)
  const lateOrders = orders.filter(o => o.deliveryDate && o.deliveryDate < todayStr && notReceived(o))
    .sort((a,b) => a.deliveryDate.localeCompare(b.deliveryDate));

  // 3) Réapprovisionnement conseillé (dispo importé < stock min)
  const reapproList = [];
  suppliers.forEach(s => s.products.forEach(p => {
    const stockMin = p.stockMin ?? calcStockMin(p.weeklyVolume);
    if (p.dispo != null && stockMin > 0 && p.dispo < stockMin) {
      reapproList.push({ ref:p.ref, label:p.label, supplier:s.name, dispo:p.dispo, stockMin, missing: stockMin - p.dispo });
    }
  }));
  reapproList.sort((a,b) => b.missing - a.missing);

  const navCards = [
    { page:"new",       Icon:PencilLine,    label:"Nouvelle commande", desc:"Passer une commande fournisseur",  gradient:"linear-gradient(135deg,rgba(99,102,241,0.8),rgba(139,92,246,0.7))", glow:"rgba(99,102,241,0.35)" },
    { page:"orders",    Icon:ClipboardList, label:"Historique",        desc:"Consulter les commandes passées",  gradient:"linear-gradient(135deg,rgba(14,165,233,0.7),rgba(6,182,212,0.6))", glow:"rgba(14,165,233,0.3)" },
    { page:"stats",     Icon:BarChart3,     label:"Statistiques",      desc:"Analyses et parts fournisseurs",   gradient:"linear-gradient(135deg,rgba(168,85,247,0.7),rgba(217,70,239,0.6))", glow:"rgba(168,85,247,0.3)" },
    { page:"suppliers", Icon:Factory,       label:"Fournisseurs",      desc:"Catalogues et référencements",     gradient:"linear-gradient(135deg,rgba(5,150,105,0.7),rgba(16,185,129,0.6))", glow:"rgba(5,150,105,0.3)" },
    isAdmin && { page:"admin", Icon:Settings, label:"Administration",   desc:"Utilisateurs et paramètres",       gradient:"linear-gradient(135deg,rgba(245,158,11,0.7),rgba(234,179,8,0.6))", glow:"rgba(245,158,11,0.3)" },
  ].filter(Boolean).filter(c => (session.pages||[]).includes(c.page) || isAdmin);

  // Recherche globale produits (réf / EAN / désignation)
  const q = query.trim().toLowerCase();
  const searchResults = q.length < 2 ? [] : suppliers.flatMap(s =>
    s.products
      .filter(p =>
        (p.ref||"").toLowerCase().includes(q) ||
        (p.ean||"").toLowerCase().includes(q) ||
        (p.label||"").toLowerCase().includes(q)
      )
      .map(p => ({ ...p, supplierName: s.name, supplierId: s.id }))
  ).slice(0, 30);

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom:18 }}>
        <h1 style={{ margin:"0 0 4px", fontSize:26, fontWeight:700, letterSpacing:"-0.03em", color:"var(--t-text-90)" }}>
          Bonjour, {session.name.split(" ")[0]} 👋
        </h1>
        <div style={{ fontSize:13, color:"var(--t-text-55)" }}>Voici un aperçu de votre activité.</div>
      </div>

      {/* Recherche globale produits */}
      <div style={{ marginBottom:24, position:"relative" }}>
        <div className="lg-search-bar" style={{ display:"flex", alignItems:"center", gap:10, background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)", borderRadius:16, padding:"12px 16px" }}>
          <Search size={18} style={{ color:"var(--t-text-40)", flexShrink:0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Référence, EAN ou nom de produit…"
            style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14, color:"var(--t-input-color)" }}
          />
          {query && <button onClick={() => setQuery("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-40)", display:"flex", padding:0 }}><X size={18} /></button>}
          <button onClick={() => setScanning(true)} title="Scanner un code-barres" style={{ background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:10, padding:"6px 10px", cursor:"pointer", color:"#818cf8", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <ScanLine size={17} />
          </button>
        </div>

        {q.length >= 2 && (
          <div style={{ marginTop:10, background:"var(--t-card-bg)", border:"1px solid var(--t-card-border)", borderRadius:16, overflow:"hidden", boxShadow:"var(--t-card-shadow)" }}>
            {searchResults.length === 0 ? (
              <div style={{ padding:"20px", textAlign:"center", color:"var(--t-text-40)", fontSize:13 }}>Aucun produit trouvé pour « {query} »</div>
            ) : (
              <>
                <div style={{ padding:"8px 16px", fontSize:11, color:"var(--t-text-40)", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid var(--t-border-subtle)" }}>{searchResults.length} résultat(s)</div>
                {searchResults.map((p, i) => (
                  <div key={i} onClick={() => setSelectedProduct(p)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, padding:"11px 16px", borderBottom:i<searchResults.length-1?"1px solid var(--t-border-subtle)":"none", cursor:"pointer", transition:"background 0.15s" }} className="lg-row">
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}</div>
                      <div style={{ display:"flex", gap:6, marginTop:3, flexWrap:"wrap", alignItems:"center" }}>
                        <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-text-40)", background:"var(--t-mono-bg)", padding:"1px 6px", borderRadius:5 }}>{p.ref}</span>
                        {p.ean && <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-mono-color)", background:"var(--t-mono-bg)", padding:"1px 6px", borderRadius:5 }}>EAN {p.ean}</span>}
                        <span style={{ fontSize:11, color:"var(--t-text-40)" }}>· {p.supplierName}</span>
                        {p.dispoParDepot ? Object.entries(p.dispoParDepot).map(([depot, d]) => (
                          <span key={depot} style={{ fontSize:10, fontWeight:600, color: d.dispo===0?"#ef4444":"#34d399", background:"rgba(0,0,0,0.15)", padding:"1px 6px", borderRadius:5 }}>{depot} : {d.dispo}</span>
                        )) : p.dispo != null && <span style={{ fontSize:11, fontWeight:600, color: p.dispo===0?"#ef4444":"#34d399" }}>Dispo : {p.dispo}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                      {session.canSeePrices && p.price && <div style={{ fontWeight:700, fontSize:13, color:"#059669" }}>{fmt(p.price)}</div>}
                      <ChevronRight size={14} style={{ color:"var(--t-text-30)" }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {scanning && <BarcodeScanner onDetected={(code) => {
        setQuery(code);
        setScanning(false);
        // Auto-ouvrir la fiche si un seul produit correspond
        const allProds = suppliers.flatMap(s => s.products.map(p=>({...p,supplierName:s.name})));
        const match = allProds.find(p => (p.ean||"").toLowerCase() === code.toLowerCase() || (p.ref||"").toLowerCase() === code.toLowerCase());
        if (match) setSelectedProduct(match);
      }} onClose={() => setScanning(false)} />}

      {/* ── Ce matin : livraisons du jour, retards, réappro ── */}
      <div className="grid-3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:24 }}>
          {/* Livraisons aujourd'hui */}
          <div style={{ ...S.card, padding:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:700, color:"var(--t-text-90)" }}><Truck size={16} style={{ color:"#0ea5e9" }} /> Livraisons aujourd'hui</div>
              <span style={{ fontSize:12, fontWeight:700, color:"#0ea5e9", background:"rgba(14,165,233,0.12)", padding:"1px 8px", borderRadius:8 }}>{deliveriesToday.length}</span>
            </div>
            {deliveriesToday.length === 0 ? (
              <div style={{ fontSize:12, color:"var(--t-text-40)", padding:"6px 0" }}>Aucune livraison prévue aujourd'hui.</div>
            ) : deliveriesToday.slice(0,5).map(o => (
              <div key={o.id} onClick={() => setPage("orders")} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid var(--t-border-subtle)", cursor:"pointer" }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.supplierName}</div>
                  <div style={{ fontSize:11, color:"var(--t-text-40)" }}>{o.deliveryPlace || "—"}</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>

          {/* Commandes en retard */}
          <div style={{ ...S.card, padding:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:700, color:"var(--t-text-90)" }}><Clock size={16} style={{ color:"#f87171" }} /> Commandes en retard</div>
              <span style={{ fontSize:12, fontWeight:700, color:"#f87171", background:"rgba(239,68,68,0.12)", padding:"1px 8px", borderRadius:8 }}>{lateOrders.length}</span>
            </div>
            {lateOrders.length === 0 ? (
              <div style={{ fontSize:12, color:"var(--t-text-40)", padding:"6px 0" }}>Aucun retard. 👍</div>
            ) : lateOrders.slice(0,5).map(o => {
              const daysLate = Math.round((new Date(todayStr) - new Date(o.deliveryDate)) / 86400000);
              return (
                <div key={o.id} onClick={() => setPage("orders")} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid var(--t-border-subtle)", cursor:"pointer" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontFamily:"monospace", fontWeight:700, color:"var(--t-text-90)" }}>{o.id}</div>
                    <div style={{ fontSize:11, color:"var(--t-text-40)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.supplierName}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, color:"#f87171", flexShrink:0 }}>retard {daysLate}j</span>
                </div>
              );
            })}
          </div>

          {/* Réapprovisionnement conseillé */}
          <div style={{ ...S.card, padding:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:700, color:"var(--t-text-90)" }}><Package size={16} style={{ color:"#f59e0b" }} /> Réappro conseillé</div>
              <span style={{ fontSize:12, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.12)", padding:"1px 8px", borderRadius:8 }}>{reapproList.length}</span>
            </div>
            {reapproList.length === 0 ? (
              <div style={{ fontSize:12, color:"var(--t-text-40)", padding:"6px 0" }}>Rien à commander pour l'instant.</div>
            ) : reapproList.slice(0,5).map((r,i) => (
              <div key={i} onClick={() => setPage("suppliers")} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid var(--t-border-subtle)", cursor:"pointer" }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.label}</div>
                  <div style={{ fontSize:11, color:"var(--t-text-40)" }}>{r.supplier}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b" }}>{r.dispo} / {r.stockMin}</div>
                  <div style={{ fontSize:10, color:"var(--t-text-40)" }}>dispo / min</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
        {[
          { Icon:ClipboardList, label:"Total commandes", value:orders.length, sub:"toutes périodes" },
          { Icon:Clock, label:"En cours HT", value:fmt(pending), sub:"en attente + validées", color:"#60a5fa" },
          { Icon:Wallet, label:"Volume HT", value:fmt(totalHT), sub:"toutes commandes", color:"#34d399" },
          { Icon:CheckCircle2, label:"Réceptions validées", value:byStatus.reception_validee||0, sub:"clôturées", color:"#a78bfa" },
        ].map((k,i) => (
          <div key={i} className="stat-card" style={{ ...S.card, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:10, color:"var(--t-text-55)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>{k.label}</div>
                <div style={{ fontSize:20, fontWeight:700, color:k.color||"rgba(255,255,255,0.9)", letterSpacing:"-0.02em" }}>{k.value}</div>
                <div style={{ fontSize:10, color:"var(--t-text-30)", marginTop:3 }}>{k.sub}</div>
              </div>
              {k.Icon && <k.Icon size={20} color={k.color||"var(--t-text-55)"} />}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Nav Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
        {navCards.map((c,i) => (
          <button key={i} onClick={() => setPage(c.page)} style={{ ...S.card, padding:20, border:"none", cursor:"pointer", textAlign:"left", background:c.gradient, boxShadow:`0 8px 28px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.15)`, position:"relative", overflow:"hidden" }} className="lg-card">
            <div style={{ marginBottom:10 }}>{c.Icon && <c.Icon size={26} color="white" strokeWidth={2} />}</div>
            <div style={{ fontWeight:700, fontSize:14, color:"white", marginBottom:4, letterSpacing:"-0.02em" }}>{c.label}</div>
            <div style={{ fontSize:11, color:"var(--t-text-55)", lineHeight:1.4 }}>{c.desc}</div>
            <div style={{ position:"absolute", bottom:14, right:14, fontSize:16, color:"var(--t-text-55)" }}>→</div>
          </button>
        ))}
      </div>

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <div style={{ background:"var(--t-notif-bg)", border:"1px solid var(--t-notif-border)", borderRadius:20, padding:20, marginBottom:20, backdropFilter:"blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Bell size={18} color="#f87171" />
            <span style={{ fontWeight: 700, fontSize: 15, color:"#f87171" }}>Alertes stock minimum ({stockAlerts.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stockAlerts.map((a, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--t-surface)", borderRadius:14, padding:"10px 14px", flexWrap:"wrap", gap:8, border:"1px solid rgba(255,255,255,0.08)" }}>
                <div>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color:"var(--t-text-40)", marginRight: 8 }}>{a.ref}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, background: "var(--t-surface)", padding: "2px 7px", borderRadius: 10, color:"var(--t-text-40)" }}>{a.subFamily}</span>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color:"var(--t-text-40)" }}>Commandé</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#059669" }}>{a.ordered}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color:"var(--t-text-40)" }}>Stock min</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#D97706" }}>{a.stockMin}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color:"var(--t-text-40)" }}>Manque</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#DC2626" }}>-{a.missing}</div>
                  </div>
                  <button onClick={() => setPage("new")} style={{ ...S.btnPrimary, padding: "5px 12px", fontSize: 11 }}>Commander</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Activité récente ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:14, marginBottom:8 }}>

        {/* Compteurs par statut — cliquables */}
        <div style={{ ...S.card, padding:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--t-text-90)" }}>État des commandes</h2>
            <button onClick={() => setPage("orders")} style={S.btnGhost}>Voir tout →</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {STATUS_ORDER.map(k => {
              const s = STATUS[k];
              const count = byStatus[k] || 0;
              return (
                <button key={k} onClick={() => { if(setOrderFilter) setOrderFilter(k); setPage("orders"); }} style={{ background:"var(--t-surface)", border:`1px solid ${count>0?s.color+"44":"var(--t-border-subtle)"}`, borderRadius:12, padding:"10px 8px", cursor:"pointer", textAlign:"center", transition:"all 0.15s" }}>
                  <div style={{ fontSize:20, fontWeight:800, color: count>0 ? s.color : "var(--t-text-40)", lineHeight:1 }}>{count}</div>
                  <div style={{ fontSize:10, color:"var(--t-text-40)", marginTop:4, lineHeight:1.3 }}>{s.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5 dernières commandes */}
        <div style={{ ...S.card, padding:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--t-text-90)" }}>Activité récente</h2>
          </div>
          {orders.length === 0 ? (
            <div style={{ textAlign:"center", color:"var(--t-text-40)", fontSize:13, padding:"20px 0" }}>Aucune commande pour l'instant.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[...orders].reverse().slice(0,5).map((o,i) => {
                const total = o.lines.reduce((s,l)=>s+(l.qty*(l.price||0)),0);
                const showPrice = session.canSeePrices;
                const d = o.date ? new Date(o.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}) : "—";
                return (
                  <div key={o.id} onClick={() => setPage("orders")} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, background:"var(--t-surface)", border:"1px solid var(--t-border-subtle)", cursor:"pointer", transition:"all 0.15s" }} className="lg-row">
                    <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"1px solid rgba(99,102,241,0.2)" }}>
                      <ClipboardList size={16} color="#818cf8" />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                        <span style={{ fontFamily:"monospace", fontSize:11, color:"var(--t-text-55)", fontWeight:600 }}>{o.id}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div style={{ fontSize:13, fontWeight:600, color:"var(--t-text-90)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.supplierName}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      {showPrice && <div style={{ fontSize:13, fontWeight:700, color:"#34d399" }}>{fmt(total)}</div>}
                      <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:2 }}>{d}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      {selectedProduct && <ProductSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} session={session} />}
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
    filtered.forEach(o => o.lines.forEach(l => {
      const fam = l.family || "Autre";
      map[fam] = (map[fam] || 0) + lineTotal(l);
    }));
    return Object.entries(map).map(([label, value]) => ({ label, value, formatted: fmt(value) })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  // Part par sous-famille
  const bySubFamily = useMemo(() => {
    const map = {};
    filtered.forEach(o => o.lines.forEach(l => {
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Statistiques</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {[7,30,90,365].map(d => (
            <button key={d} onClick={() => setPeriod(d)} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid", fontSize: 12, cursor: "pointer", fontWeight: period===d ? 700 : 400, background:period===d?"rgba(99,102,241,0.7)":"var(--t-surface)", color:period===d?"white":"var(--t-text-55)", borderColor:period===d?"rgba(99,102,241,0.5)":"var(--t-border-subtle)", backdropFilter:"blur(8px)", boxShadow:period===d?"0 0 16px rgba(99,102,241,0.35)":"none" }}>
              {d === 365 ? "1 an" : `${d}j`}
            </button>
          ))}
        </div>
      </div>

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
              { Icon: ClipboardList, label: "Commandes", value: filtered.length },
              { Icon: Wallet, label: "Volume HT", value: fmt(supplierTotal), color: "#059669" },
              { Icon: Factory, label: "Fournisseurs actifs", value: bySupplier.length, color: "#1D4ED8" },
              { Icon: FolderTree, label: "Familles", value: byFamily.length, color: "#7C3AED" },
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
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");
  const [focus, setFocus] = useState("");
  function submit() {
    const u = users.find(u => u.email === email.trim() && u.password === pw && u.active);
    if (u) onLogin(u); else setErr("Email ou mot de passe incorrect.");
  }
  // Champ minimaliste : label + ligne soulignée (style glassmorphism)
  const fieldWrap = { marginBottom:26 };
  const labelStyle = { display:"block", fontSize:13, color:"rgba(255,255,255,0.55)", marginBottom:8, letterSpacing:"-0.01em" };
  const underlineInput = (name) => ({
    width:"100%", padding:"6px 2px 10px", border:"none", borderBottom:`1.5px solid ${focus===name?"rgba(165,180,252,0.9)":"rgba(255,255,255,0.18)"}`,
    background:"transparent", color:"#ffffff", fontSize:16, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s",
  });
  return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", background:"linear-gradient(135deg,#0a0a0f 0%,#0d1117 45%,#10081f 100%)", position:"relative", overflow:"hidden", fontFamily:"-apple-system,'SF Pro Display',BlinkMacSystemFont,sans-serif" }}>
      <style>{`@keyframes lb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.1)}} @keyframes lb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-35px,40px) scale(1.05)}} @keyframes lb3{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,25px)}}`}</style>
      {/* Halos colorés flous */}
      <div style={{ position:"absolute", top:"8%", left:"5%", width:440, height:440, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.28) 0%,transparent 70%)", animation:"lb1 16s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"5%", right:"2%", width:380, height:380, borderRadius:"50%", background:"radial-gradient(circle,rgba(168,85,247,0.22) 0%,transparent 70%)", animation:"lb2 20s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:"40%", right:"30%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(14,165,233,0.14) 0%,transparent 70%)", animation:"lb3 22s ease-in-out infinite", pointerEvents:"none" }} />

      {/* Carte verre dépoli */}
      <div style={{ backdropFilter:"blur(40px) saturate(180%)", WebkitBackdropFilter:"blur(40px) saturate(180%)", background:"rgba(255,255,255,0.07)", borderRadius:32, padding:"48px 36px 40px", width:"100%", maxWidth:400, border:"1px solid rgba(255,255,255,0.12)", boxShadow:"0 32px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.15)", position:"relative", zIndex:1 }}>
        {/* Logo + sous-titre centrés */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ marginBottom:18, display:"flex", justifyContent:"center" }}>
            <div style={{ width:76, height:76, borderRadius:20, background:"rgba(255,255,255,0.96)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 12px 32px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.6)" }}><CPLogo size={48} /></div>
          </div>
          <div style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.04em", background:"linear-gradient(135deg,#ffffff,#c7d2fe)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1 }}>CommaPro</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:8, letterSpacing:"-0.01em" }}>Gestion des commandes fournisseurs</div>
        </div>

        {/* Champs soulignés */}
        <div style={fieldWrap}>
          <label style={labelStyle}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} onFocus={()=>setFocus("email")} onBlur={()=>setFocus("")} style={underlineInput("email")} type="email" placeholder="votre@email.com" onKeyDown={e => e.key==="Enter" && submit()} />
        </div>
        <div style={fieldWrap}>
          <label style={labelStyle}>Mot de passe</label>
          <input value={pw} onChange={e => setPw(e.target.value)} onFocus={()=>setFocus("pw")} onBlur={()=>setFocus("")} style={underlineInput("pw")} type="password" placeholder="••••••••" onKeyDown={e => e.key==="Enter" && submit()} />
        </div>

        {err && <div style={{ marginBottom:16, fontSize:12, color:"#fca5a5", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", padding:"10px 14px", borderRadius:14, textAlign:"center" }}>{err}</div>}

        <button onClick={submit} className="lg-btn-primary" style={{ width:"100%", marginTop:8, padding:"15px", fontSize:15, fontWeight:700, borderRadius:18, border:"none", cursor:"pointer", color:"white", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 8px 28px rgba(99,102,241,0.5)", letterSpacing:"-0.01em", transition:"all 0.18s" }}>Se connecter</button>
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

function OrdersPage({ orders, setOrders, session, setPage, initialFilter, onFilterUsed }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState(initialFilter || "all");
  const isAdmin = session.role === "admin";
  const visible = isAdmin ? orders : orders.filter(o => o.userId === session.id);
  const filtered = filter === "all" ? visible : visible.filter(o => o.status === filter);

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
    return <OrderDetail order={order} orders={orders} setOrders={setOrders} session={session} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Historique des commandes</h1>
        <button onClick={() => setPage("new")} style={S.btnPrimary}>+ Nouvelle commande</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all","Toutes"], ...Object.entries(STATUS).map(([k,v]) => [k, v.label])].map(([k, lbl]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid", cursor: "pointer", fontSize: 12, fontWeight: filter===k ? 700 : 400, background:filter===k?"rgba(99,102,241,0.7)":"var(--t-surface)", color:filter===k?"white":"var(--t-text-55)", borderColor:filter===k?"rgba(99,102,241,0.5)":"var(--t-border-subtle)", backdropFilter:"blur(8px)", boxShadow:filter===k?"0 0 16px rgba(99,102,241,0.35)":"none" }}>{lbl}</button>
        ))}
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
function OrderDetail({ order, orders, setOrders, session, onBack }) {
  const isAdmin = session.role === "admin";
  const showPrices = session.canSeePrices;
  function setStatus(s) {
    const now = new Date().toISOString();
    setOrders(prev => prev.map(o => {
      if (o.id !== order.id) return o;
      const history = { ...(o.statusHistory || {}) };
      if (!history[s]) history[s] = now;  // mémorise la 1ère date d'entrée dans ce statut
      return { ...o, status: s, statusHistory: history };
    }));
  }
  function deleteOrder() {
    if (confirm("Supprimer définitivement cette commande ?")) { setOrders(prev => prev.filter(o => o.id !== order.id)); onBack(); }
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
            {isAdmin && <button onClick={deleteOrder} style={S.btnDanger}>Supprimer</button>}
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
                    {done && <CheckCircle2 size={15} style={{ color:"#fff" }} />}
                  </div>
                  <div style={{ fontSize:10, fontWeight: isCurrent?700:500, color: done ? "var(--t-text-90)" : "var(--t-text-40)", marginTop:7, textAlign:"center", lineHeight:1.2, padding:"0 2px" }}>{STATUS[k].label}</div>
                  {stamp && <div style={{ fontSize:9, color:"var(--t-text-40)", marginTop:2 }}>{new Date(stamp).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</div>}
                </div>
              );
            })}
          </div>
        </div>}

        {/* Bannière brouillon */}
        {order.status === "brouillon" && (
          <div style={{ marginBottom:20, padding:"14px 18px", background:"rgba(107,114,128,0.12)", border:"1px solid rgba(107,114,128,0.3)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"var(--t-text-85)" }}>📝 Brouillon — commande non envoyée</div>
              <div style={{ fontSize:12, color:"var(--t-text-40)", marginTop:2 }}>Cette commande n'a pas encore été transmise au fournisseur.</div>
            </div>
            {isAdmin && <button onClick={deleteOrder} style={{ ...S.btnDanger, flexShrink:0 }}>🗑 Supprimer ce brouillon</button>}
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
              {order.lines.map((l, i) => (
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
function NewOrderPage({ orders, setOrders, suppliers, setSuppliers, locations, session, setPage }) {
  const [suppId, setSuppId]               = useState("");
  const [deliveryDate, setDeliveryDate]   = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState("");
  const [notes, setNotes]                 = useState("");
  const [lines, setLines]                 = useState([]);
  const [saved, setSaved]                 = useState(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  // Ajout produit rapide
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProd, setNewProd] = useState({ ref:"", ean:"", label:"", family:"", subFamily:"", price:"" });
  const supp = suppliers.find(s => s.id === suppId);

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

  // Enregistrer en brouillon
  function saveDraft() {
    if (!supp) return;
    const draft = { id: genOrderId(orders), userId: session.id, supplierName: supp.name, commercial: supp.commercial, email: supp.email, date: new Date().toISOString().split("T")[0], deliveryDate: deliveryDate||"", deliveryPlace: deliveryPlace||"", notes, lines, status: "brouillon", statusHistory: { brouillon: new Date().toISOString() }, createdBy: session.name };
    setOrders(prev => [...prev, draft]);
    setPage("orders");
  }

  function submit() {
    if (!supp || lines.length===0 || !deliveryDate || !deliveryPlace) return;
    const newOrder = { id: genOrderId(orders), userId: session.id, supplierName: supp.name, commercial: supp.commercial, email: supp.email, date: new Date().toISOString().split("T")[0], deliveryDate, deliveryPlace, notes, lines, status: "en_attente", statusHistory: { en_attente: new Date().toISOString() }, createdBy: session.name };
    setOrders(prev => [...prev, newOrder]);
    setSaved(newOrder);
  }

  if (saved) return (
    <div style={{ ...S.card, maxWidth:500, margin:"0 auto", textAlign:"center", padding:44 }}>
      <div style={{ marginBottom:12, display:"flex", justifyContent:"center" }}><CheckCircle2 size={48} color="#34d399" /></div>
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

  return (
    <div>
      <h1 style={{ margin:"0 0 24px 0", fontSize:22, fontWeight:700, letterSpacing:"-0.03em", color:"var(--t-text-90)" }}>Nouvelle commande</h1>
      <div className="order-layout" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={S.card}>
            <h2 style={{ margin:"0 0 16px 0", fontSize:13, fontWeight:700, color:"var(--t-text-70)", textTransform:"uppercase", letterSpacing:"0.08em" }}>① Fournisseur</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
              {suppliers.map(s => (
                <div key={s.id} onClick={() => { setSuppId(s.id); setLines([]); setCatalogSearch(''); }} className='lg-supplier-card' style={{ padding:14, borderRadius:14, border:`2px solid ${suppId===s.id?'rgba(99,102,241,0.8)':'rgba(255,255,255,0.1)'}`, cursor:'pointer', background:suppId===s.id?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.05)', backdropFilter:'blur(8px)', boxShadow:suppId===s.id?'0 0 20px rgba(99,102,241,0.35)':'none' }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"var(--t-text-90)" }}>{s.name}</div>
                  <div style={{ fontSize:11, color:"var(--t-text-55)", marginTop:3 }}>{s.commercial}</div>
                </div>
              ))}
            </div>
          </div>

          {supp && (
            <div style={S.card}>
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--t-text-90)" }}>2. Catalogue — <span style={{ color:"#a5b4fc" }}>{supp.name}</span></h2>
                  <button onClick={() => setShowAddProduct(v=>!v)} style={{ ...S.btnGhost, fontSize:12, padding:"5px 10px", color:"#818cf8" }}>+ Nouveau produit</button>
                </div>
                {showAddProduct && (
                  <div style={{ background:"var(--t-surface)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:14, padding:14, marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--t-text-70)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>Nouveau produit — {supp.name}</div>
                    <div className="grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                      <div>
                        <label style={S.label}>Référence *</label>
                        <input value={newProd.ref} onChange={e=>setNewProd(p=>({...p,ref:e.target.value}))} style={S.input} placeholder="Ex: TAB906" />
                        {newProd.ref && supp?.products.find(p=>p.ref.toLowerCase()===newProd.ref.trim().toLowerCase()) && (
                          <div style={{ fontSize:11, color:"#f59e0b", marginTop:4 }}>⚠️ Référence déjà présente dans le catalogue — le produit sera ajouté à la commande directement.</div>
                        )}
                      </div>
                      <div><label style={S.label}>Code EAN</label><input value={newProd.ean} onChange={e=>setNewProd(p=>({...p,ean:e.target.value}))} style={S.input} placeholder="Code-barres" /></div>
                    </div>
                    <div style={{ marginBottom:8 }}><label style={S.label}>Désignation *</label><input value={newProd.label} onChange={e=>setNewProd(p=>({...p,label:e.target.value}))} style={S.input} placeholder="Nom du produit" /></div>
                    <div className="grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                      <div><label style={S.label}>Famille</label><input value={newProd.family} onChange={e=>setNewProd(p=>({...p,family:e.target.value}))} style={S.input} placeholder="Ex: Electroménager" /></div>
                      <div><label style={S.label}>Sous-famille</label><input value={newProd.subFamily} onChange={e=>setNewProd(p=>({...p,subFamily:e.target.value}))} style={S.input} placeholder="Ex: E31MO" /></div>
                    </div>
                    <div style={{ marginBottom:12 }}><label style={S.label}>Prix HT</label><input type="number" value={newProd.price} onChange={e=>setNewProd(p=>({...p,price:e.target.value}))} style={S.input} placeholder="0.00" /></div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={saveNewProduct} disabled={!newProd.ref||(!newProd.label && !supp?.products.find(p=>p.ref.toLowerCase()===newProd.ref.trim().toLowerCase()))} style={{ ...S.btnPrimary, flex:1, opacity:(newProd.ref&&(newProd.label||supp?.products.find(p=>p.ref.toLowerCase()===newProd.ref.trim().toLowerCase())))?1:0.45 }}>
                        {supp?.products.find(p=>p.ref.toLowerCase()===newProd.ref.trim().toLowerCase())
                          ? "✓ Ajouter à la commande"
                          : "✓ Ajouter au catalogue et à la commande"}
                      </button>
                      <button onClick={()=>{setShowAddProduct(false);setNewProd({ref:"",ean:"",label:"",family:"",subFamily:"",price:""}); }} style={S.btnGhost}>Annuler</button>
                    </div>
                  </div>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--t-surface)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:22, padding:"8px 14px", backdropFilter:"blur(8px)" }} className="lg-search-bar">
                  <Search size={15} style={{ color:"var(--t-text-40)", flexShrink:0 }} />
                  <input
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    placeholder="Rechercher un produit…"
                    style={{ background:"transparent", border:"none", outline:"none", fontSize:13, color:"var(--t-input-color)", width:"100%", padding:0 }}
                  />
                  {catalogSearch && (
                    <button onClick={() => setCatalogSearch("")} style={{ background:"none", border:"none", color:"var(--t-text-40)", cursor:"pointer", fontSize:14, padding:0, flexShrink:0 }}>✕</button>
                  )}
                </div>
              </div>
              {(() => {
                const q = catalogSearch.toLowerCase().trim();
                const filtered = supp.products.filter(p =>
                  !q ||
                  p.label.toLowerCase().includes(q) ||
                  p.ref.toLowerCase().includes(q) ||
                  (p.subFamily||"").toLowerCase().includes(q) ||
                  (p.family||"").toLowerCase().includes(q)
                );
                if (filtered.length === 0) return (
                  <div style={{ textAlign:"center", padding:"30px 0", color:"var(--t-text-30)" }}>
                    <div style={{ marginBottom:8, display:"flex", justifyContent:"center" }}><Search size={28} color="var(--t-text-30)" /></div>
                    <div style={{ fontSize:13 }}>Aucun produit pour "{catalogSearch}"</div>
                    <button onClick={() => setCatalogSearch("")} style={{ ...S.btnGhost, marginTop:8, fontSize:12 }}>Réinitialiser</button>
                  </div>
                );
                const groups = filtered.reduce((acc, p) => { const f = p.family || "Autre"; if (!acc[f]) acc[f] = []; acc[f].push(p); return acc; }, {});
                return Object.entries(groups).map(([fam, prods]) => (
                  <div key={fam} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"var(--t-tag-color)", textTransform:"uppercase", letterSpacing:"0.1em" }}>{fam}</div>
                      <div style={{ flex:1, height:"1px", background:"var(--t-surface)" }} />
                      <div style={{ fontSize:10, color:"var(--t-text-30)" }}>{prods.length} produit{prods.length>1?"s":""}</div>
                    </div>
                    {prods.map(p => {
                      const inCart = lines.find(l => l.ref===p.ref);
                      return (
                        <div key={p.ref} className="lg-product-row" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:14, border:`1px solid ${inCart?'rgba(99,102,241,0.45)':'rgba(255,255,255,0.07)'}`, background:inCart?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.03)', marginBottom:6, backdropFilter:'blur(6px)', boxShadow:inCart?'0 0 20px rgba(99,102,241,0.18)':'none' }}>
                          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                              <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-text-40)", background:"var(--t-surface)", padding:"1px 7px", borderRadius:6 }}>{p.ref}</span>
                              {p.subFamily && <span style={{ fontFamily:"monospace", fontSize:10, background:"var(--t-tag-bg)", padding:"1px 7px", borderRadius:6, color:"var(--t-tag-color)", border:"1px solid var(--t-tag-border)" }}>{p.subFamily}</span>}
                              {session.canSeePrices && <span style={{ fontSize:11, color:"#34d399", fontWeight:600 }}>{fmt(p.price)}</span>}
                              {p.dispoParDepot ? Object.entries(p.dispoParDepot).map(([depot, d]) => (
                                <span key={depot} style={{ fontSize:10, fontWeight:600, color: d.dispo===0?"#ef4444": d.dispo<=(p.stockMin??calcStockMin(p.weeklyVolume))?"#f59e0b":"#34d399", background:"rgba(0,0,0,0.15)", padding:"1px 6px", borderRadius:5 }}>{depot} : {d.dispo}</span>
                              )) : p.dispo != null && <span style={{ fontSize:10, fontWeight:600, color: p.dispo===0?"#ef4444": p.dispo<=(p.stockMin??calcStockMin(p.weeklyVolume))?"#f59e0b":"#34d399", background:"rgba(0,0,0,0.15)", padding:"1px 6px", borderRadius:5 }}>Dispo : {p.dispo}</span>}
                            </div>
                            <span style={{ fontWeight:500, fontSize:13, color:"var(--t-text-85)" }}>{p.label}</span>
                          </div>
                          <button onClick={() => addProduct(p)} className="lg-btn-primary" style={{ ...S.btnPrimary, padding:"6px 14px", fontSize:12, flexShrink:0, minWidth:90, background:inCart?"linear-gradient(135deg,rgba(52,211,153,0.8),rgba(16,185,129,0.8))":"linear-gradient(135deg,rgba(99,102,241,0.9),rgba(139,92,246,0.9))" }}>
                            {inCart ? `✓ ${inCart.qty} ajouté` : "+ Ajouter"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          )}

          {supp && (
            <div style={S.card}>
              <h2 style={{ margin:"0 0 16px 0", fontSize:13, fontWeight:700, color:"var(--t-text-70)", textTransform:"uppercase", letterSpacing:"0.08em" }}>③ Livraison</h2>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Date souhaitée *"><input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={{ ...S.input, textAlign:"center", WebkitAppearance:"none" }} /></Field>
                <Field label="Lieu de livraison *">
                  <select value={deliveryPlace} onChange={e => setDeliveryPlace(e.target.value)} style={{ ...S.input, background: "white" }}>
                    <option value="">— Choisir un lieu —</option>
                    {locations.map(l => <option key={l.id} value={l.label}>{l.label}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ marginTop: 14 }}>
                <Field label="Notes"><textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...S.input, minHeight: 65, resize: "vertical" }} placeholder="Instructions particulières…" /></Field>
              </div>
            </div>
          )}
        </div>

        {/* Recap */}
        <div className="order-recap" style={{ position:'sticky', top:80 }}>
          <div style={S.card}>
            <h2 style={{ margin:"0 0 16px 0", fontSize:13, fontWeight:700, color:"var(--t-text-70)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Récapitulatif</h2>
            {lines.length===0 ? <div style={{ color:"var(--t-text-30)", fontSize:13, textAlign:"center", padding:"20px 0" }}>Aucun produit</div> : (
              <>
                {lines.map(l => (
                  <div key={l.ref} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "6px 0", borderBottom: "1px solid var(--t-border-subtle)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</div>
                      <div style={{ fontSize: 10, color:"var(--t-text-40)" }}>{l.subFamily}</div>
                      {session.canSeePrices && <div style={{ fontSize: 11, color:"var(--t-text-40)" }}>{fmt(l.price)} × {l.qty}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 8 }}>
                      <input type="number" min="1" value={l.qty} onChange={e => updateQty(l.ref, e.target.value)} style={{ width: 46, padding: "3px 5px", borderRadius: 6, border: "1.5px solid #E5E7EB", fontSize: 12, textAlign: "center" }} />
                      {session.canSeePrices && <span style={{ fontSize: 11, fontWeight: 600, minWidth: 52, textAlign: "right" }}>{fmt(lineTotal(l))}</span>}
                      <button onClick={() => removeLine(l.ref)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 16, padding: 0 }}>×</button>
                    </div>
                  </div>
                ))}
                {session.canSeePrices && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, marginTop: 12, paddingTop: 10, borderTop: "2px solid #0F172A" }}>
                    <span>Total HT</span><span style={{ color: "#059669" }}>{fmt(total)}</span>
                  </div>
                )}
              </>
            )}
            <button onClick={submit} disabled={!canSubmit} style={{ ...S.btnPrimary, width: "100%", marginTop: 16, padding: 12, opacity: canSubmit ? 1 : 0.45 }}>Valider la commande</button>
            {supp && lines.length>0 && (
              <button onClick={saveDraft} style={{ ...S.btnSecondary, width:"100%", marginTop:8, padding:10 }}>💾 Enregistrer en brouillon</button>
            )}
            {!canSubmit && <div style={{ fontSize:11, color:"var(--t-text-30)", textAlign:"center", marginTop:6 }}>Fournisseur, produit(s) et livraison requis</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════════════════════════════════
function SuppliersPage({ suppliers, setSuppliers, isAdmin, stockImports, setStockImports }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [importMsg, setImportMsg] = useState("");
  const [stockMsg, setStockMsg]   = useState("");

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

        // 2) Mapping noms de dépôts → labels courts
        function depotLabel(raw) {
          const u = raw.toUpperCase();
          if (u.includes("PORT") || u.includes("CENTRAL")) return "Dépôt Port";
          if (u.includes("EXPO") && u.includes("SUD"))  return "Expo Sud";
          if (u.includes("EXPO") && u.includes("NORD")) return "Expo Nord";
          if (u.includes("DEPOT") || u.includes("DÉPÔT")) {
            if (u.includes("SUD"))  return "Dépôt Sud";
            if (u.includes("NORD")) return "Dépôt Nord";
          }
          // Fallback : prendre la dernière partie après le dernier "-"
          const parts = raw.split("-").map(s=>s.trim()).filter(Boolean);
          return parts[parts.length-1] || raw;
        }

        // 3) Parser multi-dépôts :
        //    stockByRef[ref][depotLabel] = { stock, dispo, achat, facture... }
        const norm = (s) => String(s).toLowerCase().replace(/\s+/g," ").trim();
        const isDepotHeader = (row) => {
          const v = String(row[0]||"").trim();
          return v.length > 5 && (
            v.toUpperCase().includes("CONFORAMA") ||
            v.toUpperCase().includes("EXPO") ||
            v.toUpperCase().includes("DEPOT") ||
            v.toUpperCase().includes("DÉPÔT") ||
            v.toUpperCase().includes("PORT")
          ) && !v.toUpperCase().includes("ELECTRO") && !v.toUpperCase().includes("CUISSON");
        };

        let currentDepot = "Principal";
        let headerCols = null;
        const stockByRef = {};  // { ref: { "Expo Nord": {dispo,stock,...}, "Dépôt Sud": {...} } }
        const depotsFound = new Set();

        for (const row of grid) {
          // Détection ligne dépôt
          if (isDepotHeader(row)) {
            currentDepot = depotLabel(String(row[0]).trim());
            depotsFound.add(currentDepot);
            headerCols = null; // reset pour ce dépôt
            continue;
          }
          // Détection ligne en-tête colonnes
          const cells = row.map(norm);
          if (cells.some(x => x === "code") && cells.some(x => x.startsWith("dispo"))) {
            headerCols = {};
            row.forEach((h, i) => {
              const n = norm(h);
              if (n === "code") headerCols.code = i;
              else if (n === "libellé" || n === "libelle") headerCols.label = i;
              else if (n.startsWith("achat")) headerCols.achat = i;
              else if (n === "facture") headerCols.facture = i;
              else if (n === "stock") headerCols.stock = i;
              else if (n === "reserve" || n === "réserve") headerCols.reserve = i;
              else if (n === "emporte" || n === "emporté") headerCols.emporte = i;
              else if (n === "livraison") headerCols.livraison = i;
              else if (n.startsWith("dispo")) headerCols.dispo = i;
              else if (n === "attendu") headerCols.attendu = i;
            });
            continue;
          }
          // Ligne de données
          if (headerCols && headerCols.code != null) {
            const code = String(row[headerCols.code] || "").trim();
            if (code && code.toLowerCase() !== "code" && code.length > 2 && !code.includes(" - ")) {
              const num = (i) => { const v = parseFloat(row[i]); return isNaN(v) ? 0 : v; };
              if (!stockByRef[code]) stockByRef[code] = {};
              stockByRef[code][currentDepot] = {
                stock:     num(headerCols.stock),
                dispo:     num(headerCols.dispo),
                reserve:   num(headerCols.reserve),
                emporte:   num(headerCols.emporte),
                livraison: num(headerCols.livraison),
                attendu:   num(headerCols.attendu),
                achat:     num(headerCols.achat),
                facture:   num(headerCols.facture),
              };
            }
          }
        }

        const refsInFile = Object.keys(stockByRef);
        if (refsInFile.length === 0) {
          setStockMsg("⚠️ Aucune donnée de stock reconnue. Vérifie le format du fichier.");
          return;
        }

        // 4) Mettre à jour les produits : stocker dispoParDepot + dispo total
        let updated = 0, matched = [];
        setSuppliers(prev => prev.map(s => ({
          ...s,
          products: s.products.map(p => {
            const depots = stockByRef[p.ref];
            if (!depots) return p;
            updated++; matched.push(p.ref);
            // Calcul totaux toutes dépôts
            const allDepots = Object.values(depots);
            const totalDispo = allDepots.reduce((s,d)=>s+(d.dispo||0),0);
            const totalStock = allDepots.reduce((s,d)=>s+(d.stock||0),0);
            return {
              ...p,
              stock: totalStock,
              dispo: totalDispo,
              dispoParDepot: depots,  // { "Expo Nord": {dispo:3,...}, "Dépôt Sud": {dispo:1,...} }
              stockDate: exportDate,
            };
          })
        })));

        // 5) Mémoriser snapshot (dispo total par ref pour calcul des sorties)
        const snapshot = {};
        matched.forEach(ref => {
          const depots = stockByRef[ref];
          snapshot[ref] = Object.values(depots).reduce((s,d)=>s+(d.dispo||0),0);
        });

        // 5) ÉTAPE B — Calcul des sorties depuis l'import précédent
        //    Sorties = Dispo_précédent − Dispo_actuel + Achats reçus sur la période
        //    (les achats reçus ont fait remonter le dispo, on les rajoute pour
        //     retrouver les vraies sorties). Normalisé sur 7 jours.
        const prevImports = stockImports || [];
        const prev = [...prevImports].reverse().find(im => im.date && im.date !== exportDate);
        let computed = 0;
        const weeklySalesByRef = {};
        if (prev) {
          const d1 = new Date(prev.date), d2 = new Date(exportDate);
          const days = Math.max(1, Math.round((d2 - d1) / 86400000));
          for (const ref of matched) {
            const prevDispo = prev.dispo?.[ref];
            if (prevDispo == null) continue;
            const curDispo = stockByRef[ref].dispo;
            const achat = stockByRef[ref].achat || 0;  // entrées sur la période
            const sorties = Math.max(0, prevDispo - curDispo + achat);
            const perWeek = sorties / days * 7;
            weeklySalesByRef[ref] = Math.ceil(perWeek);
            computed++;
          }
          // Appliquer : stock min = ventes d'1 semaine (passage hebdo des commerciaux)
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
          const next = [...(prevList||[]), { date: exportDate, dispo: snapshot, importedAt: new Date().toISOString() }];
          return next.slice(-12);  // on garde les 12 derniers imports
        });

        const ignored = refsInFile.length - updated;
        const dateFr = exportDate.split("-").reverse().join("/");
        let msg = `✅ État de stock du ${dateFr} importé. ${updated} produit(s) mis à jour${ignored>0?`, ${ignored} référence(s) ignorée(s)`:""}.`;
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
    setForm({ id: "s"+Date.now(), name: "", commercial: "", email: "", products: [] });
    setEditing("new");
  }
  function openEdit(s) { setForm(JSON.parse(JSON.stringify(s))); setEditing(s.id); }
  function save() {
    setSuppliers(prev => { const idx = prev.findIndex(s => s.id===form.id); if (idx>=0){const n=[...prev];n[idx]=form;return n;} return [...prev,form]; });
    setEditing(null); setForm(null);
  }
  function del(id) { if (confirm("Supprimer ce fournisseur ?")) setSuppliers(prev => prev.filter(s => s.id!==id)); }
  function addProduct() { setForm(f => ({...f, products: [...f.products, { ref:"", ean:"", label:"", price:0, family:"", subFamily:"", weeklyVolume:0, stockMin:0 }]})); }
  function updateProduct(i, field, val) {
    setForm(f => { const p=[...f.products]; p[i]={...p[i],[field]:["price","weeklyVolume","stockMin"].includes(field) ? parseFloat(val)||0 : val};
      // Auto-calc stockMin when weeklyVolume changes
      if (field==="weeklyVolume") p[i].stockMin = calcStockMin(parseFloat(val)||0);
      return {...f,products:p};
    });
  }
  function removeProduct(i) { setForm(f => ({...f, products: f.products.filter((_,j)=>j!==i)})); }

  if (editing) return (
    <div>
      <button onClick={() => { setEditing(null); setForm(null); }} style={{ ...S.btnGhost, marginBottom: 16 }}>← Annuler</button>
      <div style={S.card}>
        <h2 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>{editing==="new" ? "Nouveau fournisseur" : "Modifier"}</h2>
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          <Field label="Nom société *"><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} style={S.input} /></Field>
          <Field label="Commercial"><input value={form.commercial} onChange={e => setForm(f=>({...f,commercial:e.target.value}))} style={S.input} /></Field>
          <Field label="Email"><input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} style={S.input} type="email" /></Field>
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
        <div className="product-edit-grid" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", marginBottom:16 }}>
        <div style={{ minWidth: 900 }}>
        {form.products.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "90px 120px 1fr 110px 110px 80px 80px 70px 70px 70px auto", gap: 6, marginBottom: 6 }}>
            {["Réf.","Code EAN","Désignation","Famille","Sous-famille","P.U. HT","Prix vente","Écotaxe","Ventes/sem","Stock min",""].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color:"var(--t-text-40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
        )}
        {form.products.map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 120px 1fr 110px 110px 80px 80px 70px 70px 70px auto", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <input value={p.ref} onChange={e => updateProduct(i,"ref",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Réf." />
            <input value={p.ean||""} onChange={e => updateProduct(i,"ean",e.target.value)} style={{...S.input,fontSize:11,fontFamily:"monospace"}} placeholder="EAN" />
            <input value={p.label} onChange={e => updateProduct(i,"label",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Désignation" />
            <input value={p.family} onChange={e => updateProduct(i,"family",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Ex: Chaussures" />
            <input value={p.subFamily} onChange={e => updateProduct(i,"subFamily",e.target.value)} style={{...S.input,fontSize:11,fontFamily:"monospace"}} placeholder="Ex: E41AS" />
            <input type="number" value={p.price} onChange={e => updateProduct(i,"price",e.target.value)} style={{...S.input,fontSize:11}} placeholder="0.00" />
            <input type="number" value={p.prixVente||""} onChange={e => updateProduct(i,"prixVente",e.target.value)} style={{...S.input,fontSize:11,color:"#818cf8"}} placeholder="0.00" />
            <input type="number" value={p.ecotaxe||""} onChange={e => updateProduct(i,"ecotaxe",e.target.value)} style={{...S.input,fontSize:11}} placeholder="0.00" />
            <input type="number" value={p.weeklyVolume} onChange={e => updateProduct(i,"weeklyVolume",e.target.value)} style={{...S.input,fontSize:11}} placeholder="0" />
            <input type="number" value={p.stockMin} onChange={e => updateProduct(i,"stockMin",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Auto" />
            <button onClick={() => removeProduct(i)} style={{ background:"none",border:"none",cursor:"pointer",color:"#DC2626",fontSize:18,padding:0 }}>×</button>
          </div>
        ))}
        </div>
        </div>
        <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:4, marginBottom:16 }}>💡 Le stock min est calculé automatiquement (ventes × 3 semaines) mais reste modifiable.</div>
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
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Fournisseurs & Catalogues</h1>
        {isAdmin && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <label style={{ ...S.btnSecondary, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
              <Package size={15} /> Importer état de stock
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {suppliers.map(s => (
          <div key={s.id} style={S.card}>
            <div style={{ display: "flex", flexDirection:"column", gap:12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                <div style={{ fontSize: 12, color:"var(--t-text-40)", marginTop: 2 }}>{s.commercial} · {s.email}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems:"center" }}>
                <button onClick={() => setExpanded(expanded===s.id ? null : s.id)} style={{ ...S.btnGhost, flex:1, textAlign:"center" }}>{s.products.length} produit(s) {expanded===s.id?"▲":"▼"}</button>
                {isAdmin && <>
                  <button onClick={() => openEdit(s)} style={{ ...S.btnSecondary, flex:1, textAlign:"center" }}>Modifier</button>
                  <button onClick={() => del(s.id)} style={{ ...S.btnDanger, flex:1, textAlign:"center" }}>Supprimer</button>
                </>}
              </div>
            </div>
            {expanded===s.id && (
              <div style={{ marginTop: 14, borderTop: "1.5px solid var(--t-border-subtle)", paddingTop: 14, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background:"var(--t-thead-bg)" }}>
                    {["Réf.","Code EAN","Désignation","Sous-famille","Prix HT","Stock","Dispo.","Stock min"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, color:"var(--t-text-55)", fontWeight:600 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{s.products.map(p => (
                    <tr key={p.ref} style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                      <td style={{ ...S.td, fontFamily: "monospace", fontSize: 11 }}>{p.ref}</td>
                      <td style={{ ...S.td, fontFamily: "monospace", fontSize: 11, color:"var(--t-text-55)" }}>{p.ean || "—"}</td>
                      <td style={S.td}>{p.label}</td>
                      <td style={S.td}><span style={{ fontFamily:"monospace", fontSize:11, background:"var(--t-tag-bg)", padding:"2px 8px", borderRadius:8, color:"var(--t-tag-color)", border:"1px solid var(--t-tag-border)" }}>{p.subFamily || "—"}</span></td>
                      <td style={{ ...S.td, fontWeight: 600, color: "#059669" }}>{fmt(p.price)}</td>
                      <td style={{ ...S.td, color:"var(--t-text-85)" }}>{p.stock != null ? p.stock : "—"}</td>
                      <td style={{ ...S.td, fontWeight: 600, color: (p.dispo != null && p.dispo <= (p.stockMin ?? calcStockMin(p.weeklyVolume))) ? "#DC2626" : "var(--t-text-90)" }}>{p.dispo != null ? p.dispo : "—"}</td>
                      <td style={{ ...S.td, fontWeight: 600, color: "#D97706" }}>{p.stockMin ?? calcStockMin(p.weeklyVolume)}{p.stockMinAuto && <span title="Calculé automatiquement d'après les sorties entre 2 imports" style={{ marginLeft:5, fontSize:9, fontWeight:700, color:"#818cf8", background:"rgba(99,102,241,0.12)", padding:"1px 5px", borderRadius:5, verticalAlign:"middle" }}>auto</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPage({ users, setUsers, locations, setLocations }) {
  const [form, setForm]     = useState(null);
  const [editing, setEditing] = useState(null);
  function openNew() { setForm({ id:"u"+Date.now(), email:"", password:"", name:"", role:"user", canSeePrices:false, active:true, pages:["dashboard","orders","new"] }); setEditing("new"); }
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
        <h1 style={{ margin:0,fontSize:20,fontWeight:700 }}>Gestion des utilisateurs</h1>
        <button onClick={openNew} style={S.btnPrimary}>+ Créer un compte</button>
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
              <button onClick={() => { if(locations.length > 1) setLocations(prev => prev.filter(l => l.id!==loc.id)); }} style={{ ...S.btnDanger, padding:"8px 12px", flexShrink:0 }} disabled={locations.length===1}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
          <thead><tr style={{ background:"var(--t-thead-bg)" }}>
            {["Nom","Email","Rôle","Accès prix","Onglets","Actif","Actions"].map(h => (
              <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:"var(--t-text-40)",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1.5px solid var(--t-border-subtle)" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id} style={{ borderBottom:"1px solid var(--t-border-subtle)" }}>
              <td style={S.td}><span style={{ fontWeight:600 }}>{u.name}</span></td>
              <td style={{ ...S.td,color:"var(--t-text-40)" }}>{u.email}</td>
              <td style={S.td}><span style={{ padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:600,background:u.role==="admin"?"rgba(99,102,241,0.3)":"var(--t-border-subtle)",color:u.role==="admin"?"#a5b4fc":"var(--t-text-55)",border:`1px solid ${u.role==="admin"?"rgba(99,102,241,0.4)":"var(--t-border-subtle)"}` }}>{u.role==="admin"?"Admin":"Utilisateur"}</span></td>
              <td style={S.td}><button onClick={() => toggle(u.id,"canSeePrices")} style={{ padding:"3px 10px",borderRadius:12,cursor:"pointer",fontSize:11,fontWeight:600,background:u.canSeePrices?"rgba(5,150,105,0.2)":"var(--t-surface)",color:u.canSeePrices?"#34d399":"var(--t-text-55)",border:`1px solid ${u.canSeePrices?"rgba(52,211,153,0.3)":"var(--t-border-subtle)"}` }}>{u.canSeePrices?"✓ Oui":"✕ Non"}</button></td>
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
