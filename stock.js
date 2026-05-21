// ================================
//   STOCK CAFET — JS v3 (Supabase)
// ================================

const SUPABASE_URL = "https://caadurhvfikairqkvzsn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYWR1cmh2ZmlrYWlycWt2enNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTI1MzcsImV4cCI6MjA5NDkyODUzN30.e_72L5_97aEgQ391QGCqrQQ1vuIlfDChfCmpR03JEZ8";

const SEUIL_ALERTE = 10;

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

let stockData  = {};
let ventesData = {};

// ---- UTILS ----
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = "toast", 3000);
}

function getSemaine() {
  const now  = new Date();
  const start= new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ---- API SUPABASE ----
async function sbGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
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

// ---- CHARGEMENT ----
async function charger() {
  const semaine = getSemaine();

  // Stock de la semaine
  const stock = await sbGet("stock", `semaine=eq.${semaine}`);
  stockData = {};
  stock.forEach(s => stockData[s.produit] = s);

  // Ventes du jour (toutes sessions du jour)
  const today    = new Date().toISOString().split("T")[0];
  const sessions = await sbGet("sessions", `date=eq.${today}`);
  ventesData     = {};
  produits.forEach(p => ventesData[p.nom] = 0);

  if (sessions.length > 0) {
    const ids    = sessions.map(s => s.id).join(",");
    const ventes = await sbGet("ventes", `session_id=in.(${ids})`);
    ventes.forEach(v => ventesData[v.produit] = (ventesData[v.produit] || 0) + 1);
  }

  afficher();
}

// ---- AFFICHAGE ----
function afficher() {
  const liste = document.getElementById("stock-liste");

  liste.innerHTML = produits.map(p => {
    const s        = stockData[p.nom] || {};
    const depart   = s.depart    || 0;
    const qteAchat = s.qte_achat || 0;
    const montant  = (s.montant  || 0) / 100;
    const vendu    = ventesData[p.nom] || 0;
    const restant  = Math.max(0, depart - vendu);
    const alerte   = restant <= SEUIL_ALERTE && depart > 0;
    const pct      = depart > 0 ? Math.round((restant / depart) * 100) : 0;
    const couleur  = restant <= SEUIL_ALERTE ? "var(--accent-red)" : "var(--accent-green)";

    const prixRevient   = qteAchat > 0 ? montant / qteAchat : 0;
    const margeUnitaire = p.prix - prixRevient;
    const margeAffichee = prixRevient > 0
      ? `<span class="stock-marge">Marge unitaire : <strong>${margeUnitaire >= 0 ? "+" : ""}${margeUnitaire.toFixed(2)} €</strong></span>`
      : "";

    return `
      <div class="stock-card ${alerte ? "stock-alerte" : ""}">
        <div class="stock-card-top">
          <span class="stock-nom">${p.emoji} ${p.nom}</span>
          <span class="stock-restant" style="color:${couleur}">${restant} restant${restant > 1 ? "s" : ""}</span>
        </div>
        <div class="stock-barre-wrap">
          <div class="stock-barre" style="width:${pct}%; background:${couleur}"></div>
        </div>
        <div class="stock-detail">
          <span>Départ : <strong>${depart}</strong></span>
          <span>Vendu : <strong>${vendu}</strong></span>
          ${alerte ? '<span class="stock-alerte-txt">⚠️ À réapprovisionner</span>' : ""}
          ${margeAffichee}
        </div>
        <div class="stock-form" id="form-${p.nom.replace(/[\/ ]/g,'-')}">
          <div class="stock-form-ligne">
            <label>Qté de départ</label>
            <input type="number" inputmode="numeric" min="0" step="1"
              class="input-depart" placeholder="${depart || '0'}">
          </div>
          <div class="stock-form-ligne">
            <label>Qté achetée</label>
            <input type="number" inputmode="numeric" min="0" step="1"
              class="input-qteachat" placeholder="${qteAchat || '0'}">
          </div>
          <div class="stock-form-ligne">
            <label>Montant payé (€)</label>
            <input type="number" inputmode="decimal" min="0" step="0.01"
              class="input-montant" placeholder="${montant || '0.00'}">
          </div>
          <button class="btn-valider-stock" onclick="validerStock('${p.nom}')">✓ Valider</button>
        </div>
      </div>
    `;
  }).join("");
}

// ---- VALIDATION ----
async function validerStock(nom) {
  const id     = nom.replace(/[\/ ]/g, '-');
  const form   = document.getElementById("form-" + id);
  const depart = parseInt(form.querySelector(".input-depart").value);
  const qte    = parseInt(form.querySelector(".input-qteachat").value);
  const montant= parseFloat(form.querySelector(".input-montant").value);

  if (isNaN(depart) || depart < 0)  { toast("Quantité de départ invalide"); return; }
  if (isNaN(qte)    || qte < 0)     { toast("Quantité achetée invalide");   return; }
  if (isNaN(montant)|| montant < 0) { toast("Montant invalide");             return; }

  const semaine  = getSemaine();
  const montantC = Math.round(montant * 100);
  const existing = stockData[nom];

  if (existing?.id) {
    await sbPatch("stock", existing.id, { depart, qte_achat: qte, montant: montantC });
  } else {
    await sbPost("stock", { produit: nom, depart, qte_achat: qte, montant: montantC, semaine });
  }

  form.querySelectorAll("input").forEach(i => i.blur());
  await charger();
  toast("✅ " + nom + " validé !");
}

// ---- RESET ----
async function resetStock() {
  if (prompt("Code de réinitialisation :") !== "1234") return;
  const semaine = getSemaine();
  await fetch(`${SUPABASE_URL}/rest/v1/stock?semaine=eq.${semaine}`, {
    method: "DELETE",
    headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
  });
  await charger();
  toast("Stock remis à zéro");
}

// ---- INIT ----
document.getElementById("date-affichage").textContent =
  new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

charger();
