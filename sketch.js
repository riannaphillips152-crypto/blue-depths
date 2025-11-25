// --- Global P5.js-independent Constants ---
let lines = []; // Array to hold multiple abstract "sadness lines"
let lineCount = 180; // Increased number of lines for more density

let capture; // Variable for webcam

// --- More Blue Color Palettes (BOLDER LINES) ---
const palette1 = {
  bg: '#1A2A38', // Darker, deep blue-grey
  main: '#4A90E2', // Bolder, more vibrant blue
  subtle: '#2A5D8A', // Stronger, yet still subtle blue
  accumulated: '#101A24', // Very dark blue for lines in puddle
  puddleOverlay: '#101A24B0' // Semi-transparent dark blue for the filling puddle
};

const palette2 = {
  bg: '#202D3A', // Slightly different dark blue-grey
  main: '#5EADE2', // Brighter, clearer, bolder blue
  subtle: '#3A6F9E', // Stronger, slightly lighter subtle blue
  accumulated: '#151D28', // Another very dark blue
  puddleOverlay: '#151D28B0' // Semi-transparent dark blue for the filling puddle
};

const backgroundFadeAlpha = 2; // SIGNIFICANTLY MORE TRANSPARENT FADE

// --- Global Variables (initialized in setup for p5.js constants) ---
let currentPuddleHeight = 0; // The current height of the "puddle" filling from bottom
let puddleFillRate = 0; // How fast the puddle fills, controlled by mouseY

let lineSpeedControl = 0; // Controls the overall droop speed of lines, controlled by mouseX
const minLineDroopSpeed = 0.05; // Minimum base droop speed
const maxLineDroopSpeed = 0.5; // Maximum base droop speed

let reverseMoment = 0; // Timer for click-activated reversal effect

// p5.js color objects for efficient drawing - will be updated on click
let bgColor;
let mainLineCol;
let subtleLineCol;
let accumulatedCol; // This is now for the lines *within* the puddle
let puddleOverlayCol; // New color for the filling puddle
let fadeFillColor;

// --- UI Logic ---
function toggleInfo() {
    const infoBox = document.getElementById('interaction-instructions');
    const icon = document.getElementById('toggle-icon');
    
    // Toggle the class
    infoBox.classList.toggle('collapsed');

    // Update icon text
    if (infoBox.classList.contains('collapsed')) {
        icon.innerText = "+";
    } else {
        icon.innerText = "−"; // minus sign
    }
}

function setup() {
  createCanvas(windowWidth, windowHeight); // Use window size for responsiveness
  strokeCap(ROUND); // Rounded ends for lines

  // --- FIX: Performance Optimization ---
  pixelDensity(1);

  // --- VIDEO CAPTURE SETUP ---
  capture = createCapture(VIDEO);
  capture.size(320, 240); 
  capture.hide(); 

  // Initialize colors with the first palette
  applyPalette(palette1);
  background(bgColor); // Set initial background

  // Initialize abstract lines
  for (let i = 0; i < lineCount; i++) {
    lines.push(new SadLine(random(width), random(-height, height)));
  }
  
  // Attach the event listener to the info box
  const infoBox = document.getElementById('interaction-instructions');
  if (infoBox) {
      infoBox.addEventListener('click', toggleInfo);
  }
}

function draw() {
  // Slowly fade the background, creating a trail effect
  fill(fadeFillColor);
  noStroke();
  rect(0, 0, width, height);

  // --- INTERACTIVITY: Mouse Y controls the 'puddleFillRate' ---
  let targetFillRate = map(mouseY, height, 0, 2.0, -1.0, true); 
  puddleFillRate = lerp(puddleFillRate, targetFillRate, 0.1); 

  // Update currentPuddleHeight based on puddleFillRate
  currentPuddleHeight += puddleFillRate;
  currentPuddleHeight = constrain(currentPuddleHeight, 0, height + 100); 

  // --- INTERACTIVITY: Mouse X controls the 'lineSpeedControl' (droop speed) ---
  let targetLineSpeed = map(mouseX, 0, width, minLineDroopSpeed, maxLineDroopSpeed, true);
  lineSpeedControl = lerp(lineSpeedControl, targetLineSpeed, 0.1); 


  // Decrease reverseMoment timer
  if (reverseMoment > 0) {
    reverseMoment--;
  }

  // Update and display each line
  for (let i = 0; i < lines.length; i++) {
    lines[i].droop();
    lines[i].display();
    lines[i].checkBoundaries();
  }

  // --- Draw the "puddle of sadness" filling from the bottom ---
  if (currentPuddleHeight > 0) {
    fill(puddleOverlayCol); 
    noStroke();
    rect(0, height - currentPuddleHeight, width, currentPuddleHeight);
  }
  
  // --- DRAW VIDEO CAPTURE (Bottom Left) ---
  if (capture && capture.loadedmetadata) {
      let vidWidth = 230; // Matches info box width
      let vidHeight = (capture.height / capture.width) * vidWidth; 
      
      let x = 20; // Left margin
      let y = height - vidHeight - 20; // Bottom margin
      
      push();
      // Draw video
      image(capture, x, y, vidWidth, vidHeight);
      
      // Border styling matching the Sadness theme
      noFill();
      stroke(74, 144, 226, 100); // Main Blue, semi-transparent
      strokeWeight(1);
      rect(x, y, vidWidth, vidHeight);
      pop();
  }
}

// Function to apply a given color palette
function applyPalette(palette) {
  bgColor = color(palette.bg);
  mainLineCol = color(palette.main);
  subtleLineCol = color(palette.subtle);
  accumulatedCol = color(palette.accumulated); 
  puddleOverlayCol = color(palette.puddleOverlay); 
  fadeFillColor = color(red(bgColor), green(bgColor), blue(bgColor), backgroundFadeAlpha);
  background(bgColor); 
}


// --- Click Interaction ---
function mousePressed(event) {
  // Prevent interaction if clicking inside the interaction box
  if (event && event.target.closest('#interaction-instructions')) return;

  // Toggle between palettes on click
  if (bgColor.toString() === color(palette1.bg).toString()) { 
    applyPalette(palette2);
  } else {
    applyPalette(palette1);
  }

  // --- RESET PUDDLE ON CLICK ---
  currentPuddleHeight = 0; 
  puddleFillRate = 0; 

  // Trigger a momentary upward snap/angle change for each line
  reverseMoment = 30; 
  for(let line of lines) {
    line.triggerReverse();
  }
}


// Class for an abstract "sad line"
class SadLine {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.len = random(50, 150);
    this.thickness = random(1, 4);
    this.initialDroopSpeedFactor = random(0.8, 1.2); 
    this.color = random() > 0.8 ? mainLineCol : subtleLineCol;
    this.driftXBase = random(-0.2, 0.2); 
    this.currentAngle = PI / 2 + random(-0.2, 0.2); 
    this.reverseFactor = 0; 
  }

  droop() {
    // Droop speed now influenced by lineSpeedControl (mouseX) and currentPuddleHeight
    let currentDroopSpeed = lineSpeedControl * this.initialDroopSpeedFactor + (currentPuddleHeight * 0.003); 
    
    // Reverse movement due to click
    this.y -= this.reverseFactor; 
    this.reverseFactor = lerp(this.reverseFactor, 0, 0.1); 

    // Apply normal droop after potential reversal
    this.y += currentDroopSpeed;


    // Angle change affected by currentPuddleHeight and a momentary snap
    let angleInfluence = map(currentPuddleHeight, 0, height, 0.1, 0.3); 
    let targetAngle = PI / 2 + sin(frameCount * 0.05 + this.x * 0.01) * angleInfluence;
    
    // Briefly snap angle upwards on click
    if (reverseMoment > 0) {
      targetAngle = PI / 2 - PI/4 + random(-0.5, 0.5); 
    }
    this.currentAngle = lerp(this.currentAngle, targetAngle, 0.1);
    
    // Horizontal drift also influenced by lineSpeedControl (more frantic when faster)
    this.x += this.driftXBase * noise(this.y * 0.5, frameCount * 0.001) * map(lineSpeedControl, minLineDroopSpeed, maxLineDroopSpeed, 0.5, 3.0);
  }

  display() {
    // If the line is 'submerged' in the puddle, use the accumulatedColor for its stroke
    if (this.y > height - currentPuddleHeight) {
      stroke(accumulatedCol); 
    } else {
      stroke(this.color); 
    }
    strokeWeight(this.thickness);
    let x2 = this.x + cos(this.currentAngle) * this.len;
    let y2 = this.y + sin(this.currentAngle) * this.len;
    line(this.x, this.y, x2, y2);
  }

  checkBoundaries() {
    // If the line goes off-screen, reset it to the top
    if (this.y > height + 50 || this.y < -150) { 
      this.y = random(-100, -50);
      this.x = random(width);
      this.thickness = random(1, 4);
      this.len = random(50, 150);
      this.color = random() > 0.8 ? mainLineCol : subtleLineCol; 
      this.currentAngle = PI / 2 + random(-0.2, 0.2);
    }
  }

  // New method to trigger the reverse effect for an individual line
  triggerReverse() {
    this.reverseFactor = random(5, 15); 
    this.currentAngle = PI / 2 - PI/4 + random(-0.5, 0.5); 
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(bgColor);
  
  lines = [];
  for (let i = 0; i < lineCount; i++) {
    lines.push(new SadLine(random(width), random(-height, height)));
  }
}