/**
 * AudioPlayer Service
 * Handles background audio playback
 */

class AudioPlayer {
    constructor() {
        this.audioElement = null;
        this.isPlaying = false;
        this.currentAudio = null;
        this.fadeInterval = null;
    }

    /**
     * Initialize audio element
     */
    initialize() {
        if (!this.audioElement) {
            this.audioElement = new Audio();
            this.audioElement.loop = true;
            this.audioElement.volume = 0;
        }
    }

    /**
     * Play audio file
     */
    async play(audioUrl) {
        try {
            this.initialize();

            if (this.audioElement.src !== audioUrl) {
                this.audioElement.src = audioUrl;
            }

            await this.audioElement.play();
            this.isPlaying = true;
            this.currentAudio = audioUrl;

            // Fade in
            await this.fadeIn(1.0);

        } catch (error) {
            console.error('Error playing audio:', error);
            throw error;
        }
    }

    /**
     * Pause audio
     */
    pause() {
        if (this.audioElement && this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
        }
    }

    /**
     * Resume audio
     */
    async resume() {
        if (this.audioElement && !this.isPlaying) {
            try {
                await this.audioElement.play();
                this.isPlaying = true;
                await this.fadeIn(1.0);
            } catch (error) {
                console.error('Error resuming audio:', error);
                throw error;
            }
        }
    }

    /**
     * Stop audio
     */
    async stop() {
        if (this.audioElement && this.isPlaying) {
            await this.fadeOut(1.0);
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.isPlaying = false;
        }
    }

    /**
     * Fade in audio over specified duration
     */
    async fadeIn(duration = 1.0) {
        return new Promise((resolve) => {
            if (!this.audioElement) {
                resolve();
                return;
            }

            const steps = 20;
            const stepDuration = (duration * 1000) / steps;
            const volumeStep = 1.0 / steps;
            let currentStep = 0;

            this.clearFadeInterval();

            this.fadeInterval = setInterval(() => {
                currentStep++;
                const newVolume = Math.min(1.0, currentStep * volumeStep);
                this.audioElement.volume = newVolume;

                if (currentStep >= steps) {
                    this.clearFadeInterval();
                    resolve();
                }
            }, stepDuration);
        });
    }

    /**
     * Fade out audio over specified duration
     */
    async fadeOut(duration = 1.0) {
        return new Promise((resolve) => {
            if (!this.audioElement) {
                resolve();
                return;
            }

            const steps = 20;
            const stepDuration = (duration * 1000) / steps;
            const startVolume = this.audioElement.volume;
            const volumeStep = startVolume / steps;
            let currentStep = 0;

            this.clearFadeInterval();

            this.fadeInterval = setInterval(() => {
                currentStep++;
                const newVolume = Math.max(0, startVolume - (currentStep * volumeStep));
                this.audioElement.volume = newVolume;

                if (currentStep >= steps) {
                    this.clearFadeInterval();
                    resolve();
                }
            }, stepDuration);
        });
    }

    /**
     * Clear fade interval
     */
    clearFadeInterval() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
    }

    /**
     * Set volume (0.0 to 1.0)
     */
    setVolume(volume) {
        if (this.audioElement) {
            this.audioElement.volume = Math.max(0, Math.min(1.0, volume));
        }
    }

    /**
     * Get current playing state
     */
    getIsPlaying() {
        return this.isPlaying;
    }
}
