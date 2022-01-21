const VALUE_KIND_PUZZLE_TEXT = 0;
const VALUE_KIND_PUZZLE_TEXT_LENGTH = 1;
const VALUE_KIND_REWIND_STACK = 2;
const VALUE_KIND_REWIND_STACK_SIZE = 3;
const VALUE_KIND_REWIND_STACK_SIZE_MAX = 4;
const VALUE_KIND_BOND_SOLUTIONS = 5;
const VALUE_KIND_BONDS_COUNT = 6;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf8');

function save(c) {
    if(!c.instance) return;
    const key = c.innerHTML;
    const bonds_count = c.instance.exports.get_value(VALUE_KIND_BONDS_COUNT);
    const bond_solutions = new Uint8Array(
        c.instance.exports.memory.buffer,
        c.instance.exports.get_value(VALUE_KIND_BOND_SOLUTIONS),
        bonds_count
    );

    const rewind_stack_size     = c.instance.exports.get_value(VALUE_KIND_REWIND_STACK_SIZE);
    const rewind_stack_size_max = c.instance.exports.get_value(VALUE_KIND_REWIND_STACK_SIZE_MAX);
    const rewind_stack = new Uint8Array(
        c.instance.exports.memory.buffer,
        c.instance.exports.get_value(VALUE_KIND_REWIND_STACK),
        rewind_stack_size_max * 4
    );
    const value = {
        "bonds_count": bonds_count,
        "bond_solutions": bond_solutions,
        "rewind_stack_size": rewind_stack_size,
        "rewind_stack_size_max": rewind_stack_size_max,
        "rewind_stack": rewind_stack
    }
    localStorage.setItem(key, JSON.stringify(value));
}


function showControls() {
    document.querySelectorAll(".controlBtn").forEach(function(btn) {
        btn.style.visibilty = "visible";
        btn.style.opacity   = "1";
    });
}

function hideControls() {
    document.querySelectorAll(".controlBtn").forEach(function(btn) {
        btn.style.visibilty = "hidden";
        btn.style.opacity   = "0";
    });
}

function clear(r, g, b) {
    ctx.fillStyle = "rgb(" + r + ", " + g + ", " + b + ")"
    ctx.fillRect(0, 0, width, height);
}

function draw_line(x0, y0, x1, y1, thickness) {
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();    
}


function draw_dot(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 0.8, 0, 2*Math.PI);
    ctx.fill();    
}


function draw_char(x, y, c) {
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillText(String.fromCharCode(c), x, y - 7);
}

function ignore(event) {
    event.preventDefault();
    return false;
}


function close(event) {
    document.body.style.overflow = 'visible';
    hideControls();
    var c = document.getElementById("fullscreen");
    if(c) {
        const array_to = new Uint8Array(c.target.instance.exports.memory.buffer);
        const array_from = new Uint8Array(c.instance.exports.memory.buffer);
        array_to.set(array_from);
        update(c.target);
        rect = c.target.getBoundingClientRect();
        c.style.border = "1px solid black";
        c.style.width = rect.width + "px";
        c.style.height = rect.height + "px";
        c.style.left = rect.left + "px";
        c.style.top = rect.top + "px";
        c.addEventListener("transitionend", function() { 
            document.querySelectorAll("canvas").forEach(function(c2) {
                c2.addEventListener("click", toFullscreen);
            });
            c.remove();
        });
    }
}

function update(c, x = 0, y = 0, btn = -1, z = 0) {
    rect = c.getBoundingClientRect();
    c.instance.exports.update(rect.width, rect.height, x, y, btn, z);
    save(c);
}

function click(event) {
    event.preventDefault();
    update(event.target, event.clientX, event.clientY, event.button);
    return false;
}

function touchstart(event) {
    c = event.target;
    event.preventDefault();
    if(!c.timer) {
        update(c, event.touches[0].clientX, event.touches[0].clientY, 0);
        c.timer = setTimeout(() => { 
            c.timer = null; 
            update(c, event.touches[0].clientX, event.touches[0].clientY, 2); 
            update(c, event.touches[0].clientX, event.touches[0].clientY, 1);
        }, 400);
    }
}

function touchend(event) {
    c = event.target;
    if(c.timer) {
        clearTimeout(c.timer);
        c.timer = null;
    }
}

function touchcancel(event) {
    c = event.target;
    if(c.timer) {
        clearTimeout(c.timer);
        c.timer = null;
    }
}

function wheel(event) {
    c = event.target;
    const rect = document.querySelector("body").getBoundingClientRect();
    if(event.ctrlKey) {
        event.preventDefault();
        update(c, event.clientX, event.clientY, 3, event.wheelDeltaY);
    } else {
        update(c, event.wheelDeltaX, event.wheelDeltaY, 4);
    }
    resize(c);
}

function undo() {
    var c = document.getElementById("fullscreen");
    if(c) {
        c.instance.exports.undo();
        update(c);
    }
}

function redo() {
    var c = document.getElementById("fullscreen");
    if(c) {
        c.instance.exports.redo();
        update(c);
    }
}

function resize(c) {
    rect = c.getBoundingClientRect();
    c.width = rect.width;
    c.height = rect.height;
    if(c.instance) update(c);
}

const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        resize(entry.target);
    }
});

function toFullscreen(event) {
    if(!module) return;
    var t = event.target;
    var c = t.cloneNode(true);
    c.target = t;
    document.querySelector('body').appendChild(c);
    rect = t.getBoundingClientRect();
    c.style.left = rect.left + "px";
    c.style.top = rect.top + "px";
    c.id = "fullscreen";
    var x = c.clientHeight;
    init(module, c);
    c.style.zIndex = 1;
    c.style.position = "fixed";
    c.style.left = "0px";
    c.style.top = "0px";
    c.style.width = "100%";
    c.style.height = "100%";

    c.addEventListener('wheel', wheel);
    c.addEventListener("click", click);
    c.addEventListener("contextmenu", ignore);
    c.addEventListener("auxclick", click);
    c.addEventListener("touchstart", touchstart, false);
    c.addEventListener("touchend", touchend, false);
    c.addEventListener("touchcancel", touchcancel, false);
    c.addEventListener("transitionend", function thistransition() { 
        c.style.border = "0";
        showControls();
        c.removeEventListener("transitionend", thistransition);
    });
    document.querySelectorAll("canvas").forEach(function(c2) {
        if(c != c2) c2.removeEventListener("click", toFullscreen);
    });
    resizeObserver.observe(c);
    document.body.style.overflow = 'hidden';
}

document.onkeydown = function(event) {
    if(event.key == "Escape") close();
    if(event.key == "y" || event.key == "z") undo();
};


function init(mod, c) {
    const ctx = c.getContext('2d');

    function clear(r, g, b) {
        ctx.fillStyle = "rgb(" + r + ", " + g + ", " + b + ")"
        ctx.fillRect(0, 0, c.width, c.height);
    }

    function draw_line(x0, y0, x1, y1, thickness) {
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();    
    }


    function draw_dot(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, 2*Math.PI);
        ctx.fill();    
    }

    function draw_char(x, y, c, s) {
        ctx.font = 20*s + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillText(String.fromCharCode(c), x, y - 7*s);
    }

    function debug_break() { debugger; }
    WebAssembly.instantiate(mod, { env: { clear, draw_line, draw_char, draw_dot, debug_break } }).then(instance => {
        const puzzle_text = c.innerHTML;
        const puzzle_text_array = new Uint8Array(
            instance.exports.memory.buffer,
            instance.exports.get_value(VALUE_KIND_PUZZLE_TEXT),
            puzzle_text.length
        );
        puzzle_text_array.set(encoder.encode(puzzle_text));
        instance.exports.set_value(VALUE_KIND_PUZZLE_TEXT_LENGTH, puzzle_text_array.length);
        instance.exports.init();
        c.instance = instance;
        const save_data = localStorage.getItem(puzzle_text);
        if(save_data) {
            const save_object = JSON.parse(save_data);
            if(instance.exports.get_value(VALUE_KIND_BONDS_COUNT) != save_object.bonds_count) {
                debugger;
            }
            instance.exports.set_value(VALUE_KIND_REWIND_STACK_SIZE, save_object.rewind_stack_size);
            instance.exports.set_value(VALUE_KIND_REWIND_STACK_SIZE_MAX, save_object.rewind_stack_size_max);
            const rewind_stack = new Uint8Array(
                instance.exports.memory.buffer,
                instance.exports.get_value(VALUE_KIND_REWIND_STACK),
                save_object.rewind_stack_size_max * 4
            );
            rewind_stack.set(Object.values(save_object.rewind_stack));
            const bond_solutions = new Uint8Array(
                instance.exports.memory.buffer,
                instance.exports.get_value(VALUE_KIND_BOND_SOLUTIONS),
                save_object.bonds_count
            );
            bond_solutions.set(Object.values(save_object.bond_solutions));
        }
        
        resize(c);
    });
}

var module;
WebAssembly.compileStreaming(fetch("molekularis.wasm")).then(mod => {
    module = mod;
    for(const c of document.querySelectorAll("canvas")) {
        c.addEventListener("click", toFullscreen);
        init(mod, c);
    }
});

document.getElementById("closeBtn").addEventListener("click", close);
document.getElementById("undoBtn").addEventListener("click", undo);
document.getElementById("redoBtn").addEventListener("click", redo);
