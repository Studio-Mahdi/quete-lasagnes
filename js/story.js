// Coquille : le contenu pédagogique est servi par l'API après authentification.
// Story.etapes / prologue / epilogue / personnages / rangs sont chargés à la demande.
const Story = {
    totalEtapes: 15,
    etapes: {},
    prologue: null,
    epilogue: null,
    gameOver: null,
    personnages: {},
    rangs: ["?"],

    rangPour(niveau) {
        return this.rangs[Math.min(Math.max(niveau - 1, 0), this.rangs.length - 1)] || "Chef";
    },

    // Rempli par Api.chargerMeta() après le login
    hydrater(meta) {
        if (meta.rangs) this.rangs = meta.rangs;
        if (meta.personnages) this.personnages = meta.personnages;
        if (meta.prologue) this.prologue = meta.prologue;
        if (meta.epilogue) this.epilogue = meta.epilogue;
        if (meta.gameOver) this.gameOver = meta.gameOver;
    },

    hydraterChapitre(niveau, chapitre) {
        this.etapes[niveau] = chapitre;
    }
};
