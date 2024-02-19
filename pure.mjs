
import fs from 'node:fs'
import yaml from 'yaml';
import args from 'args';
import { set } from 'object-selectors';

args
    .option('file', 'target file')
    .option('key', 'key selector')
    .command('value', 'replace text',)

const { file, key, value } = args.parse(process.argv)

const _file = fs.readFileSync(file, 'utf8')
const target = yaml.parse(_file)
set(key, target, value)
const targetYamlStr = yaml.stringify(target, 2)
fs.writeFileSync(file, targetYamlStr)