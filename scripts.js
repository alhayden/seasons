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

const POINT = 0; const BAR = 1; const TEXT = 2; const DRAW = 3; const ERASE = 4; const EDIT = 5;
let mode = POINT;

let lastMode = POINT;

let listenersInitialized;

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

    setupGhosts();
    
    document.getElementById("pointer-button").disabled = true;
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




// ====== SEASONBAR ======
function createSeasonInput(x, y) {

    // if the input would fall of the screen, scroll the calendar so it fits.
    if (x > doc_width - 175) {
        scrollChildrenSideways(box, (doc_width - 175) - x);
        x = doc_width - 175;
    }

    y = y - box.getBoundingClientRect().top; // align y to calendar frame of reference
    y = Math.min(y, Math.round(box.getBoundingClientRect().height) - VERTICAL_SPACING);
    y -= 8; // center around pointer
    y = Math.round(y / VERTICAL_SPACING) * VERTICAL_SPACING; // align to grid
    const color = document.getElementById("color-picker").value;
    let naming_box = createClassedElementAt(x, y, "", ['seasoninput'], 'input');
    naming_box.focus(); // trap the cursor

    enterEditMode();

    // resize while typing and submit on enter
    naming_box.addEventListener("keydown", e => {
        e.target.twin.value = e.target.value;
        if (e.key == "Enter" || e.key == "Escape") {
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

        exitEditMode();
        
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

    title.classList.add("storable-seasonbar");

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

    relateObjects(title, duration);

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
    resizer.classList.add("nohighlight");
    resizer.style.marginLeft = (parseInt(duration.style.width) - 4) + "px";
    duration.appendChild(resizer);
    duration.resizer = resizer;
    relateObjects(duration, resizer);
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
    title.addEventListener("click", e => {
        const x = parseInt(title.style.left);
        const y = parseInt(title.style.top);
        let naming_box = createClassedElementAt(x, y, "", ['seasoninput'], 'input');
        naming_box.value = title.innerText;
        title.innerText = "";
        naming_box.focus(); // trap the cursor
        enterEditMode();

        mouseClick = false;

        // resize while typing and submit on enter
        naming_box.addEventListener("keydown", e => {
            e.target.twin.value = e.target.value;
            if (e.key == "Enter" || e.key == "Escape") {
                e.target.blur();
                return false;
            }
        });
        // save and convert to div on lost focus
        naming_box.addEventListener("focusout", e => {
            mouseClick = false; // cancel the create new thing event
            title.innerText = e.target.value;
            title.twin.innerText = e.target.value;

            exitEditMode();
            
            // remove the inputs
            e.target.twin.parentNode.removeChild(e.target.twin);
            e.target.parentNode.removeChild(e.target);
        });
    });
}

// ====== TEXTBOX ======

function createTextboxObject(x, y) {
    // if the input would fall of the screen, scroll the calendar so it fits.
    if (x > doc_width - 175) {
        scrollChildrenSideways(box, (doc_width - 175) - x);
        x = doc_width - 175;
    }
    
    y = y - box.getBoundingClientRect().top; // align y to calendar frame of reference
    y = Math.min(y, Math.round(box.getBoundingClientRect().height) - VERTICAL_SPACING);
    y -= 8; // center around pointer
    y = Math.round(y / VERTICAL_SPACING) * VERTICAL_SPACING; // align to grid
    const color = document.getElementById("color-picker").value;
    let textbox = createClassedElementAt(x, y, "", ['textarea'], 'textarea');

    textbox.classList.add("storable-textbox")
    twinnedStyle(textbox, 'color', color);
    twinnedStyle(textbox, "borderStyle", 'none');
    twinnedStyle(textbox, "width", "200px");
    twinnedStyle(textbox, "height", "32px");
    twinnedStyle(textbox, "maxWidth", doc_width / 2 + "px");
    twinnedStyle(textbox, "maxHeight", (box.getBoundingClientRect().height - y) + "px");

    setupTextbox(textbox);
    setupTextbox(textbox.twin);

    textbox.focus(); // trap the cursor

    return textbox;
}

function setupTextbox(textbox) {
    let _editing = false;
    textbox.addEventListener("keydown", e => {
        e.target.twin.value = e.target.value;
        e.target.twin.selectionEnd = 0;
        if(parseInt(e.target.style.left) + parseInt(e.target.style.width) > doc_width) {
            scrollChildrenSideways(box, -1 * (parseInt(e.target.style.left) + parseInt(e.target.style.width) - doc_width));
        }
        if (e.key == "Escape") {
            e.target.blur();
        }
    });
    textbox.addEventListener("mouseenter", e => {
        if (! _editing) {
            e.target.style.backgroundColor = "#f0f0ffa0";
            e.target.twin.style.backgroundColor = "#f0f0ffa0";
        }
    });
    textbox.addEventListener("mouseleave", e => {
        e.target.style.backgroundColor = "";
        e.target.twin.style.backgroundColor = "";
    });

    textbox.addEventListener("mousedown", e => {
        e.target.focus();
    });

    textbox.addEventListener("focusin", e => {
        mouseClick = false;
        _editing = true;
        enterEditMode();
        e.target.style.backgroundColor = "";
        e.target.twin.style.backgroundColor = "";
        if(parseInt(e.target.style.left) + parseInt(e.target.style.width) > doc_width) {
            scrollChildrenSideways(box, -1 * (parseInt(e.target.style.left) + parseInt(e.target.style.width) - doc_width));
        }
        if(parseInt(e.target.style.left) < 0) {
            //scrollChildrenSideways(box, -1 * parseInt(e.target.style.left));
        }
    });
    textbox.addEventListener("focusout", e => {
        e.target.style.backgroundColor = "";
        e.target.twin.style.backgroundColor = "";
        e.target.twin.value = e.target.value;
        mouseClick = false;
        _editing = false;
        e.target.selectionEnd = 0;
        exitEditMode();
        if (e.target.value == "") {
            removeCalendarElement(e.target);
        }

    });
    let ro = new ResizeObserver(entries => {
    for (let entry of entries) {
        entry.target.twin.style.width = entry.target.style.width;
        entry.target.twin.style.height = entry.target.style.height
     }
    });
    ro.observe(textbox);
}

// STUFF THAT'S NOT UI BUT FOR SOME REASON NOT IN UTILITY

function removeCalendarElement(object) {
    if (object.related) {
        let _related = object.related
        object.related = null;
        for (let obj of _related) {
            removeCalendarElement(obj)
        }
    }
    if (object.twin.related) {
        let _related = object.twin.related
        object.twin.related = null;
        for (let obj of _related) {
            removeCalendarElement(obj)
        }
    }

    object.twin.remove();
    object.remove();
}

function chainedClassListAdd(object, className) {
    if (object.classList.contains(className) || object.classList.contains("nohighlight")) {
        return;
    }
    object.classList.add(className);
    if (object.related) {
        for (let obj of object.related) {
            chainedClassListAdd(obj, className);
        }
    }
    chainedClassListAdd(object.twin, className);
}

function chainedClassListRemove(object, className) {
    if (!object.classList.contains(className) || object.classList.contains("nohighlight")) {
        return;
    }
    object.classList.remove(className);
    if (object.related) {
        for (let obj of object.related) {
            chainedClassListRemove(obj, className);
        }
    }
    chainedClassListRemove(object.twin, className);
}

// JSON conversion - data communication
function jsonizeCalendar() {
    let data = {};
    data.version = 3;
    data.name = document.getElementById("name-input").value;
    data.id = query.id;
    data.seasonbars = [];
    // save season bars
    let elems = document.getElementsByClassName("storable-seasonbar");
    for (let elem of elems) {
        let jsonElem = {};
        jsonElem.title = elem.innerText;
        jsonElem.start =  Math.floor(((((parseInt(elem.style.left) - totalOffset) % doc_width) + doc_width) % doc_width) / doc_width * 365);
        jsonElem.duration = Math.round(parseInt(elem.duration.style.width) / doc_width * 365);
        jsonElem.color = elem.style.color;
        jsonElem.y = Math.round(parseInt(elem.style.top) / VERTICAL_SPACING);
        data.seasonbars.push(jsonElem);
    }
    
    data.textboxes = [];
    elems = document.getElementsByClassName("storable-textbox");
    for (let elem of elems) {
        let jsonElem = {};
        jsonElem.text = elem.value;
        jsonElem.x =  Math.floor(((((parseInt(elem.style.left) - totalOffset) % doc_width) + doc_width) % doc_width) / doc_width * 365);
        jsonElem.width = Math.round(parseInt(elem.style.width) / doc_width * 365);
        jsonElem.height = elem.style.height;
        jsonElem.color = elem.style.color;
        jsonElem.y = Math.round(parseInt(elem.style.top) / VERTICAL_SPACING);
        data.textboxes.push(jsonElem);
    }
    return JSON.stringify(data);
}

// load the calendar from a json object
function calendarFromJson(json) {
    json = json.replaceAll("\n", "\\n");
    let data = JSON.parse(json);
    for (let elem of data.seasonbars) {
        let title = elem.title;
        let color = elem.color;
        let duration = Math.round(elem.duration / 365 * doc_width);
        let y = elem.y * VERTICAL_SPACING;
        let x = Math.round(((((elem.start / 365 * doc_width) + totalOffset) % doc_width) + doc_width) % doc_width);
        let seasonObj = createSeasonObject(x, y, title, color);
        twinnedStyle(seasonObj.duration, "width", duration + "px");
        twinnedStyle(seasonObj.duration.resizer, "marginLeft", (duration - 4) + "px");
    }
    for (let elem of data.textboxes) {
        let text = elem.text;
        let x = Math.round(((((elem.x / 365 * doc_width) + totalOffset) % doc_width) + doc_width) % doc_width);
        let y = elem.y * VERTICAL_SPACING;
        let width = Math.round(elem.width / 365 * doc_width);
        let height = elem.height * VERTICAL_SPACING;
        let color = elem.color;
        let boxObj = createTextboxObject(x, y);
        boxObj.value = text;
        boxObj.twin.value = text;
        twinnedStyle(boxObj, "color", color);
        twinnedStyle(boxObj, "width", width + "px");
        twinnedStyle(boxObj, "height", height);
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

function setupDeletability(obj) {
    if (obj.classList.contains("background")) {
        return;
    }
    obj.addEventListener("mousedown", e => {
        if (mode == ERASE) {
            removeCalendarElement(obj);
            e.stopPropagation();
        }
    }, true);
    obj.addEventListener("mouseenter", e => {
        if (mode == ERASE) {
            chainedClassListAdd(e.target, "deleteselect");
            console.log("highlight");
        }
    });
    obj.addEventListener("mouseleave", e => {
        if (mode == ERASE) {
            chainedClassListRemove(e.target, "deleteselect");
        }
    });
}

function clearButtons() {
    let elems = document.getElementsByClassName("toolbutton");
    for (let elem of elems) {
        elem.disabled = false;
    }

}


let ghostBar;
let ghostBarTitle;
let ghostText;

function setupGhosts() {
    ghostBar = document.createElement("div");
    ghostBarTitle = document.createElement("div");
    ghostBar.classList.add("seasondurationghost");
    ghostBarTitle.classList.add("seasontitleghost");
    box.appendChild(ghostBar);
    box.appendChild(ghostBarTitle);

    ghostText = document.createElement("div");
    ghostText.classList.add("textareaghost");
    box.appendChild(ghostText);
}

function handleGhosts(x, y) {
    let _draw = true;
    if (selectedObject || x < 0 || y < 0) {
        _draw = false;
    }

    if (mode == BAR && _draw) {
        y = y - box.getBoundingClientRect().top; // align y to calendar frame of reference
        y = Math.min(y, Math.round(box.getBoundingClientRect().height) - VERTICAL_SPACING);
        y -= 8; // center around pointer
        y = Math.round(y / VERTICAL_SPACING) * VERTICAL_SPACING; // align to grid
        ghostBarTitle.style.left = x + "px";
        ghostBarTitle.style.top = (y - 16) + "px";
        ghostBarTitle.style.display = "block";
        
        ghostBar.style.left = x + "px";
        ghostBar.style.top = (y + 20) + "px";
        ghostBar.style.display = "block";
        
    } else {
        ghostBar.style.display = "none";
        ghostBarTitle.style.display = "none";
    }
    if(mode == TEXT && _draw) {
        y = y - box.getBoundingClientRect().top; // align y to calendar frame of reference
        y = Math.min(y, Math.round(box.getBoundingClientRect().height) - VERTICAL_SPACING);
        y -= 8; // center around pointer
        y = Math.round(y / VERTICAL_SPACING) * VERTICAL_SPACING; // align to grid
        ghostText.style.left = x + "px";
        ghostText.style.top = y + "px";
        ghostText.style.display = "block";
        
    } else {
        ghostText.style.display = "none";
    }
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

function enterEditMode() {
    lastMode = mode;
    if (mode != ERASE) {
        mode = EDIT;
    }
}

function exitEditMode() {
    mode = lastMode;
    if (mode == EDIT) {
        mode = BAR;
    }
}

function relateObjects(a, b) {
    if(!a.related) {
        a.related = [];
    }
    if(!b.related) {
        b.related = [];
    }
    a.related.push(b);
    b.related.push(a);
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

    setupDeletability(child);
    setupDeletability(extraChild);
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

    if(listenersInitialized) {
        return;
    }
    listenersInitialized = true;
    
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
        handleGhosts(-1, -1);
    });

    // mouse up handler for the calendar
    document.getElementById("calendar-box").addEventListener("mouseup", e => {
        if (mouseClick && Math.pow(startMouse.x - e.clientX, 2) + Math.pow(startMouse.y - e.clientY, 2) <= MAX_CLICK_DISTANCE) {
            // do a click
            if (mode == BAR) {
                createSeasonInput(e.clientX, e.clientY);
            } else if(mode == TEXT) {
                createTextboxObject(e.clientX, e.clientY);
            }
        }
        mouseDown = false;
        selectedObject = null;
        document.body.style.userSelect = 'auto';
    });

    // mouse movement handler for the calendar
    document.getElementById("calendar-box").addEventListener("mousemove", e => {
        if (selectedObject) {
            selectedObject.onMouseMove(e);
            document.body.style.userSelect = 'none';
        }
        else if (mode != EDIT && mouseDown && Math.pow(startMouse.x - e.clientX, 2) + Math.pow(startMouse.y - e.clientY, 2) >= MAX_CLICK_DISTANCE) {
            scrollChildrenSideways(box, e.clientX - lastMouse.x);
            mouseClick = false; // this mouse interaction can no longer be a click
            document.body.style.userSelect = 'none';
        }
        lastMouse = {x: e.clientX, y: e.clientY};
        handleGhosts(e.clientX, e.clientY);
    });

    document.getElementById("calendar-box").addEventListener("mouseleave", e => {
        handleGhosts(-1, -1);
    });

    // submit button ----------------------------------------------------------
    document.getElementById("submit-button").addEventListener("click", e => {
        submitCalendarToDB();
    });

    document.getElementById("reset-button").addEventListener("click", e => {
        resetCalendar();
    });
    
    document.getElementById("pointer-button").addEventListener("click", e => {
        mode = POINT;
        clearButtons();
        document.getElementById("pointer-button").disabled = true;
    });

    document.getElementById("bar-button").addEventListener("click", e => {
        mode = BAR;
        clearButtons();
        document.getElementById("bar-button").disabled = true;
    });
    
    document.getElementById("text-button").addEventListener("click", e => {
        mode = TEXT;
        clearButtons();
        document.getElementById("text-button").disabled = true;
    });
    
    document.getElementById("erase-button").addEventListener("click", e => {
        mode = ERASE;
        clearButtons();
        document.getElementById("erase-button").disabled = true;
    });
   /*
    document.getElementById("draw-button").addEventListener("click", e => {
        mode = DRAW;
        clearButtons();
        e.target.disabled = true;
    });*/

    document.getElementById("okay-button").addEventListener("click", e => {
        document.getElementById("starter-info").remove();
    });

    setupScrollBarFunctionality();
    setupResizeability();
}

function setupScrollBarFunctionality() {
    let _mouseDown = false;
    document.getElementById("scroller").style.left = (doc_width / 2) - 21 + "px";
    
    document.getElementById("scroll-bar").addEventListener("mousedown", e => {
        document.body.style.userSelect = 'none';
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

function setupResizeability() {
    window.addEventListener("resize", e => {
        let json = jsonizeCalendar();
        while(box.children.length > 0) {
            box.children[0].remove();
        }
        setup();
        calendarFromJson(json);
    });
}
