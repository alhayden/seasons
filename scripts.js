"use strict";
document.addEventListener('DOMContentLoaded', setup);

let box;

// setup ----------

function setup() {
    box = document.getElementById("calendar-box");
    console.log(box);
    addEventListeners();
}

function scrollSideways(amount) {
    for (let i of box.children) {
        i.style.left = (i.style.left + amount) + "px";
    }
}


function addEventListeners() {

    document.getElementById("body").addEventListener("wheel", e => {
        console.log("e");
        scrollSideways(5);
    });
}
