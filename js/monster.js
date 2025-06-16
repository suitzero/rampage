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
        this.collidingBuilding = null; // Add this new property
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
            this.collidingBuilding = null; // Reset at start of check, assign to class property
            // Assuming `buildings` is global for now as per original structure.
            if (typeof buildings !== 'undefined') {
                for (const building of buildings) {
                    if (building.isDestroyed()) continue;
                    const collisionResult = (typeof checkCollision === 'function') ? checkCollision(this, building) : false;
                    const verticalOverlapCheck = (this.y + (this.frameHeight || this.size) > building.y && this.y < building.y + building.height);
                    // ADD LOGGING HERE (for human player)
                    if (!this.isAIControlled && collisionResult) { // Log only for human and if basic collision is true
                        // console.log(`[P1 CLIMB CHECK] Building (X:${building.x.toFixed(0)}): Collision=${collisionResult}, V.Overlap=${verticalOverlapCheck} (MonsterY:${this.y.toFixed(0)}, MonsterBottom:${(this.y + (this.frameHeight || this.size)).toFixed(0)}, BuildY:${building.y.toFixed(0)}, BuildBottom:${(building.y + building.height).toFixed(0)})`);
                    }
                    if (collisionResult && verticalOverlapCheck) {
                        this.isClimbing = true;
                        this.collidingBuilding = building;
                        if (!this.isAIControlled) { // Log only for human
                             console.log(`[P1 CLIMB STATUS SET] Now climbing building at X: ${building.x.toFixed(1)}. Monster Y: ${this.y.toFixed(1)}`);
                        }
                        break;
                    }
                }
            }


            if (this.isClimbing && this.collidingBuilding) { // Use class property
                this.isMoving = true;
                this.setCurrentAnimation('climb');
                if (this.isAIControlled) {
                    // Basic AI climbing movement if aiAction.up/down were implemented
                    if (this.aiAction.up && this.y > 0) {
                         this.y -= this.speed; if (this.y < this.collidingBuilding.y) this.y = this.collidingBuilding.y;
                    }
                    if (this.aiAction.down && this.y < ((typeof canvas !== 'undefined' ? canvas.height : 700) - (this.frameHeight || this.size))) {
                        this.y += this.speed; if (this.y + (this.frameHeight || this.size) > this.collidingBuilding.y + this.collidingBuilding.height) this.y = this.collidingBuilding.y + this.collidingBuilding.height - (this.frameHeight || this.size);
                    }
                } else if (current_key_state) { // Human player
                    // ADD LOGS FOR HUMAN PLAYER INPUT AND GENERAL STATE (moved here to be within current_key_state check)
                    // console.log(`[P1 UPDATE] Keys: Left=${current_key_state[this.key_config.left]}, Right=${current_key_state[this.key_config.right]}, Up=${current_key_state[this.key_config.up]}, Down=${current_key_state[this.key_config.down]}`);
                    // console.log(`[P1 UPDATE] isClimbing: ${this.isClimbing}, Y: ${this.y.toFixed(1)}, Speed: ${this.speed}`);
                    // if (this.collidingBuilding) {
                    //     console.log(`[P1 UPDATE] CollidingBuilding Y: ${this.collidingBuilding.y.toFixed(1)}, Height: ${this.collidingBuilding.height.toFixed(1)}`);
                    // } else if (this.isClimbing) { // Should not happen if this.collidingBuilding is null here
                    //     console.warn('[P1 UPDATE] isClimbing is true but no this.collidingBuilding object!');
                    // }

                    let localCollidingBuildingForHuman = null;
                    // Re-check current collision for human player to get the precise building for this frame's up/down action
                    if (typeof buildings !== 'undefined') {
                        for (const building of buildings) {
                            if (building.isDestroyed()) continue;
                            const collisionResult = (typeof checkCollision === 'function') ? checkCollision(this, building) : false;
                            const verticalOverlapCheck = (this.y + (this.frameHeight || this.size) > building.y && this.y < building.y + building.height);
                            if (collisionResult && verticalOverlapCheck) {
                                localCollidingBuildingForHuman = building;
                                break;
                            }
                        }
                    }

                    if (localCollidingBuildingForHuman) { // Only proceed with up/down if we confirm a specific building NOW
                        if (!this.isAIControlled) { // Key state logging, relevant if localCollidingBuildingForHuman exists
                            // console.log(`[P1 KEY STATE] Up: ${current_key_state[this.key_config.up]}, Down: ${current_key_state[this.key_config.down]}`);
                        }

                        // UP KEY LOGIC
                        if (current_key_state[this.key_config.up]) {
                            console.log(`[P1 CLIMB UP ATTEMPT] Y: ${this.y.toFixed(1)}, KeyUp: ${current_key_state[this.key_config.up]}, Speed: ${this.speed}, LocalBuildingTopY: ${localCollidingBuildingForHuman.y.toFixed(1)}`);
                            if (this.y > localCollidingBuildingForHuman.y) {
                                this.y -= this.speed;
                                console.log(`[P1 CLIMB UP ACTION] NewY: ${this.y.toFixed(1)} (Moved by -${this.speed})`);
                                if (this.y < localCollidingBuildingForHuman.y) {
                                    this.y = localCollidingBuildingForHuman.y;
                                    console.log(`[P1 CLIMB UP ADJUST] Adjusted NewY to LocalBuildingTopY: ${this.y.toFixed(1)}`);
                                }
                            } else {
                                console.log('[P1 CLIMB UP BLOCKED] Already at or above local building top.');
                            }
                        }

                        // DOWN KEY LOGIC
                        if (current_key_state[this.key_config.down]) {
                            const monsterBottomY = this.y + (this.frameHeight || this.size);
                            const buildingBottomY = localCollidingBuildingForHuman.y + localCollidingBuildingForHuman.height;
                            console.log(`[P1 CLIMB DOWN ATTEMPT] Y: ${this.y.toFixed(1)}, KeyDown: ${current_key_state[this.key_config.down]}, MonsterBottom: ${monsterBottomY.toFixed(1)}, LocalBuildingBottomY: ${buildingBottomY.toFixed(1)}`);
                            if (monsterBottomY < buildingBottomY) {
                                this.y += this.speed;
                                console.log(`[P1 CLIMB DOWN ACTION] NewY: ${this.y.toFixed(1)} (Moved by +${this.speed})`);
                                if (this.y + (this.frameHeight || this.size) > buildingBottomY) {
                                    this.y = buildingBottomY - (this.frameHeight || this.size);
                                    console.log(`[P1 CLIMB DOWN ADJUST] Adjusted NewY for MonsterBottom at LocalBuildingBottomY: ${this.y.toFixed(1)}`);
                                }
                            } else {
                                console.log('[P1 CLIMB DOWN BLOCKED] Already at or below local building bottom.');
                            }
                        }
                    } else if (this.isClimbing) {
                        // This case means this.isClimbing was true (likely from previous frame or earlier in this frame),
                        // but we couldn't re-confirm a specific building collision for up/down movement.
                        // This might happen if the monster is just barely at an edge.
                        // For safety, don't perform up/down movement. Gravity will apply if not on a building.
                        console.warn('[P1 CLIMB] isClimbing is true, but no specific localCollidingBuildingForHuman found for up/down action.');
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
        if (!this.isAIControlled || this.isDefeated) {
            this.aiAction.left = false;
            this.aiAction.right = false;
            this.aiAction.up = false;
            this.aiAction.down = false;
            this.aiAction.punch = false;
            return;
        }

        this.aiAction.left = false;
        this.aiAction.right = false;
        this.aiAction.up = false;
        this.aiAction.down = false;
        this.aiAction.punch = false;

        if (!targetMonster || targetMonster.isDefeated) {
            return;
        }

        const horizontalDistance = targetMonster.x - this.x;
        const verticalDistance = targetMonster.y - this.y; // Positive if target is lower, negative if target is higher
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

        // AI Climbing Logic - using this.isClimbing (set in previous frame's update)
        // and this.collidingBuilding (also from previous frame's update)
        if (this.isClimbing && this.collidingBuilding) {
            if (verticalDistance < -this.speed) { // Target is significantly above
                this.aiAction.up = true;
            } else if (verticalDistance > this.speed) { // Target is significantly below
                this.aiAction.down = true;
            }
        } else if (!this.isClimbing && targetMonster.isClimbing && targetMonster.collidingBuilding) {
            // AI is not climbing, but target is. Horizontal movement should handle getting to building.
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
