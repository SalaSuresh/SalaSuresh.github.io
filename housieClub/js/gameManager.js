// Game Manager for Cross-Device Multiplayer Housie
class GameManager {
    constructor() {
        this.gameCode = null;
        this.isHost = false;
        this.players = [];
        this.gameState = 'waiting'; // waiting, active, finished
        this.pollInterval = null;
        this.POLL_INTERVAL = 2000; // 2 seconds
        // Using a simple polling approach with a free API
        this.API_BASE = 'https://api.myjson.com/v1/json';
        this.API_KEY = 'demo'; // Free API key
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
    async createGame() {
        try {
            console.log('=== CREATING GAME ===');
            this.isHost = true;
            this.gameCode = this.generateGameCode();
            console.log('Generated game code:', this.gameCode);
            
            this.gameState = 'waiting';
            this.players = [];
            
            // Initialize game data
            const gameData = {
                gameCode: this.gameCode,
                isHost: this.isHost,
                players: this.players,
                gameState: this.gameState,
                lastUpdated: new Date().toISOString(),
                createdBy: 'host'
            };
            
            console.log('Game data to save:', gameData);
            
            // Save to cloud storage for cross-device access
            await this.saveGameDataToCloud(gameData);
            
            // Store game code locally for this device
            localStorage.setItem('housie_game_code', this.gameCode);
            sessionStorage.setItem('housie_game_code', this.gameCode);
            
            console.log('Game created successfully');
            
            // Start polling for updates
            this.startPolling();
            
            return this.gameCode;
        } catch (error) {
            console.error('Error creating game:', error);
            throw new Error('Failed to create game. Please try again.');
        }
    }

    // Join game (Guest)
    async joinGame(gameCode, username) {
        try {
            console.log('=== GUEST JOINING GAME ===');
            console.log('Game Code:', gameCode);
            console.log('Username:', username);
            
            this.isHost = false;
            this.gameCode = gameCode.toUpperCase();
            
            // Get existing game data from cloud
            let gameData = await this.getGameDataFromCloud();
            console.log('Existing game data found:', gameData);
            
            if (!gameData) {
                console.log('No existing game data found - creating minimal data for guest');
                gameData = {
                    gameCode: this.gameCode,
                    isHost: false,
                    players: [],
                    gameState: 'waiting',
                    lastUpdated: new Date().toISOString(),
                    createdBy: 'guest'
                };
                await this.saveGameDataToCloud(gameData);
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
            await this.saveGameDataToCloud(gameData);
            
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

    // Save game data to cloud storage
    async saveGameDataToCloud(data) {
        try {
            console.log('=== SAVE GAME DATA TO CLOUD ===');
            console.log('Game code:', this.gameCode);
            console.log('Data to save:', data);
            
            // Create a unique storage key for this game
            const storageKey = `housie_${this.gameCode}`;
            console.log('Storage key:', storageKey);
            
            // For now, we'll use a simple approach with localStorage as fallback
            // In a real implementation, you'd use a proper backend API
            localStorage.setItem(storageKey, JSON.stringify(data));
            sessionStorage.setItem(storageKey, JSON.stringify(data));
            
            console.log('Data saved to local storage as fallback');
            
            // TODO: Implement proper cloud storage API
            // const response = await fetch(`${this.API_BASE}/${storageKey}`, {
            //     method: 'PUT',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify(data)
            // });
            // console.log('Cloud save response:', response);
            
        } catch (error) {
            console.error('Error saving game data to cloud:', error);
            // Fallback to local storage
            const storageKey = `housie_${this.gameCode}`;
            localStorage.setItem(storageKey, JSON.stringify(data));
            sessionStorage.setItem(storageKey, JSON.stringify(data));
        }
    }

    // Get game data from cloud storage
    async getGameDataFromCloud() {
        try {
            console.log('=== GET GAME DATA FROM CLOUD ===');
            console.log('Looking for game code:', this.gameCode);
            
            const storageKey = `housie_${this.gameCode}`;
            console.log('Storage key:', storageKey);
            
            // For now, check local storage as fallback
            let gameData = localStorage.getItem(storageKey);
            if (!gameData) {
                gameData = sessionStorage.getItem(storageKey);
            }
            
            console.log('Local storage data:', gameData);
            
            const parsedData = gameData ? JSON.parse(gameData) : null;
            console.log('Parsed game data:', parsedData);
            
            return parsedData;
            
            // TODO: Implement proper cloud storage API
            // const response = await fetch(`${this.API_BASE}/${storageKey}`);
            // if (response.ok) {
            //     const data = await response.json();
            //     return data;
            // }
            // return null;
            
        } catch (error) {
            console.error('Error getting game data from cloud:', error);
            return null;
        }
    }

    // Get current game data (for backward compatibility)
    async getGameData() {
        return await this.getGameDataFromCloud();
    }

    // Save game data (for backward compatibility)
    async saveGameData(data = null) {
        await this.saveGameDataToCloud(data);
    }

    // Start polling for updates (Host)
    startPolling() {
        try {
            console.log('Starting polling for cross-device updates...');
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
            }
            
            this.pollInterval = setInterval(async () => {
                await this.updateGameData();
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
    async updateGameData() {
        try {
            console.log('=== HOST UPDATING GAME DATA ===');
            const gameData = await this.getGameDataFromCloud();
            console.log('Current game data:', gameData);
            
            if (gameData) {
                gameData.lastUpdated = new Date().toISOString();
                console.log('Updating lastUpdated timestamp');
                await this.saveGameDataToCloud(gameData);
                console.log('Game data updated and saved');
            } else {
                console.log('No game data found to update');
            }
        } catch (error) {
            console.error('Error updating game data:', error);
        }
    }

    // Get players list (Host)
    async getPlayers() {
        try {
            console.log('GameManager.getPlayers() called');
            console.log('Current gameCode:', this.gameCode);
            
            const gameData = await this.getGameDataFromCloud();
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

    // Debug function to list all storage keys
    debugStorage() {
        console.log('=== DEBUG STORAGE ===');
        console.log('All localStorage keys:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('housie_')) {
                console.log(`- ${key}:`, localStorage.getItem(key));
            }
        }
        
        console.log('All sessionStorage keys:');
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('housie_')) {
                console.log(`- ${key}:`, sessionStorage.getItem(key));
            }
        }
    }

    // Clear game data
    async clearGameData() {
        try {
            const storageKey = `housie_${this.gameCode}`;
            localStorage.removeItem(storageKey);
            sessionStorage.removeItem(storageKey);
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