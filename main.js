var fnMain = (function() {
    function render(deltaMs, state) {
        requestAnimationFrame(function(timestamp){
            render(timestamp, state);
        });
        state.app.renderer.render(state.app.stage);
        state.recorder.capture(state.app.renderer.view);
    }

    function getConfig() {
        const patternRepeats = 3;
        const twillWidth = 4;
        const mergePatternEnds = false;
        const showWarp = true;
        const showWeft = true;
        const enableMask = true;
        const stripeBlendMode = PIXI.BLEND_MODES.NORMAL;
        const backgroundColor = colorStringToNumber('black');
        const screenMargin = 0;
        const cyclePause = 0;
        const randomSequenceStrategy = {
            stripesMin: 4,
            stripesMax: 17,
            widthMin: 1,
            widthMax: 20,
        }
        const markovSequenceStrategy = {
            stripesMin: 6,
            stripesMax: 24,
        };
        const randomColorStrategy = {
            maxBaseColors: 5,
        }
        const strategies = {
            randomColor: randomColorStrategy,
            randomSequence: randomSequenceStrategy,
            markovSequence: markovSequenceStrategy,
        }
        const config = {
            stripeBlendMode: stripeBlendMode,
            patternRepeats: patternRepeats,
            cyclePause: cyclePause,
            screenMargin: screenMargin,
            backgroundColor: backgroundColor,
            twillWidth: twillWidth,
            mergePatternEnds: mergePatternEnds,
            showWarp: showWarp,
            showWeft: showWeft,
            enableMask: enableMask,
            strategies: strategies,
        };
        return config;
    }

    function makeBoardRectangle(margin, viewRectangle) {
        const xmargin = margin * viewRectangle.width;
        const ymargin = margin * viewRectangle.height;
        const boardWidth = viewRectangle.width - (xmargin * 2);
        const boardHeight = viewRectangle.height - (ymargin * 2);
        return new PIXI.Rectangle(xmargin, ymargin, boardWidth, boardHeight);
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

    function mapSprite(obj) {
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
        sprite.blendMode = config.stripeBlendMode;
        return sprite;
    }

    function animateShapes(shapes, board, config) {
        const timeline = anime.timeline({
            autoplay: false,
            loop: true,
            duration: 0,
        });
        const dummy = {x:0};
        for(let i = 0; i < shapes.length; i++) {
            const shape = shapes[i];
            // timeline.add({
            //     targets: shape.sprite.scale,
            //     x: shrinkAnimation,
            //     y: shrinkAnimation,
            //     easing: config.shrinkEasing,
            //     offset: offset,
            // });
        }
        // timeline.add({
        //     targets: dummy,
        //     x: 0,
        //     duration: config.cyclePause,
        // });
        return timeline;
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

        let board = makeBoardRectangle(config.screenMargin, app.screen);
        const shapes = [];//makePattern(config, board, app.renderer);
        const background = makeBackground(config, app.screen, app.renderer);
        //app.stage.addChild(background);
        for(let s of shapes) {
            app.stage.addChild(s.sprite);
        }
        //const animation = animateShapes(shapes, board, config);
        const animation = {};
        let state = {
            config: config,
            app: app,
            board: board,
            animation: animation,
            shapes: shapes,
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
