class Civilian {
    constructor(x, y, color = 'lightgray') {
        this.x = x;
        this.y = y;
        this.width = 20;  // Placeholder width
        this.height = 40; // Placeholder height
        this.speed = 1.5; // Movement speed
        this.color = color;

        this.state = 'walking'; // Initial state: 'walking', 'fleeing', 'despawned'
        this.fearRadius = 150; // How close a monster needs to be to trigger fleeing

        // Determine initial walking direction and flee target (e.g., nearest horizontal edge)
        // For simplicity, let's assume they always try to walk off one side initially,
        // and flee target is re-evaluated.
        this.walkDirection = (Math.random() < 0.5) ? -1 : 1; // -1 for left, 1 for right
        this.targetX = (this.walkDirection === -1) ? -this.width : (typeof canvas !== 'undefined' ? canvas.width : 800); // Default target off-screen

        this.toBeRemoved = false; // Flag for removal

        // Ensure y positions them on the ground (assuming canvas height is ground)
        // This needs to be set more reliably during spawning in script.js
        // For now, ensure it's not above a certain line if canvas isn't global here.
        const groundY = (typeof canvas !== 'undefined' ? canvas.height : 700) - this.height;
        if (this.y > groundY || typeof canvas === 'undefined') { // if spawned too low or canvas unknown
            this.y = groundY;
        }
    }

    update(monsters, buildings) { // buildings currently unused but good for future
        if (this.toBeRemoved) return;

        let flee = false;
        let closestMonsterDist = Infinity;
        let threateningMonster = null;

        for (const monster of monsters) {
            if (monster && !monster.isDefeated) {
                const distance = Math.sqrt(Math.pow(this.x - monster.x, 2) + Math.pow(this.y - monster.y, 2));
                if (distance < this.fearRadius) {
                    flee = true;
                    if (distance < closestMonsterDist) {
                        closestMonsterDist = distance;
                        threateningMonster = monster;
                    }
                }
            }
        }

        if (flee && threateningMonster) {
            this.state = 'fleeing';
            // Flee away from the threatening monster
            if (threateningMonster.x < this.x) { // Monster is to the left, flee right
                this.targetX = (typeof canvas !== 'undefined' ? canvas.width : 800);
                this.walkDirection = 1;
            } else { // Monster is to the right (or same X), flee left
                this.targetX = -this.width;
                this.walkDirection = -1;
            }
            this.x += this.walkDirection * this.speed * 1.5; // Flee faster
        } else {
            this.state = 'walking';
            // Normal walking behavior
            this.x += this.walkDirection * this.speed;
            // If walking and reached original targetX (edge of screen), mark for removal or change direction
            if ((this.walkDirection === 1 && this.x > this.targetX) || (this.walkDirection === -1 && this.x < this.targetX)) {
                 // For now, just go towards the initial targetX (edge of screen)
                 // More complex logic could make them turn around or despawn
            }
        }

        // Ground constraint (very basic)
        const groundY = (typeof canvas !== 'undefined' ? canvas.height : 700) - this.height;
        if (this.y < groundY) {
            // this.y += GRAVITY * 2; // If civilians were affected by gravity
            // For now, they just stick to the ground they were spawned on or slightly above.
            // A proper spawn would place them on ground.
        }
        if (this.y > groundY) {
            this.y = groundY;
        }


        // Check for despawn (if moved off-screen)
        const canvasWidth = (typeof canvas !== 'undefined' ? canvas.width : 800);
        if (this.x + this.width < 0 || this.x > canvasWidth) {
            this.toBeRemoved = true;
            // console.log("Civilian despawned off-screen");
        }
    }

    draw(ctx) {
        if (this.toBeRemoved) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Optional: Draw state or target for debugging
        // ctx.fillStyle = 'black';
        // ctx.font = '10px Arial';
        // ctx.fillText(this.state, this.x, this.y - 5);
        // if (this.state === 'fleeing') {
        //     ctx.beginPath();
        //     ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
        //     ctx.lineTo(this.targetX > this.x ? this.targetX + 20 : this.targetX - 20 , this.y + this.height/2);
        //     ctx.strokeStyle = 'red';
        //     ctx.stroke();
        // }
    }
}
