// DOM elements - we select all the elements we'll need to manipulate
const coffeeWeightInput = document.getElementById('coffee-weight');
const ratioInput = document.getElementById('ratio');
const calculateButton = document.getElementById('calculate');
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const resetButton = document.getElementById('reset');
const timerElement = document.querySelector('.timer');
const resultsElement = document.getElementById('results');
const currentActionElement = document.getElementById('current-action');

// Variables for timer and pour data
let timer;               // Will store the setInterval reference
let seconds = 0;         // Current time in seconds
let isRunning = false;   // Timer state flag
let pourData = [];       // Will store all pour data

/**
 * Calculate pours based on coffee weight and ratio
 * 
 * Implementation notes:
 * - We use the formula provided: first pour = 2*coffee weight, 
 *   remaining pours = [(ratio * coffee weight) - 2(coffee weight)]/4
 * - We could have used a more complex formula with different pour amounts, 
 *   but this approach keeps it simple and follows the requested pattern
 * - We store both individual pour weights and cumulative weights for easy display
 */
function calculatePours() {
    const coffeeWeight = parseFloat(coffeeWeightInput.value);
    const ratio = parseFloat(ratioInput.value);
    
    if (isNaN(coffeeWeight) || isNaN(ratio)) {
        alert('Please enter valid numbers for coffee weight and ratio.');
        return;
    }
    
    // First pour (bloom) is 2x coffee weight
    const bloomWeight = coffeeWeight * 2;
    
    // Calculate remaining water
    const totalWater = coffeeWeight * ratio;
    const remainingWater = totalWater - bloomWeight;
    
    // Each additional pour is 1/4 of remaining water
    const additionalPourWeight = remainingWater / 4;
    
    // Create pour data - we use consistent time intervals as requested
    pourData = [
        { name: 'Bloom', time: '0:00', weight: bloomWeight, cumulativeWeight: bloomWeight },
        { name: 'Second Pour', time: '0:45', weight: additionalPourWeight, cumulativeWeight: bloomWeight + additionalPourWeight },
        { name: 'Third Pour', time: '1:30', weight: additionalPourWeight, cumulativeWeight: bloomWeight + 2 * additionalPourWeight },
        { name: 'Fourth Pour', time: '2:30', weight: additionalPourWeight, cumulativeWeight: bloomWeight + 3 * additionalPourWeight },
        { name: 'Final Pour', time: '3:30', weight: additionalPourWeight, cumulativeWeight: totalWater },
        // Add drawdown phases
        { name: 'Early Drawdown', time: '3:31', weight: 0, cumulativeWeight: totalWater },
        { name: 'Good Drawdown', time: '4:00', weight: 0, cumulativeWeight: totalWater },
        { name: 'Late Drawdown', time: '5:00', weight: 0, cumulativeWeight: totalWater },
        { name: 'Brewing Complete', time: '6:00', weight: 0, cumulativeWeight: totalWater }
    ];
    
    // Convert time strings to seconds for easier comparison during timer run
    pourData.forEach(pour => {
        const [minutes, secs] = pour.time.split(':').map(Number);
        pour.timeInSeconds = minutes * 60 + secs;
    });
    
    displayPours();
    updateVisualization(-1); // Reset visualization when recalculating
}

/**
 * Display pour information in the results section
 * 
 * Implementation notes:
 * - We create DOM elements dynamically instead of using innerHTML template
 *   to avoid potential string manipulation issues
 * - Each pour gets a unique ID for easy reference when highlighting active pour
 */
function displayPours() {
    resultsElement.innerHTML = '';
    
    // Display only the actual pour information (not the drawdown phases)
    const activePoursData = pourData.slice(0, 5);
    
    activePoursData.forEach((pour, index) => {
        const pourElement = document.createElement('div');
        pourElement.classList.add('pour');
        pourElement.id = `pour-${index}`;
        
        const nameElement = document.createElement('div');
        nameElement.classList.add('pour-name');
        nameElement.textContent = pour.name;
        
        const timeElement = document.createElement('div');
        timeElement.classList.add('pour-time');
        timeElement.textContent = pour.time;
        
        const weightElement = document.createElement('div');
        weightElement.classList.add('pour-weight');
        weightElement.innerHTML = `
            <span>Add: ${Math.round(pour.weight)}g</span><br>
            <span>Total: ${Math.round(pour.cumulativeWeight)}g</span>
        `;
        
        pourElement.appendChild(nameElement);
        pourElement.appendChild(timeElement);
        pourElement.appendChild(weightElement);
        
        resultsElement.appendChild(pourElement);
    });
}

/**
 * Format time as MM:SS
 * 
 * Implementation notes:
 * - We pad single digits with leading zeros for consistent formatting
 * - We could have used a library like moment.js for time handling,
 *   but this simple function is sufficient for our needs
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Update the chemex visualization based on current pour
 * 
 * Implementation notes:
 * - We use index to determine which segments should be active
 * - -1 is used to reset the visualization
 * - Each segment represents one pour stage
 */
function updateVisualization(currentPourIndex) {
    const segments = document.querySelectorAll('.fill-segment');
    
    segments.forEach((segment, index) => {
        if (currentPourIndex >= index) {
            segment.classList.add('active');
        } else {
            segment.classList.remove('active');
        }
    });
}

/**
 * Update the timer and current pour information
 * 
 * Implementation notes:
 * - This function runs every second when the timer is active
 * - We find the current pour by comparing the current time to pour times
 * - We highlight the active pour and update instructions
 * - Extended to support drawdown phases from 3:30 to 6:00
 */
function updateTimer() {
    seconds++;
    timerElement.textContent = formatTime(seconds);
    
    // Find current pour
    let currentPourIndex = -1;
    let currentPour = null;
    let nextPour = null;
    
    for (let i = 0; i < pourData.length; i++) {
        if (i < pourData.length - 1) {
            if (seconds >= pourData[i].timeInSeconds && seconds < pourData[i+1].timeInSeconds) {
                currentPourIndex = i;
                currentPour = pourData[i];
                nextPour = pourData[i+1];
                break;
            }
        } else if (seconds >= pourData[i].timeInSeconds) {
            currentPourIndex = i;
            currentPour = pourData[i];
            nextPour = null;
        }
    }
    
    // Update active pour highlighting (only for the first 5 pourData items which are actual pours)
    document.querySelectorAll('.pour').forEach(el => el.classList.remove('active'));
    
    if (currentPourIndex >= 0 && currentPourIndex < 5) {
        const currentElement = document.getElementById(`pour-${currentPourIndex}`);
        if (currentElement) {
            currentElement.classList.add('active');
        }
    }
    
    // Update chemex visualization - only for the first 5 pour phases
    const visualizationIndex = Math.min(currentPourIndex, 4);
    if (visualizationIndex >= 0) {
        updateVisualization(visualizationIndex);
    }
    
    // Update current action instructions
    if (seconds >= 360) { // 6:00 or greater
        currentActionElement.textContent = 'Hello World!';
        stopTimer();
    } else if (seconds >= 300) { // 5:00-6:00
        currentActionElement.textContent = 'Might be a late drawdown, grind a tad finer next time! (6:00)';
    } else if (seconds >= 240) { // 4:00-5:00
        currentActionElement.textContent = 'Looking like a good drawdown! (5:00)';
    } else if (seconds >= 210) { // 3:30-4:00
        currentActionElement.textContent = 'Possibly an early drawdown, grind a little coarser next time! (4:00)';
    } else if (nextPour) {
        const timeUntilNext = nextPour.timeInSeconds - seconds;
        if (timeUntilNext <= 10) {
            currentActionElement.textContent = `Get ready for ${nextPour.name} (adding ${Math.round(nextPour.weight)}g)`;
        } else {
            currentActionElement.textContent = `Current: ${currentPour.name} | Target: (${Math.round(currentPour.cumulativeWeight)}g)`;
        }
    }
}

/**
 * Start the timer and disable inputs
 * 
 * Implementation notes:
 * - We ensure calculations are done before starting the timer
 * - We disable input fields as requested to prevent changes during brewing
 * - We use a 1-second interval for the timer, which is sufficient for this application
 */
function startTimer() {
    if (!isRunning) {
        if (pourData.length === 0) {
            calculatePours();
        }
        
        isRunning = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        
        // Disable input fields and calculate button as requested
        coffeeWeightInput.disabled = true;
        ratioInput.disabled = true;
        calculateButton.disabled = true;
        
        timer = setInterval(updateTimer, 1000);
    }
}

/**
 * Stop the timer
 * 
 * Implementation notes:
 * - We keep the inputs disabled even when stopped, as the brewing process
 *   is considered paused, not canceled
 * - We clear the interval to prevent memory leaks
 */
function stopTimer() {
    if (isRunning) {
        isRunning = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        
        clearInterval(timer);
    }
}

/**
 * Reset the timer and enable inputs
 * 
 * Implementation notes:
 * - We re-enable all inputs to allow for new calculations
 * - We reset the visualization to its initial state
 */
function resetTimer() {
    stopTimer();
    seconds = 0;
    timerElement.textContent = '00:00';
    currentActionElement.textContent = 'Press Start to begin brewing';
    
    // Re-enable inputs
    coffeeWeightInput.disabled = false;
    ratioInput.disabled = false;
    calculateButton.disabled = false;
    
    // Reset highlights
    document.querySelectorAll('.pour').forEach(el => el.classList.remove('active'));
    updateVisualization(-1);
}

// Event listeners
calculateButton.addEventListener('click', calculatePours);
startButton.addEventListener('click', startTimer);
stopButton.addEventListener('click', stopTimer);
resetButton.addEventListener('click', resetTimer);

// Initialize the calculator on page load
calculatePours();
