"use strict";
document.addEventListener('DOMContentLoaded', setup); // called once page is loaded

const scroll_step = 16; // amount of pixels to move each scroll wheel tick
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
