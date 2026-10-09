const URL_API = "https://script.google.com/macros/s/AKfycbxG9gwedkxsh6I17eDuivXcktRD6Doqjk8TX0oNsj5SqgH86X15lkpsR4K4jsuT6YUQCA/exec";
const TOKEN_KEY = "ql_token";
const EMAIL_KEY = "ql_email";

const Api = {
    async requestCode(email, prenom, nom, promo) {
        return this._post({ action: "request_code", email, prenom, nom, promo });
    },

    async verifyCode(email, code) {
        const data = await this._post({ action: "verify_code", email, code });
        if (data.error) {
            const err = new Error(data.error);
            err.restant = data.restant;
            throw err;
        }
        this._storeSession(data);
        return data;
    },

    async resume(email, token) {
        const data = await this._post({ action: "resume", email, token });
        if (data.error) throw new Error(data.error);
        // ancien jeton converti par le serveur en jeton signé
        if (data.token && data.token !== token) this._storeSession(data);
        return data;
    },

    async logout() {
        try { await this._post({ action: "logout", email: this._getEmail(), token: this._getToken() }); }
        finally { this.clearSession(); }
    },

    async track(type, niveau, donnees) {
        try {
            await this._post({ action: "track", email: this._getEmail(), token: this._getToken(), type, niveau, donnees });
        } catch (e) { console.error(e); }
    },

    async classProgress() {
        const data = await this._post({ action: "class_progress", email: this._getEmail(), token: this._getToken() });
        if (data.error) throw new Error(data.error);
        return data;
    },

    async classement() {
        const data = await this._post({ action: "leaderboard", email: this._getEmail(), token: this._getToken() });
        if (data.error) throw new Error(data.error);
        return data.classement;
    },

    async save(joueur) {
        const data = await this._post({
            action: "save",
            email: joueur.email,
            token: this._getToken(),
            niveau: joueur.niveau,
            pv: joueur.pv,
            treso: joueur.tresorerie,
            stock: joueur.stock,
            trophees: (typeof Trophees !== "undefined") ? Trophees.obtenir() : []
        });
        if (!data.success) throw new Error(data.error || "save_failed");
        return true;
    },

    async chargerMeta() {
        const data = await this._post({ action: "contenu_meta", email: this._getEmail(), token: this._getToken() });
        if (data.error) throw new Error(data.error);
        return data;
    },

    async chargerChapitre(niveau) {
        const data = await this._post({ action: "contenu_chapitre", email: this._getEmail(), token: this._getToken(), niveau });
        if (data.error) throw new Error(data.error);
        return data.chapitre;
    },

    async chargerFiche(cle) {
        const data = await this._post({ action: "contenu_fiche", email: this._getEmail(), token: this._getToken(), cle });
        if (data.error) throw new Error(data.error);
        return data.fiche;
    },

    async repondre(niveau, acte, reponse) {
        const data = await this._post({ action: "repondre", email: this._getEmail(), token: this._getToken(), niveau, acte, reponse });
        if (data.error) throw new Error(data.error);
        return data;
    },

    async reglerSeance(promo, max, defiChapitre, defiDate) {
        const data = await this._post({ action: "seance", email: this._getEmail(), token: this._getToken(), promo, max, defiChapitre, defiDate });
        if (data.error) throw new Error(data.error);
        return data;
    },

    async repondreBonus(cle, graine, reponse) {
        const data = await this._post({ action: "repondre_bonus", email: this._getEmail(), token: this._getToken(), cle, graine, reponse });
        if (data.error) throw new Error(data.error);
        return data;
    },

    async studentDetail(emailEleve) {
        const data = await this._post({
            action: "student_detail",
            email: this._getEmail(),
            token: this._getToken(),
            emailEleve
        });
        if (data.error) throw new Error(data.error);
        return data;
    },

    restoreSession() {
        const token = localStorage.getItem(TOKEN_KEY);
        const email = localStorage.getItem(EMAIL_KEY);
        return token && email ? { token, email } : null;
    },

    clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
    },

    _getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    _getEmail() {
        return localStorage.getItem(EMAIL_KEY);
    },

    _storeSession(joueur) {
        localStorage.setItem(TOKEN_KEY, joueur.token);
        localStorage.setItem(EMAIL_KEY, joueur.email);
    },

    // Délai maximal d'une requête : sans lui, une réponse perdue (réseau, Apps Script
    // qui ne répond pas) laissait le bouton désactivé pour toujours, sans message.
    DELAI_MS: 25000,

    async _post(params) {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const minuteur = ctrl ? setTimeout(() => ctrl.abort(), this.DELAI_MS) : null;
        try {
            const res = await fetch(URL_API, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(params),
                signal: ctrl ? ctrl.signal : undefined
            });
            if (!res.ok) throw new Error(`http_${res.status}`);
            return await res.json();
        } catch (e) {
            if (e.name === "AbortError") throw new Error("http_0");
            throw e;
        } finally {
            if (minuteur) clearTimeout(minuteur);
        }
    }
};
