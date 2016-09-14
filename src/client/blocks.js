/* global StringMorph, localize, newCanvas, Point, Morph, InputSlotMorph
   Color, nop, BlockMorph, StageMorph, MultiArgMorph, SyntaxElementMorph,
   HintInputSlotMorph, RingMorph, SpriteMorph, ReporterBlockMorph, TextSlotMorph,
   ArgMorph, MessageInputSlotMorph, MessageOutputSlotMorph, BooleanSlotMorph,
   CommandSlotMorph, RingCommandSlotMorph, RingReporterSlotMorph, CSlotMorph,
   ColorSlotMorph, TemplateSlotMorph, FunctionSlotMorph, ReporterSlotMorph,
   SymbolMorph, MorphicPreferences, contains, IDE_Morph, Costume
   */

BlockMorph.prototype.setSpec = function (spec, silently) {
    var myself = this,
        part,
        inputIdx = -1;

    if (!spec) {return; }
    this.parts().forEach(function (part) {
        part.destroy();
    });
    if (this.isPrototype) {
        this.add(this.placeHolder());
    }
    this.parseSpec(spec).forEach(function (word) {
        if (word[0] === '%') {
            inputIdx += 1;
        }
        part = myself.labelPart(word);
        myself.add(part);
        if (!(part instanceof CommandSlotMorph ||
                part instanceof StringMorph)) {
            part.drawNew();
        }
        if (part instanceof RingMorph) {
            part.fixBlockColor();
        }
        if (part instanceof MultiArgMorph ||
                part.constructor === CommandSlotMorph ||
                part.constructor === RingCommandSlotMorph) {
            part.fixLayout();
        }
        if (myself.isPrototype) {
            myself.add(myself.placeHolder());
        }
        // NetsBlox addition: start
        if (part instanceof InputSlotMorph && !part.choices && myself.definition) {
        // NetsBlox addition: end
            part.setChoices.apply(
                part,
                myself.definition.inputOptionsOfIdx(inputIdx)
            );
        }
    });
    this.blockSpec = spec;
    this.fixLayout(silently);
    this.cachedInputs = null;
};

InputSlotMorph.prototype.messageTypesMenu = function() {
    var rcvr = this.parentThatIsA(BlockMorph).receiver(),
        stage = rcvr.parentThatIsA(StageMorph),
        names = stage.messageTypes.names(),
        dict = {};

    for (var i = names.length; i--;) {
        dict[names[i]] = names[i];
    }
    return dict;
};

MultiArgMorph.prototype.addHintInput = function (text) {
    var newPart = this.labelPart('%hint' + text),
        idx = this.children.length - 1;
    newPart.parent = this;
    this.children.splice(idx, 0, newPart);
    newPart.drawNew();
    this.fixLayout();
};

SyntaxElementMorph.prototype.labelPart = function (spec) {
    var part, tokens;
    if (spec[0] === '%' &&
            spec.length > 1 &&
            (this.selector !== 'reportGetVar' ||
                (spec === '%turtleOutline' && this.isObjInputFragment()))) {

        // check for variable multi-arg-slot:
        if ((spec.length > 5) && (spec.slice(0, 5) === '%mult')) {
            part = new MultiArgMorph(spec.slice(5));
            part.addInput();
            return part;
        }

        // Netsblox addition -- hint text
        if ((spec.length > 5) && (spec.slice(0, 5) === '%hint')) {
            part = new HintInputSlotMorph('', spec.slice(5));
            return part;
        }

        if ((spec.length > 6) && (spec.slice(0, 6) === '%mhint')) {
            tokens = spec.slice(6).split('%');
            part = new MultiArgMorph('%s', null, 0);

            tokens.forEach(function(token) {
                part.addHintInput(token);
            });
            part.isStatic = true;
            part.canBeEmpty = false;
            return part;
        }
        // Netsblox addition (end)
        // single-arg and specialized multi-arg slots:
        switch (spec) {
        case '%imgsource':
            part = new InputSlotMorph(
                null, // text
                false, // non-numeric
                {
                    'pen trails': ['pen trails'],
                    'stage image': ['stage image']
                },
                true
            );
            part.setContents(['pen trails']);
            break;
        case '%inputs':
            part = new MultiArgMorph('%s', 'with inputs');
            part.isStatic = false;
            part.canBeEmpty = false;
            break;
        case '%scriptVars':
            part = new MultiArgMorph('%t', null, 1, spec);
            part.canBeEmpty = false;
            break;
        case '%blockVars':
            part = new MultiArgMorph('%t', 'block variables', 0, spec);
            part.canBeEmpty = false;
            break;
        case '%parms':
            part = new MultiArgMorph('%t', 'Input Names:', 0, spec);
            part.canBeEmpty = false;
            break;
        case '%ringparms':
            part = new MultiArgMorph(
                '%t',
                'input names:',
                0,
                spec
            );
            break;
        case '%cmdRing':
            part = new RingMorph();
            part.color = SpriteMorph.prototype.blockColor.other;
            part.selector = 'reifyScript';
            part.setSpec('%rc %ringparms');
            part.isDraggable = true;
            break;
        case '%repRing':
            part = new RingMorph();
            part.color = SpriteMorph.prototype.blockColor.other;
            part.selector = 'reifyReporter';
            part.setSpec('%rr %ringparms');
            part.isDraggable = true;
            part.isStatic = true;
            break;
        case '%predRing':
            part = new RingMorph(true);
            part.color = SpriteMorph.prototype.blockColor.other;
            part.selector = 'reifyPredicate';
            part.setSpec('%rp %ringparms');
            part.isDraggable = true;
            part.isStatic = true;
            break;
        case '%words':
            part = new MultiArgMorph('%s', null, 0);
            part.addInput(); // allow for default value setting
            part.addInput(); // allow for default value setting
            part.isStatic = false;
            break;
        case '%exp':
            part = new MultiArgMorph('%s', null, 0);
            part.addInput();
            part.isStatic = true;
            part.canBeEmpty = false;
            break;
        case '%br':
            part = new Morph();
            part.setExtent(new Point(0, 0));
            part.isBlockLabelBreak = true;
            part.getSpec = function () {
                return '%br';
            };
            break;
        case '%inputName':
            part = new ReporterBlockMorph();
            part.category = 'variables';
            part.color = SpriteMorph.prototype.blockColor.variables;
            part.setSpec(localize('Input name'));
            break;
        case '%s':
            part = new InputSlotMorph();
            break;
        case '%anyUE':
            part = new InputSlotMorph();
            part.isUnevaluated = true;
            break;
        case '%txt':
            part = new InputSlotMorph(); // supports whitespace dots
            // part = new TextSlotMorph(); // multi-line, no whitespace dots
            part.minWidth = part.height() * 1.7; // "landscape"
            part.fixLayout();
            break;
        case '%mlt':
            part = new TextSlotMorph();
            part.fixLayout();
            break;
        case '%code':
            part = new TextSlotMorph();
            part.contents().fontName = 'monospace';
            part.contents().fontStyle = 'monospace';
            part.fixLayout();
            break;
        case '%obj':
            part = new ArgMorph('object');
            break;
        case '%n':
            part = new InputSlotMorph(null, true);
            break;
        case '%dir':
            part = new InputSlotMorph(
                null,
                true,
                {
                    '(90) right' : 90,
                    '(-90) left' : -90,
                    '(0) up' : '0',
                    '(180) down' : 180
                }
            );
            part.setContents(90);
            break;
        case '%inst':
            part = new InputSlotMorph(
                null,
                true,
                {
                    '(1) Acoustic Grand' : 1,
                    '(2) Bright Acoustic' : 2,
                    '(3) Electric Grand' : 3,
                    '(4) Honky Tonk' : 4,
                    '(5) Electric Piano 1' : 5,
                    '(6) Electric Piano 2' : 6,
                    '(7) Harpsichord' : 7
                }
            );
            part.setContents(1);
            break;
        case '%month':
            part = new InputSlotMorph(
                null, // text
                false, // numeric?
                {
                    'January' : ['January'],
                    'February' : ['February'],
                    'March' : ['March'],
                    'April' : ['April'],
                    'May' : ['May'],
                    'June' : ['June'],
                    'July' : ['July'],
                    'August' : ['August'],
                    'September' : ['September'],
                    'October' : ['October'],
                    'November' : ['November'],
                    'December' : ['December']
                },
                true // read-only
            );
            break;
        case '%interaction':
            part = new InputSlotMorph(
                null, // text
                false, // numeric?
                {
                    'clicked' : ['clicked'],
                    'pressed' : ['pressed'],
                    'dropped' : ['dropped'],
                    'mouse-entered' : ['mouse-entered'],
                    'mouse-departed' : ['mouse-departed']
                },
                true // read-only
            );
            part.isStatic = true;
            break;
        case '%dates':
            part = new InputSlotMorph(
                null, // text
                false, // non-numeric
                {
                    'year' : ['year'],
                    'month' : ['month'],
                    'date' : ['date'],
                    'day of week' : ['day of week'],
                    'hour' : ['hour'],
                    'minute' : ['minute'],
                    'second' : ['second'],
                    'time in milliseconds' : ['time in milliseconds']
                },
                true // read-only
            );
            part.setContents(['date']);
            break;
        case '%delim':
            part = new InputSlotMorph(
                null, // text
                false, // numeric?
                {
                    'letter' : ['letter'],
                    'whitespace' : ['whitespace'],
                    'line' : ['line'],
                    'tab' : ['tab'],
                    'cr' : ['cr']
                },
                false // read-only
            );
            break;
        case '%ida':
            part = new InputSlotMorph(
                null,
                true,
                {
                    '1' : 1,
                    last : ['last'],
                    '~' : null,
                    all : ['all']
                }
            );
            part.setContents(1);
            break;
        case '%idx':
            part = new InputSlotMorph(
                null,
                true,
                {
                    '1' : 1,
                    last : ['last'],
                    any : ['any']
                }
            );
            part.setContents(1);
            break;
        case '%spr':
            part = new InputSlotMorph(
                null,
                false,
                'objectsMenu',
                true
            );
            break;
        case '%col': // collision detection
            part = new InputSlotMorph(
                null,
                false,
                'collidablesMenu',
                true
            );
            break;
        case '%dst': // distance measuring
            part = new InputSlotMorph(
                null,
                false,
                'distancesMenu',
                true
            );
            break;
        case '%cln': // clones
            part = new InputSlotMorph(
                null,
                false,
                'clonablesMenu',
                true
            );
            break;
        case '%get': // sprites, parts, speciment, clones
            part = new InputSlotMorph(
                null,
                false,
                'gettablesMenu',
                true
            );
            part.isStatic = true;
            break;
        case '%cst':
            part = new InputSlotMorph(
                null,
                false,
                'costumesMenu',
                true
            );
            break;
        case '%eff':
            part = new InputSlotMorph(
                null,
                false,
                {   color: ['color'],
                    fisheye: ['fisheye'],
                    whirl: ['whirl'],
                    pixelate: ['pixelate'],
                    mosaic: ['mosaic'],
                    duplicate: ['duplicate'],
                    negative : ['negative'],
                    comic: ['comic'],
                    confetti: ['confetti'],
                    saturation: ['saturation'],
                    brightness : ['brightness'],
                    ghost: ['ghost']
                },
                true
            );
            part.setContents(['ghost']);
            break;
        case '%snd':
            part = new InputSlotMorph(
                null,
                false,
                'soundsMenu',
                true
            );
            break;
        case '%key':
            part = new InputSlotMorph(
                null,
                false,
                {
                    'any key' : ['any key'],
                    'up arrow': ['up arrow'],
                    'down arrow': ['down arrow'],
                    'right arrow': ['right arrow'],
                    'left arrow': ['left arrow'],
                    space : ['space'],
                    // Netsblox addition
                    '+' : ['+'],
                    '-' : ['-'],
                    // Netsblox addition (end)
                    a : ['a'],
                    b : ['b'],
                    c : ['c'],
                    d : ['d'],
                    e : ['e'],
                    f : ['f'],
                    g : ['g'],
                    h : ['h'],
                    i : ['i'],
                    j : ['j'],
                    k : ['k'],
                    l : ['l'],
                    m : ['m'],
                    n : ['n'],
                    o : ['o'],
                    p : ['p'],
                    q : ['q'],
                    r : ['r'],
                    s : ['s'],
                    t : ['t'],
                    u : ['u'],
                    v : ['v'],
                    w : ['w'],
                    x : ['x'],
                    y : ['y'],
                    z : ['z'],
                    '0' : ['0'],
                    '1' : ['1'],
                    '2' : ['2'],
                    '3' : ['3'],
                    '4' : ['4'],
                    '5' : ['5'],
                    '6' : ['6'],
                    '7' : ['7'],
                    '8' : ['8'],
                    '9' : ['9']
                },
                true
            );
            part.setContents(['space']);
            break;
        case '%keyHat':
            part = this.labelPart('%key');
            part.isStatic = true;
            break;
        // Netsblox addition
        case '%msgType':
            part = new InputSlotMorph(
                null,
                false,
                'messageTypes',
                true
            );
            break;
        case '%msgOutput':
            part = new MessageOutputSlotMorph();
            break;
        case '%msgInput':
            part = new MessageInputSlotMorph();
            break;
        case '%roles':
            // Seat ids
            part = new InputSlotMorph(
                null,
                false,
                'roleNames',
                true
            );
            break;
        case '%rpcNames':
            // rpc names (used in dev mode)
            part = new InputSlotMorph(
                null,
                false,
                'rpcNames',
                true
            );
            break;
        case '%rpcActions':
            // rpc names (used in dev mode)
            part = new InputSlotMorph(
                null,
                false,
                'rpcActions',
                true
            );
            break;
        // Netsblox addition (end)
        case '%msg':
            part = new InputSlotMorph(
                null,
                false,
                'messagesMenu',
                true
            );
            break;
        case '%msgHat':
            part = new InputSlotMorph(
                null,
                false,
                'messagesReceivedMenu',
                true
            );
            part.isStatic = true;
            break;
        case '%att':
            part = new InputSlotMorph(
                null,
                false,
                'attributesMenu',
                true
            );
            break;
        case '%fun':
            part = new InputSlotMorph(
                null,
                false,
                {
                    abs : ['abs'],
                    ceiling : ['ceiling'],
                    floor : ['floor'],
                    sqrt : ['sqrt'],
                    sin : ['sin'],
                    cos : ['cos'],
                    tan : ['tan'],
                    asin : ['asin'],
                    acos : ['acos'],
                    atan : ['atan'],
                    ln : ['ln'],
                    log : ['log'],
                    'e^' : ['e^'],
                    '10^' : ['10^']
                },
                true
            );
            part.setContents(['sqrt']);
            break;
        case '%txtfun':
            part = new InputSlotMorph(
                null,
                false,
                {
                    'encode URI' : ['encode URI'],
                    'decode URI' : ['decode URI'],
                    'encode URI component' : ['encode URI component'],
                    'decode URI component' : ['decode URI component'],
                    'XML escape' : ['XML escape'],
                    'XML unescape' : ['XML unescape'],
                    'hex sha512 hash' : ['hex sha512 hash']
                },
                true
            );
            part.setContents(['encode URI']);
            break;
        case '%stopChoices':
            part = new InputSlotMorph(
                null,
                false,
                {
                    'all' : ['all'],
                    'this script' : ['this script'],
                    'this block' : ['this block']
                },
                true
            );
            part.setContents(['all']);
            part.isStatic = true;
            break;
        case '%stopOthersChoices':
            part = new InputSlotMorph(
                null,
                false,
                {
                    'all but this script' : ['all but this script'],
                    'other scripts in sprite' : ['other scripts in sprite']
                },
                true
            );
            part.setContents(['all but this script']);
            part.isStatic = true;
            break;
        case '%typ':
            part = new InputSlotMorph(
                null,
                false,
                'typesMenu',
                true
            );
            part.setContents(['number']);
            break;
        case '%var':
            part = new InputSlotMorph(
                null,
                false,
                'getVarNamesDict',
                true
            );
            part.isStatic = true;
            break;
        case '%shd':
            part = new InputSlotMorph(
                null,
                false,
                'shadowedVariablesMenu',
                true
            );
            part.isStatic = true;
            break;
        case '%lst':
            part = new InputSlotMorph(
                null,
                false,
                {
                    list1 : 'list1',
                    list2 : 'list2',
                    list3 : 'list3'
                },
                true
            );
            break;
        case '%codeKind':
            part = new InputSlotMorph(
                null,
                false,
                {
                    code : ['code'],
                    header : ['header']
                },
                true
            );
            part.setContents(['code']);
            break;
        case '%l':
            part = new ArgMorph('list');
            break;
        case '%b':
            part = new BooleanSlotMorph();
            break;
        case '%boolUE':
            part = new BooleanSlotMorph();
            part.isUnevaluated = true;
            break;
        case '%bool':
            part = new BooleanSlotMorph(true);
            part.isStatic = true;
            break;
        case '%cmd':
            part = new CommandSlotMorph();
            break;
        case '%rc':
            part = new RingCommandSlotMorph();
            part.isStatic = true;
            break;
        case '%rr':
            part = new RingReporterSlotMorph();
            part.isStatic = true;
            break;
        case '%rp':
            part = new RingReporterSlotMorph(true);
            part.isStatic = true;
            break;
        case '%c':
            part = new CSlotMorph();
            part.isStatic = true;
            break;
        case '%cs':
            part = new CSlotMorph(); // non-static
            break;
        case '%cl':
            part = new CSlotMorph();
            part.isStatic = true; // rejects reporter drops
            part.isLambda = true; // auto-reifies nested script
            break;
        case '%clr':
            part = new ColorSlotMorph();
            part.isStatic = true;
            break;
        case '%t':
            part = new TemplateSlotMorph('a');
            break;
        case '%upvar':
            part = new TemplateSlotMorph('\u2191'); // up-arrow
            break;
        case '%f':
            part = new FunctionSlotMorph();
            break;
        case '%r':
            part = new ReporterSlotMorph();
            break;
        case '%p':
            part = new ReporterSlotMorph(true);
            break;

    // code mapping (experimental)

        case '%codeListPart':
            part = new InputSlotMorph(
                null, // text
                false, // numeric?
                {
                    'list' : ['list'],
                    'item' : ['item'],
                    'delimiter' : ['delimiter']
                },
                true // read-only
            );
            break;
        case '%codeListKind':
            part = new InputSlotMorph(
                null, // text
                false, // numeric?
                {
                    'collection' : ['collection'],
                    'variables' : ['variables'],
                    'parameters' : ['parameters']
                },
                true // read-only
            );
            break;

    // symbols:

        case '%turtle':
            part = new SymbolMorph('turtle');
            part.size = this.fontSize * 1.2;
            part.color = new Color(255, 255, 255);
            part.shadowColor = this.color.darker(this.labelContrast);
            part.shadowOffset = MorphicPreferences.isFlat ?
                    new Point() : this.embossing;
            part.drawNew();
            break;
        case '%turtleOutline':
            part = new SymbolMorph('turtleOutline');
            part.size = this.fontSize;
            part.color = new Color(255, 255, 255);
            part.isProtectedLabel = true; // doesn't participate in zebraing
            part.shadowColor = this.color.darker(this.labelContrast);
            part.shadowOffset = MorphicPreferences.isFlat ?
                    new Point() : this.embossing;
            part.drawNew();
            break;
        case '%clockwise':
            part = new SymbolMorph('turnRight');
            part.size = this.fontSize * 1.5;
            part.color = new Color(255, 255, 255);
            part.isProtectedLabel = false; // zebra colors
            part.shadowColor = this.color.darker(this.labelContrast);
            part.shadowOffset = MorphicPreferences.isFlat ?
                    new Point() : this.embossing;
            part.drawNew();
            break;
        case '%counterclockwise':
            part = new SymbolMorph('turnLeft');
            part.size = this.fontSize * 1.5;
            part.color = new Color(255, 255, 255);
            part.isProtectedLabel = false; // zebra colors
            part.shadowColor = this.color.darker(this.labelContrast);
            part.shadowOffset = MorphicPreferences.isFlat ?
                    new Point() : this.embossing;
            part.drawNew();
            break;
        case '%greenflag':
            part = new SymbolMorph('flag');
            part.size = this.fontSize * 1.5;
            part.color = new Color(0, 200, 0);
            part.isProtectedLabel = true; // doesn't participate in zebraing
            part.shadowColor = this.color.darker(this.labelContrast);
            part.shadowOffset = MorphicPreferences.isFlat ?
                    new Point() : this.embossing;
            part.drawNew();
            break;
        case '%stop':
            part = new SymbolMorph('octagon');
            part.size = this.fontSize * 1.5;
            part.color = new Color(200, 0, 0);
            part.isProtectedLabel = true; // doesn't participate in zebraing
            part.shadowColor = this.color.darker(this.labelContrast);
            part.shadowOffset = MorphicPreferences.isFlat ?
                    new Point() : this.embossing;
            part.drawNew();
            break;
        case '%pause':
            part = new SymbolMorph('pause');
            part.size = this.fontSize;
            part.color = new Color(255, 220, 0);
            part.isProtectedLabel = true; // doesn't participate in zebraing
            part.shadowColor = this.color.darker(this.labelContrast);
            part.shadowOffset = MorphicPreferences.isFlat ?
                    new Point() : this.embossing;
            part.drawNew();
            break;
        default:
            nop();
        }
    } else if (spec[0] === '$' &&
            spec.length > 1 &&
            this.selector !== 'reportGetVar') {
/*
        // allow costumes as label symbols
        // has issues when loading costumes (asynchronously)
        // commented out for now

        var rcvr = this.definition.receiver || this.receiver(),
            id = spec.slice(1),
            cst;
        if (!rcvr) {return this.labelPart('%stop'); }
        cst = detect(
            rcvr.costumes.asArray(),
            function (each) {return each.name === id; }
        );
        part = new SymbolMorph(cst);
        part.size = this.fontSize * 1.5;
        part.color = new Color(255, 255, 255);
        part.isProtectedLabel = true; // doesn't participate in zebraing
        part.drawNew();
*/

        // allow GUI symbols as label icons
        // usage: $symbolName[-size-r-g-b], size and color values are optional
        tokens = spec.slice(1).split('-');
        if (!contains(SymbolMorph.prototype.names, tokens[0])) {
            part = new StringMorph(spec);
            part.fontName = this.labelFontName;
            part.fontStyle = this.labelFontStyle;
            part.fontSize = this.fontSize;
            part.color = new Color(255, 255, 255);
            part.isBold = true;
            part.shadowColor = this.color.darker(this.labelContrast);
            part.shadowOffset = MorphicPreferences.isFlat ?
                    new Point() : this.embossing;
            part.drawNew();
            return part;
        }
        part = new SymbolMorph(tokens[0]);
        part.size = this.fontSize * (+tokens[1] || 1.2);
        part.color = new Color(
            +tokens[2] === 0 ? 0 : +tokens[2] || 255,
            +tokens[3] === 0 ? 0 : +tokens[3] || 255,
            +tokens[4] === 0 ? 0 : +tokens[4] || 255
        );
        part.isProtectedLabel = tokens.length > 2; // zebra colors
        part.shadowColor = this.color.darker(this.labelContrast);
        part.shadowOffset = MorphicPreferences.isFlat ?
                new Point() : this.embossing;
        part.drawNew();
    } else {
        part = new StringMorph(
            spec, // text
            this.fontSize, // fontSize
            this.labelFontStyle, // fontStyle
            true, // bold
            false, // italic
            false, // isNumeric
            MorphicPreferences.isFlat ?
                    new Point() : this.embossing, // shadowOffset
            this.color.darker(this.labelContrast), // shadowColor
            new Color(255, 255, 255), // color
            this.labelFontName // fontName
        );
    }
    return part;
};

InputSlotMorph.prototype.messageTypes = function () {
    var stage = this.parentThatIsA(IDE_Morph).stage,  // FIXME
        msgTypes = stage.messageTypes.names();
        dict = {};

    for (var i = msgTypes.length; i--;) {
        dict[msgTypes[i]] = msgTypes[i];
    }

    return dict;
};

InputSlotMorph.prototype.roleNames = function () {
    var ide = this.root().children[0],
        roles = Object.keys(ide.room.roles),
        dict = {};

    for (var i = roles.length; i--;) {
        if (ide.projectName !== roles[i]) {  // project name is roleid
            dict[roles[i]] = roles[i];
        }
    }

    dict['others in room'] = 'others in room';
    dict['everyone in room'] = 'everyone in room';
    return dict;
};

// IDE_Morph is not always accessible. quick fix => add getURL to
// InputSlotMorph
InputSlotMorph.prototype.getURL = function (url) {
    try {
        var request = new XMLHttpRequest();
        request.open('GET', url, false);
        request.send();
        if (request.status === 200) {
            return request.responseText;
        }
        throw new Error('unable to retrieve ' + url);
    } catch (err) {
        return '';
    }
};

InputSlotMorph.prototype.rpcNames = function () {
    var rpcs = JSON.parse(this.getURL('/rpc')),
        dict = {},
        name;

    for (var i = rpcs.length; i--;) {
        name = rpcs[i].replace('/', '');
        dict[name] = name;
    }
    return dict;
};

InputSlotMorph.prototype.rpcActions = function () {
    var fields = this.parent.inputs(),
        field,
        actions,
        rpc,
        dict = {},
        i;

    // assume that the rpc is right before this input
    i = fields.indexOf(this);
    field = fields[i-1];

    if (field) {
        rpc = field.evaluate();
        actions = JSON.parse(this.getURL('/rpc/' + rpc));
        for (i = actions.length; i--;) {
            dict[actions[i]] = actions[i];
        }
    }
    return dict;
};

// TODO: Refactor the switch case
SymbolMorph.prototype.symbolCanvasColored = function (aColor) {
    // private
    if (this.name instanceof Costume) {
        return this.name.thumbnail(new Point(this.symbolWidth(), this.size));
    }

    var canvas = newCanvas(new Point(this.symbolWidth(), this.size));

    switch (this.name) {
    case 'plus':  // TODO: Make this a smaller changeset (only added 2 lines)
        return this.drawSymbolPlus(canvas, aColor);
    case 'square':
        return this.drawSymbolStop(canvas, aColor);
    case 'pointRight':
        return this.drawSymbolPointRight(canvas, aColor);
    case 'gears':
        return this.drawSymbolGears(canvas, aColor);
    case 'file':
        return this.drawSymbolFile(canvas, aColor);
    case 'fullScreen':
        return this.drawSymbolFullScreen(canvas, aColor);
    case 'normalScreen':
        return this.drawSymbolNormalScreen(canvas, aColor);
    case 'smallStage':
        return this.drawSymbolSmallStage(canvas, aColor);
    case 'normalStage':
        return this.drawSymbolNormalStage(canvas, aColor);
    case 'turtle':
        return this.drawSymbolTurtle(canvas, aColor);
    case 'stage':
        return this.drawSymbolStop(canvas, aColor);
    case 'turtleOutline':
        return this.drawSymbolTurtleOutline(canvas, aColor);
    case 'pause':
        return this.drawSymbolPause(canvas, aColor);
    case 'flag':
        return this.drawSymbolFlag(canvas, aColor);
    case 'octagon':
        return this.drawSymbolOctagon(canvas, aColor);
    case 'cloud':
        return this.drawSymbolCloud(canvas, aColor);
    case 'cloudOutline':
        return this.drawSymbolCloudOutline(canvas, aColor);
    case 'cloudGradient':
        return this.drawSymbolCloudGradient(canvas, aColor);
    case 'turnRight':
        return this.drawSymbolTurnRight(canvas, aColor);
    case 'turnLeft':
        return this.drawSymbolTurnLeft(canvas, aColor);
    case 'storage':
        return this.drawSymbolStorage(canvas, aColor);
    case 'poster':
        return this.drawSymbolPoster(canvas, aColor);
    case 'flash':
        return this.drawSymbolFlash(canvas, aColor);
    case 'brush':
        return this.drawSymbolBrush(canvas, aColor);
    case 'rectangle':
        return this.drawSymbolRectangle(canvas, aColor);
    case 'rectangleSolid':
        return this.drawSymbolRectangleSolid(canvas, aColor);
    case 'circle':
        return this.drawSymbolCircle(canvas, aColor);
    case 'circleSolid':
        return this.drawSymbolCircleSolid(canvas, aColor);
    case 'line':
        return this.drawSymbolLine(canvas, aColor);
    case 'crosshairs':
        return this.drawSymbolCrosshairs(canvas, aColor);
    case 'paintbucket':
        return this.drawSymbolPaintbucket(canvas, aColor);
    case 'eraser':
        return this.drawSymbolEraser(canvas, aColor);
    case 'pipette':
        return this.drawSymbolPipette(canvas, aColor);
    case 'speechBubble':
        return this.drawSymbolSpeechBubble(canvas, aColor);
    case 'speechBubbleOutline':
        return this.drawSymbolSpeechBubbleOutline(canvas, aColor);
    case 'arrowUp':
        return this.drawSymbolArrowUp(canvas, aColor);
    case 'arrowUpOutline':
        return this.drawSymbolArrowUpOutline(canvas, aColor);
    case 'arrowLeft':
        return this.drawSymbolArrowLeft(canvas, aColor);
    case 'arrowLeftOutline':
        return this.drawSymbolArrowLeftOutline(canvas, aColor);
    case 'arrowDown':
        return this.drawSymbolArrowDown(canvas, aColor);
    case 'arrowDownOutline':
        return this.drawSymbolArrowDownOutline(canvas, aColor);
    case 'arrowRight':
        return this.drawSymbolArrowRight(canvas, aColor);
    case 'arrowRightOutline':
        return this.drawSymbolArrowRightOutline(canvas, aColor);
    case 'robot':
        return this.drawSymbolRobot(canvas, aColor);
    default:
        return canvas;
    }
};

SymbolMorph.prototype.drawSymbolPlus = function (canvas, color) {
    var ctx = canvas.getContext('2d'),
        w = canvas.width,
        l = Math.max(w / 12, 1),
        h = canvas.height;

    ctx.lineWidth = l;
    ctx.strokeStyle = color.toString();
    ctx.fillStyle = color.toString();

    ctx.moveTo(0, h/2);
    ctx.lineTo(w, h/2);
    ctx.moveTo(w/2, 0);
    ctx.lineTo(w/2, h);
    ctx.stroke();

    return canvas;
};

