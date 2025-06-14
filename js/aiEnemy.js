// AIEnemy Class
class AIEnemy {
    constructor(x, y, initialWidth, initialHeight, color, speed, health,
                spriteSheet = null, frameWidth = 0, frameHeight = 0,
                animationFrameCount = 1, frameInterval = 20) {
        this.x = x;
        this.y = y;
        this.width = initialWidth;
        this.height = initialHeight;
        this.color = color;
        this.speed = speed;
        this.initialHealth = health;
        this.currentHealth = health;
        this.direction = 1;
        this.fireCooldown = 0;
        this.fireRate = 120;
        this.spriteSheet = spriteSheet;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.currentFrame = 0;
        this.animationFrameCount = animationFrameCount;
        this.frameTimer = 0;
        this.frameInterval = frameInterval;
    }

    draw(ctx) {
        if (this.spriteSheet && this.frameWidth > 0 && this.frameHeight > 0) {
            const sourceX = this.currentFrame * this.frameWidth;
            const sourceY = 0;
            const drawWidth = this.frameWidth;
            const drawHeight = this.frameHeight;
            if (this.direction === -1) {
                ctx.drawImage(this.spriteSheet, sourceX, sourceY, this.frameWidth, this.frameHeight,
                              this.x, this.y, drawWidth, drawHeight);
            } else {
                ctx.drawImage(this.spriteSheet, sourceX, sourceY, this.frameWidth, this.frameHeight,
                              this.x, this.y, drawWidth, drawHeight);
            }
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        const displayWidth = (this.spriteSheet && this.frameWidth > 0) ? this.frameWidth : this.width;
        if (this.currentHealth > 0) {
            const healthBarHeight = 4;
            const healthBarX = this.x;
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
            return;
        }
        this.x += this.speed * this.direction;
        if (this.x + this.width > canvas.width || this.x < 0) {
            this.direction *= -1;
        }
        if (this.fireCooldown <= 0) {
            const projectileX = this.x + this.width / 2 - (PROJECTILE_FRAME_WIDTH / 2);
            const projectileY = this.y + this.height;
            enemyProjectiles.push(new Projectile(
                projectileX, projectileY,
                8, 'yellow', 4, 10,
                projectileSpriteSheet, PROJECTILE_FRAME_WIDTH, PROJECTILE_FRAME_HEIGHT
            ));
            playSound(sfxEnemyShoot);
            this.fireCooldown = this.fireRate;
        } else {
            this.fireCooldown--;
        }
        this.updateAnimationFrame();
    }

    takeDamage(amount) {
        if (this.isDestroyed()) return;
        this.currentHealth -= amount;
        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            score += 50;
            console.log("AIEnemy defeated! Score: " + score);
            playSound(sfxEnemyDestroyed);
        }
    }

    updateAnimationFrame() {
        if (this.animationFrameCount <= 1) {
            return;
        }
        this.frameTimer++;
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;
            this.currentFrame++;
            if (this.currentFrame >= this.animationFrameCount) {
                this.currentFrame = 0;
            }
        }
    }

    isDestroyed() {
        return this.currentHealth <= 0;
    }
}
