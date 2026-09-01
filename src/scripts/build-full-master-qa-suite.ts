import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { MasterTestCase } from './generate-master-qa-suite';
import { deepEdgeCases } from './generate-deep-edge-cases';

// 1. Read base test cases from generate-master-qa-suite
const baseModule = require('./generate-master-qa-suite');

// Get all combined test cases
const masterSuite: MasterTestCase[] = [
  ...deepEdgeCases
];

// Let's also include all the base test cases
const generateScriptContent = fs.readFileSync(path.resolve(__dirname, 'generate-master-qa-suite.ts'), 'utf8');

// Load full test cases from generate-master-qa-suite.ts
const fullTestCases: MasterTestCase[] = [];

console.log('Deep Edge cases loaded:', deepEdgeCases.length);
