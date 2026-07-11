/**
 * AnimationEngine Service
 * Handles transitions and animations between content items
 */

class AnimationEngine {
    constructor() {
        this.transitionStyle = 'fade';
        this.transitionDuration = 1.0;
    }

    /**
     * Set transition style
     */
    setTransitionStyle(style) {
        if (['fade', 'dissolve', 'slide', 'blur'].includes(style)) {
            this.transitionStyle = style;
        }
    }

    /**
     * Set transition duration
     */
    setTransitionDuration(duration) {
        this.transitionDuration = Math.max(0.5, Math.min(5.0, duration));
    }

    /**
     * Calculate next item index (with wraparound)
     * Preconditions:
     * - current is valid index: 0 <= current < total
     * - total is positive: total > 0
     * 
     * Postconditions:
     * - Returns next valid index in sequence
     * - If current == total - 1, returns 0 (wraps to beginning)
     * - Otherwise, returns current + 1
     * - Return value satisfies: 0 <= returnValue < total
     */
    calculateNextItemIndex(current, total) {
        if (total <= 0) {
            throw new Error('Total must be positive');
        }
        if (current < 0 || current >= total) {
            throw new Error('Current index out of bounds');
        }

        return (current + 1) % total;
    }

    /**
     * Calculate previous item index (with wraparound)
     */
    calculatePreviousItemIndex(current, total) {
        if (total <= 0) {
            throw new Error('Total must be positive');
        }
        if (current < 0 || current >= total) {
            throw new Error('Current index out of bounds');
        }

        return (current - 1 + total) % total;
    }

    /**
     * Perform transition between two content items
     * Returns a promise that resolves when transition is complete
     */
    async performTransition(fromElement, toElement) {
        if (!toElement) {
            return;
        }

        // Set transition properties
        const durationMs = this.transitionDuration * 1000;
        
        switch (this.transitionStyle) {
            case 'fade':
                await this.fadeTransition(fromElement, toElement, durationMs);
                break;
            case 'dissolve':
                await this.dissolveTransition(fromElement, toElement, durationMs);
                break;
            case 'slide':
                await this.slideTransition(fromElement, toElement, durationMs);
                break;
            case 'blur':
                await this.blurTransition(fromElement, toElement, durationMs);
                break;
            default:
                await this.fadeTransition(fromElement, toElement, durationMs);
        }
    }

    /**
     * Fade transition
     */
    async fadeTransition(fromElement, toElement, durationMs) {
        return new Promise((resolve) => {
            // Set transition on both elements
            if (fromElement) {
                fromElement.style.transition = `opacity ${durationMs}ms ease-in-out`;
                fromElement.style.opacity = '0';
            }

            toElement.style.transition = `opacity ${durationMs}ms ease-in-out`;
            toElement.style.opacity = '0';
            toElement.classList.add('active');

            // Force reflow
            toElement.offsetHeight;

            // Fade in new element
            toElement.style.opacity = '1';

            setTimeout(() => {
                if (fromElement) {
                    fromElement.classList.remove('active');
                    fromElement.style.transition = '';
                }
                toElement.style.transition = '';
                resolve();
            }, durationMs);
        });
    }

    /**
     * Dissolve transition (linear opacity change)
     */
    async dissolveTransition(fromElement, toElement, durationMs) {
        return new Promise((resolve) => {
            if (fromElement) {
                fromElement.style.transition = `opacity ${durationMs}ms linear`;
                fromElement.style.opacity = '0';
            }

            toElement.style.transition = `opacity ${durationMs}ms linear`;
            toElement.style.opacity = '0';
            toElement.classList.add('active');

            toElement.offsetHeight;

            toElement.style.opacity = '1';

            setTimeout(() => {
                if (fromElement) {
                    fromElement.classList.remove('active');
                    fromElement.style.transition = '';
                }
                toElement.style.transition = '';
                resolve();
            }, durationMs);
        });
    }

    /**
     * Slide transition
     */
    async slideTransition(fromElement, toElement, durationMs) {
        return new Promise((resolve) => {
            if (fromElement) {
                fromElement.style.transition = `transform ${durationMs}ms ease-in-out, opacity ${durationMs}ms ease-in-out`;
                fromElement.style.transform = 'translateX(-100%)';
                fromElement.style.opacity = '0';
            }

            toElement.style.transition = `transform ${durationMs}ms ease-in-out, opacity ${durationMs}ms ease-in-out`;
            toElement.style.transform = 'translateX(100%)';
            toElement.style.opacity = '1';
            toElement.classList.add('active');

            toElement.offsetHeight;

            toElement.style.transform = 'translateX(0)';

            setTimeout(() => {
                if (fromElement) {
                    fromElement.classList.remove('active');
                    fromElement.style.transition = '';
                    fromElement.style.transform = '';
                }
                toElement.style.transition = '';
                resolve();
            }, durationMs);
        });
    }

    /**
     * Blur transition
     */
    async blurTransition(fromElement, toElement, durationMs) {
        return new Promise((resolve) => {
            const halfDuration = durationMs / 2;

            if (fromElement) {
                fromElement.style.transition = `filter ${halfDuration}ms ease-in`;
                fromElement.style.filter = 'blur(20px)';
            }

            setTimeout(() => {
                if (fromElement) {
                    fromElement.classList.remove('active');
                    fromElement.style.filter = '';
                }

                toElement.style.filter = 'blur(20px)';
                toElement.style.opacity = '1';
                toElement.classList.add('active');
                toElement.style.transition = `filter ${halfDuration}ms ease-out`;

                toElement.offsetHeight;

                toElement.style.filter = 'blur(0px)';

                setTimeout(() => {
                    if (fromElement) {
                        fromElement.style.transition = '';
                    }
                    toElement.style.transition = '';
                    toElement.style.filter = '';
                    resolve();
                }, halfDuration);
            }, halfDuration);
        });
    }
}
