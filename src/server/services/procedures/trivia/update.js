const fs = require('fs').promises;
const cheerio = require('cheerio');
const axios = require('axios');
const parseDate = require('date-fns/parse');
const pMap = require('p-map');
const zlib = require('zlib');
const util = require('util');

const questionCleanup = [
    [/[\[\(](video|audio) daily double[\]\)]\s?/ig, ''],
];

const fetchGameData = async (gameId, logState) => {
    const { data } = await axios.get(`http://www.j-archive.com/showgame.php?game_id=${gameId}`)

    const $ = cheerio.load(data);

    const airdateString = $('#game_title').text().split('day, ')[1];
    const airdateDate = parseDate(airdateString, 'MMMM d, yyyy', new Date());
    const airdate = `${airdateDate.getFullYear()}/${(airdateDate.getMonth() + 1).toString().padStart(2, '0')}/${airdateDate.getDate().toString().padStart(2, '0')}`;

    const categories = [];
    $('.category_name').each(function() {
        categories.push($(this).text());
    });
    const rounds = (categories.length - 1) / 6;

    const questions = [];
    $('.clue').each(function(i, elem) {
        try {
            let valueStep;
            if (rounds === 2) valueStep = [200, 400];
            else if (rounds === 3) valueStep = [100, 200, 300];
            else throw Error(`unsupported number of rounds: ${rounds}`);

            let category, value;
            if (i < 30 * rounds) { // jeopardy / double jeopardy / triple jeopardy / etc.
                category = categories[Math.floor(i / 30) * 6 + i % 6];
                value = valueStep[Math.floor(i / 30)] * Math.floor(i % 30 / 6 + 1);
            } else if (i === 30 * rounds) { // final jeopardy
                category = categories[categories.length - 1];
                value = 0;
            } else {
                throw Error(`too many questions!! i = ${i}`);
            }

            let question = $('.clue_text', elem).text();
            for (const [pat, rep] of questionCleanup) {
                question = question.replace(pat, rep);
            }

            let answer;
            if (i < 60) {
                const mouseOverContent = $('div', elem).attr('onmouseover');
                answer = $('.correct_response', mouseOverContent).text();
            } else if (i === 60) {
                const mouseOverContent = $('.final_round div').attr('onmouseover');
                answer = $('.correct_response', mouseOverContent).text();
            }

            if (typeof(category) !== 'string' || category === '') throw Error(`invalid category '${category}'`);
            if (typeof(airdate) !== 'string' || airdate === '') throw Error(`invalid airdate '${airdate}'`);
            if (typeof(value) !== 'number') throw Error(`invalid value '${value}'`);

            if (question || answer) {
                if (typeof(question) !== 'string' || question === '') throw Error(`invalid question '${question}'`);
                if (typeof(answer) !== 'string' || answer === '') throw Error(`invalid answer '${answer}'`);

                questions.push({ gameId, i, question, answer, value, category, airdate });
            }
        } catch (err) {
            logState.badQuestions.push({ gameId, i, err: err.toString() });
        }
    });

    logState.doneGames += 1;
    logState.doneQuestions += questions.length;
    process.stdout.write(`\rcompleted ${logState.doneGames} games (${logState.doneQuestions} questions) (${logState.badQuestions.length} broken questions)`);

    return questions;
};

const ignorePatterns = [
    /\[(?:[^\[\]]*\b(audio|music|song|sings|plays|video|instrumental|flag|outline|logo)\b[^\[\]]*|\d+)\]/i,
];

const main = async numGames => {
    // Use p-map to throttle http requests to j-archive to avoid timeouts
    const logState = { doneGames: 0, doneQuestions: 0, badQuestions: [] };
    const questions = (await pMap(new Array(numGames), (_, i) => fetchGameData(i + 1, logState), { concurrency: 15 })).reduce((a, b) => a.concat(b), []);

    const keep = [];
    const reject = [];
    const questionSet = new Set();
    const classify = q => {
        if (questionSet.has(q.question)) return null; // dedupe questions
        questionSet.add(q.question);

        if (ignorePatterns.some(p => !!q.question.match(p))) return reject;

        return keep;
    };
    for (const q of questions) {
        const category = classify(q);
        if (category) category.push(q);
    }

    function collapse(questions) {
        const res = {};
        for (const question of questions) {
            let cat = res[question.category];
            if (!cat) cat = res[question.category] = {};

            let val = cat[question.value];
            if (!val) val = cat[question.value] = [];

            val.push([question.question, question.answer]);
        }
        return res;
    }

    const compressed = await util.promisify(zlib.gzip)(JSON.stringify(collapse(keep)));

    await Promise.all([
        fs.writeFile('q.json.gz', compressed),
        fs.writeFile('questions.json', JSON.stringify(keep, null, 2)),
        fs.writeFile('questions-removed.json', JSON.stringify(reject, null, 2)),
        fs.writeFile('errors.json', JSON.stringify(logState.badQuestions, null, 2)),
    ]);

    process.stdout.write(`\nDONE! kept ${keep.length} questions - rejected ${reject.length} - errors ${logState.badQuestions.length}\n`);
};
main(+process.argv[2]);
