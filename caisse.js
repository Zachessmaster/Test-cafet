// ================================
//   CAISSE CAFET — JS v4
// ================================

// ⚙️ MODIFIER ICI : objectif journalier en euros
const OBJECTIF = 50;

// ⚙️ MODIFIER ICI : vos produits
const produits = [
  { nom: "Coca",  emoji: "🥤", prix: 1.0 },
  { nom: "Jus",   emoji: "🍹", prix: 1.0 },
  { nom: "Chips", emoji: "🍟", prix: 0.5 },
  { nom: "Twix",  emoji: "🍫", prix: 1.0 }
];

// ---- ÉTAT ----
const CLES_STORAGE = "caisse_v4";

let total          = 0;
let historique     = [];
let ventes         = {};
let caisseInitiale = 0;
let caisseReelle   = 0;

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

// ---- STORAGE ----
function sauvegarder() {
  try {
    localStorage.setItem(CLES_STORAGE, JSON.stringify({
      total, historique, ventes, caisseInitiale, caisseReelle
    }));
  } catch (e) {
    toast("⚠️ Impossible de sauvegarder — mémoire pleine ?");
  }
}

function charger() {
  try {
    const raw = localStorage.getItem(CLES_STORAGE);
    if (!raw) return;
    const d = JSON.parse(raw);
    total          = d.total          || 0;
    historique     = d.historique     || [];
    ventes         = d.ventes         || {};
    caisseInitiale = d.caisseInitiale || 0;
    caisseReelle   = d.caisseReelle   || 0;
  } catch (e) {}
  produits.forEach(p => { if (!ventes[p.nom]) ventes[p.nom] = 0; });
}

// ---- AFFICHAGE ----
function afficher() {
  // Total + progression
  document.getElementById("total-display").textContent = formatter(total);
  document.getElementById("nb-ventes").textContent = historique.length;

  const pct = Math.min(100, Math.round((total / (OBJECTIF * 100)) * 100));
  document.getElementById("prog-bar").style.width = pct + "%";
  document.getElementById("prog-label").textContent =
    "Objectif : " + formatter(total) + " / " + OBJECTIF.toFixed(2).replace(".", ",") + " €";

  // Bouton annuler
  document.getElementById("btn-undo").disabled = historique.length === 0;

  // Journal des 5 dernières ventes
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

  // Bilan de caisse (visible seulement si les deux montants sont saisis)
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

  // Compteurs sur les boutons produits
  produits.forEach(p => {
    const btn = document.getElementById("btn-" + p.nom);
    if (btn) {
      const q = ventes[p.nom] || 0;
      btn.querySelector(".count").textContent = q + "x vendu" + (q > 1 ? "s" : "");
    }
  });
}

// ---- ACTIONS ----
function annuler() {
  if (!historique.length) return;
  const last = historique.pop();
  total = Math.max(0, total - Math.round(last.prix * 100));
  ventes[last.nom] = Math.max(0, (ventes[last.nom] || 1) - 1);
  sauvegarder();
  afficher();
  toast("Annulé : " + last.nom);
}

function reset() {
  if (prompt("Code de réinitialisation :") !== "1234") return;
  total = 0; historique = []; ventes = {};
  caisseInitiale = 0; caisseReelle = 0;
  produits.forEach(p => ventes[p.nom] = 0);
  localStorage.removeItem(CLES_STORAGE);
  afficher();
  toast("Caisse remise à zéro");
}

// ---- CAISSE DE DÉPART / FIN ----
document.getElementById("input-debut").addEventListener("change", (e) => {
  const n = parseFloat(e.target.value);
  if (isNaN(n) || n < 0) { toast("Montant invalide"); return; }
  caisseInitiale = Math.round(n * 100);
  sauvegarder();
  afficher();
  toast("Caisse de départ : " + formatter(caisseInitiale));
});

document.getElementById("input-fin").addEventListener("change", (e) => {
  const n = parseFloat(e.target.value);
  if (isNaN(n) || n < 0) { toast("Montant invalide"); return; }
  caisseReelle = Math.round(n * 100);
  sauvegarder();
  afficher();
  toast("Caisse réelle enregistrée");
});

function exporter() {
  const date = new Date().toLocaleDateString("fr-FR");

  // Détail ligne par ligne
  let lignes = ["Heure;Produit;Prix (€)"];
  historique.forEach(h => {
    lignes.push(`${h.heure};${h.nom};${h.prix.toFixed(2)}`);
  });

  // Résumé par produit
  lignes.push("");
  lignes.push("Produit;Quantité;Total (€)");
  produits.forEach(p => {
    const q = ventes[p.nom] || 0;
    const t = ((q * Math.round(p.prix * 100)) / 100).toFixed(2);
    lignes.push(`${p.nom};${q};${t}`);
  });

  // Bilan de caisse
  lignes.push("");
  lignes.push("Bilan de caisse");
  lignes.push(`Caisse de départ;${(caisseInitiale / 100).toFixed(2)}`);
  lignes.push(`Total ventes;${(total / 100).toFixed(2)}`);
  lignes.push(`Caisse attendue;${((caisseInitiale + total) / 100).toFixed(2)}`);
  lignes.push(`Caisse réelle;${(caisseReelle / 100).toFixed(2)}`);
  lignes.push(`Écart;${((caisseReelle - caisseInitiale - total) / 100).toFixed(2)}`);
  lignes.push(`Date;${date}`);

  const blob = new Blob(["\uFEFF" + lignes.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "caisse_" + date.replace(/\//g, "-") + ".csv";
  a.click();
  toast("Export téléchargé");
}

// ---- INIT ----
charger();

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
    total += Math.round(p.prix * 100);
    ventes[p.nom] = (ventes[p.nom] || 0) + 1;
    historique.push({
      nom: p.nom, emoji: p.emoji, prix: p.prix,
      heure: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    });
    btn.classList.add("flash");
    setTimeout(() => btn.classList.remove("flash"), 200);
    sauvegarder();
    afficher();
    if (total === Math.round(OBJECTIF * 100)) toast("🎯 Objectif atteint !");
  };
  container.appendChild(btn);
});

window.addEventListener("beforeunload", sauvegarder);

// Pré-remplir les champs si données sauvegardées
if (caisseInitiale > 0) document.getElementById("input-debut").value = (caisseInitiale / 100).toFixed(2);
if (caisseReelle > 0)   document.getElementById("input-fin").value   = (caisseReelle   / 100).toFixed(2);

afficher();
