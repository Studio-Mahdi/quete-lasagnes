// Coquille : le contenu pédagogique est servi par l'API après authentification.
// Story.etapes / prologue / epilogue / personnages / rangs sont chargés à la demande.
const Story = {
    totalEtapes: 15,
    etapes: {},
    prologue: null,
    epilogue: null,
    gameOver: null,
    epilogueVariantes: null,
    trophees: {},
    personnages: {},
    rangs: ["?"],

    // Les rangs sont répartis sur toute la quête (avant : un rang par chapitre,
    // si bien qu'on devenait « Maîtresse » dès le chapitre 8 sur 15).
    rangPour(niveau) {
        const n = this.rangs.length;
        const reussis = Math.min(Math.max(niveau - 1, 0), 15);
        return this.rangs[Math.min(n - 1, Math.floor(reussis * (n - 1) / 15))] || "Chef";
    },

    // Rempli par Api.chargerMeta() après le login
    hydrater(meta) {
        if (meta.rangs) this.rangs = meta.rangs;
        if (meta.personnages) this.personnages = meta.personnages;
        if (meta.prologue) this.prologue = meta.prologue;
        if (meta.epilogue) this.epilogue = meta.epilogue;
        if (meta.gameOver) this.gameOver = meta.gameOver;
        if (meta.epilogueVariantes) this.epilogueVariantes = meta.epilogueVariantes;
        if (meta.trophees) this.trophees = meta.trophees;
        if ("defiClasse" in meta) this.defiClasse = meta.defiClasse;
        if ("seanceMax" in meta) this.seanceMax = meta.seanceMax;
        if (meta.souvenirs && typeof Carnet !== "undefined") Carnet.hydrater(meta.souvenirs);
    },

    hydraterChapitre(niveau, chapitre) {
        this.etapes[niveau] = chapitre;
    }
};
