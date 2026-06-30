(function () {
    'use strict';

    var TYPE_MIXED = 'mixed';
    var TYPE_SCOREBOARD = 'scoreboard';
    var TYPE_TOMASULO = 'tomasulo';
    var TYPE_ROB = 'rob';

    var CODE_SCOREBOARD = 'ACA-SB-E2';
    var CODE_TOMASULO = 'ACA-TM-E2';
    var CODE_ROB = 'ACA-RB-E2';

    var score = loadScore();
    var currentExercise = null;
    var currentGeneratedType = TYPE_MIXED;
    var submittedAnswers = null;
    var revealSolution = false;

    var elements = {};

    document.addEventListener('DOMContentLoaded', function () {
        bindElements();
        bindEvents();
        renderArchive();
        updateScore();
        loadInitialExercise();
    });

    function bindElements() {
        elements.typeSelect = byId('aca-type-select');
        elements.generateBtn = byId('aca-generate-btn');
        elements.resetScoreBtn = byId('aca-reset-score-btn');
        elements.scoreValue = byId('aca-score-value');
        elements.codeInput = byId('aca-code-input');
        elements.codeBtn = byId('aca-code-btn');
        elements.codeFeedback = byId('aca-code-feedback');
        elements.archiveList = byId('aca-archive-list');
        elements.topic = byId('aca-topic');
        elements.title = byId('aca-title');
        elements.codeChip = byId('aca-code-chip');
        elements.context = byId('aca-context');
        elements.rules = byId('aca-rules');
        elements.codeListing = byId('aca-code-listing');
        elements.prompt = byId('aca-prompt');
        elements.checkBtn = byId('aca-check-btn');
        elements.solutionBtn = byId('aca-solution-btn');
        elements.clearBtn = byId('aca-clear-btn');
        elements.nextBtn = byId('aca-next-btn');
        elements.tableWrap = byId('aca-table-wrap');
        elements.feedbackPanel = byId('aca-feedback-panel');
        elements.feedbackTitle = byId('aca-feedback-title');
        elements.feedbackBody = byId('aca-feedback-body');
    }

    function bindEvents() {
        elements.generateBtn.addEventListener('click', function () {
            var requestedType = elements.typeSelect.value || TYPE_MIXED;
            loadExercise(generateExercise(requestedType), requestedType);
        });

        elements.resetScoreBtn.addEventListener('click', function () {
            score = { correct: 0, attempts: 0 };
            saveScore();
            updateScore();
        });

        elements.codeBtn.addEventListener('click', openExerciseFromCode);
        elements.codeInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                openExerciseFromCode();
            }
        });

        elements.checkBtn.addEventListener('click', checkExercise);
        elements.solutionBtn.addEventListener('click', showSolution);
        elements.clearBtn.addEventListener('click', function () {
            if (currentExercise) {
                loadExercise(currentExercise, currentGeneratedType);
            }
        });
        elements.nextBtn.addEventListener('click', function () {
            loadExercise(generateExercise(currentGeneratedType), currentGeneratedType);
        });

        Array.prototype.forEach.call(document.querySelectorAll('.lesson-open'), function (button) {
            button.addEventListener('click', function () {
                openLessonExercise(button.dataset.family, button.dataset.key);
            });
        });
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function loadScore() {
        try {
            var raw = window.localStorage.getItem('nickstudio_aca_table_score');
            if (!raw) {
                return { correct: 0, attempts: 0 };
            }
            var parsed = JSON.parse(raw);
            return {
                correct: Number(parsed.correct) || 0,
                attempts: Number(parsed.attempts) || 0
            };
        } catch (_error) {
            return { correct: 0, attempts: 0 };
        }
    }

    function saveScore() {
        window.localStorage.setItem('nickstudio_aca_table_score', JSON.stringify(score));
    }

    function updateScore() {
        elements.scoreValue.textContent = score.correct + ' / ' + score.attempts;
    }

    function loadInitialExercise() {
        var lesson = exerciseFromUrlLesson();
        if (lesson) {
            elements.typeSelect.value = lesson.type;
            loadExercise(lesson, lesson.type);
            return;
        }
        loadExercise(generateExercise(TYPE_MIXED), TYPE_MIXED);
    }

    function openExerciseFromCode() {
        var exercise = exerciseFromCode(elements.codeInput.value);
        if (!exercise) {
            elements.codeFeedback.textContent = 'Codice non riconosciuto. Prova con ' + CODE_SCOREBOARD + ', ACA-SB-EX1, ACA-TM-EX2 o ACA-RB-EX3.';
            return;
        }
        elements.codeFeedback.textContent = '';
        elements.typeSelect.value = exercise.type;
        loadExercise(exercise, exercise.type);
    }

    function renderArchive() {
        elements.archiveList.innerHTML = '';
        archiveExercises().forEach(function (exercise) {
            var button = document.createElement('button');
            button.type = 'button';
            button.textContent = exercise.topic + ' - ' + exercise.code;
            button.addEventListener('click', function () {
                elements.typeSelect.value = exercise.type;
                loadExercise(exercise, exercise.type);
            });
            elements.archiveList.appendChild(button);
        });
    }

    function loadExercise(exercise, requestedType) {
        currentExercise = cloneExercise(exercise);
        currentGeneratedType = requestedType || exercise.type;
        submittedAnswers = null;
        revealSolution = false;
        elements.codeFeedback.textContent = '';
        renderExercise();
    }

    function openLessonExercise(family, key) {
        var exercise = generateLessonExercise(family, key);
        if (!exercise) {
            elements.codeFeedback.textContent = 'Non riesco a caricare questo preset di lezione nel trainer.';
            return;
        }
        elements.typeSelect.value = exercise.type;
        loadExercise(exercise, exercise.type);
    }

    function renderExercise() {
        elements.topic.textContent = currentExercise.topic;
        elements.title.textContent = currentExercise.title;
        elements.codeChip.textContent = currentExercise.code;
        elements.context.textContent = currentExercise.context;
        elements.rules.textContent = currentExercise.rules;
        elements.codeListing.textContent = currentExercise.sourceCode || 'Codice sorgente non disponibile per questa traccia.';
        elements.prompt.textContent = currentExercise.prompt;
        renderTable();
        renderFeedback();
        elements.checkBtn.disabled = Boolean(submittedAnswers || revealSolution);
    }

    function renderTable() {
        elements.tableWrap.innerHTML = '';

        var table = document.createElement('table');
        table.className = 'aca-table';

        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        headerRow.appendChild(th('Istruzione'));
        currentExercise.columns.forEach(function (column) {
            headerRow.appendChild(th(column));
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        currentExercise.rows.forEach(function (rowLabel, rowIndex) {
            var row = document.createElement('tr');
            var instruction = document.createElement('td');
            instruction.className = 'aca-instruction';
            instruction.textContent = rowLabel;
            row.appendChild(instruction);

            currentExercise.columns.forEach(function (_column, colIndex) {
                var td = document.createElement('td');
                var input = document.createElement('input');
                input.className = 'aca-cell-input';
                input.type = 'text';
                input.autocomplete = 'off';
                input.placeholder = '-';
                input.dataset.row = String(rowIndex);
                input.dataset.col = String(colIndex);

                if (revealSolution) {
                    input.value = currentExercise.expected[rowIndex][colIndex];
                    input.disabled = true;
                    input.classList.add('correct');
                } else if (submittedAnswers) {
                    input.value = submittedAnswers[rowIndex][colIndex];
                    input.disabled = true;
                    input.classList.add(isCellCorrect(currentExercise.expected[rowIndex][colIndex], input.value) ? 'correct' : 'wrong');
                } else {
                    input.addEventListener('input', function () {
                        updateRowFeedback(rowIndex);
                    });
                }

                td.appendChild(input);
                row.appendChild(td);
            });

            tbody.appendChild(row);

            if (!submittedAnswers && !revealSolution) {
                var feedbackRow = document.createElement('tr');
                feedbackRow.className = 'row-feedback-row';
                var feedbackCell = document.createElement('td');
                feedbackCell.colSpan = currentExercise.columns.length + 1;
                var feedback = document.createElement('p');
                feedback.className = 'row-feedback';
                feedback.dataset.feedbackRow = String(rowIndex);
                feedbackCell.appendChild(feedback);
                feedbackRow.appendChild(feedbackCell);
                tbody.appendChild(feedbackRow);
            }
        });

        table.appendChild(tbody);
        elements.tableWrap.appendChild(table);
    }

    function th(text) {
        var cell = document.createElement('th');
        cell.textContent = text;
        return cell;
    }

    function updateRowFeedback(rowIndex) {
        var feedback = elements.tableWrap.querySelector('[data-feedback-row="' + rowIndex + '"]');
        if (!feedback) {
            return;
        }
        feedback.className = 'row-feedback';
        if (!isRowComplete(rowIndex)) {
            feedback.textContent = '';
            return;
        }
        var answers = collectAnswers();
        feedback.textContent = rowFeedbackText(currentExercise, answers, rowIndex);
        feedback.classList.add(isRowCorrect(currentExercise, answers, rowIndex) ? 'ok' : 'bad');
    }

    function isRowComplete(rowIndex) {
        return currentExercise.columns.every(function (_column, colIndex) {
            var input = cellInput(rowIndex, colIndex);
            return input && input.value.trim().length > 0;
        });
    }

    function cellInput(rowIndex, colIndex) {
        return elements.tableWrap.querySelector('[data-row="' + rowIndex + '"][data-col="' + colIndex + '"]');
    }

    function collectAnswers() {
        return currentExercise.rows.map(function (_row, rowIndex) {
            return currentExercise.columns.map(function (_column, colIndex) {
                var input = cellInput(rowIndex, colIndex);
                return input ? input.value : '';
            });
        });
    }

    function checkExercise() {
        submittedAnswers = collectAnswers();
        revealSolution = false;
        var correct = countCorrectCells(currentExercise, submittedAnswers);
        var total = currentExercise.rows.length * currentExercise.columns.length;
        score.correct += correct;
        score.attempts += total;
        saveScore();
        updateScore();
        renderExercise();
    }

    function showSolution() {
        submittedAnswers = null;
        revealSolution = true;
        renderExercise();
    }

    function renderFeedback() {
        if (!submittedAnswers && !revealSolution) {
            elements.feedbackPanel.hidden = true;
            elements.feedbackBody.innerHTML = '';
            return;
        }

        elements.feedbackPanel.hidden = false;
        elements.feedbackTitle.textContent = revealSolution ? 'Soluzione' : 'Correzione';
        elements.feedbackBody.innerHTML = '';

        if (revealSolution) {
            appendParagraph(elements.feedbackBody, currentExercise.solutionNote);
            elements.feedbackBody.appendChild(expectedSummaryTable(currentExercise));
            return;
        }

        var total = currentExercise.rows.length * currentExercise.columns.length;
        var correct = countCorrectCells(currentExercise, submittedAnswers);
        appendParagraph(elements.feedbackBody, 'Hai compilato correttamente ' + correct + ' celle su ' + total + '.');
        if (correct === total) {
            appendParagraph(elements.feedbackBody, 'Perfetto: la tabella rispetta le dipendenze e l\'ordine richiesto.');
            return;
        }

        appendParagraph(elements.feedbackBody, 'Errori da rivedere:');
        var list = document.createElement('ul');
        list.className = 'feedback-list';
        var shown = 0;
        for (var row = 0; row < currentExercise.rows.length; row++) {
            for (var col = 0; col < currentExercise.columns.length; col++) {
                if (!isCellCorrect(currentExercise.expected[row][col], submittedAnswers[row][col]) && shown < 6) {
                    var item = document.createElement('li');
                    item.textContent = currentExercise.rows[row] + ' / ' + currentExercise.columns[col]
                        + ': hai scritto "' + displayCell(submittedAnswers[row][col])
                        + '", atteso "' + currentExercise.expected[row][col] + '". '
                        + currentExercise.explanations[row][col];
                    list.appendChild(item);
                    shown++;
                }
            }
        }
        if (shown < total - correct) {
            var more = document.createElement('li');
            more.textContent = 'Ci sono altri errori: correggi questi primi e ricontrolla la catena delle dipendenze.';
            list.appendChild(more);
        }
        elements.feedbackBody.appendChild(list);
    }

    function appendParagraph(parent, text) {
        var paragraph = document.createElement('p');
        paragraph.textContent = text;
        parent.appendChild(paragraph);
    }

    function expectedSummaryTable(exercise) {
        var wrapper = document.createElement('div');
        wrapper.className = 'table-wrap solution-table';

        var table = document.createElement('table');
        table.className = 'aca-table';
        var thead = document.createElement('thead');
        var header = document.createElement('tr');
        header.appendChild(th('Istruzione'));
        exercise.columns.forEach(function (column) {
            header.appendChild(th(column));
        });
        thead.appendChild(header);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        exercise.rows.forEach(function (rowLabel, rowIndex) {
            var row = document.createElement('tr');
            var instruction = document.createElement('td');
            instruction.className = 'aca-instruction';
            instruction.textContent = rowLabel;
            row.appendChild(instruction);
            exercise.columns.forEach(function (_column, colIndex) {
                var cell = document.createElement('td');
                var input = document.createElement('input');
                input.className = 'aca-cell-input correct';
                input.value = exercise.expected[rowIndex][colIndex];
                input.disabled = true;
                cell.appendChild(input);
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        wrapper.appendChild(table);
        return wrapper;
    }

    function rowFeedbackText(exercise, answers, row) {
        if (isRowCorrect(exercise, answers, row)) {
            return 'Riga corretta: dipendenze e cicli tornano.';
        }
        var lines = ['Riga da correggere:'];
        for (var col = 0; col < exercise.columns.length; col++) {
            if (!isCellCorrect(exercise.expected[row][col], answers[row][col])) {
                lines.push('- ' + exercise.columns[col] + ': hai scritto "'
                    + displayCell(answers[row][col]) + '", atteso "'
                    + exercise.expected[row][col] + '". '
                    + exercise.explanations[row][col]);
            }
        }
        return lines.join('\n');
    }

    function isRowCorrect(exercise, answers, row) {
        return exercise.columns.every(function (_column, col) {
            return isCellCorrect(exercise.expected[row][col], answers[row][col]);
        });
    }

    function countCorrectCells(exercise, answers) {
        var correct = 0;
        for (var row = 0; row < exercise.rows.length; row++) {
            for (var col = 0; col < exercise.columns.length; col++) {
                if (isCellCorrect(exercise.expected[row][col], answers[row][col])) {
                    correct++;
                }
            }
        }
        return correct;
    }

    function isCellCorrect(expected, actual) {
        var expectedClean = normalizeCell(expected);
        var actualClean = normalizeCell(actual);
        if (expectedClean === actualClean) {
            return true;
        }
        return expectedClean === extractAnnotatedValue(actualClean);
    }

    function normalizeCell(value) {
        var clean = value == null ? '' : String(value).trim().toUpperCase();
        clean = clean.replace(/\s+/g, '')
            .replace(/->/g, '-')
            .replace(/→/g, '-')
            .replace(/–/g, '-')
            .replace(/—/g, '-');
        if (clean.length === 0) {
            return '-';
        }
        if (clean === 'NA' || clean === 'N/A' || clean === 'FLUSH' || clean === 'FLUSHED') {
            return '-';
        }
        return clean;
    }

    function displayCell(value) {
        var clean = value == null ? '' : String(value).trim();
        return clean.length === 0 ? '-' : clean;
    }

    function extractAnnotatedValue(normalizedActual) {
        if (!normalizedActual) {
            return '-';
        }
        var closeParen = normalizedActual.lastIndexOf(')');
        if (closeParen >= 0 && closeParen < normalizedActual.length - 1) {
            var suffix = normalizedActual.substring(closeParen + 1);
            while (suffix.charAt(0) === '-' || suffix.charAt(0) === '=' || suffix.charAt(0) === ':') {
                suffix = suffix.substring(1);
            }
            if (suffix.length > 0) {
                return normalizeCell(suffix);
            }
        }
        return normalizedActual;
    }

    function normalizeExerciseCode(code) {
        var clean = code == null ? '' : String(code).trim().toUpperCase();
        clean = clean.replace(/\s+/g, '')
            .replace(/_/g, '-')
            .replace(/\//g, '-')
            .replace(/\./g, '-');
        if (clean.indexOf('NS-') === 0) {
            clean = clean.substring(3);
        }
        if (clean === 'SB' || clean === 'SCOREBOARD') {
            return CODE_SCOREBOARD;
        }
        if (clean === 'TM' || clean === 'TOMASULO') {
            return CODE_TOMASULO;
        }
        if (clean === 'RB' || clean === 'ROB') {
            return CODE_ROB;
        }
        return clean;
    }

    function generateExercise(type) {
        var actualType = type === TYPE_MIXED ? randomType() : type;
        return generateExtraExercise(actualType);
    }

    function generateExtraExercise(actualType) {
        if (actualType === TYPE_SCOREBOARD) {
            return generateRandomScoreboardExercise() || generateScoreboardExercise();
        }
        if (actualType === TYPE_TOMASULO) {
            return generateRandomTomasuloExercise() || generateTomasuloExercise();
        }
        return generateRandomRobExercise() || generateRobExercise();
    }

    function randomType() {
        var types = [TYPE_SCOREBOARD, TYPE_TOMASULO, TYPE_ROB];
        return types[Math.floor(Math.random() * types.length)];
    }

    function randomFrom(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    function randomInt(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    function generatedKey(prefix) {
        return 'generated_' + prefix + '_' + Date.now() + '_' + randomInt(100, 999);
    }

    function exerciseFromCode(code) {
        var normalized = normalizeExerciseCode(code);
        var lesson = lessonFromCode(normalized);
        if (normalized === CODE_SCOREBOARD) {
            return generateScoreboardExercise();
        }
        if (normalized === CODE_TOMASULO) {
            return generateTomasuloExercise();
        }
        if (normalized === CODE_ROB) {
            return generateRobExercise();
        }
        if (lesson) {
            return generateLessonExercise(lesson.family, lesson.key);
        }
        return null;
    }

    function exerciseFromUrlLesson() {
        var raw;
        try {
            raw = new URLSearchParams(window.location.search).get('lesson');
        } catch (_error) {
            raw = null;
        }
        if (!raw) {
            return null;
        }
        raw = raw.toLowerCase().replace(/\s+/g, '');
        var parts = raw.split(':');
        if (parts.length !== 2) {
            parts = raw.split('-');
        }
        if (parts.length !== 2) {
            return null;
        }
        return generateLessonExercise(normalizeLessonFamily(parts[0]), normalizeLessonKey(parts[1]));
    }

    function lessonFromCode(normalized) {
        var match = normalized.match(/^(?:ACA-)?(SB|SCOREBOARD|TM|TOMASULO|RB|ROB)-?(?:EX|E)?(1|2|3A|3|4)$/);
        if (!match) {
            return null;
        }
        return {
            family: normalizeLessonFamily(match[1]),
            key: normalizeLessonKey(match[2])
        };
    }

    function normalizeLessonFamily(family) {
        var clean = String(family || '').toLowerCase();
        if (clean === 'sb' || clean === 'scoreboard') {
            return TYPE_SCOREBOARD;
        }
        if (clean === 'tm' || clean === 'tomasulo') {
            return TYPE_TOMASULO;
        }
        if (clean === 'rb' || clean === 'rob' || clean === 'reorder') {
            return TYPE_ROB;
        }
        return clean;
    }

    function normalizeLessonKey(key) {
        var clean = String(key || '').toLowerCase().replace(/^ex/, '');
        return clean ? ('ex' + clean) : '';
    }

    function randomLessonExercise(type) {
        var family = normalizeLessonFamily(type);
        var keys = lessonKeysForFamily(family);
        var key;
        if (!keys.length || !lessonApiAvailable(family)) {
            return null;
        }
        key = keys[Math.floor(Math.random() * keys.length)];
        return generateLessonExercise(family, key);
    }

    function lessonKeysForFamily(family) {
        if (family === TYPE_SCOREBOARD) {
            return ['ex1', 'ex2', 'ex3a'];
        }
        if (family === TYPE_TOMASULO || family === TYPE_ROB) {
            return ['ex1', 'ex2'];
        }
        return [];
    }

    function lessonApiAvailable(family) {
        if (family === TYPE_SCOREBOARD) {
            return Boolean(window.NickStudioScoreboard && window.NickStudioScoreboard.buildFinalSnapshot);
        }
        if (family === TYPE_TOMASULO) {
            return Boolean(window.NickStudioTomasulo && window.NickStudioTomasulo.buildFinalState);
        }
        if (family === TYPE_ROB) {
            return Boolean(window.NickStudioReorder && window.NickStudioReorder.buildFinalState);
        }
        return false;
    }

    function generateLessonExercise(family, key) {
        family = normalizeLessonFamily(family);
        key = normalizeLessonKey(key);
        if (family === TYPE_SCOREBOARD) {
            return generateScoreboardLessonExercise(key);
        }
        if (family === TYPE_TOMASULO) {
            return generateTomasuloLessonExercise(key);
        }
        if (family === TYPE_ROB) {
            return generateRobLessonExercise(key);
        }
        return null;
    }

    function generateScoreboardLessonExercise(key) {
        var api = window.NickStudioScoreboard;
        var config;
        var snapshot;
        var columns = ['Fetch', 'Issue', 'Read', 'Execute', 'Write'];
        var rows;
        var expected;
        var sourceCode;
        if (!api || !api.exercises || !api.exercises[key] || !api.buildFinalSnapshot) {
            return null;
        }
        config = api.exercises[key];
        sourceCode = sourceCodeForLesson(TYPE_SCOREBOARD, key, config);
        snapshot = api.buildFinalSnapshot(key);
        if (!snapshot || !snapshot.instructions) {
            return null;
        }
        rows = snapshot.instructions.map(function (instruction) {
            return instruction.text;
        });
        expected = snapshot.instructions.map(function (instruction) {
            return [
                cycleValue(instruction.fetchCycle),
                cycleValue(instruction.issueCycle),
                cycleValue(instruction.readCycle),
                rangeValue(instruction.execStartCycle, instruction.execCompleteCycle),
                instruction.hasWrite ? cycleValue(instruction.writeCycle) : '-'
            ];
        });
        return makeExercise(
            TYPE_SCOREBOARD,
            lessonCode(TYPE_SCOREBOARD, key),
            'Scoreboard',
            'Generato - Scoreboard ' + config.title,
            config.description,
            scoreboardLessonRules(config),
            'Completa Fetch, Issue, Read, Execute e Write. Per intervalli usa 7-10 e per celle non applicabili "-".',
            columns,
            rows,
            expected,
            'Scoreboard: controlla FU libera, WAW in Issue, RAW in Read e WAR in Write.',
            'Soluzione ricavata dal motore Scoreboard usato nel simulatore della lezione.',
            sourceCode
        );
    }

    function generateTomasuloLessonExercise(key) {
        var api = window.NickStudioTomasulo;
        var config;
        var state;
        var columns = ['Fetch', 'Issue', 'Execute', 'Write'];
        var rows;
        var expected;
        var sourceCode;
        if (!api || !api.exercises || !api.exercises[key] || !api.buildFinalState) {
            return null;
        }
        config = api.exercises[key];
        sourceCode = sourceCodeForLesson(TYPE_TOMASULO, key, config);
        var official = officialTomasuloLessonSchedule(key);
        if (official) {
            return makeExercise(
                TYPE_TOMASULO,
                lessonCode(TYPE_TOMASULO, key),
                'Tomasulo',
                'Generato - Tomasulo ' + config.title,
                config.description,
                tomasuloLessonRules(config),
                'Completa Fetch, Issue, Execute e Write. Puoi annotare i motivi degli stalli, ma il valore finale deve essere il ciclo.',
                columns,
                official.rows,
                official.expected,
                'Tomasulo: soluzione allineata al PDF schedulato ufficiale.',
                'Soluzione ufficiale del PDF schedulato.',
                sourceCode
            );
        }
        state = api.buildFinalState(key);
        rows = state.instructions.map(function (instruction) {
            return instruction.text;
        });
        expected = state.instructions.map(function (instruction) {
            return [
                cycleValue(instruction.fetchCycle),
                cycleValue(instruction.issueCycle),
                rangeValue(instruction.execStartCycle, instruction.execEndCycle),
                cycleValue(instruction.writeCycle)
            ];
        });
        return makeExercise(
            TYPE_TOMASULO,
            lessonCode(TYPE_TOMASULO, key),
            'Tomasulo',
            'Generato - Tomasulo ' + config.title,
            config.description,
            tomasuloLessonRules(config),
            'Completa Fetch, Issue, Execute e Write. Puoi annotare i motivi degli stalli, ma il valore finale deve essere il ciclo.',
            columns,
            rows,
            expected,
            'Tomasulo: Issue puo\' salvare tag; Execute aspetta gli operandi pronti; Write rispetta CDB e store fuori CDB.',
            'Soluzione ricavata dal motore Tomasulo usato nel simulatore della lezione.',
            sourceCode
        );
    }

    function generateRobLessonExercise(key) {
        var api = window.NickStudioReorder;
        var config;
        var state;
        var columns = ['Fetch', 'Issue', 'Execute', 'Write', 'Commit'];
        var rows;
        var expected;
        var sourceCode;
        if (!api || !api.exercises || !api.exercises[key] || !api.buildFinalState) {
            return null;
        }
        config = api.exercises[key];
        sourceCode = sourceCodeForLesson(TYPE_ROB, key, config);
        var official = officialRobLessonSchedule(key);
        if (official) {
            return makeExercise(
                TYPE_ROB,
                lessonCode(TYPE_ROB, key),
                'Tomasulo + ROB',
                'Generato - ROB ' + config.title,
                config.description,
                robLessonRules(config),
                'Completa Fetch, Issue, Execute, Write e Commit. Le istruzioni flushate hanno "-" nelle fasi che non completano.',
                columns,
                official.rows,
                official.expected,
                'ROB: soluzione allineata al PDF schedulato ufficiale.',
                'Soluzione ufficiale del PDF schedulato.',
                sourceCode
            );
        }
        state = api.buildFinalState(key);
        rows = state.instructions.map(function (instruction) {
            return instruction.text;
        });
        expected = state.instructions.map(function (instruction) {
            return [
                cycleValue(instruction.fetchCycle),
                cycleValue(instruction.issueCycle),
                rangeValue(instruction.execStartCycle, instruction.execEndCycle),
                cycleValue(instruction.writeCycle),
                cycleValue(instruction.commitCycle)
            ];
        });
        return makeExercise(
            TYPE_ROB,
            lessonCode(TYPE_ROB, key),
            'Tomasulo + ROB',
            'Generato - ROB ' + config.title,
            config.description,
            robLessonRules(config),
            'Completa Fetch, Issue, Execute, Write e Commit. Le istruzioni flushate hanno "-" nelle fasi che non completano.',
            columns,
            rows,
            expected,
            'ROB: Execute e Write possono essere fuori ordine, ma Commit resta in ordine dalla testa del ROB.',
            'Soluzione ricavata dal motore Tomasulo con ROB usato nel simulatore della lezione.',
            sourceCode
        );
    }

    function generateRandomScoreboardExercise() {
        var api = window.NickStudioScoreboard;
        var key = generatedKey('sb');
        var serialStores = Math.random() < 0.45;
        var intUnits = randomFrom([2, 3]);
        var countReg = randomFrom(['R1', 'R2', 'R4']);
        var outReg = randomFrom(['R5', 'R6', 'R7']);
        var fAcc = randomFrom(['F8', 'F10', 'F12']);
        var fLoad = randomFrom(['F2', 'F4']);
        var fRes = randomFrom(['F6', 'F14']);
        var fDelta = randomFrom(['F16', 'F18']);
        var startValue = randomFrom([16, 24]);
        var iterations = startValue / 8;
        var codeLines = [
            '.data',
            'A: .double ' + randomDoubleList(iterations + 1).join(', '),
            'C: .double ' + sourceNumber(randomDouble()),
            'D: .double ' + sourceNumber(randomDouble()),
            'Ris: .space 32',
            'S: .space 8',
            '.code',
            'daddi ' + countReg + ', R0, ' + startValue,
            'daddi ' + outReg + ', R0, 0',
            'l.d ' + fAcc + ', C(R0)',
            'l.d ' + fDelta + ', D(R0)',
            'loop: l.d ' + fLoad + ', A(' + countReg + ')',
            'mul.d ' + fRes + ', ' + fLoad + ', ' + fAcc,
            'daddi ' + countReg + ', ' + countReg + ', -8',
            's.d ' + fRes + ', Ris(' + outReg + ')',
            serialStores ? 's.d ' + fAcc + ', S(R0)' : 'sub.d ' + fAcc + ', ' + fAcc + ', ' + fDelta,
            'daddi ' + outReg + ', ' + outReg + ', 8',
            'bne ' + countReg + ', R0, loop',
            'daddi ' + countReg + ', R0, ' + startValue
        ];
        var prelude = [
            sbInstruction('daddi ' + countReg + ', R0, ' + startValue, 'daddi', 'int', countReg, ['R0']),
            sbInstruction('daddi ' + outReg + ', R0, 0', 'daddi', 'int', outReg, ['R0']),
            sbInstruction('l.d ' + fAcc + ', C(R0)', 'l.d', 'int', fAcc, ['R0'], 2),
            sbInstruction('l.d ' + fDelta + ', D(R0)', 'l.d', 'int', fDelta, ['R0'], 2)
        ];
        var loopBody = [
            sbInstruction('l.d ' + fLoad + ', A(' + countReg + ')', 'l.d', 'int', fLoad, [countReg], 2),
            sbInstruction('mul.d ' + fRes + ', ' + fLoad + ', ' + fAcc, 'mul.d', 'fpMul', fRes, [fLoad, fAcc]),
            sbInstruction('daddi ' + countReg + ', ' + countReg + ', -8', 'daddi', 'int', countReg, [countReg]),
            sbInstruction('s.d ' + fRes + ', Ris(' + outReg + ')', 's.d', 'int', null, [fRes, outReg])
        ];
        if (serialStores) {
            loopBody.push(sbInstruction('s.d ' + fAcc + ', S(R0)', 's.d', 'int', null, [fAcc, 'R0']));
        } else {
            loopBody.push(sbInstruction('sub.d ' + fAcc + ', ' + fAcc + ', ' + fDelta, 'sub.d', 'fpAdd', fAcc, [fAcc, fDelta]));
        }
        loopBody.push(
            sbInstruction('daddi ' + outReg + ', ' + outReg + ', 8', 'daddi', 'int', outReg, [outReg]),
            sbInstruction('bne ' + countReg + ', R0, loop', 'bne', 'int', null, [countReg, 'R0'])
        );
        var postlude = [
            sbInstruction('daddi ' + countReg + ', R0, ' + startValue, 'daddi', 'int', countReg, ['R0'])
        ];
        var config = {
            title: 'Casuale ' + key.slice(-3),
            description: 'Esercizio generato casualmente: loop espanso su ' + iterations + ' iterazioni, dipendenze RAW/WAR/WAW e possibili stalli strutturali.',
            issueWidth: 1,
            fetchWidth: 1,
            rules: {
                storeSerialization: serialStores,
                loadBlockedByStoreUntilRead: false,
                fetchBlockedUntilPreviousIssue: true,
                issueUsesStartOfCycleFu: true,
                issueUsesStartOfCycleRegisters: true,
                readUsesStartOfCycleValues: true,
                singleWritePerCycle: true,
                loadExecuteLatency: 2
            },
            units: { int: intUnits, fpAdd: 2, fpMul: 1, fpDiv: 1 },
            latencies: { int: 1, fpAdd: 2, fpMul: randomFrom([4, 5]), fpDiv: 8 },
            instructions: expandScoreboardProgram(prelude, loopBody, iterations, postlude)
        };
        if (!api || !api.exercises || !api.buildFinalSnapshot) {
            return null;
        }
        api.exercises[key] = config;
        return scoreboardExerciseFromSnapshot(key, config, api.buildFinalSnapshot(key), 'ACA-SB-RND-' + key.slice(-3), codeLines.join('\n'));
    }

    function generateRandomTomasuloExercise() {
        var api = window.NickStudioTomasulo;
        var key = generatedKey('tm');
        var ptrReg = randomFrom(['R1', 'R2']);
        var limitReg = randomFrom(['R3', 'R4']);
        var outReg = randomFrom(['R5', 'R6']);
        var fSeed = randomFrom(['F8', 'F10']);
        var fBias = randomFrom(['F12', 'F14']);
        var fLoad = randomFrom(['F2', 'F4']);
        var fRes = randomFrom(['F6', 'F16']);
        var iterations = randomFrom([2, 3]);
        var limit = iterations * 8;
        var config = {
            title: 'Casuale ' + key.slice(-3),
            description: 'Esercizio generato casualmente con Tomasulo senza ROB: tag nelle RS, CDB singolo, store fuori CDB e branch non speculativo.',
            buffers: { load: 2, store: 2, add: 2, mul: 2, int: 3 },
            latencies: { load: 2, store: 2, add: 2, mul: randomFrom([4, 5]), div: randomFrom([8, 9]), int: 1 },
            executionUnits: { load: 1, store: 1, add: 1, mul: 1, int: 1 },
            initialInt: { R0: 0 },
            initialFp: {},
            bases: { A: 0, K: 1000, B: 2000, Z: 3000, S: 4000 },
            memory: mergeObjects([
                numericMemory(0, randomDoubleList(iterations + 1), 8),
                numericMemory(1000, [randomDouble()], 8),
                numericMemory(2000, [randomDouble()], 8)
            ]),
            loopLabel: 'loop',
            program: [
                tmInstruction('l.d ' + fSeed + ', K(R0)', 'l.d', 'load', fSeed, ['R0'], { base: 'R0', addrLabel: 'K', offset: 0 }),
                tmInstruction('daddi ' + ptrReg + ', R0, 0', 'daddi', 'int', ptrReg, ['R0'], { imm: 0 }),
                tmInstruction('daddi ' + limitReg + ', R0, ' + limit, 'daddi', 'int', limitReg, ['R0'], { imm: limit }),
                tmInstruction('l.d ' + fBias + ', B(R0)', 'l.d', 'load', fBias, ['R0'], { base: 'R0', addrLabel: 'B', offset: 0 }),
                tmInstruction('l.d ' + fLoad + ', A(' + ptrReg + ')', 'l.d', 'load', fLoad, [ptrReg], { label: 'loop', base: ptrReg, addrLabel: 'A', offset: 0 }),
                tmInstruction('mul.d ' + fRes + ', ' + fLoad + ', ' + fSeed, 'mul.d', 'mul', fRes, [fLoad, fSeed]),
                tmInstruction('daddi ' + outReg + ', ' + ptrReg + ', 0', 'daddi', 'int', outReg, [ptrReg], { imm: 0 }),
                tmInstruction('daddi ' + ptrReg + ', ' + ptrReg + ', 8', 'daddi', 'int', ptrReg, [ptrReg], { imm: 8 }),
                tmInstruction('sub.d ' + fSeed + ', ' + fSeed + ', ' + fBias, 'sub.d', 'add', fSeed, [fSeed, fBias]),
                storeInstruction('s.d ' + fRes + ', Z(' + outReg + ')', fRes, outReg, 'Z', 0),
                branchInstruction('bne ' + ptrReg + ', ' + limitReg + ', loop', ptrReg, limitReg),
                storeInstruction('s.d ' + fSeed + ', S(R0)', fSeed, 'R0', 'S', 0)
            ]
        };
        if (!api || !api.exercises || !api.buildFinalState) {
            return null;
        }
        api.exercises[key] = config;
        return tomasuloExerciseFromState(key, config, api.buildFinalState(key), 'ACA-TM-RND-' + key.slice(-3), programSourceCode(config));
    }

    function generateRandomRobExercise() {
        var api = window.NickStudioReorder;
        var key = generatedKey('rb');
        var ptrReg = randomFrom(['R1', 'R2']);
        var limitReg = randomFrom(['R3', 'R4']);
        var outReg = randomFrom(['R5', 'R6']);
        var fSeed = randomFrom(['F8', 'F10']);
        var fLoad = randomFrom(['F2', 'F4']);
        var fMul = randomFrom(['F6', 'F12']);
        var fSub = randomFrom(['F14', 'F16']);
        var iterations = randomFrom([2, 3]);
        var limit = iterations * 8;
        var config = {
            title: 'Casuale ' + key.slice(-3),
            description: 'Esercizio generato casualmente con Tomasulo + ROB: predizione dinamica, commit in ordine e possibile flush.',
            buffers: { load: 2, store: 2, add: 2, mul: 2, int: 3, rob: randomFrom([6, 7]) },
            latencies: { load: 2, store: 2, add: 2, mul: 4, div: 10, int: 1 },
            executionUnits: { load: 1, store: 1, add: 1, mul: 1, int: 1 },
            predictor: { type: 'oneBitLocal', initialTaken: Math.random() < 0.5, targetKnown: true },
            initialInt: { R0: 0 },
            initialFp: {},
            memory: mergeObjects([
                labelMemory('C', [randomDouble()], 8),
                labelMemory('P', randomDoubleList(iterations + 2), 8)
            ]),
            loopLabel: 'loop',
            program: [
                rbInstruction('daddi ' + ptrReg + ', R0, 0', 'daddi', 'int', ptrReg, ['R0'], { imm: 0 }),
                rbInstruction('daddi ' + limitReg + ', R0, ' + limit, 'daddi', 'int', limitReg, ['R0'], { imm: limit }),
                rbInstruction('daddi ' + outReg + ', R0, 0', 'daddi', 'int', outReg, ['R0'], { imm: 0 }),
                rbInstruction('l.d ' + fSeed + ', C(R0)', 'l.d', 'load', fSeed, ['R0'], { base: 'R0', addrLabel: 'C', offset: 0, memType: 'fp' }),
                rbInstruction('l.d ' + fLoad + ', P(' + ptrReg + ')', 'l.d', 'load', fLoad, [ptrReg], { label: 'loop', base: ptrReg, addrLabel: 'P', offset: 0, memType: 'fp' }),
                rbInstruction('mul.d ' + fMul + ', ' + fLoad + ', ' + fSeed, 'mul.d', 'mul', fMul, [fLoad, fSeed]),
                rbInstruction('sub.d ' + fSub + ', ' + fSeed + ', ' + fLoad, 'sub.d', 'add', fSub, [fSeed, fLoad]),
                rbStoreInstruction('s.d ' + fSub + ', 0(' + ptrReg + ')', fSub, ptrReg, null, 0),
                rbInstruction('daddi ' + ptrReg + ', ' + ptrReg + ', 8', 'daddi', 'int', ptrReg, [ptrReg], { imm: 8 }),
                rbStoreInstruction('s.d ' + fMul + ', 0(' + outReg + ')', fMul, outReg, null, 0),
                rbInstruction('daddi ' + outReg + ', ' + outReg + ', 8', 'daddi', 'int', outReg, [outReg], { imm: 8 }),
                rbBranchInstruction('bne ' + ptrReg + ', ' + limitReg + ', loop', ptrReg, limitReg),
                rbInstruction('daddi ' + ptrReg + ', R0, 0', 'daddi', 'int', ptrReg, ['R0'], { imm: 0 })
            ]
        };
        if (!api || !api.exercises || !api.buildFinalState) {
            return null;
        }
        api.exercises[key] = config;
        return robExerciseFromState(key, config, api.buildFinalState(key), 'ACA-RB-RND-' + key.slice(-3), programSourceCode(config));
    }

    function scoreboardExerciseFromSnapshot(key, config, snapshot, code, sourceCode) {
        if (!snapshot || !snapshot.done || !snapshot.instructions) {
            return null;
        }
        return makeExercise(
            TYPE_SCOREBOARD,
            code,
            'Scoreboard',
            'Generato casuale - Scoreboard ' + config.title,
            config.description,
            scoreboardLessonRules(config),
            'Completa Fetch, Issue, Read, Execute e Write. La soluzione e\' calcolata automaticamente dal motore Scoreboard.',
            ['Fetch', 'Issue', 'Read', 'Execute', 'Write'],
            snapshot.instructions.map(function (instruction) { return instruction.text; }),
            snapshot.instructions.map(function (instruction) {
                return [
                    cycleValue(instruction.fetchCycle),
                    cycleValue(instruction.issueCycle),
                    cycleValue(instruction.readCycle),
                    rangeValue(instruction.execStartCycle, instruction.execCompleteCycle),
                    instruction.hasWrite ? cycleValue(instruction.writeCycle) : '-'
                ];
            }),
            'Scoreboard: controlla FU libera, WAW in Issue, RAW in Read e WAR in Write.',
            'Soluzione generata dal motore Scoreboard sulla traccia casuale.',
            sourceCode
        );
    }

    function tomasuloExerciseFromState(key, config, state, code, sourceCode) {
        if (!state || !state.done || !state.instructions) {
            return null;
        }
        return makeExercise(
            TYPE_TOMASULO,
            code,
            'Tomasulo',
            'Generato casuale - Tomasulo ' + config.title,
            config.description,
            tomasuloLessonRules(config),
            'Completa Fetch, Issue, Execute e Write. La soluzione e\' calcolata automaticamente dal motore Tomasulo.',
            ['Fetch', 'Issue', 'Execute', 'Write'],
            state.instructions.map(function (instruction) { return instruction.text; }),
            state.instructions.map(function (instruction) {
                return [
                    cycleValue(instruction.fetchCycle),
                    cycleValue(instruction.issueCycle),
                    rangeValue(instruction.execStartCycle, instruction.execEndCycle),
                    cycleValue(instruction.writeCycle)
                ];
            }),
            'Tomasulo: Issue salva tag/valori, Execute aspetta gli operandi pronti e Write rispetta CDB/store fuori CDB.',
            'Soluzione generata dal motore Tomasulo sulla traccia casuale.',
            sourceCode
        );
    }

    function robExerciseFromState(key, config, state, code, sourceCode) {
        if (!state || !state.done || !state.instructions) {
            return null;
        }
        return makeExercise(
            TYPE_ROB,
            code,
            'Tomasulo + ROB',
            'Generato casuale - ROB ' + config.title,
            config.description,
            robLessonRules(config),
            'Completa Fetch, Issue, Execute, Write e Commit. Le righe flushate hanno "-" nelle fasi non completate.',
            ['Fetch', 'Issue', 'Execute', 'Write', 'Commit'],
            state.instructions.map(function (instruction) { return instruction.text; }),
            state.instructions.map(function (instruction) {
                return [
                    cycleValue(instruction.fetchCycle),
                    cycleValue(instruction.issueCycle),
                    rangeValue(instruction.execStartCycle, instruction.execEndCycle),
                    cycleValue(instruction.writeCycle),
                    cycleValue(instruction.commitCycle)
                ];
            }),
            'ROB: Issue richiede RS e ROB, Write aggiorna il ROB, Commit resta in ordine e gestisce eventuali flush.',
            'Soluzione generata dal motore Tomasulo + ROB sulla traccia casuale.',
            sourceCode
        );
    }

    function sbInstruction(text, op, fuType, dest, srcs, latency) {
        var instruction = {
            text: text,
            op: op,
            fuType: fuType,
            dest: dest,
            srcs: srcs || [],
            hasWrite: true
        };
        if (latency) {
            instruction.latency = latency;
        }
        return instruction;
    }

    function expandScoreboardProgram(prelude, loopBody, iterations, postlude) {
        var program = [];
        prelude.forEach(function (instruction) {
            program.push(copyInstruction(instruction));
        });
        for (var index = 0; index < iterations; index += 1) {
            loopBody.forEach(function (instruction) {
                var copy = copyInstruction(instruction);
                copy.text = '[iter ' + (index + 1) + '] ' + copy.text;
                program.push(copy);
            });
        }
        postlude.forEach(function (instruction) {
            program.push(copyInstruction(instruction));
        });
        return program;
    }

    function copyInstruction(instruction) {
        var copy = {};
        Object.keys(instruction).forEach(function (key) {
            copy[key] = Array.isArray(instruction[key]) ? instruction[key].slice() : instruction[key];
        });
        return copy;
    }

    function tmInstruction(text, op, stationType, dest, srcs, extra) {
        var instruction = {
            text: text,
            op: op,
            stationType: stationType,
            dest: dest,
            srcs: srcs || []
        };
        return withExtra(instruction, extra);
    }

    function storeInstruction(text, valueReg, base, addrLabel, offset) {
        return {
            text: text,
            op: 's.d',
            stationType: 'store',
            srcs: [valueReg, base],
            valueReg: valueReg,
            base: base,
            addrLabel: addrLabel,
            offset: offset || 0
        };
    }

    function branchInstruction(text, leftReg, rightReg) {
        return {
            text: text,
            op: 'bne',
            stationType: 'int',
            srcs: [leftReg, rightReg],
            target: 'loop'
        };
    }

    function rbInstruction(text, op, stationType, dest, srcs, extra) {
        return tmInstruction(text, op, stationType, dest, srcs, extra);
    }

    function rbStoreInstruction(text, valueReg, base, addrLabel, offset) {
        return storeInstruction(text, valueReg, base, addrLabel, offset);
    }

    function rbBranchInstruction(text, leftReg, rightReg) {
        return branchInstruction(text, leftReg, rightReg);
    }

    function withExtra(instruction, extra) {
        Object.keys(extra || {}).forEach(function (key) {
            instruction[key] = extra[key];
        });
        return instruction;
    }

    function mergeObjects(parts) {
        var merged = {};
        parts.forEach(function (part) {
            Object.keys(part).forEach(function (key) {
                merged[key] = part[key];
            });
        });
        return merged;
    }

    function numericMemory(base, values, stride) {
        var memory = {};
        values.forEach(function (value, index) {
            memory[String(base + index * stride)] = value;
        });
        return memory;
    }

    function labelMemory(label, values, stride) {
        var memory = {};
        values.forEach(function (value, index) {
            memory[label + '+' + (index * stride)] = value;
        });
        return memory;
    }

    function randomDouble() {
        return Number((randomInt(120, 990) / 100).toFixed(2));
    }

    function randomDoubleList(count) {
        var values = [];
        for (var index = 0; index < count; index += 1) {
            values.push(randomDouble());
        }
        return values;
    }

    function sourceCodeForLesson(family, key, config) {
        if (family === TYPE_SCOREBOARD) {
            return scoreboardSourceCode(key);
        }
        return programSourceCode(config);
    }

    function scoreboardSourceCode(key) {
        var sources = {
            ex1: [
                '.data',
                'Ris: .space 32',
                'A: .double 1.1, 2.2, 3.3, 4.4',
                'C: .double 2.4',
                'S: .space 8',
                '.code',
                'daddi R2, R0, 16',
                'l.d F8, C(R0)',
                'daddi R5, R0, 0',
                'loop: l.d F4, A(R2)',
                'mul.d F6, F4, F8',
                'daddi R2, R2, -8',
                's.d F6, Ris(R5)',
                'sub.d F8, F8, F10',
                'daddi R5, R5, 8',
                'bne R2, R0, loop',
                'daddi R2, R0, 16'
            ],
            ex2: [
                '.data',
                'A: .double 6.9, 7.23, 1.62, 9.26',
                'C: .word 8, 0, 24, 16',
                'OP: .double 3.94, 0.72, 6.33, 4.17',
                '.code',
                'daddi R1, R0, 0',
                'daddi R3, R0, 16',
                'loop: ld R4, C(R1)',
                'l.d F2, A(R1)',
                'sub.d F8, F2, F8',
                'l.d F5, OP(R4)',
                'mul.d F6, F2, F5',
                'daddi R1, R1, 8',
                's.d F6, -8(R1)',
                's.d F8, 0(R1)',
                'bne R1, R3, loop',
                'syscall 0'
            ],
            ex3: [
                '.data',
                'Ris: .space 32',
                'K: .double 50.0',
                'OA: .double 1.1, 2.2, 3.3, 4.4, 5.5, 6.6',
                'OB: .double 5.11, 4.23, 13.62, 9.263',
                'C: .space 32',
                '.code',
                'daddi R2, R0, 0',
                'daddi R3, R0, 16',
                'l.d F8, K($0)',
                'loop: l.d F10, OB(R2)',
                'sub.d F8, F8, F10',
                'l.d F4, OA(R2)',
                'daddi R2, R2, 8',
                'add.d F6, F4, F8',
                'bne R2, R3, loop',
                's.d F6, C(R2)',
                'daddi R2, R0, 0'
            ],
            ex3a: [
                '.data',
                'Ris: .space 32',
                'K: .double 50.0',
                'OA: .double 1.1, 2.2, 3.3, 4.4, 5.5, 6.6',
                'OB: .double 5.11, 4.23, 13.62, 9.263',
                'C: .space 32',
                '.code',
                'daddi R2, R0, 0',
                'daddi R3, R0, 16',
                'l.d F8, K($0)',
                'loop: l.d F10, OB(R2)',
                'sub.d F8, F8, F10',
                'l.d F4, OA(R2)',
                'daddi R2, R2, 8',
                'add.d F6, F4, F8',
                'bne R2, R3, loop',
                'end: s.d F6, C(R2)',
                'daddi R2, R0, 0'
            ],
            ex4: [
                '.data',
                'C: .double 2.4',
                'A: .double 6.9, 7.23, 1.62, 9.263',
                'Z: .space 32',
                'S: .space 8',
                '.code',
                'l.d F8, C(R0)',
                'daddi R2, R0, 0',
                'daddi R3, R0, 16',
                'loop: l.d F4, A(R2)',
                'div.d F6, F4, F8',
                'daddi R5, R2, 0',
                'daddi R2, R2, 8',
                'sub.d F8, F8, F10',
                's.d F6, Z(R5)',
                'bne R2, R3, loop',
                'daddi R2, R0, 0',
                's.d F8, S(R0)'
            ]
        };
        return sources[key] ? sources[key].join('\n') : '';
    }

    function programSourceCode(config) {
        if (!config || !config.program) {
            return '';
        }
        return dataSectionFromConfig(config) + '\n\n.code\n' + config.program.map(function (instruction) {
            return (instruction.label ? instruction.label + ': ' : ' ') + instruction.text;
        }).join('\n');
    }

    function dataSectionFromConfig(config) {
        var labels = collectDataLabels(config);
        if (!labels.length) {
            return '.data';
        }
        return ['.data'].concat(labels.map(function (label) {
            var values = valuesForDataLabel(config, label);
            if (!values.length) {
                return label + ': .space 32';
            }
            return label + ': ' + dataDirective(label, values) + ' ' + values.map(sourceNumber).join(', ');
        })).join('\n');
    }

    function collectDataLabels(config) {
        var labels = [];
        function push(label) {
            if (label && labels.indexOf(label) === -1) {
                labels.push(label);
            }
        }
        Object.keys(config.bases || {}).forEach(push);
        Object.keys(config.memory || {}).forEach(function (key) {
            var match = String(key).match(/^([A-Za-z][A-Za-z0-9_]*)\+/);
            if (match) {
                push(match[1]);
            }
        });
        (config.program || []).forEach(function (instruction) {
            push(instruction.addrLabel);
        });
        return labels.sort();
    }

    function valuesForDataLabel(config, label) {
        var memory = config.memory || {};
        var values = [];
        var entries = [];
        Object.keys(memory).forEach(function (key) {
            var stringKey = String(key);
            var prefix = label + '+';
            if (stringKey.indexOf(prefix) === 0) {
                entries.push({ offset: Number(stringKey.substring(prefix.length)) || 0, value: memory[key] });
            }
        });
        if (entries.length) {
            entries.sort(function (a, b) { return a.offset - b.offset; });
            return entries.map(function (entry) { return entry.value; });
        }
        if (Object.prototype.hasOwnProperty.call(config.bases || {}, label)) {
            var base = Number(config.bases[label]);
            for (var offset = 0; offset <= 56; offset += 8) {
                var numericKey = String(base + offset);
                if (Object.prototype.hasOwnProperty.call(memory, numericKey)) {
                    values.push(memory[numericKey]);
                }
            }
        }
        return values;
    }

    function dataDirective(label, values) {
        if (label === 'C' && values.every(function (value) { return Number.isInteger(value); })) {
            return '.word';
        }
        return '.double';
    }

    function sourceNumber(value) {
        if (typeof value !== 'number') {
            return String(value);
        }
        if (Math.abs(value - Math.round(value)) < 1e-9) {
            return String(Math.round(value));
        }
        return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    }

    function fallbackTomasuloSourceCode() {
        return [
            '.data',
            'A: .double 6.9, 7.23, 1.62, 9.26',
            'E: .double 1.3',
            'C: .double 5.7',
            'P: .space 16',
            'Ris: .space 8',
            '.code',
            'l.d F10, E(R0)',
            'l.d F8, C(R0)',
            'daddi R3, R0, 16',
            'daddi R2, R3, -16',
            'loop: l.d F2, A(R2)',
            's.d F8, P(R2)',
            'daddi R2, R2, 8',
            'sub.d F8, F8, F10',
            'add.d F6, F2, F8',
            'mul.d F4, F2, F6',
            'bne R2, R3, loop',
            's.d F4, Ris(R0)'
        ].join('\n');
    }

    function fallbackRobSourceCode() {
        return [
            '.data',
            'C: .double 12.5',
            'P: .double 3.94, 7.72, 6.33, 4.17',
            '.code',
            'daddi R2, R0, 0',
            'daddi R3, R0, 16',
            'l.d F8, C(R0)',
            'loop: l.d F4, P(R2)',
            'mul.d F6, F4, F8',
            'sub.d F10, F8, F4',
            's.d F10, 0(R2)',
            'daddi R2, R2, 8',
            's.d F6, 0(R5)',
            'daddi R5, R5, 8',
            'bne R2, R3, loop',
            'daddi R2, R0, 0'
        ].join('\n');
    }

    function scoreboardLessonRules(config) {
        var lines = [
            'Regole del testo:',
            'Fetch: ' + countText(config.fetchWidth) + ' istruzione/i per ciclo.',
            'Issue: ' + countText(config.issueWidth) + ' istruzione/i per ciclo, in ordine.',
            'FU disponibili: INT=' + countText(config.units.int)
                + ', FP Add/Sub=' + countText(config.units.fpAdd)
                + ', FP Mul=' + countText(config.units.fpMul)
                + ', FP Div=' + countText(config.units.fpDiv) + '.',
            'Latenze Execute: INT/store/branch=' + countText(config.latencies.int)
                + ', load=' + countText((config.rules && config.rules.loadExecuteLatency) || config.latencies.int)
                + ', add/sub=' + countText(config.latencies.fpAdd)
                + ', mul=' + countText(config.latencies.fpMul)
                + ', div=' + countText(config.latencies.fpDiv) + ' cicli.',
            'Hazard: Issue controlla FU libera e WAW; Read aspetta RAW; Write controlla WAR.'
        ];
        if (config.rules && config.rules.storeSerialization) {
            lines.push('Regola speciale: una store resta bloccata in Issue finche\' una store precedente attiva non termina.');
        }
        if (config.rules && config.rules.loadBlockedByStoreUntilRead) {
            lines.push('Regola speciale: una load resta bloccata se una store precedente non ha ancora completato Read.');
        }
        if (config.rules && config.rules.fetchBlockedUntilPreviousIssue) {
            lines.push('Regola speciale: il Fetch resta fermo se l\'istruzione precedente non ha ancora completato Issue.');
        }
        if (config.rules && config.rules.issueUsesStartOfCycleFu) {
            lines.push('Regola speciale: una FU liberata in Write diventa riutilizzabile dal ciclo successivo.');
        }
        if (config.rules && config.rules.issueUsesStartOfCycleRegisters) {
            lines.push('Regola speciale: il controllo WAW in Issue usa lo stato dei registri a inizio ciclo.');
        }
        if (config.rules && config.rules.readUsesStartOfCycleValues) {
            lines.push('Regola speciale: una Read non puo\' consumare un valore scritto nello stesso ciclo.');
        }
        if (config.rules && config.rules.singleWritePerCycle) {
            lines.push('Regola speciale: una sola istruzione completa la fase Write per ciclo.');
        }
        return lines.join('\n');
    }

    function tomasuloLessonRules(config) {
        return [
            'Regole del testo:',
            'Reservation station/buffer: Load=' + countText(config.buffers.load)
                + ', Store=' + countText(config.buffers.store)
                + ', Add/Sub=' + countText(config.buffers.add)
                + ', Mul/Div=' + countText(config.buffers.mul)
                + ', Int=' + countText(config.buffers.int) + '.',
            'Unita\' di esecuzione: Load=' + countText(config.executionUnits.load)
                + ', Store=' + countText(config.executionUnits.store)
                + ', Add/Sub=' + countText(config.executionUnits.add)
                + ', Mul/Div=' + countText(config.executionUnits.mul)
                + ', Int=' + countText(config.executionUnits.int) + '.',
            'Latenze Execute: load=' + countText(config.latencies.load)
                + ', store=' + countText(config.latencies.store)
                + ', add/sub=' + countText(config.latencies.add)
                + ', mul=' + countText(config.latencies.mul)
                + ', div=' + countText(config.latencies.div)
                + ', int/branch=' + countText(config.latencies.int) + ' cicli.',
            'CDB: uno solo per ciclo; load, operazioni FP e int scrivono sul CDB; store, branch e syscall scrivono fuori dal CDB.',
            'Branch: non speculativo; dopo il fetch del branch il fetch resta fermo finche\' il branch non viene risolto.',
            'Memoria: load/store seguono una coda conservativa, quindi parte solo chi e\' in testa alla coda load/store.'
        ].join('\n');
    }

    function robLessonRules(config) {
        return [
            'Regole del testo:',
            'Reservation station/buffer: Load=' + countText(config.buffers.load)
                + ', Store=' + countText(config.buffers.store)
                + ', Add/Sub=' + countText(config.buffers.add)
                + ', Mul/Div=' + countText(config.buffers.mul)
                + ', Int=' + countText(config.buffers.int)
                + ', ROB=' + countText(config.buffers.rob) + '.',
            'Unita\' di esecuzione: Load=' + countText(config.executionUnits.load)
                + ', Store=' + countText(config.executionUnits.store)
                + ', Add/Sub=' + countText(config.executionUnits.add)
                + ', Mul/Div=' + countText(config.executionUnits.mul)
                + ', Int=' + countText(config.executionUnits.int) + '.',
            'Latenze Execute: load=' + countText(config.latencies.load)
                + ', store=' + countText(config.latencies.store)
                + ', add/sub=' + countText(config.latencies.add)
                + ', mul=' + countText(config.latencies.mul)
                + ', div=' + countText(config.latencies.div)
                + ', int/branch=' + countText(config.latencies.int) + ' cicli.',
            branchPredictorRules(config.predictor),
            'Issue: servono contemporaneamente una reservation station/buffer libera e una entry libera nel ROB.',
            'Write Result: aggiorna ROB e reservation station in attesa; la store rende pronta la sua entry con indirizzo e valore.',
            'Commit: sempre in ordine dalla testa del ROB; se un branch e\' mispredetto, al commit vengono flushate le istruzioni speculative.'
        ].join('\n');
    }

    function officialTomasuloLessonSchedule(key) {
        if (key === 'ex1') {
            return {
                rows: [
                    'l.d F10, E(R0)',
                    'daddi R2, R0, 0',
                    'daddi R3, R0, 16',
                    'l.d F8, C(R0)',
                    '[iter 1] l.d F4, A(R2)',
                    '[iter 1] div.d F6, F4, F8',
                    '[iter 1] daddi R5, R2, 0',
                    '[iter 1] daddi R2, R2, 8',
                    '[iter 1] sub.d F8, F8, F10',
                    '[iter 1] s.d F6, Z(R5)',
                    '[iter 1] bne R2, R3, loop',
                    'daddi R2, R0, 0',
                    's.d F8, S(R0)',
                    '[iter 2] l.d F4, A(R2)',
                    '[iter 2] div.d F6, F4, F8',
                    '[iter 2] daddi R5, R2, 0',
                    '[iter 2] daddi R2, R2, 8',
                    '[iter 2] sub.d F8, F8, F10',
                    '[iter 2] s.d F6, Z(R5)',
                    '[iter 2] bne R2, R3, loop',
                    'daddi R2, R0, 0',
                    's.d F8, S(R0)'
                ],
                expected: [
                    ['1', '2', '3-4', '5'],
                    ['2', '3', '4', '6'],
                    ['3', '4', '5', '7'],
                    ['4', '5', '6-7', '8'],
                    ['5', '6', '7-8', '9'],
                    ['6', '7', '10-18', '19'],
                    ['7', '8', '9', '10'],
                    ['8', '9', '10', '11'],
                    ['9', '10', '11-12', '13'],
                    ['10', '11', '12', '20'],
                    ['11', '12', '13', '14'],
                    ['12', '13', '-', '-'],
                    ['13', '14', '-', '-'],
                    ['15', '16', '17-21', '22'],
                    ['16', '17', '23-31', '32'],
                    ['17', '18', '19', '20'],
                    ['18', '19', '20', '21'],
                    ['19', '20', '21-22', '23'],
                    ['20', '21', '22', '33'],
                    ['21', '22', '23', '24'],
                    ['22', '23', '25', '26'],
                    ['23', '24', '25', '34']
                ]
            };
        }
        if (key === 'ex2') {
            return {
                rows: [
                    'l.d F10, E(R0)',
                    'l.d F8, C(R0)',
                    'daddi R3, R0, 16',
                    'daddi R2, R3, -16',
                    '[iter 1] l.d F2, A(R2)',
                    '[iter 1] s.d F8, P(R2)',
                    '[iter 1] daddi R2, R2, 8',
                    '[iter 1] sub.d F8, F8, F10',
                    '[iter 1] add.d F6, F2, F8',
                    '[iter 1] mul.d F4, F2, F6',
                    '[iter 1] bne R2, R3, loop',
                    's.d F4, Ris(R0)',
                    '[iter 2] l.d F2, A(R2)',
                    '[iter 2] s.d F8, P(R2)',
                    '[iter 2] daddi R2, R2, 8',
                    '[iter 2] sub.d F8, F8, F10',
                    '[iter 2] add.d F6, F2, F8',
                    '[iter 2] mul.d F4, F2, F6',
                    '[iter 2] bne R2, R3, loop',
                    's.d F4, Ris(R0)'
                ],
                expected: [
                    ['1', '2', '3-4', '5'],
                    ['2', '3', '4-5', '6'],
                    ['3', '4', '5', '7'],
                    ['4', '5', '8', '9'],
                    ['5', '6', '10-11', '12'],
                    ['6', '7', '11', '12'],
                    ['7', '8', '10', '11'],
                    ['8', '9', '10-11', '13'],
                    ['9', '10', '14-15', '16'],
                    ['10', '11', '17-20', '21'],
                    ['11', '12', '13', '14'],
                    ['12', '13', '-', '-'],
                    ['15', '16', '17-18', '19'],
                    ['16', '17', '18', '19'],
                    ['17', '18', '19', '20'],
                    ['18', '19', '20-21', '22'],
                    ['19', '20', '23-24', '25'],
                    ['20', '21', '26-29', '30'],
                    ['21', '22', '23', '24'],
                    ['22', '23', '25', '31']
                ]
            };
        }
        return null;
    }

    function officialRobLessonSchedule(key) {
        if (key === 'ex1') {
            return {
                rows: [
                    'daddi R1, R0, 0',
                    'daddi R3, R0, 16',
                    '[iter 1] l.d F2, A(R1)',
                    '[iter 1] ld R4, C(R1)',
                    '[iter 1] l.d F5, P(R4)',
                    '[iter 1] sub.d F8, F2, F8',
                    '[iter 1] mul.d F6, F2, F5',
                    '[iter 1] s.d F6, 0(R1)',
                    '[iter 1] daddi R1, R1, 8',
                    '[iter 1] s.d F8, 0(R1)',
                    '[iter 1] bne R1, R3, loop',
                    '[iter 2] l.d F2, A(R1)',
                    '[iter 2] ld R4, C(R1)',
                    '[iter 2] l.d F5, P(R4)',
                    '[iter 2] sub.d F8, F2, F8',
                    '[iter 2] mul.d F6, F2, F5',
                    '[iter 2] s.d F6, 0(R1)',
                    '[iter 2] daddi R1, R1, 8',
                    '[iter 2] s.d F8, 0(R1)',
                    '[iter 2] bne R1, R3, loop',
                    '[iter 3] l.d F2, A(R1)',
                    '[iter 3] ld R4, C(R1)',
                    '[iter 3] l.d F5, P(R4)',
                    'syscall 0'
                ],
                expected: [
                    ['1', '2', '3', '4', '5'],
                    ['2', '3', '4', '5', '6'],
                    ['3', '4', '5-6', '7', '8'],
                    ['4', '5', '6-7', '8', '9'],
                    ['5', '8', '9-10', '11', '12'],
                    ['8', '9', '10-11', '12', '13'],
                    ['9', '10', '12-15', '16', '17'],
                    ['10', '11', '12', '17', '18'],
                    ['11', '12', '13', '14', '19'],
                    ['12', '13', '15', '18', '20'],
                    ['13', '14', '15', '19', '21'],
                    ['14', '18', '19-21', '22', '23'],
                    ['18', '19', '20-22', '23', '24'],
                    ['19', '23', '24-25', '26', '27'],
                    ['23', '24', '25-26', '27', '28'],
                    ['24', '25', '27-30', '31', '32'],
                    ['25', '26', '27', '32', '33'],
                    ['26', '27', '28', '29', '34'],
                    ['27', '28', '30', '33', '35'],
                    ['28', '29', '30', '34', '36'],
                    ['29', '33', '34-35', '-', '-'],
                    ['33', '34', '35', '-', '-'],
                    ['34', '-', '-', '-', '-'],
                    ['37', '38', '39', '40', '41']
                ]
            };
        }
        if (key === 'ex2') {
            return {
                rows: [
                    'daddi R2, R0, 0',
                    'daddi R3, R0, 16',
                    'l.d F8, C(R0)',
                    '[iter 1] l.d F4, P(R2)',
                    '[iter 1] mul.d F6, F4, F8',
                    '[iter 1] sub.d F10, F8, F4',
                    '[iter 1] s.d F10, 0(R2)',
                    '[iter 1] daddi R2, R2, 8',
                    '[iter 1] s.d F6, 0(R5)',
                    '[iter 1] daddi R5, R5, 8',
                    '[iter 1] bne R2, R3, loop',
                    'daddi R2, R0, 0',
                    '[iter 2] l.d F4, P(R2)',
                    '[iter 2] mul.d F6, F4, F8',
                    '[iter 2] sub.d F10, F8, F4',
                    '[iter 2] s.d F10, 0(R2)',
                    '[iter 2] daddi R2, R2, 8',
                    '[iter 2] s.d F6, 0(R5)',
                    '[iter 2] daddi R5, R5, 8',
                    '[iter 2] bne R2, R3, loop',
                    '[iter 3] l.d F4, P(R2)',
                    '[iter 3] mul.d F6, F4, F8',
                    '[iter 3] sub.d F10, F8, F4',
                    '[iter 3] s.d F10, 0(R2)',
                    '[iter 3] daddi R2, R2, 8',
                    '[iter 3] s.d F6, 0(R5)',
                    'daddi R2, R0, 0'
                ],
                expected: [
                    ['1', '2', '3', '4', '5'],
                    ['2', '3', '4', '5', '6'],
                    ['3', '4', '5-6', '7', '8'],
                    ['4', '5', '6-7', '8', '9'],
                    ['5', '6', '9-12', '13', '14'],
                    ['6', '7', '9-10', '11', '15'],
                    ['7', '8', '9', '12', '16'],
                    ['8', '9', '10', '14', '17'],
                    ['9', '10', '11', '15', '18'],
                    ['10', '11', '12', '16', '19'],
                    ['11', '12', '15', '17', '20'],
                    ['12', '15', '16', '18', '-'],
                    ['21', '22', '23-24', '25', '26'],
                    ['22', '23', '26-29', '30', '31'],
                    ['23', '24', '26-27', '28', '32'],
                    ['24', '25', '26', '29', '33'],
                    ['25', '26', '27', '31', '34'],
                    ['26', '27', '28', '32', '35'],
                    ['27', '28', '29', '33', '36'],
                    ['28', '29', '32', '34', '37'],
                    ['29', '32', '33-34', '35', '-'],
                    ['32', '33', '36', '-', '-'],
                    ['33', '34', '36', '-', '-'],
                    ['34', '35', '36', '-', '-'],
                    ['35', '36', '-', '-', '-'],
                    ['36', '-', '-', '-', '-'],
                    ['38', '39', '40', '41', '42']
                ]
            };
        }
        return null;
    }

    function branchPredictorRules(predictor) {
        if (!predictor) {
            return 'Predittore branch: non specificato.';
        }
        if (predictor.type === 'fixed') {
            return 'Predittore branch: fisso, predice sempre ' + (predictor.initialTaken ? 'taken' : 'not taken')
                + '; target ' + (predictor.targetKnown ? 'noto' : 'non noto') + '.';
        }
        if (predictor.type === 'oneBitLocal') {
            return 'Predittore branch: locale a 1 bit, inizialmente ' + (predictor.initialTaken ? 'taken' : 'not taken')
                + '; target ' + (predictor.targetKnown ? 'noto' : 'non noto') + '.';
        }
        return 'Predittore branch: ' + predictor.type + '.';
    }

    function countText(value) {
        return value === null || typeof value === 'undefined' ? '-' : String(value);
    }

    function lessonCode(family, key) {
        var prefix = family === TYPE_SCOREBOARD ? 'SB' : (family === TYPE_TOMASULO ? 'TM' : 'RB');
        return 'ACA-' + prefix + '-EX' + key.replace(/^ex/, '').toUpperCase();
    }

    function cycleValue(value) {
        return value === null || typeof value === 'undefined' ? '-' : String(value);
    }

    function rangeValue(start, end) {
        if (start === null || typeof start === 'undefined') {
            return '-';
        }
        if (end === null || typeof end === 'undefined') {
            return start + '...';
        }
        if (start === end) {
            return String(start);
        }
        return start + '-' + end;
    }

    function archiveExercises() {
        return [
            generateScoreboardExercise(),
            generateTomasuloExercise(),
            generateRobExercise()
        ];
    }

    function makeExercise(type, code, topic, title, context, rules, prompt, columns, rows, expected, rule, solutionNote, sourceCode) {
        return {
            type: type,
            code: code,
            topic: topic,
            title: title,
            context: context,
            rules: rules,
            prompt: prompt,
            sourceCode: sourceCode || '',
            columns: columns,
            rows: rows,
            expected: expected,
            explanations: genericExplanations(rows, columns, expected, rule),
            solutionNote: solutionNote
        };
    }

    function genericExplanations(rows, columns, expected, rule) {
        return rows.map(function (_row, rowIndex) {
            return columns.map(function (_column, colIndex) {
                return rule + ' Per questa cella il valore corretto e\' ' + expected[rowIndex][colIndex] + '.';
            });
        });
    }

    function cloneExercise(exercise) {
        return {
            type: exercise.type,
            code: exercise.code,
            topic: exercise.topic,
            title: exercise.title,
            context: exercise.context,
            rules: exercise.rules,
            prompt: exercise.prompt,
            sourceCode: exercise.sourceCode || '',
            columns: exercise.columns.slice(),
            rows: exercise.rows.slice(),
            expected: exercise.expected.map(function (row) { return row.slice(); }),
            explanations: exercise.explanations.map(function (row) { return row.slice(); }),
            solutionNote: exercise.solutionNote
        };
    }

    function generateScoreboardExercise() {
        var lesson = generateLessonExercise(TYPE_SCOREBOARD, 'ex2');
        if (lesson) {
            return lesson;
        }
        var columns = ['Fetch', 'Issue', 'Read', 'Execute', 'Write'];
        var rows = [
            'daddi R1, R0, 0',
            'daddi R3, R0, 16',
            '[iter 1] ld R4, C(R1)',
            '[iter 1] l.d F2, A(R1)',
            '[iter 1] sub.d F8, F2, F8',
            '[iter 1] l.d F5, OP(R4)',
            '[iter 1] mul.d F6, F2, F5',
            '[iter 1] daddi R1, R1, 8',
            '[iter 1] s.d F6, -8(R1)',
            '[iter 1] s.d F8, 0(R1)',
            '[iter 1] bne R1, R3, loop',
            '[iter 2] ld R4, C(R1)',
            '[iter 2] l.d F2, A(R1)',
            '[iter 2] sub.d F8, F2, F8',
            '[iter 2] l.d F5, OP(R4)',
            '[iter 2] mul.d F6, F2, F5',
            '[iter 2] daddi R1, R1, 8',
            '[iter 2] s.d F6, -8(R1)',
            '[iter 2] s.d F8, 0(R1)',
            '[iter 2] bne R1, R3, loop',
            'syscall 0'
        ];
        var expected = [
            ['1', '2', '3', '4', '5'],
            ['2', '3', '4', '5', '6'],
            ['3', '4', '5', '6', '7'],
            ['4', '5', '6', '7', '8'],
            ['5', '6', '8', '9-10', '11'],
            ['6', '7', '8', '9', '10'],
            ['7', '8', '10', '11-14', '15'],
            ['8', '9', '10', '11', '12'],
            ['9', '10', '15', '16', '17'],
            ['10', '17', '18', '19', '20'],
            ['11', '18', '19', '20', '-'],
            ['21', '22', '23', '24', '25'],
            ['22', '23', '24', '25', '26'],
            ['23', '24', '26', '27-28', '29'],
            ['24', '25', '26', '27', '28'],
            ['25', '26', '28', '29-32', '33'],
            ['26', '27', '28', '29', '30'],
            ['27', '28', '33', '34', '35'],
            ['28', '35', '36', '37', '38'],
            ['29', '36', '37', '38', '-'],
            ['39', '40', '41', '42', '-']
        ];
        return makeExercise(
            TYPE_SCOREBOARD,
            CODE_SCOREBOARD,
            'Scoreboard',
            'Generato - Scoreboard completo',
            'Esercizio 2 del simulatore: due store consecutive, due iterazioni del loop, una Fetch e una Issue per ciclo.',
            'Fetch = 1 istruzione/ciclo; Issue = 1 istruzione/ciclo, sempre in ordine.\nFU disponibili: INT=3, FP Add/Sub=2, FP Mul=1, FP Div=1.\nLatenze Execute: INT/load/store/branch=1 ciclo, add/sub=2 cicli, mul=4 cicli, div=10 cicli.\nIssue controlla FU libera e WAW; Read aspetta RAW; Write controlla WAR.\nRegola della traccia: la seconda store resta bloccata finche\' la prima store non termina.',
            'Inserisci i cicli. Puoi annotare il motivo, es. RAW(3-5)-6; per intervalli usa 7-10 e per celle non applicabili "-".',
            columns,
            rows,
            expected,
            'Scoreboard: controlla FU libera, WAW in Issue, RAW in Read e WAR in Write.',
            'Tabella completa: prelude, due iterazioni del loop e syscall finale. Gli stalli piu\' importanti sono RAW in Read e serializzazione delle due store.',
            scoreboardSourceCode('ex2')
        );
    }

    function generateTomasuloExercise() {
        var lesson = generateLessonExercise(TYPE_TOMASULO, 'ex2');
        if (lesson) {
            return lesson;
        }
        var columns = ['Fetch', 'Issue', 'Execute', 'Write'];
        var rows = [
            'l.d F10, E(R0)',
            'l.d F8, C(R0)',
            'daddi R3, R0, 16',
            'daddi R2, R3, -16',
            '[iter 1] l.d F2, A(R2)',
            '[iter 1] s.d F8, P(R2)',
            '[iter 1] daddi R2, R2, 8',
            '[iter 1] sub.d F8, F8, F10',
            '[iter 1] add.d F6, F2, F8',
            '[iter 1] mul.d F4, F2, F6',
            '[iter 1] bne R2, R3, loop',
            '[iter 2] l.d F2, A(R2)',
            '[iter 2] s.d F8, P(R2)',
            '[iter 2] daddi R2, R2, 8',
            '[iter 2] sub.d F8, F8, F10',
            '[iter 2] add.d F6, F2, F8',
            '[iter 2] mul.d F4, F2, F6',
            '[iter 2] bne R2, R3, loop',
            's.d F4, Ris(R0)'
        ];
        var expected = [
            ['1', '2', '3-4', '5'],
            ['2', '3', '5-6', '7'],
            ['3', '4', '5', '6'],
            ['4', '5', '6', '8'],
            ['5', '6', '8-9', '10'],
            ['6', '7', '10-11', '12'],
            ['7', '8', '9', '11'],
            ['8', '9', '10-11', '12'],
            ['9', '10', '12-13', '14'],
            ['10', '11', '14-17', '18'],
            ['11', '12', '13', '14'],
            ['14', '15', '16-17', '19'],
            ['15', '16', '19-20', '21'],
            ['16', '17', '18', '20'],
            ['17', '18', '19-20', '21'],
            ['18', '19', '21-22', '23'],
            ['19', '20', '23-26', '27'],
            ['20', '21', '22', '23'],
            ['23', '24', '27-28', '29']
        ];
        return makeExercise(
            TYPE_TOMASULO,
            CODE_TOMASULO,
            'Tomasulo',
            'Generato - Tomasulo completo',
            'Esercizio 2 del simulatore: store nel loop, CDB singolo, branch non speculativo e post-loop finale su Ris.',
            'Reservation station/buffer: Load=2, Store=2, Add/Sub=2, Mul/Div=2, Int=3.\nUnita\' di esecuzione: 1 load, 1 store, 1 add/sub, 1 mul/div, 1 int.\nLatenze Execute: load=2 cicli, store=2 cicli, add/sub=2 cicli, mul=4 cicli, div=8 cicli, int/branch=1 ciclo.\nCDB singolo: una sola Write Result su CDB per ciclo; le store scrivono fuori dal CDB.\nBranch non speculativo: dopo il fetch del branch, il fetch resta fermo finche\' il branch non viene risolto.',
            'Compila Fetch, Issue, intervallo Execute e Write/CDB. Puoi scrivere anche RAW(3-5)-6 o CDB(10)-12-13.',
            columns,
            rows,
            expected,
            'Tomasulo: l\'Issue puo\' partire con tag, ma Execute aspetta operandi pronti e CDB disponibile.',
            'Tabella completa: Tomasulo consente Issue con tag, ma Execute aspetta operandi pronti, coda load/store e CDB disponibile.',
            fallbackTomasuloSourceCode()
        );
    }

    function generateRobExercise() {
        var lesson = generateLessonExercise(TYPE_ROB, 'ex2');
        if (lesson) {
            return lesson;
        }
        var columns = ['Fetch', 'Issue', 'Execute', 'Write', 'Commit'];
        var rows = [
            'daddi R2, R0, 0',
            'daddi R3, R0, 16',
            'l.d F8, C(R0)',
            '[iter 1] l.d F4, P(R2)',
            '[iter 1] mul.d F6, F4, F8',
            '[iter 1] sub.d F10, F8, F4',
            '[iter 1] s.d F10, 0(R2)',
            '[iter 1] daddi R2, R2, 8',
            '[iter 1] s.d F6, 0(R5)',
            '[iter 1] daddi R5, R5, 8',
            '[iter 1] bne R2, R3, loop',
            'daddi R2, R0, 0',
            '[iter 2] l.d F4, P(R2)',
            '[iter 2] mul.d F6, F4, F8',
            '[iter 2] sub.d F10, F8, F4',
            '[iter 2] s.d F10, 0(R2)',
            '[iter 2] daddi R2, R2, 8',
            '[iter 2] s.d F6, 0(R5)',
            '[iter 2] daddi R5, R5, 8',
            '[iter 2] bne R2, R3, loop',
            '[iter 3] l.d F4, P(R2)',
            '[iter 3] mul.d F6, F4, F8',
            '[iter 3] sub.d F10, F8, F4',
            '[iter 3] s.d F10, 0(R2)',
            '[iter 3] daddi R2, R2, 8',
            '[iter 3] s.d F6, 0(R5)',
            '[iter 3] daddi R5, R5, 8',
            '[iter 3] bne R2, R3, loop',
            'daddi R2, R0, 0'
        ];
        var expected = [
            ['1', '2', '3', '4', '5'],
            ['2', '3', '4', '5', '6'],
            ['3', '4', '5-6', '7', '8'],
            ['4', '5', '6-7', '8', '9'],
            ['5', '6', '8-11', '12', '13'],
            ['6', '7', '8-9', '10', '14'],
            ['7', '8', '9-10', '11', '15'],
            ['8', '9', '10', '13', '16'],
            ['9', '10', '15-16', '17', '18'],
            ['10', '11', '12', '14', '19'],
            ['11', '12', '13', '15', '20'],
            ['12', '13', '14', '16', '-'],
            ['20', '21', '22-23', '24', '25'],
            ['21', '22', '24-27', '28', '29'],
            ['22', '23', '24-25', '26', '30'],
            ['23', '24', '25-26', '27', '31'],
            ['24', '25', '26', '29', '32'],
            ['25', '26', '31-32', '33', '34'],
            ['26', '27', '28', '30', '35'],
            ['27', '28', '29', '31', '36'],
            ['28', '29', '32-33', '34', '-'],
            ['29', '30', '34...', '-', '-'],
            ['30', '31', '34-35', '-', '-'],
            ['31', '32', '34-35', '-', '-'],
            ['32', '34', '35', '-', '-'],
            ['33', '35', '-', '-', '-'],
            ['34', '-', '-', '-', '-'],
            ['35', '-', '-', '-', '-'],
            ['36', '37', '38', '39', '40']
        ];
        return makeExercise(
            TYPE_ROB,
            CODE_ROB,
            'Tomasulo + ROB',
            'Generato - ROB completo',
            'Esercizio 2 del simulatore: predictor locale a 1 bit inizialmente not taken, ROB da 7 entry, commit in ordine e flush al branch.',
            'Reservation station/buffer: Load=2, Store=2, Add/Sub=2, Mul/Div=2, Int=3; ROB=7 entry.\nUnita\' di esecuzione: 1 load, 1 store, 1 add/sub, 1 mul/div, 1 int.\nLatenze Execute: load=2 cicli, store=2 cicli, add/sub=2 cicli, mul=4 cicli, div=10 cicli, int/branch=1 ciclo.\nPredittore branch: locale a 1 bit, inizialmente not taken, target noto.\nWrite Result aggiorna ROB/RS; Commit e\' in ordine dalla testa del ROB. Se il branch al commit e\' mispredetto, le istruzioni speculative vengono flushate.',
            'Compila Fetch, Issue, Execute, Write e Commit. Puoi annotare RAW/WAR/WAW/CDB; le righe flushate hanno "-" dove non completano.',
            columns,
            rows,
            expected,
            'ROB: Write e Execute possono anticipare, ma Commit resta in ordine dalla testa.',
            'Tabella completa: le righe di iter 3 mostrano il percorso speculativo poi flushato; per questo molte celle restano "-".',
            fallbackRobSourceCode()
        );
    }
})();
