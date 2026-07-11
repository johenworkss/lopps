/**
 * MemorialLoopController
 * Main controller for the memorial loop experience
 */

class MemorialLoopController {
    constructor(contentManager, animationEngine, audioPlayer, settings) {
        this.contentManager = contentManager;
        this.animationEngine = animationEngine;
        this.audioPlayer = audioPlayer;
        this.settings = settings;
        this.stateManager = new LoopStateManager();
        
        this.currentItemIndex = 0;
        this.contentItems = [];
        this.loopInterval = null;
        this.currentTimeout = null;
        
        this.contentContainer = null;
        this.captionOverlay = null;
    }

    /**
     * Initialize the controller with DOM elements
     */
    initialize(contentContainer, captionOverlay) {
        this.contentContainer = contentContainer;
        this.captionOverlay = captionOverlay;
    }

    /**
     * Start the memorial loop
     * Preconditions:
     * - contentItems array is not empty
     * - UI is ready to display content
     * 
     * Postconditions:
     * - Loop state transitions to PLAYING
     * - First content item is displayed
     * - Timer is scheduled for infinite loop execution
     * - Audio player starts if enabled in settings
     */
    async startLoop() {
        try {
            // Load content
            this.contentItems = await this.contentManager.loadContent();

            if (this.contentItems.length === 0) {
                console.warn('No content to display');
                return false;
            }

            // Apply settings to engines
            this.animationEngine.setTransitionStyle(this.settings.transitionStyle);
            this.animationEngine.setTransitionDuration(this.settings.transitionDuration);

            // Set state to playing
            this.stateManager.setState(LoopState.PLAYING);

            // Display first item
            await this.displayContent(this.currentItemIndex);

            // Start audio if enabled
            if (this.settings.audioEnabled && this.settings.audioItem) {
                await this.audioPlayer.play(this.settings.audioItem);
            }

            // Schedule next transition
            this.scheduleNextTransition();

            return true;

        } catch (error) {
            console.error('Error starting loop:', error);
            this.stateManager.setState(LoopState.ERROR, error);
            throw error;
        }
    }

    /**
     * Pause the memorial loop
     */
    pauseLoop() {
        if (!this.stateManager.isPlaying()) {
            return;
        }

        // Clear scheduled transition
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // Pause audio
        if (this.settings.audioEnabled) {
            this.audioPlayer.pause();
        }

        // Set state to paused
        this.stateManager.setState(LoopState.PAUSED);
    }

    /**
     * Resume the memorial loop
     */
    async resumeLoop() {
        if (!this.stateManager.isPaused()) {
            return;
        }

        // Set state to playing
        this.stateManager.setState(LoopState.PLAYING);

        // Resume audio
        if (this.settings.audioEnabled) {
            await this.audioPlayer.resume();
        }

        // Schedule next transition
        this.scheduleNextTransition();
    }

    /**
     * Skip to next content item
     */
    async skipToNext() {
        const nextIndex = this.animationEngine.calculateNextItemIndex(
            this.currentItemIndex,
            this.contentItems.length
        );

        await this.transitionToItem(nextIndex);
    }

    /**
     * Skip to previous content item
     */
    async skipToPrevious() {
        const prevIndex = this.animationEngine.calculatePreviousItemIndex(
            this.currentItemIndex,
            this.contentItems.length
        );

        await this.transitionToItem(prevIndex);
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = newSettings;
        this.animationEngine.setTransitionStyle(newSettings.transitionStyle);
        this.animationEngine.setTransitionDuration(newSettings.transitionDuration);
    }

    /**
     * Schedule next transition
     */
    scheduleNextTransition() {
        if (!this.stateManager.isPlaying()) {
            return;
        }

        const currentItem = this.contentItems[this.currentItemIndex];
        const duration = currentItem.duration * 1000;

        this.currentTimeout = setTimeout(async () => {
            const nextIndex = this.animationEngine.calculateNextItemIndex(
                this.currentItemIndex,
                this.contentItems.length
            );

            await this.transitionToItem(nextIndex);
            
            // Schedule next if still playing
            if (this.stateManager.isPlaying()) {
                this.scheduleNextTransition();
            }
        }, duration);
    }

    /**
     * Transition to a specific item
     */
    async transitionToItem(toIndex) {
        if (toIndex < 0 || toIndex >= this.contentItems.length) {
            console.error('Invalid index:', toIndex);
            return;
        }

        // Clear current timeout
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // Set transitioning state
        this.stateManager.setState(LoopState.TRANSITIONING, {
            from: this.currentItemIndex,
            to: toIndex
        });

        // Get elements
        const currentElement = this.contentContainer.querySelector('.content-item.active');
        
        // Create new content element
        const newElement = await this.createContentElement(this.contentItems[toIndex]);
        this.contentContainer.appendChild(newElement);

        // Perform transition
        await this.animationEngine.performTransition(currentElement, newElement);

        // Update current index
        this.currentItemIndex = toIndex;

        // Update caption
        this.updateCaption(this.contentItems[toIndex]);

        // Restore playing state if was playing
        if (this.stateManager.isTransitioning()) {
            this.stateManager.setState(LoopState.PLAYING);
        }
    }

    /**
     * Display content at specific index
     */
    async displayContent(index) {
        if (index < 0 || index >= this.contentItems.length) {
            console.error('Invalid index:', index);
            return;
        }

        const item = this.contentItems[index];

        // Clear container
        this.contentContainer.innerHTML = '';

        // Create and add content element
        const element = await this.createContentElement(item);
        this.contentContainer.appendChild(element);

        // Make it active
        setTimeout(() => {
            element.classList.add('active');
        }, 50);

        // Update caption
        this.updateCaption(item);

        this.currentItemIndex = index;
    }

    /**
     * Create content element based on type
     */
    async createContentElement(item) {
        const element = document.createElement('div');
        element.className = 'content-item';
        element.dataset.contentId = item.id;

        switch (item.type) {
            case 'photo':
                element.innerHTML = `<img src="${item.data.imageData}" alt="Memorial photo">`;
                break;

            case 'quote':
                element.classList.add('text-content');
                element.innerHTML = `<div class="text-display">${this.escapeHtml(item.data.text)}</div>`;
                break;

            case 'video':
                element.innerHTML = `<video src="${item.data.videoUrl}" autoplay loop muted></video>`;
                break;

            case 'mixed':
                element.innerHTML = `
                    <div class="mixed-content">
                        <img src="${item.data.imageData}" alt="Background">
                        <div class="text-overlay">${this.escapeHtml(item.data.text)}</div>
                    </div>
                `;
                break;
        }

        return element;
    }

    /**
     * Update caption overlay
     */
    updateCaption(item) {
        if (item.caption) {
            this.captionOverlay.textContent = item.caption;
            this.captionOverlay.classList.add('visible');
        } else {
            this.captionOverlay.textContent = '';
            this.captionOverlay.classList.remove('visible');
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Stop the loop completely
     */
    async stopLoop() {
        // Clear timeout
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // Stop audio
        if (this.audioPlayer.getIsPlaying()) {
            await this.audioPlayer.stop();
        }

        // Set state to idle
        this.stateManager.setState(LoopState.IDLE);
    }

    /**
     * Get current state
     */
    getCurrentState() {
        return this.stateManager.getState();
    }

    /**
     * Reload content from storage
     */
    async reloadContent() {
        const wasPlaying = this.stateManager.isPlaying();
        
        if (wasPlaying) {
            await this.stopLoop();
        }

        this.contentItems = await this.contentManager.loadContent();

        if (wasPlaying && this.contentItems.length > 0) {
            await this.startLoop();
        }
    }
}
