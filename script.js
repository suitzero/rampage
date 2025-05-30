const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 800;  // Keep width or adjust as preferred
canvas.height = 700; // Increase height for more vertical space

const GRAVITY = 0.5; // Adjust as needed for feel

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
        console.log("Monster punching attempt...");
        let hitSomething = false;
        for (const building of buildings) {
            if (!building.isDestroyed() && checkCollision(this, building)) {
                console.log("Punch connected with building at x:", building.x);
                building.takeDamage(this.punchingPower);
                hitSomething = true;
                // If monster can only damage one building per punch, uncomment break:
                // break; 
            }
        }
        if (!hitSomething) {
            console.log("Punch missed or hit already destroyed building.");
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
        // Optional: Draw health bar for AI enemy
        if (this.currentHealth < this.initialHealth) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y - 7, this.width * (this.currentHealth / this.initialHealth), 3);
        }
    }

    update() {
        // Basic horizontal movement example - will be expanded in the next step
        this.x += this.speed * this.direction;

        // Simple boundary check to reverse direction
        if (this.x + this.width > canvas.width || this.x < 0) {
            this.direction *= -1;
            // Optional: move down a bit when changing direction
            // this.y += 10; if (this.y + this.height > canvas.height / 2) this.y = 50;
        }

        // Firing logic
        if (this.fireCooldown <= 0) {
            // Create a projectile (Projectile class will be defined in next step)
            // For now, let's assume a Projectile takes (x, y, size, color, speed, damage)
            // Fire from the center-bottom of the AI enemy
            const projectileX = this.x + this.width / 2 - 5; // Assuming projectile size 10
            const projectileY = this.y + this.height;
            
            enemyProjectiles.push(new Projectile(projectileX, projectileY, 8, 'yellow', 4, 10)); // size 8, speed 4
            console.log(`AIEnemy at ${this.x.toFixed(0)} fires!`); 


            this.fireCooldown = this.fireRate; // Reset cooldown
        } else {
            this.fireCooldown--;
        }
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
    // Player 1 movement (uses 'keys' object)
    if (e.key in keys) { // Arrow keys are in 'keys'
        keys[e.key] = true;
    }
    // Player 2 movement (uses 'keys2' object)
    if (e.code in keys2) { // WASD keys (e.code) are in 'keys2'
        keys2[e.code] = true;
    }

    // Punching actions (direct call based on monster's configured punch key)
    if (e.code === monster.punch_key_code) {
        monster.punch(); 
    }
    if (e.code === monster2.punch_key_code) {
        monster2.punch();
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

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- UPDATE LOGIC ---
    monster.update(keys);
    monster2.update(keys2);

    for (const enemy of aiEnemies) {
        enemy.update();
    }

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const projectile = enemyProjectiles[i];
        projectile.update();

        if (checkCollision(monster, projectile)) {
            monster.takeDamage(projectile.damage); 
            console.log("Monster 1 hit!"); // Keep or adjust log
            enemyProjectiles.splice(i, 1);
            continue;
        }
        if (checkCollision(monster2, projectile)) {
            monster2.takeDamage(projectile.damage); 
            console.log("Monster 2 hit!"); // Keep or adjust log
            enemyProjectiles.splice(i, 1);
            continue;
        }
        if (projectile.y > canvas.height) {
            enemyProjectiles.splice(i, 1);
        }
    }

    // --- DRAW LOGIC ---
    // Draw background elements first
    // (No specific background elements yet, but buildings are like a backdrop)
    for (const building of buildings) {
        building.draw(ctx);
    }

    // Draw AI enemies
    for (const enemy of aiEnemies) {
        enemy.draw(ctx);
    }

    // Draw projectiles
    for (const projectile of enemyProjectiles) { // Draw remaining projectiles
        projectile.draw(ctx);
    }

    // Draw player monsters on top of projectiles and AI enemies
    monster.draw(ctx);
    monster2.draw(ctx);

    requestAnimationFrame(gameLoop);
}

// Start game loop
gameLoop();
