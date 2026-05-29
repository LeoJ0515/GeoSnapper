// ================= Global Variables =================
let currentLat = null;
let currentLng = null;
let userMarker = null;
let isFirstLocation = true;
let map = null;
let lastStableLat = null;
let lastStableLng = null;
let watchId = null;
let accuracyCircle = null;
let currentAccuracy = null;
const MOVEMENT_THRESHOLD = 3;

// ================= UI References =================
let permissionOverlay, mainControls, recenterBtn, errorMsg, cameraInput;
let toastEl, toastMsg, bsToast;
let signalIcon, signalText, accuracyText;

// Detect if device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

// ================= Map Initialization =================
function initMap() {
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 20, 
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        tileSize: 256,
        zoomOffset: 0
    });
    
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    });

    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
        attribution: '&copy; CARTO' 
    });

    map = L.map('map', { 
        layers: [osmLayer], 
        zoomControl: false,
        attributionControl: true
    }).setView([6.45, 100.5], 15);

    const baseMaps = {
        '<i class="bi bi-map-fill text-primary me-2 fs-6"></i><span class="fw-semibold">Street</span>': osmLayer,
        '<i class="bi bi-globe-americas text-success me-2 fs-6"></i><span class="fw-semibold">Satellite</span>': satelliteLayer,
        '<i class="bi bi-moon-stars-fill text-dark me-2 fs-6"></i><span class="fw-semibold">Dark</span>': darkLayer
    };

    L.control.layers(baseMaps).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
}

// ================= Toast Functions =================
function showToast(message, type = 'primary') {
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    toastMsg.innerText = message;
    bsToast.show();
}

// ================= Permission Check =================
function checkPermissionAndStart() {
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
            if (result.state === 'granted') {
                initTracking();
            } else {
                showOverlay();
            }
        });
    } else {
        navigator.geolocation.getCurrentPosition(() => initTracking(), () => showOverlay());
    }
}

function showOverlay() { 
    permissionOverlay.style.display = 'flex'; 
}

function manualRequestGPS() {
    navigator.geolocation.getCurrentPosition(
        (pos) => initTracking(pos),
        (err) => {
            errorMsg.innerText = "Access denied. Please allow location.";
            errorMsg.classList.remove('d-none');
        },
        { enableHighAccuracy: true }
    );
}

// ================= Tracking & Signal Logic =================
function initTracking(initialPos = null) {
    permissionOverlay.style.opacity = '0';
    setTimeout(() => permissionOverlay.style.display = 'none', 500);
    mainControls.classList.add('controls-visible');
    recenterBtn.style.display = 'flex';
    
    if(initialPos) updateUserPosition(initialPos);

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
    
    watchId = navigator.geolocation.watchPosition(updateUserPosition, 
        (err) => {
            console.warn("GPS Lost", err);
            updateSignalUI(null);
        }, 
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
}

function updateUserPosition(position) {
    const newLat = position.coords.latitude;
    const newLng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    
    currentAccuracy = accuracy;
    updateSignalUI(accuracy);

    let threshold = MOVEMENT_THRESHOLD;
    if (accuracy && accuracy < 10) threshold = 1.5;
    else if (accuracy && accuracy < 20) threshold = 2.5;
    
    if (lastStableLat !== null) {
        const dist = map.distance([newLat, newLng], [lastStableLat, lastStableLng]);
        if (dist < threshold) return; 
    }

    currentLat = newLat;
    currentLng = newLng;
    lastStableLat = newLat;
    lastStableLng = newLng;

    if (userMarker) {
        userMarker.setLatLng([currentLat, currentLng]);
        if (accuracyCircle) {
            accuracyCircle.setLatLng([currentLat, currentLng]);
            accuracyCircle.setRadius(Math.min(accuracy, 100));
        }
    } else {
        const pulsingIcon = L.divIcon({
            className: 'css-icon',
            html: '<div class="gps-ring"></div><div class="user-location-marker" style="width:20px;height:20px;"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        userMarker = L.marker([currentLat, currentLng], { icon: pulsingIcon }).addTo(map);
        
        accuracyCircle = L.circle([currentLat, currentLng], {
            radius: Math.min(accuracy, 100),
            color: '#5F9598',
            weight: 1.5,
            opacity: 0.5,
            fillOpacity: 0.1,
            className: 'accuracy-circle'
        }).addTo(map);
    }

    if (isFirstLocation) {
        map.setView([currentLat, currentLng], 18);
        isFirstLocation = false;
        showToast("GPS locked! Ready for photos", "success");
    }
}

function updateSignalUI(accuracy) {
    signalIcon.className = 'bi';
    signalIcon.classList.remove('signal-good', 'signal-fair', 'signal-weak');

    if (accuracy === null) {
        signalIcon.classList.add('bi-reception-0', 'signal-weak');
        signalText.innerText = "No Signal";
        accuracyText.innerText = "Check settings";
        return;
    }

    accuracyText.innerText = `±${Math.round(accuracy)}m`;

    if (accuracy <= 10) {
        signalIcon.classList.add('bi-reception-4', 'signal-good');
        signalText.innerText = "Excellent"; 
    } else if (accuracy <= 25) {
        signalIcon.classList.add('bi-reception-4', 'signal-good');
        signalText.innerText = "Strong"; 
    } else if (accuracy <= 50) {
        signalIcon.classList.add('bi-reception-3', 'signal-fair');
        signalText.innerText = "Good"; 
    } else {
        signalIcon.classList.add('bi-reception-1', 'signal-weak');
        signalText.innerText = "Weak";
    }
}

// ================= PHOTO SELECTION MODAL (Responsive) =================
function showPhotoOptions() {
    if (!currentLat || !currentLng) {
        showToast("Waiting for GPS signal...", "warning");
        return;
    }
    
    // For mobile: simple native camera trigger
    if (isMobile) {
        showMobileCameraOptions();
        return;
    }
    
    // For PC: Professional modal with preview
    showPCPhotoModal();
}

function showMobileCameraOptions() {
    // On mobile, directly open camera with capture attribute
    const mobileCameraInput = document.createElement('input');
    mobileCameraInput.type = 'file';
    mobileCameraInput.accept = 'image/*';
    mobileCameraInput.capture = 'environment';
    mobileCameraInput.style.display = 'none';
    
    mobileCameraInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handlePhotoCapture(e.target.files[0]);
        }
        mobileCameraInput.remove();
    };
    
    document.body.appendChild(mobileCameraInput);
    mobileCameraInput.click();
}

// ================= PHOTO SELECTION MODAL (Optimized for PC) =================
function showPCPhotoModal() {
    const modal = document.createElement('div');
    modal.id = 'pc-photo-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(10, 18, 26, 0.85); backdrop-filter: blur(12px);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.25s ease-out;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: linear-gradient(145deg, #162534, #0d1620);
        border-radius: 20px; padding: 32px; width: 90%; max-width: 440px;
        text-align: center; border: 1px solid rgba(95, 149, 152, 0.35);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    
    const title = document.createElement('h4');
    title.innerHTML = '<i class="bi bi-camera-fill me-2" style="color: #5F9598;"></i>Capture Asset Photo';
    title.style.cssText = `color: #E8EDF2; margin-bottom: 16px; font-weight: 600; letter-spacing: -0.5px;`;
    
    const accuracyInfo = document.createElement('div');
    accuracyInfo.style.cssText = `
        background: rgba(0, 0, 0, 0.25); border-radius: 12px; padding: 12px;
        margin-bottom: 24px; font-size: 0.88rem; color: #a0b4c8;
        border: 1px solid rgba(95, 149, 152, 0.15);
    `;
    accuracyInfo.innerHTML = `
        <div class="d-flex align-items-center justify-content-center gap-2 mb-1">
            <i class="bi bi-crosshair" style="color: #5F9598;"></i> 
            <span>GPS Status: <strong style="color: #5F9598;">±${Math.round(currentAccuracy || 0)}m</strong></span>
        </div>
        <span style="font-size: 0.75rem; color: #788da2;">Photo coordinates will match your live pinned location.</span>
    `;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;
    
    const cameraBtn = document.createElement('button');
    cameraBtn.innerHTML = '<i class="bi bi-webcam-fill me-2"></i> Launch Interface Webcam';
    cameraBtn.style.cssText = `
        background: linear-gradient(135deg, #366f8a, #1f4357); border: none;
        padding: 14px; border-radius: 10px; color: white; font-weight: 600;
        cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;
    `;
    cameraBtn.onmouseenter = () => cameraBtn.style.filter = 'brightness(1.15)';
    cameraBtn.onmouseleave = () => cameraBtn.style.filter = 'brightness(1)';
    cameraBtn.onclick = () => { modal.remove(); openPCWebcam(); };
    
    const galleryBtn = document.createElement('button');
    galleryBtn.innerHTML = '<i class="bi bi-folder2-open me-2"></i> Upload Local Image File';
    galleryBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(95, 149, 152, 0.3);
        padding: 14px; border-radius: 10px; color: #E8EDF2; font-weight: 600;
        cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;
    `;
    galleryBtn.onmouseenter = () => galleryBtn.style.background = 'rgba(255, 255, 255, 0.08)';
    galleryBtn.onmouseleave = () => galleryBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    galleryBtn.onclick = () => { modal.remove(); if (cameraInput) cameraInput.click(); };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.innerHTML = 'Cancel';
    cancelBtn.style.cssText = `
        background: transparent; border: none; padding: 10px; margin-top: 4px;
        color: #788da2; font-size: 0.9rem; cursor: pointer; transition: color 0.2s;
    `;
    cancelBtn.onmouseenter = () => cancelBtn.style.color = '#fff';
    cancelBtn.onmouseleave = () => cancelBtn.style.color = '#788da2';
    cancelBtn.onclick = () => modal.remove();
    
    buttonContainer.appendChild(cameraBtn);
    buttonContainer.appendChild(galleryBtn);
    buttonContainer.appendChild(cancelBtn);
    
    modalContent.appendChild(title);
    modalContent.appendChild(accuracyInfo);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    
    // Append animations dynamically if not already present
    if (!document.getElementById('camera-layout-styles')) {
        const style = document.createElement('style');
        style.id = 'camera-layout-styles';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes shutterFlash { 0% { opacity: 1; } 100% { opacity: 0; } }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(modal);
}

// ================= PC WEBCAM HANDLER (Professional Desktop UI) =================
async function openPCWebcam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Webcam access API is unsupported in this browser environment", "danger");
        if (cameraInput) cameraInput.click();
        return;
    }
    
    let activeStream = null;
    
    try {
        // Create professional fullscreen camera dashboard
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #090f14; z-index: 10001; display: flex; flex-direction: column;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        // Header control panel
        const header = document.createElement('div');
        header.style.cssText = `
            background: #0f1a24; padding: 16px 28px; display: flex;
            justify-content: space-between; align-items: center;
            border-bottom: 1px solid rgba(95, 149, 152, 0.25);
        `;
        
        // Left branding
        const branding = document.createElement('div');
        branding.style.cssText = `display: flex; align-items: center; gap: 12px; color: #fff;`;
        branding.innerHTML = `
            <i class="bi bi-display text-muted"></i>
            <span style="font-weight: 600; letter-spacing: -0.3px;">Workstation Video Capture</span>
        `;
        
        // Center: Dynamic Device Selector (Crucial for PCs with multi-cam/virtual cams)
        const selectorContainer = document.createElement('div');
        selectorContainer.style.cssText = `display: flex; align-items: center; gap: 8px; max-width: 300px; width: 100%;`;
        
        const camSelect = document.createElement('select');
        camSelect.className = "form-select form-select-sm bg-dark text-light border-secondary";
        camSelect.style.cssText = `cursor: pointer; font-size: 0.85rem; border-radius: 6px;`;
        selectorContainer.appendChild(camSelect);
        
        // Right telemetry
        const telemetry = document.createElement('div');
        telemetry.style.cssText = `color: #5F9598; font-size: 0.85rem; font-weight: 500;`;
        telemetry.innerHTML = `<i class="bi bi-crosshair me-1"></i> Pinned Platform Mode`;
        
        header.appendChild(branding);
        header.appendChild(selectorContainer);
        header.appendChild(telemetry);
        
        // Video monitor canvas workspace
        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
            flex: 1; display: flex; align-items: center; justify-content: center;
            background: #04070a; position: relative; overflow: hidden;
        `;
        
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        // Mirroring execution makes live tracking natural for PC operations
        video.style.cssText = `
            width: 100%; height: 100%; max-height: calc(100vh - 180px);
            object-fit: contain; transform: scaleX(-1);
        `;
        
        // Shutter flash block
        const flashOverlay = document.createElement('div');
        flashOverlay.style.cssText = `
            position: absolute; top:0; left:0; width:100%; height:100%;
            background: #fff; opacity: 0; pointer-events: none; z-index: 5;
        `;
        
        videoContainer.appendChild(video);
        videoContainer.appendChild(flashOverlay);
        
        // Lower action trigger deck
        const controls = document.createElement('div');
        controls.style.cssText = `
            background: #0f1a24; padding: 24px; display: flex;
            justify-content: center; align-items: center; gap: 40px;
            border-top: 1px solid rgba(95, 149, 152, 0.25); position: relative;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<i class="bi bi-x"></i> Exit';
        cancelBtn.className = "btn btn-outline-danger px-4 py-2";
        cancelBtn.style.borderRadius = "8px";
        
        const captureBtn = document.createElement('button');
        captureBtn.innerHTML = '<i class="bi bi-camera" style="font-size: 1.5rem;"></i>';
        captureBtn.style.cssText = `
            width: 72px; height: 72px; border-radius: 50%;
            background: linear-gradient(135deg, #5F9598, #3b6366);
            border: 4px solid rgba(255, 255, 255, 0.2); color: white;
            cursor: pointer; transition: all 0.2s ease;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 20px rgba(95, 149, 152, 0.4);
        `;
        captureBtn.onmouseenter = () => {
            captureBtn.style.transform = 'scale(1.08)';
            captureBtn.style.boxShadow = '0 0 25px rgba(95, 149, 152, 0.6)';
        };
        captureBtn.onmouseleave = () => {
            captureBtn.style.transform = 'scale(1)';
            captureBtn.style.boxShadow = '0 0 20px rgba(95, 149, 152, 0.4)';
        };
        
        controls.appendChild(cancelBtn);
        controls.appendChild(captureBtn);
        
        overlay.appendChild(header);
        overlay.appendChild(videoContainer);
        overlay.appendChild(controls);
        document.body.appendChild(overlay);

        // Stream initializer scoped to system hardware mapping
        async function initDeviceStream(deviceId) {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : { width: { ideal: 1920 }, height: { ideal: 1080 } }
            };
            
            activeStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = activeStream;
            return new Promise((resolve) => { video.onloadedmetadata = () => resolve(); });
        }

        // Enumerate video peripherals 
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        if (videoDevices.length <= 1) {
            camSelect.style.display = 'none'; // Only display dropdown if multiple options exist
        } else {
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera Device ${index + 1}`;
                camSelect.appendChild(option);
            });
            
            camSelect.onchange = async () => {
                try {
                    await initDeviceStream(camSelect.value);
                } catch (err) {
                    showToast("Failed shifting hardware video channels", "danger");
                }
            };
        }

        // Initialize default camera sequence
        await initDeviceStream(videoDevices[0]?.deviceId || null);

        // Capture logic
        const processCapture = () => {
            // Trigger shutter flash visual execution
            flashOverlay.style.animation = 'none';
            void flashOverlay.offsetWidth; // Force DOM reflow
            flashOverlay.style.animation = 'shutterFlash 0.35s ease-out forwards';

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // Mirror image execution adjustment to align accurately with user perspective preview
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `desktop_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    handlePhotoCapture(file);
                }
                terminateInterface();
            }, 'image/jpeg', 0.92);
        };

        const terminateInterface = () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            document.removeEventListener('keydown', handleKeyboardShortcuts);
            overlay.remove();
        };

        // Hotkeys setup
        const handleKeyboardShortcuts = (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                processCapture();
            } else if (e.key === 'Escape') {
                terminateInterface();
                showToast("Photo deployment aborted", "info");
            }
        };

        captureBtn.onclick = processCapture;
        cancelBtn.onclick = () => {
            terminateInterface();
            showToast("Photo deployment aborted", "info");
        };
        
        document.addEventListener('keydown', handleKeyboardShortcuts);

    } catch (error) {
        console.error("Camera channel access failure:", error);
        showToast("System camera permission blocked or hardware busy.", "danger");
        if (cameraInput) cameraInput.click();
    }
}

// ================= PHOTO CAPTURE HANDLER =================
// ================= PHOTO CAPTURE HANDLER =================
async function handlePhotoCapture(file) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.remove('d-none');
    
    try {
        if (!currentLat || !currentLng) {
            throw new Error("GPS signal not ready. Please wait for location fix.");
        }
        
        const photoLat = currentLat;
        const photoLng = currentLng;
        const accuracy = currentAccuracy || 0;
        const imageUrl = URL.createObjectURL(file);
        
        const now = new Date();
        const dateStr = now.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        let address = "Location Pinned";
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${photoLat}&lon=${photoLng}&zoom=18`);
            if(res.ok) {
                const data = await res.json();
                address = data.display_name.split(',').slice(0, 2).join(',');
            }
        } catch(err) {
            console.warn("Reverse geocoding failed");
        }
        
        // --- UPDATED: Highly Visible Pointed Location Marker ---
       // --- UPDATED: Clean Pointed Location Marker (Camera Removed) ---
        const pointedPhotoIcon = L.divIcon({
            html: `
                <div style="width: 40px; height: 42px; display: flex; justify-content: center; align-items: flex-start;">
                    <i class="bi bi-geo-alt-fill" style="font-size: 42px; color: #E74C3C; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); line-height: 1;"></i>
                </div>
            `,
            iconSize: [40, 42],
            iconAnchor: [20, 42],  // Anchors the exact bottom tip of the pin to the map coordinate
            popupAnchor: [0, -42], // Opens the preview popup precisely right above the pin
            className: 'photo-pointer-marker'
        });
        
        // Pass the clean pointedPhotoIcon to the marker configuration
        const marker = L.marker([photoLat, photoLng], { icon: pointedPhotoIcon }).addTo(map);
        
        const popupContent = `
            <div class="text-center" style="min-width: 240px;">
                <img src="${imageUrl}" style="width: 100%; max-width: 220px; height: auto; border-radius: 16px; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                <div class="popup-details text-start">
                    <div class="fw-bold mb-2" style="color: #5F9598;">
                        <i class="bi bi-geo-alt-fill text-danger me-1"></i> ${address}
                    </div>
                    <div class="small text-muted mb-2">
                        <i class="bi bi-crosshair me-1"></i> GPS Accuracy: ±${Math.round(accuracy)}m
                    </div>
                    <div class="d-flex gap-2 justify-content-between">
                        <span class="badge bg-secondary"><i class="bi bi-calendar-event me-1"></i>${dateStr}</span>
                        <span class="badge bg-secondary"><i class="bi bi-clock me-1"></i>${timeStr}</span>
                    </div>
                </div>
            </div>
        `;
        marker.bindPopup(popupContent).openPopup();
        
        showToast(`Photo pinned! Accuracy: ±${Math.round(accuracy)}m`, "success");
        map.setView([photoLat, photoLng], 16);
        
    } catch (err) {
        console.error("Photo processing error:", err);
        showToast(err.message || "Error processing photo", "danger");
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('d-none');
        if (cameraInput) cameraInput.value = '';
    }
}

// ================= Camera & Feature Logic =================
function recenterMap() {
    if (currentLat && currentLng) {
        map.flyTo([currentLat, currentLng], 18);
        showToast("Centered on your location", "info");
    } else {
        showToast("Waiting for GPS signal...", "warning");
    }
}

async function handleCameraInput(e) {
    const file = e.target.files[0];
    if (!file) return;
    await handlePhotoCapture(file);
}

// ================= Initialize App =================
document.addEventListener("DOMContentLoaded", () => {
    // Get UI references
    permissionOverlay = document.getElementById('permission-overlay');
    mainControls = document.getElementById('mainControls');
    recenterBtn = document.getElementById('recenterBtn');
    errorMsg = document.getElementById('error-msg');
    cameraInput = document.getElementById('cameraInput');
    toastEl = document.getElementById('statusToast');
    toastMsg = document.getElementById('toastMsg');
    bsToast = new bootstrap.Toast(toastEl);
    
    signalIcon = document.getElementById('signal-icon');
    signalText = document.getElementById('signal-text');
    accuracyText = document.getElementById('accuracy-text');

    initMap();
    checkPermissionAndStart();

    // Show photo options based on device
    document.getElementById('snapBtn').addEventListener('click', () => {
        if (!currentLat) { 
            showToast("Waiting for GPS signal...", "warning"); 
            return; 
        }
        showPhotoOptions();
    });

    cameraInput.addEventListener('change', handleCameraInput);
});