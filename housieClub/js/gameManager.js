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
        try {
            this.isHost = true;
            this.gameCode = this.generateGameCode();
            
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
            
            // Store game data in localStorage AND sessionStorage
            this.saveGameData(gameData);
            
            // Store game code for numberCaller page
            localStorage.setItem('housie_game_code', this.gameCode);
            sessionStorage.setItem('housie_game_code', this.gameCode);
            
            // Start polling for updates
            this.startPolling();
            
            return this.gameCode;
        } catch (error) {
            console.error('Error creating game:', error);
            throw new Error('Failed to create game. Please try again.');
        }
    }

    // Join game (Guest)
    joinGame(gameCode, username) {
        try {
            console.log('=== GUEST JOINING GAME ===');
            console.log('Game Code:', gameCode);
            console.log('Username:', username);
            
            this.isHost = false;
            this.gameCode = gameCode.toUpperCase();
            
            // Check if game exists - try both localStorage and sessionStorage
            let gameData = this.getGameData();
            console.log('Existing game data found:', gameData);
            
            if (!gameData) {
                console.log('No existing game data found - creating minimal data for guest');
                // Try to create a minimal game data if it doesn't exist
                // This allows guests to join even if the host's data isn't shared
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
                console.log('Created minimal game data for guest');
            }
            
            if (gameData.gameState === 'finished') {
                throw new Error('Game has already finished. Please ask the host to start a new game.');
            }

            // Check if username already exists in the game
            if (gameData.players && gameData.players.some(p => p.username.toLowerCase() === username.toLowerCase())) {
                throw new Error('Username already taken. Please choose a different name.');
            }

            // Add player to game
            const player = {
                id: Date.now() + Math.random(),
                username: username,
                joinedAt: new Date().toISOString(),
                isActive: true,
                lastSeen: new Date().toISOString()
            };

            if (!gameData.players) {
                gameData.players = [];
            }
            
            console.log('Adding player to game:', player);
            console.log('Current players before adding:', gameData.players);
            
            gameData.players.push(player);
            gameData.lastUpdated = new Date().toISOString();
            
            console.log('Updated game data:', gameData);
            this.saveGameData(gameData);
            
            // Store player info locally
            localStorage.setItem('housie_player', JSON.stringify(player));
            sessionStorage.setItem('housie_player', JSON.stringify(player));
            
            // Store game code for ticket page
            localStorage.setItem('housie_game_code', this.gameCode);
            sessionStorage.setItem('housie_game_code', this.gameCode);
            
            console.log('Player successfully joined game');
            return true;
        } catch (error) {
            console.error('Error joining game:', error);
            throw error;
        }
    }

    // Get current game data
    getGameData() {
        try {
            // Try localStorage first, then sessionStorage
            let gameData = localStorage.getItem(`housie_game_${this.gameCode}`);
            if (!gameData) {
                gameData = sessionStorage.getItem(`housie_game_${this.gameCode}`);
            }
            return gameData ? JSON.parse(gameData) : null;
        } catch (error) {
            console.error('Error getting game data:', error);
            return null;
        }
    }

    // Save game data
    saveGameData(data = null) {
        try {
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
        } catch (error) {
            console.error('Error saving game data:', error);
        }
    }

    // Start polling for updates (Host)
    startPolling() {
        try {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
            }
            
            this.pollInterval = setInterval(() => {
                this.updateGameData();
            }, this.POLL_INTERVAL);
        } catch (error) {
            console.error('Error starting polling:', error);
        }
    }

    // Stop polling
    stopPolling() {
        try {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
        } catch (error) {
            console.error('Error stopping polling:', error);
        }
    }

    // Update game data (Host)
    updateGameData() {
        try {
            console.log('=== HOST UPDATING GAME DATA ===');
            const gameData = this.getGameData();
            console.log('Current game data:', gameData);
            
            if (gameData) {
                gameData.lastUpdated = new Date().toISOString();
                console.log('Updating lastUpdated timestamp');
                this.saveGameData(gameData);
                console.log('Game data updated and saved');
            } else {
                console.log('No game data found to update');
            }
        } catch (error) {
            console.error('Error updating game data:', error);
        }
    }

    // Get players list (Host)
    getPlayers() {
        try {
            console.log('GameManager.getPlayers() called');
            console.log('Current gameCode:', this.gameCode);
            
            const gameData = this.getGameData();
            console.log('Game data retrieved:', gameData);
            
            if (gameData && gameData.players) {
                console.log('Players found:', gameData.players);
                return gameData.players;
            } else {
                console.log('No players found in game data');
                return [];
            }
        } catch (error) {
            console.error('Error getting players:', error);
            return [];
        }
    }

    // Remove inactive players
    cleanupInactivePlayers() {
        try {
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
        } catch (error) {
            console.error('Error cleaning up inactive players:', error);
        }
    }

    // Update player activity
    updatePlayerActivity() {
        try {
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
        } catch (error) {
            console.error('Error updating player activity:', error);
        }
    }

    // Start game (Host)
    startGame() {
        try {
            const gameData = this.getGameData();
            if (gameData) {
                gameData.gameState = 'active';
                this.saveGameData(gameData);
            }
        } catch (error) {
            console.error('Error starting game:', error);
        }
    }

    // End game (Host)
    endGame() {
        try {
            const gameData = this.getGameData();
            if (gameData) {
                gameData.gameState = 'finished';
                this.saveGameData(gameData);
            }
            this.stopPolling();
        } catch (error) {
            console.error('Error ending game:', error);
        }
    }

    // Check if game is active
    isGameActive() {
        try {
            const gameData = this.getGameData();
            return gameData && gameData.gameState === 'active';
        } catch (error) {
            console.error('Error checking game status:', error);
            return false;
        }
    }

    // Get current player info
    getCurrentPlayer() {
        try {
            return JSON.parse(localStorage.getItem('housie_player') || sessionStorage.getItem('housie_player') || '{}');
        } catch (error) {
            console.error('Error getting current player:', error);
            return {};
        }
    }

    // Clear game data
    clearGameData() {
        try {
            localStorage.removeItem(`housie_game_${this.gameCode}`);
            sessionStorage.removeItem(`housie_game_${this.gameCode}`);
            localStorage.removeItem('housie_player');
            sessionStorage.removeItem('housie_player');
            this.stopPolling();
        } catch (error) {
            console.error('Error clearing game data:', error);
        }
    }
}

// Global game manager instance
window.gameManager = new GameManager(); 