import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes("{view === 'home' ? ("));
const endIndex = lines.findIndex(l => l.includes(") : null}"));

if (startIndex !== -1 && endIndex !== -1) {
    const newLines = lines.slice(0, startIndex);
    newLines.push(
        '            <motion.div',
        '              key="movies-view"',
        '              initial={{ opacity: 0, y: 20 }}',
        '              animate={{ opacity: 1, y: 0 }}',
        '              className="max-w-5xl mx-auto"',
        '            >',
        '              <MoviesPage darkMode={darkMode} />',
        '            </motion.div>'
    );
    newLines.push(...lines.slice(endIndex + 1));
    fs.writeFileSync('src/App.tsx', newLines.join('\n'));
    console.log("Successfully replaced views.");
} else {
    console.log("Could not find start or end index.");
}
