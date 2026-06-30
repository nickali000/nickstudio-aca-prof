(function () {
    'use strict';

    function byId(id) {
        return document.getElementById(id);
    }

    function clear(node) {
        while (node && node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (typeof text === 'string') {
            node.textContent = text;
        }
        return node;
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function normReg(reg) {
        var raw;
        var match;
        if (!reg) {
            return null;
        }
        raw = String(reg).trim().toUpperCase();
        raw = raw.replace(/\s+/g, '');
        if (raw === 'R0' || raw === '$0') {
            return 'R0';
        }
        if (/^\$\d+$/.test(raw)) {
            return 'R' + raw.slice(1);
        }
        if (/^R\d+$/.test(raw) || /^F\d+$/.test(raw)) {
            return raw;
        }
        match = raw.match(/^\$(F|R)?(\d+)$/);
        if (match) {
            return (match[1] === 'F' ? 'F' : 'R') + match[2];
        }
        return raw.replace('$', 'R');
    }

    function isFpReg(reg) {
        return /^F\d+$/.test(reg || '');
    }

    function isIntReg(reg) {
        return /^R\d+$/.test(reg || '');
    }

    function formatValue(value) {
        if (value === null || typeof value === 'undefined') {
            return '—';
        }
        if (typeof value === 'number') {
            if (Math.abs(value - Math.round(value)) < 1e-9) {
                return String(Math.round(value));
            }
            return value.toFixed(2).replace(/\.00$/, '');
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (typeof value === 'object') {
            if (Object.prototype.hasOwnProperty.call(value, 'actualTaken')) {
                return value.actualTaken ? 'taken' : 'not taken';
            }
            return JSON.stringify(value);
        }
        return String(value);
    }

    function makeArrayMemory(label, values, stride) {
        var memory = {};
        values.forEach(function (value, index) {
            memory[label + '+' + (index * stride)] = value;
        });
        return memory;
    }

    function mergeMemory(chunks) {
        var memory = {};
        chunks.forEach(function (chunk) {
            Object.keys(chunk).forEach(function (key) {
                memory[key] = chunk[key];
            });
        });
        return memory;
    }

    function resultSymbol(instruction) {
        return 'res#' + instruction.id;
    }

    function buildProgram(program) {
        var labelMap = {};
        program.forEach(function (instruction, index) {
            if (instruction.label) {
                labelMap[instruction.label] = index;
            }
        });
        return labelMap;
    }

    var EXERCISES = {
        ex1: {
            title: 'Esercizio 1',
            description: 'Branch sempre predetto preso con target loop. Il simulatore mostra fetch speculativo, write nel ROB e commit in ordine.',
            buffers: { load: 2, store: 2, add: 3, mul: 2, int: 3, rob: 5 },
            latencies: { load: 2, store: 1, add: 2, mul: 4, div: 12, int: 1 },
            executionUnits: { load: 1, store: 1, add: 1, mul: 1, int: 1 },
            predictor: { type: 'fixed', initialTaken: true, targetKnown: true },
            initialInt: { R0: 0 },
            initialFp: { F8: 'F8₀', F10: 'F10₀' },
            memory: mergeMemory([
                makeArrayMemory('A', [1.8, 7.3, 10.4, 11.73], 8),
                makeArrayMemory('P', [3.94, 0.72, 6.33, 4.17], 8),
                makeArrayMemory('C', [8, 0, 24, 16], 8)
            ]),
            loopLabel: 'loop',
            program: [
                { text: 'daddi R1, R0, 0', op: 'daddi', stationType: 'int', dest: 'R1', srcs: ['R0'], imm: 0 },
                { text: 'daddi R3, R0, 16', op: 'daddi', stationType: 'int', dest: 'R3', srcs: ['R0'], imm: 16 },
                { text: 'l.d F2, A(R1)', label: 'loop', op: 'l.d', stationType: 'load', dest: 'F2', srcs: ['R1'], base: 'R1', addrLabel: 'A', offset: 0, memType: 'fp' },
                { text: 'ld R4, C(R1)', op: 'ld', stationType: 'load', dest: 'R4', srcs: ['R1'], base: 'R1', addrLabel: 'C', offset: 0, memType: 'int' },
                { text: 'l.d F5, P(R4)', op: 'l.d', stationType: 'load', dest: 'F5', srcs: ['R4'], base: 'R4', addrLabel: 'P', offset: 0, memType: 'fp' },
                { text: 'sub.d F8, F2, F8', op: 'sub.d', stationType: 'add', dest: 'F8', srcs: ['F2', 'F8'] },
                { text: 'mul.d F6, F2, F5', op: 'mul.d', stationType: 'mul', dest: 'F6', srcs: ['F2', 'F5'] },
                { text: 's.d F6, 0(R1)', op: 's.d', stationType: 'store', srcs: ['F6', 'R1'], valueReg: 'F6', base: 'R1', offset: 0, addrLabel: null },
                { text: 'daddi R1, R1, 8', op: 'daddi', stationType: 'int', dest: 'R1', srcs: ['R1'], imm: 8 },
                { text: 's.d F8, 0(R1)', op: 's.d', stationType: 'store', srcs: ['F8', 'R1'], valueReg: 'F8', base: 'R1', offset: 0, addrLabel: null },
                { text: 'bne R1, R3, loop', op: 'bne', stationType: 'int', srcs: ['R1', 'R3'], target: 'loop' },
                { text: 'syscall 0', op: 'syscall', stationType: 'int', srcs: [] }
            ]
        },
        ex2: {
            title: 'Esercizio 2',
            description: 'Local predictor a 1 bit con predizione iniziale not taken. Qui si vede bene il flush al commit del branch.',
            buffers: { load: 2, store: 2, add: 2, mul: 2, int: 3, rob: 7 },
            latencies: { load: 2, store: 2, add: 2, mul: 4, div: 10, int: 1 },
            executionUnits: { load: 1, store: 1, add: 1, mul: 1, int: 1 },
            predictor: { type: 'oneBitLocal', initialTaken: false, targetKnown: true },
            initialInt: { R0: 0, R5: 0 },
            initialFp: {},
            memory: mergeMemory([
                makeArrayMemory('C', [12.5], 8),
                makeArrayMemory('P', [3.94, 7.72, 6.33, 4.17], 8)
            ]),
            loopLabel: 'loop',
            program: [
                { text: 'daddi R2, R0, 0', op: 'daddi', stationType: 'int', dest: 'R2', srcs: ['R0'], imm: 0 },
                { text: 'daddi R3, R0, 16', op: 'daddi', stationType: 'int', dest: 'R3', srcs: ['R0'], imm: 16 },
                { text: 'l.d F8, C(R0)', op: 'l.d', stationType: 'load', dest: 'F8', srcs: ['R0'], base: 'R0', addrLabel: 'C', offset: 0, memType: 'fp' },
                { text: 'l.d F4, P(R2)', label: 'loop', op: 'l.d', stationType: 'load', dest: 'F4', srcs: ['R2'], base: 'R2', addrLabel: 'P', offset: 0, memType: 'fp' },
                { text: 'mul.d F6, F4, F8', op: 'mul.d', stationType: 'mul', dest: 'F6', srcs: ['F4', 'F8'] },
                { text: 'sub.d F10, F8, F4', op: 'sub.d', stationType: 'add', dest: 'F10', srcs: ['F8', 'F4'] },
                { text: 's.d F10, 0(R2)', op: 's.d', stationType: 'store', srcs: ['F10', 'R2'], valueReg: 'F10', base: 'R2', offset: 0, addrLabel: null },
                { text: 'daddi R2, R2, 8', op: 'daddi', stationType: 'int', dest: 'R2', srcs: ['R2'], imm: 8 },
                { text: 's.d F6, 0(R5)', op: 's.d', stationType: 'store', srcs: ['F6', 'R5'], valueReg: 'F6', base: 'R5', offset: 0, addrLabel: null },
                { text: 'daddi R5, R5, 8', op: 'daddi', stationType: 'int', dest: 'R5', srcs: ['R5'], imm: 8 },
                { text: 'bne R2, R3, loop', op: 'bne', stationType: 'int', srcs: ['R2', 'R3'], target: 'loop' },
                { text: 'daddi R2, R0, 0', op: 'daddi', stationType: 'int', dest: 'R2', srcs: ['R0'], imm: 0 }
            ]
        },
        ex3: {
            title: 'Esercizio 3',
            description: 'Local predictor a 1 bit inizialmente taken con branch target predictor. Il simulatore rende visibile anche la terza iterazione speculativa poi flushata.',
            buffers: { load: 2, store: 2, add: 2, mul: 2, int: 2, rob: 6 },
            latencies: { load: 2, store: 1, add: 2, mul: 3, div: 5, int: 1 },
            executionUnits: { load: 1, store: 1, add: 1, mul: 1, int: 1 },
            predictor: { type: 'oneBitLocal', initialTaken: true, targetKnown: true },
            initialInt: { R0: 0 },
            initialFp: {},
            memory: mergeMemory([
                makeArrayMemory('C', [8.5], 8),
                makeArrayMemory('V', [4.14, 5.52, 6.63, 4.83], 8)
            ]),
            loopLabel: 'loop',
            program: [
                { text: 'daddi $2, $0, 16', op: 'daddi', stationType: 'int', dest: '$2', srcs: ['$0'], imm: 16 },
                { text: 'daddi $3, $0, 0', op: 'daddi', stationType: 'int', dest: '$3', srcs: ['$0'], imm: 0 },
                { text: 'l.d F2, C($0)', op: 'l.d', stationType: 'load', dest: 'F2', srcs: ['$0'], base: '$0', addrLabel: 'C', offset: 0, memType: 'fp' },
                { text: 'l.d F4, V($2)', label: 'loop', op: 'l.d', stationType: 'load', dest: 'F4', srcs: ['$2'], base: '$2', addrLabel: 'V', offset: 0, memType: 'fp' },
                { text: 'daddi $2, $2, -8', op: 'daddi', stationType: 'int', dest: '$2', srcs: ['$2'], imm: -8 },
                { text: 'mul.d F8, F4, F2', op: 'mul.d', stationType: 'mul', dest: 'F8', srcs: ['F4', 'F2'] },
                { text: 's.d F8, P($3)', op: 's.d', stationType: 'store', srcs: ['F8', '$3'], valueReg: 'F8', base: '$3', offset: 0, addrLabel: 'P' },
                { text: 'daddi $3, $3, 8', op: 'daddi', stationType: 'int', dest: '$3', srcs: ['$3'], imm: 8 },
                { text: 'bne $2, $0, loop', op: 'bne', stationType: 'int', srcs: ['$2', '$0'], target: 'loop' },
                { text: 'add.d F9, F8, F4', op: 'add.d', stationType: 'add', dest: 'F9', srcs: ['F8', 'F4'] },
                { text: 's.d F9, Ris($0)', op: 's.d', stationType: 'store', srcs: ['F9', '$0'], valueReg: 'F9', base: '$0', offset: 0, addrLabel: 'Ris' },
                { text: 'syscall 0', op: 'syscall', stationType: 'int', srcs: [] }
            ]
        }
    };

    function buildStations(config) {
        var stations = {
            load: [],
            store: [],
            add: [],
            mul: [],
            int: []
        };
        var i;
        for (i = 1; i <= config.buffers.load; i += 1) {
            stations.load.push({ name: 'LB' + i, type: 'load', busy: false });
        }
        for (i = 1; i <= config.buffers.store; i += 1) {
            stations.store.push({ name: 'SB' + i, type: 'store', busy: false });
        }
        for (i = 1; i <= config.buffers.add; i += 1) {
            stations.add.push({ name: 'ADD' + i, type: 'add', busy: false });
        }
        for (i = 1; i <= config.buffers.mul; i += 1) {
            stations.mul.push({ name: 'MUL' + i, type: 'mul', busy: false });
        }
        for (i = 1; i <= config.buffers.int; i += 1) {
            stations.int.push({ name: 'INT' + i, type: 'int', busy: false });
        }
        return stations;
    }

    function collectRegisters(program, initialInt, initialFp) {
        var regs = [];
        program.forEach(function (instruction) {
            if (instruction.dest) {
                regs.push(normReg(instruction.dest));
            }
            (instruction.srcs || []).forEach(function (reg) {
                regs.push(normReg(reg));
            });
            if (instruction.base) {
                regs.push(normReg(instruction.base));
            }
            if (instruction.valueReg) {
                regs.push(normReg(instruction.valueReg));
            }
        });
        Object.keys(initialInt || {}).forEach(function (reg) { regs.push(normReg(reg)); });
        Object.keys(initialFp || {}).forEach(function (reg) { regs.push(normReg(reg)); });
        return regs.filter(function (reg, index, arr) {
            return reg && arr.indexOf(reg) === index;
        }).sort(function (a, b) {
            if (a[0] !== b[0]) {
                return a[0].localeCompare(b[0]);
            }
            return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
        });
    }

    function buildState(key) {
        var config = clone(EXERCISES[key]);
        var labelMap = buildProgram(config.program);
        var allRegs = collectRegisters(config.program, config.initialInt, config.initialFp);
        var archValues = {};
        var regStatus = {};
        var initialFp = config.initialFp || {};
        var initialInt = config.initialInt || {};

        allRegs.forEach(function (reg) {
            if (isIntReg(reg)) {
                archValues[reg] = Object.prototype.hasOwnProperty.call(initialInt, reg) ? initialInt[reg] : 0;
            } else {
                archValues[reg] = Object.prototype.hasOwnProperty.call(initialFp, reg) ? initialFp[reg] : (reg + '₀');
            }
            regStatus[reg] = null;
        });
        archValues.R0 = 0;
        regStatus.R0 = null;

        return {
            key: key,
            config: config,
            cycle: 0,
            pc: 0,
            haltedFetch: false,
            done: false,
            nextInstructionId: 1,
            nextRobId: 1,
            instructions: [],
            fetchQueue: [],
            rob: [],
            stations: buildStations(config),
            archValues: archValues,
            regStatus: regStatus,
            predictorBits: {},
            labelMap: labelMap,
            loopStartIndex: labelMap[config.loopLabel],
            loopBranchIndex: config.program.findIndex(function (instruction) {
                return instruction.op === 'bne' && instruction.target === config.loopLabel;
            }),
            loopIteration: 0,
            history: [],
            memory: clone(config.memory || {}),
            maxFetch: 80,
            lastEvents: [],
            lastGuides: []
        };
    }

    function getInstruction(state, instructionId) {
        return state.instructions.find(function (instruction) {
            return instruction.id === instructionId;
        }) || null;
    }

    function getRobIndex(state, robId) {
        var index;
        for (index = 0; index < state.rob.length; index += 1) {
            if (state.rob[index].id === robId) {
                return index;
            }
        }
        return -1;
    }

    function getRobEntry(state, robId) {
        var index = getRobIndex(state, robId);
        return index >= 0 ? state.rob[index] : null;
    }

    function allStations(state) {
        return []
            .concat(state.stations.load)
            .concat(state.stations.store)
            .concat(state.stations.add)
            .concat(state.stations.mul)
            .concat(state.stations.int);
    }

    function getStationByName(state, name) {
        var stations = allStations(state);
        return stations.find(function (station) { return station.name === name; }) || null;
    }

    function allocateStation(state, type) {
        var list = state.stations[type] || [];
        return list.find(function (station) { return !station.busy; }) || null;
    }

    function stationBusyCount(state, type) {
        return (state.stations[type] || []).filter(function (station) {
            return station.busy && station.executing;
        }).length;
    }

    function predictorKey(staticIndex) {
        return 'B' + staticIndex;
    }

    function getPrediction(state, staticIndex) {
        var predictor = state.config.predictor;
        var key = predictorKey(staticIndex);
        if (predictor.type === 'fixed') {
            return !!predictor.initialTaken;
        }
        if (!Object.prototype.hasOwnProperty.call(state.predictorBits, key)) {
            state.predictorBits[key] = !!predictor.initialTaken;
        }
        return state.predictorBits[key];
    }

    function updatePrediction(state, staticIndex, actualTaken) {
        var predictor = state.config.predictor;
        var key = predictorKey(staticIndex);
        if (predictor.type === 'oneBitLocal') {
            state.predictorBits[key] = !!actualTaken;
        }
    }

    function computeAddress(staticInstruction, baseValue) {
        var offset = Number(staticInstruction.offset || 0) + Number(baseValue || 0);
        if (staticInstruction.addrLabel) {
            return staticInstruction.addrLabel + '+' + offset;
        }
        return 'MEM+' + offset;
    }

    function readMemory(state, address) {
        if (Object.prototype.hasOwnProperty.call(state.memory, address)) {
            return state.memory[address];
        }
        return address;
    }

    function writeMemory(state, address, value) {
        state.memory[address] = value;
    }

    function resolveSource(state, reg) {
        var normalized = normReg(reg);
        var pendingRob;
        var entry;
        if (!normalized) {
            return { ready: true, value: null, tag: null };
        }
        if (normalized === 'R0') {
            return { ready: true, value: 0, tag: null };
        }
        pendingRob = state.regStatus[normalized];
        if (!pendingRob) {
            return { ready: true, value: state.archValues[normalized], tag: null };
        }
        entry = getRobEntry(state, pendingRob);
        if (entry && entry.ready) {
            return { ready: true, value: entry.value, tag: null };
        }
        return { ready: false, value: null, tag: pendingRob };
    }

    function formatInstructionText(state, staticIndex, text) {
        if (staticIndex === state.loopStartIndex) {
            state.loopIteration += 1;
        }
        if (state.loopStartIndex >= 0 && state.loopBranchIndex >= 0 &&
            staticIndex >= state.loopStartIndex && staticIndex <= state.loopBranchIndex) {
            return '[iter ' + state.loopIteration + '] ' + text;
        }
        return text;
    }

    function fetchNext(state, events, guides) {
        var staticInstruction;
        var instance;
        var predictedTaken;
        if (state.done || state.haltedFetch) {
            return;
        }
        if (state.instructions.length >= state.maxFetch) {
            state.haltedFetch = true;
            events.push('Raggiunto il limite di sicurezza di istruzioni dinamiche: fermo il fetch per evitare un loop infinito.');
            return;
        }
        if (state.pc < 0 || state.pc >= state.config.program.length) {
            state.haltedFetch = true;
            return;
        }

        staticInstruction = clone(state.config.program[state.pc]);
        instance = {
            id: state.nextInstructionId,
            staticIndex: state.pc,
            text: formatInstructionText(state, state.pc, staticInstruction.text),
            rawText: staticInstruction.text,
            op: staticInstruction.op,
            stationType: staticInstruction.stationType,
            dest: staticInstruction.dest ? normReg(staticInstruction.dest) : null,
            srcs: (staticInstruction.srcs || []).map(normReg),
            fetchCycle: state.cycle,
            issueCycle: null,
            execStartCycle: null,
            execEndCycle: null,
            writeCycle: null,
            commitCycle: null,
            predictedTaken: null,
            actualTaken: null,
            mispredicted: false,
            flushed: false,
            stationName: null,
            robId: null,
            state: 'fetched'
        };
        state.nextInstructionId += 1;
        state.instructions.push(instance);
        state.fetchQueue.push(instance.id);

        if (staticInstruction.op === 'bne') {
            predictedTaken = getPrediction(state, state.pc);
            instance.predictedTaken = predictedTaken;
            state.pc = predictedTaken ? state.labelMap[staticInstruction.target] : (state.pc + 1);
            events.push('Fetch ' + instance.text + ': predizione = ' + (predictedTaken ? 'taken' : 'not taken') + '.');
            guides.push('Sul branch fai subito due ragionamenti distinti: la direzione predetta per il fetch speculativo e l\'esito reale che verra\' verificato piu\' avanti.');
        } else {
            state.pc += 1;
            events.push('Fetch ' + instance.text + '.');
            guides.push('Ricorda: Fetch e Issue non coincidono. L\'istruzione appena fetchata potra\' essere emessa solo dal ciclo successivo.');
        }
    }

    function createRobEntry(state, instruction, staticInstruction) {
        var entry = {
            id: state.nextRobId,
            instructionId: instruction.id,
            op: staticInstruction.op,
            ready: false,
            dest: instruction.dest,
            address: null,
            value: null,
            type: (staticInstruction.op === 's.d') ? 'store' : (staticInstruction.op === 'bne' ? 'branch' : (instruction.dest ? 'register' : 'other')),
            predictedTaken: instruction.predictedTaken,
            actualTaken: null,
            targetIndex: staticInstruction.target ? state.labelMap[staticInstruction.target] : null,
            fallthroughIndex: staticInstruction.op === 'bne' ? (instruction.staticIndex + 1) : null
        };
        state.nextRobId += 1;
        state.rob.push(entry);
        return entry;
    }

    function fillStationOperands(state, station, staticInstruction) {
        var srcA;
        var srcB;
        station.A = null;
        station.addrLabel = staticInstruction.addrLabel || null;
        station.offset = Number(staticInstruction.offset || 0);

        if (staticInstruction.op === 'l.d' || staticInstruction.op === 'ld') {
            srcA = resolveSource(state, staticInstruction.base);
            station.Vj = srcA.ready ? srcA.value : null;
            station.Qj = srcA.ready ? null : srcA.tag;
            station.Vk = null;
            station.Qk = null;
        } else if (staticInstruction.op === 's.d') {
            srcA = resolveSource(state, staticInstruction.base);
            srcB = resolveSource(state, staticInstruction.valueReg);
            station.Vj = srcA.ready ? srcA.value : null;
            station.Qj = srcA.ready ? null : srcA.tag;
            station.Vk = srcB.ready ? srcB.value : null;
            station.Qk = srcB.ready ? null : srcB.tag;
        } else if (staticInstruction.op === 'daddi') {
            srcA = resolveSource(state, staticInstruction.srcs[0]);
            station.Vj = srcA.ready ? srcA.value : null;
            station.Qj = srcA.ready ? null : srcA.tag;
            station.Vk = Number(staticInstruction.imm || 0);
            station.Qk = null;
        } else if (staticInstruction.op === 'bne') {
            srcA = resolveSource(state, staticInstruction.srcs[0]);
            srcB = resolveSource(state, staticInstruction.srcs[1]);
            station.Vj = srcA.ready ? srcA.value : null;
            station.Qj = srcA.ready ? null : srcA.tag;
            station.Vk = srcB.ready ? srcB.value : null;
            station.Qk = srcB.ready ? null : srcB.tag;
        } else if (staticInstruction.op === 'syscall') {
            station.Vj = null;
            station.Qj = null;
            station.Vk = null;
            station.Qk = null;
        } else {
            srcA = resolveSource(state, staticInstruction.srcs[0]);
            srcB = resolveSource(state, staticInstruction.srcs[1]);
            station.Vj = srcA.ready ? srcA.value : null;
            station.Qj = srcA.ready ? null : srcA.tag;
            station.Vk = srcB.ready ? srcB.value : null;
            station.Qk = srcB.ready ? null : srcB.tag;
        }
    }

    function issueNext(state, events, guides) {
        var instructionId;
        var instruction;
        var staticInstruction;
        var station;
        var robEntry;
        if (!state.fetchQueue.length) {
            return;
        }
        instructionId = state.fetchQueue[0];
        instruction = getInstruction(state, instructionId);
        if (!instruction || instruction.fetchCycle >= state.cycle || instruction.flushed) {
            return;
        }
        staticInstruction = state.config.program[instruction.staticIndex];
        if (state.rob.length >= state.config.buffers.rob) {
            events.push('Issue bloccata: ROB pieno.');
            guides.push('Nel Tomasulo con ROB, per l\'issue servono contemporaneamente una station libera e una entry libera nel ROB.');
            return;
        }
        station = allocateStation(state, staticInstruction.stationType);
        if (!station) {
            events.push('Issue bloccata: nessuna ' + staticInstruction.stationType.toUpperCase() + ' station libera.');
            guides.push('Lo stallo strutturale qui non dipende dal banco registri, ma dalla mancanza di Reservation Station o Buffer liberi.');
            return;
        }

        robEntry = createRobEntry(state, instruction, staticInstruction);
        station.busy = true;
        station.instructionId = instruction.id;
        station.robId = robEntry.id;
        station.op = staticInstruction.op;
        station.executing = false;
        station.execRemaining = null;
        station.execDone = false;
        station.writeReadyCycle = null;
        station.computedAddress = null;
        station.phase = 'issued';
        fillStationOperands(state, station, staticInstruction);

        if (instruction.dest) {
            state.regStatus[instruction.dest] = robEntry.id;
        }

        instruction.issueCycle = state.cycle;
        instruction.robId = robEntry.id;
        instruction.stationName = station.name;
        instruction.state = 'waiting';
        state.fetchQueue.shift();

        events.push('Issue ' + instruction.text + ' -> ' + station.name + ' e ROB' + robEntry.id + '.');
        guides.push('In issue salva i tag del ROB nei campi Qj/Qk se l\'operando non e\' ancora pronto; se invece il ROB produttore e\' gia\' ready puoi leggere direttamente il suo value.');
    }

    function areOperandsReady(station, op) {
        if (op === 'l.d' || op === 'ld') {
            return station.Qj === null;
        }
        if (op === 's.d') {
            return station.Qj === null;
        }
        if (op === 'daddi') {
            return station.Qj === null;
        }
        if (op === 'syscall') {
            return true;
        }
        return station.Qj === null && station.Qk === null;
    }

    function getStationAddress(state, station, staticInstruction) {
        if (station.computedAddress !== null) {
            return station.computedAddress;
        }
        return computeAddress(staticInstruction, station.Vj);
    }

    function storeCanStart(state, station) {
        var myIndex = getRobIndex(state, station.robId);
        var index;
        if (myIndex < 0) {
            return false;
        }
        for (index = 0; index < myIndex; index += 1) {
            if (state.rob[index].type === 'store') {
                return false;
            }
        }
        return true;
    }

    function loadBlockedByOlderStores(state, station, staticInstruction) {
        var myIndex = getRobIndex(state, station.robId);
        var tentativeAddress;
        var index;
        var older;
        var olderInstruction;
        var olderStation;
        var olderAddress;
        if (myIndex < 0) {
            return 'ROB entry non trovata';
        }
        tentativeAddress = getStationAddress(state, station, staticInstruction);
        for (index = 0; index < myIndex; index += 1) {
            older = state.rob[index];
            if (older.type !== 'store') {
                continue;
            }
            olderInstruction = getInstruction(state, older.instructionId);
            olderStation = olderInstruction && olderInstruction.stationName ? getStationByName(state, olderInstruction.stationName) : null;
            olderAddress = older.address;
            if (!olderAddress && olderStation && olderStation.computedAddress) {
                olderAddress = olderStation.computedAddress;
            }
            if (!olderAddress) {
                return 'store precedente con indirizzo ancora sconosciuto';
            }
            if (olderAddress === tentativeAddress) {
                return 'store precedente sulla stessa locazione';
            }
        }
        return null;
    }

    function startExecutions(state, events, guides) {
        var typeOrder = ['load', 'store', 'add', 'mul', 'int'];
        var used = { load: 0, store: 0, add: 0, mul: 0, int: 0 };

        allStations(state).forEach(function (station) {
            var instruction;
            var staticInstruction;
            var blockReason;
            if (!station.busy || station.executing || station.execDone) {
                return;
            }
            instruction = getInstruction(state, station.instructionId);
            staticInstruction = instruction ? state.config.program[instruction.staticIndex] : null;
            if (!instruction || !staticInstruction || instruction.issueCycle >= state.cycle || instruction.flushed) {
                return;
            }
            if (!areOperandsReady(station, staticInstruction.op)) {
                return;
            }
            if (used[station.type] >= state.config.executionUnits[station.type]) {
                return;
            }
            if (staticInstruction.op === 's.d' && !storeCanStart(state, station)) {
                return;
            }
            if (staticInstruction.op === 'l.d' || staticInstruction.op === 'ld') {
                blockReason = loadBlockedByOlderStores(state, station, staticInstruction);
                if (blockReason) {
                    if (!station.waitNoteShown || station.waitNoteShown !== blockReason) {
                        events.push('Load ' + instruction.text + ' bloccata: ' + blockReason + '.');
                        station.waitNoteShown = blockReason;
                    }
                    return;
                }
            }

            station.executing = true;
            station.phase = 'execute';
            station.execRemaining = (staticInstruction.op === 'l.d' || staticInstruction.op === 'ld') ? state.config.latencies.load :
                (staticInstruction.op === 's.d' ? state.config.latencies.store :
                    (staticInstruction.op === 'add.d' || staticInstruction.op === 'sub.d' ? state.config.latencies.add :
                        (staticInstruction.op === 'mul.d' ? state.config.latencies.mul :
                            (staticInstruction.op === 'div.d' ? state.config.latencies.div : state.config.latencies.int))));
            instruction.execStartCycle = state.cycle;
            instruction.state = 'executing';
            used[station.type] += 1;
            if (staticInstruction.base) {
                station.computedAddress = computeAddress(staticInstruction, station.Vj);
            }
            events.push('Execute start: ' + instruction.text + ' su ' + station.name + '.');
            guides.push('L\'execute parte solo quando i tag Q sono azzerati. Per le load inoltre controllo anche le store piu\' vecchie nel ROB.');
        });
    }

    function computeResult(state, instruction, station, staticInstruction) {
        var a = station.Vj;
        var b = station.Vk;
        var address;
        if (staticInstruction.op === 'daddi') {
            return Number(a) + Number(staticInstruction.imm || 0);
        }
        if (staticInstruction.op === 'ld' || staticInstruction.op === 'l.d') {
            address = station.computedAddress || computeAddress(staticInstruction, station.Vj);
            return readMemory(state, address);
        }
        if (staticInstruction.op === 'add.d' && typeof a === 'number' && typeof b === 'number') {
            return a + b;
        }
        if (staticInstruction.op === 'sub.d' && typeof a === 'number' && typeof b === 'number') {
            return a - b;
        }
        if (staticInstruction.op === 'mul.d' && typeof a === 'number' && typeof b === 'number') {
            return a * b;
        }
        if (staticInstruction.op === 'div.d' && typeof a === 'number' && typeof b === 'number') {
            return a / b;
        }
        if (staticInstruction.op === 'bne') {
            return {
                actualTaken: a !== b
            };
        }
        if (staticInstruction.op === 'syscall') {
            return 'syscall';
        }
        return resultSymbol(instruction);
    }

    function advanceExecutions(state, events) {
        allStations(state).forEach(function (station) {
            var instruction;
            var staticInstruction;
            var result;
            var robEntry;
            if (!station.busy || !station.executing) {
                return;
            }
            station.execRemaining -= 1;
            if (station.execRemaining > 0) {
                return;
            }
            instruction = getInstruction(state, station.instructionId);
            staticInstruction = instruction ? state.config.program[instruction.staticIndex] : null;
            if (!instruction || !staticInstruction) {
                return;
            }
            station.executing = false;
            station.execDone = true;
            station.phase = 'await-write';
            station.writeReadyCycle = state.cycle + 1;
            instruction.execEndCycle = state.cycle;
            instruction.state = 'wait-write';
            result = computeResult(state, instruction, station, staticInstruction);
            station.result = result;
            robEntry = getRobEntry(state, station.robId);
            if (robEntry && staticInstruction.op === 'bne') {
                robEntry.actualTaken = !!result.actualTaken;
            }
            events.push('Execute end: ' + instruction.text + '.');
        });
    }

    function broadcast(state, robId, value) {
        allStations(state).forEach(function (station) {
            if (!station.busy) {
                return;
            }
            if (station.Qj === robId) {
                station.Qj = null;
                station.Vj = value;
            }
            if (station.Qk === robId) {
                station.Qk = null;
                station.Vk = value;
            }
        });
    }

    function releaseStation(station) {
        station.busy = false;
        station.instructionId = null;
        station.robId = null;
        station.op = null;
        station.executing = false;
        station.execRemaining = null;
        station.execDone = false;
        station.writeReadyCycle = null;
        station.computedAddress = null;
        station.result = null;
        station.phase = null;
        station.Qj = null;
        station.Qk = null;
        station.Vj = null;
        station.Vk = null;
        station.waitNoteShown = null;
    }

    function candidateWrites(state) {
        return allStations(state).filter(function (station) {
            var instruction;
            var staticInstruction;
            if (!station.busy || !station.execDone || station.writeReadyCycle > state.cycle) {
                return false;
            }
            instruction = getInstruction(state, station.instructionId);
            staticInstruction = instruction ? state.config.program[instruction.staticIndex] : null;
            if (!instruction || !staticInstruction) {
                return false;
            }
            if (staticInstruction.op === 's.d' && station.Qk !== null) {
                return false;
            }
            return true;
        }).sort(function (a, b) {
            return getRobIndex(state, a.robId) - getRobIndex(state, b.robId);
        });
    }

    function writeResult(state, events, guides) {
        var candidates = candidateWrites(state);
        var station;
        var instruction;
        var staticInstruction;
        var robEntry;
        var value;
        if (!candidates.length) {
            return;
        }
        station = candidates[0];
        instruction = getInstruction(state, station.instructionId);
        staticInstruction = state.config.program[instruction.staticIndex];
        robEntry = getRobEntry(state, station.robId);
        if (!robEntry) {
            releaseStation(station);
            return;
        }

        if (staticInstruction.op === 's.d') {
            value = station.Vk;
            robEntry.address = station.computedAddress;
            robEntry.value = value;
            robEntry.ready = true;
            instruction.writeCycle = state.cycle;
            instruction.state = 'ready-rob';
            events.push('Write store: ROB' + robEntry.id + ' riceve indirizzo ' + robEntry.address + ' e valore ' + formatValue(value) + '.');
            guides.push('Per una store il write result non tocca la memoria: rende solo pronta la entry del ROB. La scrittura vera avverra\' al commit.');
            releaseStation(station);
            return;
        }

        value = station.result;
        robEntry.value = value;
        robEntry.ready = true;
        instruction.writeCycle = state.cycle;
        instruction.state = 'ready-rob';
        if (staticInstruction.op === 'bne') {
            robEntry.actualTaken = !!value.actualTaken;
            events.push('Write branch: ROB' + robEntry.id + ' memorizza esito reale = ' + (robEntry.actualTaken ? 'taken' : 'not taken') + '.');
            guides.push('Con il ROB, anche il branch passa da una entry pronta: la decisione sulla correttezza della predizione viene gestita al commit.');
        } else {
            broadcast(state, robEntry.id, value);
            events.push('Write result: ' + instruction.text + ' scrive nel ROB' + robEntry.id + ' e fa broadcast sul CDB.');
            guides.push('Il CDB non aggiorna direttamente il registro architetturale: aggiorna ROB e Reservation Station in attesa dello stesso tag.');
        }
        releaseStation(station);
    }

    function flushYounger(state, branchInstructionId, branchRobId) {
        var removedRobIds = [];
        var branchIndex = getRobIndex(state, branchRobId);
        var survivors;
        if (branchIndex < 0) {
            return 0;
        }
        state.rob.slice(branchIndex + 1).forEach(function (entry) {
            removedRobIds.push(entry.id);
            var flushedInstruction = getInstruction(state, entry.instructionId);
            if (flushedInstruction && !flushedInstruction.commitCycle) {
                flushedInstruction.flushed = true;
                flushedInstruction.state = 'flushed';
            }
        });
        survivors = state.rob.slice(0, branchIndex + 1);
        state.rob = survivors;

        allStations(state).forEach(function (station) {
            if (station.busy && removedRobIds.indexOf(station.robId) >= 0) {
                releaseStation(station);
            }
        });

        Object.keys(state.regStatus).forEach(function (reg) {
            if (removedRobIds.indexOf(state.regStatus[reg]) >= 0) {
                state.regStatus[reg] = null;
            }
        });

        state.fetchQueue = state.fetchQueue.filter(function (instructionId) {
            if (instructionId <= branchInstructionId) {
                return true;
            }
            var instruction = getInstruction(state, instructionId);
            if (instruction && !instruction.commitCycle) {
                instruction.flushed = true;
                instruction.state = 'flushed';
            }
            return false;
        });

        state.instructions.forEach(function (instruction) {
            if (instruction.id > branchInstructionId && !instruction.commitCycle && !instruction.flushed) {
                instruction.flushed = true;
                instruction.state = 'flushed';
            }
        });

        return removedRobIds.length;
    }

    function commitHead(state, events, guides) {
        var head;
        var instruction;
        var staticInstruction;
        var flushedCount;
        if (!state.rob.length || !state.rob[0].ready) {
            return;
        }
        head = state.rob[0];
        instruction = getInstruction(state, head.instructionId);
        staticInstruction = instruction ? state.config.program[instruction.staticIndex] : null;
        if (!instruction || !staticInstruction) {
            state.rob.shift();
            return;
        }

        instruction.commitCycle = state.cycle;
        instruction.state = 'done';

        if (head.type === 'register' && instruction.dest) {
            state.archValues[instruction.dest] = head.value;
            if (state.regStatus[instruction.dest] === head.id) {
                state.regStatus[instruction.dest] = null;
            }
            events.push('Commit ROB' + head.id + ': ' + instruction.dest + ' <= ' + formatValue(head.value) + '.');
            guides.push('Il commit e\' l\'unico momento in cui il registro architetturale cambia davvero. Prima di questo istante il dato vive solo nel ROB.');
        } else if (head.type === 'store') {
            writeMemory(state, head.address, head.value);
            events.push('Commit ROB' + head.id + ': store in ' + head.address + ' = ' + formatValue(head.value) + '.');
            guides.push('Le store mantengono la correttezza proprio grazie al commit in ordine: la memoria cambia solo quando la store arriva in testa al ROB.');
        } else if (head.type === 'branch') {
            updatePrediction(state, instruction.staticIndex, head.actualTaken);
            if (head.actualTaken !== head.predictedTaken) {
                instruction.mispredicted = true;
                flushedCount = flushYounger(state, instruction.id, head.id);
                state.pc = head.actualTaken ? head.targetIndex : head.fallthroughIndex;
                state.haltedFetch = false;
                events.push('Commit branch ROB' + head.id + ': predizione ERRATA, flush di ' + flushedCount + ' istruzioni giovani.');
                guides.push('Qui il ROB mostra il suo ruolo chiave: le istruzioni speculative possono anche aver scritto nel ROB, ma vengono scartate prima di modificare lo stato architetturale.');
            } else {
                events.push('Commit branch ROB' + head.id + ': predizione corretta, nessun flush.');
                guides.push('Se la predizione e\' corretta, il lavoro speculativo non va perso e il fetch continua senza recuperi.');
            }
        } else if (staticInstruction.op === 'syscall') {
            state.haltedFetch = true;
            state.done = true;
            events.push('Commit syscall: simulazione conclusa.');
        } else {
            events.push('Commit ROB' + head.id + ': nessuna modifica architetturale aggiuntiva.');
        }

        if (state.rob.length && state.rob[0].id === head.id) {
            state.rob.shift();
        }
    }

    function stepCycle(state) {
        var events = [];
        var guides = [];
        if (state.done && !state.rob.length) {
            state.lastEvents = ['La simulazione e\' gia\' terminata.'];
            state.lastGuides = ['Puoi usare "Reset" o cambiare esercizio per ripartire.'];
            return;
        }
        if (!state.disableHistory) {
            state.history.push(cloneStateForHistory(state));
        }
        state.cycle += 1;

        commitHead(state, events, guides);
        writeResult(state, events, guides);
        startExecutions(state, events, guides);
        advanceExecutions(state, events);
        issueNext(state, events, guides);
        fetchNext(state, events, guides);

        if (state.haltedFetch && !state.fetchQueue.length && !state.rob.length &&
            allStations(state).every(function (station) { return !station.busy; })) {
            state.done = true;
        }
        if (!events.length) {
            events.push('Nessun avanzamento significativo in questo ciclo.');
        }
        if (!guides.length) {
            guides.push('Controlla soprattutto la testa del ROB, gli eventuali tag ancora presenti nelle station e la coda di fetch speculativo.');
        }
        state.lastEvents = events;
        state.lastGuides = guides;
    }

    function cloneStateForHistory(state) {
        var history = state.history;
        var snapshot;
        state.history = [];
        snapshot = clone(state);
        state.history = history;
        return snapshot;
    }

    function restorePrevious(state) {
        if (!state.history.length) {
            return state;
        }
        return state.history.pop();
    }

    function instructionState(instruction) {
        if (instruction.flushed) {
            return { label: 'flushed', className: 'flush' };
        }
        if (instruction.commitCycle !== null) {
            return { label: 'committed', className: 'commit' };
        }
        if (instruction.writeCycle !== null) {
            return { label: 'ready in ROB', className: 'write' };
        }
        if (instruction.execStartCycle !== null && instruction.execEndCycle === null) {
            return { label: 'executing', className: 'exec' };
        }
        if (instruction.issueCycle !== null) {
            return { label: 'issued', className: 'wait' };
        }
        if (instruction.fetchCycle !== null) {
            return { label: 'fetched', className: 'queue' };
        }
        return { label: 'idle', className: 'idle' };
    }

    function renderSummary(state) {
        var summary = byId('reorder-summary');
        var predictorInfo;
        clear(summary);
        predictorInfo = state.config.predictor.type === 'fixed'
            ? 'predizione fissa: ' + (state.config.predictor.initialTaken ? 'taken' : 'not taken')
            : 'predictor 1 bit';
        [
            ['Esercizio', state.config.title],
            ['Ciclo', state.cycle],
            ['Istruzioni dinamiche', state.instructions.length],
            ['Coda fetch', state.fetchQueue.length],
            ['ROB attive', state.rob.length + '/' + state.config.buffers.rob],
            ['PC statico', state.haltedFetch ? 'stop' : state.pc],
            ['Predictor', predictorInfo]
        ].forEach(function (item) {
            var pill = el('div', 'status-pill');
            var strong = el('strong', '', item[0] + ':');
            pill.appendChild(strong);
            pill.appendChild(document.createTextNode(' ' + item[1]));
            summary.appendChild(pill);
        });
    }

    function renderList(id, items) {
        var container = byId(id);
        clear(container);
        items.forEach(function (item) {
            container.appendChild(el('div', 'sim-list-item', item));
        });
    }

    function renderRob(state) {
        var body = byId('reorder-rob-body');
        clear(body);
        if (!state.rob.length) {
            var row = el('tr', '');
            var cell = el('td', '', 'ROB vuoto');
            cell.colSpan = 7;
            row.appendChild(cell);
            body.appendChild(row);
            return;
        }
        state.rob.forEach(function (entry, index) {
            var instruction = getInstruction(state, entry.instructionId);
            var row = el('tr', '');
            [
                (index === 0 ? 'HEAD ' : '') + 'ROB' + entry.id,
                instruction ? instruction.text : '—',
                entry.type,
                entry.address || entry.dest || '—',
                formatValue(entry.value),
                entry.ready ? 'yes' : 'no',
                (entry.type === 'branch' ? ('pred=' + (entry.predictedTaken ? 'T' : 'NT') + ' / real=' + (entry.actualTaken === null ? '—' : (entry.actualTaken ? 'T' : 'NT'))) : '—')
            ].forEach(function (value) {
                row.appendChild(el('td', '', value));
            });
            body.appendChild(row);
        });
    }

    function renderStations(state) {
        var body = byId('reorder-station-body');
        clear(body);
        allStations(state).forEach(function (station) {
            var row = el('tr', '');
            [
                station.name,
                station.type,
                station.busy ? 'yes' : 'no',
                station.busy ? station.op : '—',
                station.busy ? ('ROB' + station.robId) : '—',
                station.busy ? formatValue(station.Vj) : '—',
                station.busy ? formatValue(station.Vk) : '—',
                station.busy && station.Qj !== null ? ('ROB' + station.Qj) : '—',
                station.busy && station.Qk !== null ? ('ROB' + station.Qk) : '—',
                station.busy ? (station.computedAddress || (station.addrLabel ? station.addrLabel + '+' + station.offset : (station.offset || '—'))) : '—',
                station.busy ? (station.phase || 'issued') : 'free'
            ].forEach(function (value) {
                row.appendChild(el('td', '', value));
            });
            body.appendChild(row);
        });
    }

    function renderRegisters(state) {
        var body = byId('reorder-register-body');
        clear(body);
        Object.keys(state.archValues).sort(function (a, b) {
            if (a[0] !== b[0]) {
                return a[0].localeCompare(b[0]);
            }
            return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
        }).forEach(function (reg) {
            if (reg === 'R0' || state.archValues[reg] !== 0 || state.regStatus[reg] !== null || isFpReg(reg)) {
                var row = el('tr', '');
                row.appendChild(el('td', '', reg));
                row.appendChild(el('td', '', formatValue(state.archValues[reg])));
                row.appendChild(el('td', '', state.regStatus[reg] ? ('ROB' + state.regStatus[reg]) : '—'));
                body.appendChild(row);
            }
        });
    }

    function execRange(instruction) {
        if (instruction.execStartCycle === null) {
            return '—';
        }
        if (instruction.execEndCycle === null) {
            return instruction.execStartCycle + '...';
        }
        if (instruction.execStartCycle === instruction.execEndCycle) {
            return String(instruction.execStartCycle);
        }
        return instruction.execStartCycle + '-' + instruction.execEndCycle;
    }

    function renderInstructions(state) {
        var body = byId('reorder-instruction-body');
        clear(body);
        state.instructions.forEach(function (instruction) {
            var row = el('tr', '');
            var stateBadge = el('span', 'instruction-state ' + instructionState(instruction).className, instructionState(instruction).label);
            var stateCell = el('td', '');
            stateCell.appendChild(stateBadge);
            row.appendChild(el('td', '', String(instruction.id)));
            row.appendChild(el('td', '', instruction.text));
            row.appendChild(stateCell);
            row.appendChild(el('td', '', instruction.robId ? ('ROB' + instruction.robId) : '—'));
            row.appendChild(el('td', '', instruction.fetchCycle === null ? '—' : String(instruction.fetchCycle)));
            row.appendChild(el('td', '', instruction.issueCycle === null ? '—' : String(instruction.issueCycle)));
            row.appendChild(el('td', '', execRange(instruction)));
            row.appendChild(el('td', '', instruction.writeCycle === null ? '—' : String(instruction.writeCycle)));
            row.appendChild(el('td', '', instruction.commitCycle === null ? '—' : String(instruction.commitCycle)));
            body.appendChild(row);
        });
    }

    function exerciseKeyFromUrl(defaultKey) {
        var raw;
        try {
            raw = new URLSearchParams(window.location.search).get('exercise');
        } catch (_error) {
            raw = null;
        }
        if (!raw) {
            return defaultKey;
        }
        raw = raw.toLowerCase().replace(/\s+/g, '');
        if (Object.prototype.hasOwnProperty.call(EXERCISES, raw)) {
            return raw;
        }
        return defaultKey;
    }

    var currentKey = exerciseKeyFromUrl('ex1');
    var currentState = buildState(currentKey);
    var playTimer = null;

    function stopPlay() {
        if (playTimer) {
            window.clearInterval(playTimer);
            playTimer = null;
            var playBtn = byId('reorder-play-btn');
            if (playBtn) {
                playBtn.textContent = 'Play';
            }
        }
    }

    function render() {
        renderSummary(currentState);
        renderList('reorder-events', currentState.lastEvents || ['Seleziona un esercizio e avanza di un ciclo.']);
        renderList('reorder-guide', currentState.lastGuides || ['Segui il ROB dalla testa verso il fondo e tieni d\'occhio i tag nelle station.']);
        renderRob(currentState);
        renderStations(currentState);
        renderRegisters(currentState);
        renderInstructions(currentState);
    }

    function resetCurrent() {
        stopPlay();
        currentState = buildState(currentKey);
        currentState.lastEvents = ['Simulatore inizializzato.'];
        currentState.lastGuides = ['Parti dal fetch e poi osserva come il ROB si riempie: il commit resta sempre in ordine.'];
        render();
    }

    function nextCycle() {
        if (isFinalState(currentState)) {
            stopPlay();
            return;
        }
        stepCycle(currentState);
        render();
        if (isFinalState(currentState)) {
            stopPlay();
        }
    }

    function prevCycle() {
        stopPlay();
        currentState = restorePrevious(currentState);
        render();
    }

    function isFinalState(state) {
        return state.done && !state.rob.length;
    }

    function buildFinalState(key) {
        var state = buildState(key);
        var safe = 0;
        state.disableHistory = true;
        while (safe < 280 && !isFinalState(state)) {
            stepCycle(state);
            safe += 1;
        }
        return clone(state);
    }

    window.NickStudioReorder = {
        exercises: EXERCISES,
        buildFinalState: buildFinalState
    };

    function bind() {
        var selector = byId('reorder-exercise-select');
        var resetBtn = byId('reorder-reset-btn');
        var prevBtn = byId('reorder-prev-btn');
        var nextBtn = byId('reorder-next-btn');
        var playBtn = byId('reorder-play-btn');
        if (!selector) {
            return false;
        }

        selector.value = currentKey;

        selector.addEventListener('change', function () {
            currentKey = selector.value;
            resetCurrent();
        });
        resetBtn.addEventListener('click', resetCurrent);
        prevBtn.addEventListener('click', prevCycle);
        nextBtn.addEventListener('click', nextCycle);
        playBtn.addEventListener('click', function () {
            if (playTimer) {
                stopPlay();
                return;
            }
            playBtn.textContent = 'Stop';
            playTimer = window.setInterval(function () {
                nextCycle();
            }, 800);
        });
        return true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            if (bind()) {
                resetCurrent();
            }
        });
    } else {
        if (bind()) {
            resetCurrent();
        }
    }
}());
