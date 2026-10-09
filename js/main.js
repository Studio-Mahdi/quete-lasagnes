const Game = {
    joueur: null,
    _pendingEmail: null,
    _pendingNames: {},

    init() {
        UI.$("btn-login").addEventListener("click", () => this.checkEmail());
        UI.$("email-input").addEventListener("keydown", e => {
            if (e.key === "Enter") this.checkEmail();
        });
        UI.$("btn-register").addEventListener("click", () => this.inscrire());
        UI.$("btn-verify").addEventListener("click", () => this.verifierCode());
        UI.$("code-input").addEventListener("keydown", e => {
            if (e.key === "Enter") this.verifierCode();
        });
        UI.$("btn-resend").addEventListener("click", () => this.renvoyerCode());
        // Boutons de la barre du haut (des <span>) : utilisables au clavier
        document.addEventListener("keydown", e => {
            if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("stat-action")) {
                e.preventDefault();
                e.target.click();
            }
        });
        this.tryResume();
    },

    async tryResume() {
        const session = Api.restoreSession();
        if (!session) return;
        UI.setLoginBusy(true);
        try {
            this.joueur = await Api.resume(session.email, session.token);
            this.lancerJeu();
        } catch (err) {
            Api.clearSession();
            UI.setLoginBusy(false);
            UI.setLoginStatus(err.message === "session_expired" ? this._errMessage(err) : "");
            return;
        }
        UI.setLoginBusy(false);
        UI.setLoginStatus("");
    },

    async checkEmail() {
        const email = UI.$("email-input").value.trim();
        const promo = UI.$("promo-login-input").value.trim();
        if (!this.isValidEmail(email)) {
            UI.setLoginStatus("Veuillez entrer une adresse email valide.");
            return;
        }
        if (!promo) {
            UI.setLoginStatus("Le code de votre promo est obligatoire (donné par votre enseignant).");
            return;
        }
        UI.setLoginBusy(true);
        try {
            this._pendingEmail = email;
            this._pendingNames = { prenom: "", nom: "", promo };
            const res = await Api.requestCode(email, "", "", promo);
            if (res.error) {
                // L'API refuse (promo inconnue, etc.) : l'erreur doit être visible.
                if (res.error === "new_student_needs_name") {
                    // Étudiant nouveau : on pré-remplit le champ promo de
                    // l'écran d'inscription avec celui déjà saisi.
                    UI.$("promo-input").value = promo;
                    UI.showScreen("register");
                    UI.setLoginStatus("");
                    return;
                }
                UI.setLoginStatus(this._errMessage({ message: res.error }));
                return;
            }
            if (res.nouveau) {
                UI.showScreen("register");
                UI.setLoginStatus("");
            } else {
                UI.showScreen("code");
            }
        } catch (err) {
            UI.setLoginStatus(this._errMessage(err));
            console.error(err);
        } finally {
            UI.setLoginBusy(false);
        }
    },

    async inscrire() {
        const prenom = UI.$("prenom-input").value.trim();
        const nom = UI.$("nom-input").value.trim();
        const promo = UI.$("promo-input").value.trim();
        if (!prenom || !nom) {
            UI.setLoginStatus("Veuillez remplir votre prénom et votre nom.");
            return;
        }
        if (!promo) {
            UI.setLoginStatus("Le code de votre promo est obligatoire (donné par votre enseignant).");
            return;
        }
        this._pendingNames = { prenom, nom, promo };
        await this.envoyerCode();
    },

    async renvoyerCode() {
        await this.envoyerCode(true);
    },

    async envoyerCode(estRenvoi) {
        UI.setCodeBusy(true);
        UI.setCodeStatus("Envoi du code...");
        try {
            const res = await Api.requestCode(
                this._pendingEmail,
                this._pendingNames.prenom,
                this._pendingNames.nom,
                this._pendingNames.promo
            );
            if (res.error === "too_soon") {
                UI.setCodeStatus(`Attendez ${res.attente}s avant de redemander un code.`);
                return;
            }
            if (res.error) {
                UI.setCodeStatus(this._errMessage(res));
                return;
            }
            UI.setCodeStatus("");
            UI.$("code-input").value = "";
            UI.showScreen("code");
            if (estRenvoi) UI.setCodeStatus("Nouveau code envoyé !");
        } catch (err) {
            UI.setCodeStatus(this._errMessage(err));
            console.error(err);
        } finally {
            UI.setCodeBusy(false);
        }
    },

    async verifierCode() {
        const code = UI.$("code-input").value.trim();
        if (!/^\d{6}$/.test(code)) {
            UI.setCodeStatus("Entrez les 6 chiffres reçus par email.");
            return;
        }
        UI.setCodeBusy(true);
        try {
            this.joueur = await Api.verifyCode(this._pendingEmail, code);
            this._pendingNames = {};
            this.lancerJeu();
        } catch (err) {
            const msg = this._errMessage(err);
            if (err.message === "code_invalid" && err.restant !== undefined) {
                UI.setCodeStatus(`${msg} Tentatives restantes : ${err.restant}.`);
            } else if (err.message === "code_expired" || err.message === "too_many_attempts") {
                UI.setCodeStatus(`${msg} Demandez un nouveau code.`);
            } else {
                UI.setCodeStatus(msg);
            }
            console.error(err);
        } finally {
            UI.setCodeBusy(false);
        }
    },

    async lancerJeu() {
        UI.showScreen("game");
        try {
            const meta = await Api.chargerMeta();
            Story.hydrater(meta);
        } catch (e) { console.error(e); }
        Levels.init(this);
        Carnet.init();
        document.getElementById("btn-deconnexion").addEventListener("click", async () => {
            if (!confirm("Se déconnecter ? Ta progression est enregistrée.")) return;
            await this.save();
            await Api.logout();
            location.reload();
        });
        this.updateStats();
        Levels.load(this.joueur.niveau);
    },

    updateStats() {
        if (this.historique && this.joueur.tresorerie < 0) this.historique.decouvert = true;
        UI.updateStats(this.joueur);
    },

    _cleHistorique() { return "ql_historique_" + ((this.joueur && this.joueur.email) || ""); },
    chargerHistorique() {
        try { return JSON.parse(localStorage.getItem(this._cleHistorique()) || "{}"); } catch (e) { return {}; }
    },

        async save() {
        try { localStorage.setItem(this._cleHistorique(), JSON.stringify(this.historique || {})); } catch (e) { /* pas de stockage */ }
        UI.setSaveStatus("pending");
        try {
            await Api.save(this.joueur);
            UI.setSaveStatus("saved");
        } catch (err) {
            UI.setSaveStatus("error");
            console.error(err);
        }
    },

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    _errMessage(err) {
        const map = {
            too_soon: "Un code a déjà été envoyé il y a moins de 30 secondes. Patience !",
            code_invalid: "Code incorrect.",
            code_expired: "Code expiré.",
            too_many_attempts: "Trop de tentatives.",
            invalid_email: "Adresse email invalide.",
            invalid_promo: "Code promo inconnu. Vérifiez le code donné par votre enseignant.",
            new_student_needs_name: "Indiquez votre prénom et votre nom.",
            http_0: "Erreur réseau : vérifiez votre connexion.",
            save_failed: "Sauvegarde impossible.",
            rate_limited: "Trop de demandes de code en ce moment. Réessayez dans quelques minutes.",
            mail_quota: "Le service d'envoi de codes est saturé pour aujourd'hui. Prévenez votre enseignant.",
            session_expired: "Session expirée (30 jours). Reconnectez-vous."
        };
        return map[err.message] || "Une erreur est survenue. Réessayez.";
    }
};

Game.init();
