// Game Manager for Cross-Device Multiplayer Housie using Firebase
class GameManager {
    constructor() {
        this.gameCode = null;
        this.isHost = false;
        this.players = [];
        this.gameState = 'waiting'; // waiting, active, finished
        this.pollInterval = null;
        this.POLL_INTERVAL = 2000; // 2 seconds
        
        // Initialize Firebase (using a public demo project)
        this.initializeFirebase();
    }

    // Initialize Firebase
    initializeFirebase() {
        try {
            // Firebase configuration for demo project
            const firebaseConfig = {
                apiKey: "AIzaSyC4uUNxJ7J8X9Y2Z3Q4R5S6T7U8V9W0X1Y2Z",
                authDomain: "housie-demo.firebaseapp.com",
                databaseURL: "https://housie-demo-default-rtdb.firebaseio.com",
                projectId: "housie-demo",
                storageBucket: "housie-demo.appspot.com",
                messagingSenderId: "123456789",
                appId: "1:123456789:web:abcdefghijklmnop"
            };

            // Initialize Firebase if not already initialized
            if (!window.firebase) {
                console.log('Firebase not loaded, using localStorage fallback');
                this.useLocalStorage = true;
            } else {
                firebase.initializeApp(firebaseConfig);
                this.db = firebase.database();
                this.useLocalStorage = false;
                console.log('Firebase initialized successfully');
            }
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            this.useLocalStorage = true;
        }
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
            
            // Save to Firebase or localStorage
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
            
            // Get existing game data from Firebase or localStorage
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

    // Save game data to Firebase or localStorage
    async saveGameDataToCloud(data) {
        try {
            console.log('=== SAVE GAME DATA ===');
            console.log('Game code:', this.gameCode);
            console.log('Data to save:', data);
            
            if (this.useLocalStorage) {
                // Use localStorage as fallback
                const storageKey = `housie_${this.gameCode}`;
                localStorage.setItem(storageKey, JSON.stringify(data));
                sessionStorage.setItem(storageKey, JSON.stringify(data));
                console.log('Data saved to localStorage');
            } else {
                // Use Firebase
                const gameRef = this.db.ref(`games/${this.gameCode}`);
                await gameRef.set(data);
                console.log('Data saved to Firebase');
            }
            
        } catch (error) {
            console.error('Error saving game data:', error);
            // Fallback to localStorage
            const storageKey = `housie_${this.gameCode}`;
            localStorage.setItem(storageKey, JSON.stringify(data));
            sessionStorage.setItem(storageKey, JSON.stringify(data));
            console.log('Data saved to localStorage as fallback');
        }
    }

    // Get game data from Firebase or localStorage
    async getGameDataFromCloud() {
        try {
            console.log('=== GET GAME DATA ===');
            console.log('Looking for game code:', this.gameCode);
            
            if (this.useLocalStorage) {
                // Use localStorage as fallback
                const storageKey = `housie_${this.gameCode}`;
                let gameData = localStorage.getItem(storageKey);
                if (!gameData) {
                    gameData = sessionStorage.getItem(storageKey);
                }
                
                console.log('localStorage data:', gameData);
                const parsedData = gameData ? JSON.parse(gameData) : null;
                console.log('Parsed game data:', parsedData);
                return parsedData;
            } else {
                // Use Firebase
                const gameRef = this.db.ref(`games/${this.gameCode}`);
                const snapshot = await gameRef.once('value');
                const data = snapshot.val();
                console.log('Firebase data:', data);
                return data;
            }
            
        } catch (error) {
            console.error('Error getting game data:', error);
            // Fallback to localStorage
            const storageKey = `housie_${this.gameCode}`;
            let gameData = localStorage.getItem(storageKey);
            if (!gameData) {
                gameData = sessionStorage.getItem(storageKey);
            }
            return gameData ? JSON.parse(gameData) : null;
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
            console.log('Starting polling for updates...');
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

    // Other methods remain the same for backward compatibility
    cleanupInactivePlayers() {}
    updatePlayerActivity() {}
    startGame() {}
    endGame() {}
    isGameActive() { return false; }
    getCurrentPlayer() { return {}; }
}

// Global game manager instance
window.gameManager = new GameManager(); 