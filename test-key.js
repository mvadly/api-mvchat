const fs = require('fs');
const c = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
const key = c.private_key.replace(/\\n/g, '\n');
console.log('Has literal backslash-n:', key.includes('\\n'));
console.log('Starts with:', key.substring(0, 30));
console.log('');
console.log('Contains actual newlines:', key.includes('\n'));
console.log('Newline count:', (key.match(/\n/g) || []).length);