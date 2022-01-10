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

function update(c, x = 0, y = 0, btn = -1) {
    rect = c.getBoundingClientRect();
    c.instance.exports.update(rect.width, rect.height, x, y, btn);
}

function click(event) {
    event.preventDefault();
    update(event.target, event.clientX, event.clientY, event.button);
    return false;
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
    init(module, c, t);
    c.style.zIndex = 1;
    c.style.position = "fixed";
    c.style.left = "0px";
    c.style.top = "0px";
    c.style.width = "100%";
    c.style.height = "100%";
    c.addEventListener("click", click);
    c.addEventListener("contextmenu", ignore);
    c.addEventListener("auxclick", click);
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


function init(mod, c, t = null) {
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

    WebAssembly.instantiate(mod, { env: { clear, draw_line, draw_char, draw_dot } }).then(instance => {
        var puzzle_text = c.innerHTML;
        if(!t) {
            const array = new Uint8Array(
                instance.exports.memory.buffer,
                instance.exports.puzzle_text,
                puzzle_text.length
            );
            const textEncoder = new TextEncoder();
            array.set(textEncoder.encode(puzzle_text));
            instance.exports.init(array.length);
        } else {
            const array_to = new Uint8Array(instance.exports.memory.buffer);
            const array_from = new Uint8Array(t.instance.exports.memory.buffer);
            array_to.set(array_from);
        }
        c.instance = instance;
        resize(c);
    });
}

var module;
WebAssembly.compileStreaming(fetch("./molekularis.wasm")).then(mod => {
    module = mod;
    for(const c of document.querySelectorAll("canvas")) {
        c.addEventListener("click", toFullscreen);
        init(mod, c);
    }
});

document.getElementById("closeBtn").addEventListener("click", close);
document.getElementById("undoBtn").addEventListener("click", undo);
document.getElementById("redoBtn").addEventListener("click", redo);
