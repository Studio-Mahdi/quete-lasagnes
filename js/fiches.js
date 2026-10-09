// Coquille : les fiches d'aide sont servies par l'API après authentification
// (révélation progressive : une fiche se débloque avec son chapitre).
const Fiches = {
    fiches: {},

    async ouvrir(cle) {
        // Le bouton « Fiche d'aide » d'une épreuve arrive ici sans que la fiche
        // ait été chargée (seul le menu la chargeait) : on la demande au serveur.
        if (!this.fiches[cle]) {
            try { this.fiches[cle] = await Api.chargerFiche(cle); } catch (e) { /* verrouillée */ }
        }
        const f = this.fiches[cle];
        if (!f) {
            document.getElementById("fiche-titre").innerHTML = `<i class="fa-solid fa-lock"></i> Fiche verrouillée`;
            document.getElementById("fiche-corps").innerHTML =
                `<div class="fiche-section"><p>Cette fiche se débloque en progressant dans la quête.</p></div>`;
            document.getElementById("fiche-overlay").style.display = "flex";
            return;
        }
        document.getElementById("fiche-titre").innerHTML = `<i class="${f.icone}"></i> ${f.titre}`;
        document.getElementById("fiche-corps").innerHTML =
            `<div class="fiche-question-principale"><i class="fa-solid fa-comment-dots"></i> ${f.question}</div>
             <div class="fiche-pourquoi"><b><i class="fa-solid fa-lightbulb"></i> Pourquoi cette notion existe ?</b><br>${f.pourquoi}</div>` +
            f.sections.map(s => `<div class="fiche-section"><h3>${s.h}</h3><p>${s.p}</p></div>`).join("");
        document.getElementById("fiche-overlay").style.display = "flex";
    },

    fermer() {
        document.getElementById("fiche-overlay").style.display = "none";
    },

    bouton(cle) {
        return `<button class="btn btn-fiche" onclick="Fiches.ouvrir('${cle}')"><i class="fa-solid fa-circle-question"></i> Fiche d'aide</button>`;
    },

    async menu() {
        document.getElementById("fiche-titre").innerHTML = `<i class="fa-solid fa-circle-question"></i> Fiches d'aide`;
        document.getElementById("fiche-corps").innerHTML = `<div class="fiche-section"><p>Chargement de tes fiches...</p></div>`;
        document.getElementById("fiche-overlay").style.display = "flex";

        // Charger toutes les fiches débloquées (le serveur refuse les verrouillées)
        const cles = ["capital", "charges", "seuil", "bfr", "amortissement", "bilan",
                      "tva", "resultat", "marge", "stocks", "provisions", "emprunt", "treso", "sig"];
        let html = `<div class="fiche-section"><p>Les fiches se débloquent au fil de ta progression. Affronte les chapitres pour en révéler davantage !</p></div>`;
        let items = "";
        for (const cle of cles) {
            if (this.fiches[cle]) {
                const f = this.fiches[cle];
                items += `<div class="fiche-menu-item" onclick="Fiches.ouvrir('${cle}')">
                    <i class="${f.icone}"></i>
                    <div><b>${f.titre}</b><div class="fiche-question"><i class="fa-solid fa-comment-dots"></i> ${f.question}</div></div>
                    <i class="fa-solid fa-chevron-right fiche-fleche"></i>
                </div>`;
            } else {
                try {
                    const f = await Api.chargerFiche(cle);
                    this.fiches[cle] = f;
                    items += `<div class="fiche-menu-item" onclick="Fiches.ouvrir('${cle}')">
                        <i class="${f.icone}"></i>
                        <div><b>${f.titre}</b><div class="fiche-question"><i class="fa-solid fa-comment-dots"></i> ${f.question}</div></div>
                        <i class="fa-solid fa-chevron-right fiche-fleche"></i>
                    </div>`;
                } catch (e) { /* verrouillée : on l'affiche comme telle */ }
            }
        }
        // version verrouillée : titres masqués pour ne pas révéler la matière
        const verrouillees = cles.length - Object.keys(this.fiches).length;
        if (verrouillees > 0) {
            items += `<div class="fiche-menu-item" style="opacity:0.5;"><i class="fa-solid fa-lock"></i><div><b>???</b><div class="fiche-question">${verrouillees} fiche(s) encore verrouillée(s)</div></div></div>`;
        }
        document.getElementById("fiche-corps").innerHTML = items || html;
    },

    hydrater(cle, fiche) {
        this.fiches[cle] = fiche;
    }
};
