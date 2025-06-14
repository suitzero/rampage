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
        if (this.isDefeated) {
            this.setCurrentAnimation('defeated');
            this.updateAnimationFrame();
            return;
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

        if (!this.isPunching && !(this.currentAnimation === 'hit' && this.invulnerableTime > 0)) {
            this.isMoving = false;
            if (current_key_state[this.key_config.left] && this.x > 0) {
                this.x -= this.speed; this.facingDirection = 'left'; this.isMoving = true;
            }
            if (current_key_state[this.key_config.right] && this.x < canvas.width - this.size) {
                this.x += this.speed; this.facingDirection = 'right'; this.isMoving = true;
            }

            this.isClimbing = false;
            let collidingBuilding = null;
            for (const building of buildings) {
                if (building.isDestroyed()) continue;
                const collisionResult = checkCollision(this, building);
                const verticalOverlapCheck = (this.y + this.size > building.y && this.y < building.y + building.height);
                if (collisionResult && verticalOverlapCheck) {
                    this.isClimbing = true;
                    collidingBuilding = building;
                    console.log(`[CLIMB_SUCCESS] Monster ${this.color} IS NOW CLIMBING building at X: ${building.x.toFixed(1)}`);
                    break;
                }
            }

            if (this.isClimbing && collidingBuilding) {
                this.isMoving = true;
                this.setCurrentAnimation('climb');
                if (current_key_state[this.key_config.up] && this.y > 0) {
                    this.y -= this.speed; if (this.y < collidingBuilding.y) this.y = collidingBuilding.y;
                }
                if (current_key_state[this.key_config.down] && this.y < canvas.height - this.size) {
                    this.y += this.speed; if (this.y + this.size > collidingBuilding.y + collidingBuilding.height) this.y = collidingBuilding.y + collidingBuilding.height - this.size;
                }
            } else {
                this.y += GRAVITY * 5;
                if (this.isMoving) {
                    this.setCurrentAnimation('walk');
                } else {
                    this.setCurrentAnimation('idle');
                }
            }

            if (this.y < 0) {
                this.y = 0;
            }
            if (this.y > canvas.height - this.size) {
                this.y = canvas.height - this.size;
                if (!this.isClimbing) {
                    if (this.isMoving) {
                        this.setCurrentAnimation('walk');
                    } else {
                        this.setCurrentAnimation('idle');
                    }
                }
            }
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

        console.log(`[LOG] Monster ${this.color} PUNCH action. PunchingPower: ${this.punchingPower}`);

        let hitBuilding = false;
        for (const building of buildings) {
            if (!building.isDestroyed() && checkCollision(this, building)) {
                console.log(`[LOG] Monster ${this.color} attempting to damage Building.`);
                console.log(`[LOG]   Building Initial Health: ${building.initialHealth}, Current Health (before): ${building.currentHealth}`);
                console.log(`[LOG]   Monster Punching Power: ${this.punchingPower}`);
                building.takeDamage(this.punchingPower);
                hitBuilding = true;
            }
        }

        let hitAIEnemy = false;
        for (const aiEnemy of aiEnemies) {
            if (!aiEnemy.isDestroyed() && checkCollision(this, aiEnemy)) {
                aiEnemy.takeDamage(this.punchingPower);
                hitAIEnemy = true;
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
