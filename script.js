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
    const exitMessage = document.getElementById('exit-message');
    const controls = document.getElementById('controls');
    const freqSlider = document.getElementById('freq-slider');

    // State
    const frequencies = [3, 8, 10, 18];
    let animationFrameId;
    let isRunning = false;
    let frequency = 8; // Default Hz, scientifically relevant
    let soundEnabled = true;
    let inactivityTimer;
    let controlsVisible = true;
    let slitCount = 16; // Set to 16 to match the number of columns in the texture pattern (4 columns * 4 repeats)
    let frameRate = 60; // Assumed frame rate

    // --- Three.js State ---
    let scene, camera, renderer, composer, cylinder, clock, innerCylinder;

    // --- Audio Engine (Tone.js) ---
    const player = new Tone.Player({
        url: "Audio/Repetition- Max Cooper.m4a",
        loop: true,
        fadeOut: 2,
    }).toDestination();

    // --- New Three.js Engine ---
    const initThree = () => {
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // Set background to pure black
        clock = new THREE.Clock();

        // Camera - Position based on screen size for better mobile experience
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Adjust camera position based on screen width
        if (window.innerWidth <= 768) {
            camera.position.set(0, 0, 5.0); // Further away on mobile for less zoom
        } else {
            camera.position.set(0, 0, 3.5); // Closer on desktop for immersive feel
        }
        camera.lookAt(0, 0, 0);

        // Renderer with high-quality shadows
        renderer = new THREE.WebGLRenderer({
            canvas: threeCanvas,
            antialias: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // No shadows needed for this new approach
        // renderer.shadowMap.enabled = true;
        // renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // All old lights are removed. The scene will be lit by the strobe effect.

        // Build the cylinder and casing
        createPatternedCylinder();
        createOuterCasing();

        // Create an inner cylinder that will flash to create the strobe effect
        const innerCylinderGeometry = new THREE.CylinderGeometry(1.9, 1.9, 5, 32);
        const innerCylinderMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        innerCylinder = new THREE.Mesh(innerCylinderGeometry, innerCylinderMaterial);
        scene.add(innerCylinder);

        // Post-processing for a more realistic glow
        const renderPass = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0;
        bloomPass.strength = 1.2; // Controlled strength
        bloomPass.radius = 0.5;   // Tighter radius for less haze

        composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(bloomPass);
    };

    let lastFlickerAngle = 0;
    let flashDuration = 0; // How many frames the flash should last

    const createCylinderPatternTexture = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set high resolution for crisp edges
        const canvasWidth = 512;
        const canvasHeight = 1024;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Fill the texture with white (which means opaque in the alphaMap)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Set the cutout color to black (which means transparent in the alphaMap)
        ctx.fillStyle = 'black';

        const numRows = 8; // Number of pattern rows
        const numCols = 4; // Number of pattern columns
        const rowHeight = canvasHeight / numRows;
        const colWidth = canvasWidth / numCols;
        const padding = 10; // Padding around shapes

        // Define the "U" shape path
        const drawUShape = (x, y, w, h, inverted = false) => {
            ctx.beginPath();
            if (!inverted) {
                // Standard "U" shape
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + h / 2);
                ctx.arcTo(x + w / 2, y + h, x + w, y + h / 2, w / 2);
                ctx.lineTo(x + w, y);
            } else {
                // Inverted "U" shape
                ctx.moveTo(x, y + h);
                ctx.lineTo(x, y + h / 2);
                ctx.arcTo(x + w / 2, y, x + w, y + h / 2, w / 2);
                ctx.lineTo(x + w, y + h);
            }
            ctx.fill();
        };

        // Draw the repeating, staggered pattern
        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                const x = col * colWidth + padding;
                const y = row * rowHeight + padding;
                const w = colWidth - 2 * padding;
                const h = rowHeight - 2 * padding;
                
                // Stagger columns: even columns get one pattern, odd columns another
                if (col % 2 === 0) {
                     // Inverted U for top rows, U for bottom rows, complex for middle
                    if (row < 2) drawUShape(x, y, w, h, true); // Top rows inverted
                    else if (row > numRows - 3) drawUShape(x, y, w, h, false); // Bottom rows
                    else { // Middle complex shape (approximated with two smaller U's)
                        drawUShape(x, y, w, h/2, true);
                        drawUShape(x, y + h/2, w, h/2, false);
                    }
                } else {
                    // Staggered pattern: U for top, Inverted U for bottom
                     if (row < numRows / 2) drawUShape(x, y, w, h, false);
                     else drawUShape(x, y, w, h, true);
                }
            }
        }

        return new THREE.CanvasTexture(canvas);
    };

    const createPatternedCylinder = () => {
        if (cylinder) scene.remove(cylinder);

        const radius = 2;
        const height = 5;
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);

        const alphaMapTexture = createCylinderPatternTexture();
        alphaMapTexture.wrapS = THREE.RepeatWrapping;
        alphaMapTexture.wrapT = THREE.RepeatWrapping;
        alphaMapTexture.repeat.set(4, 1); // Repeat the texture 4 times horizontally

        const material = new THREE.MeshStandardMaterial({
            color: 0x000000, // Set cylinder color to pure black as requested
            alphaMap: alphaMapTexture,
            transparent: true,
            alphaTest: 0.5, // Use alpha testing for sharp, binary cutouts
            side: THREE.DoubleSide,
            metalness: 0.2,
            roughness: 0.8,
        });

        cylinder = new THREE.Mesh(geometry, material);
        // cylinder.castShadow = true; // No shadows in this lighting model
        // cylinder.receiveShadow = true; 
        scene.add(cylinder);
    };

    const createOuterCasing = () => {
        const radius = 2.2;
        const height = 5.5;
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);

        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transmission: 1.0, // Fully transparent like glass
            opacity: 0.3,      // Slightly visible
            metalness: 0,
            roughness: 0.05,   // Very smooth for clear reflections
            ior: 1.5,          // Index of refraction for glass
            transparent: true,
            side: THREE.DoubleSide
        });

        const outerCasing = new THREE.Mesh(geometry, material);
        scene.add(outerCasing);
    };


    const animateThree = () => {
        // This function is the single animation loop now
        if (!isRunning) return;
        
        const delta = clock.getDelta();
        const rotationPerSecond = (2 * Math.PI * frequency) / slitCount;
        cylinder.rotation.y += rotationPerSecond * delta;

        // --- Artificial Strobe Logic ---
        const anglePerSlit = (2 * Math.PI) / slitCount;
        const currentAngle = cylinder.rotation.y;

        // Check if we've crossed the threshold for a new slit to trigger a flash
        if (Math.floor(currentAngle / anglePerSlit) > Math.floor(lastFlickerAngle / anglePerSlit)) {
            flashDuration = 2; // Set the flash to be active for 2 frames
        }
        lastFlickerAngle = currentAngle;

        // Execute the flash
        if (flashDuration > 0) {
            innerCylinder.material.color.set(0xFFE082); // Flash a warmer yellow
            flashDuration--;
        } else {
            innerCylinder.material.color.set(0x000000); // Return inner cylinder to black
        }
        
        // Render the scene via the composer to apply post-processing effects
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

    const startExperience = () => {
        if (isRunning) return;
        isRunning = true;
        
        // Start inactivity detection
        setupActivityListeners();
        startInactivityTimer();

        // Stop existing animation frame if any to prevent multiple loops
        cancelAnimationFrame(animationFrameId);

        // Always use 3D rendering for classic mode
        canvas.classList.add('hidden'); // Hide 2D canvas
        canvas.style.display = 'none';
        threeCanvas.classList.remove('hidden'); // Show 3D canvas
        threeCanvas.style.display = 'block';

        if (!scene) initThree(); // Initialize Three.js scene if not already
        animationFrameId = requestAnimationFrame(animateThree); // Start 3D animation loop

        // Start the audio and transport
        Tone.Transport.start();
        if (soundEnabled) {
            player.start();
        }
    };

    const stopExperience = () => {
        if (!isRunning) return;
        isRunning = false;
        
        removeActivityListeners();
        clearTimeout(inactivityTimer);
        showControls();
        cancelAnimationFrame(animationFrameId); // Stop current animation frame

        Tone.Transport.stop();
        player.stop();

        // Clear and dispose of Three.js resources
        if (renderer) {
            renderer.clear();
            if (scene) {
            scene.traverse(object => {
                if (object.isMesh) {
                        if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                            if(object.material.alphaMap) object.material.alphaMap.dispose(); // Dispose texture
                            if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
                            else object.material.dispose();
                    }
                }
            });
                scene.remove(...scene.children); // Remove all children from scene
            }
            renderer.dispose(); // Dispose renderer
        }
        // Set all Three.js related global variables to null after disposal
        scene = null;
        camera = null;
        renderer = null; // Important: set to null after dispose
        composer = null; // Ensure composer is nulled
        cylinder = null;
        innerCylinder = null;

        // Ensure 3D canvas is hidden
        threeCanvas.classList.add('hidden');
        threeCanvas.style.display = 'none';
    };

    const updateFrequency = () => {
        hzValue.textContent = `${frequency.toFixed(1)} Hz`;
        Tone.Transport.bpm.value = frequency * 60;
    };

    // --- UI and Application Flow ---
    const enterDreamachine = async () => {
        await Tone.start();
        console.log('Audio context started');
        onboardingContainer.classList.add('hidden'); // Hide the whole onboarding flow
        dreamachineContainer.classList.remove('hidden');
        window.addEventListener('resize', onWindowResize);
        setupActivityListeners();
        startInactivityTimer(); // Start the timer immediately
        updateFrequency(); // Set initial frequency
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
            onboardingContainer.classList.remove('hidden'); // Show onboarding again
            welcomeScreen.classList.add('active'); // Reset to first step
            disclaimerScreen.classList.remove('active');
            preparationScreen.classList.remove('active');
            document.body.style.cursor = 'auto';
        }, 4000);
    };

    // --- Event Listeners ---
    welcomeContinueBtn.addEventListener('click', () => {
        welcomeScreen.classList.remove('active');
        disclaimerScreen.classList.add('active');
    });
    
    disclaimerAgreeBtn.addEventListener('click', () => {
        disclaimerScreen.classList.remove('active');
        preparationScreen.classList.add('active');
    });

    beginExperienceBtn.addEventListener('click', enterDreamachine);

    exitButton.addEventListener('click', exitDreamachine);

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.textContent = soundEnabled ? 'On' : 'Off';
        if (isRunning) {
            if (soundEnabled && player.state !== 'started') {
                player.start();
            } else if (!soundEnabled && player.state === 'started') {
                player.stop();
            }
        }
    });

    freqSlider.addEventListener('input', (e) => {
        const freqIndex = parseInt(e.target.value);
        frequency = frequencies[freqIndex];
            updateFrequency();
    });

    // Handle window resizing
    const onWindowResize = () => {
        if (!isRunning) return;

        // Only need to handle the 3D canvas now
        if (scene && camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            
            // Adjust camera position based on screen width when resizing
            if (window.innerWidth <= 768) {
                camera.position.z = 5.0; // Further away on mobile for less zoom
            } else {
                camera.position.z = 3.5; // Closer on desktop for immersive feel
            }
            
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight); // Resize composer
        }
    };

    // Initialize
    // (no initial setup call, happens on start)
}); 