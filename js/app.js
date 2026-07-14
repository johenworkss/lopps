// Memorial Loop App - Working Version with IndexedDB
let photos = [];
let currentIndex = 0;
let isPlaying = false;
let loopTimeout = null;
let db = null;

// Configurable settings - defaults
let PHOTO_DURATION = 3; // seconds
let TRANSITION_DURATION = 1; // seconds
let TRANSITION_EFFECT = 'fade'; // fade, slide, zoom, dissolve

// Background music
let audioElement = null;
let audioFileName = '';
let audioData = null;

// Display preferences
let displayMode = 'contain'; // 'contain' (fit) or 'cover' (fill)
let showCounter = true;

// Video preferences
let autoPlayVideos = true;
let loopVideos = true;

// Initialize Lottie Clock Animation
function initClockAnimation() {
    const clockContainer = document.getElementById('clockAnimation');
    if (clockContainer && typeof lottie !== 'undefined') {
        lottie.loadAnimation({
            container: clockContainer,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: 'icons/clock.json'
        });
    }
}

// iOS-style Toast Notification
function showToast(message, icon = '✓') {
    const existingToast = document.querySelector('.ios-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'ios-toast';
    
    // Check if it's a photo addition message (contains "photo" and "added")
    const isPhotoAddition = message.includes('photo') && message.includes('added');
    
    if (isPhotoAddition) {
        // Special styling for photo additions
        toast.classList.add('ios-toast-photo');
        toast.innerHTML = `
            <div class="ios-toast-content">
                <div class="ios-toast-icon-large">${icon}</div>
                <div class="ios-toast-text">
                    <div class="ios-toast-message">${message}</div>
                </div>
            </div>
        `;
    } else {
        // Standard toast
        toast.innerHTML = `
            <div class="ios-toast-icon">${icon}</div>
            <div>${message}</div>
        `;
    }
    
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

// iOS-style Action Sheet (for confirmations)
function showActionSheet(title, message, buttons) {
    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'ios-action-sheet-backdrop';

        const sheet = document.createElement('div');
        sheet.className = 'ios-action-sheet';

        const buttonsHTML = buttons.map((btn, index) => 
            `<button class="ios-action-sheet-button ${btn.style || ''}" data-index="${index}">${btn.text}</button>`
        ).join('');

        sheet.innerHTML = `
            <div class="ios-action-sheet-content">
                <div class="ios-action-sheet-header">
                    <div class="ios-action-sheet-title">${title}</div>
                    <div class="ios-action-sheet-message">${message}</div>
                </div>
                <div class="ios-action-sheet-buttons">
                    ${buttonsHTML}
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(sheet);

        setTimeout(() => {
            backdrop.classList.add('show');
            sheet.classList.add('show');
        }, 10);

        const closeSheet = (result) => {
            backdrop.classList.remove('show');
            sheet.classList.remove('show');
            setTimeout(() => {
                backdrop.remove();
                sheet.remove();
            }, 350);
            resolve(result);
        };

        backdrop.addEventListener('click', () => closeSheet(false));

        sheet.querySelectorAll('.ios-action-sheet-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const action = buttons[index].action;
                closeSheet(action ? action() : true);
            });
        });
    });
}

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MemorialDB', 4); // Increment version for background
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            
            // Create photos store if it doesn't exist
            if (!db.objectStoreNames.contains('photos')) {
                db.createObjectStore('photos', { keyPath: 'id' });
            }
            
            // Create music store if it doesn't exist
            if (!db.objectStoreNames.contains('music')) {
                db.createObjectStore('music', { keyPath: 'id' });
            }
            
            // Create presets store if it doesn't exist
            if (!db.objectStoreNames.contains('presets')) {
                db.createObjectStore('presets', { keyPath: 'id', autoIncrement: true });
            }
            
            // Create background store if it doesn't exist
            if (!db.objectStoreNames.contains('background')) {
                db.createObjectStore('background', { keyPath: 'id' });
            }
        };
    });
}

// Background Functions
const DEFAULT_BG = "url('icons/heaven.gif') center center / cover no-repeat";

async function saveBackground(dataUrl) {
    if (!db) await initDB();
    const transaction = db.transaction(['background'], 'readwrite');
    const store = transaction.objectStore('background');
    await store.clear();
    await store.add({ id: 'custom', dataUrl });
    applyBackground(dataUrl);
    showToast('Background updated!', '🎨');
}

async function loadBackground() {
    if (!db) await initDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(['background'], 'readonly');
        const store = transaction.objectStore('background');
        const request = store.get('custom');
        request.onsuccess = () => {
            resolve(request.result?.dataUrl || null);
        };
        request.onerror = () => resolve(null);
    });
}

function applyBackground(dataUrl) {
    const bgStyle = dataUrl 
        ? `url('${dataUrl}') center center / cover no-repeat` 
        : DEFAULT_BG;
    
    document.body.style.background = bgStyle;
    document.getElementById('dropZone').style.background = bgStyle;
    document.getElementById('bgPreview').style.background = bgStyle;
}

async function resetBackground() {
    const confirmed = await showActionSheet(
        'Reset Background',
        'Are you sure you want to reset to the default background?',
        [
            { text: 'Reset', style: 'destructive', action: () => true },
            { text: 'Cancel', style: 'cancel', action: () => false }
        ]
    );
    
    if (confirmed) {
        if (!db) await initDB();
        const transaction = db.transaction(['background'], 'readwrite');
        const store = transaction.objectStore('background');
        await store.clear();
        applyBackground(null);
        showToast('Background reset!', '✅');
    }
}

// Preset Functions
async function savePreset(name) {
    if (!db) await initDB();
    if (!name.trim()) {
        showToast('Please enter a preset name', '⚠️');
        return;
    }
    
    const preset = {
        name: name.trim(),
        order: photos.map(p => p.id),
        createdAt: new Date().toISOString()
    };
    
    const transaction = db.transaction(['presets'], 'readwrite');
    const store = transaction.objectStore('presets');
    await store.add(preset);
    
    showToast(`Preset "${name}" saved!`, '💾');
    renderPresets();
}

async function loadPresets() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['presets'], 'readonly');
        const store = transaction.objectStore('presets');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function applyPreset(preset) {
    // Reorder photos based on preset order
    const newOrder = [];
    for (const id of preset.order) {
        const item = photos.find(p => p.id === id);
        if (item) newOrder.push(item);
    }
    // Add any items not in the preset (in case items were added later)
    for (const item of photos) {
        if (!newOrder.find(p => p.id === item.id)) {
            newOrder.push(item);
        }
    }
    photos = newOrder;
    await savePhotos();
    renderLibrary();
    currentIndex = 0;
    displayCurrentContent();
    showToast(`Applied preset "${preset.name}"`, '✅');
}

async function deletePreset(presetId, presetName) {
    const confirmed = await showActionSheet(
        'Delete Preset',
        `Are you sure you want to delete "${presetName}"?`,
        [
            { text: 'Delete', style: 'destructive', action: () => true },
            { text: 'Cancel', style: 'cancel', action: () => false }
        ]
    );
    
    if (confirmed) {
        if (!db) await initDB();
        const transaction = db.transaction(['presets'], 'readwrite');
        const store = transaction.objectStore('presets');
        await store.delete(presetId);
        showToast('Preset deleted', '🗑️');
        renderPresets();
    }
}

async function renderPresets() {
    const container = document.getElementById('presetsContainer');
    if (!container) return;
    
    const presets = await loadPresets();
    if (presets.length === 0) {
        container.innerHTML = '<span style="opacity: 0.5; font-size: 13px;">No presets yet</span>';
        return;
    }
    
    container.innerHTML = presets.map(preset => `
        <div class="preset-btn" data-id="${preset.id}">
            <span onclick="applyPreset(${JSON.stringify(preset).replace(/"/g, '&quot;')})">${preset.name}</span>
            <span class="delete-preset" onclick="event.stopPropagation(); deletePreset(${preset.id}, '${preset.name.replace(/'/g, "\\'")}')">
                <i class="bi bi-x-lg" style="font-size: 0.625rem;"></i>
            </span>
        </div>
    `).join('');
}

// Save photos to IndexedDB
async function savePhotos() {
    if (!db) await initDB();
    
    const transaction = db.transaction(['photos'], 'readwrite');
    const store = transaction.objectStore('photos');
    
    // Clear existing photos first
    await store.clear();
    
    // Re-assign IDs based on current order to preserve shuffle
    for (let i = 0; i < photos.length; i++) {
        photos[i].id = i; // Sequential IDs preserve order
        await store.add(photos[i]);
    }
    
    console.log(`✓ Saved ${photos.length} photos to IndexedDB in current order`);
}

// Load photos from IndexedDB
async function loadPhotos() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const request = store.getAll();
        
        request.onsuccess = async () => {
            photos = request.result || [];
            // Ensure all items have a type (detect video from data URL if needed)
            photos = photos.map(item => ({
                ...item,
                type: item.type || (item.data && item.data.startsWith('data:video') ? 'video' : 'image')
            }));
            // Sort by ID to maintain order
            photos.sort((a, b) => a.id - b.id);
            console.log(`✓ Loaded ${photos.length} items from IndexedDB`);
            
            // Save updated items back to DB with type property
            await savePhotos();
            
            resolve(photos);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Save background music to IndexedDB
async function saveMusic(fileName, audioDataUrl) {
    if (!db) await initDB();
    
    const transaction = db.transaction(['music'], 'readwrite');
    const store = transaction.objectStore('music');
    
    // Clear existing music first
    await store.clear();
    
    // Save new music
    await store.add({
        id: 'background-music',
        fileName: fileName,
        data: audioDataUrl
    });
    
    console.log(`✓ Saved music: ${fileName}`);
}

// Load background music from IndexedDB
async function loadMusic() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['music'], 'readonly');
        const store = transaction.objectStore('music');
        const request = store.get('background-music');
        
        request.onsuccess = () => {
            const music = request.result;
            if (music) {
                console.log(`✓ Loaded music: ${music.fileName}`);
                audioFileName = music.fileName;
                audioData = music.data;
                initializeAudioPlayer(music.fileName, music.data);
            }
            resolve(music);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Remove background music from IndexedDB
async function removeMusic() {
    if (!db) await initDB();
    
    const transaction = db.transaction(['music'], 'readwrite');
    const store = transaction.objectStore('music');
    await store.clear();
    
    console.log('✓ Removed music');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize clock animation
    initClockAnimation();
    
    // Initialize DB and load everything
    await initDB();
    await loadPhotos();
    await loadMusic(); // Load saved music if exists
    const savedBg = await loadBackground(); // Load saved background
    if (savedBg) applyBackground(savedBg);
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const addPhotosBtn = document.getElementById('addPhotosBtn');
    
    // If we have photos, hide drop zone and start
    if (photos.length > 0) {
        dropZone.style.display = 'none';
        startLoop();
    }
    
    // Drag and drop on button area only
    if (addPhotosBtn) {
        addPhotosBtn.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addPhotosBtn.style.background = 'rgba(255, 255, 255, 0.3)';
            addPhotosBtn.style.transform = 'scale(1.05)';
        });
        
        addPhotosBtn.addEventListener('dragleave', (e) => {
            e.stopPropagation();
            addPhotosBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            addPhotosBtn.style.transform = 'scale(1)';
        });
        
        addPhotosBtn.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addPhotosBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            addPhotosBtn.style.transform = 'scale(1)';
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            handleFiles(files);
        });
        
        // Click button to browse
        addPhotosBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
        
        // Hover effect
        addPhotosBtn.addEventListener('mouseenter', () => {
            addPhotosBtn.style.background = 'rgba(255, 255, 255, 0.25)';
            addPhotosBtn.style.transform = 'scale(1.02)';
        });
        
        addPhotosBtn.addEventListener('mouseleave', () => {
            addPhotosBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            addPhotosBtn.style.transform = 'scale(1)';
        });
    }
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
        e.target.value = '';
    });
    
    // Display Mode Controls
    const displayModeBtns = document.querySelectorAll('.display-mode-btn');
    const displayModeDesc = document.getElementById('displayModeDesc');
    
    displayModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            displayMode = mode;
            
            // Update active state
            displayModeBtns.forEach(b => {
                b.style.background = 'rgba(255, 255, 255, 0.1)';
                b.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                b.classList.remove('active');
            });
            btn.style.background = 'rgba(0, 122, 255, 0.3)';
            btn.style.border = '1px solid rgba(0, 122, 255, 0.5)';
            btn.classList.add('active');
            
            // Update description
            if (mode === 'contain') {
                displayModeDesc.textContent = 'Shows full image with black bars if needed';
            } else {
                displayModeDesc.textContent = 'Fills entire screen, may crop edges';
            }
            
            // Apply to current image
            updateImageDisplay();
            
            showToast(`Display: ${mode === 'contain' ? 'Fit Screen' : 'Fill Screen'}`, '🖼️');
        });
    });
    
    // Photo Counter Toggle
    const showPhotoCounter = document.getElementById('showPhotoCounter');
    const photoCounter = document.getElementById('photoCounter');
    
    if (showPhotoCounter) {
        showPhotoCounter.addEventListener('change', (e) => {
            showCounter = e.target.checked;
            if (photoCounter) {
                photoCounter.style.display = showCounter ? 'block' : 'none';
            }
            showToast(`Counter: ${showCounter ? 'On' : 'Off'}`, showCounter ? '👁️' : '🚫');
        });
    }
    
    // Video Settings - Auto-play
    const autoPlayVideosToggle = document.getElementById('autoPlayVideos');
    if (autoPlayVideosToggle) {
        autoPlayVideosToggle.addEventListener('change', (e) => {
            autoPlayVideos = e.target.checked;
            showToast(`Auto-play videos: ${autoPlayVideos ? 'On' : 'Off'}`, autoPlayVideos ? '▶️' : '⏸️');
        });
    }
    
    // Video Settings - Loop
    const loopVideosToggle = document.getElementById('loopVideos');
    if (loopVideosToggle) {
        loopVideosToggle.addEventListener('change', (e) => {
            loopVideos = e.target.checked;
            showToast(`Loop videos: ${loopVideos ? 'On' : 'Off'}`, loopVideos ? '🔁' : '⏹️');
        });
    }
    
    // Background Settings
    const uploadBgBtn = document.getElementById('uploadBgBtn');
    const bgFileInput = document.getElementById('bgFileInput');
    const resetBgBtn = document.getElementById('resetBgBtn');
    
    if (uploadBgBtn) {
        uploadBgBtn.addEventListener('click', () => {
            bgFileInput.click();
        });
    }
    
    if (bgFileInput) {
        bgFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    await saveBackground(event.target.result);
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });
    }
    
    if (resetBgBtn) {
        resetBgBtn.addEventListener('click', resetBackground);
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettings = document.getElementById('closeSettings');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.remove('hidden');
            settingsPanel.classList.add('visible');
        });
    }
    
    if (closeSettings) {
        closeSettings.addEventListener('click', () => {
            settingsPanel.classList.remove('visible');
            setTimeout(() => settingsPanel.classList.add('hidden'), 300);
        });
    }
    
    // Add more photos button
    const addMoreBtn = document.getElementById('addMorePhotos');
    if (addMoreBtn) {
        addMoreBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // Clear all button
    const clearAllBtn = document.getElementById('clearAll');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            const result = await showActionSheet(
                'Clear All Photos',
                'This will permanently delete all photos from your memorial slideshow.',
                [
                    { 
                        text: 'Delete All Photos', 
                        style: 'destructive',
                        action: async () => {
                            // Clear the photos array
                            photos = [];
                            
                            // Clear IndexedDB
                            if (db) {
                                const transaction = db.transaction(['photos'], 'readwrite');
                                const store = transaction.objectStore('photos');
                                await store.clear();
                            }
                            
                            // Also clear old localStorage just in case
                            localStorage.clear();
                            
                            // Stop the loop
                            stopLoop();
                            
                            // Show drop zone again
                            const dropZone = document.getElementById('dropZone');
                            dropZone.style.display = 'flex';
                            dropZone.style.opacity = '1';
                            
                            // Clear the display
                            const container = document.getElementById('currentContent');
                            if (container) container.innerHTML = '';
                            
                            showToast('All photos deleted', '🗑️');
                            return true;
                        }
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        });
    }
    
    // Shuffle button
    const shuffleBtn = document.getElementById('shufflePhotos');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', async () => {
            try {
                if (photos.length > 1) {
                    console.log('Shuffling photos...');
                    await shufflePhotos();
                    console.log('Shuffle complete, restarting display...');
                    
                    if (isPlaying) {
                        stopLoop();
                        currentIndex = 0;
                        startLoop();
                    } else {
                        currentIndex = 0;
                        displayCurrentContent();
                    }
                    
                    showToast('Photos shuffled', '🔀');
                } else {
                    showToast('Need at least 2 photos to shuffle', '⚠️');
                }
            } catch (err) {
                console.error('Shuffle error:', err);
                showToast('Error shuffling photos', '⚠️');
            }
        });
    }
    
    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    showToast('Could not enter fullscreen', '⚠️');
                });
            } else {
                document.exitFullscreen();
            }
        });
    }
    
    // Settings sliders - REMOVED, using fixed 3 second duration
    
    // Control buttons
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePause);
    }
    
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', skipToPrevious);
    }
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', skipToNext);
    }
    
    // Click anywhere to pause/play
    const contentDisplay = document.getElementById('contentDisplay');
    if (contentDisplay) {
        contentDisplay.addEventListener('click', (e) => {
            if (!e.target.closest('.control-overlay') && !e.target.closest('.settings-btn')) {
                togglePause();
            }
        });
    }
    
    // Library
    const manageContentBtn = document.getElementById('manageContentBtn');
    const libraryModal = document.getElementById('libraryModal');
    const closeLibrary = document.getElementById('closeLibrary');
    const closeLibraryBtn = document.getElementById('closeLibraryBtn');
    
    if (manageContentBtn) {
        manageContentBtn.addEventListener('click', async () => {
            renderLibrary();
            await renderPresets();
            libraryModal.classList.remove('hidden');
            libraryModal.classList.add('visible');
        });
    }
    
    // Preset Save Button
    const savePresetBtn = document.getElementById('savePresetBtn');
    const presetNameInput = document.getElementById('presetNameInput');
    
    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', async () => {
            await savePreset(presetNameInput.value);
            presetNameInput.value = '';
        });
    }
    
    if (presetNameInput) {
        presetNameInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await savePreset(presetNameInput.value);
                presetNameInput.value = '';
            }
        });
    }
    
    if (closeLibrary) {
        closeLibrary.addEventListener('click', () => {
            libraryModal.classList.remove('visible');
            setTimeout(() => libraryModal.classList.add('hidden'), 300);
        });
    }
    
    if (closeLibraryBtn) {
        closeLibraryBtn.addEventListener('click', () => {
            libraryModal.classList.remove('visible');
            setTimeout(() => libraryModal.classList.add('hidden'), 300);
        });
    }
    
    // Speed control buttons
    const speedBtns = document.querySelectorAll('.speed-btn');
    speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const speed = parseInt(btn.dataset.speed);
            PHOTO_DURATION = speed;
            
            // Update active state
            speedBtns.forEach(b => {
                b.style.background = 'rgba(255, 255, 255, 0.1)';
                b.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                b.classList.remove('active');
            });
            btn.style.background = 'rgba(0, 122, 255, 0.3)';
            btn.style.border = '1px solid rgba(0, 122, 255, 0.5)';
            btn.classList.add('active');
            
            showToast(`Speed set to ${speed} second${speed > 1 ? 's' : ''}`, '⏱️');
            
            // Restart slideshow if playing
            if (isPlaying) {
                stopLoop();
                startLoop();
            }
        });
    });
    
    // Transition effect buttons
    const transitionBtns = document.querySelectorAll('.transition-btn');
    transitionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const transition = btn.dataset.transition;
            TRANSITION_EFFECT = transition;
            
            // Update active state
            transitionBtns.forEach(b => {
                b.style.background = 'rgba(255, 255, 255, 0.1)';
                b.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                b.classList.remove('active');
            });
            btn.style.background = 'rgba(0, 122, 255, 0.3)';
            btn.style.border = '1px solid rgba(0, 122, 255, 0.5)';
            btn.classList.add('active');
            
            const effectName = transition.charAt(0).toUpperCase() + transition.slice(1);
            showToast(`Transition: ${effectName}`, '✨');
        });
    });
    
    // Background Music Controls
    const uploadMusicBtn = document.getElementById('uploadMusicBtn');
    const musicFileInput = document.getElementById('musicFileInput');
    const musicPlayPauseBtn = document.getElementById('musicPlayPauseBtn');
    const removeMusicBtn = document.getElementById('removeMusicBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    if (uploadMusicBtn) {
        uploadMusicBtn.addEventListener('click', () => {
            musicFileInput.click();
        });
    }
    
    if (musicFileInput) {
        musicFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('audio/')) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const audioDataUrl = event.target.result;
                    await saveMusic(file.name, audioDataUrl);
                    audioFileName = file.name;
                    audioData = audioDataUrl;
                    initializeAudioPlayer(file.name, audioDataUrl);
                    showToast('Music uploaded', '🎵');
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });
    }
    
    if (musicPlayPauseBtn) {
        musicPlayPauseBtn.addEventListener('click', () => {
            if (audioElement) {
                if (audioElement.paused) {
                    audioElement.play();
                    document.getElementById('musicPlayIcon').classList.add('hidden');
                    document.getElementById('musicPauseIcon').classList.remove('hidden');
                } else {
                    audioElement.pause();
                    document.getElementById('musicPlayIcon').classList.remove('hidden');
                    document.getElementById('musicPauseIcon').classList.add('hidden');
                }
            }
        });
    }
    
    if (removeMusicBtn) {
        removeMusicBtn.addEventListener('click', async () => {
            const result = await showActionSheet(
                'Remove Music',
                'Are you sure you want to remove the background music?',
                [
                    {
                        text: 'Remove Music',
                        style: 'destructive',
                        action: async () => {
                            if (audioElement) {
                                audioElement.pause();
                                audioElement.src = '';
                                audioElement = null;
                            }
                            await removeMusic();
                            audioFileName = '';
                            audioData = null;
                            
                            document.getElementById('musicControls').style.display = 'none';
                            document.getElementById('uploadMusicBtn').style.display = 'flex';
                            
                            showToast('Music removed', '🗑️');
                            return true;
                        }
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        });
    }
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value;
            volumeValue.textContent = `${volume}%`;
            if (audioElement) {
                audioElement.volume = volume / 100;
            }
        });
    }
});

function handleFiles(files) {
    if (files.length === 0) return;
    
    // Show progress
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    progress.style.display = 'block';
    
    let loaded = 0;
    const totalFiles = files.length;
    const startingCount = photos.length;
    
    files.forEach((file, index) => {
        const isVideo = file.type.startsWith('video/');
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            if (isVideo) {
                // Handle video
                photos.push({
                    id: Date.now() + Math.random(),
                    data: e.target.result,
                    type: 'video'
                });
                loaded++;
                processNextFile();
            } else {
                // Handle image with compression
                const img = new Image();
                img.onload = async () => {
                    // Create canvas to compress
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Resize to max 1280x720 to save space
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 1280;
                    
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height / width) * maxSize;
                            width = maxSize;
                        } else {
                            width = (width / height) * maxSize;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG with 70% quality
                    const compressedData = canvas.toDataURL('image/jpeg', 0.7);
                    
                    photos.push({
                        id: Date.now() + Math.random(),
                        data: compressedData,
                        type: 'image'
                    });
                    
                    loaded++;
                    processNextFile();
                };
                img.src = e.target.result;
            }
        };
        
        const processNextFile = async () => {
            // Update progress
            const percent = Math.round((loaded / totalFiles) * 100);
            progressBar.style.width = percent + '%';
            progressText.textContent = `Processing ${loaded} of ${totalFiles} files...`;
            
            if (loaded === totalFiles) {
                // Save to IndexedDB
                try {
                    await savePhotos();
                    progressText.textContent = `✓ Added ${totalFiles} file${totalFiles > 1 ? 's' : ''}!`;
                    
                    // Show iOS toast notification
                    const itemsAdded = totalFiles;
                    const totalItems = photos.length;
                    if (startingCount > 0) {
                        showToast(`${itemsAdded} item${itemsAdded > 1 ? 's' : ''} added • ${totalItems} total`, '✓');
                    } else {
                        showToast(`${itemsAdded} item${itemsAdded > 1 ? 's' : ''} added`, '✓');
                    }
                } catch (err) {
                    progressText.textContent = `⚠ Error saving files`;
                    console.error(err);
                    showToast('Error saving files', '⚠️');
                }
                
                setTimeout(() => {
                    progress.style.display = 'none';
                    
                    // Hide drop zone if it's showing
                    const dropZone = document.getElementById('dropZone');
                    if (dropZone.style.display !== 'none') {
                        dropZone.style.opacity = '0';
                        setTimeout(() => {
                            dropZone.style.display = 'none';
                        }, 300);
                    }
                    
                    // Start if first photos or restart if already playing
                    if (startingCount === 0) {
                        startLoop();
                    } else if (isPlaying) {
                        displayCurrentContent();
                    }
                }, 1000);
            }
        };
        
        reader.readAsDataURL(file);
    });
}

// Remove old localStorage functions - using IndexedDB now


function startLoop() {
    if (photos.length === 0) return;
    
    isPlaying = true;
    currentIndex = 0;
    displayCurrentContent();
}

function stopLoop() {
    isPlaying = false;
    if (loopTimeout) {
        clearTimeout(loopTimeout);
        loopTimeout = null;
    }
}

function togglePause() {
    if (!isPlaying && photos.length > 0) {
        isPlaying = true;
        hideControls();
        scheduleNext();
        return;
    }
    
    if (isPlaying) {
        pauseLoop();
    } else {
        resumeLoop();
    }
}

function pauseLoop() {
    isPlaying = false;
    if (loopTimeout) {
        clearTimeout(loopTimeout);
        loopTimeout = null;
    }
    showControls();
}

function resumeLoop() {
    isPlaying = true;
    hideControls();
    scheduleNext();
}

function showControls() {
    const overlay = document.getElementById('controlOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('visible');
    }
}

function hideControls() {
    const overlay = document.getElementById('controlOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function skipToNext() {
    if (loopTimeout) clearTimeout(loopTimeout);
    currentIndex = (currentIndex + 1) % photos.length;
    displayCurrentContent();
}

function skipToPrevious() {
    if (loopTimeout) clearTimeout(loopTimeout);
    currentIndex = (currentIndex - 1 + photos.length) % photos.length;
    displayCurrentContent();
}

function displayCurrentContent() {
    const container = document.getElementById('currentContent');
    if (!container || photos.length === 0) return;
    
    const item = photos[currentIndex];
    if (!item) return;

    // Debug: log what type we're dealing with
    console.log('Displaying item:', { index: currentIndex, type: item.type, item, transition: TRANSITION_EFFECT });
    
    // Update photo counter
    updatePhotoCounter();
    
    // Clear any existing timeout to prevent conflicts
    if (loopTimeout) {
        clearTimeout(loopTimeout);
        loopTimeout = null;
    }
    
    // Reset any previous transition styles
    container.style.transform = '';
    container.style.filter = '';
    container.style.transition = '';
    
    // Apply transition out effect
    switch (TRANSITION_EFFECT) {
        case 'slide':
            container.style.transition = `transform ${TRANSITION_DURATION}s ease-in-out, opacity ${TRANSITION_DURATION}s ease-in-out`;
            container.style.transform = 'translateX(-100%)';
            container.style.opacity = '0';
            break;
        case 'zoom':
            container.style.transition = `transform ${TRANSITION_DURATION}s ease-in-out, opacity ${TRANSITION_DURATION}s ease-in-out`;
            container.style.transform = 'scale(0.8)';
            container.style.opacity = '0';
            break;
        case 'dissolve':
            container.style.transition = `opacity ${TRANSITION_DURATION}s linear`;
            container.style.opacity = '0';
            break;
        case 'fade':
        default:
            container.style.transition = `opacity ${TRANSITION_DURATION}s ease-in-out`;
            container.style.opacity = '0';
            break;
    }
    
    setTimeout(() => {
        container.innerHTML = '';
        
        // Reset transition styles for new content
        container.style.transform = '';
        container.style.filter = '';
        
        if (item.type === 'video') {
            // ================================================
            // VIDEO HANDLING
            // ================================================
            console.log('Displaying VIDEO');
            
            // Display video
            const video = document.createElement('video');
            video.src = item.data;
            video.style.objectFit = displayMode;
            video.controls = false;
            video.muted = true; // Muted by default for auto-play
            video.setAttribute('playsinline', ''); // For iOS
            
            if (loopVideos) {
                video.loop = true;
            }
            
            video.addEventListener('loadedmetadata', () => {
                // Apply transition in effect
                setTimeout(() => {
                    applyTransitionIn(container);
                }, 50);
                
                if (autoPlayVideos && isPlaying) {
                    video.play().catch(e => console.log('Video play prevented:', e));
                }
            });
            
            // Only auto-advance if video is NOT looping
            if (!loopVideos && isPlaying) {
                console.log('Video will auto-advance when ended');
                video.addEventListener('ended', () => {
                    console.log('Video ended, advancing');
                    scheduleNext();
                });
            } else {
                console.log('Video is looping, no auto-advance');
            }
            
            container.appendChild(video);
            
        } else {
            // ================================================
            // PHOTO HANDLING
            // ================================================
            console.log('Displaying PHOTO');
            
            // Display image
            const img = document.createElement('img');
            img.src = item.data;
            img.alt = 'Memorial photo';
            img.style.objectFit = displayMode;
            
            container.appendChild(img);
            
            // Apply transition in effect
            setTimeout(() => {
                applyTransitionIn(container);
            }, 50);
            
            if (isPlaying) {
                console.log('Scheduling next photo');
                scheduleNext();
            }
        }
    }, TRANSITION_DURATION * 1000);
}

function applyTransitionIn(container) {
    switch (TRANSITION_EFFECT) {
        case 'slide':
            container.style.transition = `transform ${TRANSITION_DURATION}s ease-in-out, opacity ${TRANSITION_DURATION}s ease-in-out`;
            container.style.transform = 'translateX(100%)';
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.transform = 'translateX(0)';
                container.style.opacity = '1';
            }, 50);
            break;
        case 'zoom':
            container.style.transition = `transform ${TRANSITION_DURATION}s ease-in-out, opacity ${TRANSITION_DURATION}s ease-in-out`;
            container.style.transform = 'scale(1.2)';
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.transform = 'scale(1)';
                container.style.opacity = '1';
            }, 50);
            break;
        case 'dissolve':
            container.style.transition = `opacity ${TRANSITION_DURATION}s linear`;
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.opacity = '1';
            }, 50);
            break;
        case 'fade':
        default:
            container.style.transition = `opacity ${TRANSITION_DURATION}s ease-in-out`;
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.opacity = '1';
            }, 50);
            break;
    }
}

// Update image display when mode changes
function updateImageDisplay() {
    const container = document.getElementById('currentContent');
    const img = container ? container.querySelector('img') : null;
    if (img) {
        img.style.objectFit = displayMode;
    }
}

// Update photo counter
function updatePhotoCounter() {
    const counterText = document.getElementById('photoCounterText');
    if (counterText && photos.length > 0) {
        counterText.textContent = `${currentIndex + 1} / ${photos.length}`;
    }
}

function scheduleNext() {
    if (loopTimeout) clearTimeout(loopTimeout);
    
    loopTimeout = setTimeout(() => {
        if (isPlaying) {
            currentIndex = (currentIndex + 1) % photos.length;
            displayCurrentContent();
        }
    }, PHOTO_DURATION * 1000);
}

let draggedIndex = null;

function renderLibrary() {
    const list = document.getElementById('libraryList');
    if (!list) return;
    
    // Ensure all items have type property
    photos = photos.map(item => ({
        ...item,
        type: item.type || (item.data && item.data.startsWith('data:video') ? 'video' : 'image')
    }));
    
    if (photos.length === 0) {
        list.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 40px;">No photos or videos yet.</p>';
        return;
    }
    
    // Count photos and videos
    const photoCount = photos.filter(p => p.type !== 'video').length;
    const videoCount = photos.filter(p => p.type === 'video').length;
    let countText = '';
    if (photoCount > 0 && videoCount > 0) {
        countText = `📸 ${photoCount} Photo${photoCount > 1 ? 's' : ''} • 📹 ${videoCount} Video${videoCount > 1 ? 's' : ''} • ↕️ Drag to reorder`;
    } else if (photoCount > 0) {
        countText = `📸 ${photoCount} Photo${photoCount > 1 ? 's' : ''} • ↕️ Drag to reorder`;
    } else {
        countText = `📹 ${videoCount} Video${videoCount > 1 ? 's' : ''} • ↕️ Drag to reorder`;
    }
    
    // Add count header with iOS style
    const countHeader = `<div style="padding: 12px 16px; background: rgba(0, 122, 255, 0.15); border: 0.5px solid rgba(0, 122, 255, 0.3); border-radius: 12px; margin-bottom: 12px; text-align: center;">
        <h3 style="font-size: 15px; font-weight: 600; letter-spacing: -0.2px;">${countText}</h3>
    </div>`;
    
    list.innerHTML = countHeader + photos.map((item, index) => {
        let previewHTML = '';
        if (item.type === 'video') {
            // For videos, use a <video> element
            previewHTML = `
                <video 
                    id="lib-video-${index}"
                    src="${item.data}" 
                    muted 
                    playsinline 
                    preload="auto"
                    style="width: 100%; height: 100%; object-fit: cover; background: #000;"
                ></video>`;
        } else {
            // For photos, use <img>
            previewHTML = `<img src="${item.data}" alt="Photo ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
        
        return `
        <div class="library-item" draggable="true" data-index="${index}">
            <div class="drag-handle">
                <i class="bi bi-grip-vertical" style="font-size: 1.125rem;"></i>
            </div>
            <div class="library-item-preview">
                ${previewHTML}
                ${item.type === 'video' ? '<div class="video-badge"><i class="bi bi-play-fill" style="font-size: 0.625rem;"></i> VIDEO</div>' : ''}
            </div>
            <div class="library-item-info">
                <h4>${item.type === 'video' ? 'Video' : 'Photo'} ${index + 1}</h4>
            </div>
            <div class="library-item-actions">
                <button class="icon-btn delete" onclick="deletePhoto(${index})" aria-label="Delete">
                    <i class="bi bi-trash" style="font-size: 1.125rem;"></i>
                </button>
            </div>
        </div>
    `}).join('');
    
    // Add drag and drop listeners
    const items = list.querySelectorAll('.library-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
    });
    
    // For videos, try to load a thumbnail
    photos.forEach((item, index) => {
        if (item.type === 'video') {
            const video = document.getElementById(`lib-video-${index}`);
            if (video) {
                video.addEventListener('loadeddata', () => {
                    // Try to seek to 0.5s for a clear frame
                    try {
                        video.currentTime = Math.min(0.5, video.duration || 0.5);
                    } catch (e) {
                        console.log('Could not seek video for thumbnail');
                    }
                });
                
                // Also try to load with a small play/pause to trigger frame display
                video.addEventListener('canplay', () => {
                    video.play().then(() => {
                        video.pause();
                        try {
                            video.currentTime = Math.min(0.5, video.duration || 0.5);
                        } catch (e) {}
                    }).catch(() => {});
                });
            }
        }
    });
}

function handleDragStart(e) {
    draggedIndex = parseInt(e.target.dataset.index);
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.library-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.library-item');
    if (item && item.dataset.index !== String(draggedIndex)) {
        item.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const item = e.target.closest('.library-item');
    if (item) {
        item.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.library-item');
    if (!targetItem) return;
    
    const targetIndex = parseInt(targetItem.dataset.index);
    if (targetIndex === draggedIndex) return;
    
    // Reorder the array
    const [removed] = photos.splice(draggedIndex, 1);
    photos.splice(targetIndex, 0, removed);
    
    // Save and re-render
    await savePhotos();
    renderLibrary();
    showToast('Order updated!', '🔄');
}

function deletePhoto(index) {
    showActionSheet(
        'Delete Photo',
        'Are you sure you want to remove this photo?',
        [
            {
                text: 'Delete Photo',
                style: 'destructive',
                action: () => {
                    photos.splice(index, 1);
                    savePhotos();
                    renderLibrary();
                    
                    if (photos.length === 0) {
                        stopLoop();
                        document.getElementById('dropZone').style.display = 'flex';
                        document.getElementById('dropZone').style.opacity = '1';
                    } else if (currentIndex >= photos.length) {
                        currentIndex = 0;
                        displayCurrentContent();
                    }
                    
                    showToast('Photo deleted', '🗑️');
                }
            },
            { text: 'Cancel', style: 'cancel' }
        ]
    );
}

async function shufflePhotos() {
    // Fisher-Yates shuffle algorithm
    for (let i = photos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [photos[i], photos[j]] = [photos[j], photos[i]];
    }
    await savePhotos();
}

// Initialize audio player UI
function initializeAudioPlayer(fileName, audioDataUrl) {
    // Create audio element if it doesn't exist
    if (!audioElement) {
        audioElement = new Audio();
        audioElement.loop = true;
        audioElement.volume = 0.7; // Default 70% volume
        
        // Update time display
        audioElement.addEventListener('timeupdate', updateMusicTime);
        audioElement.addEventListener('loadedmetadata', updateMusicTime);
    }
    
    audioElement.src = audioDataUrl;
    
    // Show controls, hide upload button
    document.getElementById('musicControls').style.display = 'block';
    document.getElementById('uploadMusicBtn').style.display = 'none';
    
    // Update file name display
    document.getElementById('musicFileName').textContent = fileName;
    
    // Reset play/pause icons
    document.getElementById('musicPlayIcon').classList.remove('hidden');
    document.getElementById('musicPauseIcon').classList.add('hidden');
}

// Update music time display
function updateMusicTime() {
    if (!audioElement) return;
    
    const current = audioElement.currentTime;
    const duration = audioElement.duration || 0;
    
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    const musicTime = document.getElementById('musicTime');
    if (musicTime) {
        musicTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }
}
