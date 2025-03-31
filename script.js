document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MAX_LIVES = 16;
    const START_LEVEL = 5;
    const END_LEVEL = 9;
    const GUESS_VALIDATION_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/"; // << RESTORED
    const TARGET_WORD_API_URL = "https://api.datamuse.com/words"; // Keep for target word selection
    const TARGET_WORDS_TO_FETCH = 100; // How many potential words to fetch from Datamuse
    const LOCAL_STORAGE_KEY = 'progressiveWordleState_v6'; // Key from that version

    // --- DOM Elements ---
    const levelDisplay = document.getElementById('level-display');
    const livesDisplay = document.getElementById('lives-display');
    const gridContainer = document.getElementById('grid-container');
    const messageArea = document.getElementById('message-area');
    const submitButton = document.getElementById('submit-guess');
    const segmentedInputContainer = document.getElementById('segmented-input-container');
    const visualInputSquaresContainer = document.getElementById('visual-input-squares');
    const hiddenGuessInput = document.getElementById('guess-input');
    // const resetButton = document.getElementById('reset-button');

    // --- Game State Variables ---
    let currentLevel = START_LEVEL;
    let currentLives = MAX_LIVES;
    let targetWord = '';
    let currentWordLength = START_LEVEL;
    let cumulativeGameHistory = []; // Stores ALL guesses: {guess, feedback, wordLength}
    let gameOver = false;
    let gameWon = false;
    let visualInputSquares = [];
    let duplicateTargetLetters = new Set(); // Stores duplicate letters in the current target

    // --- State Management Functions (localStorage) ---
    function saveGameState() {
        if (typeof(Storage) === "undefined") return;
        const state = {
            currentLevel, currentLives, targetWord, currentWordLength,
            cumulativeGameHistory, // Save cumulative history
            gameOver, gameWon,
            duplicateTargetLetters: Array.from(duplicateTargetLetters) // Save current duplicates
        };
        try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state)); }
        catch (error) { console.error("Error saving game state:", error); }
    }

    function loadGameState() {
        if (typeof(Storage) === "undefined") return false;
        const savedStateString = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!savedStateString) return false;
        try {
            const savedState = JSON.parse(savedStateString);
            if (savedState && typeof savedState.currentLevel === 'number') {
                currentLevel = savedState.currentLevel;
                currentLives = savedState.currentLives;
                targetWord = savedState.targetWord;
                currentWordLength = savedState.currentWordLength || (targetWord ? targetWord.length : START_LEVEL);
                cumulativeGameHistory = savedState.cumulativeGameHistory || []; // Load cumulative history
                gameOver = savedState.gameOver;
                gameWon = savedState.gameWon;
                duplicateTargetLetters = new Set(savedState.duplicateTargetLetters || []); // Load current duplicates
                return true;
            } else { throw new Error("Invalid state structure"); }
        } catch (error) {
            console.error("Error loading game state:", error);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return false;
        }
    }

     function clearGameState() {
         if (typeof(Storage) !== "undefined") { localStorage.removeItem(LOCAL_STORAGE_KEY); }
         currentLevel = START_LEVEL; currentLives = MAX_LIVES; targetWord = '';
         currentWordLength = START_LEVEL; cumulativeGameHistory = []; // Reset cumulative history
         gameOver = false; gameWon = false; duplicateTargetLetters = new Set();
         gridContainer.innerHTML = ''; visualInputSquaresContainer.innerHTML = '';
     }


    // --- UI Update Functions ---
    function redrawCumulativeGrid() {
        gridContainer.innerHTML = ''; // Clear grid before redrawing all rows
        let lastLength = 0;
        cumulativeGameHistory.forEach(item => {
            // Add separator if word length increased (start of a new level's guesses)
            if (item.wordLength > lastLength && lastLength !== 0) {
                 const separator = document.createElement('hr');
                 separator.classList.add('level-separator');
                 gridContainer.appendChild(separator);
            }
            // Display the row using the stored length
            // Pass 'true' for immediate display (no animation on load/redraw)
            displayGuessRow(item.guess.toUpperCase(), item.feedback, item.wordLength, true);
            lastLength = item.wordLength;
        });
    }

    // Modify displayGuessRow to accept wordLength and apply glow conditionally
    function displayGuessRow(guess, feedback, wordLength, immediate = false) {
        const row = document.createElement('div');
        row.classList.add('grid-row');

        for (let i = 0; i < wordLength; i++) { // Use passed wordLength
            const tile = document.createElement('div');
            tile.classList.add('tile');
            const letter = guess[i] ? guess[i].toLowerCase() : ''; // Get letter safely
            tile.textContent = guess[i] || '';

            // Add glow class ONLY if the letter is a known duplicate AND it belongs to the CURRENT level
            if (letter && wordLength === currentWordLength && duplicateTargetLetters.has(letter)) {
                tile.classList.add('glow-duplicate');
            }

            // Apply feedback color class
            if (immediate) {
                if (feedback[i]) tile.classList.add(feedback[i]);
            } else {
                // Stagger reveal animation only for non-immediate rendering (new guesses)
                setTimeout(() => {
                    if (feedback[i]) tile.classList.add(feedback[i]);
                    tile.classList.add('reveal');
                }, i * 100);
            }
            row.appendChild(tile);
        }
        gridContainer.appendChild(row); // Append the completed row

        // Scroll only for new guesses (not immediate redraws)
        if (!immediate) {
             segmentedInputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function updateStatusDisplay() {
         const displayLength = currentWordLength || currentLevel;
         levelDisplay.textContent = `Level: ${currentLevel - START_LEVEL + 1} (${displayLength} Letters)`;
         livesDisplay.textContent = `Lives: ${currentLives}`;
     }
     function setMessage(msg) { messageArea.textContent = msg; }
     function setupVisualInput() {
         visualInputSquaresContainer.innerHTML = ''; visualInputSquares = [];
         hiddenGuessInput.maxLength = currentWordLength; hiddenGuessInput.value = '';
         for (let i = 0; i < currentWordLength; i++) {
             const square = document.createElement('div'); square.classList.add('input-square');
             visualInputSquaresContainer.appendChild(square); visualInputSquares.push(square);
         }
     }
     function updateVisualSquares() {
         const currentValue = hiddenGuessInput.value.toUpperCase();
         visualInputSquares.forEach((square, index) => {
             const char = currentValue[index]; square.textContent = char || '';
             square.classList.toggle('filled', !!char);
         });
     }

    // --- Game Logic Functions ---

    async function initGame(forceNew = false) {
         setMessage("Initializing game...");
         hiddenGuessInput.disabled = true; submitButton.disabled = true;

         if (!forceNew && loadGameState()) {
             updateStatusDisplay();
             redrawCumulativeGrid(); // Redraw ALL history on load
             setupVisualInput(); // Setup input for current level
             updateVisualSquares();
             if (gameOver) {
                 endGame(gameWon, false); // Update UI for ended state
                 setMessage(gameWon ? `Game previously won!` : `Game previously lost.`); // Simplified message
             } else if (!targetWord){
                 console.warn("Loaded state missing target word. Starting level setup.");
                 await setupLevel(); // Need to fetch word
             } else {
                  setMessage(`Game resumed at Level ${currentLevel - START_LEVEL + 1}.`);
                  if (!gameOver) { // Enable controls if game not over
                      hiddenGuessInput.disabled = false; submitButton.disabled = false; hiddenGuessInput.focus();
                  }
             }
         } else {
             // Start fresh
             clearGameState(); currentLevel = START_LEVEL; currentLives = MAX_LIVES;
             redrawCumulativeGrid(); // Draw empty grid initially
             await setupLevel(); // Setup first level (fetches word)
             updateStatusDisplay();
             if (!gameOver) {
                 hiddenGuessInput.disabled = false; submitButton.disabled = false; hiddenGuessInput.focus();
             }
         }
     }

    // setupLevel fetches target word and calculates duplicates
    async function setupLevel() {
        currentWordLength = currentLevel;
        // guessHistory = []; // REMOVED
        targetWord = '';
        duplicateTargetLetters = new Set(); // Reset duplicates for new level

        // gridContainer.innerHTML = ''; // REMOVED - Don't clear grid between levels
        setupVisualInput(); // Setup input squares for the new length
        updateStatusDisplay(); // Update level display

        setMessage(`Workspaceing ${currentWordLength}-letter words...`);
        hiddenGuessInput.disabled = true; submitButton.disabled = true;

        const spellingPattern = '?'.repeat(currentWordLength);
        const queryParams = new URLSearchParams({ sp: spellingPattern, max: TARGET_WORDS_TO_FETCH, md: 'f' });
        const apiUrl = `${TARGET_WORD_API_URL}?${queryParams}`;

        try {
            // --- Fetch and Select Word ---
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`API error fetching words: ${response.status} ${response.statusText}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Invalid word data received.');
            const validWords = data.filter(item =>
                item.word && item.word.length === currentWordLength && /^[a-z]+$/.test(item.word)
            ).map(item => item.word);
            if (validWords.length === 0) throw new Error(`No valid ${currentWordLength}-letter words found from API.`);
            targetWord = validWords[Math.floor(Math.random() * validWords.length)].toLowerCase();
            console.log(`Target word for level ${currentLevel}: ${targetWord}`); // Debugging

            // --- Calculate Duplicate Letters in Target ---
            const targetCounts = {};
            for (const char of targetWord) { targetCounts[char] = (targetCounts[char] || 0) + 1; }
            duplicateTargetLetters = new Set(Object.keys(targetCounts).filter(char => targetCounts[char] > 1));
            // ---

            setMessage(`Level ${currentLevel - START_LEVEL + 1}: Guess the ${currentWordLength}-letter word.`);

            if (!gameOver) { // Re-enable controls
                hiddenGuessInput.disabled = false; submitButton.disabled = false; hiddenGuessInput.focus();
            }
            saveGameState(); // Save state AFTER successfully setting up the level

        } catch (error) {
            console.error("Error setting up level:", error);
            setMessage(`Failed to start level ${currentLevel - START_LEVEL + 1}. Error: ${error.message}. Please refresh.`);
            endGame(false, false); // End game, don't save state on error
        }
    }

    // ** RESTORED ** API Interaction for Guess Validation
    async function checkWordValidity(word) {
        setMessage("Checking word...");
        submitButton.disabled = true; // Disable while checking
        try {
            const response = await fetch(GUESS_VALIDATION_API_URL + word);
            if (response.ok) {
                return true; // Word exists
            } else if (response.status === 404) {
                return false; // Word not found
            } else {
                throw new Error(`API error: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Dictionary API Error:", error);
            setMessage("Error checking word (API or network issue). Please try again.");
            return null; // Indicate an error occurred
        } finally {
             if (!gameOver) submitButton.disabled = false; // Re-enable if game not over
        }
    }


    // calculateFeedback - NO CHANGES NEEDED
    function calculateFeedback(guess, target) {
         const feedback = Array(target.length).fill(null); const targetCounts = {};
         const guessLower = guess.toLowerCase(); const targetLower = target.toLowerCase();
         for (const char of targetLower) { targetCounts[char] = (targetCounts[char] || 0) + 1; }
         for (let i = 0; i < targetLower.length; i++) { if (guessLower[i] === targetLower[i]) { feedback[i] = 'correct'; targetCounts[targetLower[i]]--; } }
         for (let i = 0; i < targetLower.length; i++) { if (feedback[i] === null) { if (targetCounts[guessLower[i]] > 0 && targetLower.includes(guessLower[i])) { feedback[i] = 'present'; targetCounts[guessLower[i]]--; } else { feedback[i] = 'absent'; } } }
         return feedback;
     }

    // handleGuess - Restore validation call
    async function handleGuess() {
         if (gameOver || targetWord === '') return;
         const guess = hiddenGuessInput.value.trim().toLowerCase();

         // 1. Validate Length
         if (guess.length !== currentWordLength) {
             setMessage(`Guess must be ${currentWordLength} letters long.`);
             return;
         }

         // 2. ** RESTORED ** API Call for word validity check
         const isValidWord = await checkWordValidity(guess);
         if (isValidWord === null) { // Handle API errors during check
              hiddenGuessInput.focus();
              // Message already set by checkWordValidity on error
              return;
          }
         if (!isValidWord) { // Handle case where word is not found in dictionary
             setMessage(`'${guess.toUpperCase()}' is not a valid word.`);
             hiddenGuessInput.select(); // Select the invalid word for easy correction
             return;
         }
         // --- Word is valid, process the guess ---

         setMessage(""); // Clear validation messages
         currentLives--;
         updateStatusDisplay();

         const feedback = calculateFeedback(guess, targetWord);

         // Add to cumulative history
         const historyEntry = { guess: guess, feedback: feedback, wordLength: currentWordLength };
         cumulativeGameHistory.push(historyEntry);

         // Append ONLY the new row to the grid
         displayGuessRow(guess.toUpperCase(), feedback, currentWordLength, false); // Pass false for animation

         hiddenGuessInput.value = ''; updateVisualSquares(); // Clear input

         // --- Check Win/Loss/Continue ---
         const correctGuess = guess === targetWord;
         const outOfLives = currentLives <= 0;

         if (correctGuess) {
             setMessage(`Correct! The word was ${targetWord.toUpperCase()}.`);
             if (currentLevel === END_LEVEL) { gameWon = true; endGame(true); }
             else {
                 setMessage(`Level Complete! Preparing next level...`);
                 hiddenGuessInput.disabled = true; submitButton.disabled = true;
                 currentLevel++;
                 setTimeout(async () => {
                    await setupLevel(); // setupLevel now handles state saving etc.
                 }, 1500);
             }
         } else if (outOfLives) {
             setMessage(`Out of lives! The word was ${targetWord.toUpperCase()}. Game Over!`);
             endGame(false);
         } else {
             saveGameState(); // Save cumulative history after guess
             hiddenGuessInput.focus();
         }
     }

    // endGame - NO CHANGES NEEDED
    function endGame(win, shouldSaveState = true) {
         gameOver = true; gameWon = win;
         hiddenGuessInput.disabled = true; submitButton.disabled = true;
         if (shouldSaveState) { saveGameState(); }
     }

    // --- Event Listeners --- (No changes needed)
    submitButton.addEventListener('click', handleGuess);
    hiddenGuessInput.addEventListener('input', updateVisualSquares);
    hiddenGuessInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !submitButton.disabled) { handleGuess(); } });
    segmentedInputContainer.addEventListener('click', () => { if (!hiddenGuessInput.disabled) { hiddenGuessInput.focus(); } });
    // resetButton?.addEventListener('click', () => initGame(true));

    // --- Start Game ---
    initGame(); // Attempt to load state or start fresh

});