/**
 * ContentManager Service
 * Manages memorial content CRUD operations
 */

class ContentManager {
    constructor(storage) {
        this.storage = storage;
        this.contentItems = [];
    }

    /**
     * Load all content from storage
     */
    async loadContent() {
        try {
            this.contentItems = await this.storage.loadContent();
            // Sort by display order
            this.contentItems.sort((a, b) => a.displayOrder - b.displayOrder);
            return this.contentItems;
        } catch (error) {
            console.error('Error loading content:', error);
            throw error;
        }
    }

    /**
     * Add new content item
     */
    async addContent(contentItem) {
        try {
            // Validate content
            if (!contentItem.isValid()) {
                throw new Error('Invalid content item');
            }

            // Set display order as last item
            contentItem.displayOrder = this.contentItems.length;

            // Add to array
            this.contentItems.push(contentItem);

            // Save to storage
            await this.storage.saveContent(this.contentItems);

            return contentItem;
        } catch (error) {
            console.error('Error adding content:', error);
            throw error;
        }
    }

    /**
     * Remove content item at index
     */
    async removeContent(index) {
        try {
            if (index < 0 || index >= this.contentItems.length) {
                throw new Error('Invalid index');
            }

            // Remove item
            this.contentItems.splice(index, 1);

            // Update display orders
            this.contentItems.forEach((item, idx) => {
                item.displayOrder = idx;
            });

            // Save to storage
            await this.storage.saveContent(this.contentItems);

            return true;
        } catch (error) {
            console.error('Error removing content:', error);
            throw error;
        }
    }

    /**
     * Reorder content item from one index to another
     */
    async reorderContent(fromIndex, toIndex) {
        try {
            if (fromIndex < 0 || fromIndex >= this.contentItems.length ||
                toIndex < 0 || toIndex >= this.contentItems.length) {
                throw new Error('Invalid indices');
            }

            // Move item
            const item = this.contentItems.splice(fromIndex, 1)[0];
            this.contentItems.splice(toIndex, 0, item);

            // Update display orders
            this.contentItems.forEach((item, idx) => {
                item.displayOrder = idx;
            });

            // Save to storage
            await this.storage.saveContent(this.contentItems);

            return true;
        } catch (error) {
            console.error('Error reordering content:', error);
            throw error;
        }
    }

    /**
     * Save current content order
     */
    async saveContentOrder() {
        try {
            await this.storage.saveContent(this.contentItems);
            return true;
        } catch (error) {
            console.error('Error saving content order:', error);
            throw error;
        }
    }

    /**
     * Get all content items
     */
    getContent() {
        return this.contentItems;
    }

    /**
     * Get content item by ID
     */
    getContentById(id) {
        return this.contentItems.find(item => item.id === id);
    }

    /**
     * Get content item by index
     */
    getContentByIndex(index) {
        if (index < 0 || index >= this.contentItems.length) {
            return null;
        }
        return this.contentItems[index];
    }

    /**
     * Get total content count
     */
    getContentCount() {
        return this.contentItems.length;
    }
}
