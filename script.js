const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 800;  // Keep width or adjust as preferred
canvas.height = 700; // Increase height for more vertical space

const GRAVITY = 0.5; // Adjust as needed for feel

// Game State
let gameState = 'playing'; // Possible states: 'playing', 'gameOver'

// Monster Class
class Monster {
    constructor(x, y, size, color, speed, key_config, punch_key_code) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.speed = speed;
        this.isClimbing = false;
        this.punchingPower = 10;
        this.key_config = key_config;
        this.punch_key_code = punch_key_code;
        this.initialHealth = 100; // Added
        this.currentHealth = this.initialHealth; // Added
        this.isDefeated = false; // Added
        this.invulnerableTime = 0; // For brief invulnerability after getting hit
        this.invulnerabilityDuration = 60; // 1 second at 60fps
    }

    draw(ctx) {
        if (this.isDefeated) {
            // Optional: draw defeated state (e.g., grayed out, or don't draw at all)
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)'; // Semi-transparent gray
            ctx.fillRect(this.x, this.y, this.size, this.size);
            return;
        }

        let effectiveColor = this.color;
        // Blink if invulnerable
        if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime / 6) % 2 === 0) {
            effectiveColor = 'white'; // Or any color that indicates invulnerability
        }
        ctx.fillStyle = effectiveColor;
        ctx.fillRect(this.x, this.y, this.size, this.size);

        // Draw health bar above monster
        const healthBarWidth = this.size;
        const healthBarHeight = 5;
        const healthBarX = this.x;
        const healthBarY = this.y - healthBarHeight - 2; // 2px spacing

        ctx.fillStyle = 'grey'; // Background of health bar
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        const currentHealthWidth = healthBarWidth * (this.currentHealth / this.initialHealth);
        ctx.fillStyle = 'green'; // Color of actual health
        if (this.currentHealth / this.initialHealth < 0.3) {
            ctx.fillStyle = 'red'; // Critical health
        }
        ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
    }

    takeDamage(amount) {
        if (this.invulnerableTime > 0) return; // Already invulnerable

        this.currentHealth -= amount;
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
            // Optional: special behavior for defeated monster, e.g., fall off screen or become static
            // For now, just stop processing updates if defeated.
            return; 
        }

        if (this.invulnerableTime > 0) {
            this.invulnerableTime--;
        }

        // Horizontal movement
        if (current_key_state[this.key_config.left] && this.x > 0) {
            this.x -= this.speed;
        }
        if (current_key_state[this.key_config.right] && this.x < canvas.width - this.size) {
            this.x += this.speed;
        }

        this.isClimbing = false;
        let collidingBuilding = null;

        for (const building of buildings) {
            if (!building.isDestroyed() && checkCollision(this, building)) {
                // Check if monster is roughly aligned vertically with the building part it's colliding with
                if (this.y + this.size > building.y && this.y < building.y + building.height) {
                    this.isClimbing = true;
                    collidingBuilding = building;
                    break;
                }
            }
        }

        if (this.isClimbing && collidingBuilding) {
            // Vertical movement while climbing
            if (current_key_state[this.key_config.up] && this.y > 0) { // Allow climbing up to the top of the canvas
                this.y -= this.speed;
                // Snap to building top if tries to go above while still "on" it
                if (this.y < collidingBuilding.y) this.y = collidingBuilding.y;
            }
            if (current_key_state[this.key_config.down] && this.y < canvas.height - this.size) { // Allow climbing down to the ground
                this.y += this.speed;
                // Snap to building bottom if tries to go below while still "on" it
                if (this.y + this.size > collidingBuilding.y + collidingBuilding.height) {
                     this.y = collidingBuilding.y + collidingBuilding.height - this.size;
                }
            }
        } else {
            // Not climbing: apply gravity
            this.y += GRAVITY * 5; // Apply gravity (the multiplier makes it fall faster)
        }

        // Ground constraint (and canvas top constraint)
        if (this.y < 0) {
            this.y = 0;
        }
        if (this.y > canvas.height - this.size) {
            this.y = canvas.height - this.size;
            // Removed the ArrowUp=false part as it was too simplistic and tied to global `keys`
            // Proper jump/climb state management would be more complex.
        }
    }

    punch() {
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
}

// Projectile Class (fired by AIEnemies)
class Projectile {
    constructor(x, y, size, color, speedY, damage) {
        this.x = x;
        this.y = y;
        this.size = size; // Assuming square projectile for now
        this.color = color;
        this.speedY = speedY; // Vertical speed, positive for downwards
        this.damage = damage;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }

    update() {
        this.y += this.speedY; // Move downwards
    }
}

// AIEnemy Class
class AIEnemy {
    constructor(x, y, width, height, color, speed, health) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.speed = speed;
        this.initialHealth = health;
        this.currentHealth = health;
        // For movement pattern, e.g., horizontal
        this.direction = 1; // 1 for right, -1 for left
        this.fireCooldown = 0; // Add this property
        this.fireRate = 120; // Fires every 120 frames (2 seconds at 60fps) - adjust as needed
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Health Bar Logic (improved)
        if (this.currentHealth > 0) { // Only draw health bar if not fully destroyed (and about to be removed)
            const healthBarWidth = this.width;
            const healthBarHeight = 4; // Slightly thicker
            const healthBarX = this.x;
            const healthBarY = this.y - healthBarHeight - 2; // 2px spacing above enemy

            // Background of health bar
            ctx.fillStyle = 'grey'; 
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

            // Current health
            const currentHealthPercentage = this.currentHealth / this.initialHealth;
            let healthBarColor = 'green';
            if (currentHealthPercentage < 0.3) {
                healthBarColor = 'red';
            } else if (currentHealthPercentage < 0.6) {
                healthBarColor = 'orange';
            }
            ctx.fillStyle = healthBarColor;
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth * currentHealthPercentage, healthBarHeight);
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
            const projectileX = this.x + this.width / 2 - 5;
            const projectileY = this.y + this.height;
            enemyProjectiles.push(new Projectile(projectileX, projectileY, 8, 'yellow', 4, 10));
            // console.log(`AIEnemy at ${this.x.toFixed(0)} fires!`); 
            this.fireCooldown = this.fireRate;
        } else {
            this.fireCooldown--;
        }
        // --- End of existing firing logic ---
    }

    takeDamage(amount) { // Though initially they might be invulnerable
        this.currentHealth -= amount;
        if (this.currentHealth < 0) {
            this.currentHealth = 0;
        }
        // console.log("AIEnemy health:", this.currentHealth);
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
            // Color change to destroyedColor is handled by draw() logic
            console.log("Building destroyed!");
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

const monster = new Monster(50, canvas.height - 50, 50, 'purple', 5, monster1_key_config, monster1_punch_key); // Start on ground

const monster2 = new Monster(canvas.width - 100, canvas.height - 50, 50, 'red', 5, monster2_key_config, monster2_punch_key); // New monster2

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
    // Monster 1 (monster)
    monster.currentHealth = monster.initialHealth;
    monster.isDefeated = false;
    monster.x = 50; // Initial X
    monster.y = canvas.height - monster.size; // Initial Y (on ground)
    monster.invulnerableTime = 0;
    // Reset any other monster-specific states if necessary (e.g., isClimbing)
    monster.isClimbing = false; 

    // Monster 2 (monster2)
    monster2.currentHealth = monster2.initialHealth;
    monster2.isDefeated = false;
    monster2.x = canvas.width - 100; // Initial X for monster2
    monster2.y = canvas.height - monster2.size; // Initial Y for monster2
    monster2.invulnerableTime = 0;
    monster2.isClimbing = false;

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
        aiEnemies.push(new AIEnemy(enemyX, enemyY, 60, 30, 'darkolivegreen', 2, 100));
    }

    // 4. Clear Projectiles
    enemyProjectiles.length = 0; // Clear any active enemy projectiles

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
    
    // Game Over Message (drawn if state is 'gameOver')
    if (gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '24px Arial';
        ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 20);
    }

    requestAnimationFrame(gameLoop);
}

// Start game loop
gameLoop();
