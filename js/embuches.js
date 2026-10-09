// Coquille : les embûches (textes + réactions) sont servies par l'API après authentification.
// Chaque réaction est une donnée (impact, message, leçon) : aucun code n'est exécuté.
const Embuches = {
    probabilite: 0.35,
    pool: [],
    _niveauCharge: 0,
    CLE_VUES: "ql_embuches_vues",

    // Mémorisées entre deux visites : une même embûche ne frappe qu'une fois
    dejaVues() {
        try { return JSON.parse(localStorage.getItem(this.CLE_VUES) || "[]"); } catch (e) { return []; }
    },
    marquerVue(id) {
        const vues = this.dejaVues();
        if (!vues.includes(id)) vues.push(id);
        try { localStorage.setItem(this.CLE_VUES, JSON.stringify(vues)); } catch (e) { /* pas de stockage */ }
    },

    async charger(niveau) {
        // de nouvelles embûches se débloquent avec les chapitres : on recharge si le niveau a changé
        if (this.pool.length && this._niveauCharge === niveau) return;
        try {
            const data = await Api._post({ action: "embuches", email: Api._getEmail(), token: Api._getToken() });
            if (data.embuches) { this.pool = data.embuches; this._niveauCharge = niveau; }
        } catch (e) { console.error(e); }
    },

    async peutFrapper(game) {
        // après le boss final, place à l'épilogue : plus d'embûche
        if (game.joueur.niveau > 15) return false;
        await this.charger(game.joueur.niveau);
        const vues = this.dejaVues();
        const restantes = this.pool.filter(e => !vues.includes(e.id));
        if (!restantes.length || Math.random() > this.probabilite) return false;
        // une embûche liée au chapitre qui vient d'être réussi est tirée en priorité
        const liees = restantes.filter(e => e.apres === game.joueur.niveau - 1);
        const tirage = liees.length && Math.random() < 0.6 ? liees : restantes;
        const embuche = tirage[Math.floor(Math.random() * tirage.length)];
        this.frapper(game, embuche);
        return true;
    },

    _appliquer(j, impact) {
        if (!impact) return;
        if (impact.tresorerie) j.tresorerie += impact.tresorerie;
        if (impact.stock) j.stock = Math.max(0, (j.stock || 0) + impact.stock);
        if (impact.pv) j.pv = Math.max(0, Math.min(100, j.pv + impact.pv));
    },

    _impactTexte(impact) {
        if (!impact) return "";
        const parts = [];
        if (impact.tresorerie) parts.push(`<span class="${impact.tresorerie < 0 ? "ko" : "ok"}">${impact.tresorerie > 0 ? "+" : ""}${impact.tresorerie} €</span>`);
        if (impact.stock) parts.push(`<span class="${impact.stock < 0 ? "ko" : "ok"}">${impact.stock > 0 ? "+" : ""}${impact.stock} lasagnes</span>`);
        if (impact.pv) parts.push(`<span class="${impact.pv < 0 ? "ko" : "ok"}">${impact.pv > 0 ? "+" : ""}${impact.pv} PV</span>`);
        return parts.join(" ");
    },

    frapper(game, embuche) {
        const j = game.joueur;
        this.marquerVue(embuche.id);
        this._appliquer(j, embuche.impact);
        game.updateStats();

        UI.setDialog(embuche.icone, "⚠ " + embuche.titre, embuche.texte);
        UI.setContent(`
            <div class="embuche-box">
                <div class="embuche-header"><i class="${embuche.icone}"></i> ${embuche.titre}</div>
                <p>${embuche.texte}</p>
                <div class="embuche-impact">Impact : ${this._impactTexte(embuche.impact)}</div>
                <p class="embuche-question"><b>Que fais-tu, Chef ?</b></p>
                <div class="embuche-reactions">
                    ${(embuche.reactions || []).map((r, i) => `<button class="btn choix-option" data-r="${i}">${r.libelle}</button>`).join("")}
                </div>
            </div>`);

        document.querySelectorAll(".embuche-reactions .btn").forEach(b => {
            b.addEventListener("click", () => {
                const r = embuche.reactions[Number(b.dataset.r)];
                this._appliquer(j, r.impact);
                if (game.historique) game.historique.embuchesSurmontees++;
                game.updateStats();
                game.save();
                UI.setDialog("fa-solid fa-shield-halved", "Décision prise", r.message);
                UI.setContent(`
                    <div class="competence-acquise">
                        <i class="fa-solid fa-shield-halved"></i>
                        <div>
                            <b>${r.libelle}</b>
                            <div class="recap">${r.message}</div>
                            <div class="anecdote"><b><i class="fa-solid fa-lightbulb"></i> La leçon de Luigi</b> ${r.lecon}</div>
                            ${embuche.notion ? Fiches.bouton(embuche.notion) : ""}
                            <button class="btn btn-suite" id="btn-embuche-suite">Reprendre le service <i class="fa-solid fa-arrow-right"></i></button>
                        </div>
                    </div>`);
                document.getElementById("btn-embuche-suite").addEventListener("click", () => Levels.load(j.niveau));
            });
        });
    }
};
