// Game Manager for LAN-based Multiplayer Housie
class GameManager {
    constructor() {
        this.gameCode = null;
        this.isHost = false;
        this.players = [];
        this.gameState = 'waiting'; // waiting, active, finished
        this.pollInterval = null;
        this.POLL_INTERVAL = 2000; // 2 seconds
    }

    // Generate unique game code
    generateGameCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Create new game (Host)
    createGame() {
        console.log('GameManager: createGame called');
        
        this.isHost = true;
        this.gameCode = this.generateGameCode();
        console.log('GameManager: Generated game code:', this.gameCode);
        
        this.gameState = 'waiting';
        this.players = [];
        
        // Initialize game data properly
        const gameData = {
            gameCode: this.gameCode,
            isHost: this.isHost,
            players: this.players,
            gameState: this.gameState,
            lastUpdated: new Date().toISOString(),
            createdBy: 'host'
        };
        
        console.log('GameManager: Game data to save:', gameData);
        
        // Store game data in localStorage AND sessionStorage
        this.saveGameData(gameData);
        
        // Store game code for numberCaller page
        localStorage.setItem('housie_game_code', this.gameCode);
        sessionStorage.setItem('housie_game_code', this.gameCode);
        
        console.log('GameManager: Game created successfully. Storage keys:');
        console.log('- localStorage housie_game_code:', localStorage.getItem('housie_game_code'));
        console.log('- sessionStorage housie_game_code:', sessionStorage.getItem('housie_game_code'));
        console.log('- localStorage housie_game_' + this.gameCode + ':', localStorage.getItem(`housie_game_${this.gameCode}`));
        
        // Start polling for updates
        this.startPolling();
        
        return this.gameCode;
    }

    // Join game (Guest)
    joinGame(gameCode, username) {
        console.log('GameManager: joinGame called with:', { gameCode, username });
        
        this.isHost = false;
        this.gameCode = gameCode.toUpperCase();
        
        console.log('GameManager: Looking for game data with key:', `housie_game_${this.gameCode}`);
        
        // Check if game exists - try both localStorage and sessionStorage
        let gameData = this.getGameData();
        console.log('GameManager: Found game data:', gameData);
        
        if (!gameData) {
            console.log('GameManager: No game data found');
            
            // Try to create a minimal game data if it doesn't exist
            // This allows guests to join even if the host's data isn't shared
            console.log('GameManager: Attempting to create minimal game data for guest');
            const minimalGameData = {
                gameCode: this.gameCode,
                isHost: false,
                players: [],
                gameState: 'waiting',
                lastUpdated: new Date().toISOString(),
                createdBy: 'guest'
            };
            
            this.saveGameData(minimalGameData);
            gameData = minimalGameData;
            console.log('GameManager: Created minimal game data for guest');
        }
        
        if (gameData.gameState === 'finished') {
            console.log('GameManager: Game is finished');
            throw new Error('Game has already finished. Please ask the host to start a new game.');
        }

        // Check if username already exists in the game
        if (gameData.players && gameData.players.some(p => p.username.toLowerCase() === username.toLowerCase())) {
            console.log('GameManager: Username already taken');
            throw new Error('Username already taken. Please choose a different name.');
        }

        console.log('GameManager: Adding player to game');
        
        // Add player to game
        const player = {
            id: Date.now() + Math.random(),
            username: username,
            joinedAt: new Date().toISOString(),
            isActive: true
        };

        if (!gameData.players) {
            gameData.players = [];
        }
        
        gameData.players.push(player);
        this.saveGameData(gameData);
        
        // Store player info locally
        localStorage.setItem('housie_player', JSON.stringify(player));
        sessionStorage.setItem('housie_player', JSON.stringify(player));
        
        // Store game code for ticket page
        localStorage.setItem('housie_game_code', this.gameCode);
        sessionStorage.setItem('housie_game_code', this.gameCode);
        
        console.log('GameManager: Player successfully joined game');
        
        return true;
    }

    // Get current game data
    getGameData() {
        // Try localStorage first, then sessionStorage
        let gameData = localStorage.getItem(`housie_game_${this.gameCode}`);
        if (!gameData) {
            gameData = sessionStorage.getItem(`housie_game_${this.gameCode}`);
        }
        return gameData ? JSON.parse(gameData) : null;
    }

    // Save game data
    saveGameData(data = null) {
        const gameData = data || {
            gameCode: this.gameCode,
            isHost: this.isHost,
            players: this.players,
            gameState: this.gameState,
            lastUpdated: new Date().toISOString()
        };
        
        // Save to both localStorage and sessionStorage
        localStorage.setItem(`housie_game_${this.gameCode}`, JSON.stringify(gameData));
        sessionStorage.setItem(`housie_game_${this.gameCode}`, JSON.stringify(gameData));
    }

    // Start polling for updates (Host)
    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.pollInterval = setInterval(() => {
            this.updateGameData();
        }, this.POLL_INTERVAL);
    }

    // Stop polling
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    // Update game data (Host)
    updateGameData() {
        const gameData = this.getGameData();
        if (gameData) {
            gameData.lastUpdated = new Date().toISOString();
            this.saveGameData(gameData);
        }
    }

    // Get players list (Host)
    getPlayers() {
        const gameData = this.getGameData();
        return gameData ? gameData.players : [];
    }

    // Remove inactive players
    cleanupInactivePlayers() {
        const gameData = this.getGameData();
        if (gameData && gameData.players) {
            const now = new Date();
            gameData.players = gameData.players.filter(player => {
                const lastSeen = new Date(player.lastSeen || player.joinedAt);
                const diffMinutes = (now - lastSeen) / (1000 * 60);
                return diffMinutes < 5; // Remove players inactive for 5+ minutes
            });
            this.saveGameData(gameData);
        }
    }

    // Update player activity
    updatePlayerActivity() {
        const player = JSON.parse(localStorage.getItem('housie_player') || sessionStorage.getItem('housie_player') || '{}');
        if (player.id) {
            const gameData = this.getGameData();
            if (gameData && gameData.players) {
                const playerIndex = gameData.players.findIndex(p => p.id === player.id);
                if (playerIndex !== -1) {
                    gameData.players[playerIndex].lastSeen = new Date().toISOString();
                    this.saveGameData(gameData);
                }
            }
        }
    }

    // Start game (Host)
    startGame() {
        const gameData = this.getGameData();
        if (gameData) {
            gameData.gameState = 'active';
            this.saveGameData(gameData);
        }
    }

    // End game (Host)
    endGame() {
        const gameData = this.getGameData();
        if (gameData) {
            gameData.gameState = 'finished';
            this.saveGameData(gameData);
        }
        this.stopPolling();
    }

    // Check if game is active
    isGameActive() {
        const gameData = this.getGameData();
        return gameData && gameData.gameState === 'active';
    }

    // Get current player info
    getCurrentPlayer() {
        return JSON.parse(localStorage.getItem('housie_player') || sessionStorage.getItem('housie_player') || '{}');
    }

    // Clear game data
    clearGameData() {
        localStorage.removeItem(`housie_game_${this.gameCode}`);
        sessionStorage.removeItem(`housie_game_${this.gameCode}`);
        localStorage.removeItem('housie_player');
        sessionStorage.removeItem('housie_player');
        this.stopPolling();
    }
}

// Global game manager instance
window.gameManager = new GameManager(); 