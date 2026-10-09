// Le carnet : deux onglets.
// - « Les pages des parents » : un souvenir (objet de la vitrine + page du carnet
//   des parents + récompense) par chapitre réussi — servi par l'API.
// - « Mes erreurs » : chaque autopsie reçue, gardée pour réviser avant le boss.
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
        this.vitrine(n);
    },

    vitrine(nouveau) {
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

    ouvrir(onglet) {
        const ov = document.getElementById("carnet-overlay");
        document.querySelectorAll(".carnet-onglet").forEach(b => b.classList.toggle("actif", b.dataset.onglet === onglet));
        const corps = document.getElementById("carnet-corps");
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
