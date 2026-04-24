const path = require('path');
const words = require(path.join(__dirname, '..', 'public', 'assets', 'words.json'));

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

module.exports = { getRandomWord };
