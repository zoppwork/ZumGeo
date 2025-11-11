// Game state
let currentCountry = null;
let guessCount = 0;
let wrongGuessCount = 0;
let gameWon = false;
let capitalGuessingActive = false;
let capitalGuesses = [];
let validCountryNames = []; // Store valid country names for validation

// DOM elements
const flagImage = document.getElementById('flag-image');
const guessInput = document.getElementById('guess-input');
const guessButton = document.getElementById('guess-button');
const newGameButton = document.getElementById('new-game-button');
const statusMessage = document.getElementById('status-message');
const guessCountDisplay = document.getElementById('guess-count');
const revealInfo = document.getElementById('reveal-info');
const guessesList = document.getElementById('guesses-list');
const percentagesList = document.getElementById('percentages-list');
const capitalGuessing = document.getElementById('capital-guessing');
const capitalInput = document.getElementById('capital-input');
const capitalGuessButton = document.getElementById('capital-guess-button');
const capitalPlaceholder = document.getElementById('capital-placeholder');
const capitalLength = document.getElementById('capital-length');
const capitalGuessesList = document.getElementById('capital-guesses-list');
const continentFilter = document.getElementById('continent-filter');
const countrySuggestions = document.getElementById('country-suggestions');

// Get continent from URL parameter or use default
function getContinentFromURL() {
    const params = new URLSearchParams(window.location.search);
    const continent = params.get('continent');
    return continent || 'All';
}

// Update URL with continent parameter
function updateURLWithContinent(continent) {
    const url = new URL(window.location);
    if (continent === 'All') {
        url.searchParams.delete('continent');
    } else {
        url.searchParams.set('continent', continent);
    }
    window.history.replaceState({}, '', url);
}

// Load country suggestions based on selected continent
async function loadCountrySuggestions() {
    try {
        const selectedContinent = continentFilter.value;
        const url = selectedContinent === 'All'
            ? '/api/countries'
            : `/api/countries?continent=${encodeURIComponent(selectedContinent)}`;

        const response = await fetch(url);
        const data = await response.json();

        // Store valid country names for validation (case-insensitive)
        validCountryNames = data.countries.map(name => name.toLowerCase());

        // Clear existing options
        countrySuggestions.innerHTML = '';

        // Add country names as options
        data.countries.forEach(countryName => {
            const option = document.createElement('option');
            option.value = countryName;
            countrySuggestions.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading country suggestions:', error);
    }
}

// Initialize game
async function initGame() {
    try {
        const selectedContinent = continentFilter.value;
        const url = selectedContinent === 'All'
            ? '/api/flag'
            : `/api/flag?continent=${encodeURIComponent(selectedContinent)}`;

        const response = await fetch(url);
        currentCountry = await response.json();

        // Reset game state
        guessCount = 0;
        wrongGuessCount = 0;
        gameWon = false;
        capitalGuessingActive = false;
        capitalGuesses = [];

        // Reset UI
        flagImage.classList.add('hidden');
        percentagesList.innerHTML = '<p class="text-gray-500 text-sm">Loading flag...</p>';
        statusMessage.textContent = '';
        guessesList.innerHTML = '';
        guessInput.value = '';
        guessInput.disabled = false;
        guessButton.disabled = false;
        capitalGuessing.classList.add('hidden');
        capitalInput.value = '';
        capitalGuessesList.innerHTML = '';
        capitalPlaceholder.innerHTML = '';
        updateGuessCount();
        updateRevealInfo();

        // Load flag image (hidden initially)
        // Try with CORS first, but it might not work for all images
        flagImage.crossOrigin = 'anonymous'; // Enable CORS for image analysis
        flagImage.src = currentCountry.flagUrl;

        flagImage.onload = () => {
            flagImage.style.filter = 'blur(50px)';
            // Wait a bit to ensure image is fully rendered
            setTimeout(() => {
                calculateColorPercentages(flagImage);
            }, 100);
        };

        flagImage.onerror = () => {
            // If CORS fails, try without crossOrigin
            console.log('CORS failed, trying without crossOrigin');
            flagImage.crossOrigin = null;
            flagImage.src = currentCountry.flagUrl;
            flagImage.onload = () => {
                flagImage.style.filter = 'blur(50px)';
                setTimeout(() => {
                    calculateColorPercentages(flagImage);
                }, 100);
            };
            flagImage.onerror = () => {
                percentagesList.innerHTML = '<p class="text-red-500 text-sm">Error loading flag image</p>';
            };
        };

    } catch (error) {
        console.error('Error initializing game:', error);
        statusMessage.textContent = 'Error loading game. Please refresh.';
        statusMessage.className = 'text-red-600';
    }
}

// Calculate color percentages from flag image
async function calculateColorPercentages(img) {
    try {
        // Wait for image to be fully loaded
        if (!img.complete || img.naturalWidth === 0) {
            // If image isn't loaded yet, wait a bit and try again
            setTimeout(() => calculateColorPercentages(img), 100);
            return;
        }

        // Create a canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to image size
        const width = img.naturalWidth || img.width || 300;
        const height = img.naturalHeight || img.height || 200;

        if (width === 0 || height === 0) {
            throw new Error('Invalid image dimensions');
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image to canvas
        try {
            ctx.drawImage(img, 0, 0);
        } catch (e) {
            // CORS error - image can't be analyzed
            percentagesList.innerHTML = '<p class="text-yellow-600 text-sm">Color analysis unavailable (CORS restriction)</p>';
            return;
        }

        // Sample pixels (sample every Nth pixel for performance)
        const sampleRate = 5; // Sample every 5th pixel
        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            // CORS error when trying to read pixel data
            percentagesList.innerHTML = '<p class="text-yellow-600 text-sm">Color analysis unavailable (CORS restriction)</p>';
            return;
        }

        const pixels = imageData.data;

        // Verify we have valid pixel data (check first few pixels aren't all zeros)
        let hasValidData = false;
        for (let i = 0; i < Math.min(100, pixels.length); i += 4) {
            if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0) {
                hasValidData = true;
                break;
            }
        }

        if (!hasValidData) {
            percentagesList.innerHTML = '<p class="text-yellow-600 text-sm">Unable to read image data (CORS or image format issue)</p>';
            return;
        }

        // Color frequency map - store RGB sums to calculate averages
        const colorMap = new Map();

        // Sample pixels across the image
        for (let y = 0; y < canvas.height; y += sampleRate) {
            for (let x = 0; x < canvas.width; x += sampleRate) {
                const index = (y * canvas.width + x) * 4;
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];
                const a = pixels[index + 3];

                // Skip transparent pixels
                if (a < 128) continue;

                // Quantize colors to reduce similar shades (group similar colors together)
                const quantizedR = Math.floor(r / 32) * 32;
                const quantizedG = Math.floor(g / 32) * 32;
                const quantizedB = Math.floor(b / 32) * 32;

                const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;

                if (!colorMap.has(colorKey)) {
                    colorMap.set(colorKey, {
                        rSum: 0,
                        gSum: 0,
                        bSum: 0,
                        count: 0
                    });
                }

                const colorData = colorMap.get(colorKey);
                colorData.rSum += r;
                colorData.gSum += g;
                colorData.bSum += b;
                colorData.count++;
            }
        }

        // Convert to array, calculate average colors, and sort by frequency
        const colorArray = Array.from(colorMap.entries())
            .map(([key, data]) => {
                // Calculate average RGB values for this color group
                const avgR = Math.round(data.rSum / data.count);
                const avgG = Math.round(data.gSum / data.count);
                const avgB = Math.round(data.bSum / data.count);

                // Convert to hex (uppercase for consistency)
                const hexColor = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`.toUpperCase();

                return {
                    color: hexColor,
                    rgb: `rgb(${avgR}, ${avgG}, ${avgB})`,
                    count: data.count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 8); // Top 8 colors

        // Calculate percentages
        const totalCount = colorArray.reduce((sum, item) => sum + item.count, 0);
        const colorPercentages = colorArray.map(item => ({
            color: item.color,
            rgb: item.rgb,
            percentage: Math.round((item.count / totalCount) * 100)
        })).filter(item => item.percentage >= 1); // Only show colors with at least 1%

        // Verify we have valid colors before displaying
        if (colorPercentages.length === 0) {
            percentagesList.innerHTML = '<p class="text-yellow-600 text-sm">No colors detected in flag</p>';
            return;
        }

        // Debug: log first color to console
        console.log('First color:', colorPercentages[0]);

        // Display percentages
        displayColorPercentages(colorPercentages);

    } catch (error) {
        console.error('Error calculating color percentages:', error);
        percentagesList.innerHTML = '<p class="text-yellow-600 text-sm">Unable to analyze flag colors</p>';
    }
}

// Display color percentages
function displayColorPercentages(colorPercentages) {
    percentagesList.innerHTML = '';

    if (colorPercentages.length === 0) {
        percentagesList.innerHTML = '<p class="text-gray-500 text-sm">Calculating colors...</p>';
        return;
    }

    colorPercentages.forEach(({ color, rgb, percentage }) => {
        const colorItem = document.createElement('div');
        colorItem.className = 'flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200';

        const colorBox = document.createElement('div');
        colorBox.className = 'rounded border-2 border-gray-300 shadow-sm';
        // Set explicit size to 20x20 pixels
        colorBox.style.width = '20px';
        colorBox.style.height = '20px';
        colorBox.style.minWidth = '20px';
        colorBox.style.minHeight = '20px';
        colorBox.style.display = 'inline-block';
        colorBox.style.flexShrink = '0';

        // Debug: log the color values
        console.log('Setting color:', { color, rgb, percentage });

        // Use rgb format - it's more reliable, and use !important to override any CSS
        const colorValue = rgb || color;
        if (colorValue) {
            // Set both style and use setProperty with important flag
            colorBox.style.setProperty('background-color', colorValue, 'important');
            // Also set inline style as backup
            colorBox.style.backgroundColor = colorValue;
        } else {
            console.error('No valid color found:', { color, rgb });
            colorBox.style.backgroundColor = '#CCCCCC'; // Fallback grey
        }

        colorBox.setAttribute('data-color', color || '');
        colorBox.setAttribute('data-rgb', rgb || '');
        colorBox.setAttribute('title', `Color: ${color || rgb || 'unknown'}`);

        // Verify the color was set
        const computedColor = window.getComputedStyle(colorBox).backgroundColor;
        console.log('Computed background color:', computedColor);

        const percentageText = document.createElement('span');
        percentageText.className = 'text-sm font-semibold text-gray-700';
        percentageText.textContent = `${percentage}%`;

        colorItem.appendChild(colorBox);
        colorItem.appendChild(percentageText);
        percentagesList.appendChild(colorItem);
    });
}

// Update guess count display
function updateGuessCount() {
    guessCountDisplay.innerHTML = `Guesses: <span class="font-bold">${guessCount}</span>`;
}

// Update reveal info
function updateRevealInfo() {
    if (guessCount >= 3) {
        const revealSteps = Math.floor(wrongGuessCount / 2);
        const blurAmount = Math.max(0, 50 - (revealSteps * 10));
        if (blurAmount > 0) {
            revealInfo.textContent = `Flag is revealing... (blur: ${blurAmount}px)`;
        } else {
            revealInfo.textContent = `Flag is fully revealed!`;
        }
    } else {
        const guessesNeeded = 3 - guessCount;
        revealInfo.textContent = `${guessesNeeded} more ${guessesNeeded === 1 ? 'guess' : 'guesses'} until flag starts revealing`;
    }
}

// Reveal flag progressively
function revealFlag() {
    // Only show flag after 3 total guesses
    if (guessCount < 3) {
        flagImage.classList.add('hidden');
        return;
    }

    flagImage.classList.remove('hidden');

    // After 3 guesses, start at blur(50px)
    // Every 2nd wrong guess (2nd, 4th, 6th, etc.) reduces blur by 10px
    // So: 1st wrong = 50px, 2nd wrong = 40px, 3rd wrong = 40px, 4th wrong = 30px, etc.
    const revealSteps = Math.floor(wrongGuessCount / 2);
    const blurAmount = Math.max(0, 50 - (revealSteps * 10));

    flagImage.style.filter = `blur(${blurAmount}px)`;
    flagImage.style.opacity = '1';
}

// Submit guess
async function submitGuess() {
    if (gameWon || !currentCountry) return;

    const guess = guessInput.value.trim();
    if (!guess) return;

    // Validate that the guess is in the valid country list
    const normalizedGuess = guess.toLowerCase();
    if (!validCountryNames.includes(normalizedGuess)) {
        statusMessage.textContent = `"${guess}" is not a valid country name. Please select from the suggestions.`;
        statusMessage.className = 'text-red-600';
        guessInput.value = '';
        guessInput.focus();
        return;
    }

    guessCount++;
    updateGuessCount();

    try {
        const response = await fetch('/api/guess', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                countryName: currentCountry.name,
                guess: guess
            })
        });

        const result = await response.json();

        // Add guess to list
        const guessItem = document.createElement('div');
        guessItem.className = `p-3 rounded-lg ${result.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`;
        guessItem.textContent = `${guess} - ${result.correct ? '✅ Correct!' : '❌ Wrong'}`;
        guessesList.appendChild(guessItem);

        if (result.correct) {
            gameWon = true;
            statusMessage.textContent = `🎉 Congratulations! You guessed it! The country is ${currentCountry.name}.`;
            statusMessage.className = 'text-green-600';
            guessInput.disabled = true;
            guessButton.disabled = true;

            // Show full flag
            flagImage.classList.remove('hidden');
            flagImage.style.filter = 'none';

            // Start capital city guessing
            startCapitalGuessing();
        } else {
            wrongGuessCount++;
            statusMessage.textContent = '❌ Wrong guess! Try again.';
            statusMessage.className = 'text-red-600';

            // Reveal flag if needed
            revealFlag();
            updateRevealInfo();
        }

        guessInput.value = '';
        guessInput.focus();

    } catch (error) {
        console.error('Error submitting guess:', error);
        statusMessage.textContent = 'Error submitting guess. Please try again.';
        statusMessage.className = 'text-red-600';
    }
}

// Start capital city guessing (Wordle-style)
function startCapitalGuessing() {
    capitalGuessingActive = true;
    capitalGuesses = [];
    const capital = currentCountry.capital;

    // Show capital guessing section
    capitalGuessing.classList.remove('hidden');

    // Show placeholder with underscores
    capitalLength.textContent = capital.replace(/[^a-zA-Z]/g, '').length;
    capitalPlaceholder.innerHTML = '';
    const letters = capital.split('');
    letters.forEach((char, index) => {
        const charBox = document.createElement('div');
        if (/[a-zA-Z]/.test(char)) {
            charBox.className = 'w-10 h-10 border-2 border-gray-400 rounded flex items-center justify-center text-xl font-bold text-gray-400';
            charBox.textContent = '_';
        } else {
            charBox.className = 'w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-600';
            charBox.textContent = char;
        }
        capitalPlaceholder.appendChild(charBox);
    });

    // Focus on capital input
    capitalInput.focus();
}

// Submit capital guess
function submitCapitalGuess() {
    if (!capitalGuessingActive || !currentCountry) return;

    const guess = capitalInput.value.trim();
    if (!guess) return;

    const capital = currentCountry.capital;
    const normalizedCapital = capital.toLowerCase().replace(/[^a-z]/g, '');
    const normalizedGuess = guess.toLowerCase().replace(/[^a-z]/g, '');

    // Check if guess letter count matches (ignoring spaces/punctuation)
    if (normalizedGuess.length !== normalizedCapital.length) {
        statusMessage.textContent = `Capital city has ${normalizedCapital.length} letters. Try again!`;
        statusMessage.className = 'text-yellow-600';
        capitalInput.value = '';
        return;
    }

    capitalGuesses.push(guess);

    // Create Wordle-style display
    const guessRow = document.createElement('div');
    guessRow.className = 'flex gap-2 justify-center items-center mb-2';

    const capitalLetters = capital.split('');
    const guessLetters = guess.split('');

    // Count letters in capital (excluding spaces/punctuation)
    let capitalLetterCounts = {};
    capitalLetters.forEach((char) => {
        const lowerChar = char.toLowerCase();
        if (/[a-z]/.test(lowerChar)) {
            capitalLetterCounts[lowerChar] = (capitalLetterCounts[lowerChar] || 0) + 1;
        }
    });

    // Create a copy for tracking remaining letters (for yellow marking)
    const remainingLetters = { ...capitalLetterCounts };

    // Initialize result array
    const result = [];

    // First pass: mark correct positions (green) and decrement counts
    for (let i = 0; i < capitalLetters.length; i++) {
        const capitalChar = capitalLetters[i];
        const guessChar = guessLetters[i] || '';
        const capitalLower = capitalChar.toLowerCase();
        const guessLower = guessChar.toLowerCase();

        if (!/[a-zA-Z]/.test(capitalChar)) {
            // Non-letter in capital (space, punctuation) - show as-is
            result.push({ char: capitalChar, status: 'punctuation', index: i });
        } else if (guessLower === capitalLower) {
            // Correct letter in correct position - GREEN
            remainingLetters[capitalLower]--;
            result.push({ char: guessChar, status: 'correct', index: i });
        } else {
            // Letter doesn't match at this position - check later for yellow
            result.push({ char: guessChar, status: 'unknown', index: i, capitalChar: capitalLower });
        }
    }

    // Second pass: mark wrong positions (yellow) and not in word (gray)
    result.forEach((item) => {
        if (item.status === 'correct' || item.status === 'punctuation') return;

        const guessLower = item.char.toLowerCase();

        if (!/[a-z]/.test(guessLower) || !item.char) {
            // Non-letter character or empty
            item.status = 'not-in-word';
        } else if (remainingLetters[guessLower] > 0) {
            // Letter exists in capital but wrong position - YELLOW
            remainingLetters[guessLower]--;
            item.status = 'wrong-position';
        } else {
            // Letter not in word - GRAY
            item.status = 'not-in-word';
        }
    });

    // Display the guess with colors
    result.forEach((item) => {
        const charBox = document.createElement('div');
        charBox.className = 'w-10 h-10 border-2 rounded flex items-center justify-center text-xl font-bold border-gray-300';

        if (item.status === 'correct') {
            // Green: correct letter in correct position
            charBox.style.color = '#16a34a'; // green-600
            charBox.style.setProperty('color', '#16a34a', 'important');
            charBox.textContent = item.char.toUpperCase();
        } else if (item.status === 'wrong-position') {
            // Yellow: letter exists but wrong position
            charBox.style.color = '#ca8a04'; // yellow-600
            charBox.style.setProperty('color', '#ca8a04', 'important');
            charBox.textContent = item.char.toUpperCase();
        } else if (item.status === 'punctuation') {
            // No color: spaces and punctuation
            charBox.className = 'w-10 h-10 flex items-center justify-center text-xl font-bold border-transparent';
            charBox.style.color = '#4b5563'; // gray-600
            charBox.textContent = item.char;
        } else {
            // Default: letter not in word
            charBox.style.color = '#4b5563'; // gray-600
            charBox.style.setProperty('color', '#4b5563', 'important');
            charBox.textContent = item.char ? item.char.toUpperCase() : '';
        }

        guessRow.appendChild(charBox);
    });

    capitalGuessesList.appendChild(guessRow);

    // Check if correct
    if (normalizedGuess === normalizedCapital) {
        capitalGuessingActive = false;
        statusMessage.textContent = `🎉 Perfect! The capital is ${capital}!`;
        statusMessage.className = 'text-green-600';
        capitalInput.disabled = true;
        capitalGuessButton.disabled = true;

        // Update placeholder to show correct answer
        capitalPlaceholder.innerHTML = '';
        capitalLetters.forEach((char) => {
            const charBox = document.createElement('div');
            if (/[a-zA-Z]/.test(char)) {
                charBox.className = 'w-10 h-10 border-2 border-green-600 bg-green-500 rounded flex items-center justify-center text-xl font-bold text-white';
                charBox.textContent = char.toUpperCase();
            } else {
                charBox.className = 'w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-600';
                charBox.textContent = char;
            }
            capitalPlaceholder.appendChild(charBox);
        });
    } else {
        statusMessage.textContent = 'Keep guessing the capital city!';
        statusMessage.className = 'text-blue-600';
    }

    capitalInput.value = '';
    capitalInput.focus();
}

// Event listeners
guessButton.addEventListener('click', submitGuess);
newGameButton.addEventListener('click', () => {
    // Preserve continent selection when starting new game
    const selectedContinent = continentFilter.value;
    const url = new URL(window.location);
    if (selectedContinent === 'All') {
        url.searchParams.delete('continent');
    } else {
        url.searchParams.set('continent', selectedContinent);
    }
    window.location.href = url.toString();
});
capitalGuessButton.addEventListener('click', submitCapitalGuess);
continentFilter.addEventListener('change', () => {
    // Update URL with new continent selection
    updateURLWithContinent(continentFilter.value);
    // Reload country suggestions for the new continent
    loadCountrySuggestions();
    // When continent changes, start a new game with the new filter
    initGame();
});

guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitGuess();
    }
});

capitalInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitCapitalGuess();
    }
});

// Initialize continent filter from URL on page load
const initialContinent = getContinentFromURL();
continentFilter.value = initialContinent;

// Load country suggestions and initialize game on load
loadCountrySuggestions().then(() => {
    initGame();
});

