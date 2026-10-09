// Coquille : le contenu pédagogique est servi par l'API après authentification.
// Story.etapes / prologue / epilogue / personnages / rangs sont chargés à la demande.
// Levels ne contient aucune donnée pédagogique : les épreuves (énoncés, dialogues,
// impacts, feedbacks) vivent côté serveur (révélation progressive) et sont servies
// via le champ "epreuve" de chaque chapitre.
const Levels = {
    game: null,

    init(game) {
        this.game = game;
        UI._avantKo = () => {
            game.historique.pvPerdus++;
            if (game.joueur.niveau >= 1 && game.joueur.niveau <= 15) {
                Api.track("echec", game.joueur.niveau, { pv: game.joueur.pv });
            }
        };
        UI.setOnKo(() => {
            if (game.joueur.pv <= 0 && game.joueur.niveau <= 15) this.gameOver();
        });
        document.getElementById("btn-grimoire").addEventListener("click", () => {
            UI.grimoire(this.game.joueur.niveau);
        });
        document.getElementById("btn-grimoire-close").addEventListener("click", () => {
            document.getElementById("grimoire-overlay").style.display = "none";
        });
        document.getElementById("grimoire-overlay").addEventListener("click", (e) => {
            if (e.target.id === "grimoire-overlay") e.target.style.display = "none";
        });
        document.getElementById("btn-fiches").addEventListener("click", () => {
            Fiches.menu();
        });
        document.getElementById("btn-casting").addEventListener("click", () => {
            UI.casting();
        });
        document.getElementById("btn-trophees").addEventListener("click", () => {
            UI.trophees();
        });
        document.getElementById("btn-trophees-close").addEventListener("click", () => {
            document.getElementById("trophees-overlay").style.display = "none";
        });
        document.getElementById("trophees-overlay").addEventListener("click", (e) => {
            if (e.target.id === "trophees-overlay") e.target.style.display = "none";
        });
        document.getElementById("btn-classement").addEventListener("click", async () => {
            Sons.clic();
            try {
                const liste = await Api.classement();
                UI.classement(liste, game.joueur.prenom);
            } catch (err) {
                UI.classement(null);
            }
        });
        document.getElementById("btn-classement-close").addEventListener("click", () => {
            document.getElementById("classement-overlay").style.display = "none";
        });
        document.getElementById("classement-overlay").addEventListener("click", (e) => {
            if (e.target.id === "classement-overlay") e.target.style.display = "none";
        });
        document.getElementById("btn-son").addEventListener("click", () => {
            const actif = Sons.toggle();
            document.getElementById("btn-son").innerHTML = actif
                ? '<i class="fa-solid fa-volume-high"></i>'
                : '<i class="fa-solid fa-volume-xmark"></i>';
        });
        game.historique = { pvPerdus: 0, premierBenefice: false, bfrReussi: false, tvaParfaite: false, embuchesSurmontees: 0, bossTermine: false };
        this._initVueProf(game);
        document.getElementById("btn-casting-close").addEventListener("click", () => {
            document.getElementById("casting-overlay").style.display = "none";
        });
        document.getElementById("casting-overlay").addEventListener("click", (e) => {
            if (e.target.id === "casting-overlay") e.target.style.display = "none";
        });
        document.getElementById("btn-fiche-close").addEventListener("click", () => Fiches.fermer());
        document.getElementById("fiche-overlay").addEventListener("click", (e) => {
            if (e.target.id === "fiche-overlay") Fiches.fermer();
        });
    },

    total: 15,

    async load(niveau) {
        UI.setFeedback("");
        this._debutNiveau = Date.now();
        if (niveau >= 1 && niveau <= 15 && this.game) {
            Api.track("debut_niveau", niveau, {});
            // Contenu pédagogique servi par l'API (révélation progressive)
            if (!Story.etapes[niveau]) {
                try {
                    const chapitre = await Api.chargerChapitre(niveau);
                    Story.hydraterChapitre(niveau, chapitre);
                } catch (e) {
                    UI.feedbackKo("Chapitre verrouillé — contenu indisponible.");
                    return;
                }
            }
        }
        const def = this.defs[niveau] || this.victoire;
        def.call(this);
    },

    gameOver() {
        Api.track("game_over", this.game.joueur.niveau, { pv: 0 });
        const go = Story.gameOver || {};
        UI.setDialog("fa-solid fa-heart-crack", "Chef Luigi", go.dialogue || "");
        UI.setContent(`
            <div class="embuche-box" style="border-color:#999;">
                <div class="embuche-header" style="color:#666;"><i class="fa-solid fa-heart-crack"></i> Game Over</div>
                ${go.texte || ""}
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn" id="btn-bonus"><i class="fa-solid fa-brain"></i> Épreuves bonus : récupérer de la vie</button>
                    <button class="btn choice" id="btn-retry">Reprendre au chapitre <span id="retry-n"></span> avec 30 PV</button>
                </div>
            </div>`);
        document.getElementById("retry-n").innerText = this.game.joueur.niveau;
        document.getElementById("btn-retry").addEventListener("click", () => {
            const j = this.game.joueur;
            j.pv = 30;
            this.game.updateStats();
            this.game.save();
            this.load(j.niveau);
        });
        document.getElementById("btn-bonus").addEventListener("click", () => {
            Bonus.lancer(this.game, (total) => {
                if (total > 0) {
                    UI.feedbackOk((go.bonusOk || "").replace(/\{n\}/g, total));
                    setTimeout(() => this.load(this.game.joueur.niveau), 2600);
                } else {
                    UI.feedbackKo(go.bonusKo || "");
                    setTimeout(() => this.gameOver(), 2600);
                }
            });
        });
    },

    complete() {
        const g = this.game;
        g.joueur.niveau++;
        g.updateStats();
        g.save();
        if (g.joueur.pv <= 0) { this.gameOver(); return; }
        Sons.fanfare();
        Api.track("victoire", g.joueur.niveau - 1, { dureeMs: Date.now() - (this._debutNiveau || Date.now()) });
        this._evaluerTrophees();
        this.recapituler(g.joueur.niveau - 1);
        // peutFrapper est async : attendre sa réponse (une Promise est toujours
        // "vraie", le chapitre suivant ne se chargeait donc jamais sans embûche).
        const nxt = async () => {
            let frappe = false;
            try { frappe = await Embuches.peutFrapper(g); } catch (e) { console.error(e); }
            if (!frappe) this.load(g.joueur.niveau);
        };
        setTimeout(nxt, 4200);
    },

    async _initVueProf(game) {
        try {
            const data = await Api.classProgress();
            if (data && data.etudiants) {
                const btn = document.getElementById("btn-classement");
                // le prof voit un onglet "Ma classe" en plus du classement public
                const profBtn = document.createElement("span");
                profBtn.className = "stat-action";
                profBtn.id = "btn-vue-prof";
                profBtn.title = "Vue professeur : progression détaillée de la classe";
                profBtn.innerHTML = '<i class="fa-solid fa-chalkboard-user"></i> Ma classe';
                btn.parentElement.insertBefore(profBtn, btn);
                profBtn.addEventListener("click", () => UI.vueProf(data));
            }
        } catch (e) { /* pas prof ou offline : rien */ }
    },

    _evaluerTrophees() {
        const g = this.game;
        const nouveaux = Trophees.evaluer(g.joueur, g.historique || {});
        if (nouveaux.length > 0) {
            UI.majTrophees();
            const t = nouveaux[0];
            setTimeout(() => {
                UI.setDialog(t.icone, "🏆 Trophée débloqué !", `<b>${t.titre}</b> — ${t.desc}`);
            }, 4400);
        }
    },

    recapituler(niveauTermine) {
        const et = Story.etapes[niveauTermine];
        if (!et) return;
        UI.confettis();
        UI.setDialog(et.competence.icone, "Compétence acquise", `${et.competence.nom} — ${et.recap}`);
        UI.setContent(`
            <div class="competence-acquise">
                <i class="${et.competence.icone}"></i>
                <div>
                    <b>Compétence acquise : ${et.competence.nom}</b>
                    <div class="recap">${et.recap}</div>
                    ${et.anecdote ? `<div class="anecdote"><b><i class="fa-solid fa-lightbulb"></i> Le saviez-vous ?</b> ${et.anecdote}</div>` : ""}
                    ${et.recompense ? `<div class="recompense"><i class="fa-solid fa-gift"></i> <div><b>Récompense</b><div>${et.recompense}</div></div></div>` : ""}
                </div>
            </div>`);
    },

    prologue() {
        UI.setDialog("fa-solid fa-plate-wheat", "Narrateur", "Ta quête commence...");
        UI.setContent(`
            <div class="prologue">
                <h2><i class="${Story.prologue.icone}"></i> ${Story.prologue.titre}</h2>
                ${Story.prologue.texte}
                <button class="btn" id="btn-prologue"> ${Story.prologue.bouton} <i class="fa-solid fa-arrow-right"></i></button>
            </div>`);
        document.getElementById("btn-prologue").addEventListener("click", () => {
            this.epreuveCapital();
        });
    },

    epreuveCapital() {
        const et = Story.etapes[1] || {};
        const ep = et.epreuve || {};
        UI.setDialog(ep.dialogueIcone, ep.dialogueNom, ep.dialogueTexte);
        UI.setContent(`<button class="btn" id="btn-n1">${ep.bouton}</button>`);
        document.getElementById("btn-n1").addEventListener("click", () => {
            this._appliquerImpact(ep.impact);
            this.complete();
        });
    },

    ficheChapitre(niveau) {
        const et = Story.etapes[niveau];
        if (!et) return;
        UI.setDialog(et.icone, "Narrateur", et.accroche);
        UI.setContent(`
            <div class="chapitre-fiche">
                <h2><i class="${et.icone}"></i> Étape ${niveau} : ${et.titre}</h2>
                <div class="chapitre-objectif">
                    <i class="fa-solid fa-bullseye"></i> Objectif : réussir l'épreuve sans faire plonger la trattoria.
                </div>
                <button class="btn" id="btn-commencer-epreuve"><i class="fa-solid fa-play"></i> Entrer dans l'épreuve</button>
            </div>`);
        document.getElementById("btn-commencer-epreuve").addEventListener("click", () => {
            this.jouerEpreuve(niveau);
        });
    },

    async victoire() {
        // L'épilogue n'est servi qu'une fois la quête terminée : la méta chargée
        // au début de la session ne le contient pas encore.
        if (!Story.epilogue) {
            try { Story.hydrater(await Api.chargerMeta()); } catch (e) { console.error(e); }
        }
        if (!Story.epilogue) {
            UI.feedbackKo("Épilogue indisponible — recharge la page pour réessayer.");
            return;
        }
        Sons.fanfare();
        this._evaluerTrophees();
        UI.setDialog("fa-solid fa-trophy", "Chef Luigi", Story.epilogue.texte.replace(/<[^>]*>/g, "").slice(0, 150) + "...");
        UI.setContent(`
            <div class="prologue">
                <h2><i class="fa-solid fa-trophy"></i> ${Story.epilogue.titre}</h2>
                ${Story.epilogue.texte}
                <button class="btn" id="btn-certificat"><i class="fa-solid fa-certificate"></i> Obtenir mon certificat</button>
            </div>`);
        document.getElementById("btn-certificat").addEventListener("click", () => {
            UI.certificat(this.game.joueur);
        });
    },

    // ---------- Moteur générique d'épreuves (données 100% serveur) ----------
    // L'étudiant ne voit un énoncé/une réponse que lorsqu'il a atteint le chapitre.
    // Les effets (impacts, validation, mise à jour visuelle) sont des chaînes servies
    // par l'API — même contrat de confiance que reactionEffet des embûches.

    jouerEpreuve(niveau) {
        const et = Story.etapes[niveau];
        const ep = et && et.epreuve;
        if (!ep) { this.complete(); return; }
        this._renderEpreuve(ep, () => this.complete());
    },

    _renderEpreuve(ep, onDone) {
        UI.setDialog(ep.dialogueIcone, ep.dialogueNom, ep.dialogueTexte);
        if (ep.type === "info") {
            this._moteurInfo(ep, onDone);
        } else if (ep.type === "choix") {
            this._moteurChoix(ep, onDone);
        } else if (ep.type === "slider") {
            this._moteurSlider(ep, onDone);
        } else if (ep.type === "cartes") {
            this._moteurCartes(ep, onDone);
        } else if (ep.type === "sequence") {
            this._moteurSequence(ep, onDone);
        } else {
            onDone();
        }
    },

    _appliquerImpact(impact) {
        if (!impact) return;
        const j = this.game.joueur;
        if (typeof impact.tresorerie === "number") j.tresorerie += impact.tresorerie;
        if (typeof impact.pv === "number") j.pv = Math.max(0, Math.min(100, j.pv + impact.pv));
        if (typeof impact.stock === "number") j.stock = Math.max(0, (j.stock || 0) + impact.stock);
        this.game.updateStats();
    },

    _moteurInfo(ep, onDone) {
        UI.setContent(`
            <div class="interactive-box" style="width:100%;">
                ${ep.contenu || ""}
            </div>
            <button class="btn" id="btn-ep-info">${ep.bouton || "Continuer"} <i class="fa-solid fa-arrow-right"></i></button>
            ${ep.fiche ? Fiches.bouton(ep.fiche) : ""}`);
        document.getElementById("btn-ep-info").addEventListener("click", () => {
            if (ep.revealEffet) { try { Function("j", ep.revealEffet)(this.game.joueur); } catch (e) { } }
            if (ep.succes) UI.feedbackOk(ep.succes);
            this._appliquerImpact(ep.impact);
            if (ep.historique) this.game.historique[ep.historique] = true;
            onDone();
        });
    },

    _moteurChoix(ep, onDone) {
        UI.setContent(`
            ${ep.contenu || ""}
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                ${(ep.options || []).map((o, i) => `<button class="btn ${o.penalite ? "choice" : ""}" id="btn-ep-${i}">${o.libelle}</button>`).join("")}
            </div>
            ${ep.fiche ? Fiches.bouton(ep.fiche) : ""}`);
        (ep.options || []).forEach((o, i) => {
            document.getElementById(`btn-ep-${i}`).addEventListener("click", () => {
                this._appliquerImpact(o.impact);
                if (o.historique) this.game.historique[o.historique] = true;
                if (o.reussi) {
                    UI.feedbackOk(o.feedback || "");
                    onDone();
                } else {
                    UI.feedbackKo(o.feedback || "");
                }
            });
        });
    },

    _moteurSlider(ep, onDone) {
        UI.setContent(`
            <div class="interactive-box">
                ${ep.contenu || ""}
                <label>${ep.libelle} : <b id="ep-val">${ep.min}</b> ${ep.unite || ""}</label>
                <input type="range" id="ep-slide" min="${ep.min}" max="${ep.max}" value="${ep.initial != null ? ep.initial : ep.min}">
                ${ep.lecture || ""}
            </div>
            <button class="btn" id="btn-ep-slider">${ep.bouton || "Valider"}</button>
            ${ep.fiche ? Fiches.bouton(ep.fiche) : ""}`);
        const slider = document.getElementById("ep-slide");
        const update = () => {
            const p = Number(slider.value);
            document.getElementById("ep-val").innerText = p;
            if (ep.live) { try { Function("p", ep.live)(p); } catch (e) { } }
        };
        slider.addEventListener("input", update);
        update();
        document.getElementById("btn-ep-slider").addEventListener("click", () => {
            const p = Number(slider.value);
            const ok = ep.valider ? Function("p", "return (" + ep.valider + ")")(p) : true;
            if (ok) {
                if (ep.impactReussiteEffet) { try { Function("j", "p", ep.impactReussiteEffet)(this.game.joueur, p); } catch (e) { } this.game.updateStats(); }
                if (ep.historique) this.game.historique[ep.historique] = true;
                UI.feedbackOk((ep.feedbackOk || "").replace(/\{p\}/g, p));
                onDone();
            } else {
                this._appliquerImpact(ep.impactEchec);
                UI.feedbackKo((ep.feedbackKo || "").replace(/\{p\}/g, p));
            }
        });
    },

    _moteurCartes(ep, onDone) {
        UI.setContent(`
            ${ep.contenu || ""}
            <div class="bilan-grid">
                <div class="bilan-col" id="col-a"><b>${ep.colonneA || "Colonne A"}</b><div class="bilan-total" id="total-a">0 €</div></div>
                <div class="bilan-col" id="col-b"><b>${ep.colonneB || "Colonne B"}</b><div class="bilan-total" id="total-b">0 €</div></div>
            </div>
            <p class="cartes-aide"><i class="fa-solid fa-hand-pointer"></i> Clique sur une carte pour la placer : 1<sup>er</sup> clic → ${ep.colonneA || "Colonne A"}, 2<sup>e</sup> clic → ${ep.colonneB || "Colonne B"}, 3<sup>e</sup> clic → retour.</p>
            <div style="margin-top:10px;" id="card-pool">
                ${(ep.cartes || []).map((c, i) => `<span class="card-item" data-i="${i}" data-montant="${c.montant}" tabindex="0" role="button">${c.libelle}</span>`).join("")}
            </div>
            <button class="btn" style="margin-top:15px;" id="btn-ep-cartes">${ep.bouton || "Valider"}</button>
            ${ep.fiche ? Fiches.bouton(ep.fiche) : ""}`);
        const totaux = () => {
            let a = 0, b = 0;
            document.querySelectorAll("#col-a .card-item").forEach(c => a += Number(c.dataset.montant));
            document.querySelectorAll("#col-b .card-item").forEach(c => b += Number(c.dataset.montant));
            document.getElementById("total-a").innerText = a + " €";
            document.getElementById("total-b").innerText = b + " €";
            return { a, b };
        };
        // L'élève choisit la colonne : pioche -> A -> B -> pioche.
        // (Avant, chaque carte partait d'elle-même dans la bonne colonne.)
        const cycle = { "card-pool": "col-a", "col-a": "col-b", "col-b": "card-pool" };
        document.querySelectorAll(".card-item").forEach(card => {
            const deplacer = () => {
                document.getElementById(cycle[card.parentElement.id] || "col-a").appendChild(card);
                totaux();
            };
            card.addEventListener("click", deplacer);
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); deplacer(); }
            });
        });
        document.getElementById("btn-ep-cartes").addEventListener("click", () => {
            const places = Array.from(document.querySelectorAll(".bilan-col .card-item"));
            const faux = places.filter(c => {
                const col = c.parentElement.id === "col-a" ? "a" : "b";
                return col !== ep.cartes[Number(c.dataset.i)].cible;
            });
            const t = totaux();
            if (places.length < (ep.cartes || []).length) {
                UI.feedbackKo(ep.msgIncomplete || "Place tous les éléments !");
            } else if (faux.length > 0) {
                UI.feedbackKo(ep.msgFaux || "Au moins un élément est mal placé. Relis les définitions !");
            } else {
                if (ep.historique) this.game.historique[ep.historique] = true;
                UI.feedbackOk((ep.feedbackOk || "")
                    .replace(/\{a\}/g, t.a).replace(/\{b\}/g, t.b));
                onDone();
            }
        });
    },

    _moteurSequence(ep, onDone) {
        let etape = 0;
        const avancer = () => {
            const a = (ep.actes || [])[etape];
            if (!a) { onDone(); return; }
            const suite = () => { etape++; avancer(); };
            if (a.type === "slider" || a.type === "choix" || a.type === "cartes") {
                this._renderEpreuve(a, suite);
                return;
            }
            UI.setDialog(a.dialogueIcone, a.dialogueNom, a.dialogueTexte);
            UI.setContent(`
                ${a.contenu || ""}
                <button class="btn" id="btn-ep-seq">${a.bouton || "Continuer"} <i class="fa-solid fa-arrow-right"></i></button>
                ${a.fiche ? Fiches.bouton(a.fiche) : ""}`);
            document.getElementById("btn-ep-seq").addEventListener("click", () => {
                if (a.revealEffet) { try { Function("j", a.revealEffet)(this.game.joueur); } catch (e) { } }
                if (a.feedbackOk) UI.feedbackOk(a.feedbackOk);
                this._appliquerImpact(a.impact);
                if (a.historique) this.game.historique[a.historique] = true;
                suite();
            });
        };
        avancer();
    },

    defs: {
        1: function () {
            this.prologue();
        },

        2: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(2);
            this.jouerEpreuve(2);
        },

        3: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(3);
            this.jouerEpreuve(3);
        },

        4: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(4);
            this.jouerEpreuve(4);
        },

        5: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(5);
            this.jouerEpreuve(5);
        },

        6: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(6);
            this.jouerEpreuve(6);
        },

        7: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(7);
            this.jouerEpreuve(7);
        },

        8: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(8);
            this.jouerEpreuve(8);
        },

        9: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(9);
            this.jouerEpreuve(9);
        },

        10: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(10);
            this.jouerEpreuve(10);
        },

        11: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(11);
            this.jouerEpreuve(11);
        },

        12: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(12);
            this.jouerEpreuve(12);
        },

        13: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(13);
            this.jouerEpreuve(13);
        },

        14: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(14);
            this.jouerEpreuve(14);
        },

        15: function (epreuve) {
            if (!epreuve) return this.ficheChapitre(15);
            this.jouerEpreuve(15);
        }
    }
};
