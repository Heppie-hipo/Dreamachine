// Import Three.js modules
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/UnrealBloomPass.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Onboarding Elements ---
    const onboardingContainer = document.getElementById('onboarding-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const disclaimerScreen = document.getElementById('disclaimer-screen');
    const preparationScreen = document.getElementById('preparation-screen');
    const welcomeContinueBtn = document.getElementById('welcome-continue-btn');
    const disclaimerAgreeBtn = document.getElementById('disclaimer-agree-btn');
    const beginExperienceBtn = document.getElementById('begin-experience-btn');

    // --- Core App Elements ---
    const dreamachineContainer = document.getElementById('dreamachine-container');
    const canvas = document.getElementById('dreamachine-canvas');
    const threeCanvas = document.getElementById('threejs-canvas');
    const hzValue = document.getElementById('hz-value');
    const soundToggle = document.getElementById('sound-toggle');
    const exitButton = document.getElementById('exit-button');
    const controls = document.getElementById('controls');
    const freqSlider = document.getElementById('freq-slider');
    
    // --- Sidebar Elements ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarHeaders = document.querySelectorAll('.sidebar-header');
    
    // --- Music Player Elements ---
    const nextTrackBtn = document.getElementById('next-track');

    // State
    const frequencies = [3, 8, 10, 18];
    let animationFrameId;
    let isRunning = false;
    let frequency = 8;
    let soundEnabled = true;
    let inactivityTimer;
    let controlsVisible = true;
    let slitCount = 12; // Reduced from 16 to 12
    
    
    // --- Mobile Detection ---
    const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // --- Music Player State ---
    const audioTracks = [
        { path: "Audio/Repetition- Max Cooper.m4a", name: "Repetition- Max Cooper.m4a" },
        { path: "Audio/Circular- Max Cooper.m4a", name: "Circular- Max Cooper.m4a" },
        { path: "Audio/#19- Aphex Twin.m4a", name: "#19- Aphex Twin.m4a" },
        { path: "Audio/A Drifting Up- Jon Hopkins.m4a", name: "A Drifting Up- Jon Hopkins.m4a" },
        { path: "Audio/A Fleeting Life feat James Yorkston- Max Cooper.m4a", name: "A Fleeting Life feat James Yorkston- Max Cooper.m4a" },
        { path: "Audio/Chromos- Max Cooper.m4a", name: "Chromos- Max Cooper.m4a" },
        { path: "Audio/Hope- Max Cooper.m4a", name: "Hope- Max Cooper.m4a" },
        { path: "Audio/Impermanence feat Kathrin Deboer- Max Cooper.m4a", name: "Impermanence feat Kathrin Deboer- Max Cooper.m4a" },
        { path: "Audio/In Pursuit Of Ghosts- Max Cooper Tom Hodge.m4a", name: "In Pursuit Of Ghosts- Max Cooper Tom Hodge.m4a" },
        { path: "Audio/Leaving This Place- Max Cooper.m4a", name: "Leaving This Place- Max Cooper.m4a" },
        { path: "Audio/Let There Be- Max Cooper.m4a", name: "Let There Be- Max Cooper.m4a" },
        { path: "Audio/On Being- Max Cooper Felix Gerbelot.m4a", name: "On Being- Max Cooper Felix Gerbelot.m4a" },
        { path: "Audio/Porous Space feat Samad Khan- Max Cooper.m4a", name: "Porous Space feat Samad Khan- Max Cooper.m4a" },
        { path: "Audio/Stereoscopic Dive- Max Cooper.m4a", name: "Stereoscopic Dive- Max Cooper.m4a" },
        { path: "Audio/The Missing Piece- Max Cooper.m4a", name: "The Missing Piece- Max Cooper.m4a" },
        { path: "Audio/Transcendental Tree Map- Max Cooper.m4a", name: "Transcendental Tree Map- Max Cooper.m4a" },
        { path: "Audio/Untitled I live At The Acropolis- Max Cooper.m4a", name: "Untitled I live At The Acropolis- Max Cooper.m4a" },
        { path: "Audio/Untitled III live At The Acropolis- Max Cooper.m4a", name: "Untitled III live At The Acropolis- Max Cooper.m4a" }
    ];
    let shuffledQueue = [];
    let queuePosition = 0;


    // --- Audio Engine ---
    const players = new Map(); // Using a Map to manage players manually
    let isAudioReady = false;
    let currentPlayerKey = null;
    let hasUserInteracted = false; // Track if user has interacted for mobile audio

    // --- Three.js State ---
    let scene, camera, renderer, composer, cylinder, clock, innerCylinder, strobeGroup;

    // --- Flash Color Palette ---
    const flashColors = [
        new THREE.Color(0xff00ff), new THREE.Color(0x00ffff), new THREE.Color(0xffff00),
        new THREE.Color(0xff0077), new THREE.Color(0x00ff77), new THREE.Color(0x7700ff),
        new THREE.Color(0xff7700), new THREE.Color(0x0077ff), new THREE.Color(0xccff00),
        new THREE.Color(0xffcc00),
    ];
    let currentFlashColor = flashColors[0];

    // --- Audio Analyser ---
    const analyser = new Tone.Analyser('fft', 256);
    // Each player will be connected to the analyser individually

    // --- Add Ripple Effect to Next Track Button ---
    const addRippleEffect = (button) => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = button.getBoundingClientRect();
            
            const size = Math.max(rect.width, rect.height) * 2;
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background-color: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear forwards;
                pointer-events: none;
            `;
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    };
    
    // --- Add Touch-specific Ripple Effect ---
    const addTouchRippleEffect = (button) => {
        button.addEventListener('touchstart', function(e) {
            const ripple = document.createElement('span');
            const rect = button.getBoundingClientRect();
            
            // Get touch position
            const touch = e.touches[0];
            const size = Math.max(rect.width, rect.height) * 2;
            const x = touch.clientX - rect.left - size / 2;
            const y = touch.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background-color: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear forwards;
                pointer-events: none;
            `;
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        }, { passive: true });
    };

    const generateShuffleQueue = () => {
        // Always start with Repetition by Max Cooper
        const firstTrack = audioTracks.find(t => t.name === "Repetition- Max Cooper.m4a");
        let restOfTracks = audioTracks.filter(t => t.name !== "Repetition- Max Cooper.m4a");

        for (let i = restOfTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [restOfTracks[i], restOfTracks[j]] = [restOfTracks[j], restOfTracks[i]];
        }
        shuffledQueue = [firstTrack, ...restOfTracks].filter(Boolean); // Filter out potential undefined values
    };
    
    const preloadTrack = (trackIndex) => {
        // Handle wrapping around the queue for continuous playback
        let normalizedIndex = trackIndex;
        if (trackIndex >= shuffledQueue.length) {
            normalizedIndex = trackIndex % shuffledQueue.length;
        }
        
        const trackToLoad = shuffledQueue[normalizedIndex];
        if (trackToLoad && !players.has(trackToLoad.name)) {
            // Use a placeholder to prevent re-triggering the download
            players.set(trackToLoad.name, { status: 'loading', player: null, blobUrl: null });
            
            console.log(`Fetching track for preloading: ${trackToLoad.name}`);
            fetch(trackToLoad.path)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.blob();
                })
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    const player = new Tone.Player(blobUrl, () => {
                        console.log(`Preloaded and ready: ${trackToLoad.name}`);
                        players.set(trackToLoad.name, { status: 'loaded', player: player, blobUrl: blobUrl });
                    }).toDestination();
                    player.connect(analyser);
                })
                .catch(e => {
                    console.error("Error preloading track with fetch:", e);
                    // Remove the placeholder so it can be tried again
                    players.delete(trackToLoad.name);
                });
        }
    };
    
    const switchTrack = (newPosition) => {
        const now = Tone.now();

        // Stop current track if it exists
        if (currentPlayerKey && players.has(currentPlayerKey)) {
            const currentTrackData = players.get(currentPlayerKey);
            if (currentTrackData && currentTrackData.player) {
                currentTrackData.player.fadeOut = 0.5;
                currentTrackData.player.stop(now + 0.5);
            }
        }

        // --- Memory Management: Dispose of old players and revoke Blob URLs ---
        const keyToDisposeIndex = (newPosition - 2 + shuffledQueue.length) % shuffledQueue.length;
        const trackToDispose = shuffledQueue[keyToDisposeIndex];

        if (trackToDispose && players.has(trackToDispose.name)) {
            const trackDataToDispose = players.get(trackToDispose.name);
            if (trackDataToDispose && trackDataToDispose.status === 'loaded') {
                console.log(`Disposing of track to save memory: ${trackToDispose.name}`);
                if (trackDataToDispose.player) {
                    trackDataToDispose.player.dispose();
                }
                if (trackDataToDispose.blobUrl) {
                    URL.revokeObjectURL(trackDataToDispose.blobUrl);
                }
                players.delete(trackToDispose.name);
            }
        }
        // --- End Memory Management ---

        queuePosition = newPosition;
        const newTrack = shuffledQueue[queuePosition];
        if (!newTrack) {
            console.error(`Track at position ${queuePosition} not found.`);
            return;
        }
        currentPlayerKey = newTrack.name;
        updateTrackDisplay();

        // Preload the next track
        preloadTrack(queuePosition + 1);

        const playTrack = () => {
            const trackData = players.get(currentPlayerKey);

            if (trackData && trackData.status === 'loaded' && trackData.player) {
                // Player is fully loaded and ready
                if (soundEnabled && isRunning) {
                    trackData.player.fadeIn = 0.5;
                    trackData.player.loop = true;
                    trackData.player.start(now);
                    console.log("Started playing preloaded track:", currentPlayerKey);
                }
            } else if (trackData && trackData.status === 'loading') {
                // The track is currently being fetched, wait for it to load
                console.log("Track is still loading, waiting to play...", currentPlayerKey);
                // We'll rely on the onload callback in preloadTrack to handle playback
                // Or we can implement a more robust polling/event system here if needed
                setTimeout(() => playTrack(), 300); // Check again shortly
            } else {
                // Track not found, start preloading it now
                console.log("Track not found, initiating on-demand load:", currentPlayerKey);
                preloadTrack(queuePosition); // This will trigger the fetch
                setTimeout(() => playTrack(), 300); // Check again shortly
            }
        };
        
        playTrack();
    };
    
    const playNextTrack = () => {
        let newPosition = queuePosition + 1;
        if (newPosition >= shuffledQueue.length) {
            newPosition = 0;
        }
        switchTrack(newPosition);
    };
    
    const updateTrackDisplay = () => {
        // Track display removed, no longer showing track numbers
    };

    const initThree = () => {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        clock = new THREE.Clock();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Adjust camera position based on device type - zoom out slightly for mobile
        if (isMobile()) {
            camera.position.set(0, 0, 5.3); // Slightly further back for mobile
        } else {
            camera.position.set(0, 0, 5.0); // Standard distance for desktop
        }
        
        renderer = new THREE.WebGLRenderer({ 
            canvas: threeCanvas, 
            antialias: false,
            powerPreference: "high-performance",
            alpha: false,
            stencil: false,
            depth: false,
        });
        
        const maxPixelRatio = isMobile() ? 1.5 : 2;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        const background = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
        scene.add(background);

        strobeGroup = new THREE.Group();
        scene.add(strobeGroup);

        const cylinderGeo = new THREE.CylinderGeometry(2, 2, 5, 32, 1, true);
        const alphaMapTexture = createCylinderPatternTexture();
        alphaMapTexture.wrapS = THREE.RepeatWrapping;
        // Adjust for better 3D illusion - fewer repeats creates better depth perception
        alphaMapTexture.repeat.set(3, 1);
        const cylinderMat = new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            alphaMap: alphaMapTexture, 
            transparent: true, 
            alphaTest: 0.5, 
            side: THREE.DoubleSide
        });
        cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
        scene.add(cylinder);

        // Add silver wireframe outline for better cylinder visibility
        const outlineGeo = new THREE.CylinderGeometry(2.01, 2.01, 5.01, 32, 4, true);
        const outlineMat = new THREE.MeshBasicMaterial({
            color: 0xC0C0C0, // Silver color
            wireframe: true,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const cylinderOutline = new THREE.Mesh(outlineGeo, outlineMat);
        scene.add(cylinderOutline);
        // Make the outline rotate with the cylinder
        cylinder.add(cylinderOutline);
        cylinderOutline.rotation.y = 0; // Reset relative rotation

        const innerGeo = new THREE.CylinderGeometry(1.9, 1.9, 4.9, 32);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide });
        innerCylinder = new THREE.Mesh(innerGeo, innerMat);
        strobeGroup.add(innerCylinder);
        
        const outerCasing = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 5.5, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1.0, opacity: 0.2, metalness: 0, roughness: 0.05, ior: 1.5, transparent: true, side: THREE.DoubleSide }));
        scene.add(outerCasing);

        const renderPass = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.2, 0.2);
        composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(bloomPass);
    };

    const createCylinderPatternTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Fill background with white (this becomes transparent)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set cutout color to black (this is what's visible)
        ctx.fillStyle = 'black';

        // Increased number of rows from 4 to 6
        const numRows = 6;
        // Reduced number of columns from 4 to 3
        const numCols = 3;
        const cellWidth = canvas.width / numCols;
        const cellHeight = canvas.height / numRows;
        const padding = 20;
        const size = Math.min(cellWidth, cellHeight) / 2 - padding;

        const drawPolygon = (cx, cy, sides, radius, rotation = 0) => {
            ctx.beginPath();
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * 2 * Math.PI + rotation;
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
        };

        const drawStar = (cx, cy, spikes, outerRadius, innerRadius, rotation = 0) => {
            let rot = Math.PI / 2 * 3 + rotation;
            let x, y;
            const step = Math.PI / spikes;

            ctx.beginPath();
            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
            ctx.fill();
        };

        const drawCircle = (cx, cy, radius) => {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            ctx.fill();
        };

        // Reduced number of shapes from 4 to 3, removed the triangle
        const shapes = [
            (cx, cy, s) => drawPolygon(cx, cy, 6, s), // Hexagon
            (cx, cy, s) => drawStar(cx, cy, 5, s, s / 2), // 5-point star
            (cx, cy, s) => drawCircle(cx, cy, s * 0.9), // Circle
        ];

        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                const cx = c * cellWidth + cellWidth / 2;
                const cy = r * cellHeight + cellHeight / 2;
                
                const shapeIndex = (r + c) % shapes.length;
                shapes[shapeIndex](cx, cy, size);
            }
        }

        return new THREE.CanvasTexture(canvas);
    };

    let lastFlickerAngle = 0;
    let flashDuration = 0;

    const animateThree = () => {
        if (!isRunning) return;
        animationFrameId = requestAnimationFrame(animateThree);
        const delta = clock.getDelta();
        cylinder.rotation.y += (2 * Math.PI * frequency) / slitCount * delta;
        const anglePerSlit = (2 * Math.PI) / slitCount;
        if (Math.floor(cylinder.rotation.y / anglePerSlit) > Math.floor(lastFlickerAngle / anglePerSlit)) {
            currentFlashColor = flashColors[Math.floor(Math.random() * flashColors.length)];
            flashDuration = frequency <= 8 ? 2 : 1;
        }
        lastFlickerAngle = cylinder.rotation.y;
        innerCylinder.material.color.set(flashDuration > 0 ? currentFlashColor : 0x000000);
        if (flashDuration > 0) flashDuration--;
        composer.render();
    };

    const startInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        if (!controlsVisible) showControls();
        inactivityTimer = setTimeout(hideControls, 3000);
    };
    const showControls = () => { controls.style.opacity = '1'; controls.style.transform = 'translateX(-50%) translateY(0)'; controlsVisible = true; };
    const hideControls = () => { controls.style.opacity = '0'; controls.style.transform = 'translateX(-50%) translateY(20px)'; controlsVisible = false; };
    const setupActivityListeners = () => { ['mousemove','mousedown','keydown','touchstart','touchmove'].forEach(evt => document.addEventListener(evt, startInactivityTimer)); };
    const removeActivityListeners = () => { ['mousemove','mousedown','keydown','touchstart','touchmove'].forEach(evt => document.removeEventListener(evt, startInactivityTimer)); };
    const toggleSidebar = () => sidebar.classList.toggle('active');
    const closeSidebar = () => sidebar.classList.remove('active');
    
    const initSidebarSections = () => {
        sidebarHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                header.classList.toggle('active');
                header.nextElementSibling.classList.toggle('active');
            });
        });
    };

    const startExperience = () => {
        if (isRunning) return;
        isRunning = true;
        hasUserInteracted = true; // Mark that user has interacted
        
        closeSidebar();
        dreamachineContainer.classList.remove('hidden');
        onboardingContainer.classList.add('hidden');
        // Hide sidebar toggle button when experience starts
        sidebarToggle.style.display = 'none';
        setupActivityListeners();
        startInactivityTimer();

        if (!scene) initThree();
        
        onWindowResize();
        animateThree();

        try {
            // Explicitly start audio context on user interaction
            if (Tone.context.state !== 'running') {
                Tone.context.resume().then(() => {
                    console.log("AudioContext resumed successfully");
                    Tone.Transport.start();
                    if (isAudioReady) {
                        switchTrack(queuePosition);
                    } else {
                        console.warn("Audio not ready yet, experience will start without sound.");
                    }
                }).catch(err => {
                    console.error("Failed to resume AudioContext:", err);
                });
            } else {
                Tone.Transport.start();
                if (isAudioReady) {
                    switchTrack(queuePosition);
                }
            }
        } catch (e) {
            console.error("Audio initialization error:", e);
        }
    };

    const stopExperience = () => {
        if (!isRunning) return;
        isRunning = false;
        
        removeActivityListeners();
        clearTimeout(inactivityTimer);
        showControls();
        cancelAnimationFrame(animationFrameId);
        
        // Show sidebar toggle button when exiting experience
        sidebarToggle.style.display = 'flex';

        if (Tone.Transport.state === 'started') Tone.Transport.stop();
        
        // Dispose all players and revoke all blob URLs to free up memory
        for (const trackData of players.values()) {
            if (trackData) {
                if (trackData.player && !trackData.player.disposed) {
                    trackData.player.dispose();
                }
                if (trackData.blobUrl) {
                    URL.revokeObjectURL(trackData.blobUrl);
                }
            }
        }
        players.clear();
        currentPlayerKey = null;

        dreamachineContainer.classList.add('hidden');
        onboardingContainer.classList.remove('hidden');
        welcomeScreen.classList.add('active');
        disclaimerScreen.classList.remove('active');
        preparationScreen.classList.remove('active');
    };

    const updateFrequency = () => {
        hzValue.textContent = `${frequency.toFixed(1)} Hz`;
    };

    const onWindowResize = () => {
        if (!isRunning || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    };

    const initialize = async () => {
        updateFrequency();
        initSidebarSections();
        
        generateShuffleQueue();
        
        // Apply ripple effects to the next track button
        addRippleEffect(nextTrackBtn);
        addTouchRippleEffect(nextTrackBtn);
        
        beginExperienceBtn.textContent = 'Loading...';
        beginExperienceBtn.disabled = true;
        
        // Pre-load the first track using the new fetch and blob method
        try {
            const firstTrack = shuffledQueue[0];
            if (firstTrack) {
                // Set placeholder to prevent duplicate loading
                players.set(firstTrack.name, { status: 'loading', player: null, blobUrl: null });
                
                const response = await fetch(firstTrack.path);
                if (!response.ok) throw new Error(`Failed to fetch first track: ${response.statusText}`);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                
                const player = new Tone.Player(blobUrl, () => {
                    console.log("First track loaded. Experience is ready.");
                    isAudioReady = true;
                    beginExperienceBtn.disabled = false;
                    beginExperienceBtn.textContent = 'Begin Experience';
                    
                    // Now that the first is ready, update its status
                    players.set(firstTrack.name, { status: 'loaded', player: player, blobUrl: blobUrl });

                    // Preload the next track for a smoother start
                    preloadTrack(1);
                }).toDestination();
                player.connect(analyser);

            } else {
                throw new Error("Shuffle queue was empty, no tracks to load.");
            }
        } catch (e) {
            console.error("Critical error during initial audio loading:", e);
            beginExperienceBtn.textContent = 'Error - Refresh';
            beginExperienceBtn.disabled = true;
        }
    };

    welcomeContinueBtn.addEventListener('click', () => {
        welcomeScreen.classList.remove('active');
        disclaimerScreen.classList.add('active');
    });
    
    disclaimerAgreeBtn.addEventListener('click', () => {
        disclaimerScreen.classList.remove('active');
        preparationScreen.classList.add('active');
    });

    beginExperienceBtn.addEventListener('click', async () => {
        try {
            // This is critical for mobile - must be in response to a user gesture
            await Tone.start();
            console.log("Tone.js started successfully");
        } catch (e) {
            console.error("Tone.js start error:", e);
        }
        startExperience();
    });

    exitButton.addEventListener('click', stopExperience);

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.textContent = soundEnabled ? 'On' : 'Off';
        hasUserInteracted = true; // Mark that user has interacted
        
        if (!isAudioReady || !currentPlayerKey || !players.has(currentPlayerKey)) return;
        
        const trackData = players.get(currentPlayerKey);
        if (trackData && trackData.player) {
            const player = trackData.player;
            if (isRunning) {
                if (soundEnabled && player.state !== 'started') {
                    player.start();
                    console.log("Started audio via sound toggle");
                } else if (!soundEnabled && player.state === 'started') {
                    player.stop();
                }
            }
        }
    });
    
    // Improved track changing handler to ensure touch events work properly
    const handleInteraction = (handler, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation(); // Stop event bubbling
        }
        
        // Debounce to prevent multiple rapid calls
        if (handler.isProcessing) return false;
        handler.isProcessing = true;
        setTimeout(() => {
            handler.isProcessing = false;
        }, 300);
        
        handler();
        return false; // Prevent default browser behavior
    };

    // Add debounce property to handlers
    playNextTrack.isProcessing = false;
    toggleSidebar.isProcessing = false;
    closeSidebar.isProcessing = false;

    // Use proper event listeners for both click and touch events on mobile
    nextTrackBtn.addEventListener('click', (e) => handleInteraction(playNextTrack, e));
    nextTrackBtn.addEventListener('touchstart', (e) => {
        hasUserInteracted = true; // Mark that user has interacted
        handleInteraction(playNextTrack, e);
    }, { passive: false });
    
    sidebarToggle.addEventListener('click', (e) => handleInteraction(toggleSidebar, e));
    sidebarToggle.addEventListener('touchstart', (e) => handleInteraction(toggleSidebar, e), { passive: false });
    sidebarClose.addEventListener('click', (e) => handleInteraction(closeSidebar, e));
    sidebarClose.addEventListener('touchstart', (e) => handleInteraction(closeSidebar, e), { passive: false });

    freqSlider.addEventListener('input', (e) => {
        frequency = frequencies[parseInt(e.target.value)];
            updateFrequency();
    });

    window.addEventListener('resize', onWindowResize);

    initialize();
}); 