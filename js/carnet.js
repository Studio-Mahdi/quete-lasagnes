// Le carnet : deux onglets.
// - « Les pages des parents » : un souvenir (objet de la vitrine + page du carnet
//   des parents + récompense) par chapitre réussi — servi par l'API.
// - « Mes erreurs » : chaque autopsie reçue, gardée pour réviser avant le boss.
// - « La caisse » : le journal de la trattoria, chapitre par chapitre — chaque opération
//   avec son effet sur la CAISSE et sur le RÉSULTAT, et les flux à venir (servi par l'API).
const Carnet = {
    CLE_ERREURS: "ql_carnet_erreurs",
    souvenirs: [],

    erreurs() {
        try { return JSON.parse(localStorage.getItem(this.CLE_ERREURS) || "[]"); } catch (e) { return []; }
    },

    noterErreur(niveau, titre, autopsie) {
        if (!autopsie) return;
        const liste = this.erreurs();
        // pas de doublon exact (même chapitre, même explication)
        if (liste.some(e => e.n === niveau && e.autopsie === autopsie)) return;
        liste.push({ n: niveau, titre: titre || "", autopsie });
        try { localStorage.setItem(this.CLE_ERREURS, JSON.stringify(liste.slice(-60))); } catch (e) { /* pas de stockage */ }
    },

    hydrater(souvenirs) {
        if (Array.isArray(souvenirs)) this.souvenirs = souvenirs;
        this.vitrine();
    },

    // Un chapitre vient d'être réussi : son souvenir rejoint la vitrine sans rechargement
    ajouterSouvenir(n, et) {
        if (!et || !et.objet || this.souvenirs.some(s => s.n === n)) return;
        this.souvenirs.push({ n, titre: et.titre, objet: et.objet, carnet: et.carnet || "", recompense: et.recompense || "" });
        this._dernier = n;
        this.vitrine();
    },

    vitrine() {
        const nouveau = this._dernier; // reste en évidence même si la vitrine est redessinée
        const zone = document.getElementById("vitrine");
        if (!zone) return;
        let html = "";
        for (let n = 1; n <= 15; n++) {
            const s = this.souvenirs.find(x => x.n === n);
            html += s
                ? `<span class="vitrine-objet ${n === nouveau ? "nouveau" : ""}" title="${s.objet.nom}" data-n="${n}"><i class="${s.objet.icone}"></i></span>`
                : `<span class="vitrine-objet vide" title="Chapitre ${n} : à gagner"><i class="fa-solid fa-lock"></i></span>`;
        }
        zone.innerHTML = html;
        zone.querySelectorAll(".vitrine-objet[data-n]").forEach(el => el.addEventListener("click", () => this.ouvrir("parents")));
    },

    _euros(x, signe) {
        const v = Math.round(Number(x) * 100) / 100;
        const t = v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " €";
        return signe && v > 0 ? "+" + t : t;
    },

    _cellule(x) {
        if (!x) return `<td class="nul">—</td>`;
        return `<td class="${x < 0 ? "ko" : "ok"}">${this._euros(x, true)}</td>`;
    },

    // Solde de la caisse après l'opération : en rouge seulement s'il est vraiment négatif
    _solde(x) {
        return `<td class="solde ${x < 0 ? "ko" : ""}">${this._euros(x)}</td>`;
    },

    async _caisse(corps) {
        corps.innerHTML = `<p class="chargement"><i class="fa-solid fa-spinner fa-spin"></i> Ouverture du livre de caisse…</p>`;
        let donnees;
        try { donnees = (await Api.chargerMeta()).caisse; } catch (e) { console.error(e); }
        if (document.querySelector(".carnet-onglet.actif")?.dataset.onglet !== "caisse") return; // onglet changé entre-temps
        if (!donnees) { corps.innerHTML = `<p class="subtitle">Le livre de caisse n'a pas pu être chargé. Réessaie dans un instant.</p>`; return; }
        const journal = donnees.journal || [], aVenir = donnees.aVenir || [];
        const caisseJeu = (typeof Game !== "undefined" && Game.joueur) ? Game.joueur.tresorerie : 0;
        if (!journal.length) {
            corps.innerHTML = `<p class="subtitle">Le livre de caisse se remplit à chaque chapitre réussi.</p>`;
            return;
        }
        const titre = (n) => { const s = this.souvenirs.find(x => x.n === n); return s ? s.titre : ""; };
        let html = `<p class="subtitle"><b>Entrée / sortie</b> = l'argent qui entre ou sort de la caisse. <b>Solde</b> = ce qu'il reste dans la caisse après l'opération. <b>Résultat</b> = la richesse créée ou consommée. Caisse et résultat ne bougent pas toujours ensemble : c'est tout le secret de la trattoria.</p>
            <table class="journal"><thead><tr><th>Opération</th><th>Entrée<br>/ sortie</th><th>Solde</th><th>Résultat</th></tr></thead><tbody>`;
        let cumul = 0, totalRes = 0;
        const chapitres = [...new Set(journal.map(x => x.n))].sort((a, b) => a - b);
        for (const n of chapitres) {
            const lignes = journal.filter(x => x.n === n);
            const c = lignes.reduce((s, x) => s + x.caisse, 0), r = lignes.reduce((s, x) => s + x.resultat, 0);
            cumul += c; totalRes += r;
            html += `<tr class="journal-chapitre"><td colspan="4">Chapitre ${n}${titre(n) ? " — " + titre(n) : ""}</td></tr>`;
            let solde = cumul - c;
            html += lignes.map(x => { solde += x.caisse; return `<tr><td>${x.libelle}</td>${this._cellule(x.caisse)}${this._solde(solde)}${this._cellule(x.resultat)}</tr>`; }).join("");
            html += `<tr class="journal-total"><td>Total du chapitre</td>${this._cellule(c)}${this._solde(cumul)}${this._cellule(r)}</tr>`;
        }
        const autres = Math.round((caisseJeu - cumul) * 100) / 100;
        html += `</tbody><tfoot>
            <tr><td>Total des opérations de la trattoria</td>${this._cellule(cumul)}${this._solde(cumul)}${this._cellule(totalRes)}</tr>
            ${autres ? `<tr><td>Autres mouvements (embûches, défis, révisions)</td>${this._cellule(autres)}${this._solde(caisseJeu)}<td class="nul">—</td></tr>` : ""}
            <tr class="journal-final"><td>Caisse aujourd'hui</td><td colspan="3">${this._euros(caisseJeu)}</td></tr>
        </tfoot></table>`;
        if (aVenir.length) {
            html += `<div class="journal-avenir"><b><i class="fa-solid fa-hourglass-half"></i> À venir</b>` +
                aVenir.map(x => `<div>Au chapitre ${x.mois} : ${x.libelle} <b class="${x.montant < 0 ? "ko" : "ok"}">${this._euros(x.montant, true)}</b></div>`).join("") + `</div>`;
        }
        corps.innerHTML = html;
    },

    ouvrir(onglet) {
        const ov = document.getElementById("carnet-overlay");
        document.querySelectorAll(".carnet-onglet").forEach(b => b.classList.toggle("actif", b.dataset.onglet === onglet));
        const corps = document.getElementById("carnet-corps");
        if (onglet === "caisse") {
            ov.style.display = "flex";
            this._caisse(corps);
            return;
        }
        if (onglet === "erreurs") {
            const liste = this.erreurs();
            corps.innerHTML = liste.length
                ? `<p class="subtitle">Relis-les avant le boss final : chacune est une leçon que tes parents n'ont jamais eue.</p>` +
                  liste.slice().reverse().map(e => `
                    <div class="carnet-erreur">
                        <div class="carnet-chapitre">Chapitre ${e.n}${e.titre ? " — " + e.titre : ""}</div>
                        <div>${e.autopsie}</div>
                    </div>`).join("")
                : `<p class="subtitle">Aucune erreur pour l'instant. Quand tu te trompes, l'autopsie de Luigi est rangée ici.</p>`;
        } else {
            corps.innerHTML = this.souvenirs.length
                ? this.souvenirs.map(s => `
                    <div class="carnet-page">
                        <i class="${s.objet.icone}"></i>
                        <div>
                            <div class="carnet-chapitre">Chapitre ${s.n} — ${s.objet.nom}</div>
                            <div class="carnet-parents">« ${s.carnet.replace(/^« ?| ?»$/g, "")} »</div>
                            <div class="carnet-recompense">${s.recompense}</div>
                        </div>
                    </div>`).join("")
                : `<p class="subtitle">Les pages du carnet des parents s'éclairent à chaque chapitre réussi.</p>`;
        }
        ov.style.display = "flex";
    },

    init() {
        document.getElementById("btn-carnet").addEventListener("click", () => this.ouvrir("parents"));
        // la trésorerie de la barre du haut ouvre directement le livre de caisse
        const caisse = document.getElementById("btn-caisse");
        if (caisse) caisse.addEventListener("click", () => this.ouvrir("caisse"));
        document.querySelectorAll(".carnet-onglet").forEach(b => b.addEventListener("click", () => this.ouvrir(b.dataset.onglet)));
        document.getElementById("btn-carnet-close").addEventListener("click", () => {
            document.getElementById("carnet-overlay").style.display = "none";
        });
        document.getElementById("carnet-overlay").addEventListener("click", (e) => {
            if (e.target.id === "carnet-overlay") e.target.style.display = "none";
        });
        this.vitrine();
    }
};
