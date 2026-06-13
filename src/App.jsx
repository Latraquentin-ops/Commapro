import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION SUPABASE
// 👉 Remplace les 2 valeurs ci-dessous par les tiennes (voir le guide GUIDE.md).
// ═══════════════════════════════════════════════════════════════════════════════
const SUPABASE_URL = "https://gwzjfdxndxkewpvpkeoc.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_WLY_2Srri6SS5MRMwAleBA_-nA9SGCF";

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
  { key: "dashboard", label: "🏠 Accueil" },
  { key: "orders",    label: "📋 Commandes" },
  { key: "stats",     label: "📊 Statistiques" },
  { key: "suppliers", label: "🏭 Fournisseurs" },
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
  en_attente:        { label: "En attente",        color: "#D97706", bg: "#FFFBEB" },
  validee:           { label: "Validée",            color: "#2563EB", bg: "#EFF6FF" },
  livree:            { label: "Livrée",             color: "#059669", bg: "#ECFDF5" },
  reception_validee: { label: "Réception validée",  color: "#7C3AED", bg: "#F5F3FF" },
};

// ─── PDF ───────────────────────────────────────────────────────────────────────
function generatePDF(order, showPrices) {
  const total = orderTotal(order);
  const linesHTML = order.lines.map(l => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;">${l.ref}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;">${l.label}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;">${l.subFamily || "—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:center;">${l.qty}</td>
      ${showPrices ? `
      <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;">${fmt(l.price)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;font-weight:600;">${fmt(lineTotal(l))}</td>` : ""}
    </tr>`).join("");
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bon de commande ${order.id}</title>
  <style>body{font-family:Arial,sans-serif;margin:0;padding:30px;color:#1a1a1a;font-size:13px}.header{display:flex;justify-content:space-between;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #1a1a1a}.logo{font-size:22px;font-weight:800}.bc-num{font-size:14px;font-weight:700;color:#2563EB;margin-top:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}.block{background:#f8f9fb;border-radius:8px;padding:14px}.block h3{margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}.block p{margin:3px 0;font-size:12px}table{width:100%;border-collapse:collapse;margin-bottom:16px}thead tr{background:#1a1a1a;color:#fff}th{padding:9px 10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center}</style>
  </head><body>
  <div class="header"><div><div class="logo">BON DE COMMANDE</div><div class="bc-num">${order.id}</div><div style="margin-top:6px;font-size:11px;color:#6b7280">Émis le ${fmtDate(order.date)} · Par ${order.createdBy}</div></div></div>
  <div class="grid">
    <div class="block"><h3>Fournisseur</h3><p><strong>${order.supplierName}</strong></p><p>Commercial : ${order.commercial}</p><p>Email : ${order.email}</p></div>
    <div class="block"><h3>Livraison</h3><p>Date souhaitée : <strong>${fmtDate(order.deliveryDate)}</strong></p><p>Lieu : ${order.deliveryPlace}</p>${order.notes ? `<p style="font-style:italic;color:#6b7280">${order.notes}</p>` : ""}</div>
  </div>
  <table><thead><tr><th>Réf.</th><th>Désignation</th><th>Sous-famille</th><th style="text-align:center">Qté</th>${showPrices ? "<th style='text-align:right'>P.U. HT</th><th style='text-align:right'>Total HT</th>" : ""}</tr></thead>
  <tbody>${linesHTML}</tbody>
  ${showPrices ? `<tfoot><tr><td colspan="4" style="padding:10px;text-align:right;font-weight:700;border-top:2px solid #1a1a1a">TOTAL HT</td><td style="padding:10px;text-align:right;font-weight:800;font-size:15px;border-top:2px solid #1a1a1a">${fmt(total)}</td></tr></tfoot>` : ""}
  </table>
  <div class="footer">Document généré automatiquement · ${order.id} · ${new Date().toLocaleDateString("fr-FR")}</div>
  </body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const win = window.open(URL.createObjectURL(blob), "_blank");
  if (win) setTimeout(() => win.print(), 800);
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
  const glows = { en_attente:"rgba(217,119,6,0.3)", validee:"rgba(37,99,235,0.3)", livree:"rgba(5,150,105,0.3)", reception_validee:"rgba(124,58,237,0.3)" };
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
function AppHeader({ session, page, setPage, navItems, stockAlerts, onLogout, dark, setDark, T }) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const pageLabels = { dashboard:"🏠 Accueil", orders:"📋 Commandes", new:"+ Nouvelle", stats:"📊 Statistiques", suppliers:"🏭 Fournisseurs", admin:"⚙️ Admin" };
  const dropStyle = { position:"absolute", top:"calc(100% + 10px)", right:0, backdropFilter:"blur(32px) saturate(180%)", WebkitBackdropFilter:"blur(32px) saturate(180%)", background:"var(--t-drop-bg)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:18, padding:"8px", boxShadow:"0 24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)", zIndex:300 };
  function navigate(v) { setPage(v); setMenuOpen(false); setNotifOpen(false); }
  function closeAll() { setMenuOpen(false); setNotifOpen(false); }

  return (
    <header style={{ backdropFilter:"blur(32px) saturate(200%)", WebkitBackdropFilter:"blur(32px) saturate(200%)", background:T.headerBg, borderBottom:"1px solid "+T.headerBorder, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60, position:"sticky", top:0, zIndex:200 }}>
      <button onClick={() => navigate("dashboard")} style={{ display:"flex", alignItems:"center", gap:10, background:"none", border:"none", cursor:"pointer", padding:"6px 8px", borderRadius:12, flexShrink:0 }} className="lg-nav-btn">
        <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(99,102,241,0.9),rgba(139,92,246,0.9))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:"0 4px 14px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2)", flexShrink:0 }}>📦</div>
        <div style={{ textAlign:"left" }}>
          <div style={{ fontWeight:700, fontSize:14, letterSpacing:"-0.03em", background:T.accent, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1.1 }}>CommaPro</div>
          <div style={{ fontSize:9, color:"var(--t-text-30)", letterSpacing:"0.1em", textTransform:"uppercase" }}>Commandes HT</div>
        </div>
      </button>

      <div style={{ fontSize:13, fontWeight:600, color:"var(--t-text-55)", letterSpacing:"-0.01em" }}>{pageLabels[page] || ""}</div>

      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>

        {/* NOTIFICATION BELL */}
        <div style={{ position:"relative" }}>
          <button onClick={() => { setNotifOpen(o => !o); setMenuOpen(false); }} style={{ position:"relative", width:36, height:36, borderRadius:10, border:"1px solid " + (notifOpen ? "rgba(239,68,68,0.5)" : stockAlerts.length > 0 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.12)"), background: notifOpen ? "rgba(239,68,68,0.2)" : stockAlerts.length > 0 ? "rgba(239,68,68,0.1)" : "var(--t-surface)", color:"var(--t-text-90)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, backdropFilter:"blur(8px)", flexShrink:0, transition:"all 0.18s" }}>
            🔔
            {stockAlerts.length > 0 && (
              <span style={{ position:"absolute", top:-4, right:-4, background:"linear-gradient(135deg,#ef4444,#dc2626)", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:800, color:"white", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid rgba(8,8,18,0.9)", boxShadow:"0 2px 8px rgba(239,68,68,0.6)" }}>
                {stockAlerts.length > 9 ? "9+" : stockAlerts.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div style={{ ...dropStyle, minWidth:320, maxWidth:360, maxHeight:420, overflowY:"auto" }}>
              <div style={{ padding:"10px 12px 10px", borderBottom:"1px solid var(--t-separator)", marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--t-text-85)" }}>🔔 Alertes stock</div>
                {stockAlerts.length > 0 && <span style={{ background:"rgba(239,68,68,0.2)", color:"#f87171", border:"1px solid rgba(239,68,68,0.3)", borderRadius:12, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{stockAlerts.length}</span>}
              </div>
              {stockAlerts.length === 0 ? (
                <div style={{ padding:"24px 12px", textAlign:"center", color:"var(--t-text-30)", fontSize:13 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>✅</div>Aucune alerte — tout est en ordre
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
        <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,rgba(99,102,241,0.7),rgba(168,85,247,0.7))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"white", border:"1.5px solid rgba(255,255,255,0.12)", flexShrink:0 }}>
          {session.name.charAt(0).toUpperCase()}
        </div>

        {/* Hamburger */}
        <div style={{ position:"relative" }}>
          <button onClick={() => { setMenuOpen(o => !o); setNotifOpen(false); }} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:menuOpen?"rgba(99,102,241,0.25)":"var(--t-surface)", color:"var(--t-text-85)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, backdropFilter:"blur(8px)", flexShrink:0 }}>
            <div style={{ width:14, height:1.5, background:"currentColor", borderRadius:2, transition:"all 0.2s", transform:menuOpen?"rotate(45deg) translate(2px,4px)":"none" }} />
            <div style={{ width:14, height:1.5, background:"currentColor", borderRadius:2, transition:"all 0.2s", opacity:menuOpen?0:1 }} />
            <div style={{ width:14, height:1.5, background:"currentColor", borderRadius:2, transition:"all 0.2s", transform:menuOpen?"rotate(-45deg) translate(2px,-4px)":"none" }} />
          </button>
          {menuOpen && (
            <div style={{ ...dropStyle, minWidth:220 }}>
              <div style={{ padding:"10px 12px 8px", borderBottom:"1px solid var(--t-separator)", marginBottom:6 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--t-text-85)" }}>{session.name}</div>
                <div style={{ fontSize:11, color:"var(--t-text-40)", marginTop:1 }}>{session.email}</div>
              </div>
              {navItems.map(([v, lbl]) => (
                <button key={v} onClick={() => navigate(v)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", borderRadius:12, border:"none", cursor:"pointer", background:page===v?"rgba(99,102,241,0.2)":"transparent", color:page===v?"#a5b4fc":"var(--t-text-85)", fontSize:13, fontWeight:page===v?600:400, textAlign:"left" }} className="lg-nav-btn">
                  {page===v && <div style={{ width:3, height:14, borderRadius:2, background:"#818cf8", flexShrink:0 }} />}
                  {lbl}
                </button>
              ))}
              <div style={{ borderTop:"1px solid var(--t-separator)", marginTop:6, paddingTop:6 }}>
                {/* Theme toggle */}
                <button onClick={() => setDark(d => !d)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"9px 12px", borderRadius:12, border:"none", cursor:"pointer", background:"transparent", color:"var(--t-color)", fontSize:13, textAlign:"left" }} className="lg-nav-btn">
                  <span>{dark ? "🌙 Thème sombre" : "☀️ Thème clair"}</span>
                  <div style={{ width:38, height:22, borderRadius:11, background:dark?"rgba(99,102,241,0.7)":"rgba(200,200,200,0.5)", position:"relative", transition:"background 0.3s", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:3, left:dark?18:3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left 0.3s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }} />
                  </div>
                </button>
                <button onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", borderRadius:12, border:"none", cursor:"pointer", background:"transparent", color:"#ef4444", fontSize:13, textAlign:"left" }} className="lg-nav-btn">
                  ↩ Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(menuOpen || notifOpen) && <div onClick={closeAll} style={{ position:"fixed", inset:0, zIndex:199 }} />}
    </header>
  );
}


export default function App() {
  const [users,     setUsers]     = useState(INIT_USERS);
  const [suppliers, setSuppliers] = useState(INIT_SUPPLIERS);
  const [orders,    setOrders]    = useState(INIT_ORDERS);
  const [locations, setLocations] = useState(INIT_LOCATIONS);
  const [session,   setSession]   = useState(null);
  const [page,      setPage]      = useState("dashboard");
  const [dark,      setDark]      = useState(true);
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
    saveCloud({ users, suppliers, orders, locations });
  }, [users, suppliers, orders, locations, loaded]);

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
          .filter(o => ["en_attente","validee"].includes(o.status))
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
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0a0a0f,#0d1117)", color:"white", fontFamily:"-apple-system,sans-serif", gap:16 }}>
      <div style={{ fontSize:40 }}>📦</div>
      <div style={{ fontSize:16, fontWeight:600 }}>Connexion à la base de données…</div>
      <div style={{ width:32, height:32, border:"3px solid rgba(255,255,255,0.15)", borderTopColor:"#818cf8", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!session) return <LoginScreen users={users} onLogin={setSession} dark={dark} setDark={setDark} />;
  const isAdmin = session.role === "admin";

  const allowedPages = isAdmin ? ALL_PAGES.map(p => p.key) : (session.pages || ["dashboard","orders"]);
  const navItems = [
    ...ALL_PAGES.filter(p => allowedPages.includes(p.key)).map(p => [p.key, p.label]),
    isAdmin ? ["admin", "⚙️ Admin"] : null,
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
    <div style={{ fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,sans-serif", minHeight:"100vh", background:T.bg, color:T.color, position:"relative", overflow:"hidden", transition:"background 0.4s, color 0.3s" }}>
      <style>{themeCSS + `
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.97)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,25px) scale(1.03)} 66%{transform:translate(30px,-40px) scale(0.98)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(25px,35px) scale(1.04)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
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
        input, select, textarea { color:var(--t-input-color) !important; background:var(--t-input-bg) !important; transition:all 0.18s !important; font-weight:500; }
        input:focus, select:focus, textarea:focus { outline:none !important; border-color:rgba(99,102,241,0.5) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.12) !important; }
        input::placeholder, textarea::placeholder { color:var(--t-placeholder) !important; }
        option { background:var(--t-option-bg); color:var(--t-input-color); }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:var(--t-scroll); border-radius:3px; }
      `}</style>

      {/* Ambient blobs */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-10%", left:"-5%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,"+T.blob1+" 0%,transparent 70%)", animation:"float1 18s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:"30%", right:"-10%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,"+T.blob2+" 0%,transparent 70%)", animation:"float2 22s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"-15%", left:"30%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,"+T.blob3+" 0%,transparent 70%)", animation:"float3 16s ease-in-out infinite" }} />
      </div>

      {/* Liquid Glass Header */}
      <AppHeader session={session} page={page} setPage={setPage} navItems={navItems} stockAlerts={stockAlerts} onLogout={() => setSession(null)} dark={dark} setDark={setDark} T={T} />

      <main style={{ maxWidth:1100, margin:"0 auto", padding:"28px 16px", position:"relative", zIndex:1 }}>
        {page === "dashboard" && <DashboardPage orders={orders} suppliers={suppliers} stockAlerts={stockAlerts} session={session} setPage={setPage} T={T} />}
        {page === "orders"    && <OrdersPage orders={orders} setOrders={setOrders} session={session} setPage={setPage} T={T} />}
        {page === "new"       && <NewOrderPage orders={orders} setOrders={setOrders} suppliers={suppliers} locations={locations} session={session} setPage={setPage} T={T} />}
        {page === "stats"     && <StatsPage orders={orders} suppliers={suppliers} session={session} T={T} />}
        {page === "suppliers" && <SuppliersPage suppliers={suppliers} setSuppliers={setSuppliers} isAdmin={isAdmin} T={T} />}
        {page === "admin" && isAdmin && <AdminPage users={users} setUsers={setUsers} locations={locations} setLocations={setLocations} T={T} />}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardPage({ orders, suppliers, stockAlerts, session, setPage }) {
  const byStatus = Object.fromEntries(Object.keys(STATUS).map(k => [k, orders.filter(o => o.status === k).length]));
  const totalHT = orders.reduce((s, o) => s + orderTotal(o), 0);
  const pending = orders.filter(o => ["en_attente","validee"].includes(o.status)).reduce((s,o) => s+orderTotal(o), 0);
  const isAdmin = session.role === "admin";

  const navCards = [
    { page:"new",       icon:"✏️", label:"Nouvelle commande",   desc:"Passer une commande fournisseur",  gradient:"linear-gradient(135deg,rgba(99,102,241,0.8),rgba(139,92,246,0.7))", glow:"rgba(99,102,241,0.35)" },
    { page:"orders",    icon:"📋", label:"Historique",           desc:"Consulter les commandes passées",  gradient:"linear-gradient(135deg,rgba(14,165,233,0.7),rgba(6,182,212,0.6))", glow:"rgba(14,165,233,0.3)" },
    { page:"stats",     icon:"📊", label:"Statistiques",         desc:"Analyses et parts fournisseurs",   gradient:"linear-gradient(135deg,rgba(168,85,247,0.7),rgba(217,70,239,0.6))", glow:"rgba(168,85,247,0.3)" },
    { page:"suppliers", icon:"🏭", label:"Fournisseurs",         desc:"Catalogues et référencements",     gradient:"linear-gradient(135deg,rgba(5,150,105,0.7),rgba(16,185,129,0.6))", glow:"rgba(5,150,105,0.3)" },
    isAdmin && { page:"admin", icon:"⚙️", label:"Administration", desc:"Utilisateurs et paramètres",     gradient:"linear-gradient(135deg,rgba(245,158,11,0.7),rgba(234,179,8,0.6))", glow:"rgba(245,158,11,0.3)" },
  ].filter(Boolean).filter(c => (session.pages||[]).includes(c.page) || isAdmin);

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ margin:"0 0 4px", fontSize:26, fontWeight:700, letterSpacing:"-0.03em", color:"var(--t-text-90)" }}>
          Bonjour, {session.name.split(" ")[0]} 👋
        </h1>
        <div style={{ fontSize:13, color:"var(--t-text-55)" }}>Tous les montants sont en tarif Hors Taxe</div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
        {[
          { icon:"📋", label:"Total commandes", value:orders.length, sub:"toutes périodes" },
          { icon:"⏳", label:"En cours HT",     value:fmt(pending),  sub:"en attente + validées", color:"#60a5fa" },
          { icon:"💶", label:"Volume HT",        value:fmt(totalHT),  sub:"toutes commandes",      color:"#34d399" },
          { icon:"✅", label:"Réceptions validées", value:byStatus.reception_validee||0, sub:"clôturées", color:"#a78bfa" },
        ].map((k,i) => (
          <div key={i} className="stat-card" style={{ ...S.card, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:10, color:"var(--t-text-55)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>{k.label}</div>
                <div style={{ fontSize:20, fontWeight:700, color:k.color||"rgba(255,255,255,0.9)", letterSpacing:"-0.02em" }}>{k.value}</div>
                <div style={{ fontSize:10, color:"var(--t-text-30)", marginTop:3 }}>{k.sub}</div>
              </div>
              <span style={{ fontSize:20 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Nav Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
        {navCards.map((c,i) => (
          <button key={i} onClick={() => setPage(c.page)} style={{ ...S.card, padding:20, border:"none", cursor:"pointer", textAlign:"left", background:c.gradient, boxShadow:`0 8px 28px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.15)`, position:"relative", overflow:"hidden" }} className="lg-card">
            <div style={{ fontSize:28, marginBottom:10 }}>{c.icon}</div>
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
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontWeight: 700, fontSize: 15, color:"#f87171" }}>Alertes stock minimum ({stockAlerts.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stockAlerts.map((a, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--t-surface)", borderRadius:14, padding:"10px 14px", flexWrap:"wrap", gap:8, border:"1px solid rgba(255,255,255,0.08)" }}>
                <div>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color:"var(--t-text-40)", marginRight: 8 }}>{a.ref}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, background: "#F1F5F9", padding: "2px 7px", borderRadius: 10, color:"var(--t-text-40)" }}>{a.subFamily}</span>
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

      {/* Recent orders */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Commandes récentes</h2>
          <button onClick={() => setPage("orders")} style={S.btnGhost}>Voir tout →</button>
        </div>
        <OrderTable orders={[...orders].reverse().slice(0, 5)} session={session} onSelect={(id) => setPage("orders")} compact />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS PAGE
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
              { icon: "📋", label: "Commandes", value: filtered.length },
              { icon: "💶", label: "Volume HT", value: fmt(supplierTotal), color: "#059669" },
              { icon: "🏭", label: "Fournisseurs actifs", value: bySupplier.length, color: "#1D4ED8" },
              { icon: "🗂️", label: "Familles", value: byFamily.length, color: "#7C3AED" },
            ].map((k, i) => (
              <div key={i} style={{ ...S.card, padding: 16 }}>
                <div style={{ fontSize: 11, color:"var(--t-text-40)", marginBottom: 4 }}>{k.icon} {k.label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:k.color||"rgba(255,255,255,0.9)", letterSpacing:"-0.02em" }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Fournisseurs + pie */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
  function submit() {
    const u = users.find(u => u.email === email.trim() && u.password === pw && u.active);
    if (u) onLogin(u); else setErr("Email ou mot de passe incorrect.");
  }
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0a0a0f 0%,#0d1117 50%,#0a0f1a 100%)", position:"relative", overflow:"hidden", fontFamily:"-apple-system,'SF Pro Display',BlinkMacSystemFont,sans-serif" }}>
      <style>{`@keyframes lb1{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)}} @keyframes lb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,30px)}}`}</style>
      <div style={{ position:"absolute", top:"15%", left:"10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)", animation:"lb1 14s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"10%", right:"8%", width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle,rgba(14,165,233,0.16) 0%,transparent 70%)", animation:"lb2 18s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ backdropFilter:"blur(32px) saturate(180%)", WebkitBackdropFilter:"blur(32px) saturate(180%)", background:"var(--t-surface)", borderRadius:28, padding:"44px 40px", width:"100%", maxWidth:400, border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)", position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:44, marginBottom:12 }}>📦</div>
          <div style={{ fontSize:26, fontWeight:700, letterSpacing:"-0.03em", background:"linear-gradient(135deg,#e0e7ff,#a5b4fc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>CommaPro</div>
          <div style={{ fontSize:13, color:"var(--t-text-55)", marginTop:6, letterSpacing:"-0.01em" }}>Gestion des commandes fournisseurs</div>
        </div>
        <Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} style={S.input} type="email" placeholder="votre@email.com" onKeyDown={e => e.key==="Enter" && submit()} /></Field>
        <div style={{ height:14 }} />
        <Field label="Mot de passe"><input value={pw} onChange={e => setPw(e.target.value)} style={S.input} type="password" placeholder="••••••••" onKeyDown={e => e.key==="Enter" && submit()} /></Field>
        {err && <div style={{ marginTop:10, fontSize:12, color:"#f87171", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", padding:"8px 14px", borderRadius:12 }}>{err}</div>}
        <button onClick={submit} className="lg-btn-primary" style={{ ...S.btnPrimary, width:"100%", marginTop:22, padding:"13px", fontSize:15, borderRadius:16, transition:"all 0.18s" }}>Se connecter</button>
        <div style={{ marginTop:16, fontSize:11, color:"var(--t-text-30)", textAlign:"center" }}>Démo : admin@demo.com / admin123</div>
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
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color:"var(--t-text-40)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1.5px solid #F1F5F9" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => onSelect(o.id)} onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background=""}>
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

function OrdersPage({ orders, setOrders, session, setPage }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState("all");
  const isAdmin = session.role === "admin";
  const visible = isAdmin ? orders : orders.filter(o => o.userId === session.id);
  const filtered = filter === "all" ? visible : visible.filter(o => o.status === filter);

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
  function setStatus(s) { setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: s } : o)); }
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
            <button onClick={() => generatePDF(order, showPrices)} style={S.btnSecondary}>📄 PDF</button>
            {isAdmin && <button onClick={deleteOrder} style={S.btnDanger}>Supprimer</button>}
          </div>
        </div>
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
                <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
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
function NewOrderPage({ orders, setOrders, suppliers, locations, session, setPage }) {
  const [suppId, setSuppId]             = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState("");
  const [notes, setNotes]               = useState("");
  const [lines, setLines]               = useState([]);
  const [saved, setSaved]               = useState(null);
  const [catalogSearch, setCatalogSearch] = useState("");
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

  function submit() {
    if (!supp || lines.length===0 || !deliveryDate || !deliveryPlace) return;
    const newOrder = { id: genOrderId(orders), userId: session.id, supplierName: supp.name, commercial: supp.commercial, email: supp.email, date: new Date().toISOString().split("T")[0], deliveryDate, deliveryPlace, notes, lines, status: "en_attente", createdBy: session.name };
    setOrders(prev => [...prev, newOrder]);
    setSaved(newOrder);
  }

  if (saved) return (
    <div style={{ ...S.card, maxWidth:500, margin:"0 auto", textAlign:"center", padding:44 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-0.02em", marginBottom:8, color:"var(--t-text-90)" }}>Commande enregistrée</div>
      <div style={{ fontSize:24, fontWeight:700, color:"var(--t-btn-ghost)", marginBottom:20 }}>{saved.id}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => generatePDF(saved, session.canSeePrices)} style={S.btnPrimary}>📄 PDF</button>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
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
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12 }}>
                <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--t-text-90)" }}>2. Catalogue — <span style={{ color:"#a5b4fc" }}>{supp.name}</span></h2>
                <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, maxWidth:280, background:"var(--t-surface)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:22, padding:"6px 14px", backdropFilter:"blur(8px)" }} className="lg-search-bar">
                  <span style={{ color:"var(--t-text-40)", fontSize:14, flexShrink:0 }}>🔍</span>
                  <input
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    placeholder="Rechercher un produit…"
                    style={{ background:"transparent", border:"none", outline:"none", fontSize:12, color:"var(--t-btn-sec-color)", width:"100%", padding:0 }}
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
                    <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
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
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--t-text-40)", background:"var(--t-surface)", padding:"1px 7px", borderRadius:6 }}>{p.ref}</span>
                              {p.subFamily && <span style={{ fontFamily:"monospace", fontSize:10, background:"var(--t-tag-bg)", padding:"1px 7px", borderRadius:6, color:"var(--t-tag-color)", border:"1px solid var(--t-tag-border)" }}>{p.subFamily}</span>}
                              {session.canSeePrices && <span style={{ fontSize:11, color:"#34d399", fontWeight:600 }}>{fmt(p.price)}</span>}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Date souhaitée *"><input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={S.input} /></Field>
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
        <div style={{ position:'sticky', top:80 }}>
          <div style={S.card}>
            <h2 style={{ margin:"0 0 16px 0", fontSize:13, fontWeight:700, color:"var(--t-text-70)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Récapitulatif</h2>
            {lines.length===0 ? <div style={{ color:"var(--t-text-30)", fontSize:13, textAlign:"center", padding:"20px 0" }}>Aucun produit</div> : (
              <>
                {lines.map(l => (
                  <div key={l.ref} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
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
function SuppliersPage({ suppliers, setSuppliers, isAdmin }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(null);
  const [expanded, setExpanded] = useState(null);

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
  function addProduct() { setForm(f => ({...f, products: [...f.products, { ref:"", label:"", price:0, family:"", subFamily:"", weeklyVolume:0, stockMin:0 }]})); }
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          <Field label="Nom société *"><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} style={S.input} /></Field>
          <Field label="Commercial"><input value={form.commercial} onChange={e => setForm(f=>({...f,commercial:e.target.value}))} style={S.input} /></Field>
          <Field label="Email"><input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} style={S.input} type="email" /></Field>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Catalogue produits</h3>
          <button onClick={addProduct} style={S.btnSecondary}>+ Produit</button>
        </div>
        {form.products.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 110px 110px 90px 90px 80px auto", gap: 6, marginBottom: 6 }}>
            {["Réf.","Désignation","Famille","Sous-famille","P.U. HT","Ventes/sem","Stock min",""].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color:"var(--t-text-40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
        )}
        {form.products.map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 110px 110px 90px 90px 80px auto", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <input value={p.ref} onChange={e => updateProduct(i,"ref",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Réf." />
            <input value={p.label} onChange={e => updateProduct(i,"label",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Désignation" />
            <input value={p.family} onChange={e => updateProduct(i,"family",e.target.value)} style={{...S.input,fontSize:11}} placeholder="Ex: Chaussures" />
            <input value={p.subFamily} onChange={e => updateProduct(i,"subFamily",e.target.value)} style={{...S.input,fontSize:11,fontFamily:"monospace"}} placeholder="Ex: E41AS" />
            <input type="number" value={p.price} onChange={e => updateProduct(i,"price",e.target.value)} style={{...S.input,fontSize:11}} placeholder="0.00" />
            <input type="number" value={p.weeklyVolume} onChange={e => updateProduct(i,"weeklyVolume",e.target.value)} style={{...S.input,fontSize:11}} placeholder="0" />
            <input type="number" value={p.stockMin} onChange={e => updateProduct(i,"stockMin",e.target.value)} style={{...S.input,fontSize:11,background:"#FFFBEB"}} placeholder="Auto" />
            <button onClick={() => removeProduct(i)} style={{ background:"none",border:"none",cursor:"pointer",color:"#DC2626",fontSize:18,padding:0 }}>×</button>
          </div>
        ))}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Fournisseurs & Catalogues</h1>
        {isAdmin && <button onClick={openNew} style={S.btnPrimary}>+ Ajouter</button>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {suppliers.map(s => (
          <div key={s.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                <div style={{ fontSize: 12, color:"var(--t-text-40)", marginTop: 2 }}>{s.commercial} · {s.email}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setExpanded(expanded===s.id ? null : s.id)} style={S.btnGhost}>{s.products.length} produit(s) {expanded===s.id?"▲":"▼"}</button>
                {isAdmin && <><button onClick={() => openEdit(s)} style={S.btnSecondary}>Modifier</button><button onClick={() => del(s.id)} style={S.btnDanger}>Supprimer</button></>}
              </div>
            </div>
            {expanded===s.id && (
              <div style={{ marginTop: 14, borderTop: "1.5px solid #F1F5F9", paddingTop: 14, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background:"var(--t-thead-bg)" }}>
                    {["Réf.","Désignation","Famille","Sous-famille","Prix HT","Ventes/sem","Stock min"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, color:"var(--t-text-55)", fontWeight:600 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{s.products.map(p => (
                    <tr key={p.ref} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ ...S.td, fontFamily: "monospace", fontSize: 11 }}>{p.ref}</td>
                      <td style={S.td}>{p.label}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{p.family || "—"}</td>
                      <td style={S.td}><span style={{ fontFamily:"monospace", fontSize:11, background:"var(--t-tag-bg)", padding:"2px 8px", borderRadius:8, color:"var(--t-tag-color)", border:"1px solid var(--t-tag-border)" }}>{p.subFamily || "—"}</span></td>
                      <td style={{ ...S.td, fontWeight: 600, color: "#059669" }}>{fmt(p.price)}</td>
                      <td style={{ ...S.td, color:"var(--t-text-85)" }}>{p.weeklyVolume || 0}</td>
                      <td style={{ ...S.td, fontWeight: 600, color: "#D97706" }}>{p.stockMin ?? calcStockMin(p.weeklyVolume)}</td>
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
              <div style={{ display:"flex",flexDirection:"column",gap:6,background:"#F8FAFC",borderRadius:8,padding:12 }}>
                {ALL_PAGES.map(p => (
                  <label key={p.key} style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13 }}>
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
          <h2 style={{ margin:0, fontSize:15, fontWeight:700 }}>📍 Lieux de livraison</h2>
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
          <thead><tr style={{ background:"#F8FAFC" }}>
            {["Nom","Email","Rôle","Accès prix","Onglets","Actif","Actions"].map(h => (
              <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:"var(--t-text-40)",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1.5px solid #F1F5F9" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id} style={{ borderBottom:"1px solid #F8FAFC" }}>
              <td style={S.td}><span style={{ fontWeight:600 }}>{u.name}</span></td>
              <td style={{ ...S.td,color:"var(--t-text-40)" }}>{u.email}</td>
              <td style={S.td}><span style={{ padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:600,background:u.role==="admin"?"rgba(99,102,241,0.3)":"var(--t-border-subtle)",color:u.role==="admin"?"#a5b4fc":"var(--t-text-55)",border:`1px solid ${u.role==="admin"?"rgba(99,102,241,0.4)":"var(--t-border-subtle)"}` }}>{u.role==="admin"?"Admin":"Utilisateur"}</span></td>
              <td style={S.td}><button onClick={() => toggle(u.id,"canSeePrices")} style={{ padding:"3px 10px",borderRadius:12,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:u.canSeePrices?"rgba(5,150,105,0.2)":"var(--t-surface)",color:u.canSeePrices?"#34d399":"var(--t-text-55)",border:`1px solid ${u.canSeePrices?"rgba(52,211,153,0.3)":"var(--t-border-subtle)"}` }}>{u.canSeePrices?"✓ Oui":"✕ Non"}</button></td>
              <td style={S.td}>
                {u.role==="admin" ? <span style={{fontSize:11,color:"var(--t-text-40)"}}>Tout</span> :
                  <span style={{fontSize:11,color:"var(--t-text-85)"}}>{(u.pages||[]).length}/{ALL_PAGES.length} onglets</span>}
              </td>
              <td style={S.td}><button onClick={() => toggle(u.id,"active")} style={{ padding:"3px 10px",borderRadius:12,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:u.active?"rgba(5,150,105,0.2)":"rgba(239,68,68,0.15)",color:u.active?"#34d399":"#f87171",border:`1px solid ${u.active?"rgba(52,211,153,0.3)":"rgba(239,68,68,0.3)"}` }}>{u.active?"Actif":"Inactif"}</button></td>
              <td style={S.td}><button onClick={() => openEdit(u)} style={S.btnGhost}>Modifier</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
