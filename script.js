const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 800;  // Keep width or adjust as preferred
canvas.height = 700; // Increase height for more vertical space

const GRAVITY = 0.5; // Adjust as needed for feel

// Placeholder sprite frame dimensions (adjust to your actual sprite sheets)
const INITIAL_MONSTER_SIZE = 50; // Collision box size
const MONSTER_FRAME_WIDTH = 64;
const MONSTER_FRAME_HEIGHT = 64;
const AI_ENEMY_FRAME_WIDTH = 60; // Placeholder
const AI_ENEMY_FRAME_HEIGHT = 30; // Placeholder
const PROJECTILE_FRAME_WIDTH = 10; // Placeholder
const PROJECTILE_FRAME_HEIGHT = 10; // Placeholder
const BUILDING_SPRITE_FRAME_WIDTH = 100; // Placeholder, actual width of one building state on sheet
const BUILDING_SPRITE_FRAME_HEIGHT = 150; // Placeholder, actual height of one building state on sheet

// Default Building Damage Frames Configuration
const defaultBuildingDamageFrames = {
    // sx, sy are top-left coords of the frame on the buildingSpriteSheet
    // Assumes frames are laid out horizontally. Adjust sx/sy based on your sheet.
    '100': { sx: 0 * BUILDING_SPRITE_FRAME_WIDTH, sy: 0 },   // Intact
    '75':  { sx: 1 * BUILDING_SPRITE_FRAME_WIDTH, sy: 0 },   // Light damage
    '50':  { sx: 2 * BUILDING_SPRITE_FRAME_WIDTH, sy: 0 },   // Medium damage
    '25':  { sx: 3 * BUILDING_SPRITE_FRAME_WIDTH, sy: 0 },   // Heavy damage
    '0':   { sx: 4 * BUILDING_SPRITE_FRAME_WIDTH, sy: 0 }    // Rubble/Destroyed
};

// Game State
let gameState = 'playing'; // Possible states: 'playing', 'gameOver'

// Score
let score = 0;

// --- Sprite Sheet Setup ---
let monster1SpriteSheet = null;
let monster2SpriteSheet = null;
let aiEnemySpriteSheet = null;
let projectileSpriteSheet = null;
let buildingSpriteSheet = null;    // New
// Add more for other entities (AI, effects) if needed later

// Function to load a sprite sheet image
function loadSpriteSheet(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            console.log(`Sprite sheet loaded successfully: ${url}`);
            resolve(image);
        };
        image.onerror = (error) => {
            console.error(`Error loading sprite sheet ${url}:`, error);
            reject(error); // Reject the promise if the image fails to load
        };
        image.src = url;
    });
}

// --- Web Audio API Setup ---
let audioCtx; // To be initialized on user interaction or page load

// Global variables for sound buffers
let sfxPunch = null;
let sfxBuildingDamage = null;
let sfxBuildingDestroyed = null; // Specific sound for final destruction
let sfxMonsterHit = null;
let sfxEnemyShoot = null;
let sfxEnemyDestroyed = null;   // Specific sound for AI enemy destruction

// Function to initialize AudioContext (must be called after user interaction)
function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext initialized.");
            // Resume context if it's in a suspended state (common in modern browsers)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.", e);
            // Fallback or disable audio if needed
        }
    }
    return audioCtx; // Return the context
}


// Function to load a sound file
async function loadSound(url) {
    if (!audioCtx) {
        // Try to initialize audio context if not already done.
        // This might not work if called without prior user interaction for audioCtx creation.
        initAudio();
    }
    if (!audioCtx) { // If still no audioCtx (e.g. API not supported, or not yet interacted)
        console.warn(`AudioContext not available. Cannot load sound: ${url}`);
        return null;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        console.log(`Sound loaded successfully: ${url}`);
        return audioBuffer;
    } catch (error) {
        console.error(`Error loading sound ${url}:`, error);
        return null; // Return null or a dummy buffer if loading fails
    }
}

// Placeholder image file paths (replace with your actual file paths)
const spriteSheetFiles = {
    monster1: 'img/monster1_sprites.png',
    monster2: 'img/monster2_sprites.png',
    aiEnemy: 'img/ai_helicopter.png',
    projectile: 'img/projectile_bullet.png',
    building: 'img/building_sprites.png' // New
};

async function initGraphics() {
    console.log("Loading graphics...");
    try {
        // Load sprite sheets and store them
        [
            monster1SpriteSheet,
            monster2SpriteSheet,
            aiEnemySpriteSheet,
            projectileSpriteSheet,
            buildingSpriteSheet   // Add this to destructuring assignment
        ] = await Promise.all([
            loadSpriteSheet(spriteSheetFiles.monster1),
            loadSpriteSheet(spriteSheetFiles.monster2),
            loadSpriteSheet(spriteSheetFiles.aiEnemy),
            loadSpriteSheet(spriteSheetFiles.projectile),
            loadSpriteSheet(spriteSheetFiles.building)    // Load building sprite
        ]);
        console.log("All sprite sheets attempted to load.");

        // Optional: Add checks and logs for new sprite sheets
        if (monster1SpriteSheet) console.log("Monster 1 sprite sheet ready.");
        else console.warn("Monster 1 sprite sheet failed to load.");
        if (monster2SpriteSheet) console.log("Monster 2 sprite sheet ready.");
        else console.warn("Monster 2 sprite sheet failed to load.");
        if (aiEnemySpriteSheet) console.log("AI Enemy sprite sheet ready.");
        else console.warn("AI Enemy sprite sheet failed to load.");
        if (projectileSpriteSheet) console.log("Projectile sprite sheet ready.");
        else console.warn("Projectile sprite sheet failed to load.");
        if (buildingSpriteSheet) console.log("Building sprite sheet ready."); // New log
        else console.warn("Building sprite sheet failed to load.");

    } catch (error) {
        console.error("An error occurred during parallel sprite sheet loading:", error);
    }
}

// Function to play a sound buffer
function playSound(buffer, volume = 1.0) {
    if (!buffer || !audioCtx || audioCtx.state === 'suspended') {
        // console.warn("Cannot play sound: AudioBuffer is null, AudioContext not ready, or suspended.");
        // Attempt to resume if suspended and called from user interaction context
        if (audioCtx && audioCtx.state === 'suspended') {
             audioCtx.resume().then(() => {
                if (audioCtx.state === 'running' && buffer) {
                    // console.log("AudioContext resumed, trying to play sound again.");
                    // Actually play now (code duplicated for clarity, can be refactored)
                    const source = audioCtx.createBufferSource();
                    source.buffer = buffer;
                    const gainNode = audioCtx.createGain();
                    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
                    source.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    source.start(0);
                }
             });
        }
        return;
    }
    if (audioCtx.state === 'running') { // Check if context is running
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;

        // Create a gain node for volume control
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime); // Set volume

        source.connect(gainNode); // Connect source to gain node
        gainNode.connect(audioCtx.destination); // Connect gain node to output (speakers)
        source.start(0); // Play the sound now
    }
}

// Attempt to initialize AudioContext on first keydown (a common user interaction)
// This helps with browser autoplay policies.
async function userInteractionListener() { // Make it async to await initSounds if needed
    if (!audioCtx || audioCtx.state === 'suspended') {
        console.log("User interaction detected, attempting to initialize/resume AudioContext.");
        initAudio();
    }
    if (audioCtx && audioCtx.state === 'running') { // Only load sounds if context is running
        // Load sounds first, or in parallel if preferred
        await initSounds();
    } else {
        console.warn("AudioContext not running after user interaction. Sounds not loaded yet.");
    }

    // Load graphics regardless of audio state, but after interaction
    await initGraphics();

    // Event listeners are automatically removed due to { once: true }
}
window.addEventListener('keydown', userInteractionListener, { once: true });
window.addEventListener('click', userInteractionListener, { once: true });

// Placeholder sound file paths (replace with your actual file paths)
const soundFiles = {
    punch: 'sfx/punch.wav',
    buildingDamage: 'sfx/building_damage.wav',
    buildingDestroyed: 'sfx/building_destroyed.wav',
    monsterHit: 'sfx/monster_hit.wav',
    enemyShoot: 'sfx/enemy_shoot.wav',
    enemyDestroyed: 'sfx/enemy_destroyed.wav'
};

async function initSounds() {
    // Ensure AudioContext is ready or try to initialize it.
    if (!audioCtx || audioCtx.state !== 'running') {
        console.log("AudioContext not running, attempting to initialize/resume for sound loading.");
        initAudio();
        if (!audioCtx || audioCtx.state !== 'running') {
             console.warn("AudioContext is not active. Sounds may not load or play.");
        }
    }

    console.log("Loading sounds...");
    try {
        [
            sfxPunch,
            sfxBuildingDamage,
            sfxBuildingDestroyed,
            sfxMonsterHit,
            sfxEnemyShoot,
            sfxEnemyDestroyed
        ] = await Promise.all([
            loadSound(soundFiles.punch),
            loadSound(soundFiles.buildingDamage),
            loadSound(soundFiles.buildingDestroyed),
            loadSound(soundFiles.monsterHit),
            loadSound(soundFiles.enemyShoot),
            loadSound(soundFiles.enemyDestroyed)
        ]);
        console.log("All sounds attempted to load.");
    } catch (error) {
        console.error("An error occurred during parallel sound loading:", error);
    }

    if (sfxPunch) {
        console.log("Punch sound is ready.");
    } else {
        console.warn("Punch sound failed to load or AudioContext was not ready.");
    }
}

// Monster Class
class Monster {
    constructor(x, y, initialSize, color, speed, key_config, punch_key_code, spriteSheet = null, frameWidth = 0, frameHeight = 0) {
        this.x = x;
        this.y = y;
        this.size = initialSize; // This might represent collision box size or drawing scale
        this.color = color;      // Fallback color if sprite fails to load or for collision box
        this.speed = speed;

        // Health and defeat state
        this.initialHealth = 100;
        this.currentHealth = this.initialHealth;
        this.isDefeated = false;
        this.invulnerableTime = 0;
        this.invulnerabilityDuration = 60;

        // Controls configuration
        this.key_config = key_config;
        this.punch_key_code = punch_key_code;

        // Punching state (optional, for animation or cooldown)
        this.isPunching = false;
        this.punchDuration = 30; // e.g., 0.5 seconds at 60fps
        this.punchTimer = 0;

        // Climbing state
        this.isClimbing = false;

        // --- New Sprite and Animation Properties ---
        this.spriteSheet = spriteSheet;         // The loaded Image object for the sprite sheet
        this.frameWidth = frameWidth;           // Width of a single frame in the sprite sheet
        this.frameHeight = frameHeight;         // Height of a single frame in the sprite sheet

        this.currentFrame = 0;                  // Current frame index in an animation sequence
        this.isMoving = false;                  // Is the monster currently moving (for walk/idle animation)
        this.facingDirection = 'right';         // 'left' or 'right', for flipping sprite if needed

        // --- New Animation System Properties ---
        this.animations = {
            // Placeholder: these values (rowIndex, frameCount, frameInterval)
            // MUST be updated to match your actual sprite sheet layout.
            'idle':     { rowIndex: 0, frameCount: 2, frameInterval: 20, loop: true },
            'walk':     { rowIndex: 1, frameCount: 4, frameInterval: 10, loop: true },
            'punch':    { rowIndex: 2, frameCount: 3, frameInterval: 7,  loop: false },
            'climb':    { rowIndex: 3, frameCount: 2, frameInterval: 15, loop: true },
            'hit':      { rowIndex: 4, frameCount: 1, frameInterval: 10, loop: false },
            'defeated': { rowIndex: 5, frameCount: 1, frameInterval: 1,  loop: false }
        };
        this.currentAnimation = 'idle'; // Start with idle animation
        // Ensure the currentAnimation exists in the animations object before trying to access its properties
        if (!this.animations[this.currentAnimation]) {
            console.error(`Animation "${this.currentAnimation}" not found! Defaulting to first animation or static frame.`);
            // Fallback to the first defined animation or a default if currentAnimation is invalid
            const firstAnimName = Object.keys(this.animations)[0];
            if (firstAnimName) {
                this.currentAnimation = firstAnimName;
            } else { // No animations defined, fallback to static
                this.animations[this.currentAnimation] = { rowIndex:0, frameCount: 1, frameInterval: 100, loop: true};
            }
        }
        this.animationFrameCount = this.animations[this.currentAnimation].frameCount;
        this.frameInterval = this.animations[this.currentAnimation].frameInterval;
        this.frameTimer = 0;
    }

    draw(ctx) {
        const currentAnimConfig = this.animations[this.currentAnimation];

        if (this.isDefeated) {
            if (this.spriteSheet && this.frameWidth > 0 && this.frameHeight > 0 && currentAnimConfig && this.currentAnimation === 'defeated') {
                const sourceX = this.currentFrame * this.frameWidth;
                const sourceY = currentAnimConfig.rowIndex * this.frameHeight;
                const drawWidth = this.frameWidth;
                const drawHeight = this.frameHeight;

                if (this.facingDirection === 'left') {
                    ctx.save(); ctx.scale(-1, 1);
                    ctx.drawImage(this.spriteSheet, sourceX, sourceY, this.frameWidth, this.frameHeight, -(this.x + drawWidth), this.y, drawWidth, drawHeight);
                    ctx.restore();
                } else {
                    ctx.drawImage(this.spriteSheet, sourceX, sourceY, this.frameWidth, this.frameHeight, this.x, this.y, drawWidth, drawHeight);
                }
            } else {
                ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
                ctx.fillRect(this.x, this.y, this.size, this.size);
            }
            return;
        }

        if (this.spriteSheet && this.frameWidth > 0 && this.frameHeight > 0) {
            if (!currentAnimConfig) {
                console.warn(`Monster ${this.color} has invalid currentAnimation: ${this.currentAnimation}. Drawing fallback rectangle.`);
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.size, this.size);
            } else {
                let sourceX = this.currentFrame * this.frameWidth;
                let sourceY = currentAnimConfig.rowIndex * this.frameHeight; // DYNAMIC sourceY

                const drawWidth = this.frameWidth;
                const drawHeight = this.frameHeight;

                if (this.facingDirection === 'left') {
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.drawImage(
                        this.spriteSheet,
                        sourceX, sourceY, this.frameWidth, this.frameHeight,
                        -(this.x + drawWidth), this.y, drawWidth, drawHeight
                    );
                    ctx.restore();
                } else { // Facing right
                    ctx.drawImage(
                        this.spriteSheet,
                        sourceX, sourceY, this.frameWidth, this.frameHeight,
                        this.x, this.y, drawWidth, drawHeight
                    );
                }

                if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime / 6) % 2 === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.fillRect(this.x, this.y, drawWidth, drawHeight);
                }
            }
        } else {
            let effectiveColor = this.color;
            if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime / 6) % 2 === 0) {
                effectiveColor = 'white';
            }
            ctx.fillStyle = effectiveColor;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }

        // Health Bar (draw only if not defeated, which is handled by the early return in isDefeated block)
        const healthBarDisplayX = this.x;
        const healthBarDisplayWidth = (this.spriteSheet && this.frameWidth > 0) ? this.frameWidth : this.size;
        const healthBarHeight = 5;
        const healthBarY = this.y - healthBarHeight - 2;

        ctx.fillStyle = 'grey';
        ctx.fillRect(healthBarDisplayX, healthBarY, healthBarDisplayWidth, healthBarHeight);

        const currentHealthWidth = healthBarDisplayWidth * (this.currentHealth / this.initialHealth);
        let healthBarColor = 'green';
        if (this.currentHealth / this.initialHealth < 0.3) healthBarColor = 'red';
        else if (this.currentHealth / this.initialHealth < 0.6) healthBarColor = 'orange';

        ctx.fillStyle = healthBarColor;
        ctx.fillRect(healthBarDisplayX, healthBarY, currentHealthWidth, healthBarHeight);
    }

    takeDamage(amount) {
        if (this.invulnerableTime > 0 || this.isDefeated) return;

        this.currentHealth -= amount;
        playSound(sfxMonsterHit);

        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            this.isDefeated = true;
            this.setCurrentAnimation('defeated');
            console.log(`Monster (color: ${this.color}) has been defeated! Score: ${score}`);
        } else {
            if (!this.isPunching) {
                this.setCurrentAnimation('hit');
            }
            this.invulnerableTime = this.invulnerabilityDuration;
        }
    }

    update(current_key_state) {
        // 1. Handle Defeated State
        if (this.isDefeated) {
            this.setCurrentAnimation('defeated');
            this.updateAnimationFrame(); // Update frame for defeated pose/animation
            return; // No other logic if defeated
        }

        // 2. Handle Invulnerability / 'hit' animation state
        if (this.invulnerableTime > 0) {
            this.invulnerableTime--;
            // If 'hit' animation is active and invulnerability just ended,
            // set flag and immediately transition to 'idle' to allow other actions.
            if (this.currentAnimation === 'hit' && this.invulnerableTime === 0) {
                this.setCurrentAnimation('idle'); // <<< ***** ADDED/MODIFIED LINE *****
            }
        }

        // 3. Handle Punching State & Animation
        if (this.isPunching) {
            if (this.currentAnimation !== 'hit') { // 'hit' can interrupt 'punch' visual if damage taken while punching
                 this.setCurrentAnimation('punch');
            }
            this.punchTimer++;
            if (this.punchTimer >= this.punchDuration) {
                this.isPunching = false;
                this.punchTimer = 0;
                if (this.currentAnimation === 'punch') {
                    this.setCurrentAnimation('idle');
                }
            }
        }

        // 4. Determine Movement-Based Animation State
        if (!this.isPunching && !(this.currentAnimation === 'hit' && this.invulnerableTime > 0)) {
            // This block is now entered if not punching AND not actively in 'hit' stun.
            this.isMoving = false;

            // Horizontal Movement
                if (current_key_state[this.key_config.left] && this.x > 0) {
                    this.x -= this.speed; this.facingDirection = 'left'; this.isMoving = true;
                }
                if (current_key_state[this.key_config.right] && this.x < canvas.width - this.size) {
                    this.x += this.speed; this.facingDirection = 'right'; this.isMoving = true;
                }

                // Vertical Movement & Climbing State
            this.isClimbing = false; // Reset before checks
                let collidingBuilding = null;
            // --- Add Temp Log Before Loop ---
            // console.log(`[CLIMB_DEBUG] Monster ${this.color} - Pre-climb check. X: ${this.x.toFixed(1)}, Y: ${this.y.toFixed(1)}, Size: ${this.size}, CurrentAnim: ${this.currentAnimation}, IsPunching: ${this.isPunching}, InvulnerableTime: ${this.invulnerableTime}`);

                for (const building of buildings) {
                if (building.isDestroyed()) continue; // Skip destroyed buildings

                const collisionResult = checkCollision(this, building);
                const verticalOverlapCheck = (this.y + this.size > building.y && this.y < building.y + building.height);

                // --- Add Temp Log Inside Loop ---
                // if (this.color === 'purple') { // Log only for monster1 to reduce spam, or remove conditional
                //     console.log(`[CLIMB_DEBUG] Checking building at X: ${building.x.toFixed(1)} Y: ${building.y.toFixed(1)} W: ${building.width} H: ${building.height}`);
                //     console.log(`[CLIMB_DEBUG]   checkCollision: ${collisionResult}, verticalOverlap: ${verticalOverlapCheck}`);
                //     console.log(`[CLIMB_DEBUG]   Monster Y: ${this.y.toFixed(1)}, Monster Bottom: ${(this.y + this.size).toFixed(1)}, Building Top: ${building.y.toFixed(1)}, Building Bottom: ${(building.y + building.height).toFixed(1)}`);
                // }

                if (collisionResult && verticalOverlapCheck) {
                    this.isClimbing = true;
                    collidingBuilding = building;
                    // --- Add Temp Log on Successful Climb Condition Met ---
                    console.log(`[CLIMB_SUCCESS] Monster ${this.color} IS NOW CLIMBING building at X: ${building.x.toFixed(1)}`);
                    break;
                    }
                }

            // --- Add Temp Log After Loop ---
            // console.log(`[CLIMB_DEBUG] Monster ${this.color} - Post-climb check. isClimbing: ${this.isClimbing}`);

                if (this.isClimbing && collidingBuilding) {
                    this.isMoving = true;
                    this.setCurrentAnimation('climb');
                    if (current_key_state[this.key_config.up] && this.y > 0) {
                        this.y -= this.speed; if (this.y < collidingBuilding.y) this.y = collidingBuilding.y;
                    }
                    if (current_key_state[this.key_config.down] && this.y < canvas.height - this.size) {
                        this.y += this.speed; if (this.y + this.size > collidingBuilding.y + collidingBuilding.height) this.y = collidingBuilding.y + collidingBuilding.height - this.size;
                    }
                } else { // Not climbing
                    this.y += GRAVITY * 5;
                    if (this.isMoving) {
                        this.setCurrentAnimation('walk');
                    } else {
                        this.setCurrentAnimation('idle');
                    }
                }

                // Boundary and Ground checks for Y
                if (this.y < 0) this.y = 0;
                if (this.y > canvas.height - this.size) {
                    this.y = canvas.height - this.size;
                    if (!this.isClimbing) {
                        if (this.isMoving) this.setCurrentAnimation('walk');
                        else this.setCurrentAnimation('idle');
                    }
                }
            }
        }

        this.updateAnimationFrame();
    }

    punch() {
        // Guard to prevent re-punching during an active punch animation/action
        if (this.isPunching && this.punchTimer < this.punchDuration) {
           return;
        }

        playSound(sfxPunch);
        this.isPunching = true;
        this.punchTimer = 0;
        this.setCurrentAnimation('punch');

        console.log(`[LOG] Monster ${this.color} PUNCH action. PunchingPower: ${this.punchingPower}`);

        let hitBuilding = false;
        for (const building of buildings) {
            if (!building.isDestroyed() && checkCollision(this, building)) {
                // --- Detailed Log for Building Hit ---
                console.log(`[LOG] Monster ${this.color} attempting to damage Building.`);
                console.log(`[LOG]   Building Initial Health: ${building.initialHealth}, Current Health (before): ${building.currentHealth}`);
                console.log(`[LOG]   Monster Punching Power: ${this.punchingPower}`);
                // --- End Detailed Log ---

                building.takeDamage(this.punchingPower);
                hitBuilding = true;
            }
        }

        let hitAIEnemy = false;
        for (const aiEnemy of aiEnemies) {
            if (!aiEnemy.isDestroyed() && checkCollision(this, aiEnemy)) {
                // Log for AI enemy hit (can be less verbose for this bug)
                // console.log(`[LOG] Monster ${this.color} hitting AIEnemy. AI Health (before): ${aiEnemy.currentHealth}`);
                aiEnemy.takeDamage(this.punchingPower);
                hitAIEnemy = true;
            }
        }

        // if (!hitBuilding && !hitAIEnemy) {
        //     console.log(`[LOG] Monster ${this.color} punch missed or hit only already destroyed targets.`);
        // }
    }

    setCurrentAnimation(newAnimationName) {
        // Ensure the animation exists in our definition to prevent errors
        if (!this.animations[newAnimationName]) {
            console.warn(`Animation "${newAnimationName}" not found for monster ${this.color}. Current animation: ${this.currentAnimation}`);
            // Fallback: ensure current animation's properties are set if the new one is invalid
            const animConfig = this.animations[this.currentAnimation];
            if (animConfig) { // If currentAnimation itself was valid
                this.animationFrameCount = animConfig.frameCount;
                this.frameInterval = animConfig.frameInterval;
            } else { // Absolute fallback if currentAnimation was also somehow invalid
                this.animationFrameCount = 1; // Default to a single frame
                this.frameInterval = 100;     // Default to a slow interval
                console.error(`Monster ${this.color} has no valid current animation and "${newAnimationName}" is also invalid.`);
            }
            return;
        }

        if (this.currentAnimation !== newAnimationName) {
            this.currentAnimation = newAnimationName;
            this.currentFrame = 0; // Reset frame for the new animation
            const animConfig = this.animations[this.currentAnimation];
            this.animationFrameCount = animConfig.frameCount;
            this.frameInterval = animConfig.frameInterval;
            this.frameTimer = 0;    // Reset timer for the new animation's interval
            // console.log(`Monster ${this.color} animation changed to: ${this.currentAnimation}`);
        }
    }

    updateAnimationFrame() {
        // Get the configuration for the current animation
        const currentAnimConfig = this.animations[this.currentAnimation];

        if (!currentAnimConfig) return; // No animation config found for current state

        const loopAnimation = currentAnimConfig.loop !== undefined ? currentAnimConfig.loop : true;
        const frameCount = currentAnimConfig.frameCount;
        const frameInterval = currentAnimConfig.frameInterval;

        if (frameCount <= 1) return; // Single frame animation, no progression needed.

        // If animation is non-looping and has already reached its last frame, stay there.
        if (!loopAnimation && this.currentFrame === frameCount - 1) {
            return;
        }

        // Increment frame timer
        this.frameTimer++;

        // Check if it's time to advance to the next frame
        if (this.frameTimer >= frameInterval) {
            this.frameTimer = 0; // Reset timer

            // Advance the frame
            this.currentFrame++;

            // If the animation loops and currentFrame exceeds frameCount, reset to 0
            if (this.currentFrame >= frameCount) {
                if (loopAnimation) {
                    this.currentFrame = 0;
                } else {
                    // If it doesn't loop, clamp to the last frame
                    this.currentFrame = frameCount - 1;
                }
            }
        }
    }
}

// Projectile Class (fired by AIEnemies)
class Projectile {
    constructor(x, y, initialSize, color, speedY, damage, spriteSheet = null, frameWidth = 0, frameHeight = 0) {
        this.x = x;
        this.y = y;
        this.size = initialSize; // Collision box size (assuming square)
        this.color = color;      // Fallback color
        this.speedY = speedY;
        this.damage = damage;

        // New sprite properties
        this.spriteSheet = spriteSheet;
        this.frameWidth = frameWidth;   // Width of a single frame (likely the whole image for a simple projectile)
        this.frameHeight = frameHeight; // Height of a single frame
        this.currentFrame = 0;          // Default to frame 0, if sprite sheet has multiple frames (e.g., for animation)
                                        // For a static projectile sprite, this will just be 0.
    }

    draw(ctx) {
        if (this.spriteSheet && this.frameWidth > 0 && this.frameHeight > 0) {
            // Draw sprite
            const sourceX = this.currentFrame * this.frameWidth; // currentFrame is likely always 0 for static projectile
            const sourceY = 0; // Assuming sprite is in the first row

            // Visual size is determined by sprite frame dimensions
            const drawWidth = this.frameWidth;
            const drawHeight = this.frameHeight;

            ctx.drawImage(this.spriteSheet, sourceX, sourceY, this.frameWidth, this.frameHeight,
                          this.x, this.y, drawWidth, drawHeight);
        } else {
            // Fallback to drawing a rectangle
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size); // Use collision box 'size'
        }
    }

    update() {
        this.y += this.speedY; // Move downwards
    }
}

// AIEnemy Class
class AIEnemy {
    constructor(x, y, initialWidth, initialHeight, color, speed, health,
                spriteSheet = null, frameWidth = 0, frameHeight = 0,
                animationFrameCount = 1, frameInterval = 20) { // Added animationFrameCount, frameInterval
        this.x = x;
        this.y = y;
        this.width = initialWidth;   // Collision box width
        this.height = initialHeight; // Collision box height
        this.color = color;          // Fallback color
        this.speed = speed;
        this.initialHealth = health;
        this.currentHealth = health;
        this.direction = 1;
        this.fireCooldown = 0;
        this.fireRate = 120;

        this.spriteSheet = spriteSheet;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.currentFrame = 0;

        // --- New Animation Properties ---
        this.animationFrameCount = animationFrameCount; // Total frames for its main animation (e.g., rotor)
        this.frameTimer = 0;                            // Timer to control animation speed
        this.frameInterval = frameInterval;             // Update frame every X game loops
    }

    draw(ctx) {
        if (this.spriteSheet && this.frameWidth > 0 && this.frameHeight > 0) {
            // Draw sprite
            const sourceX = this.currentFrame * this.frameWidth; // Assuming currentFrame is 0 for static sprite for now
            const sourceY = 0; // Assuming sprite is in the first row

            // Visual size is determined by sprite frame dimensions
            const drawWidth = this.frameWidth;
            const drawHeight = this.frameHeight;

            if (this.direction === -1) { // Example: if moving left and sprite needs to flip (helicopter might not)
                // For now, default: no flip, or sprite sheet handles directions
                ctx.drawImage(this.spriteSheet, sourceX, sourceY, this.frameWidth, this.frameHeight,
                              this.x, this.y, drawWidth, drawHeight);
            } else { // Facing right or default
                ctx.drawImage(this.spriteSheet, sourceX, sourceY, this.frameWidth, this.frameHeight,
                              this.x, this.y, drawWidth, drawHeight);
            }

        } else {
            // Fallback to drawing a rectangle
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height); // Use collision box dimensions
        }

        // Health Bar Logic (adjust to sprite's visual position and width)
        const displayWidth = (this.spriteSheet && this.frameWidth > 0) ? this.frameWidth : this.width;
        if (this.currentHealth > 0) {
            const healthBarHeight = 4;
            const healthBarX = this.x; // Health bar aligns with sprite's x
            const healthBarY = this.y - healthBarHeight - 2;

            ctx.fillStyle = 'grey';
            ctx.fillRect(healthBarX, healthBarY, displayWidth, healthBarHeight);

            const currentHealthPercentage = this.currentHealth / this.initialHealth;
            let healthBarColor = 'green';
            if (currentHealthPercentage < 0.3) healthBarColor = 'red';
            else if (currentHealthPercentage < 0.6) healthBarColor = 'orange';

            ctx.fillStyle = healthBarColor;
            ctx.fillRect(healthBarX, healthBarY, displayWidth * currentHealthPercentage, healthBarHeight);
        }
    }

    update() {
        if (this.isDestroyed()) {
            // If destroyed, do nothing further in the update loop.
            // It will be removed from the game in the main gameLoop.
            return;
        }

        // --- Existing movement logic ---
        this.x += this.speed * this.direction;
        if (this.x + this.width > canvas.width || this.x < 0) {
            this.direction *= -1;
            // Optional: move down a bit when changing direction
            // this.y += 10; if (this.y + this.height > canvas.height / 2) this.y = 50;
        }
        // --- End of existing movement logic ---

        // --- Existing firing logic ---
        if (this.fireCooldown <= 0) {
            const projectileX = this.x + this.width / 2 - (PROJECTILE_FRAME_WIDTH / 2); // Center based on sprite
            const projectileY = this.y + this.height;

            enemyProjectiles.push(new Projectile(
                projectileX, projectileY,
                8, 'yellow', 4, 10, // initialSize (collision: 8x8), color, speedY, damage
                projectileSpriteSheet, PROJECTILE_FRAME_WIDTH, PROJECTILE_FRAME_HEIGHT // sprite info
            ));
            playSound(sfxEnemyShoot); // Play enemy SHOOT sound
            // console.log(`AIEnemy at ${this.x.toFixed(0)} fires!`);
            this.fireCooldown = this.fireRate;
        } else {
            this.fireCooldown--;
        }
        // --- End of existing firing logic ---

        // --- Call to update animation frame ---
        this.updateAnimationFrame(); // Add this line
    }

    takeDamage(amount) {
        if (this.isDestroyed()) return; // Already destroyed and points should have been awarded

        this.currentHealth -= amount;

        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            score += 50; // Add 50 points
            console.log("AIEnemy defeated! Score: " + score);
            playSound(sfxEnemyDestroyed); // Play AI ENEMY DESTRUCTION sound
        }
        // console.log("AIEnemy health:", this.currentHealth); // Original log can be kept if needed for debugging health changes
    }

    updateAnimationFrame() {
        // Only animate if there's more than one frame defined for this AI Enemy
        if (this.animationFrameCount <= 1) {
            // If only one frame (or less), no animation progression needed.
            // currentFrame will remain 0 (or its initial value).
            return;
        }

        // Increment frame timer
        this.frameTimer++;

        // Check if it's time to advance to the next frame
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0; // Reset timer

            // Advance the frame
            this.currentFrame++;

            // If the animation loops (which is assumed for AIEnemy's single animation)
            // and currentFrame exceeds frameCount, reset to 0.
            if (this.currentFrame >= this.animationFrameCount) {
                this.currentFrame = 0; // Loop back to the first frame
            }
        }
    }

    isDestroyed() {
        return this.currentHealth <= 0;
    }
}

// Building Class
class Building {
    constructor(x, y, width, height, initialHealth = 100,
                spriteSheet = null, frameWidth = 0, frameHeight = 0, damageFramesConfig = null) {
        this.x = x;
        this.y = y;
        this.width = width;           // Collision box width
        this.height = height;         // Collision box height
        this.initialHealth = initialHealth;
        this.currentHealth = initialHealth;
        // this.color = 'gray'; // Will be replaced by sprite logic mostly
        // this.destroyedColor = '#555';
        // this.damageColor = 'orange';

        // New Sprite Properties
        this.spriteSheet = spriteSheet;
        this.frameWidth = frameWidth;       // Width of a single building state frame/sprite
        this.frameHeight = frameHeight;     // Height of a single building state frame/sprite

        this.damageFramesConfig = damageFramesConfig || {
            '100': { sx: 0, sy: 0 },
            '0':   { sx: 0, sy: 0 }
        };
    }

    draw(ctx) {
        if (this.spriteSheet && this.frameWidth > 0 && this.frameHeight > 0 && this.damageFramesConfig) {
            let sourceX = 0;
            let sourceY = 0;

            const healthPercentage = (this.currentHealth / this.initialHealth) * 100;
            let chosenFrameKey = '0';

            const sortedNumericThresholds = Object.keys(this.damageFramesConfig)
                                               .map(Number)
                                               .sort((a, b) => a - b); // Sort ascending: [0, 25, 50, 75, 100]

            if (sortedNumericThresholds.length > 0) {
                chosenFrameKey = String(sortedNumericThresholds[sortedNumericThresholds.length - 1]); // Default to highest (e.g. '100')
                for (const threshold of sortedNumericThresholds) {
                    if (healthPercentage <= threshold) {
                        chosenFrameKey = String(threshold);
                        break;
                    }
                }
            }

            const frameInfo = this.damageFramesConfig[chosenFrameKey];
            if (frameInfo) {
                sourceX = frameInfo.sx;
                sourceY = frameInfo.sy;
            } else {
                const fallbackFrameConf = this.damageFramesConfig['100'] || this.damageFramesConfig['0'] || this.damageFramesConfig[Object.keys(this.damageFramesConfig)[0]];
                if(fallbackFrameConf){
                    sourceX = fallbackFrameConf.sx;
                    sourceY = fallbackFrameConf.sy;
                }
            }

            ctx.drawImage(
                this.spriteSheet,
                sourceX, sourceY,
                this.frameWidth, this.frameHeight,
                this.x, this.y,
                this.frameWidth, this.frameHeight
            );

        } else {
            // Fallback to drawing a colored rectangle
            let color = 'grey';
            const healthPercent = this.currentHealth / this.initialHealth;
            if (this.isDestroyed()) {
                color = '#555';
            } else if (healthPercent < 0.3) {
                color = '#A52A2A';
            } else if (healthPercent < 0.7) {
                color = '#D2B48C';
            }
            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        if (!this.isDestroyed()) {
            const healthBarWidth = this.width;
            const healthBarHeight = 5;
            const healthBarX = this.x;
            const healthBarY = this.y - healthBarHeight - 3;

            ctx.fillStyle = 'grey';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

            const currentHealthPercentage = this.currentHealth / this.initialHealth;
            let healthBarColor = 'green';
            if (currentHealthPercentage < 0.3) healthBarColor = 'red';
            else if (currentHealthPercentage < 0.6) healthBarColor = 'orange';

            ctx.fillStyle = healthBarColor;
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth * currentHealthPercentage, healthBarHeight);
        }
    }

    takeDamage(amount) {
        // --- Ensure numeric values ---
        const numericAmount = Number(amount);
        if (isNaN(numericAmount)) {
            console.error(`[FIX][Building.takeDamage] Invalid damage amount received: ${amount}. Aborting damage.`);
            return;
        }
        if (numericAmount <= 0) { // Also ignore 0 or negative damage
            // console.log(`[LOG][Building.takeDamage] Non-positive damage amount received: ${numericAmount}. No damage taken.`);
            return;
        }

        // Ensure currentHealth is a number before proceeding.
        this.currentHealth = Number(this.currentHealth);
        if (isNaN(this.currentHealth)) {
            console.error(`[FIX][Building.takeDamage] Building currentHealth was NaN for building at X:${this.x}. Resetting to initialHealth.`);
            this.currentHealth = Number(this.initialHealth);
             if (isNaN(this.currentHealth)) {
                console.error(`[FIX][Building.takeDamage] Building initialHealth is also NaN for building at X:${this.x}. Cannot apply damage.`);
                return;
            }
        }
        // --- End Ensure numeric values ---

        console.log(`[LOG][Building.takeDamage] Called. Building X: ${this.x}, Amount: ${numericAmount}, Current Health (at entry): ${this.currentHealth}`);

        if (this.isDestroyed()) { // isDestroyed uses currentHealth, so it's after numeric conversion
            console.log(`[LOG][Building.takeDamage]   Already destroyed. No action.`);
            return;
        }

        console.log(`[LOG][Building.takeDamage]   Initial Health: ${this.initialHealth}, Current Health (before subtract): ${this.currentHealth}`);
        this.currentHealth -= numericAmount;
        console.log(`[LOG][Building.takeDamage]   Current Health (after subtract): ${this.currentHealth}`);

        if (this.currentHealth <= 0) {
            this.currentHealth = 0; // Clamp health at 0
            score += 100;
            console.log(`[LOG][Building.takeDamage]   DESTROYED by this hit! Score: ${score}. Final Health: ${this.currentHealth}`);
            playSound(sfxBuildingDestroyed);
        } else {
            console.log(`[LOG][Building.takeDamage]   Damaged, not destroyed. Current Health: ${this.currentHealth}`);
            playSound(sfxBuildingDamage);
        }
    }

    isDestroyed() {
        return this.currentHealth <= 0;
    }
}

/**
 * Retrieves the current comprehensive state of the game.
 * This function is intended for use by external controllers or AI (e.g., an LLM)
 * to get a snapshot of all relevant game entities and statuses.
 *
 * @returns {Object} An object containing the game state.
 * Example structure:
 * {
 *   timestamp: Number, // Current timestamp
 *   overallState: String, // 'playing' or 'gameOver'
 *   score: Number,
 *   canvas: { width: Number, height: Number },
 *   monsters: [
 *     { id: String, x: Number, y: Number, size: Number, currentHealth: Number, ... },
 *     // ... (monster2 data)
 *   ],
 *   buildings: [
 *     { x: Number, y: Number, width: Number, height: Number, currentHealth: Number, spriteFrameKey: String, ... },
 *     // ... (other buildings)
 *   ],
 *   aiEnemies: [
 *     { x: Number, y: Number, width: Number, height: Number, currentHealth: Number, ... },
 *     // ... (other AI enemies)
 *   ],
 *   enemyProjectiles: [
 *     { x: Number, y: Number, size: Number, ... },
 *     // ... (other projectiles)
 *   ]
 * }
 */
function getGameState() {
    const gameStateData = {
        timestamp: Date.now(),
        overallState: gameState, // 'playing', 'gameOver'
        score: score,
        canvas: {
            width: canvas.width,
            height: canvas.height
        },
        monsters: [],
        buildings: [],
        aiEnemies: [],
        enemyProjectiles: []
    };

    // Helper to get common monster data
    const getMonsterData = (m) => {
        if (!m) return null;
        return {
            id: (m === monster) ? 'monster1' : 'monster2',
            x: m.x,
            y: m.y,
            size: m.size, // Collision box size
            currentHealth: m.currentHealth,
            initialHealth: m.initialHealth,
            isDefeated: m.isDefeated,
            isClimbing: m.isClimbing,
            isPunching: m.isPunching,
            facingDirection: m.facingDirection,
            currentAnimation: m.currentAnimation,
        };
    };

    if (typeof monster !== 'undefined' && monster) gameStateData.monsters.push(getMonsterData(monster));
    if (typeof monster2 !== 'undefined' && monster2) gameStateData.monsters.push(getMonsterData(monster2));

    if (typeof buildings !== 'undefined') {
        buildings.forEach(b => {
            let chosenFrameKey = '0';
            if (b.damageFramesConfig) {
                 const healthPercentage = (b.currentHealth / b.initialHealth) * 100;
                 const sortedNumericThresholds = Object.keys(b.damageFramesConfig)
                                           .map(Number)
                                           .sort((a, b) => a - b);
                if (sortedNumericThresholds.length > 0) {
                    chosenFrameKey = String(sortedNumericThresholds[sortedNumericThresholds.length - 1]);
                    for (const threshold of sortedNumericThresholds) {
                        if (healthPercentage <= threshold) {
                            chosenFrameKey = String(threshold);
                            break;
                        }
                    }
                }
            }
            const frameInfo = b.damageFramesConfig ? b.damageFramesConfig[chosenFrameKey] : null;

            gameStateData.buildings.push({
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
                currentHealth: b.currentHealth,
                initialHealth: b.initialHealth,
                isDestroyed: b.isDestroyed(),
                spriteFrameKey: chosenFrameKey,
                spriteSourceX: frameInfo ? frameInfo.sx : null,
                spriteSourceY: frameInfo ? frameInfo.sy : null,
            });
        });
    }

    if (typeof aiEnemies !== 'undefined') {
        aiEnemies.forEach(ai => {
            gameStateData.aiEnemies.push({
                x: ai.x,
                y: ai.y,
                width: ai.width,
                height: ai.height,
                currentHealth: ai.currentHealth,
                initialHealth: ai.initialHealth,
                isDestroyed: ai.isDestroyed(),
                direction: ai.direction,
            });
        });
    }

    if (typeof enemyProjectiles !== 'undefined') {
        enemyProjectiles.forEach(p => {
            gameStateData.enemyProjectiles.push({
                x: p.x,
                y: p.y,
                size: p.size,
            });
        });
    }

    return gameStateData;
}

/**
 * Allows external control of player monster actions.
 * This function simulates player input for specified monsters.
 *
 * @param {String} monsterId - The ID of the monster to control ('monster1' or 'monster2').
 * @param {String} actionName - The action to perform. Valid actions:
 *   'left', 'right', 'up', 'down' (for movement).
 *   'punch' (for attacking).
 * @param {String} eventType - The type of event to simulate:
 *   'press': Simulates a key being pressed down (for movement actions, continues until 'release').
 *            For 'punch', 'press' acts as a single trigger.
 *   'release': Simulates a key being released (for movement actions, stops continuous movement).
 *              Not typically used for 'punch'.
 *   'trigger': For one-shot actions like 'punch'. Effectively same as 'press' for 'punch'.
 *
 * @example
 * // Make monster1 start moving left
 * executeMonsterAction('monster1', 'left', 'press');
 *
 * // Make monster1 stop moving left
 * executeMonsterAction('monster1', 'left', 'release');
 *
 * // Make monster2 punch
 * executeMonsterAction('monster2', 'punch', 'trigger');
 */
// Function to allow external control of monster actions
function executeMonsterAction(monsterId, actionName, eventType) {
    let targetMonster = null;
    let keyStateObject = null;
    let keyConfig = null;

    if (monsterId === 'monster1' && typeof monster !== 'undefined') {
        targetMonster = monster;
        keyStateObject = keys; // Global 'keys' for player 1
        keyConfig = monster1_key_config; // Global config for player 1 keys
    } else if (monsterId === 'monster2' && typeof monster2 !== 'undefined') {
        targetMonster = monster2;
        keyStateObject = keys2; // Global 'keys2' for player 2
        keyConfig = monster2_key_config; // Global config for player 2 keys
    } else {
        console.warn(`executeMonsterAction: Invalid monsterId "${monsterId}" or monster not defined.`);
        return;
    }

    if (!targetMonster || !keyStateObject || !keyConfig) {
        console.warn(`executeMonsterAction: Target monster or its key configurations are not properly set up for ${monsterId}.`);
        return;
    }

    // console.log(`Executing action for ${monsterId}: ${actionName} (${eventType})`);

    switch (actionName) {
        case 'left':
            keyStateObject[keyConfig.left] = (eventType === 'press');
            if (eventType === 'release') keyStateObject[keyConfig.left] = false;
            break;
        case 'right':
            keyStateObject[keyConfig.right] = (eventType === 'press');
            if (eventType === 'release') keyStateObject[keyConfig.right] = false;
            break;
        case 'up':
            keyStateObject[keyConfig.up] = (eventType === 'press');
            if (eventType === 'release') keyStateObject[keyConfig.up] = false;
            break;
        case 'down':
            keyStateObject[keyConfig.down] = (eventType === 'press');
            if (eventType === 'release') keyStateObject[keyConfig.down] = false;
            break;
        case 'punch':
            if (eventType === 'trigger' || eventType === 'press') {
                if (targetMonster.punch_key_code) {
                     targetMonster.punch();
                } else {
                    console.warn(`executeMonsterAction: ${monsterId} does not have punch_key_code configured for direct punch method.`);
                }
            }
            break;
        default:
            console.warn(`executeMonsterAction: Unknown actionName "${actionName}"`);
            return;
    }
}

// Keyboard input state for player 1
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};
// Add this for player 2
const keys2 = {
    KeyW: false, // Using W
    KeyS: false, // Using S
    KeyA: false, // Using A
    KeyD: false, // Using D
};
// Define separate punch keys
const punchKey1 = 'Space';
const punchKey2 = 'Enter';

// Event Listeners for keydown and keyup
window.addEventListener('keydown', (e) => {
    if (gameState === 'playing') {
        // --- Player 1 movement ---
        if (e.key in keys) {
            keys[e.key] = true;
        }
        // --- Player 2 movement ---
        if (e.code in keys2) {
            keys2[e.code] = true;
        }

        // --- Punching actions (while playing) ---
        if (e.code === monster.punch_key_code) {
            monster.punch();
        }
        if (e.code === monster2.punch_key_code) {
            monster2.punch();
        }
    } else if (gameState === 'gameOver') {
        // --- Restart Game Input ---
        if (e.code === 'KeyR') { // 'R' key for Restart
            resetGame();
        }
    }
});

window.addEventListener('keyup', (e) => {
    // Player 1 movement
    if (e.key in keys) {
        keys[e.key] = false;
    }
    // Player 2 movement
    if (e.code in keys2) { // e.code for consistency
        keys2[e.code] = false;
    }
});

// Instantiate Monster
const monster1_key_config = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const monster1_punch_key = 'Space'; // e.code for Space

const monster2_key_config = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const monster2_punch_key = 'Enter'; // e.code for Enter

const monster = new Monster(
    50, // x
    canvas.height - INITIAL_MONSTER_SIZE, // y (top of collision box on ground)
    INITIAL_MONSTER_SIZE, 'purple', 5,
    monster1_key_config, monster1_punch_key,
    monster1SpriteSheet, MONSTER_FRAME_WIDTH, MONSTER_FRAME_HEIGHT
);

const monster2 = new Monster(
    canvas.width - INITIAL_MONSTER_SIZE - 50, // x (collision box 50px from right edge)
    canvas.height - INITIAL_MONSTER_SIZE,    // y
    INITIAL_MONSTER_SIZE, 'red', 5,
    monster2_key_config, monster2_punch_key,
    monster2SpriteSheet, MONSTER_FRAME_WIDTH, MONSTER_FRAME_HEIGHT
);

const buildings = [];
// const groundLevel = canvas.height - 150; // This line is not strictly needed as y is calculated
const buildingWidth = 120; // Slightly wider buildings

// Re-populate buildings array with new dimensions and positions
buildings.length = 0; // Clear array if not already empty or if re-running this step

// Building 1
let b1h = 400;
buildings.push(new Building(150, canvas.height - b1h, buildingWidth, b1h, 200));
// Building 2
let b2h = 550;
buildings.push(new Building(320, canvas.height - b2h, buildingWidth, b2h, 300));
// Building 3
let b3h = 450;
buildings.push(new Building(490, canvas.height - b3h, buildingWidth, b3h, 250));
// Building 4 (optional, ensure it fits)
let b4h = 500;
if (660 + buildingWidth <= canvas.width) { // Check if it fits horizontally
    buildings.push(new Building(660, canvas.height - b4h, buildingWidth, b4h, 280));
}

const aiEnemies = [];
const numberOfAIEnemies = 2; // Start with two helicopters

for (let i = 0; i < numberOfAIEnemies; i++) {
    // Position them at different points at the top of the screen
    const enemyX = 100 + i * (canvas.width / (numberOfAIEnemies + 1));
    const enemyY = 50 + (i % 2 === 0 ? 0 : 30); // Slightly vary Y for visual
    // AIEnemy(x, y, width, height, color, speed, health)
    aiEnemies.push(new AIEnemy(enemyX, enemyY, 60, 30, 'darkolivegreen', 2, 100)); // width 60, height 30
}

const enemyProjectiles = [];

function resetGame() {
    console.log("Resetting game...");

    // 1. Reset Player Monsters
    // 1. Reset Player Monsters
    // Re-instantiate monsters to ensure all properties are reset, including sprite/animation ones.
    monster = new Monster(
        50, canvas.height - INITIAL_MONSTER_SIZE, INITIAL_MONSTER_SIZE, 'purple', 5,
        monster1_key_config, monster1_punch_key,
        monster1SpriteSheet, MONSTER_FRAME_WIDTH, MONSTER_FRAME_HEIGHT
    );
    monster2 = new Monster(
        canvas.width - INITIAL_MONSTER_SIZE - 50, canvas.height - INITIAL_MONSTER_SIZE, INITIAL_MONSTER_SIZE, 'red', 5,
        monster2_key_config, monster2_punch_key,
        monster2SpriteSheet, MONSTER_FRAME_WIDTH, MONSTER_FRAME_HEIGHT
    );

    // 2. Reset Buildings
    buildings.length = 0; // Clear current buildings
    const buildingCollisionWidth = 120;

    // Building 1
    let b1h_collision = 400;
    buildings.push(new Building(
        150, canvas.height - b1h_collision, // x, y
        buildingCollisionWidth, b1h_collision, // collision width, collision height
        200, // initialHealth
        buildingSpriteSheet, BUILDING_SPRITE_FRAME_WIDTH, BUILDING_SPRITE_FRAME_HEIGHT, // sprite sheet and visual frame dimensions
        defaultBuildingDamageFrames // damage states config
    ));
    // Building 2
    let b2h_collision = 550;
    buildings.push(new Building(
        320, canvas.height - b2h_collision,
        buildingCollisionWidth, b2h_collision,
        300,
        buildingSpriteSheet, BUILDING_SPRITE_FRAME_WIDTH, BUILDING_SPRITE_FRAME_HEIGHT,
        defaultBuildingDamageFrames
    ));
    // Building 3
    let b3h_collision = 450;
    buildings.push(new Building(
        490, canvas.height - b3h_collision,
        buildingCollisionWidth, b3h_collision,
        250,
        buildingSpriteSheet, BUILDING_SPRITE_FRAME_WIDTH, BUILDING_SPRITE_FRAME_HEIGHT,
        defaultBuildingDamageFrames
    ));
    // Building 4 (optional)
    if (660 + buildingCollisionWidth <= canvas.width) {
        let b4h_collision = 500;
        buildings.push(new Building(
            660, canvas.height - b4h_collision,
            buildingCollisionWidth, b4h_collision,
            280,
            buildingSpriteSheet, BUILDING_SPRITE_FRAME_WIDTH, BUILDING_SPRITE_FRAME_HEIGHT,
            defaultBuildingDamageFrames
        ));
    }

    // 3. Reset AI Enemies
    aiEnemies.length = 0; // Clear current AI enemies
    const numberOfAIEnemies = 2;
    for (let i = 0; i < numberOfAIEnemies; i++) {
        const enemyX = 100 + i * (canvas.width / (numberOfAIEnemies + 1));
        const enemyY = 50 + (i % 2 === 0 ? 0 : 30);

        // Define animation parameters for this AI Enemy type
        const aiAnimationFrameCount = 4; // e.g., 4 frames for helicopter rotor
        const aiFrameInterval = 5;     // Update frame every 5 game ticks for speed

        aiEnemies.push(new AIEnemy(
            enemyX, enemyY,
            60, 30, // initialWidth, initialHeight (collision box)
            'darkolivegreen', 2, 100, // color, speed, health
            aiEnemySpriteSheet, AI_ENEMY_FRAME_WIDTH, AI_ENEMY_FRAME_HEIGHT, // sprite info
            aiAnimationFrameCount, aiFrameInterval // <<< NEW animation parameters
        ));
    }

    // 4. Clear Projectiles
    enemyProjectiles.length = 0; // Clear any active enemy projectiles

    // Reset Score
    score = 0; // Add this line
    console.log("Score reset to 0.");

    // 5. Reset Game State Variable
    gameState = 'playing';

    console.log("Game reset complete. State: " + gameState);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'playing') {
        // --- UPDATE LOGIC ---
        monster.update(keys);
        monster2.update(keys2);

        // Check for Game Over Condition (now correctly inside the 'playing' block)
        if (monster.isDefeated && monster2.isDefeated) {
            gameState = 'gameOver';
            console.log("Game Over! Both monsters are defeated.");
        }

        // Update AI Enemies and remove if destroyed (only if still playing)
        if (gameState === 'playing') { // Re-check, as game might have just ended
            for (let i = aiEnemies.length - 1; i >= 0; i--) {
                const enemy = aiEnemies[i];
                enemy.update();
                if (enemy.isDestroyed()) {
                    aiEnemies.splice(i, 1);
                    // console.log("Destroyed AIEnemy removed from game."); // Less noisy
                }
            }

            // Update and handle collisions for Enemy Projectiles (only if still playing)
            for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
                const projectile = enemyProjectiles[i];
                projectile.update();

                if (!monster.isDefeated && checkCollision(monster, projectile)) {
                    monster.takeDamage(projectile.damage);
                    enemyProjectiles.splice(i, 1);
                    continue;
                }
                if (!monster2.isDefeated && checkCollision(monster2, projectile)) {
                    monster2.takeDamage(projectile.damage);
                    enemyProjectiles.splice(i, 1);
                    continue;
                }
                if (projectile.y > canvas.height) {
                    enemyProjectiles.splice(i, 1);
                }
            }
        }
    } // --- END OF "if (gameState === 'playing')" for ALL updates ---

    // --- DRAW LOGIC ---
    // Buildings (drawn as static backdrop even on game over)
    for (const building of buildings) {
        building.draw(ctx);
    }

    // AI Enemies and Projectiles (only if playing, otherwise they vanish)
    if (gameState === 'playing') {
        for (const enemy of aiEnemies) {
            enemy.draw(ctx);
        }
        for (const projectile of enemyProjectiles) {
            projectile.draw(ctx);
        }
    }

    // Player Monsters (always drawn; their .draw() shows defeated state)
    monster.draw(ctx);
    monster2.draw(ctx);

    // Display Score (during 'playing' state primarily)
    if (gameState === 'playing') {
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText('Score: ' + score, 10, 25);
    }

    // Game Over Message / Final Score
    if (gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '24px Arial';
        ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 20);

        // Add Final Score to Game Over screen
        ctx.font = '28px Arial'; // Slightly larger for final score
        ctx.fillStyle = 'yellow'; // Different color for emphasis
        ctx.textAlign = 'center';
        ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 60); // Position below restart message
    }

    requestAnimationFrame(gameLoop);
}

// Start game loop
gameLoop();

[end of script.js]

[end of script.js]
