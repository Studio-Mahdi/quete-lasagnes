const Sons = {
    // Effets sonores générés par WebAudio — aucun fichier externe.
    actif: true,
    ctx: null,

    _context() {
        if (!this.ctx) {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.ctx = this._ctx;
        }
        if (this.ctx.state === "suspended") this.ctx.resume();
        return this.ctx;
    },

    toggle() {
        this.actif = !this.actif;
        return this.actif;
    },

    _bip(freq, duree, type, volume, retard) {
        if (!this.actif) return;
        try {
            const ctx = this._context();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = ctx.currentTime + (retard || 0);
            osc.type = type || "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume || 0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duree);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + duree);
        } catch (e) { /* audio indisponible : silencieux */ }
    },

    succes() {
        this._bip(523, 0.15, "sine", 0.12);
        this._bip(659, 0.15, "sine", 0.12, 0.12);
        this._bip(784, 0.25, "sine", 0.12, 0.24);
    },

    erreur() {
        this._bip(220, 0.2, "sawtooth", 0.08);
        this._bip(180, 0.3, "sawtooth", 0.08, 0.15);
    },

    fanfare() {
        const notes = [523, 523, 523, 659, 784, 784, 1047];
        const temps = [0, 0.14, 0.28, 0.42, 0.62, 0.76, 0.95];
        notes.forEach((f, i) => this._bip(f, i === notes.length - 1 ? 0.5 : 0.16, "triangle", 0.14, temps[i]));
    },

    clic() {
        this._bip(700, 0.05, "sine", 0.05);
    },

    piece() {
        this._bip(988, 0.09, "square", 0.07);
        this._bip(1319, 0.12, "square", 0.07, 0.07);
    }
};
