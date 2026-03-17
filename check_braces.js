import fs from 'fs';

function checkBrackets(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    let stack = [];
    let line = 1;
    let col = 1;
    let inString = null;
    let inComment = false;

    for (let i = 0; i < content.length; i++) {
        let char = content[i];
        let nextChar = content[i+1];

        if (char === '\n') {
            line++;
            col = 1;
            inComment = false;
        } else {
            col++;
        }

        if (inComment) continue;
        if (inString) {
            if (char === inString && content[i-1] !== '\\') inString = null;
            continue;
        }

        if (char === '/' && nextChar === '/') {
            inComment = true;
            i++;
            continue;
        }

        if (char === "'" || char === '"' || char === '`') {
            inString = char;
            continue;
        }

        if (char === '{') {
            stack.push({char: '{', line, col});
        } else if (char === '}') {
            if (stack.length === 0) {
                console.log(`Extra '}' found at line ${line}, col ${col}`);
                return;
            }
            stack.pop();
        }
    }

    if (stack.length > 0) {
        stack.forEach(s => console.log(`Unclosed '${s.char}' from line ${s.line}, col ${s.col}`));
    } else {
        console.log("Brackets are balanced!");
    }
}

checkBrackets(process.argv[2]);
