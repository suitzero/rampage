// Building Class
class Building {
    constructor(x, y, width, height, initialHealth = 100,
                spriteSheet = null, frameWidth = 0, frameHeight = 0, damageFramesConfig = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.initialHealth = initialHealth;
        this.currentHealth = initialHealth;
        this.spriteSheet = spriteSheet;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.damageFramesConfig = damageFramesConfig || {
            '100': { sx: 0, sy: 0 },
            '0':   { sx: 0, sy: 0 }
        };
    }

    draw(ctx) {
        if (this.spriteSheet && this.frameWidth > 0 && this.frameHeight > 0 && this.damageFramesConfig) {
            let sourceX = 0;
            let sourceY = 0;
            const healthPercentage = (this.currentHealth / this.initialHealth) * 100;
            let chosenFrameKey = '0';
            const sortedNumericThresholds = Object.keys(this.damageFramesConfig)
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
            const frameInfo = this.damageFramesConfig[chosenFrameKey];
            if (frameInfo) {
                sourceX = frameInfo.sx;
                sourceY = frameInfo.sy;
            } else {
                const fallbackFrameConf = this.damageFramesConfig['100'] || this.damageFramesConfig['0'] || this.damageFramesConfig[Object.keys(this.damageFramesConfig)[0]];
                if(fallbackFrameConf){
                    sourceX = fallbackFrameConf.sx;
                    sourceY = fallbackFrameConf.sy;
                }
            }
            ctx.drawImage(
                this.spriteSheet,
                sourceX, sourceY,
                this.frameWidth, this.frameHeight,
                this.x, this.y,
                this.frameWidth, this.frameHeight
            );
        } else {
            let color = 'grey';
            const healthPercent = this.currentHealth / this.initialHealth;
            if (this.isDestroyed()) {
                color = '#555';
            } else if (healthPercent < 0.3) {
                color = '#A52A2A';
            } else if (healthPercent < 0.7) {
                color = '#D2B48C';
            }
            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        if (!this.isDestroyed()) {
            const healthBarWidth = this.width;
            const healthBarHeight = 5;
            const healthBarX = this.x;
            const healthBarY = this.y - healthBarHeight - 3;
            ctx.fillStyle = 'grey';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            const currentHealthPercentage = this.currentHealth / this.initialHealth;
            let healthBarColor = 'green';
            if (currentHealthPercentage < 0.3) healthBarColor = 'red';
            else if (currentHealthPercentage < 0.6) healthBarColor = 'orange';
            ctx.fillStyle = healthBarColor;
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth * currentHealthPercentage, healthBarHeight);
        }
    }

    takeDamage(amount) {
        // --- Ensure numeric values ---
        const numericAmount = Number(amount);
        if (isNaN(numericAmount)) {
            console.error(`[FIX][Building.takeDamage] Invalid damage amount received: ${amount}. Aborting damage.`);
            return;
        }
        if (numericAmount <= 0) {
            return;
        }
        this.currentHealth = Number(this.currentHealth);
        if (isNaN(this.currentHealth)) {
            console.error(`[FIX][Building.takeDamage] Building currentHealth was NaN for building at X:${this.x}. Resetting to initialHealth.`);
            this.currentHealth = Number(this.initialHealth);
             if (isNaN(this.currentHealth)) {
                console.error(`[FIX][Building.takeDamage] Building initialHealth is also NaN for building at X:${this.x}. Cannot apply damage.`);
                return;
            }
        }
        // --- End Ensure numeric values ---

        console.log(`[LOG][Building.takeDamage] Called. Building X: ${this.x}, Amount: ${numericAmount}, Current Health (at entry): ${this.currentHealth}`);

        if (this.isDestroyed()) { // isDestroyed uses currentHealth, so it's after numeric conversion
            console.log(`[LOG][Building.takeDamage]   Already destroyed. No action.`);
            return;
        }

        console.log(`[LOG][Building.takeDamage]   Initial Health: ${this.initialHealth}, Current Health (before subtract): ${this.currentHealth}`);
        this.currentHealth -= numericAmount;
        console.log(`[LOG][Building.takeDamage]   Current Health (after subtract): ${this.currentHealth}`);

        if (this.currentHealth <= 0) {
            this.currentHealth = 0; // Clamp health at 0
            score += 100;
            console.log(`[LOG][Building.takeDamage]   DESTROYED by this hit! Score: ${score}. Final Health: ${this.currentHealth}`);
            playSound(sfxBuildingDestroyed);
        } else {
            console.log(`[LOG][Building.takeDamage]   Damaged, not destroyed. Current Health: ${this.currentHealth}`);
            playSound(sfxBuildingDamage);
        }
    }

    isDestroyed() {
        return this.currentHealth <= 0;
    }
}
