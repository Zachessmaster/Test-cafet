// ================================
//   STOCK CAFET — JS v2
// ================================

const SEUIL_ALERTE = 10;
const CLES_CAISSE  = "caisse_v4";
const CLES_STOCK   = "stock_v1";

// Même liste que caisse.js — à garder synchronisée
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

// ---- UTILS ----
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = "toast", 3000);
}

// ---- STORAGE ----
function chargerStock() {
  try {
    const raw = localStorage.getItem(CLES_STOCK);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function sauvegarderStock(stock) {
  try {
    localStorage.setItem(CLES_STOCK, JSON.stringify(stock));
  } catch(e) {
    toast("⚠️ Impossible de sauvegarder");
  }
}

function chargerVentes() {
  try {
    const raw = localStorage.getItem(CLES_CAISSE);
    if (!raw) return {};
    return JSON.parse(raw).ventes || {};
  } catch(e) { return {}; }
}

// ---- AFFICHAGE ----
function afficher() {
  const stock  = chargerStock();
  const ventes = chargerVentes();
  const liste  = document.getElementById("stock-liste");

  liste.innerHTML = produits.map(p => {
    const depart   = stock[p.nom]?.depart   || 0;
    const qteAchat = stock[p.nom]?.qteAchat || 0;
    const montant  = stock[p.nom]?.montant  || 0;
    const vendu    = ventes[p.nom] || 0;
    const restant  = Math.max(0, depart - vendu);
    const alerte   = restant <= SEUIL_ALERTE && depart > 0;
    const pct      = depart > 0 ? Math.round((restant / depart) * 100) : 0;
    const couleur  = restant <= SEUIL_ALERTE ? "var(--accent-red)" : "var(--accent-green)";

    // Calcul marge théorique
    const prixRevient  = qteAchat > 0 ? montant / qteAchat : 0;
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

        <div class="stock-form" id="form-${p.nom.replace(/\//g,'-')}">
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

// ---- VALIDATION STOCK ----
function validerStock(nom) {
  const id      = nom.replace(/\//g, '-');
  const form    = document.getElementById("form-" + id);
  const depart  = parseInt(form.querySelector(".input-depart").value);
  const qteAchat= parseInt(form.querySelector(".input-qteachat").value);
  const montant = parseFloat(form.querySelector(".input-montant").value);

  if (isNaN(depart) || depart < 0)   { toast("Quantité de départ invalide"); return; }
  if (isNaN(qteAchat) || qteAchat < 0) { toast("Quantité achetée invalide"); return; }
  if (isNaN(montant) || montant < 0) { toast("Montant invalide"); return; }

  const stock = chargerStock();
  stock[nom] = { depart, qteAchat, montant };
  sauvegarderStock(stock);

  // Blur tous les champs du form
  form.querySelectorAll("input").forEach(i => i.blur());
  afficher();
  toast("✅ " + nom + " validé !");
}

// ---- RESET STOCK ----
function resetStock() {
  if (prompt("Code de réinitialisation :") !== "1234") return;
  localStorage.removeItem(CLES_STOCK);
  afficher();
  toast("Stock remis à zéro");
}

// ---- INIT ----
document.getElementById("date-affichage").textContent =
  new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

afficher();
