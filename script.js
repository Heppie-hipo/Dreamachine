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

    // --- Three.js State ---
    let three, scene, camera, renderer, composer, pointLight, cylinder;

    // --- Audio Engine (Tone.js) ---
    const player = new Tone.Player({
        url: "Audio/Repetition- Max Cooper.m4a", // Starting with one track
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

        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ReinhardToneMapping;

        // Light
        pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(0, 0, 0);
        scene.add(pointLight);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(ambientLight);

        // Cylinder with Slits
        const slitCount = 16;
        const texture = createSlitTexture(slitCount);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5,
        });
        const geometry = new THREE.CylinderGeometry(2, 2, 4, 64, 1, true);
        cylinder = new THREE.Mesh(geometry, material);
        scene.add(cylinder);

        // Post-processing for Bloom
        const renderPass = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.2;
        bloomPass.strength = 1.2; // glow intensity
        bloomPass.radius = 0.5;

        composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(bloomPass);
    };

    const createSlitTexture = (slitCount) => {
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = 512;
        textureCanvas.height = 512;
        const textureCtx = textureCanvas.getContext('2d');

        textureCtx.fillStyle = 'black';
        textureCtx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

        textureCtx.fillStyle = 'white';
        const slitWidth = textureCanvas.width / (slitCount * 2);
        for (let i = 0; i < slitCount * 2; i += 2) {
            textureCtx.fillRect(i * slitWidth, 0, slitWidth, textureCanvas.height);
        }

        return new THREE.CanvasTexture(textureCanvas);
    };

    const animateThree = () => {
        if (!isRunning || currentMode !== 'classic') return;

        // Rotate cylinder based on frequency
        const rotationSpeed = (frequency * 2 * Math.PI) / 60; // rad/frame at 60fps
        cylinder.rotation.y += rotationSpeed;

        // Pulse light with bass
        const pulse = 1 + (bassEnergy * 5);
        pointLight.intensity = pulse;
        pointLight.color.setHSL(hue / 360, 1, 0.5);

        composer.render();
        animationFrameId = requestAnimationFrame(animateThree);
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

    const startExperience = () => {
        if (isRunning) return;
        isRunning = true;
        
        // Start inactivity detection
        setupActivityListeners();
        startInactivityTimer();

        if (currentMode === 'classic') {
            canvas.classList.add('hidden');
            threeCanvas.classList.remove('hidden');
            if (!scene) initThree(); // Initialize on first run
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

        if (currentMode === 'classic') {
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