/**
 * ContentStorage Service
 * Handles persistent storage of memorial content using localStorage
 */

class ContentStorage {
    constructor() {
        this.STORAGE_KEY_CONTENT = 'memorial_content';
        this.STORAGE_KEY_SETTINGS = 'memorial_settings';
    }

    /**
     * Save content array to localStorage
     */
    async saveContent(contentArray) {
        try {
            const jsonData = JSON.stringify(contentArray.map(item => item.toJSON()));
            localStorage.setItem(this.STORAGE_KEY_CONTENT, jsonData);
            return true;
        } catch (error) {
            console.error('Error saving content:', error);
            throw new Error('Failed to save content to storage');
        }
    }

    /**
     * Load content array from localStorage
     */
    async loadContent() {
        try {
            const jsonData = localStorage.getItem(this.STORAGE_KEY_CONTENT);
            if (!jsonData) {
                return [];
            }
            const parsedData = JSON.parse(jsonData);
            return parsedData.map(item => MemorialContent.fromJSON(item));
        } catch (error) {
            console.error('Error loading content:', error);
            throw new Error('Failed to load content from storage');
        }
    }

    /**
     * Save settings to localStorage
     */
    async saveSettings(settings) {
        try {
            const jsonData = JSON.stringify(settings.toJSON());
            localStorage.setItem(this.STORAGE_KEY_SETTINGS, jsonData);
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw new Error('Failed to save settings to storage');
        }
    }

    /**
     * Load settings from localStorage
     */
    async loadSettings() {
        try {
            const jsonData = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
            if (!jsonData) {
                return new LoopSettings();
            }
            const parsedData = JSON.parse(jsonData);
            return LoopSettings.fromJSON(parsedData);
        } catch (error) {
            console.error('Error loading settings:', error);
            return new LoopSettings();
        }
    }

    /**
     * Clear all stored data
     */
    async clearAll() {
        try {
            localStorage.removeItem(this.STORAGE_KEY_CONTENT);
            localStorage.removeItem(this.STORAGE_KEY_SETTINGS);
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw new Error('Failed to clear storage');
        }
    }

    /**
     * Check if this is first launch (no content stored)
     */
    isFirstLaunch() {
        return !localStorage.getItem(this.STORAGE_KEY_CONTENT);
    }
}
