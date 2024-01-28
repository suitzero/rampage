var start_game=false;
function player_input_control(key){
    if(key === 'ArrowUp'){
        // Move player up
    }
    else if(key === 'ArrowDown'){
        // Move player down
    }
    else if(key === 'ArrowLeft'){
        // Move player left
    }
    else if(key === 'ArrowRight'){
        // Move player right
    }
    else if(key === ' '){
        // Shoot
    }
};

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !start_game) {
        // Start the game logic
        alert('Starting game...'); // Replace with your game starting logic
        document.getElementById('main-menu').style.display = 'none'; // Hide main menu
        document.getElementById('game-screen').style.display = 'block'; // Show game screen
        start_game = true;
    }
    player_input_control(event.key);
});
