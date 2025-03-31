document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MAX_LIVES = 10;
    const START_LEVEL = 5;
    const END_LEVEL = 9;
    const GUESS_VALIDATION_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";
    const TARGET_WORD_API_URL = "https://api.datamuse.com/words"; // Use Datamuse
    const TARGET_WORDS_TO_FETCH = 100; // How many potential words to fetch from Datamuse
    const LOCAL_STORAGE_KEY = 'progressiveWordleState_v3'; // Update key for new logic

    // --- DOM Elements --- (Keep existing DOM elements)
    const levelDisplay = document.getElementById('level-display');
    const livesDisplay = document.getElementById('lives-display');
    const gridContainer = document.getElementById('grid-container');
    const messageArea = document.getElementById('message-area');
    const submitButton = document.getElementById('submit-guess');
    const segmentedInputContainer = document.getElementById('segmented-input-container');
    const visualInputSquaresContainer = document.getElementById('visual-input-squares');
    const hiddenGuessInput = document.getElementById('guess-input');
    // const resetButton = document.getElementById('reset-button');

    // --- Game State Variables --- (Keep existing state variables)
    let currentLevel = START_LEVEL;
    let currentLives = MAX_LIVES;
    let targetWord = '';
    let currentWordLength = START_LEVEL;
    let guessHistory = [];
    let gameOver = false;
    let gameWon = false;
    let visualInputSquares = [];

    // --- State Management Functions (localStorage) --- (Keep existing functions)
    function saveGameState() {
        // ... (no changes needed)
        if (typeof(Storage) === "undefined") return;
        const state = { currentLevel, currentLives, targetWord, currentWordLength, guessHistory, gameOver, gameWon };
        try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state)); }
        catch (error) { console.error("Error saving game state:", error); }
    }

    function loadGameState() {
        // ... (no changes needed, structure is the same)
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
                guessHistory = savedState.guessHistory || [];
                gameOver = savedState.gameOver;
                gameWon = savedState.gameWon;
                return true;
            } else { throw new Error("Invalid state structure"); }
        } catch (error) {
            console.error("Error loading game state:", error);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return false;
        }
    }

     function clearGameState() {
         // ... (no changes needed)
         if (typeof(Storage) !== "undefined") { localStorage.removeItem(LOCAL_STORAGE_KEY); }
         currentLevel = START_LEVEL; currentLives = MAX_LIVES; targetWord = '';
         currentWordLength = START_LEVEL; guessHistory = []; gameOver = false; gameWon = false;
         gridContainer.innerHTML = ''; visualInputSquaresContainer.innerHTML = '';
     }


    // --- UI Update Functions --- (Keep existing functions)
    function redrawGridFromHistory() {
        // ... (no changes needed)
         gridContainer.innerHTML = '';
         guessHistory.forEach(item => { displayGuessRow(item.guess.toUpperCase(), item.feedback, true); });
    }

    function displayGuessRow(guess, feedback, immediate = false) {
        // ... (no changes needed)
         const row = document.createElement('div'); row.classList.add('grid-row');
         for (let i = 0; i < currentWordLength; i++) {
             const tile = document.createElement('div'); tile.classList.add('tile'); tile.textContent = guess[i] || '';
             if (immediate) { if (feedback[i]) tile.classList.add(feedback[i]); }
             else { setTimeout(() => { if (feedback[i]) tile.classList.add(feedback[i]); tile.classList.add('reveal'); }, i * 100); }
             row.appendChild(tile);
         }
         gridContainer.appendChild(row);
         if (!immediate) { row.scrollIntoView({ behavior: 'smooth', block: 'end' }); }
    }

    function updateStatusDisplay() {
        // ... (no changes needed)
         const displayLength = currentWordLength || currentLevel;
         levelDisplay.textContent = `Level: ${currentLevel - START_LEVEL + 1} (${displayLength} Letters)`;
         livesDisplay.textContent = `Lives: ${currentLives}`;
     }

     function setMessage(msg) {
        // ... (no changes needed)
         messageArea.textContent = msg;
     }

    // --- Segmented Input Logic --- (Keep existing functions)
    function setupVisualInput() {
        // ... (no changes needed)
         visualInputSquaresContainer.innerHTML = ''; visualInputSquares = [];
         hiddenGuessInput.maxLength = currentWordLength; hiddenGuessInput.value = '';
         for (let i = 0; i < currentWordLength; i++) {
             const square = document.createElement('div'); square.classList.add('input-square');
             visualInputSquaresContainer.appendChild(square); visualInputSquares.push(square);
         }
    }

    function updateVisualSquares() {
        // ... (no changes needed)
         const currentValue = hiddenGuessInput.value.toUpperCase();
         visualInputSquares.forEach((square, index) => {
             const char = currentValue[index]; square.textContent = char || '';
             square.classList.toggle('filled', !!char);
         });
    }

    // --- Game Logic Functions ---

    // Keep initGame async
     async function initGame(forceNew = false) {
         setMessage("Initializing game...");
         hiddenGuessInput.disabled = true; submitButton.disabled = true;

         if (!forceNew && loadGameState()) {
             // Restore UI
             updateStatusDisplay(); redrawGridFromHistory(); setupVisualInput(); updateVisualSquares();
             if (gameOver) {
                 endGame(gameWon, false); // Update UI for ended state
                 setMessage(gameWon ? `Game previously won!` : `Game previously lost. The word was ${targetWord.toUpperCase()}.`);
             } else if (!targetWord){
                 console.warn("Loaded state missing target word. Starting level setup.");
                 await setupLevel(); // Need to fetch word
             } else {
                  setMessage(`Game resumed at Level ${currentLevel - START_LEVEL + 1}.`);
                  if(!gameOver){ // Enable controls if not ended
                      hiddenGuessInput.disabled = false; submitButton.disabled = false; hiddenGuessInput.focus();
                  }
             }
         } else {
             // Start fresh
             clearGameState(); currentLevel = START_LEVEL; currentLives = MAX_LIVES;
             await setupLevel(); // Setup first level (fetches word)
             updateStatusDisplay();
             if (!gameOver) { // Enable controls if setup successful
                 hiddenGuessInput.disabled = false; submitButton.disabled = false; hiddenGuessInput.focus();
             }
         }
     }

    // setupLevel becomes async again for the API fetch
    async function setupLevel() {
         currentWordLength = currentLevel;
         guessHistory = []; // Clear history
         targetWord = ''; // Reset target

         // Setup UI elements immediately
         gridContainer.innerHTML = '';
         setupVisualInput();
         updateStatusDisplay();

         setMessage(`Workspaceing ${currentWordLength}-letter words...`);
         hiddenGuessInput.disabled = true; submitButton.disabled = true;

         // Construct Datamuse query
         const spellingPattern = '?'.repeat(currentWordLength);
         const queryParams = new URLSearchParams({
             sp: spellingPattern,
             max: TARGET_WORDS_TO_FETCH, // Fetch a list
             md: 'f' // Optionally include frequency data (helps with sorting but not strictly needed)
         });
         const apiUrl = `${TARGET_WORD_API_URL}?${queryParams}`;

         try {
             const response = await fetch(apiUrl);
             if (!response.ok) {
                 throw new Error(`API error fetching words: ${response.status} ${response.statusText}`);
             }
             const data = await response.json();

             if (!Array.isArray(data)) {
                 throw new Error('Invalid data received from word API.');
             }

             // Filter the results for valid words (purely alphabetic, correct length)
             const validWords = data.filter(item =>
                 item.word && // Ensure word property exists
                 item.word.length === currentWordLength &&
                 /^[a-z]+$/.test(item.word) // Check if it contains only lowercase letters
             ).map(item => item.word); // Extract just the word string

             if (validWords.length === 0) {
                 // Throw error if no suitable words found after fetching and filtering
                 throw new Error(`No valid ${currentWordLength}-letter words found from API.`);
             }

             // Select a random word from the filtered list
             targetWord = validWords[Math.floor(Math.random() * validWords.length)].toLowerCase();
             console.log(`Target word for level ${currentLevel}: ${targetWord}`); // Debugging

             setMessage(`Level ${currentLevel - START_LEVEL + 1}: Guess the ${currentWordLength}-letter word.`);
             if (!gameOver) { // Re-enable controls if game not over
                 hiddenGuessInput.disabled = false; submitButton.disabled = false; hiddenGuessInput.focus();
             }
             saveGameState(); // Save state AFTER successfully getting a word

         } catch (error) {
             console.error("Error setting up level:", error);
             setMessage(`Failed to start level ${currentLevel - START_LEVEL + 1}. Error: ${error.message}. Please refresh.`);
             endGame(false, false); // End game, don't save state on error
         }
     }


    // checkWordValidity remains async (API call)
    async function checkWordValidity(word) {
         // ... (keep existing implementation using GUESS_VALIDATION_API_URL)
         setMessage("Checking word..."); submitButton.disabled = true;
         try {
             const response = await fetch(GUESS_VALIDATION_API_URL + word);
             if (response.ok) return true; else if (response.status === 404) return false;
             else throw new Error(`API error: ${response.statusText}`);
         } catch (error) { console.error("Dictionary API Error:", error); setMessage("Error checking word (API or network issue). Please try again."); return null; }
         finally { if (!gameOver) submitButton.disabled = false; }
     }

    // calculateFeedback remains the same
    function calculateFeedback(guess, target) {
         // ... (keep existing implementation)
         const feedback = Array(target.length).fill(null); const targetCounts = {};
         const guessLower = guess.toLowerCase(); const targetLower = target.toLowerCase();
         for (const char of targetLower) { targetCounts[char] = (targetCounts[char] || 0) + 1; }
         for (let i = 0; i < targetLower.length; i++) { if (guessLower[i] === targetLower[i]) { feedback[i] = 'correct'; targetCounts[targetLower[i]]--; } }
         for (let i = 0; i < targetLower.length; i++) { if (feedback[i] === null) { if (targetCounts[guessLower[i]] > 0 && targetLower.includes(guessLower[i])) { feedback[i] = 'present'; targetCounts[guessLower[i]]--; } else { feedback[i] = 'absent'; } } }
         return feedback;
     }

    // handleGuess remains async
    async function handleGuess() {
          // ... (logic largely the same, but ensure await setupLevel() is used for level progression)
          if (gameOver || targetWord === '') return;
          const guess = hiddenGuessInput.value.trim().toLowerCase();
          if (guess.length !== currentWordLength) { setMessage(`Guess must be ${currentWordLength} letters long.`); return; }

          const isValidWord = await checkWordValidity(guess);
          if (isValidWord === null) { hiddenGuessInput.focus(); return; }
          if (!isValidWord) { setMessage(`'${guess.toUpperCase()}' is not a valid word.`); hiddenGuessInput.select(); return; }

          // --- Process Valid Guess ---
          setMessage(""); currentLives--; updateStatusDisplay();
          const feedback = calculateFeedback(guess, targetWord);
          guessHistory.push({ guess: guess, feedback: feedback });
          displayGuessRow(guess.toUpperCase(), feedback);
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
                  // Use await here as setupLevel is async again
                  await setupLevel(); // Setup next level (fetches word, saves state)
              }
          } else if (outOfLives) {
              setMessage(`Out of lives! The word was ${targetWord.toUpperCase()}. Game Over!`);
              endGame(false);
          } else {
              saveGameState(); // Save state after guess
              hiddenGuessInput.focus();
          }
      }

    function endGame(win, shouldSaveState = true) {
        // ... (no changes needed)
         gameOver = true; gameWon = win;
         hiddenGuessInput.disabled = true; submitButton.disabled = true;
         if (shouldSaveState) { saveGameState(); }
     }

    // --- Event Listeners --- (Keep existing listeners)
    submitButton.addEventListener('click', handleGuess);
    hiddenGuessInput.addEventListener('input', updateVisualSquares);
    hiddenGuessInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !submitButton.disabled) { handleGuess(); }
    });
    segmentedInputContainer.addEventListener('click', () => {
        if (!hiddenGuessInput.disabled) { hiddenGuessInput.focus(); }
    });
    // resetButton?.addEventListener('click', () => initGame(true));

    // --- Start Game ---
    initGame();

});