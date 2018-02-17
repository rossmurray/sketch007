const difficulty = {easy: 0, medium: 1, hard: 2};

var fnMain = (function() {
    function render(deltaMs, state) {
        requestAnimationFrame(function(timestamp){
            render(timestamp, state);
        });
        state.app.renderer.render(state.app.stage);
        state.recorder.capture(state.app.renderer.view);
    }

    function getConfig() {
        const backgroundColor = colorStringToNumber('#eeeeee');
        const buttonPadding = 0.075; //total space allocated to padding, not per-button.
        const screenMargin = 0.02;
        const modSetting = 2;
        const boardSideLength = 4;
        const isTorus = false;
        const randomDifficulty = difficulty.medium;
        const autoIncrementMove = true;
        const redBoardOnly = false;
        const config = {
            screenMargin: screenMargin,
            backgroundColor: backgroundColor,
            buttonPadding: buttonPadding,
            modSetting: modSetting,
            boardSideLength: boardSideLength,
            randomDifficulty: randomDifficulty,
            isTorus: isTorus,
            autoIncrementMove: redBoardOnly ? false : autoIncrementMove,
            redBoardOnly: redBoardOnly,
        };
        return config;
    }

    function makeBoardRectangle(margin, viewRectangle) {
        const xmargin = margin * viewRectangle.width;
        const ymargin = margin * viewRectangle.height;
        const finalMargin = Math.floor(xmargin + ymargin);
        const boardWidth = viewRectangle.width - finalMargin;
        const boardHeight = viewRectangle.height - finalMargin;
        const x = Math.floor((viewRectangle.width - boardWidth) / 2);
        const y = Math.floor((viewRectangle.height - boardHeight) / 2);
        return new PIXI.Rectangle(x, y, boardWidth, boardHeight);
    }

    function makeRange(n) {
        var arr = Array.apply(null, Array(n));
        return arr.map(function (x, i) { return i });
    };

    function colorStringToNumber(name) {
        const rgbArray = chroma(name).rgb();
        let result = Math.floor(rgbArray[2])
            | Math.floor(rgbArray[1]) << 8
            | Math.floor(rgbArray[0]) << 16;
        return result;
    }

    function colorNumberToHexString(number) {
        return chroma(number).hex();
    }

    function chromaToNumber(chrom) {
        const rgbArray = chrom.rgb();
        let result = Math.floor(rgbArray[2])
            | Math.floor(rgbArray[1]) << 8
            | Math.floor(rgbArray[0]) << 16;
        return result;
    }

    function portion(i, size) {
        return i / ((size -1) || 1);
    }

    function randomIntInclusive(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function weightedChoice(values, weights) {
        let mass = 1;
        for(let i = 0; i < values.length; i++) {
            const weight = weights[i];
            const value = values[i];
            const flip = Math.random() < (weight / mass);
            if(flip) return value;
            mass -= weight;
        }
        console.log("weighted choice exceeded probability mass.");
        console.log(weights);
        return values[values.length - 1];
    }

    function makeKeyHandler(keyCode) {
        const state = {
            code: keyCode,
            isPressed: false,
            onDown: undefined,
            onUp: undefined,
        };
        function keyUp(event, state) {
            if(event.keyCode == state.code) {
                if(state.isPressed && state.onUp) {
                    state.onUp();
                }
                state.isPressed = false;
                event.preventDefault();
            }
        }
        function keyDown(event, state) {
            if(event.keyCode == state.code) {
                if(!state.isPressed && state.onDown) {
                    state.onDown();
                }
                state.isPressed = true;
                event.preventDefault();
            }
        }
        window.addEventListener('keyup', e => keyUp(e, state), false);
        window.addEventListener('keydown', e => keyDown(e, state), false);
        return state;
    }

    function makeBackground(config, screenRect, renderer) {
        const canvasElement = document.createElement('canvas');
        canvasElement.width = screenRect.width;
        canvasElement.height = screenRect.height;
        const context = canvasElement.getContext('2d');
        context.fillStyle = config.backgroundColor;
        context.fillRect(0, 0, screenRect.width, screenRect.height);
        const texture = PIXI.Texture.fromCanvas(canvasElement);
        const sprite = new PIXI.Sprite(texture);
        return sprite;
    }

    function mapSprite(obj, renderer) {
        const width = obj.width;
        const height = obj.height;
        const gfx = new PIXI.Graphics();
        gfx.width = width;
        gfx.height = height;
        const color = colorStringToNumber(obj.color);
        gfx.beginFill(color);
        gfx.drawRect(0, 0, width, height);
        gfx.endFill();
        const texture = PIXI.RenderTexture.create(width, height);
        renderer.render(gfx, texture);
        const sprite = new PIXI.Sprite(texture);
        sprite.x = obj.x;
        sprite.y = obj.y;
        return sprite;
    }

    function makeNeighborList(centerNode, config) {
        const totalButtons = config.boardSideLength * config.boardSideLength;
        const sideLength = config.boardSideLength;
        if(!(centerNode >= 0 && centerNode < totalButtons) || centerNode != Math.floor(centerNode)) {
            throw "invalid centerNode value: [" + centerNode + "]";
        }
        let result = [centerNode];
        const torusExtras = [];
        const notTop = centerNode > sideLength - 1;
        const notLeft = centerNode % sideLength != 0;
        const notRight = centerNode % sideLength != sideLength - 1;
        const notBottom = centerNode < totalButtons - sideLength;
        if(notLeft) {
            result.push(centerNode - 1);
        }
        else {
            torusExtras.push(centerNode + sideLength - 1);
        }
        if(notRight) {
            result.push(centerNode + 1);
        }
        else {
            torusExtras.push(centerNode - sideLength + 1);
        }
        if(notTop) {
            result.push(centerNode - sideLength);
        }
        else {
            torusExtras.push(centerNode + totalButtons - sideLength);
        }
        if(notBottom) {
            result.push(centerNode + sideLength);
        }
        else {
            torusExtras.push(centerNode - totalButtons + sideLength);
        }
        if(config.isTorus == true) {
            result = result.concat(torusExtras);
        }
        return result;
    }

    function triggerChange(state) {
        if(state.onChange != undefined) {
            state.onChange(state);
        }
    }

    function zeroBoards(boards) {
        for(let i = 0; i < boards.length; i++) {
            const board = boards[i];
            for(let j = 0; j < board.length; j++) {
                board[j] = 0;
            }
        }
    }

    function randomizeBoard(gameState, config, neighborsTable) {
        zeroBoards(gameState.boards);
        const totalButtons = gameState.boards[0].length;
        const difficultyRanges = [0.12, 0.25, 0.4, 0.6].map(x => Math.floor(x * totalButtons));
        const buttonPressCount = config.randomDifficulty == difficulty.easy
            ? randomIntInclusive(difficultyRanges[0] + 1, difficultyRanges[1])
            : config.randomDifficulty == difficulty.medium
            ? randomIntInclusive(difficultyRanges[1] + 1, difficultyRanges[2])
            : randomIntInclusive(difficultyRanges[2] + 1, difficultyRanges[3]);
        const pressesPerButton = [];
        const pressCountOptions = makeRange(config.modSetting - 1).map(x => x + 1)
        for(let i = 0; i < buttonPressCount; i++) {
            pressesPerButton[i] = pressCountOptions[randomIntInclusive(0, pressCountOptions.length - 1)];
        }
        //if we press buttons N times, where N is a multiple of 3, then the player will always start on red.
        const remainder = pressesPerButton.reduce((a,b) => a + b) % 3;
        pressesPerButton[0] = (pressesPerButton[0] + (3 - remainder)) % 3;
        const buttonBag = _.shuffle(makeRange(totalButtons)).slice(0, pressesPerButton.length);
        for(let i = 0; i < buttonBag.length; i++) {
            const cell = buttonBag[i];
            const presses = pressesPerButton[i];
            for(let j = 0; j < presses; j++) {
                pressButton(cell, config, neighborsTable, gameState);
            }
        }
        if(gameState.playerMoveMode != 0) {
            throw "board randomization failed. playerMoveMode should be 0 at end. instead is: " + gameState.playerMoveMode;
        }
        gameState.currentPuzzle = gameState.boards.slice();
    }

    function boardsToColors(boards, modSetting) {
        const toChannel = x => x / (modSetting - 1) * 255;
        const colors = boards[0].map((x,i) => {
            const r = toChannel(x);
            const g = toChannel(boards[1][i]);
            const b = toChannel(boards[2][i]);
            return chromaToNumber(chroma(r,g,b));
        });
        return colors;
    }

    function pressButton(buttonNumber, config, neighborsTable, gameState) {
        const boards = gameState.boards;
        const board = config.redBoardOnly ? boards[0] : boards[gameState.playerMoveMode];
        const neighbors = neighborsTable[buttonNumber];
        for(let neighbor of neighbors) {
            board[neighbor] = (board[neighbor] + 1) % gameState.modSetting;
        }
        gameState.moveCount += 1;
        if(config.autoIncrementMove == true) {
            increaseMoveMode(1, gameState);
        }
    }

    function increaseMoveMode(amount, gameState) {
        gameState.playerMoveMode += amount;
        gameState.playerMoveMode = gameState.playerMoveMode % 3;
    }

    function resetPuzzle() {
        gameState.moveCount = 0;
        gameState.boards = gameState.currentPuzzle.slice();
        gameState.playerMoveMode = 0;
    }

    function createGame(config) {
        const gameState = {
            playerMoveMode: 0,
            modSetting: config.modSetting,
            moveCount: 0,
            boards: [],
            onChange: undefined,
            currentPuzzle: [],
        };
        const totalButtons = config.boardSideLength * config.boardSideLength;
        const sideLength = config.boardSideLength;
        const board1 = makeRange(totalButtons).map(x => 0);
        const board2 = makeRange(totalButtons).map(x => 0);
        const board3 = makeRange(totalButtons).map(x => 0);
        gameState.boards = [board1, board2, board3];
        const neighborsTable = makeRange(totalButtons).map(x => makeNeighborList(x, config));

        gameState.randomizeBoard = () => {
            randomizeBoard(gameState, config, neighborsTable);
            triggerChange(gameState);
        };
        gameState.getBoardColors = () => boardsToColors(gameState.boards, gameState.modSetting);
        gameState.pressButton = buttonNumber => {
            pressButton(buttonNumber, config, neighborsTable, gameState);
            triggerChange(gameState);
        };
        gameState.increaseMoveMode = x => increaseMoveMode(x, gameState);
        gameState.resetPuzzle = () => {}; //todo
        return gameState;
    }

    function makeButtons(config, boardRect, renderer, game) {
        const totalButtons = config.boardSideLength * config.boardSideLength;
        const sideLength = config.boardSideLength;
        const sprites = makeRange(totalButtons).map(i => {
            const xIndex = i % sideLength;
            const yIndex = Math.floor(i / sideLength);
            const minDimension = boardRect.width < boardRect.height ? boardRect.width : boardRect.height;
            const maxDimension = boardRect.width > boardRect.height ? boardRect.width : boardRect.height;
            const totalPadding = config.buttonPadding * minDimension;
            const paddingBetweenButtons = Math.floor(totalPadding / (sideLength - 1)); //none on the outside.
            const buttonWidth = Math.floor((minDimension - totalPadding) / sideLength);
            const actualUsedSpace = buttonWidth * sideLength + paddingBetweenButtons * (sideLength - 1);
            const xMargin = Math.floor((boardRect.width - actualUsedSpace) / 2);
            const yMargin = Math.floor((boardRect.height - actualUsedSpace) / 2);
            const obj = {
                width: buttonWidth,
                height: buttonWidth,
                color: 0xFFFFFF,
                x: boardRect.x + xMargin + xIndex * buttonWidth + xIndex * paddingBetweenButtons,
                y: boardRect.y + yMargin + yIndex * buttonWidth + yIndex * paddingBetweenButtons,
            };
            const sprite = mapSprite(obj, renderer);
            sprite.tint = 0xFFFFFF;
            sprite.interactive = true;
            sprite.buttonMode = true;
            return sprite;
        });
        return sprites;
    }

    function buttonClicked(buttonIndex, sprites, game) {
        game.pressButton(buttonIndex);
        const newColors = game.getBoardColors();
        for(let i = 0; i < newColors.length; i++) {
            if(sprites[i]) {
                sprites[i].tint = newColors[i];
            }
        }
    }

    function redrawBoard(sprites, game) {
        const newColors = game.getBoardColors();
        for(let i = 0; i < newColors.length; i++) {
            if(sprites[i]) {
                sprites[i].tint = newColors[i];
            }
        }
    }

    return (function() {
        const config = getConfig();
        const mainel = document.getElementById("main");
        let app = new PIXI.Application({
            width: mainel.width,
            height: mainel.height,
            view: mainel,
            autoResize: true,
            antialias: true,
            autoStart: false,
        });
        app.renderer.backgroundColor = config.backgroundColor;
        app.renderer.render(app.stage);
        app.ticker.autoStart = false;
        app.ticker.stop();

        let boardRect = makeBoardRectangle(config.screenMargin, app.screen);
        const game = createGame(config);
        game.randomizeBoard();
        const buttons = makeButtons(config, boardRect, app.renderer, game);
        const currentColors = game.getBoardColors();
        const background = makeBackground(config, app.screen, app.renderer);
        //app.stage.addChild(background);
        for(let i = 0; i < buttons.length; i++) {
            const b = buttons[i];
            b.on('pointerdown', () => game.pressButton(i));
            b.tint = currentColors[i];
            app.stage.addChild(b);
        }
        game.onChange = newstate => redrawBoard(buttons, game);
        const rightKey = makeKeyHandler(39);
        const leftKey = makeKeyHandler(37);
        rightKey.onUp = () => { if(!config.autoIncrementMove) game.increaseMoveMode(1); };
        leftKey.onUp = () => { if(!config.autoIncrementMove) game.increaseMoveMode(2); };
        const animation = {};
        let state = {
            config: config,
            app: app,
            boardRect: boardRect,
            animation: animation,
            game: game,
            buttons: buttons,
            background: background,
        };
        return function(recorder) {
            state.recorder = recorder || {capture: function(){}};
            app.start();
            render(Date.now(), state);
            //animation.play();
            return state;
        }
    })();
})();