/**
 * LoopState Enum
 * Represents the current state of the memorial loop
 */

const LoopState = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    TRANSITIONING: 'transitioning',
    ERROR: 'error'
};

/**
 * LoopStateManager
 * Manages state transitions and validation
 */
class LoopStateManager {
    constructor() {
        this.currentState = LoopState.IDLE;
        this.transitionData = null;
        this.errorData = null;
    }

    setState(newState, data = null) {
        const previousState = this.currentState;
        this.currentState = newState;

        if (newState === LoopState.TRANSITIONING) {
            this.transitionData = data; // { from: index, to: index }
        } else {
            this.transitionData = null;
        }

        if (newState === LoopState.ERROR) {
            this.errorData = data;
        } else {
            this.errorData = null;
        }

        console.log(`State transition: ${previousState} -> ${newState}`);
    }

    isPlaying() {
        return this.currentState === LoopState.PLAYING;
    }

    isPaused() {
        return this.currentState === LoopState.PAUSED;
    }

    isTransitioning() {
        return this.currentState === LoopState.TRANSITIONING;
    }

    isError() {
        return this.currentState === LoopState.ERROR;
    }

    getState() {
        return this.currentState;
    }
}
