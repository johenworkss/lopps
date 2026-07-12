// Memorial Loop App - Working Version with IndexedDB
let photos = [];
let currentIndex = 0;
let isPlaying = false;
let loopTimeout = null;
let db = null;

// Fixed settings - 3 seconds per photo, 1 second transition
const PHOTO_DURATION = 3; // seconds
const TRANSITION_DURATION = 1; // seconds

// iOS-style Toast Notification
function showToast(message, icon = '✓') {
    const existingToast = document.querySelector('.ios-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'ios-toast';
    toast.innerHTML = `
        <div class="ios-toast-icon">${icon}</div>
        <div>${message}</div>
    `;
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
        const request = indexedDB.open('MemorialDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('photos')) {
                db.createObjectStore('photos', { keyPath: 'id' });
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

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DB and load photos FIRST
    await initDB();
    await loadPhotos();
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // If we have photos, hide drop zone and start
    if (photos.length > 0) {
        dropZone.style.display = 'none';
        startLoop();
    }
    
    // Drag and drop on drop zone
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        handleFiles(files);
    });
    
    // Click drop zone to browse
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
        e.target.value = '';
    });
    
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
    
    // Fade out
    container.style.opacity = '0';
    container.style.transition = `opacity ${TRANSITION_DURATION}s ease-in-out`;
    
    setTimeout(() => {
        container.innerHTML = `<img src="${photo.data}" alt="Memorial photo">`;
        
        setTimeout(() => {
            container.style.opacity = '1';
        }, 50);
        
        if (isPlaying) {
            scheduleNext();
        }
    }, TRANSITION_DURATION * 1000);
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
