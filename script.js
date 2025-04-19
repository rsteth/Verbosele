document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MAX_LIVES = 18;
    const START_LEVEL = 5;
    const END_LEVEL = 9;
    const GUESS_VALIDATION_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";
    const TARGET_WORD_API_URL = "https://api.datamuse.com/words";
    const THESAURUS_API_URL = "https://api.datamuse.com/words";
    const TARGET_WORDS_TO_FETCH = 300; // Fetch more to increase chance of finding constrained words
    const LOCAL_STORAGE_KEY = 'progressiveWordleState_v12';
    
    // Word grade level constants (based on frequency as a proxy)
    const GRADE_LEVEL = {
        EASY: 30, // Top 30% most frequent words (elementary school level)
        MEDIUM: 15, // Top 15% most frequent words (middle school level)
        HARD: 5 // Top 5% most frequent words (high school+ level)
    };
    const CURRENT_GRADE_LEVEL = GRADE_LEVEL.HARD; // Default to EASY, change to MEDIUM or HARD for more challenging words

    // --- DOM Elements ---
    const levelDisplay = document.getElementById('level-display');
    const livesDisplay = document.getElementById('lives-display');
    const gridContainer = document.getElementById('grid-container');
    const messageArea = document.getElementById('message-area');
    const submitButton = document.getElementById('submit-guess');
    const segmentedInputContainer = document.getElementById('segmented-input-container');
    const visualInputSquaresContainer = document.getElementById('visual-input-squares');
    const hiddenGuessInput = document.getElementById('guess-input');
    const resetButton = document.getElementById('reset-button'); // Get reset button reference
    const showThesaurusToggle = document.getElementById('show-thesaurus-toggle');
    const thesaurusArea = document.getElementById('thesaurus-area');
    const thesaurusContent = document.getElementById('thesaurus-content');

    // --- Game State Variables ---
    let currentLevel = START_LEVEL;
    let currentLives = MAX_LIVES;
    let targetWord = '';
    let currentWordLength = START_LEVEL;
    let cumulativeGameHistory = [];
    let gameOver = false;
    let gameWon = false;
    let visualInputSquares = [];
    let duplicateTargetLetters = new Set();
    let requiredStartingLetter = ''; // Stores the required starting letter after level 1
    let absentLetters = new Set(); // Tracks letters that have been guessed and are not in the target word
    let thesaurusData = null; // Store thesaurus data for the current target word
    let showThesaurus = false; // Track thesaurus toggle state

    // --- State Management Functions (localStorage) ---
    function saveGameState() {
        if (typeof(Storage) === "undefined") return;
        const state = {
            currentLevel, currentLives, targetWord, currentWordLength,
            cumulativeGameHistory, gameOver, gameWon,
            duplicateTargetLetters: Array.from(duplicateTargetLetters),
            requiredStartingLetter, // Save the constraint
            absentLetters: Array.from(absentLetters), // Save absent letters
            showThesaurus // Save thesaurus toggle state
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
                cumulativeGameHistory = savedState.cumulativeGameHistory || [];
                gameOver = savedState.gameOver;
                gameWon = savedState.gameWon;
                duplicateTargetLetters = new Set(savedState.duplicateTargetLetters || []);
                requiredStartingLetter = savedState.requiredStartingLetter || ''; // Load the constraint
                // Handle both old (usedLetters) and new (absentLetters) state formats
                absentLetters = new Set(savedState.absentLetters || savedState.usedLetters || []);
                // Load thesaurus toggle state if available
                showThesaurus = savedState.showThesaurus || false;
                showThesaurusToggle.checked = showThesaurus;
                toggleThesaurusDisplay();
                return true;
            } else { throw new Error("Invalid state structure"); }
        } catch (error) {
            console.error("Error loading game state:", error);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return false;
        }
    }

     function clearGameState() {
         // Clear localStorage
         if (typeof(Storage) !== "undefined") { 
             localStorage.removeItem(LOCAL_STORAGE_KEY); 
         }
         
         // Reset game variables
         currentLevel = START_LEVEL; 
         currentLives = MAX_LIVES; 
         targetWord = '';
         currentWordLength = START_LEVEL; 
         cumulativeGameHistory = [];
         gameOver = false; 
         gameWon = false; 
         duplicateTargetLetters = new Set();
         requiredStartingLetter = ''; 
         absentLetters = new Set();
         thesaurusData = null;
         // Don't reset showThesaurus as it's a user preference
         
         // Clear UI elements
         gridContainer.innerHTML = ''; 
         visualInputSquaresContainer.innerHTML = '';
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

    function displayGuessRow(guess, feedback, wordLength, immediate = false) {
        const row = document.createElement('div');
        row.classList.add('grid-row');

        for (let i = 0; i < wordLength; i++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            const letter = guess[i] ? guess[i].toLowerCase() : '';
            tile.textContent = guess[i] || '';

            // Add glow for duplicate letters in current level
            if (letter && wordLength === currentWordLength && duplicateTargetLetters.has(letter)) {
                tile.classList.add('glow-duplicate');
            }

            // Apply feedback color class
            if (immediate) {
                if (feedback[i]) {
                    tile.classList.add(feedback[i]);
                }
            } else {
                // Stagger reveal animation for new guesses
                setTimeout(() => {
                    if (feedback[i]) {
                        tile.classList.add(feedback[i]);
                    }
                    tile.classList.add('reveal');
                }, i * 100);
            }
            row.appendChild(tile);
        }
        gridContainer.appendChild(row);

        // Scroll for new guesses only
        if (!immediate) {
            segmentedInputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

     function updateStatusDisplay() {
         const displayLength = currentWordLength || currentLevel;
         levelDisplay.textContent = `Level: ${currentLevel - START_LEVEL + 1} (${displayLength} Letters)`;
         livesDisplay.textContent = `Lives: ${currentLives}`;
     }
     
     function setMessage(msg) { 
         // If the message already contains HTML tags, use it as is
         // Otherwise, wrap the message in bold tags for standard game messages
         if (msg.includes('<') && msg.includes('>')) {
             messageArea.innerHTML = msg;
         } else {
             messageArea.innerHTML = `<b>${msg}</b>`;
         }
     }
     
     function setupVisualInput() {
         visualInputSquaresContainer.innerHTML = ''; 
         visualInputSquares = [];
         hiddenGuessInput.maxLength = currentWordLength; 
         hiddenGuessInput.value = '';
         
         for (let i = 0; i < currentWordLength; i++) {
             const square = document.createElement('div'); 
             square.classList.add('input-square');
             visualInputSquaresContainer.appendChild(square); 
             visualInputSquares.push(square);
         }
     }
     
     function updateVisualSquares() {
         const currentValue = hiddenGuessInput.value.toUpperCase();
         visualInputSquares.forEach((square, index) => {
             const char = currentValue[index]; 
             square.textContent = char || '';
             square.classList.toggle('filled', !!char);
             
             // Apply special styling to letters that are not in the target word
            if (char && absentLetters.has(char)) {
                square.classList.add('used-letter');
            } else {
                square.classList.remove('used-letter');
            }
         });
     }

    // --- Game Logic Functions ---
    async function initGame(forceNew = false) {
         setMessage("Initializing game...");
         hiddenGuessInput.disabled = true; submitButton.disabled = true;

         if (forceNew) {
              console.log("Forcing new game state via reset.");
              clearGameState(); // Explicitly clear state first when forcing new
         }

         // Try loading state ONLY if not forcing new
         if (!forceNew && loadGameState()) {
             // Restore UI from loaded state
             updateStatusDisplay();
             redrawCumulativeGrid();
             setupVisualInput();
             updateVisualSquares();
             if (gameOver) {
                 endGame(gameWon, false); // Update UI for ended state
                 setMessage(gameWon ? `Game previously won!` : `Game previously lost.`);
             } else if (!targetWord){
                 console.warn("Loaded state missing target word. Starting level setup.");
                 await setupLevel(); // Need to fetch word
             } else {
                  // Add constraint info to resume message if applicable
                  let resumeMsg = `Game resumed at Level ${currentLevel - START_LEVEL + 1}.`;
                  if (requiredStartingLetter && currentLevel > START_LEVEL) {
                      resumeMsg += ` (Words must start with '${requiredStartingLetter.toUpperCase()}')`;
                  }
                  setMessage(resumeMsg);
                  if(!gameOver){ // Enable controls if not ended
                      hiddenGuessInput.disabled = false; submitButton.disabled = false; hiddenGuessInput.focus();
                  }
             }
         } else {
             // Start fresh (clearGameState was already called if forceNew)
             if (!forceNew) {
                 // If load failed but wasn't forced, ensure state is truly clear
                 // (clearGameState also resets variables, load only does if load fails AND forceNew is false)
                 clearGameState(); // Call again ensure vars are reset
             }
             currentLevel = START_LEVEL; // Set explicitly for new game start
             currentLives = MAX_LIVES; // Set explicitly for new game start
             redrawCumulativeGrid(); // Draw empty grid initially
             await setupLevel(); // Setup first level (fetches word, sets constraint)
             updateStatusDisplay();
             if (!gameOver) {
                 hiddenGuessInput.disabled = false; submitButton.disabled = false; hiddenGuessInput.focus();
             }
         }
    }

    // Modify setupLevel to handle the starting letter constraint
    async function setupLevel() {
        currentWordLength = currentLevel;
        targetWord = '';
        duplicateTargetLetters = new Set(); // Reset duplicates for new level
        absentLetters = new Set(); // Reset absent letters for new level
        thesaurusData = null; // Reset thesaurus data for new word
        updateThesaurusDisplay(); // Clear previous thesaurus display

        // Add separator if starting a level beyond the first
        if (currentLevel > START_LEVEL && gridContainer.children.length > 0) {
            const separator = document.createElement('hr');
            separator.classList.add('level-separator');
            gridContainer.appendChild(separator);
            separator.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        // DON'T clear gridContainer here - cumulative history requires it

        setupVisualInput(); // Setup input squares for the new length
        updateStatusDisplay(); // Update level display

        setMessage(`Finding ${currentWordLength}-letter words...`);
        // Add constraint info to fetching message if applicable
        let patternConstraint = false; // Flag to check if constraint applied
        let spellingPattern;
        if (currentLevel === START_LEVEL || !requiredStartingLetter) {
            spellingPattern = '?'.repeat(currentWordLength);
        } else {
            spellingPattern = requiredStartingLetter + '?'.repeat(currentWordLength - 1);
            patternConstraint = true; // Mark that constraint is active
            setMessage(`Finding ${currentWordLength}-letter words starting with '${requiredStartingLetter.toUpperCase()}'...`);
            console.log(`Datamuse Query Constraint: sp=${spellingPattern}`);
        }

        const queryParams = new URLSearchParams({
            sp: spellingPattern,
            max: TARGET_WORDS_TO_FETCH,
            md: 'f',
            freq: 'f' // Add frequency parameter to prioritize common words
        });
        const apiUrl = `${TARGET_WORD_API_URL}?${queryParams}`;

        try {
            // --- Fetch Words from Datamuse ---
            console.log(`Fetching words with grade level filter: ${CURRENT_GRADE_LEVEL}`);
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`API error fetching words: ${response.status} ${response.statusText}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Invalid word data received.');
            console.log(`Total words returned from API: ${data.length}`);
            
            // Use 'f' (frequency) metadata to filter by grade level
            const candidateWords = data.filter(item => {
                // Check basic word requirements
                if (!item.word || item.word.length !== currentWordLength || !/^[a-z]+$/.test(item.word)) {
                    return false;
                }
                
                // Filter by frequency score if available (proxy for grade level)
                // Higher frequency score means more common words
                if (item.tags && item.tags.length > 0) {
                    // Extract frequency score from tags (format like 'f:12.34')
                    const freqTag = item.tags.find(tag => tag.startsWith('f:'));
                    if (freqTag) {
                        const freqScore = parseFloat(freqTag.substring(2));
                        
                        // The higher the threshold, the more common words will be selected
                        // CURRENT_GRADE_LEVEL controls the difficulty
                        return freqScore >= CURRENT_GRADE_LEVEL;
                    }
                }
                
                // If no frequency data, include the word as fallback
                return true;
            }).map(item => item.word);
            
            console.log(`Words after grade level filtering: ${candidateWords.length}`);
            
            if (candidateWords.length === 0) {
                if (patternConstraint) {
                    throw new Error(`No valid ${currentWordLength}-letter words starting with '${requiredStartingLetter}' found from API.`);
                } else {
                    throw new Error(`No valid ${currentWordLength}-letter words found from API.`);
                }
            }
            
            // --- Validate words against Dictionary API ---
            setMessage(`Validating words...`);
            console.log(`Validating ${Math.min(candidateWords.length, 30)} words against Dictionary API`);
            
            // Shuffle candidate words and try up to 30 to avoid excessive API calls
            const shuffledCandidates = [...candidateWords].sort(() => 0.5 - Math.random()).slice(0, 30);
            let validatedWords = [];
            
            // Check each candidate word against Dictionary API
            for (const word of shuffledCandidates) {
                try {
                    const isValid = await checkWordValidity(word);
                    if (isValid) {
                        validatedWords.push(word);
                        console.log(`Word validated: ${word}`);
                        // Once we have a few valid words, we can stop checking to reduce API load
                        if (validatedWords.length >= 5) break;
                    }
                } catch (error) {
                    // Continue trying other words if one fails
                    console.log(`Word validation failed for ${word}: ${error.message}`);
                }
            }
            
            // If no words were validated, try to use candidate words as fallback
            if (validatedWords.length === 0) {
                console.warn(`No words validated by Dictionary API. Using unvalidated words as fallback.`);
                validatedWords = candidateWords;
            }
            
            // Select target word
            targetWord = validatedWords[Math.floor(Math.random() * validatedWords.length)].toLowerCase();
            console.log(`Target word for level ${currentLevel}: ${targetWord}`);

            // --- Set the starting letter constraint --- (Same as before)
            if (currentLevel === START_LEVEL && targetWord) {
                requiredStartingLetter = targetWord[0];
                console.log(`Constraint set: words must start with '${requiredStartingLetter}'`);
            }

            // --- Calculate Duplicates --- (Same as before)
            const targetCounts = {};
            for (const char of targetWord) { targetCounts[char] = (targetCounts[char] || 0) + 1; }
            duplicateTargetLetters = new Set(Object.keys(targetCounts).filter(char => targetCounts[char] > 1));

            // --- Update UI & Save --- (Same as before)
            let setupMsg = `Level ${currentLevel - START_LEVEL + 1}: Guess the ${currentWordLength}-letter word.`;
             if (requiredStartingLetter && currentLevel > START_LEVEL) {
                 setupMsg += ` (Starts with '${requiredStartingLetter.toUpperCase()}')`;
            }
            setMessage(setupMsg);
            if (!gameOver) {
                hiddenGuessInput.disabled = false; submitButton.disabled = false; hiddenGuessInput.focus();
            }
            
            // If thesaurus is enabled, fetch data for the new target word to help with guessing
            if (showThesaurus) {
                fetchThesaurusData(targetWord);
            } else {
                updateThesaurusDisplay(); // Clear display if toggled off
            }
            
            saveGameState();

        } catch (error) {
            console.error("Error setting up level:", error);
            setMessage(`Failed to start level ${currentLevel - START_LEVEL + 1}. Error: ${error.message}. Please refresh.`);
            endGame(false, false);
        }
    }


    // API Interaction for Thesaurus Information
    async function getThesaurusInfo(word) {
        try {
            // Datamuse API to get related words and definitions
            const response = await fetch(`https://api.datamuse.com/words?ml=${word}&md=d`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching thesaurus information:', error);
            return null;
        }
    }

    // API Interaction for Guess Validation
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


    function calculateFeedback(guess, target) {
        const feedback = Array(target.length).fill(null);
        const targetCounts = {};
        const guessLower = guess.toLowerCase();
        const targetLower = target.toLowerCase();
        
        // Count occurrences of each letter in target word
        for (const char of targetLower) { 
            targetCounts[char] = (targetCounts[char] || 0) + 1; 
        }
        
        // First pass: mark correct positions
        for (let i = 0; i < targetLower.length; i++) { 
            if (guessLower[i] === targetLower[i]) { 
                feedback[i] = 'correct'; 
                targetCounts[targetLower[i]]--; 
            } 
        }
        
        // Second pass: mark present but incorrect positions or absent
        for (let i = 0; i < targetLower.length; i++) { 
            if (feedback[i] === null) { 
                if (targetCounts[guessLower[i]] > 0 && targetLower.includes(guessLower[i])) { 
                    feedback[i] = 'present'; 
                    targetCounts[guessLower[i]]--; 
                } else { 
                    feedback[i] = 'absent'; 
                } 
            } 
        }
        
        return feedback;
    }

    async function handleGuess() {
        if (gameOver || targetWord === '') return;
        const guess = hiddenGuessInput.value.trim().toLowerCase();

        // Validate input length
        if (guess.length !== currentWordLength) {
            setMessage(`Guess must be ${currentWordLength} letters long.`);
            return;
        }

        // Validate word exists in dictionary
        const isValidWord = await checkWordValidity(guess);
        if (isValidWord === null) { 
            // Handle API errors during check
            hiddenGuessInput.focus();
            // Message already set by checkWordValidity on error
            return;
        }
        if (!isValidWord) { 
            setMessage(`'${guess.toUpperCase()}' is not a valid word.`);
            hiddenGuessInput.select(); // Select the invalid word for easy correction
            return;
        }

        // Process valid guess
        setMessage(""); // Clear validation messages
        currentLives--;
        updateStatusDisplay();
        
        // Get thesaurus information for the word
        const thesaurusInfo = await getThesaurusInfo(guess);

        // Calculate feedback and update history
        const feedback = calculateFeedback(guess, targetWord);
        const historyEntry = { 
            guess: guess, 
            feedback: feedback, 
            wordLength: currentWordLength 
        };
        cumulativeGameHistory.push(historyEntry);

        // Update UI
        displayGuessRow(guess.toUpperCase(), feedback, currentWordLength, false);
        
        // Add only absent letters from this guess to the absentLetters set
        for (let i = 0; i < feedback.length; i++) {
            if (feedback[i] === 'absent' && !targetWord.includes(guess[i])) {
                absentLetters.add(guess[i].toUpperCase());
            }
        }
        
        hiddenGuessInput.value = ''; 
        updateVisualSquares();
        
        // Display thesaurus information if available
        if (thesaurusInfo && thesaurusInfo.length > 0) {
            let message = `<b>${guess.toUpperCase()}</b>: `;
            
            // Add definition if available
            if (thesaurusInfo[0].defs && thesaurusInfo[0].defs.length > 0) {
                // Parse the definition - typically format is "p def" where p is part of speech
                const def = thesaurusInfo[0].defs[0];
                const parts = def.split(' ');
                
                if (parts.length > 1) {
                    // Get first part which contains POS information
                    let posInfo = parts[0];
                    let remainingDef = parts.slice(1).join(' ');
                    
                    // Parse the POS info in various formats
                    let posMatch;
                    let basePOS = '';
                    let posDetail = '';
                    
                    // Handle different formats:                    
                    if (posInfo.match(/^[a-z]\s[A-Z]/)) {
                        // Format: "n An" (single letter followed by space and capitalized word)
                        basePOS = posInfo.substring(0, 1);  // Take first letter as POS code
                        posDetail = posInfo.substring(2);    // Take everything after the space as detail
                    } else if (posInfo.includes(' ') && !posInfo.includes('(')) {
                        // Other space-separated formats
                        let spacePos = posInfo.indexOf(' ');
                        basePOS = posInfo.substring(0, spacePos);
                        posDetail = posInfo.substring(spacePos + 1).trim();
                    } else if (posInfo.includes('(')) {
                        // Parenthetical format: "n (something)"
                        let match = posInfo.match(/^([a-z]+)\s*\((.+)\)$/i);
                        if (match) {
                            basePOS = match[1];
                            posDetail = match[2];
                        } else {
                            // If we can't parse it, just use the whole thing as basePOS
                            basePOS = posInfo;
                        }
                    } else {
                        // Single part of speech with no details
                        basePOS = posInfo;
                    }
                    
                    // Convert to full part of speech name
                    let fullPos = '';
                    
                    // Convert base abbreviations to full form
                    switch(basePOS) {
                        case 'n': fullPos = 'noun'; break;
                        case 'v': fullPos = 'verb'; break;
                        case 'adj': fullPos = 'adjective'; break;
                        case 'adv': fullPos = 'adverb'; break;
                        case 'prep': fullPos = 'preposition'; break;
                        case 'conj': fullPos = 'conjunction'; break;
                        case 'interj': fullPos = 'interjection'; break;
                        case 'pron': fullPos = 'pronoun'; break;
                        default: fullPos = basePOS; break;
                    }
                    
                    // Format with the detailed information if available
                    if (posDetail) {
                        message += `<i style="color: #666;">(${fullPos}: ${posDetail})</i> ${remainingDef}`;
                    } else {
                        message += `<i style="color: #666;">(${fullPos})</i> ${remainingDef}`;
                    }
                } else {
                    // If we can't parse it properly, just show the definition as is
                    message += def;
                }
            } else {
                // If no definition, add some related words
                const relatedWords = thesaurusInfo.slice(0, 3).map(w => w.word).join(', ');
                if (relatedWords) {
                    message += `Related: ${relatedWords}`;
                }
            }
            
            setMessage(message);
        }

        // Check game state
        const correctGuess = guess === targetWord;
        const outOfLives = currentLives <= 0;

        if (correctGuess) {
            handleCorrectGuess();
        } else if (outOfLives) {
            handleOutOfLives();
        } else {
            saveGameState();
            hiddenGuessInput.focus();
        }
    }

    function handleCorrectGuess() {
        setMessage(`Correct! The word was ${targetWord.toUpperCase()}.`);
        if (currentLevel === END_LEVEL) { 
            gameWon = true; 
            endGame(true); 
        } else {
            setMessage(`Level Complete! Preparing next level...`);
            hiddenGuessInput.disabled = true; 
            submitButton.disabled = true;
            currentLevel++;
            setTimeout(async () => {
                await setupLevel();
            }, 1500);
        }
        // No need to fetch thesaurus data here anymore as it's now fetched at the beginning of each level
    }

    function handleOutOfLives() {
        setMessage(`Out of lives! The word was ${targetWord.toUpperCase()}. Game Over!`);
        endGame(false);
    }

    function endGame(win, shouldSaveState = true) {
        gameOver = true; 
        gameWon = win;
        hiddenGuessInput.disabled = true; 
        submitButton.disabled = true;
        if (shouldSaveState) { 
            saveGameState(); 
        }
    }

    // --- Event Listeners ---
    submitButton.addEventListener('click', handleGuess);
    hiddenGuessInput.addEventListener('input', updateVisualSquares);
    hiddenGuessInput.addEventListener('keydown', (event) => { 
        if (event.key === 'Enter' && !submitButton.disabled) { 
            handleGuess(); 
        } 
    });
    segmentedInputContainer.addEventListener('click', () => { 
        if (!hiddenGuessInput.disabled) { 
            hiddenGuessInput.focus(); 
        } 
    });

    // Reset Button Listener
    resetButton.addEventListener('click', () => {
        // Force a new game, ignoring saved state and clearing current state
        initGame(true);
    });
    
    // --- Thesaurus Functions ---
    async function fetchThesaurusData(word) {
        if (!word) return;
        
        try {
            // Clear previous thesaurus content first
            thesaurusContent.innerHTML = `<p>Loading word hints...</p>`;
            
            // Fetch synonyms (ml = means like)
            const synParams = new URLSearchParams({
                ml: word,
                max: 10
            });
            
            // Fetch antonyms (rel_ant = related antonyms)
            const antParams = new URLSearchParams({
                rel_ant: word,
                max: 5
            });
            
            // Make both requests
            const [synResponse, antResponse] = await Promise.all([
                fetch(`${THESAURUS_API_URL}?${synParams}`),
                fetch(`${THESAURUS_API_URL}?${antParams}`)
            ]);
            
            // Parse the responses
            const synonyms = await synResponse.json();
            const antonyms = await antResponse.json();
            
            // Store the data
            thesaurusData = {
                word: word,
                synonyms: synonyms.filter(item => item.word !== word), // Filter out the original word
                antonyms: antonyms
            };
            
            // Update the display
            updateThesaurusDisplay();
            
        } catch (error) {
            console.error("Error fetching thesaurus data:", error);
            thesaurusContent.innerHTML = `<p>Error fetching word hints. Please try again.</p>`;
        }
    }
    
    function updateThesaurusDisplay() {
        // If no data or thesaurus is not shown, clear/hide content
        if (!thesaurusData || !showThesaurus) {
            if (!showThesaurus) {
                thesaurusArea.classList.add('hidden');
            } else {
                thesaurusArea.classList.remove('hidden');
                thesaurusContent.innerHTML = targetWord ? 
                    `<p>Loading word hints...</p>` :
                    `<p>No word selected.</p>`;
            }
            return;
        }
        
        // Show the area and populate with data
        thesaurusArea.classList.remove('hidden');
        
        // Format the content - don't show the actual word since this is a hint
        let html = `<h3>Word Hints</h3>`;
        
        // Add synonyms if available
        if (thesaurusData.synonyms && thesaurusData.synonyms.length > 0) {
            html += `<div class="synonyms"><strong>Similar to:</strong> `;
            html += thesaurusData.synonyms
                .slice(0, 7) // Limit to 7 synonyms
                .map(item => {
                    let wordInfo = item.word;
                    if (item.tags && item.tags.length > 0) {
                        // Add part of speech info if available
                        const pos = item.tags.find(tag => ['n', 'v', 'adj', 'adv'].includes(tag));
                        if (pos) {
                            const posMap = { 'n': 'noun', 'v': 'verb', 'adj': 'adj', 'adv': 'adv' };
                            wordInfo += ` <span class="word-type">(${posMap[pos]})</span>`;
                        }
                    }
                    return wordInfo;
                })
                .join(', ');
            html += `</div>`;
        } else {
            html += `<div class="synonyms"><em>No similar words found.</em></div>`;
        }
        
        // Add antonyms if available
        if (thesaurusData.antonyms && thesaurusData.antonyms.length > 0) {
            html += `<div class="antonyms"><strong>Opposite of:</strong> `;
            html += thesaurusData.antonyms
                .slice(0, 5) // Limit to 5 antonyms
                .map(item => item.word)
                .join(', ');
            html += `</div>`;
        }
        
        thesaurusContent.innerHTML = html;
    }
    
    function toggleThesaurusDisplay() {
        showThesaurus = showThesaurusToggle.checked;
        updateThesaurusDisplay();
        saveGameState(); // Save the preference
        
        // If the toggle is turned on and we already have a target word,
        // fetch thesaurus data for it to help with guessing
        if (showThesaurus && targetWord) {
            fetchThesaurusData(targetWord);
        }
    }
    
    // Thesaurus Toggle Listener
    showThesaurusToggle.addEventListener('change', toggleThesaurusDisplay);

    // --- Start Game ---
    initGame(); // Attempt to load state or start fresh

});