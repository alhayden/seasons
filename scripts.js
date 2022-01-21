"use strict";
document.addEventListener('DOMContentLoaded', setup); // called once page is loaded

const MAX_CLICK_DISTANCE = 16; // maximum mouse movement before it becomes a drag rather than a click
const SCROLL_STEP = 16; // amount of pixels to move each scroll wheel tick

// months to be displayed in the background:
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// important dates to be displayed on the background, labels and then days
const DATE_LABELS = ['June Solstice', 'December Solstice'];
const DATES = [171, 355]; // June 21,  December 21

const VERTICAL_SPACING = 40;

const query = parse_query_string(window.location.search.substring(1));

/* --- defined in setup() --- */
let doc_width; 
let box; // div which holds the whole scrolling calendar

// global information about mouse interactions with the calendar
let lastMouse;
let startMouse;
let mouseDown = false;
let mouseClick = false;
let selectedObject = null;

// how far the calendar has been scrolled in this session
let totalOffset = 0;


/* setup -----------------------------------------------*/

function setup() {
    // get the "box" (div which contains the calendar)
    box = document.getElementById("calendar-box");
    console.log(box);
    
    // get window width
    doc_width = document.innerWidth || document.body.clientWidth;

    // set up the event listeners (for user input)
    addEventListeners();
    
    // make the background
    createCalendarBackground();

}

// parse the query in the url
function parse_query_string(query) {
    let lets = query.split("&");
    let query_string = {};
    for (let i = 0; i < lets.length; i++) {
        let pair = lets[i].split("=");
        let key = decodeURIComponent(pair[0]);
        let value = decodeURIComponent(pair[1]);
        // If first entry with this name
        if (typeof query_string[key] === "undefined") {
            query_string[key] = decodeURIComponent(value);
            // If second entry with this name
        } else if (typeof query_string[key] === "string") {
            let arr = [query_string[key], decodeURIComponent(value)];
            query_string[key] = arr;
            // If third or later entry with this name
        } else {
            query_string[key].push(decodeURIComponent(value));
        }
    }
    return query_string;
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

function createSeasonInput(x, y) {

    // if the input would fall of the screen, scroll the calendar so it fits.
    if (x > doc_width - 175) {
        scrollChildrenSideways(box, (doc_width - 175) - x);
        x = doc_width - 175;
    }
    y = Math.min(y, Math.round(box.getBoundingClientRect().height) - VERTICAL_SPACING);

    y = y - box.getBoundingClientRect().top; // align y to calendar frame of reference
    y -= 8; // center around pointer
    y = Math.round(y / VERTICAL_SPACING) * VERTICAL_SPACING; // align to grid
    const color = document.getElementById("color-picker").value;
    let naming_box = createClassedElementAt(x, y, "", ['seasoninput'], 'input');
    naming_box.focus(); // trap the cursor

    // resize while typing and submit on enter
    naming_box.addEventListener("keydown", e => {
        e.target.twin.value = e.target.value;
        if (e.keyCode == 13) {
            e.target.blur();
            return false;
        }
    });

    // save and convert to div on lost focus
    naming_box.addEventListener("focusout", e => {
        mouseClick = false; // cancel the create new thing event

        // create the replacement <div>s
        if (e.target.value.length > 0) {
            y = parseInt(e.target.style.top);
            x = parseInt(e.target.style.left);
            createSeasonObject(x, y, e.target.value, color);
        }
        
        // remove the inputs
        e.target.twin.parentNode.removeChild(e.target.twin);
        e.target.parentNode.removeChild(e.target);
    });
}

// create the label/bar pair that represents a season on the calendar
function createSeasonObject(x, y, label, color) {
    // make the label and bar
    let title = createClassedDivAt(x, y, label, ['seasontitle', 'foreground']);
    let duration = createClassedDivAt(x, y + 20, '', ['seasonduration', 'foreground']);

    title.duration = duration;

    // set the styles
    twinnedStyle(title, "color", color);
    twinnedStyle(duration, "backgroundColor", color);
    twinnedStyle(duration, "width", "4px");
    
    // add the handles for resizing
    let resizer1 = createResizerForDuration(duration);
    let resizer2 = createResizerForDuration(duration.twin);
    resizer1.twin = resizer2;
    resizer2.twin = resizer1;
    setupResizer(resizer1);
    setupResizer(resizer2);

    title.related = [duration];

    // editing stuff
    setupSeasonEditability(title);
    setupSeasonEditability(title.twin);
    return title;
}

// generate resizder objects for a duration maker
function createResizerForDuration(duration) {
    let resizer = document.createElement("div");
    resizer.classList.add("seasonresizer");
    resizer.classList.add("foreground");
    resizer.style.marginLeft = (parseInt(duration.style.width) - 4) + "px";
    duration.appendChild(resizer);
    duration.resizer = resizer;
    duration.related = [resizer];
    return resizer;
}

// add listeners to a resizer to change the length of a duration marker
function setupResizer(resizer) {
    let duration = resizer.parentElement;
    resizer.onMouseMove = e => {
        if (mouseDown) {
            // drag to change the length of a season bar
            let diff = e.clientX - lastMouse.x;
            let width = Math.max(parseInt(duration.style.width) + diff, 4);
            width = Math.min(doc_width, width); // bound to width of document (1 year)
            if (e.clientX < parseInt(duration.style.left)) {
                width = 4;
            }
            twinnedStyle(duration, "width", width + "px");
            twinnedStyle(resizer, "marginLeft", (width - 4) + "px");
        }
    };
    resizer.addEventListener("mousedown", e => {
        selectedObject = resizer;
    });
}

// given a season title, add listeners to create a label editor when it is clicked.
function setupSeasonEditability(title) {
    let _mouseover = false;
    title.addEventListener("click", e => {
        const x = parseInt(title.style.left);
        const y = parseInt(title.style.top);
        let naming_box = createClassedElementAt(x, y, "", ['seasoninput'], 'input');
        naming_box.value = title.innerText;
        naming_box.focus(); // trap the cursor

        mouseClick = false;

        // resize while typing and submit on enter
        naming_box.addEventListener("keydown", e => {
            e.target.twin.value = e.target.value;
            if (e.keyCode == 13) {
                e.target.blur();
                return false;
            }
        });
        // save and convert to div on lost focus
        naming_box.addEventListener("focusout", e => {
            mouseClick = false; // cancel the create new thing event
            title.innerText = e.target.value;
            title.twin.innerText = e.target.value;
            
            // remove the inputs
            e.target.twin.parentNode.removeChild(e.target.twin);
            e.target.parentNode.removeChild(e.target);
        });
        _mouseover = false;
    });

    
    title.addEventListener("mouseenter", e => {
        _mouseover = true;
    });
    title.addEventListener("mouseleave", e => {
        _mouseover = false;
    });
    
    document.addEventListener("keydown", e => {
        if (_mouseover && (e.keyCode == 46 || e.keyCode == 8)) {
            removeCalendarElement(title);
            _mouseover = false;
            return false;
        }
    });
}

function removeCalendarElement(object) {
    if (object.related) {
        for (let obj of object.related) {
            removeCalendarElement(obj)
        }
    }

    object.twin.remove();
    object.remove();
}

// JSON conversion - data communication
function jsonizeCalendar() {
    let data = {};
    data.version = 2;
    data.name = document.getElementById("name-input").value;
    data.id = query.id;
    data.elements = [];
    // save season bars
    let elems = document.getElementsByClassName("seasontitle");
    
    for (let elem of elems) {
        let jsonElem = {};
        jsonElem.title = elem.innerText;
        jsonElem.start =  Math.floor(((((parseInt(elem.style.left) - totalOffset) % doc_width) + doc_width) % doc_width) / doc_width * 365);
        jsonElem.duration = Math.round(parseInt(elem.duration.style.width) / doc_width * 365);
        jsonElem.color = elem.style.color;
        jsonElem.y = Math.round(parseInt(elem.style.top) / VERTICAL_SPACING);
        data.elements.push(jsonElem);
    }
    return JSON.stringify(data);
}

// load the calendar from a json object
function calendarFromJson(json) {
    let data = JSON.parse(json);
    for (let elem of data.elements) {
        let title = elem.title;
        let color = elem.color;
        let duration = Math.round(elem.duration / 365 * doc_width);
        let y = elem.y * VERTICAL_SPACING;
        let x = Math.round(((((elem.start / 365 * doc_width) + totalOffset) % doc_width) + doc_width) % doc_width);
        let seasonObj = createSeasonObject(x, y, title, color);
        twinnedStyle(seasonObj.duration, "width", duration + "px");
        twinnedStyle(seasonObj.duration.resizer, "marginLeft", (duration - 4) + "px");
    }
}

function clearCalendar() {
    let elems = document.getElementsByClassName("foreground");
    while(elems[0]) {
        elems[0].remove();
    }
}

function resetCalendar() {
    window.location.reload();
}

async function submitCalendarToDB() {
    const json = jsonizeCalendar();
    const response = await fetch("https://f-1.karel.pw/calendardb/put", {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: json});
    console.log(response);
    alert("Calendar saved successfully!");

}


/* Helper Functions -------------------------------- */

// apply style to both this object and it's twin
function twinnedStyle(object, attribute, value) {
    object.style[attribute] = value;
    object.twin.style[attribute] = value;
}

// helper for createClassedDivAt but with default y=0
function createClassedDiv(x, text, classes) {
    return createClassedDivAt(x, 0, text, classes);
}

// helper for creating a generic div on the calendar.
function createClassedDivAt(x, y, text, classes) {
    return createClassedElementAt(x, y, text, classes, 'div');
}

// create a generic element with the given class, location, text, and type
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
    
    totalOffset += amount;
    
    for (let i of container.children) { // loop through children
        if (i.style.left == '') {   
            continue;  // ignore elements that were initialized without a position
        }
        // move the object
        let currX = parseInt(i.style.left);
        currX += amount;
        if (currX > doc_width * 1) {
            currX -= doc_width * 2;
        } else if (currX < doc_width * -1) {
            currX += doc_width * 2;
        }

        i.style.left = (currX) + "px";
    }
}


function addEventListeners() {
    
    // add listener for mouse scroll wheel use
    document.getElementById("calendar-box").addEventListener("wheel", e => {
        if (e.deltaY < 0) {
            scrollChildrenSideways(box, SCROLL_STEP);
        } else {
            scrollChildrenSideways(box, -1 * SCROLL_STEP);
        }
        e.stopPropagation();
    });
    
    // calendar box -------------------------------------------------------------
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
            createSeasonInput(e.clientX, e.clientY);
        }
        mouseDown = false;
        selectedObject = null;
    });

    // mouse movement handler for the calendar
    document.getElementById("calendar-box").addEventListener("mousemove", e => {
        if (selectedObject) {
            selectedObject.onMouseMove(e);
        }
        else if (mouseDown && Math.pow(startMouse.x - e.clientX, 2) + Math.pow(startMouse.y - e.clientY, 2) >= MAX_CLICK_DISTANCE) {
            scrollChildrenSideways(box, e.clientX - lastMouse.x);
            mouseClick = false; // this mouse interaction can no longer be a click
        }
        lastMouse = {x: e.clientX, y: e.clientY};
    });

    // submit button ----------------------------------------------------------
    document.getElementById("submit-button").addEventListener("click", e => {
        submitCalendarToDB();
    });

    document.getElementById("reset-button").addEventListener("click", e => {
        resetCalendar();
    });

    setupScrollBarFunctionality();
}

function setupScrollBarFunctionality() {
    let _mouseDown = false;
    document.getElementById("scroller").style.left = (doc_width / 2) - 21 + "px";
    
    document.getElementById("scroll-bar").addEventListener("mousedown", e => {
        _mouseDown = true;
        _updateScrollerPositionAndScroll(e);
    });
    document.getElementById("body").addEventListener("mouseup", e => {
        _mouseDown = false;
        document.getElementById("scroller").style.left = (doc_width / 2) - 21 + "px";
    });
    document.getElementById("body").addEventListener("mousemove", e => {
        _updateScrollerPositionAndScroll(e);
    });

    function _updateScrollerPositionAndScroll(e) {
        const lastX = parseInt(document.getElementById("scroller").style.left) + 21;
        const newX = Math.max(Math.min(e.clientX, doc_width - 21), 21);
        if(_mouseDown) {
            scrollChildrenSideways(box, -1 * (newX - lastX));
            document.getElementById("scroller").style.left = newX - 21 + "px";
        }
    }
}
