const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 800;  // Keep width or adjust as preferred
canvas.height = 700; // Increase height for more vertical space

const GRAVITY = 0.5; // Adjust as needed for feel

// Monster Class
class Monster {
    constructor(x, y, size, color, speed, key_config, punch_key_code) { // Added key_config, punch_key_code
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.speed = speed;
        this.isClimbing = false;
        this.punchingPower = 10;
        this.key_config = key_config; // Store key configuration
        this.punch_key_code = punch_key_code; // Store punch key
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }

    update(current_key_state) { // current_key_state is either global `keys` or `keys2`
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
function checkCollision(obj1, obj2) {
    // Assuming obj1 has obj1.size (for monster)
    // Assuming obj2 has obj2.width and obj2.height (for building)
    const obj1Right = obj1.x + obj1.size;
    const obj1Bottom = obj1.y + obj1.size;
    const obj2Right = obj2.x + obj2.width;
    const obj2Bottom = obj2.y + obj2.height;

    return obj1.x < obj2Right &&
           obj1Right > obj2.x &&
           obj1.y < obj2Bottom &&
           obj1Bottom > obj2.y;
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

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update monsters
    monster.update(keys);   // Pass P1's key state
    monster2.update(keys2); // Pass P2's key state

    // Draw buildings
    for (const building of buildings) {
        building.draw(ctx);
    }

    // Draw monsters
    monster.draw(ctx);
    monster2.draw(ctx);

    requestAnimationFrame(gameLoop);
}

// Start game loop
gameLoop();
