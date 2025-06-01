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

// Game State
let gameState = 'playing'; // Possible states: 'playing', 'gameOver'

// Score
let score = 0;

// --- Sprite Sheet Setup ---
let monster1SpriteSheet = null;
let monster2SpriteSheet = null;
let aiEnemySpriteSheet = null;    // New
let projectileSpriteSheet = null; // New
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
    aiEnemy: 'img/ai_helicopter.png',     // New
    projectile: 'img/projectile_bullet.png' // New
};

async function initGraphics() {
    console.log("Loading graphics...");
    try {
        // Load sprite sheets and store them
        [
            monster1SpriteSheet,
            monster2SpriteSheet,
            aiEnemySpriteSheet,     // Add this to destructuring assignment
            projectileSpriteSheet   // Add this to destructuring assignment
        ] = await Promise.all([
            loadSpriteSheet(spriteSheetFiles.monster1),
            loadSpriteSheet(spriteSheetFiles.monster2),
            loadSpriteSheet(spriteSheetFiles.aiEnemy),     // Load AI enemy sprite
            loadSpriteSheet(spriteSheetFiles.projectile)   // Load projectile sprite
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
        if (this.invulnerableTime > 0) return; // Already invulnerable, no damage, no sound

        this.currentHealth -= amount;
        playSound(sfxMonsterHit); // Play monster HIT sound

        console.log(`Monster (color: ${this.color}) took ${amount} damage, health: ${this.currentHealth}`);
        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            this.isDefeated = true; // Add a flag for defeat
            console.log(`Monster (color: ${this.color}) has been defeated!`);
            // For now, defeated monster will just stop moving or disappear (handled in update/draw)
        }
        this.invulnerableTime = this.invulnerabilityDuration; // Start invulnerability
    }

    update(current_key_state) {
        if (this.isDefeated) {
            // If using sprites, could switch to a "defeated" animation/frame here if not handled by draw()
            return;
        }

        if (this.invulnerableTime > 0) {
            this.invulnerableTime--;
        }

        // --- Handle Punching State ---
        if (this.isPunching) {
            this.punchTimer++;
            if (this.punchTimer >= this.punchDuration) {
                this.isPunching = false;
                this.punchTimer = 0;
            }
        }

        // --- Movement and Animation State Logic (excluding punch state for now) ---
        // Assume not moving initially for this frame
        this.isMoving = false;

        // Horizontal movement & Facing Direction
        if (!this.isPunching) { // Don't move if in middle of a punch animation/action
            if (current_key_state[this.key_config.left] && this.x > 0) {
                this.x -= this.speed;
                this.facingDirection = 'left';
                this.isMoving = true;
            }
            if (current_key_state[this.key_config.right] && this.x < canvas.width - this.size) {
                // canvas.width - this.frameWidth might be more accurate if sprite is drawn at frameWidth
                this.x += this.speed;
                this.facingDirection = 'right';
                this.isMoving = true;
            }
        }

        // --- Climbing Logic (existing, might need to integrate isMoving/animation for climb) ---
        this.isClimbing = false; // Reset before check
        let collidingBuilding = null;
         for (const building of buildings) {
            if (!building.isDestroyed() && checkCollision(this, building)) {
                if (this.y + this.size > building.y && this.y < building.y + building.height) {
                    this.isClimbing = true;
                    collidingBuilding = building;
                    break;
                }
            }
        }

        if (this.isClimbing && collidingBuilding) {
            this.isMoving = true; // Consider climbing as a form of movement for animation
            if (!this.isPunching) { // Allow vertical climb movement only if not punching
                if (current_key_state[this.key_config.up] && this.y > 0) {
                    this.y -= this.speed;
                    if (this.y < collidingBuilding.y) this.y = collidingBuilding.y; // Snap to top
                }
                if (current_key_state[this.key_config.down] && this.y < canvas.height - this.size) {
                    this.y += this.speed;
                    if (this.y + this.size > collidingBuilding.y + collidingBuilding.height) { // Snap to bottom
                        this.y = collidingBuilding.y + collidingBuilding.height - this.size;
                    }
                }
            }
        } else if (!this.isPunching) { // Apply gravity only if not climbing AND not punching
            this.y += GRAVITY * 5;
        }

        // --- Boundary Constraints for Y ---
         if (this.y < 0) this.y = 0;
         if (this.y > canvas.height - this.size) { // this.size for collision box
            this.y = canvas.height - this.size;
         }


        // --- Animation Frame Update Logic ---
        if (this.isPunching) {
            // Placeholder for specific punch animation frame logic
        } else if (this.isMoving) {
            // Walking/Climbing animation
            this.frameTimer++;
            if (this.frameTimer >= this.frameInterval) {
                this.frameTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % this.animationFrameCount; // Cycle through frames
            }
        } else {
            // Idle animation: typically first frame or a short loop
            this.currentFrame = 0; // Simple idle: show first frame
        }
    }

    punch() {
        // Optional: Prevent starting a new punch if already in a punch animation/cooldown
        // if (this.isPunching || this.punchTimer > 0 ) return;

        playSound(sfxPunch);
        this.isPunching = true;     // Start punch state
        this.punchTimer = 0;        // Reset punch animation timer

        console.log(`Monster (color: ${this.color}) punching attempt...`);
        let hitBuilding = false;
        // --- Existing Building Punch Logic ---
        for (const building of buildings) {
            if (!building.isDestroyed() && checkCollision(this, building)) {
                console.log(`Punch connected with building at x: ${building.x}`);
                building.takeDamage(this.punchingPower);
                hitBuilding = true;
                // If monster can only damage one building per punch, uncomment break:
                // break;
            }
        }
        // --- End of Existing Building Punch Logic ---

        // --- New AI Enemy Punch Logic ---
        let hitAIEnemy = false;
        for (const aiEnemy of aiEnemies) { // Iterate through global aiEnemies array
            if (!aiEnemy.isDestroyed() && checkCollision(this, aiEnemy)) {
                console.log(`Punch connected with AIEnemy at x: ${aiEnemy.x}`);
                aiEnemy.takeDamage(this.punchingPower); // Use monster's punchingPower
                hitAIEnemy = true;
                // Optional: If punch should only hit one AI enemy, uncomment break.
                // break;
            }
        }
        // --- End of New AI Enemy Punch Logic ---

        if (!hitBuilding && !hitAIEnemy) {
            console.log("Punch missed or hit only already destroyed targets.");
        }
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
    constructor(x, y, initialWidth, initialHeight, color, speed, health, spriteSheet = null, frameWidth = 0, frameHeight = 0) {
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

        // New sprite properties
        this.spriteSheet = spriteSheet;
        this.frameWidth = frameWidth;     // Width of a single frame from the sheet
        this.frameHeight = frameHeight;   // Height of a single frame from the sheet
        this.currentFrame = 0;            // For basic animation, if any (e.g., first frame)
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

    isDestroyed() {
        return this.currentHealth <= 0;
    }
}

// Building Class
class Building {
    constructor(x, y, width, height, initialHealth = 100) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.initialHealth = initialHealth;
        this.currentHealth = initialHealth;
        this.color = 'gray'; // Default color for an intact building
        this.destroyedColor = '#555'; // Color when destroyed
        this.damageColor = 'orange'; // Color when damaged
    }

    draw(ctx) {
        let currentColor = this.color;
        if (this.currentHealth < this.initialHealth && this.currentHealth > 0) {
            // Optional: Show damage visually, e.g., by changing color or drawing cracks
            // For simplicity, let's show a different color if damaged but not destroyed
            const healthPercentage = this.currentHealth / this.initialHealth;
            if (healthPercentage < 0.3) {
                currentColor = '#8B0000'; // Darker red for heavily damaged
            } else if (healthPercentage < 0.7) {
                currentColor = this.damageColor; // Orange for moderately damaged
            }
        } else if (this.isDestroyed()) {
            currentColor = this.destroyedColor;
        }

        ctx.fillStyle = currentColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Optional: Draw health bar or damage state
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 10, this.width * (this.currentHealth / this.initialHealth), 5);
    }

    takeDamage(amount) {
        if (this.isDestroyed()) return; // Already destroyed

        this.currentHealth -= amount;
        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            // Award points for destroying the building
            score += 100; // Add 100 points to the global score
            console.log("Building destroyed! Score: " + score);
            playSound(sfxBuildingDestroyed); // Play building DESTRUCTION sound
        } else {
            // If not destroyed, but took damage
            playSound(sfxBuildingDamage); // Play building DAMAGE sound
        }
    }

    isDestroyed() {
        return this.currentHealth <= 0;
    }
}

// Collision detection function (for rectangles)
function getRect(obj) {
    const width = obj.width || obj.size;
    const height = obj.height || obj.size;
    return { x: obj.x, y: obj.y, width: width, height: height };
}

function checkCollision(objA, objB) {
    const rectA = getRect(objA);
    const rectB = getRect(objB);

    return rectA.x < rectB.x + rectB.width &&
           rectA.x + rectA.width > rectB.x &&
           rectA.y < rectB.y + rectB.height &&
           rectA.y + rectA.height > rectB.y;
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
    const buildingWidth = 120;
    let b1h = 400; buildings.push(new Building(150, canvas.height - b1h, buildingWidth, b1h, 200));
    let b2h = 550; buildings.push(new Building(320, canvas.height - b2h, buildingWidth, b2h, 300));
    let b3h = 450; buildings.push(new Building(490, canvas.height - b3h, buildingWidth, b3h, 250));
    if (660 + buildingWidth <= canvas.width) {
        let b4h = 500; buildings.push(new Building(660, canvas.height - b4h, buildingWidth, b4h, 280));
    }

    // 3. Reset AI Enemies
    aiEnemies.length = 0; // Clear current AI enemies
    const numberOfAIEnemies = 2;
    for (let i = 0; i < numberOfAIEnemies; i++) {
        const enemyX = 100 + i * (canvas.width / (numberOfAIEnemies + 1));
        const enemyY = 50 + (i % 2 === 0 ? 0 : 30);
        aiEnemies.push(new AIEnemy(
            enemyX, enemyY,
            60, 30, // initialWidth, initialHeight (collision box)
            'darkolivegreen', 2, 100, // color, speed, health
            aiEnemySpriteSheet, AI_ENEMY_FRAME_WIDTH, AI_ENEMY_FRAME_HEIGHT // sprite info
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
