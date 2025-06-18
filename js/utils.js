function checkCollision(obj1, obj2) {
    // Determine the effective dimensions and position for obj1
    const obj1X = obj1.x;
    const obj1Y = obj1.y;
    // Ensure frameWidth/frameHeight are only used if they are valid numbers > 0
    const obj1Width = (obj1.spriteSheet && typeof obj1.frameWidth === 'number' && obj1.frameWidth > 0) ? obj1.frameWidth : obj1.size;
    const obj1Height = (obj1.spriteSheet && typeof obj1.frameHeight === 'number' && obj1.frameHeight > 0) ? obj1.frameHeight : obj1.size;

    // Determine the effective dimensions and position for obj2
    let obj2X, obj2Y, obj2Width, obj2Height;

    // Note: If utils.js is loaded before class definitions, instanceof will not work as expected.
    // This might be a pre-existing issue or needs careful load order management.
    if (typeof Building !== 'undefined' && obj2 instanceof Building) {
        obj2X = obj2.x;
        obj2Y = obj2.y;
        obj2Width = (obj2.spriteSheet && typeof obj2.frameWidth === 'number' && obj2.frameWidth > 0 && obj2.spriteSheet.complete) ? obj2.frameWidth : obj2.width;
        obj2Height = (obj2.spriteSheet && typeof obj2.frameHeight === 'number' && obj2.frameHeight > 0 && obj2.spriteSheet.complete) ? obj2.frameHeight : obj2.height;
    } else if (typeof AIEnemy !== 'undefined' && obj2 instanceof AIEnemy) {
        obj2X = obj2.x;
        obj2Y = obj2.y;
        obj2Width = (obj2.spriteSheet && typeof obj2.frameWidth === 'number' && obj2.frameWidth > 0 && obj2.spriteSheet.complete) ? obj2.frameWidth : obj2.width;
        obj2Height = (obj2.spriteSheet && typeof obj2.frameHeight === 'number' && obj2.frameHeight > 0 && obj2.spriteSheet.complete) ? obj2.frameHeight : obj2.height;
    } else if (typeof Projectile !== 'undefined' && obj2 instanceof Projectile) {
        obj2X = obj2.x;
        obj2Y = obj2.y;
        obj2Width = (obj2.spriteSheet && typeof obj2.frameWidth === 'number' && obj2.frameWidth > 0 && obj2.spriteSheet.complete) ? obj2.frameWidth : obj2.size;
        obj2Height = (obj2.spriteSheet && typeof obj2.frameHeight === 'number' && obj2.frameHeight > 0 && obj2.spriteSheet.complete) ? obj2.frameHeight : obj2.size;
    } else {
        // Fallback for other object types or if instanceof checks fail due to load order
        obj2X = obj2.x;
        obj2Y = obj2.y;
        obj2Width = obj2.size || obj2.width;
        obj2Height = obj2.size || obj2.height;
    }

    // ADD LOGGING HERE:
    const obj1Type = obj1.constructor ? obj1.constructor.name : 'Unknown'; // Get class name if possible
    const obj2Type = obj2.constructor ? obj2.constructor.name : 'Unknown';
    // console.log(`[checkCollision] obj1 (${obj1Type}): x=${obj1X?.toFixed(1)}, y=${obj1Y?.toFixed(1)}, w=${obj1Width?.toFixed(1)}, h=${obj1Height?.toFixed(1)}`);
    // console.log(`[checkCollision] obj2 (${obj2Type}): x=${obj2X?.toFixed(1)}, y=${obj2Y?.toFixed(1)}, w=${obj2Width?.toFixed(1)}, h=${obj2Height?.toFixed(1)}`);

    // Basic AABB collision detection logic
    const collision = obj1X < obj2X + obj2Width &&
                    obj1X + obj1Width > obj2X &&
                    obj1Y < obj2Y + obj2Height &&
                    obj1Y + obj1Height > obj2Y;

    // console.log(`[checkCollision] Result for ${obj1Type} vs ${obj2Type}: ${collision}`);

    if (collision) {
        // console.log(`[checkCollision] Collision DETECTED between ${obj1Type} at X:${obj1X.toFixed(1)} and ${obj2Type} at X:${obj2X.toFixed(1)}`);
    }

    return collision;
}

// Helper to create mock game objects for testing
function createMockObject(x, y, width, height, type = 'Object', spriteSheet = null, frameWidth = 0, frameHeight = 0, size = 0) {
    let mock = { x, y, type }; // 'type' is just for logging clarity in tests
    mock.constructor = { name: type }; // Mimic obj.constructor.name

    if (type === 'Monster' || type === 'Projectile') {
        mock.size = size || Math.max(width, height); // Fallback size
    }
    if (type === 'Building' || type === 'AIEnemy' || type === 'Monster') {
        // For Monster type, width/height are only primary if no spritesheet,
        // but checkCollision prioritizes frameWidth/Height if spritesheet exists.
        // This mock setup ensures these are available for fallback or direct use.
        mock.width = width;
        mock.height = height;
    }

    mock.spriteSheet = spriteSheet;
    if (spriteSheet) {
        mock.frameWidth = frameWidth || width;
        mock.frameHeight = frameHeight || height;
    } else {
        // If no spritesheet, ensure frameWidth/Height are 0 so checkCollision's logic
        // for (obj1.spriteSheet && obj1.frameWidth > 0) correctly falls back.
        mock.frameWidth = 0;
        mock.frameHeight = 0;
    }
    // Ensure .size is present if it's a primary dimension for some types / fallback
    if (!mock.width && !mock.frameWidth) mock.size = mock.size || width; // Simplified fallback
    if (!mock.height && !mock.frameHeight) mock.size = mock.size || height; // Simplified fallback


    return mock;
}

function runCheckCollisionTests() {
    console.log("--- Running checkCollision Unit Tests ---");

    let testCases = [
        // Scenario 1: Clear Collision (Monster using size)
        { desc: "S1: Monster (size) vs Building (width/height) - Clear Collision",
          obj1: createMockObject(50, 50, 0, 0, 'Monster', null, 0, 0, 30),
          obj2: createMockObject(60, 60, 50, 50, 'Building'),
          expected: true },
        // Scenario 2: No Collision (Monster using frameWidth/Height)
        { desc: "S2: Monster (sprite) vs Building - No Collision (separated)",
          obj1: createMockObject(0, 0, 32, 32, 'Monster', {complete: true}, 32, 32, 0),
          obj2: createMockObject(100, 100, 50, 50, 'Building'),
          expected: false },
        // Scenario 3: Touching Edges (Monster using size)
        { desc: "S3: Monster (size) vs Building - Touching Edges",
          obj1: createMockObject(0, 0, 0, 0, 'Monster', null, 0, 0, 50),
          obj2: createMockObject(50, 0, 50, 50, 'Building'),
          expected: false },
        // Scenario 4: Slight Overlap (Monster using frameWidth/Height)
        { desc: "S4: Monster (sprite) vs Building - Slight Overlap",
          obj1: createMockObject(40, 0, 20, 20, 'Monster', {complete: true}, 20, 20, 0),
          obj2: createMockObject(50, 0, 50, 50, 'Building'),
          expected: true },
        // Scenario 5: Obj1 completely inside Obj2
        { desc: "S5: Monster (size) inside Building",
          obj1: createMockObject(110, 110, 0, 0, 'Monster', null, 0, 0, 10),
          obj2: createMockObject(100, 100, 50, 50, 'Building'),
          expected: true },
        // Scenario 6: Building (obj.width/height for obj2, as instanceof Building might fail in utils.js)
        { desc: "S6: Generic Obj1 vs Building (generic fallback for obj2 dimensions)",
          obj1: createMockObject(50, 50, 30, 30, 'Object'),
          obj2: createMockObject(60, 60, 50, 50, 'Building'), // checkCollision will use .width/.height
          expected: true },
        // Scenario 7: No collision - Y axis
        { desc: "S7: Monster (size) vs Building - No Collision (Y-axis)",
          obj1: createMockObject(50, 0, 0, 0, 'Monster', null, 0, 0, 30),
          obj2: createMockObject(50, 40, 50, 50, 'Building'),
          expected: false },
        // Scenario 8: Collision with Projectile (uses size)
        { desc: "S8: Monster (sprite) vs Projectile (size) - Collision",
          obj1: createMockObject(50, 50, 32, 32, 'Monster', {complete: true}, 32, 32, 0),
          obj2: createMockObject(55, 55, 0, 0, 'Projectile', null, 0, 0, 8),
          expected: true },
    ];

    let allTestsPassed = true;
    testCases.forEach((tc, index) => {
        console.log(`
--- Test Case ${index + 1}: ${tc.desc} ---`);
        // console.log("Obj1:", JSON.stringify(tc.obj1));
        // console.log("Obj2:", JSON.stringify(tc.obj2));

        let result = checkCollision(tc.obj1, tc.obj2);
        if (result === tc.expected) {
            console.log(`[UNIT TEST][PASS] Expected: ${tc.expected}, Got: ${result}`);
        } else {
            console.error(`[UNIT TEST][FAIL] Expected: ${tc.expected}, Got: ${result}`);
            allTestsPassed = false;
        }
    });

    if (allTestsPassed) {
        console.log("
--- All checkCollision Unit Tests Passed! ---");
    } else {
        console.error("
--- Some checkCollision Unit Tests Failed! ---");
    }
}

// runCheckCollisionTests();
