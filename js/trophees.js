const Trophees = {
    // Trophées : persistance localStorage, calculés depuis l'état du joueur.
    // Chaque trophée a une condition pure (testable sans DOM).

    CLES: {
        capital: "trophee_capital",
        premierBenefice: "trophee_benefice",
        sansRayer: "trophee_sans_rayer",
        cash: "trophee_cash",
        bfr: "trophee_bfr",
        tvParfaite: "trophee_tva",
        ebe: "trophee_ebe",
        survieEmbuches: "trophee_embuches",
        completionniste: "trophee_completion",
        boss: "trophee_boss"
    },

    liste: [
        { id: "capital", icone: "fa-solid fa-hand-holding-dollar", titre: "Trophée du Chapitre 2", desc: "Se débloque au fil de la quête", test: (j) => j.niveau >= 2 },
        { id: "premierBenefice", icone: "fa-solid fa-coins", titre: "Trophée du Chapitre 3", desc: "Se débloque au fil de la quête", test: (j, h) => j.niveau >= 4 && h.premierBenefice },
        { id: "sansRayer", icone: "fa-solid fa-heart", titre: "Trophée d'Excellence", desc: "Se débloque par un style de jeu impeccable", test: (j, h) => j.niveau >= 6 && h.pvPerdus === 0 },
        { id: "cash", icone: "fa-solid fa-water", titre: "Trophée de Chapitre", desc: "Se débloque au fil de la quête", test: (j, h) => j.niveau >= 5 && h.bfrReussi },
        { id: "tvParfaite", icone: "fa-solid fa-receipt", titre: "Trophée de Précision", desc: "Se débloque par une décision parfaite", test: (j, h) => j.niveau >= 8 && h.tvaParfaite },
        { id: "ebe", icone: "fa-solid fa-gauge-high", titre: "Trophée du Duel", desc: "Se débloque au fil de la quête", test: (j) => j.niveau >= 15 },
        { id: "survieEmbuches", icone: "fa-solid fa-fire", titre: "Trophée de Résilience", desc: "Se débloque en surmontant l'adversité", test: (j, h) => h.embuchesSurmontees >= 1 },
        { id: "completionniste", icone: "fa-solid fa-book-bookmark", titre: "Trophée Final", desc: "Se débloque en terminant la quête", test: (j) => j.niveau > 15 },
        { id: "boss", icone: "fa-solid fa-trophy", titre: "Trophée Ultime", desc: "Se débloque au sommet de la quête", test: (j, h) => j.niveau > 15 && h.bossTermine }
    ],

    obtenir() {
        return JSON.parse(localStorage.getItem("ql_trophees") || "[]");
    },

    decerner(cle) {
        const actuels = this.obtenir();
        if (!actuels.includes(cle)) {
            actuels.push(cle);
            localStorage.setItem("ql_trophees", JSON.stringify(actuels));
            return true;
        }
        return false;
    },

    // Évalue tous les trophées pour un état joueur + historique.
    // Retourne la liste des trophées nouvellement obtenus.
    evaluer(joueur, historique) {
        const nouveaux = [];
        for (const t of this.liste) {
            if (t.test(joueur, historique) && this.decerner(t.id)) {
                nouveaux.push(t);
            }
        }
        return nouveaux;
    }
};
