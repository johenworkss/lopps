/**
 * MemorialContent Model
 * Represents a single content item in the memorial loop
 */

class MemorialContent {
    constructor({
        id = null,
        type = 'photo',
        data = null,
        duration = 5.0,
        caption = null,
        displayOrder = 0
    } = {}) {
        this.id = id || this.generateId();
        this.type = type; // 'photo', 'quote', 'video', 'mixed'
        this.data = data;
        this.duration = duration;
        this.caption = caption;
        this.displayOrder = displayOrder;
    }

    generateId() {
        return 'content_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Validate if the content has valid displayable data
     */
    isValid() {
        if (!this.data) return false;
        if (this.duration <= 0) return false;

        switch (this.type) {
            case 'photo':
                return this.data.imageData && this.data.imageData.length > 0;
            case 'quote':
                return this.data.text && this.data.text.trim().length > 0;
            case 'video':
                return this.data.videoUrl && this.data.videoUrl.length > 0;
            case 'mixed':
                return (this.data.imageData && this.data.imageData.length > 0) ||
                       (this.data.text && this.data.text.trim().length > 0);
            default:
                return false;
        }
    }

    /**
     * Convert to JSON for storage
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            data: this.data,
            duration: this.duration,
            caption: this.caption,
            displayOrder: this.displayOrder
        };
    }

    /**
     * Create from JSON
     */
    static fromJSON(json) {
        return new MemorialContent(json);
    }
}
