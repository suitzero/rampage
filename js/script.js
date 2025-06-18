const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const mainMenu = document.getElementById('mainMenu');
const playAloneBtn = document.getElementById('playAloneBtn');
const playWithAiBtn = document.getElementById('playWithAiBtn');
let gameMode = null; // To be set to 'solo' or 'vsAI'

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
let gameState = 'menu'; // Possible states: 'menu', 'playing', 'gameOver'

// Score
let score = 0;

// --- Sprite Sheet Setup ---
let monster1SpriteSheet = null;
let monster2SpriteSheet = null;
let aiEnemySpriteSheet = null;
let projectileSpriteSheet = null;
let buildingSpriteSheet = null;
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
    building: 'img/building_sprites.png'
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
            buildingSpriteSheet
        ] = await Promise.all([
            loadSpriteSheet(spriteSheetFiles.monster1),
            loadSpriteSheet(spriteSheetFiles.monster2),
            loadSpriteSheet(spriteSheetFiles.aiEnemy),
            loadSpriteSheet(spriteSheetFiles.projectile),
            loadSpriteSheet(spriteSheetFiles.building)
        ]);
        console.log("All sprite sheets attempted to load.");

        if (monster1SpriteSheet) console.log("Monster 1 sprite sheet ready.");
        else console.warn("Monster 1 sprite sheet failed to load.");
        if (monster2SpriteSheet) console.log("Monster 2 sprite sheet ready.");
        else console.warn("Monster 2 sprite sheet failed to load.");
        if (aiEnemySpriteSheet) console.log("AI Enemy sprite sheet ready.");
        else console.warn("AI Enemy sprite sheet failed to load.");
        if (projectileSpriteSheet) console.log("Projectile sprite sheet ready.");
        else console.warn("Projectile sprite sheet failed to load.");
        if (buildingSpriteSheet) console.log("Building sprite sheet ready.");
        else console.warn("Building sprite sheet failed to load.");

    } catch (error) {
        console.error("An error occurred during parallel sprite sheet loading:", error);
    }
}

// Function to play a sound buffer
function playSound(buffer, volume = 1.0) {
    if (!buffer || !audioCtx || audioCtx.state === 'suspended') {
        if (audioCtx && audioCtx.state === 'suspended') {
             audioCtx.resume().then(() => {
                if (audioCtx.state === 'running' && buffer) {
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
    if (audioCtx.state === 'running') {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start(0);
    }
}

// Attempt to initialize AudioContext on first keydown (a common user interaction)
async function userInteractionListener() {
    if (!audioCtx || audioCtx.state === 'suspended') {
        console.log("User interaction detected, attempting to initialize/resume AudioContext.");
        initAudio();
    }
    if (audioCtx && audioCtx.state === 'running') {
        await initSounds();
    } else {
        console.warn("AudioContext not running after user interaction. Sounds not loaded yet.");
    }
    await initGraphics();
}
window.addEventListener('keydown', userInteractionListener, { once: true });
window.addEventListener('click', userInteractionListener, { once: true });

// Placeholder sound file paths
const soundFiles = {
    punch: 'sfx/punch.wav',
    buildingDamage: 'sfx/building_damage.wav',
    buildingDestroyed: 'sfx/building_destroyed.wav',
    monsterHit: 'sfx/monster_hit.wav',
    enemyShoot: 'sfx/enemy_shoot.wav',
    enemyDestroyed: 'sfx/enemy_destroyed.wav'
};

async function initSounds() {
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
        overallState: gameState,
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

    const getMonsterData = (m) => {
        if (!m) return null;
        return {
            id: (m === monster) ? 'monster1' : 'monster2',
            x: m.x,
            y: m.y,
            size: m.size,
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
function executeMonsterAction(monsterId, actionName, eventType) {
    let targetMonster = null;
    let keyStateObject = null;
    let keyConfig = null;

    if (monsterId === 'monster1' && typeof monster !== 'undefined') {
        targetMonster = monster;
        keyStateObject = keys;
        keyConfig = monster1_key_config;
    } else if (monsterId === 'monster2' && typeof monster2 !== 'undefined') {
        targetMonster = monster2;
        keyStateObject = keys2;
        keyConfig = monster2_key_config;
    } else {
        console.warn(`executeMonsterAction: Invalid monsterId "${monsterId}" or monster not defined.`);
        return;
    }

    if (!targetMonster || !keyStateObject || !keyConfig) {
        console.warn(`executeMonsterAction: Target monster or its key configurations are not properly set up for ${monsterId}.`);
        return;
    }

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
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false
};

const punchKey1 = 'Space';
const punchKey2 = 'Enter';

window.addEventListener('keydown', (e) => {
    if (gameState === 'playing') {
        if (e.key in keys) {
            keys[e.key] = true;
        }
        if (e.code in keys2) {
            keys2[e.code] = true;
        }
        if (e.code === monster.punch_key_code) {
            monster.punch();
        }
        if (e.code === monster2.punch_key_code) {
            monster2.punch();
        }
    } else if (gameState === 'gameOver') {
        if (e.code === 'KeyR') {
            resetGame();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
    if (e.code in keys2) {
        keys2[e.code] = false;
    }
});

// Instantiate Monster
const monster1_key_config = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const monster1_punch_key = 'Space';

const monster2_key_config = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const monster2_punch_key = 'Enter';

let monster = null;
let monster2 = null;

let buildings = []; // Changed from const to let, though it's an array and could be const if only contents change.
const buildingCollisionWidth = 120;

let aiEnemies = []; // Changed from const to let
const numberOfAIEnemies = 2; // Assuming this is defined, keeping as const
let enemyProjectiles = []; // Changed from const to let
let civilians = [];

function spawnCivilian() {
    // For testing, spawn at specific locations or somewhat randomly.
    // Ensure they spawn on the ground.
    const groundY = canvas.height - 40; // Assuming civilian height is 40
    let spawnX;
    let color = `hsl(${Math.random() * 360}, 70%, 70%)`; // Random lightish color

    if (Math.random() < 0.5) { // Spawn from left or right edge
        spawnX = (Math.random() < 0.5) ? -20 : canvas.width + 20; // Start off-screen
    } else { // Spawn near a random building base
        if (buildings.length > 0) {
            const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
            spawnX = randomBuilding.x + (randomBuilding.width / 2) - 10; // Center of building, minus half civilian width
        } else { // Fallback if no buildings
            spawnX = Math.random() * canvas.width;
        }
    }
    // Ensure spawnX is within canvas to avoid immediate despawn if starting on edge and walking inwards
    spawnX = Math.max(-10, Math.min(spawnX, canvas.width + 10));


    // Ensure Civilian class is defined (civilian.js should be loaded before script.js)
    if (typeof Civilian === 'function') {
        civilians.push(new Civilian(spawnX, groundY, color));
        // console.log(`Spawned civilian at X:${spawnX.toFixed(0)}, Y:${groundY.toFixed(0)}. Total: ${civilians.length}`);
    } else {
        console.error("Civilian class not defined! Make sure civilian.js is loaded.");
    }
}

function startGame(selectedMode) {
    gameMode = selectedMode;
    mainMenu.style.display = 'none';
    canvas.style.display = 'block'; // Or use gameCanvas.style.display

    score = 0;
    gameState = 'playing';

    monster = new Monster(
        50, canvas.height - INITIAL_MONSTER_SIZE, INITIAL_MONSTER_SIZE, 'purple', 5,
        monster1_key_config, monster1_punch_key,
        monster1SpriteSheet, MONSTER_FRAME_WIDTH, MONSTER_FRAME_HEIGHT
    );

    if (gameMode === 'solo') {
        monster2 = null;
    } else if (gameMode === 'vsAI') {
        monster2 = new Monster(
            canvas.width - INITIAL_MONSTER_SIZE - 50, canvas.height - INITIAL_MONSTER_SIZE,
            INITIAL_MONSTER_SIZE, 'red', 5,
            monster2_key_config, monster2_punch_key,
            monster2SpriteSheet, MONSTER_FRAME_WIDTH, MONSTER_FRAME_HEIGHT
        );
        monster2.isAIControlled = true; // Set AI flag
    }

    resetGameInternalLogic();

    civilians = []; // Clear previous civilians
    for (let i = 0; i < 5; i++) { // Spawn 5 civilians for testing
        spawnCivilian();
    }

    console.log(`Starting game in mode: ${gameMode}. Score: ${score}`);
    gameLoop();
}

playAloneBtn.addEventListener('click', () => {
    startGame('solo');
});

playWithAiBtn.addEventListener('click', () => {
    startGame('vsAI');
});

function resetGame() { // Called on 'R' press during gameOver
    console.log("Returning to main menu...");
    monster = null;
    monster2 = null;
    buildings.length = 0;
    aiEnemies.length = 0;
    enemyProjectiles.length = 0;
    civilians.length = 0;

    score = 0;
    gameState = 'menu';

    canvas.style.display = 'none';
    mainMenu.style.display = 'flex';
}

function resetGameInternalLogic() {
    buildings.length = 0;
    //const buildingCollisionWidth = 120; // Already global
    let b1h_collision = 400;
    buildings.push(new Building(
        150, canvas.height - b1h_collision, buildingCollisionWidth, b1h_collision, 200,
        buildingSpriteSheet, BUILDING_SPRITE_FRAME_WIDTH, BUILDING_SPRITE_FRAME_HEIGHT, defaultBuildingDamageFrames
    ));
    let b2h_collision = 550;
    buildings.push(new Building(
        320, canvas.height - b2h_collision, buildingCollisionWidth, b2h_collision, 300,
        buildingSpriteSheet, BUILDING_SPRITE_FRAME_WIDTH, BUILDING_SPRITE_FRAME_HEIGHT, defaultBuildingDamageFrames
    ));
    let b3h_collision = 450;
    buildings.push(new Building(
        490, canvas.height - b3h_collision, buildingCollisionWidth, b3h_collision, 250,
        buildingSpriteSheet, BUILDING_SPRITE_FRAME_WIDTH, BUILDING_SPRITE_FRAME_HEIGHT, defaultBuildingDamageFrames
    ));
    if (canvas && 660 + buildingCollisionWidth <= canvas.width) {
        let b4h_collision = 500;
        buildings.push(new Building(
            660, canvas.height - b4h_collision, buildingCollisionWidth, b4h_collision, 280,
            buildingSpriteSheet, BUILDING_SPRITE_FRAME_WIDTH, BUILDING_SPRITE_FRAME_HEIGHT, defaultBuildingDamageFrames
        ));
    }

    aiEnemies.length = 0;
    //const numberOfAIEnemies = 2; // Already global
    for (let i = 0; i < numberOfAIEnemies; i++) {
        const enemyX = 100 + i * (canvas.width / (numberOfAIEnemies + 1));
        const enemyY = 50 + (i % 2 === 0 ? 0 : 30);
        aiEnemies.push(new AIEnemy(
            enemyX, enemyY, 60, 30, 'darkolivegreen', 2, 100,
            aiEnemySpriteSheet, AI_ENEMY_FRAME_WIDTH, AI_ENEMY_FRAME_HEIGHT, 4, 5
        ));
    }
    enemyProjectiles.length = 0;
    console.log("Internal game elements reset.");
}


function gameLoop() {
    if (gameState !== 'playing') return; // Stop loop if not in playing state

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (monster) monster.update(keys);
    if (monster2) {
        if (gameMode === 'vsAI' && monster2.isAIControlled) {
            monster2.updateAI(monster, buildings); // AI makes decisions
            monster2.update(); // Monster 2 updates its state based on aiAction (no keys needed)
        } else if (gameMode !== 'solo') { // If monster2 is human controlled
            monster2.update(keys2); // P2 human update
        }
    }

    if (gameMode === 'solo') {
        if (monster && monster.isDefeated) {
            gameState = 'gameOver';
            console.log("Game Over! Monster 1 is defeated.");
        }
    } else {
        if (monster && monster.isDefeated && (!monster2 || monster2.isDefeated)) {
            gameState = 'gameOver';
            console.log("Game Over! Both monsters are defeated.");
        }
    }

    if (gameState === 'playing') { // Double check gameState as it might change above
        for (let i = aiEnemies.length - 1; i >= 0; i--) {
                    const enemy = aiEnemies[i];
                    enemy.update();
                    if (enemy.isDestroyed()) {
                        aiEnemies.splice(i, 1);
                    }
                }
                for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
                    const projectile = enemyProjectiles[i];
                    projectile.update();
                    if (monster && !monster.isDefeated && checkCollision(monster, projectile)) {
                        monster.takeDamage(projectile.damage);
                        enemyProjectiles.splice(i, 1);
                        continue;
                    }
                    if (monster2 && !monster2.isDefeated && checkCollision(monster2, projectile)) {
                        monster2.takeDamage(projectile.damage);
                        enemyProjectiles.splice(i, 1);
                        continue;
                    }
                    if (projectile.y > canvas.height) {
                        enemyProjectiles.splice(i, 1);
                    }
                }

        const activeMonsters = [monster, monster2].filter(m => m && !m.isDefeated);
        for (let i = civilians.length - 1; i >= 0; i--) {
            const civilian = civilians[i];
            civilian.update(activeMonsters, buildings);
            if (civilian.toBeRemoved) {
                civilians.splice(i, 1);
            }
        }
    } // End of main 'playing' logic for updates (this closes the inner "if (gameState === 'playing')")

    // Drawing logic (should happen regardless of whether game just ended in this frame)
    for (const building of buildings) {
        building.draw(ctx);
    }

    if (monster) monster.draw(ctx);
    if (monster2) monster2.draw(ctx);

    // Draw AI enemies and projectiles only if playing
    if (gameState === 'playing' || gameState === 'gameOver') { // Also draw if game just ended
        for (const enemy of aiEnemies) {
            enemy.draw(ctx);
        }
        for (const projectile of enemyProjectiles) {
            projectile.draw(ctx);
        }
    }

    for (const civilian of civilians) {
        civilian.draw(ctx);
    }

    if (gameState === 'playing') {
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText('Score: ' + score, 10, 25);
    }
    if (gameState === 'gameOver') { // Moved this block up to ensure it's part of the main conditional drawing
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '24px Arial';
        ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = '28px Arial';
        ctx.fillStyle = 'yellow';
        ctx.textAlign = 'center';
        ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 60);
    }

    // Only call requestAnimationFrame if the game is supposed to continue
    if (gameState === 'playing') {
        requestAnimationFrame(gameLoop);
    }
}
// gameLoop(); // Removed initial call, startGame will call it.
