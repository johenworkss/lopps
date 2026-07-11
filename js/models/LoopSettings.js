/**
 * LoopSettings Model
 * Stores user preferences for loop behavior
 */

class LoopSettings {
    constructor({
        defaultItemDuration = 5.0,
        transitionDuration = 1.0,
        transitionStyle = 'fade',
        audioEnabled = false,
        audioItem = null,
        autoStart = true,
        gesturesEnabled = true
    } = {}) {
        this.defaultItemDuration = this.validateDuration(defaultItemDuration, 1.0, 60.0);
        this.transitionDuration = this.validateDuration(transitionDuration, 0.5, 5.0);
        this.transitionStyle = ['fade', 'dissolve', 'slide', 'blur'].includes(transitionStyle) 
            ? transitionStyle 
            : 'fade';
        this.audioEnabled = audioEnabled;
        this.audioItem = audioItem;
        this.autoStart = autoStart;
        this.gesturesEnabled = gesturesEnabled;
    }

    validateDuration(value, min, max) {
        const duration = parseFloat(value);
        if (isNaN(duration)) return min;
        return Math.max(min, Math.min(max, duration));
    }

    toJSON() {
        return {
            defaultItemDuration: this.defaultItemDuration,
            transitionDuration: this.transitionDuration,
            transitionStyle: this.transitionStyle,
            audioEnabled: this.audioEnabled,
            audioItem: this.audioItem,
            autoStart: this.autoStart,
            gesturesEnabled: this.gesturesEnabled
        };
    }

    static fromJSON(json) {
        return new LoopSettings(json);
    }
}
