'use strict';

const WORKSPACE_WIDTH = innerWidth / 100 * 82;
const WORKSPACE_HEIGHT = innerHeight / 100 * 95;
const WORKSPACE_LEFT = innerWidth / 100 * 3;
const WORKSPACE_TOP = innerHeight / 100 * 5;
const SUPPORTED_FILE_EXTENSIONS = [
    'jpg',
    'jpeg',
    'jpe',
    'jif',
    'jfif',
    'jfi',
    'png'
];
const CURSORS = {
    select_layer: 'pointer',
    select_rectangle: 'default',
    free_select: 'default',
    move: 'move',
    fill: 'default',
    draw: 'default'
}
let fullImage;
let scrollPosition;
let selection;
let ctxSelection;
let layers;
let selectedArea = [];
let selectedLayer = null;
let tool = 'select_layer';
let selectedColor = '#ffffff';
let brushDiameter = 10;
let layerCounter = 0;

window.addEventListener('load', init);

function init() {
    selection = document.getElementById('selection');
    layers = document.getElementById('layers');
    ctxSelection = selection.getContext('2d');

    selection.width = WORKSPACE_WIDTH;
    selection.height = WORKSPACE_HEIGHT;

    // TODO: resize

    initFirebase();

    scrollPosition = {
        x: layers.scrollLeft,
        y: layers.scrollTop
    };

    for (let element of document.getElementsByClassName('tool')) {
        element.addEventListener('click', () => {
            tool = element.id;
            layers.style.cursor = CURSORS[element.id];
        });
    }

    document.getElementById('back').addEventListener('click', () => {
        document.getElementById('load').style.opacity = 1;

        setTimeout(() => {
            window.open('../', '_self');
        }, 500);
    });
    document.getElementById('filename').addEventListener('change', uploadImage);
    document.getElementById('createImage').addEventListener('click', createImage);
    document.getElementById('uploadImage').addEventListener('click', uploadImageToDatabase);
    layers.addEventListener('mousedown', mouseDown);
    layers.addEventListener('scroll', () => {
        for (let coordinates of selectedArea) {
            coordinates.x -= layers.scrollLeft - scrollPosition.x;
            coordinates.y -= layers.scrollTop - scrollPosition.y;
        }

        scrollPosition = {
            x: layers.scrollLeft,
            y: layers.scrollTop
        };

        drawSelectedArea();
    });
    window.addEventListener('mousemove', (event) => {
        event.preventDefault();
    });

    window.removeEventListener('load', init);

    document.getElementById('load').style.opacity = 0;
}

function mouseDown(event) {
    if (event.button === 0) {
        switch (tool) {
            case 'select_layer':
                selectLayer(event);
                break;

            case 'select_rectangle':
                selectRectangle(event);
                break;

            case 'free_select':
                freeSelect(event);
                break;
            
            case 'move':
                move(event);
                break;

            case 'fill':
                fill(event);
                break;

            case 'draw':
                draw(event);
                break;
        }
    }
}


function selectLayer(event) {
    let maxZIndex = '-1';

    for (let layer of layers.childNodes) {
        if (event.clientX >= parseFloat(layer.style.left) + WORKSPACE_LEFT
        && event.clientX <= parseFloat(layer.style.left) + WORKSPACE_LEFT + layer.width
        && event.clientY >= parseFloat(layer.style.top) + WORKSPACE_TOP
        && event.clientY <= parseFloat(layer.style.top) + WORKSPACE_TOP + layer.height
        && parseFloat(maxZIndex) < parseFloat(layer.style.zIndex)) {
            maxZIndex = layer.style.zIndex;
        }
    }

    for (let layer of layers.childNodes) {
        if (maxZIndex === layer.style.zIndex) {
            let layerLeft = parseFloat(layer.style.left);
            let layerTop = parseFloat(layer.style.top);

            selectedArea = [
                {
                    x: layerLeft,
                    y: layerTop
                }, {
                    x: layerLeft + layer.width,
                    y: layerTop
                }, {
                    x: layerLeft + layer.width,
                    y: layerTop + layer.height
                }, {
                    x: layerLeft,
                    y: layerTop + layer.height
                }
            ];
            drawSelectedArea();

            selectedLayer = layer;
        }
    }
}

function selectRectangle(event) {
    let drawSelection = (eventMouseMove) => {
        let x;
        let y;

        if (eventMouseMove.clientX < WORKSPACE_LEFT) {
            x = 0;
        } else if (eventMouseMove.clientX > WORKSPACE_LEFT + WORKSPACE_WIDTH) {
            x = WORKSPACE_WIDTH;
        } else {
            x = eventMouseMove.clientX - WORKSPACE_LEFT;
        }
    
        if (eventMouseMove.clientY < WORKSPACE_TOP) {
            y = 0;
        } else if (eventMouseMove.clientY > WORKSPACE_TOP + WORKSPACE_HEIGHT) {
            y = WORKSPACE_HEIGHT;
        } else {
            y = eventMouseMove.clientY - WORKSPACE_TOP;
        }

        selectedArea = [
            {
                x: event.clientX - WORKSPACE_LEFT,
                y: event.clientY - WORKSPACE_TOP
            }, {
                x,
                y: event.clientY - WORKSPACE_TOP
            }, {
                x,
                y
            }, {
                x: event.clientX - WORKSPACE_LEFT,
                y
            }
        ];
        drawSelectedArea();
    };

    let removeMouseMove = () => {
        window.removeEventListener('mousemove', drawSelection);
        window.removeEventListener('mouseup', removeMouseMove);
    };

    window.addEventListener('mousemove', drawSelection);
    window.addEventListener('mouseup', removeMouseMove);
}

function freeSelect(event) {
    let addCoordinates = (event) => {
        let x;
        let y;

        if (event.clientX < WORKSPACE_LEFT) {
            x = 0;
        } else if (event.clientX > WORKSPACE_LEFT + WORKSPACE_WIDTH) {
            x = WORKSPACE_WIDTH;
        } else {
            x = event.clientX - WORKSPACE_LEFT;
        }
    
        if (event.clientY < WORKSPACE_TOP) {
            y = 0;
        } else if (event.clientY > WORKSPACE_TOP + WORKSPACE_HEIGHT) {
            y = WORKSPACE_HEIGHT;
        } else {
            y = event.clientY - WORKSPACE_TOP;
        }

        selectedArea.push({x, y});
        ctxSelection.lineTo(x, y);

        ctxSelection.lineCap = 'butt';
        ctxSelection.lineJoin = 'butt';

        ctxSelection.lineWidth = 2.5;
        ctxSelection.strokeStyle = '#000000';
        ctxSelection.stroke();

        ctxSelection.lineWidth = 1.5;
        ctxSelection.strokeStyle = '#ffffff';
        ctxSelection.stroke();

        ctxSelection.lineWidth = 1;
    };

    let removeMouseMove = () => {
        drawSelectedArea();

        window.removeEventListener('mousemove', addCoordinates);
        window.removeEventListener('mouseup', removeMouseMove);
    }

    selectedArea = [{
        x: event.clientX - WORKSPACE_LEFT,
        y: event.clientY - WORKSPACE_TOP
    }];

    ctxSelection.beginPath();
    ctxSelection.moveTo(selectedArea[0].x, selectedArea[0].y);

    window.addEventListener('mousemove', addCoordinates);
    window.addEventListener('mouseup', removeMouseMove);
}

function move(event) {
    if (selectedLayer
    && event.clientX >= parseFloat(selectedLayer.style.left) + WORKSPACE_LEFT
    && event.clientX <= parseFloat(selectedLayer.style.left) + WORKSPACE_LEFT + selectedLayer.width
    && event.clientY >= parseFloat(selectedLayer.style.top) + WORKSPACE_TOP
    && event.clientY <= parseFloat(selectedLayer.style.top) + WORKSPACE_TOP + selectedLayer.height) {
        let originalPosition = {
            x: event.clientX,
            y: event.clientY
        };

        let moveLayer = (event) => {
            let newLeft = parseFloat(selectedLayer.style.left) + event.clientX - originalPosition.x;
            let newTop = parseFloat(selectedLayer.style.top) + event.clientY - originalPosition.y;
            let layerLeft = parseFloat(selectedLayer.style.left);
            let layerTop = parseFloat(selectedLayer.style.top);

            if (newLeft < 0) {
                selectedLayer.style.left = '0px';

                if (event.clientX >= layerLeft + WORKSPACE_LEFT) {
                    originalPosition.x = event.clientX;
                }
            } else {
                selectedLayer.style.left = newLeft + 'px';
                originalPosition.x = event.clientX;
            }
            
            if (newTop < 0) {
                selectedLayer.style.top = '0px';

                if (event.clientY >= layerTop + WORKSPACE_TOP) {
                    originalPosition.y = event.clientY;
                }
            } else {
                selectedLayer.style.top = newTop + 'px';
                originalPosition.y = event.clientY;
            }

            layerLeft = parseFloat(selectedLayer.style.left);
            layerTop = parseFloat(selectedLayer.style.top);

            selectedArea = [
                {
                    x: layerLeft - layers.scrollLeft,
                    y: layerTop - layers.scrollTop
                }, {
                    x: layerLeft + selectedLayer.width - layers.scrollLeft,
                    y: layerTop - layers.scrollTop
                }, {
                    x: layerLeft + selectedLayer.width - layers.scrollLeft,
                    y: layerTop + selectedLayer.height - layers.scrollTop
                }, {
                    x: layerLeft - layers.scrollLeft,
                    y: layerTop + selectedLayer.height - layers.scrollTop
                }
            ];
            drawSelectedArea();
        };

        let removeMouseMove = () => {
            window.removeEventListener('mousemove', moveLayer);
            window.removeEventListener('mouseup', removeMouseMove);
        }


        window.addEventListener('mousemove', moveLayer);
        window.addEventListener('mouseup', removeMouseMove);
    }
}

function fill(event) {
    if (selectedLayer) {
        let maxZIndex = '-1';

        for (let layer of layers.childNodes) {
            if (event.clientX >= parseFloat(layer.style.left) + WORKSPACE_LEFT
            && event.clientX <= parseFloat(layer.style.left) + WORKSPACE_LEFT + layer.width
            && event.clientY >= parseFloat(layer.style.top) + WORKSPACE_TOP
            && event.clientY <= parseFloat(layer.style.top) + WORKSPACE_TOP + layer.height
            && parseFloat(maxZIndex) < parseFloat(layer.style.zIndex)) {
                maxZIndex = layer.style.zIndex;
            }
        }

        if (selectedLayer.style.zIndex === maxZIndex) {
            let ctx = selectedLayer.getContext('2d');
            let left = parseFloat(selectedLayer.style.left);
            let top = parseFloat(selectedLayer.style.top);
            
            ctx.beginPath();
            ctx.moveTo(selectedArea[0].x - left, selectedArea[0].y - top);

            for (let coordinates of selectedArea) {
                ctx.lineTo(coordinates.x - left, coordinates.y - top);
            }

            ctx.lineTo(selectedArea[0].x - left, selectedArea[0].y - top);
            
            ctx.fillStyle = selectedColor;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'butt';
            ctx.fill();
        }
    }
}

function draw(event) {
    if (selectedLayer) {
        let maxZIndex = '-1';

        for (let layer of layers.childNodes) {
            if (event.clientX >= parseFloat(layer.style.left) + WORKSPACE_LEFT
            && event.clientX <= parseFloat(layer.style.left) + WORKSPACE_LEFT + layer.width
            && event.clientY >= parseFloat(layer.style.top) + WORKSPACE_TOP
            && event.clientY <= parseFloat(layer.style.top) + WORKSPACE_TOP + layer.height
            && parseFloat(maxZIndex) < parseFloat(layer.style.zIndex)) {
                maxZIndex = layer.style.zIndex;
            }
        }

        if (selectedLayer.style.zIndex === maxZIndex) {
            let ctx = selectedLayer.getContext('2d');
            ctx.beginPath();
            ctx.moveTo(event.clientX - parseFloat(selectedLayer.style.left) - WORKSPACE_LEFT,
                       event.clientY - parseFloat(selectedLayer.style.top) - WORKSPACE_TOP);
            ctx.lineTo(event.clientX - parseFloat(selectedLayer.style.left) - WORKSPACE_LEFT,
                       event.clientY - parseFloat(selectedLayer.style.top) - WORKSPACE_TOP);
            ctx.strokeStyle = selectedColor;
            ctx.lineWidth = brushDiameter;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            let drawOnLayer = (event) => {
                ctx.lineTo(event.clientX - parseFloat(selectedLayer.style.left) - WORKSPACE_LEFT,
                           event.clientY - parseFloat(selectedLayer.style.top) - WORKSPACE_TOP);
                ctx.stroke();
            }

            let removeMouseMove = () => {
                window.removeEventListener('mousemove', drawOnLayer);
                window.removeEventListener('mouseup', removeMouseMove);
            }

            window.addEventListener('mousemove', drawOnLayer);
            window.addEventListener('mouseup', removeMouseMove);
        }
    }
}

function createImage() {
    let download = document.getElementById('download');
    let sortedLayers = sortByZIndex(layers.childNodes);
    let left = parseFloat(layers.childNodes[0].style.left);
    let top = parseFloat(layers.childNodes[0].style.top);
    let right = parseFloat(layers.childNodes[0].style.left) + layers.childNodes[0].width;
    let bottom = parseFloat(layers.childNodes[0].style.top) + layers.childNodes[0].height;
    let ctx;
    let imgData;

    fullImage = document.createElement('canvas');
    ctx = fullImage.getContext('2d');

    for (let layer of sortedLayers) {
        if (parseFloat(layer.style.left) < left) {
            left = parseFloat(layer.style.left);
        }

        if (parseFloat(layer.style.top) < top) {
            top = parseFloat(layer.style.top);
        }

        if (parseFloat(layer.style.left) + layer.width > right) {
            right = parseFloat(layer.style.left) + layer.width;
        }

        if (parseFloat(layer.style.top) + layer.height > bottom) {
            bottom = parseFloat(layer.style.top) + layer.height;
        }
    }

    fullImage.width = right - left;
    fullImage.height = bottom - top;

    imgData = ctx.getImageData(0, 0, fullImage.width, fullImage.height);

    for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = 255;
        imgData.data[i + 1] = 255;
        imgData.data[i + 2] = 255;
        imgData.data[i + 3] = 0;
    }

    for (let layer of sortedLayers) {
        let data = layer.getContext('2d').getImageData(0, 0, layer.width, layer.height).data;

        for (let i = 0; i < layer.height; i++) {
            let canvasIndex = (fullImage.width * 4) * (parseInt(layer.style.top) - top + i) + (parseInt(layer.style.left) - left) * 4;
            let layerIndex = layer.width * 4 * i;

            for (let j = 0; j < layer.width * 4; j += 4) {
                let alphaA = data[layerIndex + j + 3];
                let alphaB = imgData.data[canvasIndex + j + 3];
                let alphaC = alphaA + (255 - alphaA) * alphaB;

                imgData.data[canvasIndex + j] = (alphaA * data[layerIndex + j] + (255 - alphaA) * alphaB * imgData.data[canvasIndex + j]) / alphaC;
                imgData.data[canvasIndex + j + 1] = (alphaA * data[layerIndex + j + 1] + (255 - alphaA) * alphaB * imgData.data[canvasIndex + j + 1]) / alphaC;
                imgData.data[canvasIndex + j + 2] = (alphaA * data[layerIndex + j + 2] + (255 - alphaA) * alphaB * imgData.data[canvasIndex + j + 2]) / alphaC;
                imgData.data[canvasIndex + j + 3] = alphaC;
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);

    fullImage.filename = 'image.png';

    download.href = fullImage.toDataURL('image/png');
    download.download = fullImage.filename;
}

function uploadImageToDatabase() {
    let currentDate = new Date();
    let filename = `${fullImage.filename}-${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth() + 1}-${currentDate.getUTCDate()}-${currentDate.getUTCHours()}-${currentDate.getUTCMinutes()}-${currentDate.getUTCSeconds()}`;
    let path = `images/${firebase.auth().currentUser.uid}`;

    fullImage.toBlob((blob) => {
        firebase.storage().ref().child(`${path}/${filename}`).put(blob).then(() => {
            console.log('uploaded');
            // TODO: success message
        }).catch((error) => {
            console.log(error.message);
            // TODO: error handling
        });
    });

    firebase.database().ref(path).once('value').then((snapshot) => {
        let data = snapshot.val();

        if (data) {
            data.push(filename);
        } else {
            data = [filename];
        }

        firebase.database().ref(path).set(data).catch((error) => {
            console.log(error.message);
        });
    }).catch((error) => {
        console.log(error.message);
    });
}

function sortByZIndex(array) {
    let i = array.lenght - 1;
    let swapped;

    do {
        swapped = false;

        for (let j = 0; j < i; i++) {
            if (parseFloat(array[j].style.zIndex) > parseFloat(array[j + 1].style.zIndex)) {
                let help = array[j];
                array[j] = array[j + 1];
                array[j + 1] = help;

                swapped = true;
            }
        }

        i--;
    } while (swapped && i > 0);

    return array;
}

function drawSelectedArea() {
    if (selectedArea != []) {
        ctxSelection.beginPath();
        ctxSelection.clearRect(0, 0, selection.width, selection.height);
        ctxSelection.moveTo(selectedArea[0].x, selectedArea[0].y);
        ctxSelection.setLineDash([5, 5]);
        ctxSelection.strokeStyle = '#000000';

        for (let coordinates of selectedArea) {
            ctxSelection.lineTo(coordinates.x, coordinates.y);
        }

        ctxSelection.lineTo(selectedArea[0].x, selectedArea[0].y);
        ctxSelection.stroke();

        ctxSelection.beginPath();
        ctxSelection.moveTo(selectedArea[0].x, selectedArea[0].y);
        ctxSelection.setLineDash([0, 5, 5, 0]);
        ctxSelection.strokeStyle = '#ffffff';

        for (let coordinates of selectedArea) {
            ctxSelection.lineTo(coordinates.x, coordinates.y);
        }

        ctxSelection.lineTo(selectedArea[0].x, selectedArea[0].y);
        ctxSelection.lineCap = 'butt';
        ctxSelection.lineJoin = 'butt';
        ctxSelection.stroke();

        ctxSelection.setLineDash([]);
    }
}

function uploadImage(event) {
    let fileExtension = event.target.value.split('.').pop().toLowerCase();
    let fileIsSupported = false;

    for (let extension of SUPPORTED_FILE_EXTENSIONS) {
        if (fileExtension === extension) {
            fileIsSupported = true;
        }
    }

    if (fileIsSupported) {
        let img = new Image();

        img.src = URL.createObjectURL(event.target.files[0]);

        img.addEventListener('load', () => {
            createNewLayer(img.width, img.height).getContext('2d').drawImage(img, 0, 0);
        });
    } else if (fileExtension !== '') {
        alert('File format is not supported!');
        // TODO: remove alert
    }

    event.target.value = '';
}

function createNewLayer(width, height) {
    let layer = document.createElement('canvas');
    let zIndex = layers.childNodes.length;
    let layerDivs = document.getElementById('layerDivs');
    let layerDiv = document.createElement('div');

    layer.width = width;
    layer.height = height;
    layer.style.left = 0;
    layer.style.top = 0;
    layer.style.zIndex = zIndex;
    layer.id = `layer${layerCounter}`;

    selection.style.zIndex = zIndex + 1;
    document.getElementById('load').style.zIndex = zIndex + 2;
    
    layers.appendChild(layer);

    selectedArea = [
        {
            x: parseFloat(layer.style.left),
            y: parseFloat(layer.style.top)
        }, {
            x: parseFloat(layer.style.left) + layer.width,
            y: parseFloat(layer.style.top)
        }, {
            x: parseFloat(layer.style.left) + layer.width,
            y: parseFloat(layer.style.top) + layer.height
        }, {
            x: parseFloat(layer.style.left),
            y: parseFloat(layer.style.top) + layer.height
        }
    ];

    for (let div of layerDivs.childNodes) {
        div.style.backgroundColor = 'transparent';
    }

    layerDiv.textContent = `Layer #${layerCounter}`;
    layerDiv.id = `layer${layerCounter++}Div`;
    layerDiv.style.backgroundColor = 'white';

    layerDiv.addEventListener('click', (event) => {
        let newSelectedLayer = document.getElementById(layerDiv.id.replace('Div', ''));

        for (let div of layerDivs.childNodes) {
            div.style.backgroundColor = 'transparent';
        }

        event.target.style.backgroundColor = 'white';

        selectedLayer = newSelectedLayer;

        selectedArea = [
            {
                x: parseFloat(newSelectedLayer.style.left),
                y: parseFloat(newSelectedLayer.style.top)
            }, {
                x: parseFloat(newSelectedLayer.style.left) + newSelectedLayer.width,
                y: parseFloat(newSelectedLayer.style.top)
            }, {
                x: parseFloat(newSelectedLayer.style.left) + newSelectedLayer.width,
                y: parseFloat(newSelectedLayer.style.top) + newSelectedLayer.height
            }, {
                x: parseFloat(newSelectedLayer.style.left),
                y: parseFloat(newSelectedLayer.style.top) + newSelectedLayer.height
            }
        ];

        drawSelectedArea();
    });

    layerDivs.appendChild(layerDiv);

    drawSelectedArea();

    selectedLayer = layer;

    return layer;
}

function initFirebase() {
    firebase.initializeApp({
        apiKey: "AIzaSyAXDk6pM8wT-6AbE-gl7li9oRmelyfUsbM",
        authDomain: "webprojekt-bf181.firebaseapp.com",
        databaseURL: "https://webprojekt-bf181.firebaseio.com",
        projectId: "webprojekt-bf181",
        storageBucket: "webprojekt-bf181.appspot.com",
        messagingSenderId: "403269192570"
    });
}