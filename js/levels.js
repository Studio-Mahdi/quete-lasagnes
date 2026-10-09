// Coquille : le contenu pédagogique est servi par l'API après authentification.
// Story.etapes / prologue / epilogue / personnages / rangs sont chargés à la demande.
// Levels ne contient aucune donnée pédagogique : les épreuves (énoncés, dialogues,
// impacts, feedbacks) vivent côté serveur (révélation progressive) et sont servies
// via le champ "epreuve" de chaque chapitre.
const Levels = {
    game: null,

    init(game) {
        this.game = game;
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
        // Historique du style de jeu : gardé entre deux visites (avant, il repartait
        // de zéro à chaque rechargement et faussait les trophées).
        game.historique = Object.assign(
            { pvPerdus: 0, premierBenefice: false, bfrReussi: false, tvaParfaite: false, embuchesSurmontees: 0,
              bossTermine: false, gameOvers: 0, decouvert: false, chapitresParfaits: [] },
            game.chargerHistorique());
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

    // Demande du chapitre lancée tôt (pendant le chargement du récit) et réutilisée par load()
    _prechargements: {},
    precharger(niveau) {
        if (niveau >= 1 && niveau <= 15 && !Story.etapes[niveau] && !this._prechargements[niveau]) {
            const p = Api.chargerChapitre(niveau);
            p.catch(() => {}); // l'erreur éventuelle est traitée par load()
            this._prechargements[niveau] = p;
        }
    },
    _chapitre(niveau) {
        const p = this._prechargements[niveau];
        delete this._prechargements[niveau];
        // un préchargement raté (réseau, sauvegarde pas encore arrivée) est retenté une fois
        return p ? p.catch(() => Api.chargerChapitre(niveau)) : Api.chargerChapitre(niveau);
    },

    // Bouton cliqué : retour visible immédiat pendant que le serveur répond
    _occuper(id) {
        const b = document.getElementById(id);
        if (!b || b.disabled) return false;
        b.disabled = true;
        b.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Chef Luigi prépare la suite…';
        return true;
    },

    async load(niveau) {
        UI.setFeedback("");
        this._debutNiveau = Date.now();
        if (niveau >= 1 && niveau <= 15 && this.game) {
            Api.track("debut_niveau", niveau, {});
            // Contenu pédagogique servi par l'API (révélation progressive)
            if (!Story.etapes[niveau]) {
                try {
                    const chapitre = await this._chapitre(niveau);
                    Story.hydraterChapitre(niveau, chapitre);
                } catch (e) {
                    if (e.message === "seance") { this.attenteSeance(niveau); return; }
                    // jamais de bouton figé : l'élève voit le problème et peut réessayer
                    UI.setDialog("fa-solid fa-wifi", "Chef Luigi", "Le serveur ne répond pas, Chef. On réessaie ?");
                    UI.setContent(`<div class="chapitre-fiche"><p>Le chapitre ${niveau} n'a pas pu être chargé${e.message === "locked" ? " (ta progression n'est pas encore enregistrée)" : ""}.</p>
                        <button class="btn" id="btn-reessayer"><i class="fa-solid fa-rotate-right"></i> Réessayer</button></div>`);
                    document.getElementById("btn-reessayer").addEventListener("click", () => {
                        if (this._occuper("btn-reessayer")) this.load(niveau);
                    });
                    return;
                }
            }
        }
        const def = this.defs[niveau] || this.victoire;
        def.call(this);
    },

    gameOver() {
        Api.track("game_over", this.game.joueur.niveau, { pv: 0 });
        this.game.historique.gameOvers = (this.game.historique.gameOvers || 0) + 1;
        this.game.save();
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
        const fini = g.joueur.niveau - 1;
        Carnet.ajouterSouvenir(fini, Story.etapes[fini]);
        // Pendant que l'élève lit sa récompense : chapitre suivant et embûches demandés
        // d'avance (avant : deux allers-retours vers Google APRÈS le clic, sans rien afficher)
        this.precharger(g.joueur.niveau); // les embûches du chapitre suivant viennent avec lui
        // peutFrapper est async : attendre sa réponse (une Promise est toujours
        // "vraie", le chapitre suivant ne se chargeait donc jamais sans embûche).
        const nxt = async () => {
            let frappe = false;
            try { frappe = await Embuches.peutFrapper(g); } catch (e) { console.error(e); }
            if (!frappe) this.load(g.joueur.niveau);
        };
        // Le joueur avance quand il a lu sa récompense (avant : 4 s puis départ forcé)
        this.recapituler(fini, nxt);
    },

    async _initVueProf(game) {
        // seuls les profs interrogent la vue classe (le serveur le dit dans contenu_meta)
        if (!Story.prof) return;
        try {
            const data = await Api.classProgress();
            if (data && data.etudiants) {
                const btn = document.getElementById("btn-classement");
                // le prof voit un onglet "Ma classe" en plus du classement public
                const profBtn = document.createElement("span");
                profBtn.className = "stat-action";
                profBtn.id = "btn-vue-prof";
                profBtn.setAttribute("role", "button");
                profBtn.tabIndex = 0;
                profBtn.title = "Vue professeur : progression détaillée de la classe";
                profBtn.innerHTML = '<i class="fa-solid fa-chalkboard-user"></i> <span class="lib">Ma classe</span>';
                btn.parentElement.insertBefore(profBtn, btn);
                profBtn.addEventListener("click", () => UI.vueProf(data));
            }
        } catch (e) { /* pas prof ou offline : rien */ }
    },

    async _evaluerTrophees() {
        const g = this.game;
        const nouveaux = Trophees.evaluer(g.joueur, g.historique || {});
        if (!nouveaux.length) return;
        UI.majTrophees();
        // le serveur ne révèle le vrai nom qu'une fois le trophée enregistré
        try { await g.save(); Story.hydrater(await Api.chargerMeta()); } catch (e) { console.error(e); }
        const n = Trophees.nom(nouveaux[0]);
        UI.trophee(nouveaux[0].icone, n.titre, n.desc);
    },

    recapituler(niveauTermine, suite) {
        const et = Story.etapes[niveauTermine];
        if (!et) { if (suite) suite(); return; }
        UI.setFeedback("");
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
                    ${et.objet ? `<div class="souvenir-gagne"><i class="${et.objet.icone}"></i> <b>${et.objet.nom}</b> rejoint la vitrine de la trattoria.</div>` : ""}
                    ${et.carnet ? `<div class="carnet-parents">Le carnet des parents : « ${et.carnet} »</div>` : ""}
                    <button class="btn btn-suite" id="btn-chapitre-suivant">${et.interlude ? "Continuer" : "Chapitre suivant"} <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>`);
        const bouton = document.getElementById("btn-chapitre-suivant");
        bouton.addEventListener("click", () => {
            if (et.interlude) { this.interlude(et.interlude, suite); return; }
            if (this._occuper("btn-chapitre-suivant") && suite) suite();
        });
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
            this.jouerEpreuve(1);
        });
    },

    // Mode séance : le prof n'a pas encore ouvert ce chapitre pour la promo
    attenteSeance(niveau) {
        UI.setDialog("fa-solid fa-chalkboard-user", "Chef Luigi", "On avance ensemble, Chef : ce chapitre s'ouvrira en classe.");
        UI.setContent(`
            <div class="chapitre-fiche">
                <h2><i class="fa-solid fa-lock"></i> Chapitre ${niveau} : bientôt en classe</h2>
                <p>Ton enseignant ouvrira ce chapitre lors de la prochaine séance. En attendant, entraîne-toi :</p>
                <div class="attente-actions">
                    ${!Bonus.defiFait() ? `<button class="btn btn-defi" id="btn-defi"><i class="fa-solid fa-calendar-check"></i> Défi du jour : +${Bonus.recompenseDefi} €</button>` : ""}
                    <button class="btn choice" id="btn-relire"><i class="fa-solid fa-book-open"></i> Relire mon carnet</button>
                </div>
                ${this._defiClasseHtml()}
            </div>`);
        const defi = document.getElementById("btn-defi");
        if (defi) defi.addEventListener("click", () => Bonus.defi(this.game, () => this.attenteSeance(niveau)));
        document.getElementById("btn-relire").addEventListener("click", () => Carnet.ouvrir("erreurs"));
    },

    _defiClasseHtml() {
        const d = Story.defiClasse;
        if (!d || !d.effectif) return "";
        const pct = Math.round(d.atteints * 100 / d.effectif);
        const date = d.date ? new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "";
        return `<div class="defi-classe ${d.atteints >= d.effectif ? "reussi" : ""}">
            <div><i class="fa-solid fa-people-group"></i> <b>Défi de la promo</b> : réussir le chapitre ${d.chapitre}${date ? " avant " + date : ""}</div>
            <div class="defi-barre"><div style="width:${pct}%"></div></div>
            <div>${d.atteints >= d.effectif ? "🎉 Défi relevé par toute la promo !" : `${d.atteints} / ${d.effectif} Chefs y sont arrivés`}</div>
        </div>`;
    },

    interlude(scene, suite) {
        UI.setDialog(scene.icone, scene.titre, "");
        UI.setContent(`
            <div class="prologue interlude">
                <h2><i class="${scene.icone}"></i> ${scene.titre}</h2>
                <p>${scene.texte}</p>
                <button class="btn" id="btn-interlude">Retourner en cuisine <i class="fa-solid fa-arrow-right"></i></button>
            </div>`);
        document.getElementById("btn-interlude").addEventListener("click", () => { if (this._occuper("btn-interlude") && suite) suite(); });
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
                ${this._defiClasseHtml()}
                ${et.vince ? `<div class="vince-bulle"><i class="fa-solid fa-chess-knight"></i> <div><b>Vince, depuis le Bistrot d'en face :</b> « ${et.vince} »</div></div>` : ""}
                <button class="btn" id="btn-commencer-epreuve"><i class="fa-solid fa-play"></i> Entrer dans l'épreuve</button>
                ${niveau > 1 && !Bonus.defiFait() ? `<button class="btn btn-defi" id="btn-defi"><i class="fa-solid fa-calendar-check"></i> Défi du jour : +${Bonus.recompenseDefi} € en caisse</button>` : ""}
            </div>`);
        document.getElementById("btn-commencer-epreuve").addEventListener("click", () => {
            this.jouerEpreuve(niveau);
        });
        const defi = document.getElementById("btn-defi");
        if (defi) defi.addEventListener("click", () => Bonus.defi(this.game, () => this.ficheChapitre(niveau)));
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
        const j = this.game.joueur, h = this.game.historique || {};
        const nbErreurs = Carnet.erreurs().length;
        const variante = (liste, valeur) => ((liste || []).find(v => valeur >= v.min) || {}).texte || "";
        const V = Story.epilogueVariantes || {};
        const phrases = [variante(V.pv, j.pv), variante(V.embuches, h.embuchesSurmontees || 0), variante(V.erreurs, nbErreurs)].filter(Boolean);
        UI.setDialog("fa-solid fa-trophy", "Chef Luigi", Story.epilogue.texte.replace(/<[^>]*>/g, "").slice(0, 150) + "...");
        UI.setContent(`
            <div class="prologue">
                <h2><i class="fa-solid fa-trophy"></i> ${Story.epilogue.titre}</h2>
                ${Story.epilogue.texte}
                <div class="epilogue-bilan">
                    <div><i class="fa-solid fa-heart"></i><b>${j.pv}</b><span>PV</span></div>
                    <div><i class="fa-solid fa-coins"></i><b>${j.tresorerie} €</b><span>en caisse</span></div>
                    <div><i class="fa-solid fa-fire"></i><b>${h.embuchesSurmontees || 0}</b><span>embûches</span></div>
                    <div><i class="fa-solid fa-award"></i><b>${Trophees.obtenir().length}/${Trophees.liste.length}</b><span>trophées</span></div>
                    <div><i class="fa-solid fa-magnifying-glass"></i><b>${nbErreurs}</b><span>leçons au carnet</span></div>
                </div>
                ${phrases.map(p => `<p class="epilogue-phrase">${p}</p>`).join("")}
                <button class="btn" id="btn-certificat"><i class="fa-solid fa-certificate"></i> Obtenir mon certificat</button>
            </div>`);
        document.getElementById("btn-certificat").addEventListener("click", () => {
            UI.certificat(this.game.joueur);
        });
    },

    // ---------- Moteur générique d'épreuves ----------
    // Le serveur envoie l'énoncé SANS la solution (chiffres propres à l'élève).
    // Chaque réponse part à l'API ("repondre") qui corrige, explique l'erreur
    // (autopsie), trace l'idée fausse pour le prof et valide la progression.

    jouerEpreuve(niveau) {
        const et = Story.etapes[niveau];
        const ep = et && et.epreuve;
        if (!ep) { this.complete(); return; }
        const actes = ep.type === "sequence" ? (ep.actes || []) : [ep];
        this._epreuve = { niveau, actes, erreurs: 0 };
        // Reprise au milieu d'un chapitre : mémoire locale, ou à défaut le serveur
        // (étapes déjà validées) — robuste à un rechargement ou à un autre appareil.
        const repris = Math.max(this._lireActe(niveau), Number(et.reprise) || 0);
        this._jouerActe(repris < actes.length ? repris : 0);
    },

    _cleActe(niveau) { return "ql_acte_" + niveau; },
    _lireActe(niveau) {
        try { return Number(localStorage.getItem(this._cleActe(niveau))) || 0; } catch (e) { return 0; }
    },
    _ecrireActe(niveau, i) {
        try {
            if (i === null) localStorage.removeItem(this._cleActe(niveau));
            else localStorage.setItem(this._cleActe(niveau), String(i));
        } catch (e) { /* stockage indisponible : pas de reprise */ }
    },

    _jouerActe(i) {
        const { niveau, actes } = this._epreuve;
        const acte = actes[i];
        if (!acte) {
            this._ecrireActe(niveau, null);
            const h = this.game.historique;
            if (this._epreuve.erreurs === 0 && !h.chapitresParfaits.includes(niveau)) h.chapitresParfaits.push(niveau);
            this.complete();
            return;
        }
        this._ecrireActe(niveau, i);
        UI.setFeedback("");
        UI.setDialog(acte.dialogueIcone, acte.dialogueNom, acte.dialogueTexte);
        const type = acte.type || "info";
        const moteur = {
            info: this._moteurInfo, choix: this._moteurChoix, slider: this._moteurSlider,
            cartes: this._moteurCartes, saisie: this._moteurSaisie, jauges: this._moteurJauges
        }[type] || this._moteurInfo;
        moteur.call(this, acte, (reponse, bouton) => this._soumettre(i, acte, reponse, bouton));
    },

    async _soumettre(i, acte, reponse, bouton) {
        const ep = this._epreuve;
        if (bouton) bouton.disabled = true;
        let res;
        try {
            res = await Api.repondre(ep.niveau, i, reponse);
        } catch (e) {
            if (bouton) bouton.disabled = false;
            UI.setFeedback(`<span class="ko">Connexion perdue avec la trattoria. Réessaie dans un instant.</span>`);
            return;
        }
        document.querySelectorAll(".erreur-surlignee").forEach(el => el.classList.remove("erreur-surlignee"));
        if (res.ok) {
            this._appliquerImpact(res.impact);
            if (res.historique && !(res.parfait && ep.erreurs > 0)) this.game.historique[res.historique] = true;
            if (res.feedback) UI.feedbackOk(res.feedback);
            const suite = () => this._jouerActe(i + 1);
            // l'info s'enchaîne vite, une réussite laisse le temps de lire
            if ((acte.type || "info") === "info" && !res.feedback) suite();
            else this._boutonSuite(suite);
            return;
        }
        ep.erreurs++;
        const pvAvant = this.game.joueur.pv;
        this._appliquerImpact(res.impact);
        if (this.game.joueur.pv < pvAvant) {
            this.game.historique.pvPerdus++;
            Api.track("echec", ep.niveau, { pv: this.game.joueur.pv });
        }
        (res.erreurs || []).forEach(k => {
            const el = document.querySelector(`[data-k="${k}"]`);
            if (el) el.classList.add("erreur-surlignee");
        });
        Carnet.noterErreur(ep.niveau, (Story.etapes[ep.niveau] || {}).titre, res.autopsie);
        const autopsie = res.autopsie ? `<div class="autopsie"><b><i class="fa-solid fa-magnifying-glass"></i> L'autopsie de Luigi</b><div>${res.autopsie}</div></div>` : "";
        const indice = res.indice ? `<div class="indice"><i class="fa-solid fa-lightbulb"></i> ${res.indice}</div>` : "";
        UI.feedbackKo(`${res.feedback || "Pas tout à fait..."}${autopsie}${indice}`);
        this.game.save();
        if (bouton) bouton.disabled = false;
    },

    _boutonSuite(suite) {
        const zone = document.getElementById("feedback-msg");
        const b = document.createElement("button");
        b.className = "btn btn-suite";
        b.innerHTML = 'Continuer <i class="fa-solid fa-arrow-right"></i>';
        b.addEventListener("click", () => { b.remove(); suite(); });
        zone.appendChild(b);
        b.focus();
    },

    _appliquerImpact(impact) {
        if (!impact) return;
        const j = this.game.joueur;
        if (typeof impact.tresorerie === "number") j.tresorerie += impact.tresorerie;
        if (typeof impact.pv === "number") j.pv = Math.max(0, Math.min(100, j.pv + impact.pv));
        if (typeof impact.stock === "number") j.stock = Math.max(0, (j.stock || 0) + impact.stock);
        this.game.updateStats();
    },

    _executer(code, ...args) {
        // Les visualisations sont servies sous forme "p => { ... }" : il faut
        // évaluer l'expression PUIS l'appeler (avant, elles ne s'exécutaient jamais).
        if (!code) return;
        try {
            const f = Function(`return (${code});`)();
            if (typeof f === "function") f(...args);
        } catch (e) { console.error(e); }
    },

    _moteurInfo(acte, soumettre) {
        UI.setContent(`
            ${acte.contenu ? `<div class="interactive-box" style="width:100%;">${acte.contenu}</div>` : ""}
            <button class="btn" id="btn-ep">${acte.bouton || "Continuer"} <i class="fa-solid fa-arrow-right"></i></button>
            ${acte.fiche ? Fiches.bouton(acte.fiche) : ""}`);
        const b = document.getElementById("btn-ep");
        b.addEventListener("click", () => {
            if (acte.revealEffet) { try { Function("j", acte.revealEffet)(this.game.joueur); } catch (e) { } }
            soumettre(null, b);
        });
    },

    _moteurChoix(acte, soumettre) {
        UI.setContent(`
            ${acte.contenu || ""}
            <div class="choix-liste">
                ${(acte.options || []).map((o, i) => `<button class="btn choix-option" data-k="${i}">${o.libelle}</button>`).join("")}
            </div>
            ${acte.fiche ? Fiches.bouton(acte.fiche) : ""}`);
        document.querySelectorAll(".choix-option").forEach(b => {
            b.addEventListener("click", () => soumettre(Number(b.dataset.k), b));
        });
    },

    _moteurSlider(acte, soumettre) {
        const pas = acte.pas || 1;
        const init = acte.initial != null ? acte.initial : acte.min;
        UI.setContent(`
            <div class="interactive-box">
                ${acte.contenu || ""}
                <label>${acte.libelle} : <b id="ep-val">${init}</b> ${acte.unite || ""}</label>
                <input type="range" id="ep-slide" min="${acte.min}" max="${acte.max}" step="${pas}" value="${init}">
                ${acte.lecture || ""}
            </div>
            <button class="btn" id="btn-ep">${acte.bouton || "Valider"}</button>
            ${acte.fiche ? Fiches.bouton(acte.fiche) : ""}`);
        const slider = document.getElementById("ep-slide");
        const maj = () => {
            const p = Number(slider.value);
            document.getElementById("ep-val").innerText = p;
            this._executer(acte.live, p);
        };
        slider.addEventListener("input", maj);
        maj();
        const b = document.getElementById("btn-ep");
        b.addEventListener("click", () => soumettre(Number(slider.value), b));
    },

    _moteurCartes(acte, soumettre) {
        const cols = [["a", acte.colonneA || "Colonne A"], ["b", acte.colonneB || "Colonne B"]];
        const avecMontants = (acte.cartes || []).some(c => Number(c.montant) > 0); // pas de totaux « 0 € » inutiles
        if (acte.colonneC) cols.push(["c", acte.colonneC]);
        UI.setContent(`
            ${acte.contenu || ""}
            <p class="cartes-aide"><i class="fa-solid fa-hand-pointer"></i> Clique sur une carte pour la faire passer d'une colonne à l'autre : ${cols.map(c => c[1]).join(" → ")} → retour.</p>
            <div class="bilan-grid ${cols.length === 3 ? "trois" : ""}">
                ${cols.map(([k, nom]) => `<div class="bilan-col" id="col-${k}"><b>${nom}</b>${avecMontants ? `<div class="bilan-total" id="total-${k}">0 €</div>` : ""}</div>`).join("")}
            </div>
            <div style="margin-top:10px;" id="card-pool">
                ${(acte.cartes || []).map((c, i) => `<span class="card-item" data-k="${i}" data-montant="${c.montant || 0}" tabindex="0" role="button">${c.libelle}</span>`).join("")}
            </div>
            <button class="btn" style="margin-top:15px;" id="btn-ep">${acte.bouton || "Valider"}</button>
            ${acte.fiche ? Fiches.bouton(acte.fiche) : ""}`);
        const ordre = ["card-pool", ...cols.map(c => "col-" + c[0])];
        const totaux = () => avecMontants && cols.forEach(([k]) => {
            let t = 0;
            document.querySelectorAll(`#col-${k} .card-item`).forEach(c => t += Number(c.dataset.montant));
            document.getElementById("total-" + k).innerText = t + " €";
        });
        document.querySelectorAll(".card-item").forEach(card => {
            const deplacer = () => {
                card.classList.remove("erreur-surlignee");
                const idx = ordre.indexOf(card.parentElement.id);
                document.getElementById(ordre[(idx + 1) % ordre.length]).appendChild(card);
                totaux();
            };
            card.addEventListener("click", deplacer);
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); deplacer(); }
            });
        });
        const b = document.getElementById("btn-ep");
        b.addEventListener("click", () => {
            const places = (acte.cartes || []).map((c, i) => {
                const parent = document.querySelector(`.card-item[data-k="${i}"]`).parentElement.id;
                return parent.startsWith("col-") ? parent.slice(4) : null;
            });
            soumettre(places, b);
        });
    },

    // Calculatrice des cases, comme dans un tableur : « =192*20% », « 192 x 0,2 »,
    // « (1 000 - 80) / 2 ». Analyseur dédié (nombres, + - * / ( ) %), jamais d'eval :
    // aucun autre texte ne peut être exécuté. Renvoie null si vide, NaN si invalide.
    calculer(texte) {
        const s = String(texte == null ? "" : texte).trim().replace(/^=/, "")
            .replace(/\s/g, "").replace(/,/g, ".").replace(/[x×]/gi, "*").replace(/÷/g, "/");
        if (!s) return null;
        if (!/^[0-9.+\-*/()%]+$/.test(s)) return NaN;
        let i = 0;
        const voir = () => s[i];
        const nombre = () => {
            const m = s.slice(i).match(/^\d*\.?\d+|^\d+\./);
            if (!m) throw new Error("nombre attendu");
            i += m[0].length;
            return parseFloat(m[0]);
        };
        const facteur = () => {
            if (voir() === "-") { i++; return -facteur(); }
            if (voir() === "+") { i++; return facteur(); }
            let v;
            if (voir() === "(") { i++; v = expression(); if (voir() !== ")") throw new Error(")"); i++; }
            else v = nombre();
            while (voir() === "%") { i++; v /= 100; }
            return v;
        };
        const terme = () => {
            let v = facteur();
            while (voir() === "*" || voir() === "/") { const op = s[i++]; const d = facteur(); v = op === "*" ? v * d : v / d; }
            return v;
        };
        const expression = () => {
            let v = terme();
            while (voir() === "+" || voir() === "-") { const op = s[i++]; const d = terme(); v = op === "+" ? v + d : v - d; }
            return v;
        };
        try {
            const v = expression();
            return i === s.length && isFinite(v) ? Math.round(v * 100) / 100 : NaN;
        } catch (e) { return NaN; }
    },

    _moteurSaisie(acte, soumettre) {
        UI.setContent(`
            ${acte.contenu || ""}
            <p class="cartes-aide"><i class="fa-solid fa-calculator"></i> Astuce : comme dans un tableur, tu peux taper un calcul, par exemple <b>=1000*20%</b>.</p>
            <div class="saisie-grille">
                ${(acte.champs || []).map((c, i) => `
                <label class="saisie-champ" data-k="${i}">
                    <span>${c.libelle}</span>
                    <span class="saisie-droite">
                        <span class="saisie-input"><input type="text" autocomplete="off" spellcheck="false" id="champ-${i}" placeholder="? ou =calcul"> ${c.unite || ""}</span>
                        <span class="saisie-calcul" id="calcul-${i}"></span>
                    </span>
                </label>`).join("")}
            </div>
            <button class="btn" id="btn-ep">${acte.bouton || "Valider"}</button>
            ${acte.fiche ? Fiches.bouton(acte.fiche) : ""}`);
        const b = document.getElementById("btn-ep");
        const formater = v => String(v).replace(".", ",");
        // aperçu du résultat sous la case dès qu'elle contient un calcul
        (acte.champs || []).forEach((c, i) => {
            const champ = document.getElementById("champ-" + i), apercu = document.getElementById("calcul-" + i);
            champ.addEventListener("input", () => {
                const brut = champ.value.trim();
                const estCalcul = /^=|[+*/x×÷%()]|\d\s*-\s*\d/i.test(brut);
                const v = this.calculer(brut);
                apercu.className = "saisie-calcul" + (Number.isNaN(v) ? " invalide" : "");
                apercu.textContent = !estCalcul || v === null ? "" : Number.isNaN(v) ? "calcul invalide" : "= " + formater(v);
            });
        });
        const envoyer = () => {
            const valeurs = (acte.champs || []).map((c, i) => this.calculer(document.getElementById("champ-" + i).value));
            if (valeurs.some(v => v === null)) { UI.setFeedback(`<span class="ko">Remplis toutes les cases.</span>`); return; }
            const fausse = valeurs.findIndex(v => Number.isNaN(v));
            if (fausse >= 0) { UI.setFeedback(`<span class="ko">Le calcul de la case « ${acte.champs[fausse].libelle} » n'est pas valide.</span>`); return; }
            // seul le résultat part au serveur
            soumettre(valeurs.map(formater), b);
        };
        b.addEventListener("click", envoyer);
        document.querySelectorAll(".saisie-input input").forEach(inp => inp.addEventListener("keydown", e => {
            if (e.key === "Enter") envoyer();
        }));
        const premier = document.getElementById("champ-0");
        if (premier) premier.focus();
    },

    _moteurJauges(acte, soumettre) {
        const evts = acte.evenements || [];
        const choix = evts.map(() => [null, null]);
        const bouton = (i, axe, val, ico) => `<button class="jauge-btn" data-i="${i}" data-axe="${axe}" data-val="${val}" title="${val > 0 ? "monte" : val < 0 ? "baisse" : "ne change pas"}">${ico}</button>`;
        const boutons = (i, axe) => bouton(i, axe, -1, "−") + bouton(i, axe, 0, "0") + bouton(i, axe, 1, "+");
        UI.setContent(`
            ${acte.contenu || ""}
            <div class="jauges-totaux">
                <div class="jauge-total"><span><i class="fa-solid fa-chart-line"></i> Résultat</span><b id="jt-0">0 €</b></div>
                <div class="jauge-total"><span><i class="fa-solid fa-coins"></i> Caisse</span><b id="jt-1">0 €</b></div>
            </div>
            <div class="jauges-liste">
                ${evts.map((e, i) => `
                <div class="jauge-ligne" data-k="${i}">
                    <div class="jauge-libelle">${e.libelle}${e.montant ? ` <span class="jauge-montant">${e.montant} €</span>` : ""}</div>
                    <div class="jauge-choix"><span>Résultat</span>${boutons(i, 0)}</div>
                    <div class="jauge-choix"><span>Caisse</span>${boutons(i, 1)}</div>
                </div>`).join("")}
            </div>
            <button class="btn" id="btn-ep">${acte.bouton || "Valider"}</button>
            ${acte.fiche ? Fiches.bouton(acte.fiche) : ""}`);
        const recalculer = () => [0, 1].forEach(axe => {
            const t = evts.reduce((s, e, i) => s + (choix[i][axe] || 0) * (Number(e.montant) || 0), 0);
            const el = document.getElementById("jt-" + axe);
            el.innerText = (t > 0 ? "+" : "") + t + " €";
            el.className = t < 0 ? "ko" : (t > 0 ? "ok" : "");
        });
        document.querySelectorAll(".jauge-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const i = Number(btn.dataset.i), axe = Number(btn.dataset.axe);
                choix[i][axe] = Number(btn.dataset.val);
                btn.parentElement.querySelectorAll(".jauge-btn").forEach(x => x.classList.toggle("actif", x === btn));
                btn.closest(".jauge-ligne").classList.remove("erreur-surlignee");
                recalculer();
            });
        });
        const b = document.getElementById("btn-ep");
        b.addEventListener("click", () => {
            if (choix.some(c => c[0] === null || c[1] === null)) {
                UI.setFeedback(`<span class="ko">Indique les deux effets (résultat et caisse) pour chaque événement.</span>`);
                return;
            }
            soumettre(choix, b);
        });
    },

    defs: {}
};

// Chapitre 1 : prologue puis épreuve ; les autres : fiche de chapitre puis épreuve.
Levels.defs[1] = function () { this.prologue(); };
for (let n = 2; n <= 15; n++) Levels.defs[n] = function () { this.ficheChapitre(n); };
