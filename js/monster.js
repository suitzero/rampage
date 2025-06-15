// Monster Class
class Monster {
    constructor(x, y, initialSize, color, speed, key_config, punch_key_code, spriteSheet = null, frameWidth = 0, frameHeight = 0) {
        this.x = x;
        this.y = y;
        this.size = initialSize;
        this.color = color;
        this.speed = speed;
        this.initialHealth = 100;
        this.currentHealth = this.initialHealth;
        this.isDefeated = false;
        this.invulnerableTime = 0;
        this.invulnerabilityDuration = 60;
        this.key_config = key_config;
        this.punch_key_code = punch_key_code;
        this.isPunching = false;
        this.punchDuration = 30;
        this.punchTimer = 0;
        this.isClimbing = false;
        this.spriteSheet = spriteSheet;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.currentFrame = 0;
        this.isMoving = false;
        this.facingDirection = 'right';

        this.isAIControlled = false;
        this.aiAction = { left: false, right: false, up: false, down: false, punch: false };

        this.animations = {
            'idle':     { rowIndex: 0, frameCount: 2, frameInterval: 20, loop: true },
            'walk':     { rowIndex: 1, frameCount: 4, frameInterval: 10, loop: true },
            'punch':    { rowIndex: 2, frameCount: 3, frameInterval: 7,  loop: false },
            'climb':    { rowIndex: 3, frameCount: 2, frameInterval: 15, loop: true },
            'hit':      { rowIndex: 4, frameCount: 1, frameInterval: 10, loop: false },
            'defeated': { rowIndex: 5, frameCount: 1, frameInterval: 1,  loop: false }
        };
        this.currentAnimation = 'idle';
        if (!this.animations[this.currentAnimation]) {
            console.error(`Animation "${this.currentAnimation}" not found! Defaulting to first animation or static frame.`);
            const firstAnimName = Object.keys(this.animations)[0];
            if (firstAnimName) {
                this.currentAnimation = firstAnimName;
            } else {
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
                let sourceY = currentAnimConfig.rowIndex * this.frameHeight;

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
                } else {
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
        // const canvasWidth = (typeof canvas !== 'undefined') ? canvas.width : 800; // Fallback

        if (this.isDefeated) {
            this.setCurrentAnimation('defeated');
            this.updateAnimationFrame();
            return;
        }

        let PUNCH_ACTION_TRIGGERED = false;

        if (this.isAIControlled) {
            if (this.aiAction.punch) {
                this.punch();
                this.aiAction.punch = false;
                PUNCH_ACTION_TRIGGERED = true;
            }
        }

        if (this.invulnerableTime > 0) {
            this.invulnerableTime--;
            if (this.currentAnimation === 'hit' && this.invulnerableTime === 0) {
                this.setCurrentAnimation('idle');
            }
        }

        if (this.isPunching) {
            if (this.currentAnimation !== 'hit') {
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

        if (!this.isPunching && !(this.currentAnimation === 'hit' && this.invulnerableTime > 0) && !PUNCH_ACTION_TRIGGERED) {
            this.isMoving = false;
            if (this.isAIControlled) {
                if (this.aiAction.left && this.x > 0) {
                    this.x -= this.speed; this.facingDirection = 'left'; this.isMoving = true;
                }
                if (this.aiAction.right && this.x < ( (typeof canvas !== 'undefined' ? canvas.width : 800) - (this.frameWidth || this.size)) ) {
                    this.x += this.speed; this.facingDirection = 'right'; this.isMoving = true;
                }
            } else if (current_key_state) { // Human player
                if (current_key_state[this.key_config.left] && this.x > 0) {
                    this.x -= this.speed; this.facingDirection = 'left'; this.isMoving = true;
                }
                if (current_key_state[this.key_config.right] && this.x < ( (typeof canvas !== 'undefined' ? canvas.width : 800) - (this.frameWidth || this.size)) ) {
                    this.x += this.speed; this.facingDirection = 'right'; this.isMoving = true;
                }
                 // Human climbing logic would be here, using current_key_state for up/down
            }

            this.isClimbing = false;
            let collidingBuilding = null; // This needs access to the global `buildings` array or have it passed.
            // Assuming `buildings` is global for now as per original structure.
            if (typeof buildings !== 'undefined') {
                for (const building of buildings) {
                    if (building.isDestroyed()) continue;
                    // Ensure checkCollision is available. It should be in utils.js and global.
                    const collisionResult = (typeof checkCollision === 'function') ? checkCollision(this, building) : false;
                    const verticalOverlapCheck = (this.y + (this.frameHeight || this.size) > building.y && this.y < building.y + building.height);
                    if (collisionResult && verticalOverlapCheck) {
                        this.isClimbing = true;
                        collidingBuilding = building;
                        // console.log(`[CLIMB_SUCCESS] Monster ${this.color} IS NOW CLIMBING building at X: ${building.x.toFixed(1)}`);
                        break;
                    }
                }
            }


            if (this.isClimbing && collidingBuilding) {
                this.isMoving = true; // AI currently doesn't set this.isClimbing
                this.setCurrentAnimation('climb');
                if (this.isAIControlled) {
                    // Basic AI climbing movement if aiAction.up/down were implemented
                    if (this.aiAction.up && this.y > 0) {
                         this.y -= this.speed; if (this.y < collidingBuilding.y) this.y = collidingBuilding.y;
                    }
                    if (this.aiAction.down && this.y < ((typeof canvas !== 'undefined' ? canvas.height : 700) - (this.frameHeight || this.size))) {
                        this.y += this.speed; if (this.y + (this.frameHeight || this.size) > collidingBuilding.y + collidingBuilding.height) this.y = collidingBuilding.y + collidingBuilding.height - (this.frameHeight || this.size);
                    }
                } else if (current_key_state) { // Human player
                    if (current_key_state[this.key_config.up] && this.y > 0) {
                        this.y -= this.speed; if (this.y < collidingBuilding.y) this.y = collidingBuilding.y;
                    }
                    if (current_key_state[this.key_config.down] && this.y < ((typeof canvas !== 'undefined' ? canvas.height : 700) - (this.frameHeight || this.size))) {
                        this.y += this.speed; if (this.y + (this.frameHeight || this.size) > collidingBuilding.y + collidingBuilding.height) this.y = collidingBuilding.y + collidingBuilding.height - (this.frameHeight || this.size);
                    }
                }
            } else { // Not climbing or no colliding building
                // Apply gravity if not climbing. AI will also be affected by gravity.
                this.y += GRAVITY * 5;
                if (this.isMoving) { // isMoving is set by directional input (AI or human)
                    this.setCurrentAnimation('walk');
                } else {
                    this.setCurrentAnimation('idle');
                }
            }

            // Ground check - apply to both AI and human
            if (this.y < 0) {
                this.y = 0;
            }
            // Use canvas.height if available, otherwise fallback
            const gameHeight = (typeof canvas !== 'undefined') ? canvas.height : 700;
            if (this.y > gameHeight - (this.frameHeight || this.size)) {
                this.y = gameHeight - (this.frameHeight || this.size);
                if (!this.isClimbing) { // If on the ground and not climbing
                    if (this.isMoving) { // isMoving is true if there was horizontal input
                        this.setCurrentAnimation('walk');
                    } else { // Not moving horizontally
                        this.setCurrentAnimation('idle');
                    }
                } // If it was climbing and hit the ground, it might transition to idle/walk if no longer on building
            } // This is the actual end of the if (this.y > gameHeight ...)
        } // End of main movement/climbing logic block

        this.updateAnimationFrame();
    } // End of update() method

    punch() {
        if (this.isPunching && this.punchTimer < this.punchDuration) {
           return;
        }
        playSound(sfxPunch);
        this.isPunching = true;
        this.punchTimer = 0;
        this.setCurrentAnimation('punch');

        // PunchingPower needs to be defined for the monster, e.g. this.punchingPower = someValue; in constructor
        // Assuming it's defined.
        console.log(`[LOG] Monster ${this.color} PUNCH action. PunchingPower: ${this.punchingPower || 'N/A'}`);


        // Check collisions with buildings
        if (typeof buildings !== 'undefined') {
            for (const building of buildings) {
                if (!building.isDestroyed() && (typeof checkCollision === 'function' && checkCollision(this, building))) {
                    // console.log(`[LOG] Monster ${this.color} attempting to damage Building.`);
                    // console.log(`[LOG]   Building Initial Health: ${building.initialHealth}, Current Health (before): ${building.currentHealth}`);
                    // console.log(`[LOG]   Monster Punching Power: ${this.punchingPower}`);
                    building.takeDamage(this.punchingPower || 20); // Provide default punch power if undefined
                }
            }
        }

        // Check collisions with other AI enemies (the flying ones)
        if (typeof aiEnemies !== 'undefined') {
            for (const aiEnemy of aiEnemies) {
                if (!aiEnemy.isDestroyed() && (typeof checkCollision === 'function' && checkCollision(this, aiEnemy))) {
                    aiEnemy.takeDamage(this.punchingPower || 20); // Provide default punch power
                }
            }
        }
        // Note: Collision with the *other monster* (player or AI) is not handled here.
        // That would typically be a separate check in the game loop or a physics engine.
    }

    updateAI(targetMonster, buildingsContext) {
        if (!this.isAIControlled || this.isDefeated) return;

        this.aiAction.left = false;
        this.aiAction.right = false;
        this.aiAction.up = false;
        this.aiAction.down = false;
        this.aiAction.punch = false;

        if (!targetMonster || targetMonster.isDefeated) {
            return;
        }

        const horizontalDistance = targetMonster.x - this.x;
        const verticalDistance = targetMonster.y - this.y;
        const aggressionFactor = 0.03;

        const buffer = this.speed;
        if (horizontalDistance > buffer) {
            this.aiAction.right = true;
        } else if (horizontalDistance < -buffer) {
            this.aiAction.left = true;
        }

        if (Math.abs(horizontalDistance) < (this.frameWidth || this.size) * 1.5 &&
            Math.abs(verticalDistance) < (this.frameHeight || this.size)) {

            const isFacingTarget = (this.facingDirection === 'right' && horizontalDistance > 0) ||
                                 (this.facingDirection === 'left' && horizontalDistance < 0);

            if (isFacingTarget && Math.random() < aggressionFactor) {
                this.aiAction.punch = true;
            }
        }
    }

    setCurrentAnimation(newAnimationName) {
        if (!this.animations[newAnimationName]) {
            console.warn(`Animation "${newAnimationName}" not found for monster ${this.color}. Current animation: ${this.currentAnimation}`);
            const animConfig = this.animations[this.currentAnimation];
            if (animConfig) {
                this.animationFrameCount = animConfig.frameCount;
                this.frameInterval = animConfig.frameInterval;
            } else {
                this.animationFrameCount = 1;
                this.frameInterval = 100;
                console.error(`Monster ${this.color} has no valid current animation and "${newAnimationName}" is also invalid.`);
            }
            return;
        }

        if (this.currentAnimation !== newAnimationName) {
            this.currentAnimation = newAnimationName;
            this.currentFrame = 0;
            const animConfig = this.animations[this.currentAnimation];
            this.animationFrameCount = animConfig.frameCount;
            this.frameInterval = animConfig.frameInterval;
            this.frameTimer = 0;
        }
    }

    updateAnimationFrame() {
        const currentAnimConfig = this.animations[this.currentAnimation];
        if (!currentAnimConfig) return;
        const loopAnimation = currentAnimConfig.loop !== undefined ? currentAnimConfig.loop : true;
        const frameCount = currentAnimConfig.frameCount;
        const frameInterval = currentAnimConfig.frameInterval;
        if (frameCount <= 1) return;
        if (!loopAnimation && this.currentFrame === frameCount - 1) {
            return;
        }
        this.frameTimer++;
        if (this.frameTimer >= frameInterval) {
            this.frameTimer = 0;
            this.currentFrame++;
            if (this.currentFrame >= frameCount) {
                if (loopAnimation) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = frameCount - 1;
                }
            }
        }
    }
}
