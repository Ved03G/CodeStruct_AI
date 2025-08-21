// Simple demo showing Tree-sitter usage for TypeScript and Python
// Run with: npm run demo:parser

// Use dynamic requires to avoid type and native binding issues at compile time
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Parser = require('tree-sitter');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TypeScript = require('tree-sitter-typescript');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Python = require('tree-sitter-python');

const typescriptCode = `
function greet(name: string): void {
  console.log(` + "`Hello, ${name}!`" + `);
}
`;

const pythonCode = `
def greet(name):
  print(f"Hello, {name}!")
`;

function parseCode(language: 'typescript' | 'python', code: string) {
  const parser = new (Parser as any)();
  console.log(`\n--- Analyzing ${language.toUpperCase()} Code ---`);
  if (language === 'typescript') {
    parser.setLanguage((TypeScript as any).typescript);
  } else {
    parser.setLanguage((Python as any).python);
  }
  try {
    const tree = parser.parse(code);
    console.log('AST (S-expression format):');
    console.log(tree.rootNode.sExpression);
  } catch (e) {
    console.error('Failed to parse with Tree-sitter (native binding missing?):', e);
  }
}

parseCode('typescript', typescriptCode);
parseCode('python', pythonCode);
