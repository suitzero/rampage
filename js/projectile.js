// Projectile Class (fired by AIEnemies)
class Projectile {
    constructor(x, y, initialSize, color, speedY, damage, spriteSheet = null, frameWidth = 0, frameHeight = 0) {
        this.x = x;
        this.y = y;
        this.size = initialSize;
        this.color = color;
        this.speedY = speedY;
        this.damage = damage;
        this.spriteSheet = spriteSheet;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.currentFrame = 0;
    }

    draw(ctx) {
        if (this.spriteSheet && this.frameWidth > 0 && this.frameHeight > 0) {
            const sourceX = this.currentFrame * this.frameWidth;
            const sourceY = 0;
            const drawWidth = this.frameWidth;
            const drawHeight = this.frameHeight;
            ctx.drawImage(this.spriteSheet, sourceX, sourceY, this.frameWidth, this.frameHeight,
                          this.x, this.y, drawWidth, drawHeight);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }

    update() {
        this.y += this.speedY;
    }
}
