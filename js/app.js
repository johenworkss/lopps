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
        const request = indexedDB.open('MemorialDB', 2); // Increment version for music storage
        
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
        };
    });
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
        
        request.onsuccess = () => {
            photos = request.result || [];
            // Sort by ID to maintain order
            photos.sort((a, b) => a.id - b.id);
            console.log(`✓ Loaded ${photos.length} photos from IndexedDB`);
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
    
    // Initialize DB and load photos FIRST
    await initDB();
    await loadPhotos();
    await loadMusic(); // Load saved music if exists
    
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
        manageContentBtn.addEventListener('click', () => {
            renderLibrary();
            libraryModal.classList.remove('hidden');
            libraryModal.classList.add('visible');
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
    const startingPhotoCount = photos.length;
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Compress image to reduce size
            const img = new Image();
            img.onload = async () => {
                // Create canvas to compress
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Resize to max 1280x720 to save MORE space
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
                
                // Compress to JPEG with 70% quality for smaller size
                const compressedData = canvas.toDataURL('image/jpeg', 0.7);
                
                photos.push({
                    id: Date.now() + Math.random(),
                    data: compressedData
                });
                
                loaded++;
                
                // Update progress
                const percent = Math.round((loaded / totalFiles) * 100);
                progressBar.style.width = percent + '%';
                progressText.textContent = `Processing ${loaded} of ${totalFiles} photos...`;
                
                if (loaded === totalFiles) {
                    // Save to IndexedDB (no size limit!)
                    try {
                        await savePhotos();
                        progressText.textContent = `✓ Added ${totalFiles} photos!`;
                        
                        // Show iOS toast notification
                        const photosAdded = totalFiles;
                        const totalPhotos = photos.length;
                        if (startingPhotoCount > 0) {
                            // User added more photos to existing collection
                            showToast(`${photosAdded} photo${photosAdded > 1 ? 's' : ''} added • ${totalPhotos} total`, '✓');
                        } else {
                            // First photos added
                            showToast(`${photosAdded} photo${photosAdded > 1 ? 's' : ''} added`, '✓');
                        }
                    } catch (err) {
                        progressText.textContent = `⚠ Error saving photos`;
                        console.error(err);
                        showToast('Error saving photos', '⚠️');
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
                        if (startingPhotoCount === 0) {
                            startLoop();
                        } else if (isPlaying) {
                            // If already playing, continue playing
                            displayCurrentContent();
                        }
                    }, 1000);
                }
            };
            img.src = e.target.result;
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
    
    const photo = photos[currentIndex];
    if (!photo) return;
    
    // Update photo counter
    updatePhotoCounter();
    
    // Fade out
    container.style.opacity = '0';
    container.style.transition = `opacity ${TRANSITION_DURATION}s ease-in-out`;
    
    setTimeout(() => {
        const img = document.createElement('img');
        img.src = photo.data;
        img.alt = 'Memorial photo';
        img.style.objectFit = displayMode; // Apply display mode (contain or cover)
        
        container.innerHTML = '';
        container.appendChild(img);
        
        setTimeout(() => {
            container.style.opacity = '1';
        }, 50);
        
        if (isPlaying) {
            scheduleNext();
        }
    }, TRANSITION_DURATION * 1000);
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

function renderLibrary() {
    const list = document.getElementById('libraryList');
    if (!list) return;
    
    if (photos.length === 0) {
        list.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 40px;">No photos yet.</p>';
        return;
    }
    
    // Add count header with iOS style
    const countHeader = `<div style="padding: 12px 16px; background: rgba(0, 122, 255, 0.15); border: 0.5px solid rgba(0, 122, 255, 0.3); border-radius: 12px; margin-bottom: 12px; text-align: center;">
        <h3 style="font-size: 15px; font-weight: 600; letter-spacing: -0.2px;">📸 ${photos.length} Photos Loaded</h3>
    </div>`;
    
    list.innerHTML = countHeader + photos.map((photo, index) => `
        <div class="library-item">
            <div class="library-item-preview">
                <img src="${photo.data}" alt="Photo ${index + 1}">
            </div>
            <div class="library-item-info">
                <h4>Photo ${index + 1}</h4>
            </div>
            <div class="library-item-actions">
                <button class="icon-btn delete" onclick="deletePhoto(${index})" aria-label="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
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
