// Import Three.js modules
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/UnrealBloomPass.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const safetyModal = document.getElementById('safety-modal');
    const agreeButton = document.getElementById('agree-button');
    const introScreen = document.getElementById('intro-screen');
    const startButton = document.getElementById('start-button');
    const dreamachineContainer = document.getElementById('dreamachine-container');
    const canvas = document.getElementById('dreamachine-canvas');
    const threeCanvas = document.getElementById('threejs-canvas');
    const ctx = canvas.getContext('2d');
    const hzSlider = document.getElementById('hz-slider');
    const hzValue = document.getElementById('hz-value');
    const soundToggle = document.getElementById('sound-toggle');
    const exitButton = document.getElementById('exit-button');
    const exitMessage = document.getElementById('exit-message');
    const modeSelect = document.getElementById('mode-select');
    const controls = document.getElementById('controls');

    // State
    let animationFrameId;
    let isRunning = false;
    let frequency = 8; // Default Hz
    let soundEnabled = true;
    let currentMode = 'dream'; // 'dream' will be our mandala
    let inactivityTimer;
    let controlsVisible = true;
    let slitCount = 16; // Number of slits in the cylinder
    let frameRate = 60; // Assumed frame rate

    // --- Three.js State ---
    let scene, camera, renderer, composer, pointLight, cylinder, clock;

    // --- Audio Engine (Tone.js) ---
    const player = new Tone.Player({
        url: "Audio/Repetition- Max Cooper.m4a",
        loop: true,
        fadeOut: 2,
    }).toDestination();

    // --- New Audio-Reactive components ---
    const fft = new Tone.FFT({
        size: 32,
        smoothing: 0.8
    });
    player.connect(fft);
    let bassEnergy = 0;

    // --- Core Visual Engine ---
    const setupCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    // --- New Three.js Engine ---
    const initThree = () => {
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        clock = new THREE.Clock();

        // Camera - Positioned slightly off-center inside the cylinder for the classic effect
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 1.9); // (radius - epsilon)
        camera.lookAt(0, 0, 0);

        // Renderer with high-quality shadows
        renderer = new THREE.WebGLRenderer({
            canvas: threeCanvas,
            antialias: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

        // A single, powerful point light inside the cylinder
        pointLight = new THREE.PointLight(0xffffff, 5, 50);
        pointLight.position.set(0, 0, 0);
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 1024;
        pointLight.shadow.mapSize.height = 1024;
        pointLight.shadow.camera.near = 0.5;
        pointLight.shadow.camera.far = 10;
        scene.add(pointLight);
        
        // Minimal ambient light for higher contrast
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.01);
        scene.add(ambientLight);

        // A plane to catch the shadows, simulating the user's closed eyelids
        const shadowPlaneGeo = new THREE.PlaneGeometry(30, 30);
        const shadowPlaneMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
        shadowPlane.position.z = 2.1; // Just in front of the camera
        scene.add(shadowPlane);

        // Build the cylinder from geometric panels, not a texture
        createCylinderWithGeometricSlits(slitCount);

        // Post-processing for light "bleed"
        const renderPass = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.8, // Strength
            0.6, // Radius
            0.1  // Threshold
        );
        composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(bloomPass);
    };

    const createCylinderWithGeometricSlits = (count) => {
        if (cylinder) scene.remove(cylinder); // Remove old one if exists
        
        cylinder = new THREE.Group();
        scene.add(cylinder);

        const radius = 2;
        const height = 4;
        const wallThickness = 0.1;
        
        // We will create the cylinder from vertical panels
        const panelCount = count * 2; // Create a panel for the solid part and a gap for the slit
        const anglePerPanel = (2 * Math.PI) / panelCount;
        const panelWidth = Math.tan(anglePerPanel / 2) * radius * 2;

        const panelGeometry = new THREE.BoxGeometry(panelWidth, height, wallThickness);
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.9,
            roughness: 0.4,
        });

        for (let i = 0; i < panelCount; i += 2) { // Step by 2 to leave a gap
            const angle = i * anglePerPanel;
            const panel = new THREE.Mesh(panelGeometry, panelMaterial.clone());
            panel.castShadow = true;

            const x = radius * Math.sin(angle);
            const z = radius * Math.cos(angle);
            panel.position.set(x, 0, z);
            panel.lookAt(0, 0, 0);
            cylinder.add(panel);
        }
    };

    const animateThree = () => {
        if (!isRunning || currentMode !== 'classic') return;
        
        const delta = clock.getDelta();
        
        // Correct, physics-based rotation
        const rotationPerSecond = (2 * Math.PI * frequency) / slitCount;
        cylinder.rotation.y += rotationPerSecond * delta;

        // Natural, subtle light flicker + audio-reactive pulse
        const naturalFlicker = 1 + (Math.sin(performance.now() * 0.01) * 0.1);
        const pulse = (1 + (bassEnergy * 4)) * naturalFlicker;
        pointLight.intensity = pulse * 5; // Multiply intensity for a brighter effect
        pointLight.color.setHSL(hue / 360, 0.8, 0.6);

        composer.render();
        animationFrameId = requestAnimationFrame(animateThree);
    };

    // --- Inactivity Detection ---
    const startInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        
        // Show controls immediately when activity is detected
        if (!controlsVisible) {
            showControls();
        }
        
        // Set a new timer to hide controls after 3 seconds
        inactivityTimer = setTimeout(() => {
            hideControls();
        }, 3000); // 3 seconds
    };
    
    const showControls = () => {
        controls.style.opacity = '1';
        controls.style.transform = 'translateX(-50%) translateY(0)';
        controlsVisible = true;
    };
    
    const hideControls = () => {
        controls.style.opacity = '0';
        controls.style.transform = 'translateX(-50%) translateY(20px)';
        controlsVisible = false;
    };
    
    // Setup activity listeners
    const setupActivityListeners = () => {
        document.addEventListener('mousemove', startInactivityTimer);
        document.addEventListener('mousedown', startInactivityTimer);
        document.addEventListener('keydown', startInactivityTimer);
        document.addEventListener('touchstart', startInactivityTimer);
        document.addEventListener('touchmove', startInactivityTimer);
    };
    
    // Remove activity listeners
    const removeActivityListeners = () => {
        document.removeEventListener('mousemove', startInactivityTimer);
        document.removeEventListener('mousedown', startInactivityTimer);
        document.removeEventListener('keydown', startInactivityTimer);
        document.removeEventListener('touchstart', startInactivityTimer);
        document.removeEventListener('touchmove', startInactivityTimer);
    };

    // --- New Mandala/Chromatic Flicker Engine ---
    let lastRenderTime = 0;
    let flickerState = false;
    let ringOffset = 0;
    let hue = 190; // Start with a cool blue/cyan

    const drawMandala = () => {
        // Get bass energy from FFT
        const fftValue = fft.getValue();
        // We'll average the lowest frequencies for "bass"
        const lowFreqAvg = (fftValue[0] + fftValue[1] + fftValue[2]) / 3;
        // Normalize and smooth the value
        const normalized = Math.max(0, (lowFreqAvg + 100) / 100); // Normalize to 0-1 range, clamp at 0
        bassEnergy = Tone.immediate(() => {
             return Tone.dbToGain(lowFreqAvg) * 2;
        });

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (flickerState) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
            const ringSize = 50;

            ringOffset = (ringOffset + 0.5) % (ringSize * 2);

            // Pulsing effect based on bass
            const pulseAmount = bassEnergy * 25; // How much the bass affects the visuals

            for (let i = ringOffset; i < maxRadius; i += (ringSize * 2)) {
                // The alpha and lineWidth will pulse with the bass
                const alpha = Math.min(0.2 + (bassEnergy * 0.8), 0.8);
                const lineWidth = ringSize + pulseAmount;
                const color1 = `hsla(${hue}, 70%, 50%, ${alpha})`;

                ctx.beginPath();
                ctx.arc(centerX, centerY, i, 0, 2 * Math.PI, false);
                ctx.strokeStyle = color1;
                ctx.lineWidth = lineWidth;
                ctx.stroke();
            }
        }
    };

    const drawVoid = () => {
        ctx.fillStyle = flickerState ? '#FFFFFF' : '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // --- Transport-Synced Animation Loop (for 2D modes) ---
    const mainLoop = () => {
        if (!isRunning || currentMode === 'classic') {
            return;
        };

        Tone.Draw.schedule(() => {
            if (currentMode === 'dream') {
                drawMandala();
            } else {
                drawVoid();
            }
        }, Tone.now());

        requestAnimationFrame(mainLoop);
    }

    // This loop toggles the flicker state, synced to the transport
    const flickerLoop = new Tone.Loop(time => {
        flickerState = !flickerState;
        // Also slowly shift color hue in mandala mode
        if (currentMode === 'dream') {
             hue = (hue + 0.5) % 360;
        }
    }, "8n"); // Default to 8th note flicker

    const startExperience = () => {
        if (isRunning) return;
        isRunning = true;
        
        // Start inactivity detection
        setupActivityListeners();
        startInactivityTimer();

        if (currentMode === 'classic') {
            canvas.classList.add('hidden');
            threeCanvas.classList.remove('hidden');
            if (!scene) initThree();
            animationFrameId = requestAnimationFrame(animateThree);
        } else {
            threeCanvas.classList.add('hidden');
            canvas.classList.remove('hidden');
            setupCanvas();
            animationFrameId = requestAnimationFrame(mainLoop);
        }

        // Start the audio and transport
        Tone.Transport.start();
        flickerLoop.start(0);

        if (soundEnabled) {
            player.start();
        }
    };

    const stopExperience = () => {
        if (!isRunning) return;
        isRunning = false;
        
        // Stop inactivity detection
        removeActivityListeners();
        clearTimeout(inactivityTimer);
        showControls(); // Ensure controls are visible when stopping
        cancelAnimationFrame(animationFrameId);

        Tone.Transport.stop();
        flickerLoop.stop();
        player.stop();

        // Clear canvas to black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (scene) { // Dispose of Three.js objects
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                     if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            renderer.dispose();
            scene = null;
        }
    };

    const updateFrequency = () => {
        frequency = parseFloat(hzSlider.value);
        hzValue.textContent = `${frequency.toFixed(1)} Hz`;
        flickerLoop.frequency.value = frequency;
    };

    // --- UI and Application Flow ---
    const enterDreamachine = async () => {
        introScreen.classList.add('hidden');
        dreamachineContainer.classList.remove('hidden');
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
        
        // This must be called from a user action
        await Tone.start();
        console.log("Audio context started");

        startExperience();
    };

    const exitDreamachine = () => {
        stopExperience();
        dreamachineContainer.classList.add('hidden');
        exitMessage.classList.remove('hidden');
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        // Fade out and return to intro after a moment
        setTimeout(() => {
            exitMessage.classList.add('hidden');
            introScreen.classList.remove('hidden');
        }, 4000);
    };

    // --- Event Listeners ---
    agreeButton.addEventListener('click', () => {
        safetyModal.classList.add('hidden');
    });

    startButton.addEventListener('click', enterDreamachine);

    exitButton.addEventListener('click', exitDreamachine);

    hzSlider.addEventListener('input', updateFrequency);

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.textContent = soundEnabled ? 'On' : 'Off';
        if (soundEnabled && isRunning && player.state !== 'started') {
            Tone.start().then(() => player.start());
        } else if (!soundEnabled && player.state === 'started') {
            player.stop();
        }
    });

    modeSelect.addEventListener('change', (e) => {
        currentMode = e.target.value;
        if (isRunning) {
            stopExperience();
            startExperience();
        }
    });

    window.addEventListener('resize', () => {
        if (!isRunning) return;

        if (currentMode === 'classic' && scene) {
            // Handle Three.js resize
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        } else {
            setupCanvas();
        }
    });

    // Initialize
    // (no initial setup call, happens on start)
}); 