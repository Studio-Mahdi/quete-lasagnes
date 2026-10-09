// Coquille : les embûches (textes + réactions) sont servies par l'API après authentification.
const Embuches = {
    probabilite: 0.35,
    dejaVues: [],
    pool: [],

    async charger() {
        if (this.pool.length) return;
        try {
            const data = await Api._post({
                action: "embuches",
                email: Api._getEmail(),
                token: Api._getToken()
            });
            if (data.embuches) {
                this.pool = data.embuches.map(e => ({
                    ...e,
                    reaction: {
                        libelle: e.reactionLibelle,
                        appliquer: eval("({" + e.reactionEffet + "})").appliquer
                    }
                }));
            }
        } catch (e) { console.error(e); }
    },

    async peutFrapper(game) {
        await this.charger();
        if (!this.pool.length) return false;
        if (Math.random() > this.probabilite) return false;
        const restantes = this.pool.filter(e => !this.dejaVues.includes(e.id));
        if (restantes.length === 0) return false;
        const embuche = restantes[Math.floor(Math.random() * restantes.length)];
        this.dejaVues.push(embuche.id);
        this.frapper(game, embuche);
        return true;
    },

    frapper(game, embuche) {
        const j = game.joueur;
        if (embuche.impact.tresorerie) j.tresorerie += embuche.impact.tresorerie;
        if (embuche.impact.stock) j.stock = Math.max(0, j.stock + embuche.impact.stock);
        if (embuche.impact.pv) j.pv = Math.max(0, j.pv + embuche.impact.pv);
        game.updateStats();

        UI.setDialog(embuche.icone, "⚠ " + embuche.titre, embuche.texte);
        UI.setContent(`
            <div class="embuche-box">
                <div class="embuche-header"><i class="${embuche.icone}"></i> ${embuche.titre}</div>
                <p>${embuche.texte}</p>
                <div class="embuche-impact">
                    Impact :
                    ${embuche.impact.tresorerie ? `<span class="ko">${embuche.impact.tresorerie} € de trésorerie</span>` : ""}
                    ${embuche.impact.stock ? `<span class="ko">${embuche.impact.stock} lasagnes</span>` : ""}
                    ${embuche.impact.pv ? `<span class="ko">${embuche.impact.pv} PV</span>` : ""}
                </div>
                <button class="btn" id="btn-embuche">${embuche.reaction.libelle}</button>
            </div>`);

        document.getElementById("btn-embuche").addEventListener("click", () => {
            const message = embuche.reaction.appliquer(j);
            if (game.historique) game.historique.embuchesSurmontees++;
            game.updateStats();
            game.save();
            UI.setDialog("fa-solid fa-shield-halved", "Décision prise", message);
            UI.setContent(`<div class="competence-acquise"><i class="fa-solid fa-shield-halved"></i><div><b>Coupable assimilé</b><div class="recap">${message}</div></div></div>`);
            setTimeout(() => Levels.load(j.niveau), 2600);
        });
    }
};
