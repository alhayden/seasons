"use strict";
document.addEventListener('DOMContentLoaded', setup); // called once page is loaded

const MAX_CLICK_DISTANCE = 10; // maximum mouse movement before it becomes a drag rather than a click
const SCROLL_STEP = 16; // amount of pixels to move each scroll wheel tick

// months to be displayed in the background:
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// important dates to be displayed on the background, labels and then days
const DATE_LABELS = ['June Solstice', 'December Solstice'];
const DATES = [171, 355]; // June 21,  December 21

/* --- defined in setup() --- */
let doc_width; 
let box; // div which holds the whole scrolling calendar

let lastMouse;
let startMouse;
let mouseDown = false;


/* setup -----------------------------------------------*/

function setup() {
    // get the "box" (div which contains the calendar)
    box = document.getElementById("calendar-box");
    console.log(box);
    
    // get window width
    doc_width = document.innerWidth || document.body.clientWidth;

    // set up the event listeners (for user input)
    addEventListeners();

    createCalendarBackground();
}

/* Background graphics -------------------------------- */

// create faint background markings of a familiar calendar
function createCalendarBackground() {
    let step = doc_width / MONTHS.length;
    // loop through the months, creating a division and label for each
    for (let i = 0; i < MONTHS.length; i++) {
        createVerticalDivision(i * step);
        createMonthLabel(i * step, MONTHS[i]);
    }
    // mark the solstices
    createSolsticeLabels();
}

// generate markings at the location of each solstice
function createSolsticeLabels() {
    for (let i = 0; i < DATE_LABELS.length; i++) {
        let x = DATES[i] * (doc_width / 365);
        createVerticalDivision(x);
        createClassedDiv(x, DATE_LABELS[i], ['datelabel', 'background']);
    }
}

// creates a vertical line in the calendar at horizontal position x
function createVerticalDivision(x) {
    createClassedDiv(x, '', ['verticaldivision', 'background']);
}

// creates a month label on the calendar at horizontal position x
function createMonthLabel(x, label) {
    createClassedDiv(x, label, ['monthname', 'background']);
}


/* UI ---------------------------------------------- */



/* Helper Functions -------------------------------- */

// helper for creating a generic div on the calendar.
function createClassedDiv(x, text, classes) {
    let elem = document.createElement("div");
    for (let clazz of classes) {
        elem.classList.add(clazz);
    }
    elem.innerText = text;
    addChildToContainer(box, elem, x, 0);
}

// given an object, insert it into the container at the specified position, and clone it
// for the wrapping functionality.
function addChildToContainer(container, child, x, y) {
    child.classList.add("calendarobject");
    container.appendChild(child);
    child.style.left = x + "px";
    child.style.top = y + "px";
    // make the copy
    let extraChild = child.cloneNode();
    extraChild.innerHTML = child.innerHTML;
    extraChild.innerText = child.innerText;
    container.appendChild(extraChild);
    extraChild.style.left = (x + doc_width) + "px";
    extraChild.style.top = y + "px";
}

// translate all of the children of the given container sideways by the given amount
function scrollChildrenSideways(container, amount) {
    for (let i of container.children) { // loop through children
        if (i.style.left == '') {   
            continue;  // ignore elements that were initialized without a position
        }
        // move the object
        let currX = parseInt(i.style.left);
        currX += amount;
        if (currX > doc_width * 1.5) {
            currX -= doc_width * 2;
        } else if (currX < doc_width * -0.5) {
            currX += doc_width * 2;
        }

        i.style.left = (currX) + "px";
    }
}


function addEventListeners() {
    
    // add listener for mouse scroll wheel use
    document.getElementById("body").addEventListener("wheel", e => {
        if (e.deltaY < 0) {
            scrollChildrenSideways(box, SCROLL_STEP);
        } else {
            scrollChildrenSideways(box, -1 * SCROLL_STEP);
        }
    });

    document.getElementById("calendar-box").addEventListener("mousedown", e => {
        lastMouse = {x: e.clientX, y: e.clientY};
        startMouse = {x: e.clientX, y: e.clientY};
        mouseDown = true;
        
    });
    document.getElementById("calendar-box").addEventListener("mouseup", e => {
        mouseDown = false;
        
    });
    document.getElementById("calendar-box").addEventListener("mousemove", e => {
        if (mouseDown && Math.pow(startMouse.x - e.clientX, 2) + Math.pow(startMouse.y - e.clientY, 2) >= MAX_CLICK_DISTANCE) {
            scrollChildrenSideways(box, e.clientX - lastMouse.x);
        }
        lastMouse = {x: e.clientX, y: e.clientY};
    });
}
