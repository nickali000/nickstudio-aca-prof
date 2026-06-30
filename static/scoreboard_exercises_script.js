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

    function normReg(reg) {
        if (!reg) {
            return null;
        }
        return String(reg).replace(/\$/g, '').trim().toUpperCase();
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function tagInstruction(instr, label) {
        var copy = clone(instr);
        if (label) {
            copy.text = '[' + label + '] ' + copy.text;
        }
        return copy;
    }

    function buildDynamicProgram(prelude, loopBody, iterations, postlude) {
        var program = [];
        prelude.forEach(function (instr) {
            program.push(tagInstruction(instr, null));
        });
        for (var i = 0; i < iterations; i += 1) {
            loopBody.forEach(function (instr) {
                program.push(tagInstruction(instr, 'iter ' + (i + 1)));
            });
        }
        postlude.forEach(function (instr) {
            program.push(tagInstruction(instr, null));
        });
        return program;
    }

    var EXERCISES = {
        ex1: {
            title: 'Esercizio 1',
            description: 'Caso base con mul.d, store, sub.d e branch. Il loop viene espanso dinamicamente su 2 iterazioni.',
            issueWidth: 1,
            fetchWidth: 1,
            rules: {
                storeSerialization: false,
                loadBlockedByStoreUntilRead: false,
                fetchBlockedUntilPreviousIssue: true,
                issueUsesStartOfCycleFu: true,
                issueUsesStartOfCycleRegisters: true,
                readUsesStartOfCycleValues: true,
                singleWritePerCycle: true,
                loadExecuteLatency: 2
            },
            units: { int: 2, fpAdd: 2, fpMul: 1, fpDiv: 1 },
            latencies: { int: 1, fpAdd: 2, fpMul: 4, fpDiv: 8 },
            instructions: buildDynamicProgram([
                { text: 'daddi R2, R0, 16', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R0'], hasWrite: true },
                { text: 'l.d F8, C(R0)', op: 'l.d', fuType: 'int', dest: 'F8', srcs: ['R0'], hasWrite: true, latency: 2 },
                { text: 'daddi R5, R0, 0', op: 'daddi', fuType: 'int', dest: 'R5', srcs: ['R0'], hasWrite: true }
            ], [
                { text: 'l.d F4, A(R2)', op: 'l.d', fuType: 'int', dest: 'F4', srcs: ['R2'], hasWrite: true, latency: 2 },
                { text: 'mul.d F6, F4, F8', op: 'mul.d', fuType: 'fpMul', dest: 'F6', srcs: ['F4', 'F8'], hasWrite: true },
                { text: 'daddi R2, R2, -8', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R2'], hasWrite: true },
                { text: 's.d F6, Ris(R5)', op: 's.d', fuType: 'int', dest: null, srcs: ['F6', 'R5'], hasWrite: true },
                { text: 'sub.d F8, F8, F10', op: 'sub.d', fuType: 'fpAdd', dest: 'F8', srcs: ['F8', 'F10'], hasWrite: true },
                { text: 'daddi R5, R5, 8', op: 'daddi', fuType: 'int', dest: 'R5', srcs: ['R5'], hasWrite: true },
                { text: 'bne R2, R0, loop', op: 'bne', fuType: 'int', dest: null, srcs: ['R2', 'R0'], hasWrite: true }
            ], 2, [
                { text: 'daddi R2, R0, 16', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R0'], hasWrite: true }
            ])
        },
        ex2: {
            title: 'Esercizio 2',
            description: 'Due store consecutive con regola speciale di issue. Il loop viene espanso dinamicamente su 2 iterazioni.',
            issueWidth: 1,
            fetchWidth: 1,
            rules: {
                storeSerialization: true,
                loadBlockedByStoreUntilRead: false,
                fetchBlockedUntilPreviousIssue: true,
                issueUsesStartOfCycleFu: true,
                issueUsesStartOfCycleRegisters: true,
                readUsesStartOfCycleValues: true,
                singleWritePerCycle: true,
                loadExecuteLatency: 2
            },
            units: { int: 3, fpAdd: 2, fpMul: 1, fpDiv: 1 },
            latencies: { int: 1, fpAdd: 2, fpMul: 4, fpDiv: 10 },
            instructions: buildDynamicProgram([
                { text: 'daddi R1, R0, 0', op: 'daddi', fuType: 'int', dest: 'R1', srcs: ['R0'], hasWrite: true },
                { text: 'daddi R3, R0, 16', op: 'daddi', fuType: 'int', dest: 'R3', srcs: ['R0'], hasWrite: true }
            ], [
                { text: 'ld R4, C(R1)', op: 'ld', fuType: 'int', dest: 'R4', srcs: ['R1'], hasWrite: true, latency: 2 },
                { text: 'l.d F2, A(R1)', op: 'l.d', fuType: 'int', dest: 'F2', srcs: ['R1'], hasWrite: true, latency: 2 },
                { text: 'sub.d F8, F2, F8', op: 'sub.d', fuType: 'fpAdd', dest: 'F8', srcs: ['F2', 'F8'], hasWrite: true },
                { text: 'l.d F5, OP(R4)', op: 'l.d', fuType: 'int', dest: 'F5', srcs: ['R4'], hasWrite: true, latency: 2 },
                { text: 'mul.d F6, F2, F5', op: 'mul.d', fuType: 'fpMul', dest: 'F6', srcs: ['F2', 'F5'], hasWrite: true },
                { text: 'daddi R1, R1, 8', op: 'daddi', fuType: 'int', dest: 'R1', srcs: ['R1'], hasWrite: true },
                { text: 's.d F6, -8(R1)', op: 's.d', fuType: 'int', dest: null, srcs: ['F6', 'R1'], hasWrite: true },
                { text: 's.d F8, 0(R1)', op: 's.d', fuType: 'int', dest: null, srcs: ['F8', 'R1'], hasWrite: true },
                { text: 'bne R1, R3, loop', op: 'bne', fuType: 'int', dest: null, srcs: ['R1', 'R3'], hasWrite: true }
            ], 2, [
                { text: 'syscall 0', op: 'syscall', fuType: 'int', dest: null, srcs: [], hasWrite: true }
            ])
        },
        ex3: {
            title: 'Esercizio 3',
            description: 'Sequenza con sub.d su F8 e add.d finale prima del branch. Il loop viene espanso dinamicamente su 2 iterazioni.',
            issueWidth: 1,
            fetchWidth: 1,
            rules: {
                storeSerialization: false,
                loadBlockedByStoreUntilRead: false,
                fetchBlockedUntilPreviousIssue: true,
                issueUsesStartOfCycleFu: true,
                issueUsesStartOfCycleRegisters: true,
                readUsesStartOfCycleValues: true,
                singleWritePerCycle: true,
                loadExecuteLatency: 2
            },
            units: { int: 2, fpAdd: 2, fpMul: 1, fpDiv: 1 },
            latencies: { int: 1, fpAdd: 2, fpMul: 4, fpDiv: 8 },
            instructions: buildDynamicProgram([
                { text: 'daddi R2, R0, 0', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R0'], hasWrite: true },
                { text: 'daddi R3, R0, 16', op: 'daddi', fuType: 'int', dest: 'R3', srcs: ['R0'], hasWrite: true },
                { text: 'l.d F8, K($0)', op: 'l.d', fuType: 'int', dest: 'F8', srcs: ['R0'], hasWrite: true, latency: 2 }
            ], [
                { text: 'l.d F10, OB(R2)', op: 'l.d', fuType: 'int', dest: 'F10', srcs: ['R2'], hasWrite: true, latency: 2 },
                { text: 'sub.d F8, F8, F10', op: 'sub.d', fuType: 'fpAdd', dest: 'F8', srcs: ['F8', 'F10'], hasWrite: true },
                { text: 'l.d F4, OA(R2)', op: 'l.d', fuType: 'int', dest: 'F4', srcs: ['R2'], hasWrite: true, latency: 2 },
                { text: 'daddi R2, R2, 8', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R2'], hasWrite: true },
                { text: 'add.d F6, F4, F8', op: 'add.d', fuType: 'fpAdd', dest: 'F6', srcs: ['F4', 'F8'], hasWrite: true },
                { text: 'bne R2, R3, loop', op: 'bne', fuType: 'int', dest: null, srcs: ['R2', 'R3'], hasWrite: true }
            ], 2, [
                { text: 's.d F6, C(R2)', op: 's.d', fuType: 'int', dest: null, srcs: ['F6', 'R2'], hasWrite: true },
                { text: 'daddi R2, R0, 0', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R0'], hasWrite: true }
            ])
        },
        ex3a: {
            title: 'Esercizio 3a',
            description: 'Versione ambigua della traccia: nel simulatore assumo il branch presente come nella tabella istruzioni e quindi espando 2 iterazioni.',
            issueWidth: 1,
            fetchWidth: 1,
            rules: {
                storeSerialization: false,
                loadBlockedByStoreUntilRead: false,
                fetchBlockedUntilPreviousIssue: true,
                issueUsesStartOfCycleFu: true,
                issueUsesStartOfCycleRegisters: true,
                readUsesStartOfCycleValues: true,
                singleWritePerCycle: true,
                loadExecuteLatency: 2
            },
            units: { int: 2, fpAdd: 2, fpMul: 1, fpDiv: 1 },
            latencies: { int: 1, fpAdd: 2, fpMul: 4, fpDiv: 8 },
            instructions: buildDynamicProgram([
                { text: 'daddi R2, R0, 0', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R0'], hasWrite: true },
                { text: 'daddi R3, R0, 16', op: 'daddi', fuType: 'int', dest: 'R3', srcs: ['R0'], hasWrite: true },
                { text: 'l.d F8, K($0)', op: 'l.d', fuType: 'int', dest: 'F8', srcs: ['R0'], hasWrite: true, latency: 2 }
            ], [
                { text: 'l.d F10, OB(R2)', op: 'l.d', fuType: 'int', dest: 'F10', srcs: ['R2'], hasWrite: true, latency: 2 },
                { text: 'sub.d F8, F8, F10', op: 'sub.d', fuType: 'fpAdd', dest: 'F8', srcs: ['F8', 'F10'], hasWrite: true },
                { text: 'l.d F4, OA(R2)', op: 'l.d', fuType: 'int', dest: 'F4', srcs: ['R2'], hasWrite: true, latency: 2 },
                { text: 'daddi R2, R2, 8', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R2'], hasWrite: true },
                { text: 'add.d F6, F4, F8', op: 'add.d', fuType: 'fpAdd', dest: 'F6', srcs: ['F4', 'F8'], hasWrite: true },
                { text: 'bne R2, R3, loop', op: 'bne', fuType: 'int', dest: null, srcs: ['R2', 'R3'], hasWrite: true }
            ], 2, [
                { text: 's.d F6, C(R2)', op: 's.d', fuType: 'int', dest: null, srcs: ['F6', 'R2'], hasWrite: true },
                { text: 'daddi R2, R0, 0', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R0'], hasWrite: true }
            ])
        },
        ex4: {
            title: 'Esercizio 4',
            description: 'Caso con div.d e regola speciale store/load per prevenire RAW. Il loop viene espanso dinamicamente su 2 iterazioni.',
            issueWidth: 1,
            fetchWidth: 1,
            rules: {
                storeSerialization: false,
                loadBlockedByStoreUntilRead: true,
                fetchBlockedUntilPreviousIssue: true,
                issueUsesStartOfCycleFu: true,
                issueUsesStartOfCycleRegisters: true,
                readUsesStartOfCycleValues: true,
                singleWritePerCycle: true,
                loadExecuteLatency: 2
            },
            units: { int: 3, fpAdd: 2, fpMul: 2, fpDiv: 1 },
            latencies: { int: 1, fpAdd: 2, fpMul: 4, fpDiv: 8 },
            instructions: buildDynamicProgram([
                { text: 'l.d F8, C(R0)', op: 'l.d', fuType: 'int', dest: 'F8', srcs: ['R0'], hasWrite: true, latency: 2 },
                { text: 'daddi R2, R0, 0', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R0'], hasWrite: true },
                { text: 'daddi R3, R0, 16', op: 'daddi', fuType: 'int', dest: 'R3', srcs: ['R0'], hasWrite: true }
            ], [
                { text: 'l.d F4, A(R2)', op: 'l.d', fuType: 'int', dest: 'F4', srcs: ['R2'], hasWrite: true, latency: 2 },
                { text: 'div.d F6, F4, F8', op: 'div.d', fuType: 'fpDiv', dest: 'F6', srcs: ['F4', 'F8'], hasWrite: true },
                { text: 'daddi R5, R2, 0', op: 'daddi', fuType: 'int', dest: 'R5', srcs: ['R2'], hasWrite: true },
                { text: 'daddi R2, R2, 8', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R2'], hasWrite: true },
                { text: 'sub.d F8, F8, F10', op: 'sub.d', fuType: 'fpAdd', dest: 'F8', srcs: ['F8', 'F10'], hasWrite: true },
                { text: 's.d F6, Z(R5)', op: 's.d', fuType: 'int', dest: null, srcs: ['F6', 'R5'], hasWrite: true },
                { text: 'bne R2, R3, loop', op: 'bne', fuType: 'int', dest: null, srcs: ['R2', 'R3'], hasWrite: true }
            ], 2, [
                { text: 'daddi R2, R0, 0', op: 'daddi', fuType: 'int', dest: 'R2', srcs: ['R0'], hasWrite: true },
                { text: 's.d F8, S(R0)', op: 's.d', fuType: 'int', dest: null, srcs: ['F8', 'R0'], hasWrite: true }
            ])
        }
    };

    function buildFUList(units) {
        var list = [];
        var i;
        for (i = 1; i <= units.int; i += 1) {
            list.push({ name: 'INT' + i, type: 'int', busy: false, instrId: null });
        }
        for (i = 1; i <= units.fpAdd; i += 1) {
            list.push({ name: 'ADD' + i, type: 'fpAdd', busy: false, instrId: null });
        }
        for (i = 1; i <= units.fpMul; i += 1) {
            list.push({ name: 'MUL' + i, type: 'fpMul', busy: false, instrId: null });
        }
        for (i = 1; i <= units.fpDiv; i += 1) {
            list.push({ name: 'DIV' + i, type: 'fpDiv', busy: false, instrId: null });
        }
        return list;
    }

    function collectRegisters(instructions) {
        var regs = [];
        instructions.forEach(function (instr) {
            if (instr.dest) {
                regs.push(normReg(instr.dest));
            }
            instr.srcs.forEach(function (src) {
                var normalized = normReg(src);
                if (normalized && normalized !== 'R0') {
                    regs.push(normalized);
                }
            });
        });
        return regs.filter(function (reg, idx, arr) {
            return reg && arr.indexOf(reg) === idx;
        }).sort(function (a, b) {
            var letterA = a[0];
            var letterB = b[0];
            if (letterA !== letterB) {
                return letterA.localeCompare(letterB);
            }
            return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
        });
    }

    function buildState(config) {
        return {
            cycle: 0,
            config: config,
            instructions: config.instructions.map(function (instr, index) {
                return {
                    id: index,
                    text: instr.text,
                    op: instr.op,
                    fuType: instr.fuType,
                    dest: instr.dest ? normReg(instr.dest) : null,
                    srcs: instr.srcs.map(normReg),
                    hasWrite: instr.hasWrite,
                    latency: instr.latency || config.latencies[instr.fuType],
                    fetchCycle: null,
                    issueCycle: null,
                    readCycle: null,
                    execStartCycle: null,
                    execCompleteCycle: null,
                    completeCycle: null,
                    writeCycle: null,
                    execProgress: 0,
                    sourceDeps: [],
                    fuName: null
                };
            }),
            fus: buildFUList(config.units),
            registerStatus: {},
            registers: collectRegisters(config.instructions),
            nextFetch: 0,
            nextIssue: 0
        };
    }

    function isFinished(instr) {
        return instr.hasWrite ? instr.writeCycle !== null : instr.completeCycle !== null;
    }

    function canDepRead(startStatus, instructions, depId, useStartValues) {
        if (depId === null || depId === undefined) {
            return true;
        }
        var depInstr = useStartValues ? (startStatus[depId] || instructions[depId]) : instructions[depId];
        return depInstr.writeCycle !== null || depInstr.completeCycle !== null;
    }

    function findFreeFU(state, fuType, startFus) {
        return state.fus.find(function (fu) {
            var startFu = startFus
                ? startFus.find(function (item) { return item.name === fu.name; })
                : null;
            return fu.type === fuType && !fu.busy && (!startFu || !startFu.busy);
        }) || null;
    }

    function releaseFU(state, fuName) {
        var fu = state.fus.find(function (item) { return item.name === fuName; });
        if (fu) {
            fu.busy = false;
            fu.instrId = null;
        }
    }

    function activeStorePendingWrite(state, startInstructions, useStartValues) {
        return state.instructions.some(function (instr) {
            var status = useStartValues ? (startInstructions[instr.id] || instr) : instr;
            return instr.op === 's.d' && status.issueCycle !== null && status.writeCycle === null;
        });
    }

    function pendingStoreWithoutRead(state, startInstructions) {
        return state.instructions.some(function (instr) {
            return instr.op === 's.d' &&
                instr.issueCycle !== null &&
                startInstructions[instr.id].readCycle === null &&
                instr.writeCycle === null;
        });
    }

    function hasWarConflict(candidate, state) {
        if (!candidate.dest) {
            return [];
        }
        return state.instructions.filter(function (instr) {
            return instr.issueCycle !== null &&
                instr.issueCycle < candidate.issueCycle &&
                instr.readCycle === null &&
                instr.srcs.indexOf(candidate.dest) !== -1;
        });
    }

    function buildGuide(snapshot) {
        var items = [];
        var instructions = snapshot.instructions;
        var issueCandidate = instructions.find(function (instr) {
            return instr.fetchCycle !== null && instr.issueCycle === null;
        });
        if (issueCandidate) {
            items.push('1. Prova prima l\'issue della prossima istruzione in ordine: ' + issueCandidate.text);
        } else {
            items.push('1. Tutte le istruzioni fetchate sono gia\' andate oltre la fase di issue.');
        }

        var waitingRead = instructions.filter(function (instr) {
            return instr.issueCycle !== null && instr.readCycle === null;
        });
        if (waitingRead.length) {
            items.push('2. Controlla le RAW per chi aspetta la fase di Read: ' + waitingRead.map(function (instr) {
                return instr.text;
            }).join(' | '));
        } else {
            items.push('2. Nessuna istruzione e\' bloccata prima della Read.');
        }

        var executing = instructions.filter(function (instr) {
            return instr.execStartCycle !== null && instr.execCompleteCycle === null;
        });
        if (executing.length) {
            items.push('3. Fai avanzare Execute sulle FU occupate e aggiorna il conto dei cicli residui.');
        } else {
            items.push('3. In questo ciclo non ci sono FU in Execute attivo.');
        }

        var readyToWrite = instructions.filter(function (instr) {
            return instr.hasWrite && instr.execCompleteCycle !== null && instr.writeCycle === null;
        });
        if (readyToWrite.length) {
            items.push('4. Prima di Write controlla sempre un possibile WAR sui registri di destinazione.');
        } else {
            items.push('4. Nessuna Write pending da verificare in questo ciclo.');
        }

        return items;
    }

    function stepSimulation(state) {
        state.cycle += 1;
        var cycle = state.cycle;
        var events = [];
        var startInstructions = state.instructions.map(function (instr) {
            return {
                issueCycle: instr.issueCycle,
                readCycle: instr.readCycle,
                writeCycle: instr.writeCycle,
                completeCycle: instr.completeCycle
            };
        });
        var startFus = state.fus.map(function (fu) {
            return {
                name: fu.name,
                busy: fu.busy,
                instrId: fu.instrId
            };
        });
        var startRegisterStatus = clone(state.registerStatus);
        var writeUsed = false;

        state.instructions.forEach(function (instr) {
            if (instr.hasWrite && instr.execCompleteCycle !== null && instr.writeCycle === null && instr.execCompleteCycle < cycle) {
                var warConflicts = hasWarConflict(instr, state);
                if (warConflicts.length) {
                    events.push('Write bloccata per ' + instr.text + ': WAR con ' + warConflicts.map(function (item) {
                        return item.text;
                    }).join(' ; '));
                } else if (state.config.rules.singleWritePerCycle && writeUsed) {
                    events.push('Write bloccata per ' + instr.text + ': porta di Write gia\' usata in questo ciclo.');
                } else {
                    instr.writeCycle = cycle;
                    writeUsed = true;
                    if (instr.dest && state.registerStatus[instr.dest] === instr.id) {
                        delete state.registerStatus[instr.dest];
                    }
                    releaseFU(state, instr.fuName);
                    events.push('Write completata: ' + instr.text);
                }
            }
        });

        state.instructions.forEach(function (instr) {
            if (!instr.hasWrite && instr.execCompleteCycle !== null && instr.completeCycle === null && instr.execCompleteCycle < cycle) {
                instr.completeCycle = cycle;
                releaseFU(state, instr.fuName);
                events.push('Istruzione completata senza write: ' + instr.text);
            }
        });

        state.instructions.forEach(function (instr) {
            if (instr.issueCycle !== null && instr.readCycle === null && instr.issueCycle < cycle) {
                var waiting = instr.sourceDeps.filter(function (depId) {
                    return !canDepRead(
                        startInstructions,
                        state.instructions,
                        depId,
                        state.config.rules.readUsesStartOfCycleValues
                    );
                });
                if (waiting.length === 0) {
                    instr.readCycle = cycle;
                    events.push('Read operand eseguita: ' + instr.text);
                } else {
                    events.push('Read bloccata per ' + instr.text + ': RAW su ' + waiting.map(function (depId) {
                        return state.instructions[depId].text;
                    }).join(' ; '));
                }
            }
        });

        var issueCandidate = state.instructions[state.nextIssue];
        if (issueCandidate && issueCandidate.fetchCycle !== null && issueCandidate.fetchCycle < cycle) {
            var issueReasons = [];
            var freeFU = findFreeFU(
                state,
                issueCandidate.fuType,
                state.config.rules.issueUsesStartOfCycleFu ? startFus : null
            );

            if (!freeFU) {
                issueReasons.push('hazard strutturale: nessuna FU ' + issueCandidate.fuType + ' libera');
            }
            var issueRegisterStatus = state.config.rules.issueUsesStartOfCycleRegisters
                ? startRegisterStatus
                : state.registerStatus;
            if (issueCandidate.dest && issueRegisterStatus[issueCandidate.dest] !== undefined) {
                issueReasons.push('WAW su ' + issueCandidate.dest);
            }
            if (state.config.rules.storeSerialization &&
                issueCandidate.op === 's.d' &&
                activeStorePendingWrite(state, startInstructions, state.config.rules.issueUsesStartOfCycleFu)) {
                issueReasons.push('regola della traccia: seconda s.d bloccata finche\' la prima non termina');
            }
            if (state.config.rules.loadBlockedByStoreUntilRead && (issueCandidate.op === 'l.d' || issueCandidate.op === 'ld') && pendingStoreWithoutRead(state, startInstructions)) {
                issueReasons.push('regola della traccia: load bloccata da store che non ha ancora completato Read');
            }

            if (issueReasons.length === 0) {
                issueCandidate.issueCycle = cycle;
                issueCandidate.fuName = freeFU.name;
                issueCandidate.sourceDeps = issueCandidate.srcs.map(function (src) {
                    if (!src || src === 'R0') {
                        return null;
                    }
                    return state.registerStatus[src] !== undefined ? state.registerStatus[src] : null;
                });
                freeFU.busy = true;
                freeFU.instrId = issueCandidate.id;
                if (issueCandidate.dest) {
                    state.registerStatus[issueCandidate.dest] = issueCandidate.id;
                }
                state.nextIssue += 1;
                events.push('Issue eseguita su ' + freeFU.name + ': ' + issueCandidate.text);
            } else {
                events.push('Issue bloccata per ' + issueCandidate.text + ': ' + issueReasons.join(' ; '));
            }
        }

        if (state.nextFetch < state.instructions.length) {
            var fetchBlocked = false;
            if (state.nextFetch > 0) {
                var previousInstr = state.instructions[state.nextFetch - 1];
                var previousStart = startInstructions[previousInstr.id] || {};
                var previousFinishedAtStart = previousInstr.hasWrite
                    ? previousStart.writeCycle !== null
                    : previousStart.completeCycle !== null;
                if (state.config.rules.fetchBlockedUntilPreviousIssue && previousInstr.issueCycle === null) {
                    fetchBlocked = true;
                    events.push('Fetch bloccato: l\'istruzione precedente non ha ancora completato Issue.');
                } else if (previousInstr.op === 'bne' && !previousFinishedAtStart) {
                    fetchBlocked = true;
                    events.push('Fetch bloccato: il branch precedente non e\' ancora risolto.');
                }
            }
            if (!fetchBlocked) {
                state.instructions[state.nextFetch].fetchCycle = cycle;
                events.push('Fetch: ' + state.instructions[state.nextFetch].text);
                state.nextFetch += 1;
            }
        }

        state.instructions.forEach(function (instr) {
            if (instr.readCycle !== null && instr.readCycle < cycle && instr.execCompleteCycle === null) {
                if (instr.execStartCycle === null) {
                    instr.execStartCycle = cycle;
                }
                instr.execProgress += 1;
                if (instr.execProgress >= instr.latency) {
                    instr.execCompleteCycle = cycle;
                    events.push('Execute completata: ' + instr.text);
                    if (!instr.hasWrite) {
                        instr.completeCycle = cycle;
                        releaseFU(state, instr.fuName);
                        events.push('FU liberata (nessuna write): ' + instr.text);
                    }
                } else {
                    events.push('Execute in corso (' + instr.execProgress + '/' + instr.latency + '): ' + instr.text);
                }
            }
        });

        var done = state.nextFetch >= state.instructions.length && state.instructions.every(isFinished);

        return {
            cycle: cycle,
            title: state.config.title,
            description: state.config.description,
            done: done,
            dynamicCount: state.instructions.length,
            events: events,
            guide: buildGuide(state),
            instructions: clone(state.instructions),
            fus: clone(state.fus),
            registerStatus: clone(state.registerStatus),
            registers: clone(state.registers)
        };
    }

    function buildHistory(key) {
        var config = EXERCISES[key];
        var state = buildState(config);
        var history = [];
        var safe = 0;
        while (safe < 180) {
            var snapshot = stepSimulation(state);
            history.push(snapshot);
            safe += 1;
            if (snapshot.done) {
                break;
            }
        }
        return history;
    }

    var histories = {};
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

    var currentExercise = exerciseKeyFromUrl('ex1');
    var currentStep = 0;
    var autoplay = null;

    function cycleText(instr) {
        return {
            fetch: instr.fetchCycle !== null ? String(instr.fetchCycle) : '—',
            issue: instr.issueCycle !== null ? String(instr.issueCycle) : '—',
            read: instr.readCycle !== null ? String(instr.readCycle) : '—',
            execute: instr.execCompleteCycle !== null
                ? ((instr.execStartCycle !== null && instr.execStartCycle !== instr.execCompleteCycle)
                    ? (instr.execStartCycle + '→' + instr.execCompleteCycle)
                    : String(instr.execCompleteCycle))
                : '—',
            write: instr.hasWrite ? (instr.writeCycle !== null ? String(instr.writeCycle) : '—') : '—'
        };
    }

    function instructionStateClass(instr) {
        if (instr.hasWrite && instr.writeCycle !== null) { return 'done'; }
        if (!instr.hasWrite && instr.completeCycle !== null) { return 'done'; }
        if (instr.execCompleteCycle !== null && instr.hasWrite) { return 'write'; }
        if (instr.execStartCycle !== null) { return 'exec'; }
        if (instr.issueCycle !== null && instr.readCycle === null) { return 'wait'; }
        if (instr.fetchCycle !== null) { return 'queue'; }
        return 'idle';
    }

    function instructionStateLabel(instr) {
        if (instr.hasWrite && instr.writeCycle !== null) { return 'Completata'; }
        if (!instr.hasWrite && instr.completeCycle !== null) { return 'Completata'; }
        if (instr.execCompleteCycle !== null && instr.hasWrite) { return 'Pronta al Write'; }
        if (instr.execStartCycle !== null) { return 'Execute ' + instr.execProgress + '/' + instr.latency; }
        if (instr.issueCycle !== null && instr.readCycle === null) { return 'Attesa Read'; }
        if (instr.fetchCycle !== null) { return 'In coda'; }
        return 'Non fetchata';
    }

    function render() {
        if (!histories[currentExercise]) {
            histories[currentExercise] = buildHistory(currentExercise);
        }
        var history = histories[currentExercise];
        if (currentStep < 0) {
            currentStep = 0;
        }
        if (currentStep >= history.length) {
            currentStep = history.length - 1;
        }
        var snapshot = history[currentStep];

        var summary = byId('scoreboard-summary');
        clear(summary);
        [
            'Esercizio: ' + snapshot.title,
            'Ciclo: ' + snapshot.cycle,
            'Istruzioni dinamiche: ' + snapshot.dynamicCount,
            snapshot.done ? 'Simulazione completata' : 'Simulazione in corso'
        ].forEach(function (text) {
            var pill = el('div', 'status-pill');
            var parts = text.split(': ');
            if (parts.length === 2) {
                pill.appendChild(el('strong', null, parts[0] + ':'));
                pill.appendChild(document.createTextNode(' ' + parts[1]));
            } else {
                pill.textContent = text;
            }
            summary.appendChild(pill);
        });

        var eventsNode = byId('scoreboard-events');
        clear(eventsNode);
        snapshot.events.forEach(function (item) {
            eventsNode.appendChild(el('div', 'sim-list-item', item));
        });

        var guideNode = byId('scoreboard-guide');
        clear(guideNode);
        snapshot.guide.forEach(function (item, index) {
            guideNode.appendChild(el('div', 'sim-list-item' + (index > 0 ? ' dim' : ''), item));
        });

        var instructionBody = byId('scoreboard-instruction-body');
        clear(instructionBody);
        snapshot.instructions.forEach(function (instr, index) {
            var row = document.createElement('tr');
            var cycles = cycleText(instr);
            [
                String(index + 1),
                instr.text,
                instr.fuName || '—',
                null,
                cycles.fetch,
                cycles.issue,
                cycles.read,
                cycles.execute,
                cycles.write
            ].forEach(function (value, cellIndex) {
                var td = document.createElement('td');
                if (cellIndex === 3) {
                    var pill = el('span', 'instruction-state ' + instructionStateClass(instr), instructionStateLabel(instr));
                    td.appendChild(pill);
                } else {
                    td.textContent = value;
                }
                row.appendChild(td);
            });
            instructionBody.appendChild(row);
        });

        var fuBody = byId('scoreboard-fu-body');
        clear(fuBody);
        snapshot.fus.forEach(function (fu) {
            var row = document.createElement('tr');
            var instr = fu.instrId !== null ? snapshot.instructions[fu.instrId] : null;
            [
                fu.name,
                fu.busy ? 'yes' : 'no',
                instr ? instr.text : '—',
                instr ? instructionStateLabel(instr) : 'libera',
                instr && instr.execStartCycle !== null && instr.execCompleteCycle === null ? (instr.execProgress + '/' + instr.latency) : '—'
            ].forEach(function (value, idx) {
                var td = document.createElement('td');
                if (idx === 1) {
                    td.className = fu.busy ? 'fu-busy' : 'fu-free';
                }
                td.textContent = value;
                row.appendChild(td);
            });
            fuBody.appendChild(row);
        });

        var regBody = byId('scoreboard-register-body');
        clear(regBody);
        snapshot.registers.forEach(function (reg) {
            var row = document.createElement('tr');
            var writerId = snapshot.registerStatus[reg];
            row.appendChild(el('td', null, reg));
            row.appendChild(el('td', null, writerId !== undefined ? snapshot.instructions[writerId].text : '—'));
            regBody.appendChild(row);
        });
    }

    function stopAutoplay() {
        if (autoplay) {
            window.clearInterval(autoplay);
            autoplay = null;
        }
        var playBtn = byId('scoreboard-play-btn');
        if (playBtn) {
            playBtn.textContent = 'Play';
        }
    }

    function nextStep() {
        if (!histories[currentExercise]) {
            histories[currentExercise] = buildHistory(currentExercise);
        }
        if (currentStep < histories[currentExercise].length - 1) {
            currentStep += 1;
            render();
        } else {
            stopAutoplay();
        }
    }

    function prevStep() {
        if (currentStep > 0) {
            currentStep -= 1;
            render();
        }
    }

    function init() {
        var selector = byId('scoreboard-exercise-select');
        var nextBtn = byId('scoreboard-next-btn');
        var prevBtn = byId('scoreboard-prev-btn');
        var resetBtn = byId('scoreboard-reset-btn');
        var playBtn = byId('scoreboard-play-btn');

        if (!selector || !nextBtn || !prevBtn || !resetBtn || !playBtn) {
            return;
        }

        selector.value = currentExercise;

        selector.addEventListener('change', function () {
            stopAutoplay();
            currentExercise = selector.value;
            currentStep = 0;
            if (!histories[currentExercise]) {
                histories[currentExercise] = buildHistory(currentExercise);
            }
            render();
        });

        nextBtn.addEventListener('click', function () {
            stopAutoplay();
            nextStep();
        });

        prevBtn.addEventListener('click', function () {
            stopAutoplay();
            prevStep();
        });

        resetBtn.addEventListener('click', function () {
            stopAutoplay();
            currentStep = 0;
            render();
        });

        playBtn.addEventListener('click', function () {
            if (autoplay) {
                stopAutoplay();
                return;
            }
            playBtn.textContent = 'Stop';
            autoplay = window.setInterval(function () {
                nextStep();
            }, 1300);
        });

        histories[currentExercise] = buildHistory(currentExercise);
        render();
    }

    window.NickStudioScoreboard = {
        exercises: EXERCISES,
        buildHistory: buildHistory,
        buildFinalSnapshot: function (key) {
            var history = buildHistory(key);
            return history.length ? history[history.length - 1] : null;
        }
    };

    document.addEventListener('DOMContentLoaded', init);
}());
