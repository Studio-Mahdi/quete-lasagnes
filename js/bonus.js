// Révision : les épreuves bonus (game over) et le défi du jour réutilisent le
// moteur d'épreuves. Questions servies sans solution, corrigées par le serveur,
// en privilégiant les notions où l'élève s'est déjà trompé.
const Bonus = {
    pvParBonneReponse: 10,
    recompenseDefi: 50,
    CLE_DEFI: "ql_defi_jour",

    // Affiche une question et renvoie (via suite) si elle est réussie
    _poser(q, entete, suite) {
        const acte = Object.assign({ dialogueIcone: "fa-solid fa-brain", dialogueNom: "Chef Luigi" }, q.acte);
        UI.setDialog(acte.dialogueIcone, acte.dialogueNom, acte.dialogueTexte || "");
        UI.setFeedback("");
        const moteur = { choix: Levels._moteurChoix, slider: Levels._moteurSlider, cartes: Levels._moteurCartes,
            saisie: Levels._moteurSaisie, jauges: Levels._moteurJauges }[acte.type] || Levels._moteurChoix;
        moteur.call(Levels, acte, async (reponse, bouton) => {
            if (bouton) bouton.disabled = true;
            let res;
            try { res = await Api.repondreBonus(q.cle, q.graine, reponse); }
            catch (e) { if (bouton) bouton.disabled = false; UI.setFeedback(`<span class="ko">Connexion perdue. Réessaie.</span>`); return; }
            document.querySelectorAll("#quest-content button, #quest-content input").forEach(x => x.disabled = true);
            if (res.ok) UI.feedbackOk(res.feedback || "Exact !");
            else {
                Carnet.noterErreur(q.chapitre, "Révision", res.autopsie);
                UI.setFeedback(`<span class="ko">${res.feedback || "Raté..."}</span>${res.autopsie ? `<div class="autopsie"><b><i class="fa-solid fa-magnifying-glass"></i> L'autopsie de Luigi</b><div>${res.autopsie}</div></div>` : ""}`);
                Sons.erreur();
            }
            Levels._boutonSuite(() => suite(!!res.ok));
        });
        const zone = document.getElementById("quest-content");
        zone.insertAdjacentHTML("afterbegin", `<div class="bonus-entete"><i class="fa-solid fa-brain"></i> ${entete}</div>`);
    },

    async lancer(game, apres) {
        let quiz = [];
        try {
            const data = await Api._post({ action: "quiz_bonus", email: Api._getEmail(), token: Api._getToken(), nb: 3 });
            quiz = data.questions || [];
        } catch (e) { quiz = []; }
        if (!quiz.length) {
            UI.feedbackKo("Les épreuves bonus se débloquent après le chapitre 1.");
            return;
        }
        let gagne = 0;
        const poser = (i) => {
            if (i >= quiz.length) {
                const total = gagne * this.pvParBonneReponse;
                if (total > 0) {
                    game.joueur.pv = Math.min(game.joueur.pv + total, 100);
                    game.updateStats();
                    game.save();
                }
                apres(total);
                return;
            }
            this._poser(quiz[i], `Épreuve bonus ${i + 1}/${quiz.length} — chaque réussite rend ${this.pvParBonneReponse} PV`, (ok) => {
                if (ok) gagne++;
                poser(i + 1);
            });
        };
        poser(0);
    },

    // ---------- Défi du jour ----------
    _aujourdhui() { return new Date().toISOString().slice(0, 10); },
    defiFait() {
        try { return localStorage.getItem(this.CLE_DEFI) === this._aujourdhui(); } catch (e) { return true; }
    },

    async defi(game, retour) {
        let data;
        try { data = await Api._post({ action: "defi", email: Api._getEmail(), token: Api._getToken() }); }
        catch (e) { UI.feedbackKo("Défi indisponible pour le moment."); return; }
        if (!data || !data.defi) { UI.feedbackKo("Le défi du jour se débloque après le chapitre 1."); return; }
        try { localStorage.setItem(this.CLE_DEFI, this._aujourdhui()); } catch (e) { /* pas de stockage */ }
        this._poser(data.defi, `Défi du jour — une seule tentative, +${this.recompenseDefi} € en caisse si tu réussis`, (ok) => {
            if (ok) {
                game.joueur.tresorerie += this.recompenseDefi;
                game.updateStats();
                game.save();
            }
            retour();
        });
    }
};
