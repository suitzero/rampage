function checkCollision(obj1, obj2) {
    // Basic AABB collision detection
    // Consider sprite width/height if available, otherwise use 'size'
    const obj1Right = obj1.x + (obj1.frameWidth || obj1.width || obj1.size);
    const obj1Bottom = obj1.y + (obj1.frameHeight || obj1.height || obj1.size);
    const obj2Right = obj2.x + (obj2.frameWidth || obj2.width || obj2.size);
    const obj2Bottom = obj2.y + (obj2.frameHeight || obj2.height || obj2.size);

    if (obj1.x < obj2Right &&
        obj1Right > obj2.x &&
        obj1.y < obj2Bottom &&
        obj1Bottom > obj2.y) {
        // Collision detected
        return true;
    }
    // No collision
    return false;
}
