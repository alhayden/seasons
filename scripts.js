"use strict";
document.addEventListener('DOMContentLoaded', setup); // called once page is loaded

const MAX_CLICK_DISTANCE = 16; // maximum mouse movement before it becomes a drag rather than a click
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
let mouseClick = false;


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
    return createClassedDiv(x, '', ['verticaldivision', 'background']);
}

// creates a month label on the calendar at horizontal position x
function createMonthLabel(x, label) {
    return createClassedDiv(x, label, ['monthname', 'background']);
}


/* UI ---------------------------------------------- */


function createSeasonObject(x, y) {
    y = y - box.getBoundingClientRect().top; // align y to calendar frame of reference
    y -= 8; // center around pointer
    let naming_box = createClassedElementAt(x, y, "", ['seasoninput'], 'input');
    naming_box.focus(); // trap the cursor

    // resize while typing and submit on enter
    naming_box.addEventListener("keydown", e => {
        e.target.size = Math.max(e.target.size, e.target.value.length); // mostly works
        if (e.keyCode == 13) {
            e.target.blur();
            return false;
        }
    });

    // save and convert to div on lost focus
    naming_box.addEventListener("focusout", e => {
        mouseClick = false; // cancel the create new thing event

        // create the replacement <div> 
        if (e.target.value.length > 0) {
            createClassedDivAt(x, y, e.target.value, ['seasontitle']);
            createClassedDivAt(x, y + 20, '', ['seasonduration']);
        }
        
        // remove the inputs
        e.target.twin.parentNode.removeChild(e.target.twin);
        e.target.parentNode.removeChild(e.target);
    });
}


/* Helper Functions -------------------------------- */

// helper for createClassedDivAt but with default y=0
function createClassedDiv(x, text, classes) {
    return createClassedDivAt(x, 0, text, classes);
}

// helper for creating a generic div on the calendar.
function createClassedDivAt(x, y, text, classes) {
    return createClassedElementAt(x, y, text, classes, 'div');
}
function createClassedElementAt(x, y, text, classes, elementType) {
    let elem = document.createElement(elementType);
    for (let clazz of classes) {
        elem.classList.add(clazz);
    }
    elem.innerText = text;
    addChildToContainer(box, elem, x, y);
    return elem;
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

    child.twin = extraChild;
    extraChild.twin = child;
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

    // mouse down handler for the calendar
    document.getElementById("calendar-box").addEventListener("mousedown", e => {
        lastMouse = {x: e.clientX, y: e.clientY};
        startMouse = {x: e.clientX, y: e.clientY};
        mouseDown = true;
        mouseClick = true;
    });

    // mouse up handler for the calendar
    document.getElementById("calendar-box").addEventListener("mouseup", e => {
        if (mouseClick && Math.pow(startMouse.x - e.clientX, 2) + Math.pow(startMouse.y - e.clientY, 2) <= MAX_CLICK_DISTANCE) {
            // do a click
            console.log("click");
            createSeasonObject(e.clientX, e.clientY);
        }
        mouseDown = false;
    });

    // mouse movement handler for the calendar
    document.getElementById("calendar-box").addEventListener("mousemove", e => {
        if (mouseDown && Math.pow(startMouse.x - e.clientX, 2) + Math.pow(startMouse.y - e.clientY, 2) >= MAX_CLICK_DISTANCE) {
            scrollChildrenSideways(box, e.clientX - lastMouse.x);
            mouseClick = false; // this mouse interaction can no longer be a click
        }
        lastMouse = {x: e.clientX, y: e.clientY};
    });
}
