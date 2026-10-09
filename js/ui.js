const UI = {
    joueur: null,

    $(id) { return document.getElementById(id); },

    // Échappe un texte saisi par un élève (prénom, nom, promo, email) avant
    // de l'insérer dans du HTML : empêche l'exécution de code (XSS).
    esc(v) {
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    showScreen(name) {
        const screens = ["login-screen", "register-screen", "code-screen", "game-screen"];
        screens.forEach(id => { this.$(id).style.display = "none"; });
        const map = { login: "login-screen", register: "register-screen", code: "code-screen", game: "game-screen" };
        this.$(map[name]).style.display = "flex";
    },

    setLoginStatus(text) {
        this.$("login-error").innerText = text || "";
    },

    setLoginBusy(busy) {
        this.$("btn-login").disabled = busy;
        if (busy) this.setLoginStatus("Envoi du code en cours...");
    },

    setCodeStatus(text) {
        this.$("code-error").innerText = text || "";
    },

    setCodeBusy(busy) {
        this.$("btn-verify").disabled = busy;
        if (busy) this.setCodeStatus("");
    },

    updateStats(joueur) {
        this._animerNombre("val-pv", joueur.pv);
        this._animerNombre("val-treso", joueur.tresorerie);
        this._animerNombre("val-stock", joueur.stock);
        this.$("val-nom").innerText = joueur.prenom;
        this.$("val-rang").innerText = Story.rangPour(joueur.niveau);
        this.$("val-chapitre").innerText = `${Math.min(joueur.niveau, 15)}/15`;

        const reussies = Math.min(Math.max(joueur.niveau - 1, 0), 15);
        this.$("progress-fill").style.width = (reussies / 15 * 100) + "%";
        this.$("progress-label").innerText = `${reussies} épreuve${reussies > 1 ? "s" : ""} sur 15`;
    },

    _animerNombre(id, cible, suffixe) {
        const el = this.$(id);
        const depart = parseInt(el.innerText.replace(/[^\d-]/g, "")) || 0;
        if (depart === cible) { el.innerText = cible + (suffixe || ""); return; }
        const duree = 700;
        const debut = performance.now();
        const pas = (t) => {
            const p = Math.min((t - debut) / duree, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            el.innerText = Math.round(depart + (cible - depart) * ease) + (suffixe || "");
            if (p < 1) requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
    },

    certificat(joueur) {
        const gagne = Trophees.obtenir().length;
        const zone = document.createElement("div");
        zone.id = "certificat-overlay";
        zone.style.cssText = "position:fixed;inset:0;background:rgba(29,53,87,0.85);z-index:150;display:flex;justify-content:center;align-items:center;padding:20px;";
        zone.innerHTML = `
            <div id="certificat" style="background:#fffdf5;border:12px double #d4a017;border-radius:8px;padding:40px;max-width:560px;width:100%;text-align:center;font-family:'Georgia',serif;">
                <div style="font-size:2.6em;">🍝</div>
                <h2 style="color:#1d3557;margin:10px 0 4px;">La Quête des Lasagnes</h2>
                <p style="font-style:italic;color:#666;margin:0 0 18px;">Certificat de Maîtresse de Gestion Financière</p>
                <p>Ce certifie que</p>
                <p style="font-size:1.5em;font-weight:bold;color:#e63946;margin:6px 0;">${UI.esc(joueur.prenom)} ${UI.esc(joueur.nom)}</p>
                <p>a relevé les 15 épreuves de la trattoria :</p>
                <p style="font-size:0.9em;color:#444;line-height:1.7;">Capital · Charges fixes · Seuil de rentabilité · BFR · Amortissement · Bilan · TVA · Compte de résultat · Marge · Stocks · Provisions · Emprunt · Trésorerie · EBE · Analyse finale</p>
                <p>Trophées obtenus : <b>${gagne}/${Trophees.liste.length}</b> — Réputation : <b>${joueur.pv} PV</b></p>
                <p style="margin-top:18px;">« Tu as fait de l'argent <i>avec</i> ta passion, pas <i>contre</i> elle. »<br><span style="color:#666;">— Chef Luigi</span></p>
                <div style="margin-top:25px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                    <button class="btn" onclick="window.print()">🖨️ Imprimer</button>
                    <button class="btn choice" id="btn-certificat-close">Fermer</button>
                </div>
            </div>`;
        document.body.appendChild(zone);
        document.getElementById("btn-certificat-close").addEventListener("click", () => zone.remove());
    },

    // Bandeau de trophée : ne remplace pas l'écran en cours
    trophee(icone, titre, desc) {
        const b = document.createElement("div");
        b.className = "trophee-toast";
        b.innerHTML = `<i class="${icone}"></i><div><b>🏆 Trophée débloqué : ${titre}</b><div>${desc}</div></div>`;
        document.body.appendChild(b);
        Sons.fanfare();
        setTimeout(() => b.classList.add("visible"), 30);
        setTimeout(() => { b.classList.remove("visible"); setTimeout(() => b.remove(), 600); }, 5000);
    },

    majTrophees() {
        const nb = Trophees.obtenir().length;
        const el = this.$("nb-trophees");
        if (el) el.innerText = nb;
        const total = this.$("nb-trophees-total");
        if (total) total.innerText = Trophees.liste.length;
        return nb;
    },

    trophees() {
        const obtenus = Trophees.obtenir();
        let html = "";
        for (const t of Trophees.liste) {
            const ok = obtenus.includes(t.id);
            // nom réel révélé une fois gagné ; sinon un simple indice de style de jeu
            const n = ok ? Trophees.nom(t) : { titre: "???", desc: t.desc };
            html += `<div class="trophee-item ${ok ? "obtenu" : "verrouille"}">
                <i class="${ok ? t.icone : "fa-solid fa-lock"}"></i>
                <div><b>${n.titre}</b><div>${n.desc}</div></div>
            </div>`;
        }
        this.$("trophees-list").innerHTML = html;
        this.$("trophees-overlay").style.display = "flex";
    },

    // Export tableur de la progression (séparateur ; et BOM pour Excel en français)
    exporterCSV(etudiants) {
        const cellule = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
        const lignes = [["Email", "Prénom", "Nom", "Promo", "Chapitres réussis", "PV", "Trésorerie", "Trophées"]]
            .concat(etudiants.map(e => [e.email, e.prenom, e.nom, e.promo, Math.min(e.niveau - 1, 15), e.pv, e.treso, (e.trophees || []).length]));
        const csv = "\ufeff" + lignes.map(l => l.map(cellule).join(";")).join("\r\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        a.download = `quete-lasagnes-progression-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    },

    _optionsChapitre(choisi, vide) {
        let h = `<option value="0">${vide}</option>`;
        for (let n = 1; n <= 15; n++) h += `<option value="${n}" ${Number(choisi) === n ? "selected" : ""}>${n}</option>`;
        return h;
    },

    vueProf(data) {
        const { etudiants, statsParNiveau, resumePromos } = data;
        const idees = data.ideesFausses || {};
        const fmtDuree = (ms) => {
            if (!ms) return "—";
            const min = Math.round(ms / 60000);
            return min < 1 ? "<1 min" : min + " min";
        };
        let rowsEtudiants = etudiants.map((e, i) => `
            <tr class="prof-etudiant-row" data-email="${UI.esc(e.email)}" style="cursor:pointer;" title="Voir le détail">
                <td>${i + 1}</td>
                <td><b>${UI.esc(e.prenom)} ${UI.esc(e.nom)}</b> ${e.trophees && e.trophees.length ? `<span title="${e.trophees.length} trophée(s)">🏆 ${e.trophees.length}/${Trophees.liste.length}</span>` : ""}</td>
                <td>${UI.esc(e.promo) || "—"}</td>
                <td>Chap. ${Math.min(e.niveau, 15)}/15</td>
                <td>${e.pv} PV</td>
                <td>${UI.esc(e.treso)} €</td>
                <td><i class="fa-solid fa-chevron-right"></i></td>
            </tr>`).join("");

        // Résumé par promo
        let resumeHtml = "";
        if (resumePromos && Object.keys(resumePromos).length > 0) {
            resumeHtml = `<h3 style="color:var(--secondary);margin-top:20px;">Par promo</h3>
            <p class="subtitle prof-aide"><b>Séance</b> : dernier chapitre ouvert aux élèves (pour avancer ensemble). <b>Défi de classe</b> : chapitre que toute la promo doit réussir avant une date — les élèves voient la progression collective.</p>
            <table class="amort-table" id="prof-promos">
                <tr><th>Promo</th><th>Effectif</th><th>Niveau moyen</th><th>Meilleur</th><th>Séance : jusqu'au chap.</th><th>Défi : chap.</th><th>Défi : avant le</th><th></th></tr>
                ${Object.entries(resumePromos).map(([p, r]) => {
                    const g = r.reglages || {};
                    return p ? `
                <tr data-promo="${UI.esc(p)}">
                    <td><b>${UI.esc(p)}</b></td>
                    <td>${r.effectif}</td>
                    <td>${r.niveauMoyen}</td>
                    <td>${r.niveauMax}</td>
                    <td><select class="reglage-max">${this._optionsChapitre(g.max, "tous")}</select></td>
                    <td><select class="reglage-defi">${this._optionsChapitre(g.defiChapitre, "aucun")}</select></td>
                    <td><input type="date" class="reglage-date" value="${UI.esc(g.defiDate || "")}"></td>
                    <td><button class="btn btn-mini btn-reglage">Enregistrer</button></td>
                </tr>` : "";
                }).join("")}
            </table>`;
        }

        let rowsStats = "";
        for (let n = 1; n <= 15; n++) {
            const st = statsParNiveau[n];
            if (!st) continue;
            const alerte = st.tauxEchec >= 50 ? "ko" : (st.tauxEchec >= 25 ? "moyen" : "ok");
            rowsStats += `
            <tr>
                <td>Chap. ${n}</td>
                <td>${Story.etapes[n] ? Story.etapes[n].titre : ""}</td>
                <td>${st.victoires}</td>
                <td class="${alerte}">${st.tauxEchec} %</td>
                <td>${fmtDuree(st.dureeMedianeMs)}</td>
            </tr>`;
        }
        if (!rowsStats) rowsStats = "<tr><td colspan='5'>Pas encore de données. Elles apparaissent dès que les étudiants jouent.</td></tr>";

        // Idées fausses : l'erreur précise la plus fréquente, en % des élèves ayant atteint le chapitre
        let ideesHtml = "";
        for (let n = 1; n <= 15; n++) {
            const liste = idees[n];
            if (!liste || !liste.length) continue;
            const atteints = etudiants.filter(e => e.niveau >= n).length || 1;
            ideesHtml += `<div class="idee-chapitre"><b>Chap. ${n}${Story.etapes[n] ? " — " + Story.etapes[n].titre : ""}</b>
                ${liste.map(i => `<div class="idee-ligne"><span class="idee-pct">${Math.round(i.eleves * 100 / atteints)} %</span><span>${UI.esc(i.idee)}</span><span class="idee-nb">${i.eleves} élève${i.eleves > 1 ? "s" : ""}</span></div>`).join("")}
            </div>`;
        }
        if (!ideesHtml) ideesHtml = "<p class='subtitle'>Aucune erreur enregistrée pour l'instant.</p>";

        let zone = document.getElementById("prof-overlay");
        if (!zone) {
            zone = document.createElement("div");
            zone.id = "prof-overlay";
            zone.style.cssText = "position:fixed;inset:0;background:rgba(29,53,87,0.85);z-index:140;display:flex;justify-content:center;align-items:flex-start;padding:30px 15px;overflow-y:auto;";
            zone.innerHTML = `
                <div class="grimoire-panel" style="max-width:820px;">
                    <div class="grimoire-header">
                        <h2><i class="fa-solid fa-chalkboard-user"></i> Ma Classe — Vue Professeur</h2>
                        <button class="btn" id="btn-prof-close"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <p class="subtitle">Progression des étudiants et difficulté des chapitres (taux d'échec = signaux pédagogiques).</p>
                    ${resumeHtml}
                    <h3 style="color:var(--secondary);margin-top:20px;">Étudiants (${etudiants.length}) <button class="btn btn-mini" id="btn-export-csv"><i class="fa-solid fa-file-csv"></i> Exporter (CSV)</button></h3>
                    <table class="amort-table" id="prof-etudiants">
                        <tr><th>#</th><th>Étudiant</th><th>Promo</th><th>Progression</th><th>Réputation</th><th>Trésorerie</th></tr>
                        ${rowsEtudiants}
                    </table>
                    <h3 style="color:var(--secondary);margin-top:20px;">Idées fausses de la classe</h3>
                    <p class="subtitle prof-aide">L'erreur précise commise, chapitre par chapitre — de quoi cibler la reprise en cours.</p>
                    ${ideesHtml}
                    <h3 style="color:var(--secondary);margin-top:20px;">Analyse par chapitre</h3>
                    <table class="amort-table" id="prof-stats">
                        <tr><th>Chapitre</th><th>Notion</th><th>Victoires</th><th>Taux d'échec</th><th>Temps médian</th></tr>
                        ${rowsStats}
                    </table>
                </div>`;
            document.body.appendChild(zone);
            document.getElementById("btn-prof-close").addEventListener("click", () => zone.remove());
            document.getElementById("btn-export-csv").addEventListener("click", () => UI.exporterCSV(etudiants));
            zone.querySelectorAll(".btn-reglage").forEach(b => b.addEventListener("click", async () => {
                const tr = b.closest("tr");
                b.disabled = true;
                try {
                    await Api.reglerSeance(tr.dataset.promo, Number(tr.querySelector(".reglage-max").value),
                        Number(tr.querySelector(".reglage-defi").value), tr.querySelector(".reglage-date").value);
                    b.innerText = "Enregistré ✓";
                } catch (e) { b.innerText = "Erreur"; }
                setTimeout(() => { b.innerText = "Enregistrer"; b.disabled = false; }, 2000);
            }));
            zone.addEventListener("click", (e) => { if (e.target === zone) zone.remove(); });
            zone.querySelectorAll(".prof-etudiant-row").forEach(row => {
                row.addEventListener("click", async () => {
                    const email = row.dataset.email;
                    if (!email) return;
                    try {
                        const detail = await Api.studentDetail(email);
                        UI.ficheEleve(detail);
                    } catch (err) { console.error(err); }
                });
            });
        }
        zone.style.display = "flex";
    },

    ficheEleve(d) {
        const fmtDuree = (ms) => {
            if (!ms) return "—";
            const min = Math.round(ms / 60000);
            return min < 1 ? "<1 min" : min + " min";
        };
        let rows = "";
        for (let n = 1; n <= 15; n++) {
            const c = d.chapitres[n];
            const et = Story.etapes[n];
            rows += `
            <tr>
                <td>Chap. ${n}</td>
                <td>${et ? et.titre : ""}</td>
                <td>${c ? (c.victoires > 0 ? '<i class="fa-solid fa-check ok"></i>' : '<i class="fa-solid fa-hourglass-half" style="color:#999;"></i>') : "—"}</td>
                <td>${c ? c.echecs : "—"}</td>
                <td>${c ? c.gameOvers : "—"}</td>
                <td>${c ? fmtDuree(c.dureeMedianeMs) : "—"}</td>
            </tr>`;
        }
        const tropheesHtml = (d.trophees && d.trophees.length)
            ? d.trophees.map(t => {
                const tr = Trophees.liste.find(x => x.id === t);
                return tr ? `<span class="trophee-mini">${Trophees.nom(tr).titre}</span>` : "";
              }).join("")
            : "<em>Aucun trophée pour le moment</em>";

        let zone = document.createElement("div");
        zone.id = "eleve-overlay";
        zone.style.cssText = "position:fixed;inset:0;background:rgba(29,53,87,0.85);z-index:145;display:flex;justify-content:center;align-items:flex-start;padding:30px 15px;overflow-y:auto;";
        zone.innerHTML = `
            <div class="grimoire-panel" style="max-width:760px;">
                <div class="grimoire-header">
                    <h2><i class="fa-solid fa-user-graduate"></i> ${UI.esc(d.prenom)} ${UI.esc(d.nom)}</h2>
                    <button class="btn" id="btn-eleve-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <p class="subtitle">${d.promo ? "Promo " + UI.esc(d.promo) + " · " : ""}Chapitre ${Math.min(d.niveau, 15)}/15 · ${UI.esc(d.pv)} PV · ${UI.esc(d.treso)} €</p>
                <h3 style="color:var(--secondary);">Trophées (${(d.trophees || []).length}/${Trophees.liste.length})</h3>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">${tropheesHtml}</div>
                <h3 style="color:var(--secondary);margin-top:20px;">Parcours chapitre par chapitre</h3>
                <table class="amort-table">
                    <tr><th>Chap.</th><th>Notion</th><th>Terminé</th><th>Échecs</th><th>Game overs</th><th>Temps médian</th></tr>
                    ${rows}
                </table>
            </div>`;
        document.body.appendChild(zone);
        document.getElementById("btn-eleve-close").addEventListener("click", () => zone.remove());
        zone.addEventListener("click", (e) => { if (e.target === zone) zone.remove(); });
    },

    classement(liste, prenomSelf) {
        if (!liste || !liste.length) {
            this.$("classement-list").innerHTML = "<div class='error-msg'>Aucun joueur pour le moment.</div>";
        } else {
            this.$("classement-list").innerHTML = liste.map((j, i) => `
                <div class="classement-item ${j.prenom === prenomSelf ? "self" : ""}">
                    <span class="classement-rang">${i + 1}</span>
                    <b>${UI.esc(j.prenom)} ${UI.esc(j.nom)}</b>
                    <span class="classement-chapitre"><i class="fa-solid fa-map"></i> Chap. ${Math.min(j.niveau, 15)}/15</span>
                    <span class="classement-pv"><i class="fa-solid fa-heart"></i> ${j.pv}</span>
                </div>`).join("");
        }
        this.$("classement-overlay").style.display = "flex";
    },

    confettis() {
        const zone = document.createElement("div");
        zone.className = "confetti-zone";
        document.body.appendChild(zone);
        const couleurs = ["#e63946", "#f4a261", "#2a9d8f", "#e9c46a", "#1d3557"];
        for (let i = 0; i < 40; i++) {
            const c = document.createElement("i");
            c.className = "fa-solid fa-star confetti";
            c.style.left = (Math.random() * 100) + "%";
            c.style.color = couleurs[i % couleurs.length];
            c.style.fontSize = (10 + Math.random() * 14) + "px";
            c.style.animationDelay = (Math.random() * 0.4) + "s";
            c.style.animationDuration = (1.6 + Math.random() * 1.2) + "s";
            zone.appendChild(c);
        }
        setTimeout(() => zone.remove(), 3200);
    },

    setDialog(iconClass, name, text) {
        this.$("speaker-icon").innerHTML = `<i class="${iconClass}"></i>`;
        this.$("speaker-name").innerText = name;
        this.$("dialog-text").innerHTML = text;
    },

    setContent(html) {
        this.$("quest-content").innerHTML = html;
    },

    setFeedback(html) {
        this.$("feedback-msg").innerHTML = html;
    },

    feedbackOk(text) {
        this.setFeedback(`<span class="ok">${text}</span>`);
        Sons.succes();
    },

    feedbackKo(text) {
        this.setFeedback(`<span class="ko">${text}</span>`);
        Sons.erreur();
        if (this._onKo && typeof this._onKo === "function") this._onKo();
    },

    setOnKo(fn) {
        this._onKo = fn;
    },

    setSaveStatus(state) {
        const el = this.$("save-status");
        el.classList.remove("error");
        if (state === "pending") {
            el.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";
        } else if (state === "saved") {
            el.innerHTML = "<i class='fa-solid fa-check'></i>";
            setTimeout(() => { el.innerHTML = ""; }, 1500);
        } else if (state === "error") {
            el.classList.add("error");
            el.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i>";
            setTimeout(() => { el.innerHTML = ""; }, 2500);
        } else {
            el.innerHTML = "";
        }
    },

    casting() {
        const list = this.$("casting-list");
        let html = "";
        for (const [id, p] of Object.entries(Story.personnages)) {
            const classe = p.role.includes("Ennemi") ? "ennemi" : (p.role.includes("Boss") ? "boss" : "allie");
            html += `<div class="casting-item ${classe}">
                <i class="${p.icone}"></i>
                <div>
                    <b>${p.nom}</b> <span class="casting-role">${p.role}</span>
                    <div class="casting-desc">${p.desc}</div>
                </div>
            </div>`;
        }
        list.innerHTML = html;
        this.$("casting-overlay").style.display = "flex";
    },

    async grimoire(niveau) {
        const list = this.$("grimoire-list");
        // Les chapitres ne sont chargés qu'à la demande : après un rechargement de
        // page, les chapitres déjà réussis n'étaient pas en mémoire et le grimoire
        // affichait « en préparation ». On charge ceux qui manquent (déjà atteints).
        const manquants = [];
        for (let i = 1; i < Math.min(niveau, 16); i++) if (!Story.etapes[i]) manquants.push(i);
        if (manquants.length) {
            list.innerHTML = `<div class="grimoire-item"><i class="fa-solid fa-spinner fa-spin"></i><div>Chargement de tes compétences...</div></div>`;
            this.$("grimoire-overlay").style.display = "flex";
            await Promise.all(manquants.map(i => Api.chargerChapitre(i)
                .then(ch => Story.hydraterChapitre(i, ch))
                .catch(e => console.error(e))));
        }
        let html = "";
        for (let i = 1; i <= 15; i++) {
            const et = Story.etapes[i];
            if (!et && i >= niveau) {
                html += `<div class="grimoire-item locked"><i class="fa-solid fa-lock"></i><div><b>???</b><div>Compétence à débloquer au chapitre ${i}</div></div></div>`;
                continue;
            }
            if (i < niveau && et && et.competence) {
                html += `<div class="grimoire-item acquired">
                    <i class="${et.competence.icone}"></i>
                    <div><b>${et.competence.nom}</b><div>${et.competence.desc}</div></div>
                </div>`;
            } else if (i < niveau) {
                html += `<div class="grimoire-item locked"><i class="fa-solid fa-lock"></i><div><b>Chapitre ${i} maîtrisé</b><div>Compétence acquise</div></div></div>`;
            } else {
                html += `<div class="grimoire-item locked">
                    <i class="fa-solid fa-lock"></i>
                    <div><b>???</b><div>Compétence à débloquer au chapitre ${i}</div></div>
                </div>`;
            }
        }
        list.innerHTML = html;
        this.$("grimoire-overlay").style.display = "flex";
    }
};
