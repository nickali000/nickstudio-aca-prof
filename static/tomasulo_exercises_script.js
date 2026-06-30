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
        raw = String(reg).trim().toUpperCase().replace(/\s+/g, '');
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

    function formatValue(value) {
        if (value === null || typeof value === 'undefined') {
            return '—';
        }
        if (typeof value === 'number') {
            if (Math.abs(value - Math.round(value)) < 1e-9) {
                return String(Math.round(value));
            }
            return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
        }
        return String(value);
    }

    function makeArrayMemory(base, values, stride) {
        var memory = {};
        values.forEach(function (value, index) {
            memory[String(base + index * stride)] = value;
        });
        return memory;
    }

    function mergeMemory(parts) {
        var memory = {};
        parts.forEach(function (part) {
            Object.keys(part).forEach(function (key) {
                memory[key] = part[key];
            });
        });
        return memory;
    }

    function buildLabelMap(program) {
        var labels = {};
        program.forEach(function (instruction, index) {
            if (instruction.label) {
                labels[instruction.label] = index;
            }
        });
        return labels;
    }

    var EXERCISES = {
        ex1: {
            title: 'Esercizio 1',
            description: 'Store senza uso del CDB, branch non speculativo e dipendenza di memoria dovuta a Z = A + 8.',
            buffers: { load: 2, store: 2, add: 2, mul: 2, int: 2 },
            latencies: { load: 2, store: 2, add: 2, mul: 4, div: 9, int: 1 },
            executionUnits: { load: 1, store: 1, add: 1, mul: 1, int: 1 },
            initialInt: { R0: 0 },
            initialFp: {},
            bases: { A: 0, Z: 8, S: 200, C: 300, E: 308 },
            memory: mergeMemory([
                makeArrayMemory(0, [6.9, 7.23, 1.62, 9.263], 8),
                makeArrayMemory(300, [2.4], 8),
                makeArrayMemory(308, [1.1], 8)
            ]),
            loopLabel: 'loop',
            program: [
                { text: 'l.d F10, E(R0)', op: 'l.d', stationType: 'load', dest: 'F10', srcs: ['R0'], base: 'R0', addrLabel: 'E', offset: 0 },
                { text: 'daddi R2, R0, 0', op: 'daddi', stationType: 'int', dest: 'R2', srcs: ['R0'], imm: 0 },
                { text: 'daddi R3, R0, 16', op: 'daddi', stationType: 'int', dest: 'R3', srcs: ['R0'], imm: 16 },
                { text: 'l.d F8, C(R0)', op: 'l.d', stationType: 'load', dest: 'F8', srcs: ['R0'], base: 'R0', addrLabel: 'C', offset: 0 },
                { text: 'l.d F4, A(R2)', label: 'loop', op: 'l.d', stationType: 'load', dest: 'F4', srcs: ['R2'], base: 'R2', addrLabel: 'A', offset: 0 },
                { text: 'div.d F6, F4, F8', op: 'div.d', stationType: 'mul', dest: 'F6', srcs: ['F4', 'F8'] },
                { text: 'daddi R5, R2, 0', op: 'daddi', stationType: 'int', dest: 'R5', srcs: ['R2'], imm: 0 },
                { text: 'daddi R2, R2, 8', op: 'daddi', stationType: 'int', dest: 'R2', srcs: ['R2'], imm: 8 },
                { text: 'sub.d F8, F8, F10', op: 'sub.d', stationType: 'add', dest: 'F8', srcs: ['F8', 'F10'] },
                { text: 's.d F6, Z(R5)', op: 's.d', stationType: 'store', srcs: ['F6', 'R5'], valueReg: 'F6', base: 'R5', addrLabel: 'Z', offset: 0 },
                { text: 'bne R2, R3, loop', op: 'bne', stationType: 'int', srcs: ['R2', 'R3'], target: 'loop' },
                { text: 'daddi R2, R0, 0', op: 'daddi', stationType: 'int', dest: 'R2', srcs: ['R0'], imm: 0 },
                { text: 's.d F8, S(R0)', op: 's.d', stationType: 'store', srcs: ['F8', 'R0'], valueReg: 'F8', base: 'R0', addrLabel: 'S', offset: 0 }
            ]
        },
        ex2: {
            title: 'Esercizio 2',
            description: 'Sequenza con store nel loop e write della store fuori dal CDB, piu\' post-loop finale su Ris.',
            buffers: { load: 2, store: 2, add: 2, mul: 2, int: 3 },
            latencies: { load: 2, store: 2, add: 2, mul: 4, div: 8, int: 1 },
            executionUnits: { load: 1, store: 1, add: 1, mul: 1, int: 1 },
            initialInt: { R0: 0 },
            initialFp: {},
            bases: { A: 0, P: 100, Ris: 200, E: 300, C: 308 },
            memory: mergeMemory([
                makeArrayMemory(0, [6.9, 7.23, 1.62, 9.26], 8),
                makeArrayMemory(300, [1.3], 8),
                makeArrayMemory(308, [5.7], 8)
            ]),
            loopLabel: 'loop',
            program: [
                { text: 'l.d F10, E(R0)', op: 'l.d', stationType: 'load', dest: 'F10', srcs: ['R0'], base: 'R0', addrLabel: 'E', offset: 0 },
                { text: 'l.d F8, C(R0)', op: 'l.d', stationType: 'load', dest: 'F8', srcs: ['R0'], base: 'R0', addrLabel: 'C', offset: 0 },
                { text: 'daddi R3, R0, 16', op: 'daddi', stationType: 'int', dest: 'R3', srcs: ['R0'], imm: 16 },
                { text: 'daddi R2, R3, -16', op: 'daddi', stationType: 'int', dest: 'R2', srcs: ['R3'], imm: -16 },
                { text: 'l.d F2, A(R2)', label: 'loop', op: 'l.d', stationType: 'load', dest: 'F2', srcs: ['R2'], base: 'R2', addrLabel: 'A', offset: 0 },
                { text: 's.d F8, P(R2)', op: 's.d', stationType: 'store', srcs: ['F8', 'R2'], valueReg: 'F8', base: 'R2', addrLabel: 'P', offset: 0 },
                { text: 'daddi R2, R2, 8', op: 'daddi', stationType: 'int', dest: 'R2', srcs: ['R2'], imm: 8 },
                { text: 'sub.d F8, F8, F10', op: 'sub.d', stationType: 'add', dest: 'F8', srcs: ['F8', 'F10'] },
                { text: 'add.d F6, F2, F8', op: 'add.d', stationType: 'add', dest: 'F6', srcs: ['F2', 'F8'] },
                { text: 'mul.d F4, F2, F6', op: 'mul.d', stationType: 'mul', dest: 'F4', srcs: ['F2', 'F6'] },
                { text: 'bne R2, R3, loop', op: 'bne', stationType: 'int', srcs: ['R2', 'R3'], target: 'loop' },
                { text: 's.d F4, Ris(R0)', op: 's.d', stationType: 'store', srcs: ['F4', 'R0'], valueReg: 'F4', base: 'R0', addrLabel: 'Ris', offset: 0 }
            ]
        },
        ex3: {
            title: 'Esercizio 3',
            description: 'Due load iniziali nel loop, una div e due store; il branch blocca il fetch finche\' non viene risolto.',
            buffers: { load: 2, store: 2, add: 2, mul: 2, int: 3 },
            latencies: { load: 2, store: 2, add: 2, mul: 5, div: 8, int: 1 },
            executionUnits: { load: 1, store: 1, add: 1, mul: 1, int: 1 },
            initialInt: { R0: 0 },
            initialFp: {},
            bases: { A: 0, C: 100, D: 200, R: 300, S: 400 },
            memory: mergeMemory([
                makeArrayMemory(0, [7.23, 1.62, 9.26], 8),
                makeArrayMemory(100, [2.34, 3.94, 5.63], 8),
                makeArrayMemory(200, [2.23, 4.55, 6.65], 8)
            ]),
            loopLabel: 'loop',
            program: [
                { text: 'daddi R1, R0, 0', op: 'daddi', stationType: 'int', dest: 'R1', srcs: ['R0'], imm: 0 },
                { text: 'daddi R3, R0, 16', op: 'daddi', stationType: 'int', dest: 'R3', srcs: ['R0'], imm: 16 },
                { text: 'l.d F2, A(R1)', label: 'loop', op: 'l.d', stationType: 'load', dest: 'F2', srcs: ['R1'], base: 'R1', addrLabel: 'A', offset: 0 },
                { text: 'l.d F4, D(R1)', op: 'l.d', stationType: 'load', dest: 'F4', srcs: ['R1'], base: 'R1', addrLabel: 'D', offset: 0 },
                { text: 'div.d F8, F2, F4', op: 'div.d', stationType: 'mul', dest: 'F8', srcs: ['F2', 'F4'] },
                { text: 'l.d F6, C(R1)', op: 'l.d', stationType: 'load', dest: 'F6', srcs: ['R1'], base: 'R1', addrLabel: 'C', offset: 0 },
                { text: 'add.d F9, F2, F6', op: 'add.d', stationType: 'add', dest: 'F9', srcs: ['F2', 'F6'] },
                { text: 'daddi R1, R1, 8', op: 'daddi', stationType: 'int', dest: 'R1', srcs: ['R1'], imm: 8 },
                { text: 's.d F8, -8(R1)', op: 's.d', stationType: 'store', srcs: ['F8', 'R1'], valueReg: 'F8', base: 'R1', addrLabel: 'R', offset: -8 },
                { text: 's.d F9, 0(R1)', op: 's.d', stationType: 'store', srcs: ['F9', 'R1'], valueReg: 'F9', base: 'R1', addrLabel: 'R', offset: 0 },
                { text: 'bne R1, R3, loop', op: 'bne', stationType: 'int', srcs: ['R1', 'R3'], target: 'loop' },
                { text: 'syscall 0', op: 'syscall', stationType: 'int', srcs: [] }
            ]
        }
    };

    function buildStations(config) {
        var groups = { load: [], store: [], add: [], mul: [], int: [] };
        var i;
        for (i = 1; i <= config.buffers.load; i += 1) {
            groups.load.push({ name: 'LB' + i, type: 'load', busy: false });
        }
        for (i = 1; i <= config.buffers.store; i += 1) {
            groups.store.push({ name: 'SB' + i, type: 'store', busy: false });
        }
        for (i = 1; i <= config.buffers.add; i += 1) {
            groups.add.push({ name: 'ADD' + i, type: 'add', busy: false });
        }
        for (i = 1; i <= config.buffers.mul; i += 1) {
            groups.mul.push({ name: 'MUL' + i, type: 'mul', busy: false });
        }
        for (i = 1; i <= config.buffers.int; i += 1) {
            groups.int.push({ name: 'INT' + i, type: 'int', busy: false });
        }
        return groups;
    }

    function allStations(state) {
        return []
            .concat(state.stations.load)
            .concat(state.stations.store)
            .concat(state.stations.add)
            .concat(state.stations.mul)
            .concat(state.stations.int);
    }

    function getStation(state, name) {
        return allStations(state).find(function (station) {
            return station.name === name;
        }) || null;
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
        var labels = buildLabelMap(config.program);
        var registers = collectRegisters(config.program, config.initialInt, config.initialFp);
        var archValues = {};
        var regStatus = {};

        registers.forEach(function (reg) {
            if (isFpReg(reg)) {
                archValues[reg] = Object.prototype.hasOwnProperty.call(config.initialFp || {}, reg) ? config.initialFp[reg] : (reg + '₀');
            } else {
                archValues[reg] = Object.prototype.hasOwnProperty.call(config.initialInt || {}, reg) ? config.initialInt[reg] : 0;
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
            instructions: [],
            fetchQueue: [],
            nextInstructionId: 1,
            loopStartIndex: labels[config.loopLabel],
            loopBranchIndex: config.program.findIndex(function (instruction) {
                return instruction.op === 'bne' && instruction.target === config.loopLabel;
            }),
            loopIteration: 0,
            labelMap: labels,
            stations: buildStations(config),
            archValues: archValues,
            regStatus: regStatus,
            history: [],
            memory: clone(config.memory || {}),
            lsQueue: [],
            lastEvents: [],
            lastGuides: [],
            maxFetch: 80
        };
    }

    function getInstruction(state, id) {
        return state.instructions.find(function (instruction) {
            return instruction.id === id;
        }) || null;
    }

    function computeAddress(state, instruction, baseValue) {
        var base = state.config.bases[instruction.addrLabel] || 0;
        var address = base + Number(baseValue || 0) + Number(instruction.offset || 0);
        return {
            numeric: address,
            label: instruction.addrLabel + '+' + (Number(baseValue || 0) + Number(instruction.offset || 0))
        };
    }

    function readMemory(state, address) {
        if (Object.prototype.hasOwnProperty.call(state.memory, String(address))) {
            return state.memory[String(address)];
        }
        return '@' + address;
    }

    function writeMemory(state, address, value) {
        state.memory[String(address)] = value;
    }

    function resolveSource(state, reg) {
        var normalized = normReg(reg);
        if (!normalized) {
            return { ready: true, value: null, tag: null };
        }
        if (normalized === 'R0') {
            return { ready: true, value: 0, tag: null };
        }
        if (!state.regStatus[normalized]) {
            return { ready: true, value: state.archValues[normalized], tag: null };
        }
        return { ready: false, value: null, tag: state.regStatus[normalized] };
    }

    function issueStation(state, type) {
        return (state.stations[type] || []).find(function (station) {
            return !station.busy;
        }) || null;
    }

    function stationReadyForExecute(station, op) {
        if (op === 'l.d' || op === 'ld') {
            return station.Qj === null;
        }
        if (op === 's.d') {
            return station.Qj === null && station.Qk === null;
        }
        if (op === 'daddi') {
            return station.Qj === null;
        }
        if (op === 'bne') {
            return station.Qj === null && station.Qk === null;
        }
        if (op === 'syscall') {
            return true;
        }
        return station.Qj === null && station.Qk === null;
    }

    function activeExecutions(state, type) {
        return (state.stations[type] || []).filter(function (station) {
            return station.busy && station.executing;
        }).length;
    }

    function formatDynamicText(state, staticIndex, text) {
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
        if (state.done || state.haltedFetch) {
            return;
        }
        if (state.instructions.length >= state.maxFetch) {
            state.haltedFetch = true;
            events.push('Raggiunto il limite di sicurezza di istruzioni dinamiche.');
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
            text: formatDynamicText(state, state.pc, staticInstruction.text),
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
            stationName: null,
            state: 'fetched'
        };
        state.nextInstructionId += 1;
        state.instructions.push(instance);
        state.fetchQueue.push(instance.id);
        events.push('Fetch ' + instance.text + '.');
        if (staticInstruction.op === 'bne') {
            state.haltedFetch = true;
            state.pc = state.pc + 1;
            guides.push('Nel Tomasulo standard il branch ferma il fetch del basic block successivo finche\' non viene risolto.');
        } else {
            state.pc = state.pc + 1;
            guides.push('Anche qui Fetch e Issue sono separati: l\'istruzione appena fetchata si mettera\' in coda per l\'issue.');
        }
    }

    function fillStationOperands(state, station, staticInstruction) {
        var srcA;
        var srcB;
        station.addr = null;
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
            station.Vk = null;
            station.Qj = null;
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
        if (!state.fetchQueue.length) {
            return;
        }
        instructionId = state.fetchQueue[0];
        instruction = getInstruction(state, instructionId);
        if (!instruction || instruction.fetchCycle >= state.cycle) {
            return;
        }
        staticInstruction = state.config.program[instruction.staticIndex];
        station = issueStation(state, staticInstruction.stationType);
        if (!station) {
            events.push('Issue bloccata: nessuna station libera di tipo ' + staticInstruction.stationType.toUpperCase() + '.');
            guides.push('Con Tomasulo lo stallo strutturale nasce quando non hai Reservation Station o Buffer disponibili, non quando manca solo il registro.');
            return;
        }
        station.busy = true;
        station.instructionId = instruction.id;
        station.op = staticInstruction.op;
        station.executing = false;
        station.execRemaining = null;
        station.execDone = false;
        station.result = null;
        station.phase = 'issued';
        station.addrText = null;
        fillStationOperands(state, station, staticInstruction);
        if (instruction.dest) {
            state.regStatus[instruction.dest] = station.name;
        }
        if (staticInstruction.stationType === 'load' || staticInstruction.stationType === 'store') {
            state.lsQueue.push(station.name);
        }
        instruction.issueCycle = state.cycle;
        instruction.stationName = station.name;
        instruction.state = 'waiting';
        state.fetchQueue.shift();
        events.push('Issue ' + instruction.text + ' -> ' + station.name + '.');
        guides.push('Nell\'issue di Tomasulo salvi direttamente i valori pronti in Vj/Vk, mentre per gli operandi mancanti metti i tag nei campi Q.');
    }

    function canStartLs(state, station) {
        return state.lsQueue.length && state.lsQueue[0] === station.name;
    }

    function startExecutions(state, events, guides) {
        allStations(state).forEach(function (station) {
            var instruction;
            var staticInstruction;
            if (!station.busy || station.executing || station.execDone) {
                return;
            }
            instruction = getInstruction(state, station.instructionId);
            staticInstruction = instruction ? state.config.program[instruction.staticIndex] : null;
            if (!instruction || !staticInstruction || instruction.issueCycle >= state.cycle) {
                return;
            }
            if (!stationReadyForExecute(station, staticInstruction.op)) {
                return;
            }
            if (activeExecutions(state, station.type) >= state.config.executionUnits[station.type]) {
                return;
            }
            if ((station.type === 'load' || station.type === 'store') && !canStartLs(state, station)) {
                return;
            }
            station.executing = true;
            station.phase = 'execute';
            station.execRemaining = staticInstruction.op === 'l.d' || staticInstruction.op === 'ld' ? state.config.latencies.load :
                (staticInstruction.op === 's.d' ? state.config.latencies.store :
                    (staticInstruction.op === 'add.d' || staticInstruction.op === 'sub.d' ? state.config.latencies.add :
                        (staticInstruction.op === 'mul.d' ? state.config.latencies.mul :
                            (staticInstruction.op === 'div.d' ? state.config.latencies.div : state.config.latencies.int))));
            instruction.execStartCycle = state.cycle;
            instruction.state = 'executing';
            if (staticInstruction.base) {
                station.addr = computeAddress(state, staticInstruction, station.Vj);
                station.addrText = staticInstruction.addrLabel + ' @ ' + station.addr.numeric;
            }
            events.push('Execute start: ' + instruction.text + ' su ' + station.name + '.');
            guides.push('Le load e le store qui usano una coda conservativa: possono partire solo quando sono in testa alla load/store queue.');
        });
    }

    function computeResult(state, instruction, station, staticInstruction) {
        var a = station.Vj;
        var b = station.Vk;
        if (staticInstruction.op === 'daddi') {
            return Number(a) + Number(staticInstruction.imm || 0);
        }
        if (staticInstruction.op === 'l.d' || staticInstruction.op === 'ld') {
            return readMemory(state, station.addr.numeric);
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
            return a !== b;
        }
        if (staticInstruction.op === 'syscall') {
            return 'syscall';
        }
        return instruction.dest ? (instruction.dest + '#res') : 'ok';
    }

    function advanceExecutions(state, events) {
        allStations(state).forEach(function (station) {
            var instruction;
            var staticInstruction;
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
            station.result = computeResult(state, instruction, station, staticInstruction);
            instruction.execEndCycle = state.cycle;
            instruction.state = 'wait-write';
            events.push('Execute end: ' + instruction.text + '.');
        });
    }

    function broadcast(state, stationName, value) {
        allStations(state).forEach(function (station) {
            if (!station.busy) {
                return;
            }
            if (station.Qj === stationName) {
                station.Qj = null;
                station.Vj = value;
            }
            if (station.Qk === stationName) {
                station.Qk = null;
                station.Vk = value;
            }
        });
    }

    function releaseStation(station) {
        station.busy = false;
        station.instructionId = null;
        station.op = null;
        station.executing = false;
        station.execRemaining = null;
        station.execDone = false;
        station.result = null;
        station.phase = null;
        station.Vj = null;
        station.Vk = null;
        station.Qj = null;
        station.Qk = null;
        station.addr = null;
        station.addrText = null;
    }

    function writeCandidates(state) {
        var nonCdb = [];
        var cdb = [];
        allStations(state).forEach(function (station) {
            var instruction;
            var staticInstruction;
            if (!station.busy || !station.execDone) {
                return;
            }
            instruction = getInstruction(state, station.instructionId);
            staticInstruction = instruction ? state.config.program[instruction.staticIndex] : null;
            if (!instruction || !staticInstruction || instruction.execEndCycle >= state.cycle) {
                return;
            }
            if (staticInstruction.op === 's.d' || staticInstruction.op === 'bne' || staticInstruction.op === 'syscall') {
                nonCdb.push(station);
            } else {
                cdb.push(station);
            }
        });
        return {
            nonCdb: nonCdb.sort(function (a, b) { return a.instructionId - b.instructionId; }),
            cdb: cdb.sort(function (a, b) { return a.instructionId - b.instructionId; })
        };
    }

    function removeFromLsQueue(state, stationName) {
        if (state.lsQueue.length && state.lsQueue[0] === stationName) {
            state.lsQueue.shift();
            return;
        }
        state.lsQueue = state.lsQueue.filter(function (name) {
            return name !== stationName;
        });
    }

    function doNonCdbWrite(state, station, events, guides) {
        var instruction = getInstruction(state, station.instructionId);
        var staticInstruction = state.config.program[instruction.staticIndex];
        instruction.writeCycle = state.cycle;
        instruction.state = 'done';
        if (staticInstruction.op === 's.d') {
            writeMemory(state, station.addr.numeric, station.Vk);
            removeFromLsQueue(state, station.name);
            events.push('Store write: ' + instruction.text + ' scrive in memoria a ' + station.addr.numeric + '.');
            guides.push('Qui vale l\'ipotesi della traccia: la store non usa il Common Data Bus, quindi la sua write non blocca il CDB.');
        } else if (staticInstruction.op === 'bne') {
            state.haltedFetch = false;
            state.pc = station.result ? state.labelMap[staticInstruction.target] : (instruction.staticIndex + 1);
            events.push('Branch risolto: ' + instruction.text + ' = ' + (station.result ? 'taken' : 'not taken') + '.');
            guides.push('Nel Tomasulo standard il branch risolto sblocca il fetch: se e\' preso si torna al loop, altrimenti si prosegue oltre.');
        } else if (staticInstruction.op === 'syscall') {
            state.done = true;
            events.push('Syscall completata: simulazione terminata.');
        }
        releaseStation(station);
    }

    function doCdbWrite(state, station, events, guides) {
        var instruction = getInstruction(state, station.instructionId);
        var staticInstruction = state.config.program[instruction.staticIndex];
        var value = station.result;
        instruction.writeCycle = state.cycle;
        instruction.state = 'done';
        if (instruction.dest && state.regStatus[instruction.dest] === station.name) {
            state.archValues[instruction.dest] = value;
            state.regStatus[instruction.dest] = null;
        }
        broadcast(state, station.name, value);
        if (staticInstruction.op === 'l.d' || staticInstruction.op === 'ld') {
            removeFromLsQueue(state, station.name);
        }
        events.push('CDB write: ' + instruction.text + ' diffonde ' + formatValue(value) + ' dal tag ' + station.name + '.');
        guides.push('Quando il risultato passa sul CDB, tutte le station che aspettavano quel tag aggiornano subito Vj/Vk: e\' il forwarding tipico di Tomasulo.');
        releaseStation(station);
    }

    function writeStage(state, events, guides) {
        var candidates = writeCandidates(state);
        candidates.nonCdb.forEach(function (station) {
            doNonCdbWrite(state, station, events, guides);
        });
        if (candidates.cdb.length) {
            doCdbWrite(state, candidates.cdb[0], events, guides);
            if (candidates.cdb.length > 1) {
                events.push('Una sola write su CDB per ciclo: le altre write restano in attesa.');
            }
        }
    }

    function stepCycle(state) {
        var events = [];
        var guides = [];
        if (state.done && !state.fetchQueue.length && allStations(state).every(function (station) { return !station.busy; })) {
            state.lastEvents = ['La simulazione e\' gia\' terminata.'];
            state.lastGuides = ['Puoi resettare o cambiare esercizio per ripartire.'];
            return;
        }
        if (!state.disableHistory) {
            state.history.push(cloneStateForHistory(state));
        }
        state.cycle += 1;

        writeStage(state, events, guides);
        startExecutions(state, events, guides);
        advanceExecutions(state, events);
        issueNext(state, events, guides);
        fetchNext(state, events, guides);

        if (state.pc >= state.config.program.length &&
            !state.fetchQueue.length && allStations(state).every(function (station) { return !station.busy; })) {
            state.done = true;
        }
        if (!events.length) {
            events.push('Nessun avanzamento significativo in questo ciclo.');
        }
        if (!guides.length) {
            guides.push('Controlla i tag Qj/Qk, il Register Result Status e la coda load/store: sono loro che spiegano quasi tutti gli stalli di Tomasulo.');
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

    function previousState(state) {
        if (!state.history.length) {
            return state;
        }
        return state.history.pop();
    }

    function instructionState(instruction) {
        if (instruction.writeCycle !== null) {
            return { label: 'written', className: 'write' };
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
        var summary = byId('tomasulo-summary');
        clear(summary);
        [
            ['Esercizio', state.config.title],
            ['Ciclo', state.cycle],
            ['Istruzioni dinamiche', state.instructions.length],
            ['Coda fetch', state.fetchQueue.length],
            ['Fetch branch-stall', state.haltedFetch ? 'yes' : 'no'],
            ['Load/Store queue', state.lsQueue.length ? state.lsQueue.join(' -> ') : 'vuota'],
            ['PC statico', state.haltedFetch ? 'branch wait' : state.pc]
        ].forEach(function (item) {
            var pill = el('div', 'status-pill');
            pill.appendChild(el('strong', '', item[0] + ':'));
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

    function renderStations(state) {
        var body = byId('tomasulo-station-body');
        clear(body);
        allStations(state).forEach(function (station) {
            var row = el('tr', '');
            [
                station.name,
                station.type,
                station.busy ? 'yes' : 'no',
                station.busy ? station.op : '—',
                station.busy ? formatValue(station.Vj) : '—',
                station.busy ? formatValue(station.Vk) : '—',
                station.busy && station.Qj !== null ? station.Qj : '—',
                station.busy && station.Qk !== null ? station.Qk : '—',
                station.busy ? (station.addrText || '—') : '—',
                station.busy ? (station.phase || 'issued') : 'free'
            ].forEach(function (value) {
                row.appendChild(el('td', '', value));
            });
            body.appendChild(row);
        });
    }

    function renderRegisters(state) {
        var body = byId('tomasulo-register-body');
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
                row.appendChild(el('td', '', state.regStatus[reg] || '—'));
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
        var body = byId('tomasulo-instruction-body');
        clear(body);
        state.instructions.forEach(function (instruction) {
            var row = el('tr', '');
            var badge = el('span', 'instruction-state ' + instructionState(instruction).className, instructionState(instruction).label);
            var stateCell = el('td', '');
            stateCell.appendChild(badge);
            row.appendChild(el('td', '', String(instruction.id)));
            row.appendChild(el('td', '', instruction.text));
            row.appendChild(stateCell);
            row.appendChild(el('td', '', instruction.stationName || '—'));
            row.appendChild(el('td', '', instruction.fetchCycle === null ? '—' : String(instruction.fetchCycle)));
            row.appendChild(el('td', '', instruction.issueCycle === null ? '—' : String(instruction.issueCycle)));
            row.appendChild(el('td', '', execRange(instruction)));
            row.appendChild(el('td', '', instruction.writeCycle === null ? '—' : String(instruction.writeCycle)));
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
        var playBtn = byId('tomasulo-play-btn');
        if (playTimer) {
            window.clearInterval(playTimer);
            playTimer = null;
        }
        if (playBtn) {
            playBtn.textContent = 'Play';
        }
    }

    function render() {
        renderSummary(currentState);
        renderList('tomasulo-events', currentState.lastEvents || ['Seleziona un esercizio e avanza di un ciclo.']);
        renderList('tomasulo-guide', currentState.lastGuides || ['Osserva soprattutto tag, CDB, Register Result Status e coda load/store.']);
        renderStations(currentState);
        renderRegisters(currentState);
        renderInstructions(currentState);
    }

    function resetCurrent() {
        stopPlay();
        currentState = buildState(currentKey);
        currentState.lastEvents = ['Simulatore inizializzato.'];
        currentState.lastGuides = ['Qui il punto chiave e\' distinguere bene station, CDB e Register Result Status: il Tomasulo vive di tag e forwarding.'];
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
        currentState = previousState(currentState);
        render();
    }

    function isFinalState(state) {
        return state.done && !state.fetchQueue.length && allStations(state).every(function (station) { return !station.busy; });
    }

    function buildFinalState(key) {
        var state = buildState(key);
        var safe = 0;
        state.disableHistory = true;
        while (safe < 240 && !isFinalState(state)) {
            stepCycle(state);
            safe += 1;
        }
        return clone(state);
    }

    window.NickStudioTomasulo = {
        exercises: EXERCISES,
        buildFinalState: buildFinalState
    };

    function bind() {
        var selector = byId('tomasulo-exercise-select');
        var resetBtn = byId('tomasulo-reset-btn');
        var prevBtn = byId('tomasulo-prev-btn');
        var nextBtn = byId('tomasulo-next-btn');
        var playBtn = byId('tomasulo-play-btn');
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
            playTimer = window.setInterval(nextCycle, 800);
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
