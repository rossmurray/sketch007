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
        const config = {
            screenMargin: screenMargin,
            backgroundColor: backgroundColor,
            buttonPadding: buttonPadding,
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

    function createGame(gameConfig) {
        const gameState = {
            playerMoveMode: 0,
            modSetting: 3,
            moveCount: 0,
            boards: [],
        };
        const board1 = makeRange(25).map(x => 0);
        const board2 = makeRange(25).map(x => 0);
        const board3 = makeRange(25).map(x => 0);
        const boards = [board1, board2, board3];
        gameState.boards = boards;
        function makeNeighborList(centerNode) {
            if(!(centerNode >= 0 && centerNode < 25) || centerNode != Math.floor(centerNode)) {
                throw "invalid centerNode value: [" + centerNode + "]";
            }
            const result = [centerNode];
            if(centerNode % 5 != 0) result.push(centerNode-1);
            if(centerNode % 5 != 4) result.push(centerNode+1);
            if(centerNode > 4) result.push(centerNode-5);
            if(centerNode < 20) result.push(centerNode+5);
            return result;
        }
        const neighborsTable = makeRange(25).map(x => makeNeighborList(x));
        const rolls = Math.floor(Math.random() * gameState.modSetting * 4) + 4 * gameState.modSetting
        for(let i = 0; i < rolls; i++) {
            const button = Math.floor(Math.random() * 25);
            const boardChoice = Math.floor(Math.random() * 3);
            pressButton(button, boards[boardChoice], neighborsTable, gameState);
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
        function pressButton(buttonNumber, board, neighborsTable, gameState) {
            const neighbors = neighborsTable[buttonNumber];
            for(let neighbor of neighbors) {
                board[neighbor] = (board[neighbor] + 1) % gameState.modSetting;
            }
            gameState.moveCount += 1;
        }
        function increaseMoveMode(amount) {
            gameState.playerMoveMode += amount;
            gameState.playerMoveMode = gameState.playerMoveMode % 3;
        }
        gameState.getBoardColors = () => boardsToColors(boards, gameState.modSetting);
        gameState.pressButton = buttonNumber => pressButton(buttonNumber, boards[gameState.playerMoveMode], neighborsTable, gameState);
        gameState.increaseMoveMode = increaseMoveMode;
        return gameState;
    }

    function makeButtons(config, boardRect, renderer, game) {
        const sprites = makeRange(25).map(i => {
            const xIndex = i % 5;
            const yIndex = Math.floor(i / 5);
            const minDimension = boardRect.width < boardRect.height ? boardRect.width : boardRect.height;
            const maxDimension = boardRect.width > boardRect.height ? boardRect.width : boardRect.height;
            const totalPadding = config.buttonPadding * minDimension;
            const paddingBetweenButtons = Math.floor(totalPadding / 4); //none on the outside.
            const buttonWidth = Math.floor((minDimension - totalPadding) / 5);
            const actualUsedSpace = buttonWidth * 5 + paddingBetweenButtons * 4;
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
        //note: this prevents ticker starting when a listener is added. not when the application starts.
        app.ticker.autoStart = false;
        app.ticker.stop();

        let boardRect = makeBoardRectangle(config.screenMargin, app.screen);
        const game = createGame();
        const buttons = makeButtons(config, boardRect, app.renderer, game);
        const currentColors = game.getBoardColors();
        const background = makeBackground(config, app.screen, app.renderer);
        //app.stage.addChild(background);
        for(let i = 0; i < buttons.length; i++) {
            const b = buttons[i];
            b.on('pointerdown', () => buttonClicked(i, buttons, game));
            b.tint = currentColors[i];
            app.stage.addChild(b);
        }
        const rightKey = makeKeyHandler(39);
        const leftKey = makeKeyHandler(37);
        rightKey.onUp = () => game.increaseMoveMode(1);
        leftKey.onUp = () => game.increaseMoveMode(2);
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