class Soldier {
    constructor(x, y, color = 'darkolivegreen') {
        this.x = x;
        this.y = y;
        this.width = 25;  // Placeholder width
        this.height = 50; // Placeholder height
        this.speed = 0.5; // Slower movement speed
        this.color = color;

        this.health = 50; // Example health
        this.isDefeated = false;

        this.state = 'idle'; // 'idle', 'moving', 'aiming', 'firing'
        this.targetMonster = null;
        this.detectionRadius = 300; // How far a soldier can see/target a monster
        this.firingRange = 250;     // How close soldier needs to be to fire

        this.rifleAngle = 0; // Angle in radians for aiming
        this.fireRate = 120; // Cooldown in frames (e.g., 1 shot every 2 seconds at 60fps)
        this.fireCooldown = Math.random() * this.fireRate; // Stagger initial firing

        // Placeholder for sprite information if we add sprites later
        // this.spriteSheet = null;
        // this.frameWidth = 0;
        // this.frameHeight = 0;

        // Ensure y positions them on the ground
        const groundY = (typeof canvas !== 'undefined' ? canvas.height : 700) - this.height;
        if (this.y > groundY || typeof canvas === 'undefined') {
            this.y = groundY;
        }
    }

    findTarget(monsters) {
        this.targetMonster = null;
        let closestDist = this.detectionRadius;
        for (const monster of monsters) {
            if (monster && !monster.isDefeated) {
                const distance = Math.sqrt(Math.pow(this.x - monster.x, 2) + Math.pow(this.y - monster.y, 2));
                if (distance < closestDist) {
                    closestDist = distance;
                    this.targetMonster = monster;
                }
            }
        }
    }

    update(monsters, buildings, gameProjectiles) { // gameProjectiles is the array to add bullets to (e.g., enemyProjectiles)
        if (this.isDefeated) {
            // Optional: change color or show defeated state before removal
            this.color = "gray"; // Indicate defeated
            return;
        }

        this.findTarget(monsters);

        if (this.targetMonster) {
            this.state = 'aiming';
            // Calculate angle to target monster
            const dx = this.targetMonster.x + (this.targetMonster.frameWidth || this.targetMonster.size) / 2 - (this.x + this.width / 2);
            const dy = this.targetMonster.y + (this.targetMonster.frameHeight || this.targetMonster.size) / 2 - (this.y + this.height / 2);
            this.rifleAngle = Math.atan2(dy, dx);

            const distanceToTarget = Math.sqrt(dx*dx + dy*dy);

            if (distanceToTarget > this.firingRange) {
                this.state = 'moving';
                // Move towards target if not in range
                this.x += Math.cos(this.rifleAngle) * this.speed;
                // Soldiers don't typically move up/down based on target height unless they can jump/climb
            } else {
                this.state = 'firing';
            }

            if (this.state === 'firing' && this.fireCooldown <= 0) {
                this.fire(gameProjectiles);
                this.fireCooldown = this.fireRate;
            }

        } else {
            this.state = 'idle';
            // Optional: patrol behavior if no target
            // this.rifleAngle = (this.x > canvas.width / 2) ? Math.PI : 0; // Face center or random
        }

        if (this.fireCooldown > 0) {
            this.fireCooldown--;
        }

        // Basic ground constraint
        const groundY = (typeof canvas !== 'undefined' ? canvas.height : 700) - this.height;
         if (this.y < groundY) {
            // this.y += GRAVITY * 2; // If soldiers were affected by gravity
        }
        if (this.y > groundY) {
            this.y = groundY;
        }
    }

    fire(gameProjectiles) { // gameProjectiles is the array to add to, e.g. enemyProjectiles from script.js
        // console.log(`Soldier at (${this.x.toFixed(0)}, ${this.y.toFixed(0)}) firing at angle ${this.rifleAngle.toFixed(2)}`);
        const bulletSpeed = 3;
        const bulletSize = 5; // Small bullets
        const bulletColor = 'orange';
        const bulletDamage = 5; // Example damage

        // Calculate bullet start position (e.g., end of rifle)
        const rifleLength = this.width / 2 + 5; // Placeholder for rifle length
        const bulletStartX = this.x + this.width / 2 + Math.cos(this.rifleAngle) * rifleLength;
        const bulletStartY = this.y + this.height / 2 + Math.sin(this.rifleAngle) * rifleLength;

        const dx = Math.cos(this.rifleAngle); // Normalized direction x
        const velX = Math.cos(this.rifleAngle) * bulletSpeed; // Renamed from dx to avoid conflict, though dx in this scope is fine
        const velY = Math.sin(this.rifleAngle) * bulletSpeed; // Renamed from dy

        // Projectile constructor is: constructor(x, y, initialSize, color, speedX, speedY, damage, spriteSheet = null, frameWidth = 0, frameHeight = 0)

        if (typeof Projectile === 'function' && typeof gameProjectiles !== 'undefined' && Array.isArray(gameProjectiles)) {
            gameProjectiles.push(new Projectile(
                bulletStartX,
                bulletStartY,
                bulletSize,
                bulletColor,
                velX, // Pass calculated velX
                velY, // Pass calculated velY
                bulletDamage,
                projectileSpriteSheet // Assuming this global variable from script.js is intended for all enemy projectiles
            ));
            // console.log(`Soldier fired. Angle: ${this.rifleAngle.toFixed(2)}, velX: ${velX.toFixed(1)}, velY: ${velY.toFixed(1)}`);
        } else {
            if (typeof Projectile !== 'function') console.error("Soldier.fire: Projectile class not defined!");
            if (typeof gameProjectiles === 'undefined' || !Array.isArray(gameProjectiles)) console.error("Soldier.fire: gameProjectiles array not valid!");
        }
        // playSound(sfxSoldierShoot); // Placeholder for sound
    }

    takeDamage(amount) {
        if (this.isDefeated) return;
        this.health -= amount;
        // console.log(`Soldier took ${amount} damage, health: ${this.health}`);
        if (this.health <= 0) {
            this.health = 0;
            this.isDefeated = true;
            this.state = 'defeated';
            console.log("Soldier defeated!");
            // playSound(sfxSoldierDefeated);
        }
    }

    draw(ctx) {
        if (this.isDefeated && this.health <=0) { // Only draw if truly defeated (or some other visual like rubble)
             // Could draw a different 'defeated' sprite or just not draw
             ctx.fillStyle = 'darkred'; // Simple defeated indicator
             ctx.fillRect(this.x, this.y + this.height * 0.6, this.width, this.height * 0.4);
             return;
        }

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw rifle (simple line for aiming)
        if (!this.isDefeated) {
            const rifleLength = this.width * 0.75;
            const startX = this.x + this.width / 2;
            const startY = this.y + this.height / 2;
            const endX = startX + Math.cos(this.rifleAngle) * rifleLength;
            const endY = startY + Math.sin(this.rifleAngle) * rifleLength;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = 1; // Reset line width
        }
    }
}
