const commandLineArgs = require('command-line-args');

const parseArgument = (arg) => {
  if (!Number.isNaN(Number(arg))) {
    return Number(arg);
  }
  if (arg === 'true') {
    return true;
  }
  if (arg === 'false') {
    return false;
  }
  return arg;
};

const argDefinitions = [{
  name: 'args', type: parseArgument, multiple: true, defaultOption: true,
}];

const split = (str) => {
  const args = [];
  let readingPart = false;
  let part = '';
  for (let i = 0; i < str.length; i += 1) {
    if (str.charAt(i) === ' ' && !readingPart) {
      args.push(part);
      part = '';
    } else if (str.charAt(i) === '"') {
      readingPart = !readingPart;
    } else {
      part += str.charAt(i);
    }
  }
  args.push(part);
  return args;
};

const clean = str => str
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"');

module.exports = {
  // TODO: Respect numbers in quotes - should be parsed as a string
  parse: argString => commandLineArgs(argDefinitions, { argv: split(clean(argString)) }).args,
};
