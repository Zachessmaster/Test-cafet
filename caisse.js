// ================================
//   CAISSE CAFET — JS v5 (Supabase)
// ================================

const SUPABASE_URL = "https://caadurhvfikairqkvzsn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYWR1cmh2ZmlrYWlycWt2enNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTI1MzcsImV4cCI6MjA5NDkyODUzN30.e_72L5_97aEgQ391QGCqrQQ1vuIlfDChfCmpR03JEZ8";

const OBJECTIF = 50;

const produits = [
  { nom: "Eau plate",      emoji: "💧", prix: 0.50 },
  { nom: "Sirop",          emoji: "🥛", prix: 1.00 },
  { nom: "Jus orange",     emoji: "🍊", prix: 0.50 },
  { nom: "Jus pomme",      emoji: "🍎", prix: 0.50 },
  { nom: "Jus multifruits",emoji: "🍹", prix: 0.50 },
  { nom: "Caprisun",       emoji: "🧃", prix: 0.50 },
  { nom: "Canette",        emoji: "🥤", prix: 1.00 },
  { nom: "Barre céréales", emoji: "🌾", prix: 1.00 },
  { nom: "Pitch",          emoji: "🍓", prix: 0.50 },
  { nom: "Gâteau",         emoji: "🧁", prix: 0.50 },
  { nom: "Kinder/Twix",   emoji: "🍫", prix: 1.00 },
  { nom: "Cookie",         emoji: "🍪", prix: 1.00 },
  { nom: "Pain choco",     emoji: "🥐", prix: 1.00 },
  { nom: "Beignet",        emoji: "🍩", prix: 1.00 },
];

// ---- ÉTAT ----
let total          = 0;
let historique     = [];
let ventes         = {};
let caisseInitiale = 0;
let caisseReelle   = 0;
let sessionId      = null;

// ---- UTILS ----
function formatter(centimes) {
  return (centimes / 100).toFixed(2).replace(".", ",") + " €";
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = "toast", 2400);
}

// ---- API SUPABASE ----
async function sbGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY
    }
  });
  return res.json();
}

async function sbPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function sbPatch(table, id, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function sbDelete(table, id) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY
    }
  });
}

// ---- SESSION ----
async function chargerOuCreerSession() {
  const today = new Date().toISOString().split("T")[0];
  const heure = new Date().getHours()
  const periode = heure < 12 ? "matin" : "aprem";
  const data = await sbGet("sessions", `date=eq.${today}&periode=eq.${periode}&order=id.desc&limit=1`);

  if (data.length > 0) {
    // Session existante
    const s    = data[0];
    sessionId      = s.id;
    caisseInitiale = s.caisse_initiale || 0;
    caisseReelle   = s.caisse_reelle   || 0;
    total          = s.total_ventes    || 0;

    // Charger les ventes de la session
    const ventesData = await sbGet("ventes", `session_id=eq.${sessionId}&order=id.asc`);
    historique = ventesData.map(v => ({
      id: v.id, nom: v.produit, emoji: v.emoji,
      prix: v.prix / 100, heure: v.heure
    }));
    ventes = {};
    produits.forEach(p => ventes[p.nom] = 0);
    historique.forEach(h => ventes[h.nom] = (ventes[h.nom] || 0) + 1);

  } else {
    // Nouvelle session
    const res = await sbPost("sessions", { date: today, periode, caisse_initiale: 0, caisse_reelle: 0, total_ventes: 0 });
    sessionId  = res[0].id;
    ventes     = {};
    produits.forEach(p => ventes[p.nom] = 0);
  }

  // Pré-remplir champs caisse
  if (caisseInitiale > 0) document.getElementById("input-debut").value = (caisseInitiale / 100).toFixed(2);
  if (caisseReelle   > 0) document.getElementById("input-fin").value   = (caisseReelle   / 100).toFixed(2);

  afficher();
  const badgeEl = document.getElementById("session-badge");
  if (badgeEl) badgeEl.textContent = periode === "matin" ? "🌅 Session du matin" : "🌆 Session de l'après-midi";
  toast("Session du " + new Date().toLocaleDateString("fr-FR") + " chargée");
}

async function majSession() {
  if (!sessionId) return;
  await sbPatch("sessions", sessionId, {
    caisse_initiale: caisseInitiale,
    caisse_reelle:   caisseReelle,
    total_ventes:    total
  });
}

// ---- AFFICHAGE ----
function afficher() {
  document.getElementById("total-display").textContent = formatter(total);
  document.getElementById("nb-ventes").textContent = historique.length;

  const pct = Math.min(100, Math.round((total / (OBJECTIF * 100)) * 100));
  document.getElementById("prog-bar").style.width = pct + "%";
  document.getElementById("prog-label").textContent =
    "Objectif : " + formatter(total) + " / " + OBJECTIF.toFixed(2).replace(".", ",") + " €";

  document.getElementById("btn-undo").disabled = historique.length === 0;

  // Journal
  const journal = document.getElementById("journal-list");
  const recents = [...historique].reverse().slice(0, 5);
  if (recents.length === 0) {
    journal.innerHTML = '<div class="vide">Aucune vente pour l\'instant</div>';
  } else {
    journal.innerHTML = recents.map(h =>
      `<div class="journal-item">
        <span>${h.emoji} ${h.nom}</span>
        <span class="heure">${h.heure} — ${formatter(Math.round(h.prix * 100))}</span>
      </div>`
    ).join("");
  }

  // Bilan de caisse
  const ecartBox = document.getElementById("ecart-box");
  if (caisseInitiale > 0 && caisseReelle > 0) {
    const attendu = caisseInitiale + total;
    const ecart   = caisseReelle - attendu;
    const classe  = ecart > 0 ? "ecart-positif" : ecart < 0 ? "ecart-negatif" : "ecart-neutre";
    const signe   = ecart > 0 ? "+" : "";
    document.getElementById("ecart-contenu").innerHTML = `
      <div class="bilan-ligne"><span class="bilan-label">Caisse de départ</span><span>${formatter(caisseInitiale)}</span></div>
      <div class="bilan-ligne"><span class="bilan-label">Total des ventes</span><span>${formatter(total)}</span></div>
      <div class="bilan-ligne"><span class="bilan-label">Caisse attendue</span><span>${formatter(attendu)}</span></div>
      <div class="bilan-ligne"><span class="bilan-label">Caisse réelle</span><span>${formatter(caisseReelle)}</span></div>
      <div class="bilan-ligne"><span class="bilan-label">Écart</span><span class="${classe}">${signe}${formatter(ecart)}</span></div>
    `;
    ecartBox.style.display = "block";
  } else {
    ecartBox.style.display = "none";
  }

  // Stats par produit
  const statsEl = document.getElementById("stats");
  statsEl.innerHTML = produits.map(p => {
    const q = ventes[p.nom] || 0;
    const t = formatter(q * Math.round(p.prix * 100));
    return `<div class="stat-card">
      <div class="s-nom">${p.emoji} ${p.nom}</div>
      <div class="s-val">${q} vendu${q > 1 ? "s" : ""}</div>
      <div class="s-total">= ${t}</div>
    </div>`;
  }).join("");

  produits.forEach(p => {
    const btn = document.getElementById("btn-" + p.nom);
    if (btn) {
      const q = ventes[p.nom] || 0;
      btn.querySelector(".count").textContent = q + "x vendu" + (q > 1 ? "s" : "");
    }
  });
}

// ---- ACTIONS ----
async function ajouter(p) {
  const centimes = Math.round(p.prix * 100);
  const heure    = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  total += centimes;
  ventes[p.nom] = (ventes[p.nom] || 0) + 1;

  // Sauvegarder dans Supabase
  const res = await sbPost("ventes", {
    session_id: sessionId,
    produit: p.nom,
    emoji: p.emoji,
    prix: centimes,
    heure
  });

  historique.push({ id: res[0].id, nom: p.nom, emoji: p.emoji, prix: p.prix, heure });
  await majSession();
  afficher();
  if (total === Math.round(OBJECTIF * 100)) toast("🎯 Objectif atteint !");
}

async function annuler() {
  if (!historique.length) return;
  const last = historique.pop();
  total = Math.max(0, total - Math.round(last.prix * 100));
  ventes[last.nom] = Math.max(0, (ventes[last.nom] || 1) - 1);

  if (last.id) await sbDelete("ventes", last.id);
  await majSession();
  afficher();
  toast("Annulé : " + last.nom);
}

async function reset() {
  if (prompt("Code de réinitialisation :") !== "1234") return;

  // Supprimer toutes les ventes de la session
  if (sessionId) {
    await fetch(`${SUPABASE_URL}/rest/v1/ventes?session_id=eq.${sessionId}`, {
      method: "DELETE",
      headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
    });
    await sbPatch("sessions", sessionId, { caisse_initiale: 0, caisse_reelle: 0, total_ventes: 0 });
  }

  total = 0; historique = []; ventes = {};
  caisseInitiale = 0; caisseReelle = 0;
  produits.forEach(p => ventes[p.nom] = 0);
  document.getElementById("input-debut").value = "";
  document.getElementById("input-fin").value = "";
  afficher();
  toast("Caisse remise à zéro");
}

// ---- CAISSE DE DÉPART / FIN ----
document.getElementById("input-debut").addEventListener("change", async (e) => {
  const n = parseFloat(e.target.value);
  if (isNaN(n) || n < 0) { toast("Montant invalide"); return; }
  caisseInitiale = Math.round(n * 100);
  e.target.blur();
  await majSession();
  afficher();
  toast("✅ C'est parti ! Tu peux commencer les ventes.");
});

document.getElementById("input-fin").addEventListener("change", async (e) => {
  const n = parseFloat(e.target.value);
  if (isNaN(n) || n < 0) { toast("Montant invalide"); return; }
  caisseReelle = Math.round(n * 100);
  e.target.blur();
  await majSession();
  afficher();
  toast("✅ Caisse de fin enregistrée, consulte le bilan ci-dessous.");
});

// ---- EXPORT ----
async function exporter() {
  const date  = new Date().toLocaleDateString("fr-FR");
  const stock = await sbGet("stock", "order=id.desc");
  const stockMap = {};
  stock.forEach(s => { if (!stockMap[s.produit]) stockMap[s.produit] = s; });

  let lignes = ["Heure;Produit;Prix (€)"];
  historique.forEach(h => lignes.push(`${h.heure};${h.nom};${h.prix.toFixed(2)}`));

  lignes.push("");
  lignes.push("Produit;Qté vendue;Prix vente;Prix achat unitaire;Marge unitaire;Total ventes;Marge totale");
  produits.forEach(p => {
    const q          = ventes[p.nom] || 0;
    const totalVente = ((q * Math.round(p.prix * 100)) / 100).toFixed(2);
    const s          = stockMap[p.nom] || {};
    const prixAchat  = s.qte_achat > 0 ? (s.montant / 100 / s.qte_achat).toFixed(2) : "N/A";
    const margeUnit  = s.qte_achat > 0 ? (p.prix - s.montant / 100 / s.qte_achat).toFixed(2) : "N/A";
    const margeTotale= s.qte_achat > 0 ? ((p.prix - s.montant / 100 / s.qte_achat) * q).toFixed(2) : "N/A";
    lignes.push(`${p.nom};${q};${p.prix.toFixed(2)};${prixAchat};${margeUnit};${totalVente};${margeTotale}`);
  });

  lignes.push("");
  lignes.push("Bilan de caisse");
  lignes.push(`Caisse de départ;${(caisseInitiale / 100).toFixed(2)}`);
  lignes.push(`Total ventes;${(total / 100).toFixed(2)}`);
  lignes.push(`Caisse attendue;${((caisseInitiale + total) / 100).toFixed(2)}`);
  lignes.push(`Caisse réelle;${(caisseReelle / 100).toFixed(2)}`);
  lignes.push(`Écart;${((caisseReelle - caisseInitiale - total) / 100).toFixed(2)}`);
  lignes.push(`Date;${date}`);

  const blob = new Blob(["\uFEFF" + lignes.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "caisse_" + date.replace(/\//g, "-") + ".csv";
  a.click();
  toast("Export téléchargé");
}

// ---- INIT ----
const container = document.getElementById("buttons");
produits.forEach(p => {
  const btn = document.createElement("div");
  btn.className = "prod-btn";
  btn.id = "btn-" + p.nom;
  btn.innerHTML = `
    <div class="nom">${p.emoji} ${p.nom}</div>
    <div class="prix">${p.prix.toFixed(2).replace(".", ",")} €</div>
    <div class="count">0x vendu</div>
  `;
  btn.onclick = () => {
    btn.classList.add("flash");
    setTimeout(() => btn.classList.remove("flash"), 200);
    ajouter(p);
  };
  container.appendChild(btn);
});

function majDateHeure() {
  const maintenant = new Date();
  const date  = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const heure = maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  document.getElementById("date-heure").textContent = date + " — " + heure;
}
majDateHeure();
setInterval(majDateHeure, 1000);

chargerOuCreerSession();
