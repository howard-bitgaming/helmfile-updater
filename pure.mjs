
import fs from 'node:fs'
import yaml from 'yaml';
import args from 'args';

args
    .option('file', 'target file')
    .option('key', 'key selector')
    .option('value', 'replace text',)

const { file, key, value } = args.parse(process.argv)

const _file = fs.readFileSync(file, 'utf8')
const target = yaml.parse(_file)
const found = target.releases.find(({ name }) => name === key);
if (!found) throw new Error('Key Error')
const tagObject = found.set.find(({ name }) => name === 'image.tag');
if (!tagObject) throw new Error('cant find image.tag')
tagObject.value = value

const targetYamlStr = yaml.stringify(target, 2)
fs.writeFileSync(file, targetYamlStr)