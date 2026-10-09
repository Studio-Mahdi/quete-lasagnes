const Bonus = {
    // Questions servies par l'API (uniquement les chapitres atteints).
    pvParBonneReponse: 10,

    async tirerQuiz(game) {
        try {
            const data = await Api._post({
                action: "quiz_bonus",
                email: Api._getEmail(),
                token: Api._getToken(),
                nb: 3
            });
            return data.questions || [];
        } catch (e) {
            return [];
        }
    },

    async lancer(game, apres) {
        const quiz = await this.tirerQuiz(game);
        if (!quiz.length) {
            UI.feedbackKo("Les épreuves bonus se débloquent après le chapitre 2.");
            return;
        }
        let gagne = 0;
        let index = 0;

        const afficher = () => {
            if (index >= quiz.length) {
                const total = gagne * this.pvParBonneReponse;
                if (total > 0) {
                    game.joueur.pv = Math.min(game.joueur.pv + total, 100);
                    game.updateStats();
                    game.save();
                }
                apres(total);
                return;
            }
            const q = quiz[index];
            UI.setContent(`
                <div class="embuche-box" style="border-color:var(--success);">
                    <div class="embuche-header" style="color:var(--success);"><i class="fa-solid fa-brain"></i> Épreuve bonus ${index + 1}/${quiz.length}</div>
                    <p style="font-size:1.1em;"><b>${q.q}</b></p>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${q.options.map((o, i) => `<button class="btn" data-i="${i}" style="text-align:left;">${o}</button>`).join("")}
                    </div>
                    <div class="feedback" id="bonus-fb"></div>
                </div>`);
            UI.setDialog("fa-solid fa-brain", "Chef Luigi", "Révise, Mia ! Chaque bonne réponse te rend 10 PV.");
            document.querySelectorAll(".embuche-box .btn").forEach(b => {
                b.addEventListener("click", () => {
                    const ok = Number(b.dataset.i) === q.bonne;
                    if (ok) gagne++;
                    document.getElementById("bonus-fb").innerHTML = ok
                        ? `<span class="ok">Exact ! ${q.explication} (+${this.pvParBonneReponse} PV)</span>`
                        : `<span class="ko">Raté... ${q.explication}</span>`;
                    document.querySelectorAll(".embuche-box .btn").forEach(x => x.disabled = true);
                    setTimeout(() => { index++; afficher(); }, 2400);
                });
            });
        };
        afficher();
    }
};
