"use strict";
document.addEventListener('DOMContentLoaded', setup); // called once page is loaded

const scroll_step = 16; // amount of pixels to move each scroll wheel tick
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SOLSTICES = ['June Solstice', 'December Solstice'];
const SOLSTICEDATES = [171, 355]; // June 21,  December 21
let doc_width; 
let box; // div which holds the whole scrolling calendar


// setup ----------

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
function createCalendarBackground() {
    let step = doc_width / MONTHS.length;
    for (let i = 0; i < MONTHS.length; i++) {
        createVerticalDivision(i * step);
        createMonthLabel(i * step, MONTHS[i]);
    }
    createSolsticeLabels();
}

function createSolsticeLabels() {
    for (let i = 0; i < SOLSTICES.length; i++) {
        let x = SOLSTICEDATES[i] * (doc_width / 365);
        createVerticalDivision(x);
        createClassedDiv(x, SOLSTICES[i], ['datelabel', 'background']);
    }
}

function createVerticalDivision(x) {
    createClassedDiv(x, '', ['verticaldivision', 'background']);
}

function createMonthLabel(x, label) {
    createClassedDiv(x, label, ['monthname', 'background']);
}

function createClassedDiv(x, text, classes) {
    let elem = document.createElement("div");
    for (let clazz of classes) {
        elem.classList.add(clazz);
    }
    elem.innerText = text;
    addChildToContainer(box, elem, x, 0);
}

/* UI ---------------------------------------------- */



/* Helper Functions -------------------------------- */
function addChildToContainer(container, child, x, y) {
    child.classList.add("calendarobject");
    container.appendChild(child);
    child.style.left = x + "px";
    child.style.top = y + "px";
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
            scrollChildrenSideways(box, scroll_step);
        } else {
            scrollChildrenSideways(box, -1 * scroll_step);
        }
    });
}
