// Memorial Loop App - Working Version with IndexedDB
let photos = [];
let currentIndex = 0;
let isPlaying = false;
let loopTimeout = null;
let db = null;

// Fixed settings - 3 seconds per photo, 1 second transition
const PHOTO_DURATION = 3; // seconds
const TRANSITION_DURATION = 1; // seconds

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
            if (confirm('Delete all photos? This cannot be undone!')) {
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
                
                alert('✓ All photos deleted!');
            }
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
                    
                    alert('Photos shuffled! 🔀');
                } else {
                    alert('Need at least 2 photos to shuffle!');
                }
            } catch (err) {
                console.error('Shuffle error:', err);
                alert('Error shuffling photos: ' + err.message);
            }
        });
    }
    
    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    alert('Could not enter fullscreen mode');
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
                    } catch (err) {
                        progressText.textContent = `⚠ Error saving photos`;
                        console.error(err);
                    }
                    
                    setTimeout(() => {
                        progress.style.display = 'none';
                        
                        // Hide drop zone
                        const dropZone = document.getElementById('dropZone');
                        dropZone.style.opacity = '0';
                        setTimeout(() => {
                            dropZone.style.display = 'none';
                        }, 300);
                        
                        // Start if first photos
                        if (!isPlaying) {
                            startLoop();
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
    
    // Add count header
    const countHeader = `<div style="padding: 15px; background: rgba(0, 122, 255, 0.2); border-radius: 8px; margin-bottom: 15px; text-align: center;">
        <h3 style="font-size: 18px;">📸 ${photos.length} Photos Loaded</h3>
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
                <button class="icon-btn delete" onclick="deletePhoto(${index})">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function deletePhoto(index) {
    if (confirm('Delete this photo?')) {
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
    }
}

async function shufflePhotos() {
    // Fisher-Yates shuffle algorithm
    for (let i = photos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [photos[i], photos[j]] = [photos[j], photos[i]];
    }
    await savePhotos();
}
